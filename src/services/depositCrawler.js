/**
 * Deposit Monitoring Crawler Service
 * 모든 사용자의 입금 주소를 모니터링하여 신규 입금 감지 및 기존 입금의 컨펌 수 업데이트
 * 30초 주기로 자동 실행
 */
const { DepositAddress, Deposit, Address } = require('../models');
const {
  getCurrentBlock,
  getTransactionsSinceBlock,
  getTransactionsForAddress,
  calculateConfirmations,
  hexToDecimal,
} = require('../utils/quicknode');

let cronJob = null;

/**
 * 입금 모니터링 크롤러 메인 함수
 */
async function runDepositCrawler() {
  console.log('[Deposit Crawler] 입금 모니터링 시작...');

  try {
    // 1. 현재 블록 높이 조회
    const currentBlockHex = await getCurrentBlock();
    const currentBlock = hexToDecimal(currentBlockHex);
    console.log(`[Deposit Crawler] 현재 블록: ${currentBlock}`);

    // 2. 모든 입금 주소 조회 (삭제된 주소는 DB에서 제거되므로 자동 제외)
    const depositAddresses = await DepositAddress.findAll({
      where: {
        coin: ['ETH', 'USDT', 'USDC'], // QuickNode는 Ethereum 네트워크만 지원
      },
    });

    console.log(`[Deposit Crawler] 모니터링 대상 주소 수: ${depositAddresses.length}`);

    // 3. 각 주소별 트랜잭션 확인 및 신규 입금 감지
    let newDepositsCount = 0;
    for (const addr of depositAddresses) {
      try {
        let transactions = [];
        let lastCheckedBlock = addr.lastCheckedBlock;

        // Mainnet: qn_getTransactionsByAddress 사용
        // Testnet: DB 기반 블록 추적 사용 (효율성 향상)
        if (process.env.BLOCKCHAIN_ENV === 'mainnet') {
          const txsResult = await getTransactionsForAddress(addr.address, 1, 10);
          transactions = txsResult?.paginatedItems || [];
        } else {
          // Testnet: 마지막 조회 블록 이후만 조회 (최대 10블록)
          const result = await getTransactionsSinceBlock(addr.address, lastCheckedBlock, 10);
          transactions = result.transactions;
          lastCheckedBlock = result.lastCheckedBlock;
        }

        for (const tx of transactions) {
          // 입금 트랜잭션인지 확인 (toAddress가 우리 주소)
          if (tx.toAddress?.toLowerCase() === addr.address.toLowerCase()) {
            // 이미 DB에 있는 트랜잭션인지 확인
            const existing = await Deposit.findOne({
              where: { txHash: tx.transactionHash },
            });

            if (!existing && tx.value !== '0') {
              // 발신 주소 화이트리스트 검증 (대소문자 구분 없이)
              const whitelistAddresses = await Address.findAll({
                where: {
                  userId: addr.userId,
                },
              });

              // 대소문자 구분 없이 주소 비교
              const matchedAddress = whitelistAddresses.find(
                (wAddr) => wAddr.address.toLowerCase() === tx.fromAddress.toLowerCase()
              );

              const isAllowedSender =
                matchedAddress &&
                matchedAddress.permissions?.canDeposit === true;

              // 신규 입금 발견 - DB에 저장
              const txBlockNumber = parseInt(tx.blockNumber); // 이미 decimal string
              const confirmations = calculateConfirmations(
                txBlockNumber,
                currentBlock
              );

              // 신규 입금은 항상 'detected' 상태로 시작 (UI에서 진행 과정 추적 가능)
              const status = 'detected';

              // value는 이미 wei decimal string
              const ethAmount = (parseInt(tx.value) / 1e18).toFixed(6);

              const depositData = {
                id: `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId: addr.userId,
                depositAddressId: addr.id,
                txHash: tx.transactionHash,
                asset: addr.coin,
                network: process.env.BLOCKCHAIN_ENV === 'mainnet' ? 'Ethereum' : 'Holesky',
                amount: ethAmount,
                fromAddress: tx.fromAddress,
                toAddress: tx.toAddress,
                status,
                senderVerified: isAllowedSender || false,
                currentConfirmations: confirmations,
                requiredConfirmations: 12,
                blockHeight: txBlockNumber,
                detectedAt: new Date(),
              };

              await Deposit.create(depositData);
              newDepositsCount++;

              console.log(
                `[Deposit Crawler] 신규 입금 감지: ${tx.transactionHash} (${ethAmount} ${addr.coin}) - 발신자 검증: ${isAllowedSender ? '적합' : '부적합'}`
              );
            }
          }
        }

        // Testnet: 마지막 조회 블록 업데이트 (에러 없이 완료된 경우만)
        if (process.env.BLOCKCHAIN_ENV !== 'mainnet' && lastCheckedBlock) {
          await addr.update({ lastCheckedBlock });
          console.log(`[Deposit Crawler] 주소 ${addr.address} 마지막 블록 업데이트: ${lastCheckedBlock}`);
        }
      } catch (error) {
        console.error(`[Deposit Crawler] 주소 ${addr.address} 처리 실패:`, error.message);
        // 다음 주소 계속 처리
      }
    }

    if (newDepositsCount > 0) {
      console.log(`[Deposit Crawler] 신규 입금 ${newDepositsCount}건 감지`);
    }

    // 4. 진행 중인 입금의 확인 수 업데이트
    const { Op } = require('sequelize');
    const activeDeposits = await Deposit.findAll({
      where: {
        status: {
          [Op.in]: ['detected', 'confirming'],
        },
      },
    });

    console.log(`[Deposit Crawler] 진행 중인 입금 수: ${activeDeposits.length}`);

    let updatedCount = 0;
    for (const deposit of activeDeposits) {
      const confirmations = calculateConfirmations(
        deposit.blockHeight,
        currentBlock
      );

      let newStatus = deposit.status;
      if (confirmations >= 1 && confirmations < 12) {
        newStatus = 'confirming';
      } else if (confirmations >= 12) {
        newStatus = 'confirmed';
      }

      // 상태 또는 확인 수가 변경된 경우에만 업데이트
      if (
        newStatus !== deposit.status ||
        confirmations !== deposit.currentConfirmations
      ) {
        await deposit.update({
          currentConfirmations: confirmations,
          status: newStatus,
          ...(newStatus === 'confirmed' &&
            !deposit.confirmedAt && {
              confirmedAt: new Date(),
            }),
        });

        updatedCount++;

        console.log(
          `[Deposit Crawler] 입금 업데이트: ${deposit.txHash} - ${confirmations} confirmations (${newStatus})`
        );
      }
    }

    if (updatedCount > 0) {
      console.log(`[Deposit Crawler] ${updatedCount}건 업데이트 완료`);
    }

    console.log('[Deposit Crawler] 입금 모니터링 완료\n');
  } catch (error) {
    console.error('[Deposit Crawler] 입금 모니터링 실패:', error);
  }
}

/**
 * 크롤러 시작 (30초 주기)
 */
function start() {
  if (cronJob) {
    console.log('[Deposit Crawler] 이미 실행 중입니다.');
    return;
  }

  console.log('[Deposit Crawler] 크롤러 시작 - 30초 주기 실행');

  // 30초마다 실행 (setInterval 사용)
  cronJob = setInterval(async () => {
    await runDepositCrawler();
  }, 30000);

  // 서버 시작 시 즉시 1회 실행
  runDepositCrawler();
}

/**
 * 크롤러 중지
 */
function stop() {
  if (cronJob) {
    clearInterval(cronJob);
    cronJob = null;
    console.log('[Deposit Crawler] 크롤러 중지');
  }
}

/**
 * 수동 실행 (테스트용)
 */
async function runOnce() {
  await runDepositCrawler();
}

module.exports = {
  start,
  stop,
  runOnce,
};
