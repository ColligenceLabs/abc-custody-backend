'use strict';

/**
 * 출금 상태값 마이그레이션
 *
 * 목적: 기존 상태값을 새로운 snake_case 기반 통합 상태값으로 마이그레이션
 *
 * 변경 사항:
 * - 기존 ENUM: draft, submitted, approved, pending, processing, completed, rejected, cancelled, archived, stopped
 * - 새로운 ENUM: withdrawal_wait, aml_review, approval_pending, aml_issue, processing, success, failed,
 *               admin_rejected, withdrawal_stopped, withdrawal_request, withdrawal_reapply, rejected, archived
 *
 * 상태값 매핑:
 * - draft → withdrawal_request (기업 임시저장)
 * - submitted → withdrawal_request (기업 신청)
 * - approved → approval_pending (승인 완료 → 승인 대기)
 * - pending → withdrawal_wait (대기 → 출금대기)
 * - processing → processing (유지)
 * - completed → success (완료 → 성공)
 * - rejected → admin_rejected (거부 → 관리자 거부)
 * - cancelled → withdrawal_stopped (취소 → 출금 정지)
 * - archived → archived (유지)
 * - stopped → withdrawal_stopped (정지 → 출금 정지)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('=== 출금 상태값 마이그레이션 시작 ===');

      // Step 1: 백업 테이블 생성
      console.log('Step 1: 백업 테이블 생성 중...');
      await queryInterface.sequelize.query(`
        CREATE TABLE withdrawals_backup AS
        SELECT * FROM withdrawals;
      `, { transaction });
      console.log('백업 테이블 생성 완료');

      // Step 2: 새 ENUM 타입 생성
      console.log('Step 2: 새 ENUM 타입 생성 중...');
      await queryInterface.sequelize.query(`
        CREATE TYPE enum_withdrawals_status_new AS ENUM (
          'withdrawal_wait',
          'aml_review',
          'approval_pending',
          'aml_issue',
          'processing',
          'success',
          'failed',
          'admin_rejected',
          'withdrawal_stopped',
          'withdrawal_request',
          'withdrawal_reapply',
          'rejected',
          'archived'
        );
      `, { transaction });
      console.log('새 ENUM 타입 생성 완료');

      // Step 3: 임시 컬럼 추가
      console.log('Step 3: 임시 컬럼 추가 중...');
      await queryInterface.sequelize.query(`
        ALTER TABLE withdrawals
        ADD COLUMN status_new enum_withdrawals_status_new;
      `, { transaction });
      console.log('임시 컬럼 추가 완료');

      // Step 4: 데이터 변환 및 복사
      console.log('Step 4: 데이터 변환 중...');

      const statusMapping = {
        'draft': 'withdrawal_request',        // 기업 임시저장 → 신청
        'submitted': 'withdrawal_request',    // 기업 신청
        'approved': 'approval_pending',       // 승인 완료 → 승인 대기
        'pending': 'withdrawal_wait',         // 대기 → 출금대기
        'processing': 'processing',           // 처리중 (유지)
        'completed': 'success',               // 완료 → 성공
        'rejected': 'admin_rejected',         // 거부 → 관리자 거부
        'cancelled': 'withdrawal_stopped',    // 취소 → 출금 정지
        'archived': 'archived',               // 아카이브 (유지)
        'stopped': 'withdrawal_stopped'       // 정지 → 출금 정지
      };

      for (const [oldStatus, newStatus] of Object.entries(statusMapping)) {
        const [result] = await queryInterface.sequelize.query(`
          UPDATE withdrawals
          SET status_new = :newStatus
          WHERE status = :oldStatus;
        `, {
          replacements: { oldStatus, newStatus },
          transaction
        });
        console.log(`  ${oldStatus} → ${newStatus}: ${result.rowCount || 0}개 레코드 변환`);
      }

      // Step 5: NULL 값 검증 (변환되지 않은 데이터 확인)
      console.log('Step 5: NULL 값 검증 중...');
      const [unmappedRecords] = await queryInterface.sequelize.query(`
        SELECT id, status
        FROM withdrawals
        WHERE status_new IS NULL;
      `, { transaction });

      if (unmappedRecords.length > 0) {
        console.error('변환되지 않은 상태값 발견:', unmappedRecords);
        throw new Error(
          `Unmapped status values found: ${JSON.stringify(unmappedRecords)}`
        );
      }
      console.log('모든 레코드 변환 완료');

      // Step 6: 기존 컬럼 삭제
      console.log('Step 6: 기존 컬럼 삭제 중...');
      await queryInterface.sequelize.query(`
        ALTER TABLE withdrawals DROP COLUMN status;
      `, { transaction });
      console.log('기존 컬럼 삭제 완료');

      // Step 7: 새 컬럼 이름 변경
      console.log('Step 7: 새 컬럼 이름 변경 중...');
      await queryInterface.sequelize.query(`
        ALTER TABLE withdrawals
        RENAME COLUMN status_new TO status;
      `, { transaction });
      console.log('컬럼 이름 변경 완료');

      // Step 8: NOT NULL 제약조건 추가
      console.log('Step 8: NOT NULL 제약조건 추가 중...');
      await queryInterface.sequelize.query(`
        ALTER TABLE withdrawals
        ALTER COLUMN status SET NOT NULL;
      `, { transaction });
      console.log('NOT NULL 제약조건 추가 완료');

      // Step 9: 기존 ENUM 타입 삭제
      console.log('Step 9: 기존 ENUM 타입 삭제 중...');
      await queryInterface.sequelize.query(`
        DROP TYPE enum_withdrawals_status;
      `, { transaction });
      console.log('기존 ENUM 타입 삭제 완료');

      // Step 10: 새 ENUM 타입 이름 변경
      console.log('Step 10: 새 ENUM 타입 이름 변경 중...');
      await queryInterface.sequelize.query(`
        ALTER TYPE enum_withdrawals_status_new
        RENAME TO enum_withdrawals_status;
      `, { transaction });
      console.log('ENUM 타입 이름 변경 완료');

      // Step 11: 인덱스 재생성
      console.log('Step 11: 인덱스 재생성 중...');
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_withdrawals_status
        ON withdrawals(status);
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_withdrawals_member_status
        ON withdrawals("memberType", status);
      `, { transaction });
      console.log('인덱스 재생성 완료');

      await transaction.commit();
      console.log('=== 마이그레이션 성공적으로 완료 ===');

    } catch (error) {
      await transaction.rollback();
      console.error('=== 마이그레이션 실패 ===');
      console.error('오류:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('=== 롤백 시작 ===');

      // 백업에서 복원
      console.log('백업 테이블에서 복원 중...');

      // 1. 현재 테이블 삭제
      await queryInterface.sequelize.query(`
        DROP TABLE IF EXISTS withdrawals;
      `, { transaction });

      // 2. 백업에서 복원
      await queryInterface.sequelize.query(`
        CREATE TABLE withdrawals AS
        SELECT * FROM withdrawals_backup;
      `, { transaction });

      // 3. 백업 테이블 삭제
      await queryInterface.sequelize.query(`
        DROP TABLE withdrawals_backup;
      `, { transaction });

      // 4. 새 ENUM 타입 삭제 (있다면)
      await queryInterface.sequelize.query(`
        DROP TYPE IF EXISTS enum_withdrawals_status_new;
      `, { transaction });

      await transaction.commit();
      console.log('=== 롤백 완료 ===');

    } catch (error) {
      await transaction.rollback();
      console.error('=== 롤백 실패 ===');
      console.error('오류:', error.message);
      throw error;
    }
  }
};
