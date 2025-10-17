/**
 * Withdrawal Pending Crawler Service
 *
 * withdrawal_pending 상태의 출금 요청을 모니터링하고
 * BlockDaemon API에서 트랜잭션 상태를 확인하여
 * DB 상태를 업데이트합니다.
 *
 * 30초 주기로 자동 실행
 */

const { Withdrawal } = require('../models');
const { getTransactionDetails } = require('./blockdaemonService');

let cronJob = null;

/**
 * Withdrawal Pending 크롤러 메인 함수
 */
async function runWithdrawalPendingCrawler() {
  console.log('[Withdrawal Pending] 크롤러 시작...');

  try {
    // 1. withdrawal_pending 상태이고 txid가 있는 출금 조회
    const { Op } = require('sequelize');
    const pendingWithdrawals = await Withdrawal.findAll({
      where: {
        status: 'withdrawal_pending',
        txid: {
          [Op.ne]: null
        }
      }
    });

    if (pendingWithdrawals.length === 0) {
      console.log('[Withdrawal Pending] 처리할 출금 없음');
      return;
    }

    console.log(`[Withdrawal Pending] ${pendingWithdrawals.length}건 확인 중...`);

    let updatedCount = 0;
    let rejectedCount = 0;
    let waitingCount = 0;

    // 2. 각 출금에 대해 BlockDaemon API 호출
    for (const withdrawal of pendingWithdrawals) {
      try {
        console.log(`[Withdrawal Pending] 출금 ${withdrawal.id} 확인 중 (txid: ${withdrawal.txid})`);

        // BlockDaemon API 호출
        const response = await getTransactionDetails(withdrawal.txid);

        if (!response || !response.Transaction) {
          console.warn(`[Withdrawal Pending] 출금 ${withdrawal.id}: 응답 구조 이상`);
          continue;
        }

        const transaction = response.Transaction;
        const status = transaction.Status;
        const txHash = transaction.TxHash;

        console.log(`[Withdrawal Pending] 출금 ${withdrawal.id}: Status="${status}", TxHash="${txHash}"`);

        // 3. 상태에 따른 처리

        // 3-1. Rejected 또는 Failed 상태: admin_rejected로 전환
        if (status === 'Rejected' || status === 'Failed') {
          await withdrawal.update({
            status: 'admin_rejected',
            rejectionReason: `BlockDaemon ${status.toLowerCase()}`,
            rejectedAt: new Date(),
            rejectedBy: 'BlockDaemon System',
            updatedAt: new Date()
          });

          console.log(`[Withdrawal Pending] 출금 ${withdrawal.id}: BlockDaemon에서 ${status} → admin_rejected`);
          rejectedCount++;
          continue;
        }

        // 3-2. TxHash가 존재: transferring으로 전환
        if (txHash && txHash !== '') {
          await withdrawal.update({
            txHash: txHash,
            status: 'transferring',
            updatedAt: new Date()
          });

          console.log(`[Withdrawal Pending] 출금 ${withdrawal.id}: TxHash 생성됨 → transferring`);
          console.log(`[Withdrawal Pending] TxHash: ${txHash}`);
          updatedCount++;
          continue;
        }

        // 3-3. Status="New" && TxHash="": 아직 대기 중
        if (status === 'New' && (!txHash || txHash === '')) {
          console.log(`[Withdrawal Pending] 출금 ${withdrawal.id}: BlockDaemon에서 아직 처리 대기 중`);
          waitingCount++;
          continue;
        }

        // 3-4. 기타 상태
        console.log(`[Withdrawal Pending] 출금 ${withdrawal.id}: 알 수 없는 상태 (Status: ${status}, TxHash: ${txHash})`);

      } catch (error) {
        console.error(`[Withdrawal Pending] 출금 ${withdrawal.id} 처리 실패:`, error.message);
        // 개별 실패는 로그만 남기고 계속 진행
      }
    }

    // 4. 결과 요약
    if (updatedCount > 0) {
      console.log(`[Withdrawal Pending] ${updatedCount}건 transferring으로 전환 완료`);
    }
    if (rejectedCount > 0) {
      console.log(`[Withdrawal Pending] ${rejectedCount}건 admin_rejected로 전환 완료`);
    }
    if (waitingCount > 0) {
      console.log(`[Withdrawal Pending] ${waitingCount}건 아직 대기 중`);
    }

    console.log('[Withdrawal Pending] 크롤러 완료\n');

  } catch (error) {
    console.error('[Withdrawal Pending] 크롤러 실행 실패:', error);
  }
}

/**
 * 크롤러 시작 (30초 주기)
 */
function start() {
  if (cronJob) {
    console.log('[Withdrawal Pending] 이미 실행 중입니다.');
    return;
  }

  console.log('[Withdrawal Pending] 크롤러 시작 - 30초 주기 실행');

  // 30초마다 실행
  cronJob = setInterval(async () => {
    await runWithdrawalPendingCrawler();
  }, 30000);

  // 서버 시작 시 즉시 1회 실행
  runWithdrawalPendingCrawler();
}

/**
 * 크롤러 중지
 */
function stop() {
  if (cronJob) {
    clearInterval(cronJob);
    cronJob = null;
    console.log('[Withdrawal Pending] 크롤러 중지');
  }
}

/**
 * 수동 실행 (테스트용)
 */
async function runOnce() {
  await runWithdrawalPendingCrawler();
}

module.exports = {
  start,
  stop,
  runOnce
};
