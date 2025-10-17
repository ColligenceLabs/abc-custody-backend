/**
 * Withdrawal Scheduler Service
 *
 * 개인 회원의 출금 대기 시간이 만료되면 자동으로 AML 검토 상태로 전환
 */

const cron = require('node-cron');
const { Withdrawal } = require('../models');
const { Op } = require('sequelize');

class WithdrawalScheduler {
  constructor() {
    this.task = null;
  }

  /**
   * 스케줄러 시작 (1분마다 실행)
   */
  start() {
    console.log('🕐 Withdrawal Scheduler started - Checking every minute');

    // 1분마다 실행
    this.task = cron.schedule('* * * * *', async () => {
      try {
        await this.processExpiredWaitingPeriods();
      } catch (error) {
        console.error('❌ Scheduler error:', error);
      }
    });
  }

  /**
   * 대기 시간이 만료된 출금 요청 처리
   */
  async processExpiredWaitingPeriods() {
    try {
      const now = new Date();

      // 조건:
      // 1. status = 'withdrawal_wait' (출금 대기)
      // 2. memberType = 'individual' (개인 회원)
      // 3. processingScheduledAt이 현재 시간보다 이전
      const expiredWithdrawals = await Withdrawal.findAll({
        where: {
          status: 'withdrawal_wait',
          memberType: 'individual',
          processingScheduledAt: {
            [Op.lte]: now,
            [Op.ne]: null
          }
        }
      });

      if (expiredWithdrawals.length === 0) {
        return;
      }

      console.log(`⏰ Found ${expiredWithdrawals.length} expired withdrawal(s) - transitioning to AML review`);

      // 각 출금 요청을 AML 검토 상태로 전환
      for (const withdrawal of expiredWithdrawals) {
        await withdrawal.update({
          status: 'aml_review' // AML 검토 중 상태로 직접 전환
        });

        console.log(`✅ Withdrawal ${withdrawal.id} transitioned to AML review`);
      }

    } catch (error) {
      console.error('❌ Error processing expired waiting periods:', error);
      throw error;
    }
  }

  /**
   * 스케줄러 중지
   */
  stop() {
    if (this.task) {
      this.task.stop();
      console.log('🛑 Withdrawal Scheduler stopped');
    }
  }
}

// 싱글톤 인스턴스
const schedulerInstance = new WithdrawalScheduler();

module.exports = schedulerInstance;
