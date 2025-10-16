/**
 * Migration: withdrawals 테이블 생성
 * 개인/법인 회원의 출금 요청 및 처리 기록을 관리하는 테이블
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 테이블 존재 여부 확인
    const tableExists = await queryInterface.showAllTables()
      .then(tables => tables.includes('withdrawals'));

    if (tableExists) {
      console.log('withdrawals 테이블이 이미 존재합니다. 스킵합니다.');
      return;
    }

    // withdrawals 테이블 생성
    await queryInterface.createTable('withdrawals', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      fromAddress: {
        type: Sequelize.STRING,
        allowNull: false
      },
      toAddress: {
        type: Sequelize.STRING,
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(30, 10),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false
      },
      userId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      memberType: {
        type: Sequelize.ENUM('individual', 'corporate'),
        allowNull: false
      },
      groupId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      initiator: {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM(
          'draft',
          'submitted',
          'approved',
          'pending',
          'processing',
          'completed',
          'rejected',
          'cancelled',
          'archived',
          'stopped'
        ),
        allowNull: false,
        defaultValue: 'draft'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      attachments: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: '[]'
      },
      requiredApprovals: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: '[]'
      },
      approvals: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: '[]'
      },
      rejections: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: '[]'
      },
      airGapSessionId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      securityReviewBy: {
        type: Sequelize.STRING,
        allowNull: true
      },
      securityReviewAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      signatureCompleted: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      txHash: {
        type: Sequelize.STRING,
        allowNull: true
      },
      blockConfirmations: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      queuePosition: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      waitingPeriodHours: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      processingScheduledAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      processingStep: {
        type: Sequelize.ENUM('security_check', 'blockchain_broadcast', 'confirmation'),
        allowNull: true
      },
      cancellable: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      cancelledAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      cancelledBy: {
        type: Sequelize.STRING,
        allowNull: true
      },
      rejectedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      auditTrail: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: '[]'
      },
      originalRequestId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      reapplicationCount: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      initiatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 인덱스 생성 - 검색 및 필터 성능 향상
    await queryInterface.addIndex('withdrawals', ['userId']);
    await queryInterface.addIndex('withdrawals', ['status']);
    await queryInterface.addIndex('withdrawals', ['currency']);
    await queryInterface.addIndex('withdrawals', ['initiatedAt']);
    await queryInterface.addIndex('withdrawals', ['memberType']);
    await queryInterface.addIndex('withdrawals', ['userId', 'status']);

    console.log('withdrawals 테이블 생성 완료');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('withdrawals');
  }
};
