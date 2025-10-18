/**
 * Withdrawal Confirmation Crawler Service
 *
 * transferring 상태의 출금 요청을 모니터링하고
 * 블록체인에서 트랜잭션 영수증을 확인하여
 * DB 상태를 업데이트합니다. (transferring → processing → success)
 *
 * 30초 주기로 자동 실행
 */

const { Withdrawal } = require('../models');

let cronJob = null;

/**
 * 블록체인에서 트랜잭션 영수증 조회
 */
async function getTransactionReceipt(withdrawal) {
  try {
    const { txHash, currency } = withdrawal;

    if (!txHash) {
      return null;
    }

    // Ethereum 계열 (ETH, USDT, USDC)
    if (['ETH', 'USDT', 'USDC'].includes(currency)) {
      const { getTransactionReceipt } = require('../utils/ethereum');
      const receipt = await getTransactionReceipt(txHash);

      if (receipt) {
        console.log(`[Withdrawal Confirmation] ${withdrawal.id}: 영수증 확인 완료 (txHash: ${txHash})`);
      }

      return receipt;
    }

    // Bitcoin 계열 (추후 구현)
    if (currency === 'BTC') {
      // TODO: Bitcoin RPC 연동
      console.warn(`[Withdrawal Confirmation] Bitcoin 영수증 확인 미구현`);
      return null;
    }

    // Solana 계열 (추후 구현)
    if (currency === 'SOL') {
      // TODO: Solana RPC 연동
      console.warn(`[Withdrawal Confirmation] Solana 영수증 확인 미구현`);
      return null;
    }

    return null;
  } catch (error) {
    console.error(`[Withdrawal Confirmation] 영수증 조회 실패: ${error.message}`);
    return null;
  }
}

/**
 * Withdrawal Confirmation 크롤러 메인 함수
 */
async function runWithdrawalConfirmationCrawler() {
  console.log('[Withdrawal Confirmation] 크롤러 시작...');

  try {
    // 1. transferring 상태의 출금 조회 (txHash 있는 것만)
    const { Op } = require('sequelize');
    const transferringWithdrawals = await Withdrawal.findAll({
      where: {
        status: 'transferring',
        txHash: {
          [Op.ne]: null
        }
      }
    });

    if (transferringWithdrawals.length === 0) {
      console.log('[Withdrawal Confirmation] 처리할 transferring 상태 출금 없음');
    } else {
      console.log(`[Withdrawal Confirmation] ${transferringWithdrawals.length}건 확인 중...`);

      let processingCount = 0;
      let failedCount = 0;

      // 2. 각 출금에 대해 블록체인 영수증 확인
      for (const withdrawal of transferringWithdrawals) {
        try {
          console.log(`[Withdrawal Confirmation] 출금 ${withdrawal.id} 확인 중 (txHash: ${withdrawal.txHash})`);

          // 블록체인에서 영수증 조회
          const receipt = await getTransactionReceipt(withdrawal);

          // 영수증이 있으면 processing으로 전환
          if (receipt) {
            await withdrawal.update({
              status: 'processing',
              updatedAt: new Date()
            });

            console.log(`[Withdrawal Confirmation] 출금 ${withdrawal.id}: transferring → processing`);
            processingCount++;
          }

        } catch (error) {
          console.error(`[Withdrawal Confirmation] 출금 ${withdrawal.id} 처리 실패:`, error.message);
          failedCount++;
        }
      }

      if (processingCount > 0) {
        console.log(`[Withdrawal Confirmation] ${processingCount}건 processing으로 전환 완료`);
      }
      if (failedCount > 0) {
        console.log(`[Withdrawal Confirmation] ${failedCount}건 처리 실패`);
      }
    }

    // 3. processing 상태 확인 (영수증 성공 여부)
    const processingWithdrawals = await Withdrawal.findAll({
      where: {
        status: 'processing',
        txHash: {
          [Op.ne]: null
        }
      }
    });

    if (processingWithdrawals.length === 0) {
      console.log('[Withdrawal Confirmation] 처리할 processing 상태 출금 없음');
    } else {
      console.log(`[Withdrawal Confirmation] processing 상태 ${processingWithdrawals.length}건 추가 확인...`);

      let completedCount = 0;

      for (const withdrawal of processingWithdrawals) {
        try {
          const receipt = await getTransactionReceipt(withdrawal);

          // 영수증이 있고 성공 상태면 success로 전환
          if (receipt && receipt.status === '0x1') {
            await withdrawal.update({
              status: 'success',
              completedAt: new Date(),
              updatedAt: new Date()
            });

            console.log(`[Withdrawal Confirmation] 출금 ${withdrawal.id}: processing → success`);
            completedCount++;
          }

        } catch (error) {
          console.error(`[Withdrawal Confirmation] 출금 ${withdrawal.id} 처리 실패:`, error.message);
        }
      }

      if (completedCount > 0) {
        console.log(`[Withdrawal Confirmation] ${completedCount}건 success로 전환 완료`);
      }
    }

    console.log('[Withdrawal Confirmation] 크롤러 완료\n');

  } catch (error) {
    console.error('[Withdrawal Confirmation] 크롤러 실행 실패:', error);
  }
}

/**
 * 크롤러 시작 (30초 주기)
 */
function start() {
  if (cronJob) {
    console.log('[Withdrawal Confirmation] 이미 실행 중입니다.');
    return;
  }

  console.log('[Withdrawal Confirmation] 크롤러 시작 - 30초 주기 실행');

  // 30초마다 실행
  cronJob = setInterval(async () => {
    await runWithdrawalConfirmationCrawler();
  }, 30000);

  // 서버 시작 시 즉시 1회 실행
  runWithdrawalConfirmationCrawler();
}

/**
 * 크롤러 중지
 */
function stop() {
  if (cronJob) {
    clearInterval(cronJob);
    cronJob = null;
    console.log('[Withdrawal Confirmation] 크롤러 중지');
  }
}

/**
 * 수동 실행 (테스트용)
 */
async function runOnce() {
  await runWithdrawalConfirmationCrawler();
}

module.exports = {
  start,
  stop,
  runOnce
};
