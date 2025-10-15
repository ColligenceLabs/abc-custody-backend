/**
 * Vault Transfer Crawler Service
 * confirmed 상태의 입금을 BlockDaemon Vault로 자동 전송
 * 30초 주기로 자동 실행
 */

const { Deposit, VaultTransfer, DepositAddress } = require('../models');
const { getDefaultVaultEthAddress, DEFAULT_VAULT_ID } = require('../utils/blockdaemon');
const {
  getEthBalance,
  getERC20Balance,
  estimateEthTransferGas,
  estimateERC20TransferGas,
  createETHTransfer,
  createERC20Transfer,
  sendTransaction,
  waitForConfirmation
} = require('../utils/ethereum');

let cronJob = null;

// 수수료 설정
const VAULT_TRANSFER_FEE_RATE = parseFloat(process.env.VAULT_TRANSFER_FEE_RATE || '0.05');

// ERC-20 토큰 컨트랙트 주소 매핑 (Holesky Testnet)
const TOKEN_ADDRESSES = {
  testnet: {
    USDT: '0x...', // Holesky USDT 주소 (추후 설정 필요)
    USDC: '0x...', // Holesky USDC 주소 (추후 설정 필요)
    TALK: '0xa97938262a0b17bb96bff4d84e70c90770281b4c' // Holesky TALK 주소
  },
  mainnet: {
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
  }
};

const BLOCKCHAIN_ENV = process.env.BLOCKCHAIN_ENV || 'testnet';

// 최소 가스 잔액 (ETH)
const MIN_GAS_BALANCE = '0.001'; // 0.001 ETH

/**
 * Vault 전송 크롤러 메인 함수
 */
async function runVaultTransferCrawler() {
  console.log('[Vault Transfer] Vault 전송 시작...');

  try {
    // 1. BlockDaemon Vault 주소 조회
    const vaultAddress = await getDefaultVaultEthAddress();
    console.log(`[Vault Transfer] 목적지 Vault 주소: ${vaultAddress}`);

    // 2. 전송 대상 입금 조회
    const { Op } = require('sequelize');
    const pendingDeposits = await Deposit.findAll({
      where: {
        status: 'confirmed',
        senderVerified: true,
        // Vault 전송 기록이 없는 입금만 (camelCase 컬럼명 사용)
        id: {
          [Op.notIn]: require('sequelize').literal(
            `(SELECT "depositId" FROM "vault_transfers" WHERE status IN ('sent', 'confirmed'))`
          )
        }
      },
      include: [
        {
          model: DepositAddress,
          as: 'depositAddress',
          attributes: ['id', 'address', 'privateKey', 'coin', 'network']
        }
      ]
    });

    console.log(`[Vault Transfer] 전송 대상 입금 수: ${pendingDeposits.length}`);

    // 3. 각 입금 처리
    let transferredCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const deposit of pendingDeposits) {
      try {
        const depositAddr = deposit.depositAddress;

        if (!depositAddr || !depositAddr.privateKey) {
          console.warn(`[Vault Transfer] 입금 ${deposit.id}: Private Key 없음, 스킵`);
          skippedCount++;
          continue;
        }

        console.log(`[Vault Transfer] 처리 중: ${deposit.txHash} (${deposit.amount} ${deposit.asset})`);

        // VaultTransfer 레코드 생성 (pending 상태)
        const transferId = `vtx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // ETH인 경우 수수료 미리 계산
        let initialFeeAmount = null;
        if (deposit.asset === 'ETH') {
          initialFeeAmount = (parseFloat(deposit.amount) * VAULT_TRANSFER_FEE_RATE).toFixed(6);
        }

        const vaultTransfer = await VaultTransfer.create({
          id: transferId,
          depositId: deposit.id,
          fromAddress: depositAddr.address,
          toVaultAddress: vaultAddress,
          vaultId: DEFAULT_VAULT_ID,
          asset: deposit.asset,
          network: deposit.network,
          amount: deposit.amount,
          feeAmount: initialFeeAmount,
          feeRate: deposit.asset === 'ETH' ? VAULT_TRANSFER_FEE_RATE : null,
          status: 'pending'
        });

        // 4. 가스 잔액 확인
        const ethBalance = await getEthBalance(depositAddr.address);
        console.log(`[Vault Transfer] ${depositAddr.address} ETH 잔액: ${ethBalance.balance} ETH`);

        if (parseFloat(ethBalance.balance) < parseFloat(MIN_GAS_BALANCE)) {
          const errorMsg = `가스 부족: ${ethBalance.balance} ETH (최소 ${MIN_GAS_BALANCE} ETH 필요)`;
          console.warn(`[Vault Transfer] ${errorMsg}`);

          await vaultTransfer.update({
            status: 'failed',
            errorMessage: errorMsg
          });

          skippedCount++;
          continue;
        }

        // 5. 수수료 계산 및 트랜잭션 생성
        let signedTx;
        let gasUsed;
        let feeAmount = null;
        let actualTransferAmount = deposit.amount;

        if (deposit.asset === 'ETH') {
          // ETH 전송: 수수료 차감
          feeAmount = (parseFloat(deposit.amount) * VAULT_TRANSFER_FEE_RATE).toFixed(6);
          actualTransferAmount = (parseFloat(deposit.amount) - parseFloat(feeAmount)).toFixed(6);

          console.log(`[Vault Transfer] 원금: ${deposit.amount} ETH, 수수료(${(VAULT_TRANSFER_FEE_RATE * 100).toFixed(1)}%): ${feeAmount} ETH, 전송액: ${actualTransferAmount} ETH`);

          const gasEstimate = await estimateEthTransferGas(depositAddr.address, vaultAddress, actualTransferAmount);
          console.log(`[Vault Transfer] 예상 가스 비용: ${gasEstimate.estimatedGasFee} ETH`);

          signedTx = await createETHTransfer(depositAddr.address, vaultAddress, actualTransferAmount, depositAddr.privateKey);
          gasUsed = gasEstimate.gasLimit;
        } else {
          // ERC-20 토큰 전송
          const tokenAddress = TOKEN_ADDRESSES[BLOCKCHAIN_ENV][deposit.asset];

          if (!tokenAddress || tokenAddress === '0x...') {
            throw new Error(`${deposit.asset} 토큰 주소가 설정되지 않았습니다.`);
          }

          const gasEstimate = await estimateERC20TransferGas(
            depositAddr.address,
            vaultAddress,
            deposit.amount,
            tokenAddress
          );
          console.log(`[Vault Transfer] 예상 가스 비용: ${gasEstimate.estimatedGasFee} ETH`);

          signedTx = await createERC20Transfer(
            depositAddr.address,
            vaultAddress,
            deposit.amount,
            depositAddr.privateKey,
            tokenAddress
          );
          gasUsed = gasEstimate.gasLimit;
        }

        // 6. 트랜잭션 전송
        const { txHash } = await sendTransaction(signedTx);
        console.log(`[Vault Transfer] 트랜잭션 전송 완료: ${txHash}`);

        await vaultTransfer.update({
          txHash,
          gasUsed: gasUsed.toString(),
          status: 'sent',
          transferredAt: new Date()
        });

        // 7. 1 컨펌 대기
        const receipt = await waitForConfirmation(txHash, 1);
        console.log(`[Vault Transfer] 트랜잭션 컨펌 완료: ${txHash}`);

        const gasFee = (BigInt(receipt.gasUsed) * BigInt(receipt.gasPrice || receipt.effectiveGasPrice)).toString();

        await vaultTransfer.update({
          gasUsed: receipt.gasUsed.toString(),
          gasFee: (parseInt(gasFee) / 1e18).toFixed(18),
          status: 'confirmed',
          confirmedAt: new Date()
        });

        // 8. Deposit 상태 업데이트
        await deposit.update({
          status: 'credited'
        });

        transferredCount++;
        console.log(`[Vault Transfer] 완료: ${txHash} (${deposit.amount} ${deposit.asset})`);

      } catch (error) {
        console.error(`[Vault Transfer] 입금 ${deposit.id} 처리 실패:`, error.message);

        // VaultTransfer 레코드가 있으면 실패 상태로 업데이트
        const vaultTransfer = await VaultTransfer.findOne({
          where: { depositId: deposit.id }
        });

        if (vaultTransfer) {
          await vaultTransfer.update({
            status: 'failed',
            errorMessage: error.message
          });
        }

        failedCount++;
      }
    }

    if (transferredCount > 0) {
      console.log(`[Vault Transfer] ${transferredCount}건 전송 완료`);
    }
    if (skippedCount > 0) {
      console.log(`[Vault Transfer] ${skippedCount}건 스킵 (가스 부족 등)`);
    }
    if (failedCount > 0) {
      console.log(`[Vault Transfer] ${failedCount}건 실패`);
    }

    console.log('[Vault Transfer] Vault 전송 완료\n');
  } catch (error) {
    console.error('[Vault Transfer] Vault 전송 실패:', error);
  }
}

/**
 * 크롤러 시작 (30초 주기)
 */
function start() {
  if (cronJob) {
    console.log('[Vault Transfer] 이미 실행 중입니다.');
    return;
  }

  console.log('[Vault Transfer] 크롤러 시작 - 30초 주기 실행');

  // 30초마다 실행
  cronJob = setInterval(async () => {
    await runVaultTransferCrawler();
  }, 30000);

  // 서버 시작 시 즉시 1회 실행
  runVaultTransferCrawler();
}

/**
 * 크롤러 중지
 */
function stop() {
  if (cronJob) {
    clearInterval(cronJob);
    cronJob = null;
    console.log('[Vault Transfer] 크롤러 중지');
  }
}

/**
 * 수동 실행 (테스트용)
 */
async function runOnce() {
  await runVaultTransferCrawler();
}

module.exports = {
  start,
  stop,
  runOnce
};
