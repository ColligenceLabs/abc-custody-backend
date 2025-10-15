/**
 * Migration: vault_transfers 테이블 생성
 * BlockDaemon Vault로의 자금 전송 기록을 관리하는 테이블
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 테이블 존재 여부 확인
    const tableExists = await queryInterface.showAllTables()
      .then(tables => tables.includes('vault_transfers'));

    if (tableExists) {
      console.log('vault_transfers 테이블이 이미 존재합니다. 스킵합니다.');
      return;
    }

    // camelCase 컬럼명으로 테이블 생성
    await queryInterface.createTable('vault_transfers', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false
      },
      depositId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'deposits',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      fromAddress: {
        type: Sequelize.STRING,
        allowNull: false
      },
      toVaultAddress: {
        type: Sequelize.STRING,
        allowNull: false
      },
      vaultId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      asset: {
        type: Sequelize.STRING,
        allowNull: false
      },
      network: {
        type: Sequelize.STRING,
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(30, 6),
        allowNull: false
      },
      txHash: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      gasUsed: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      gasFee: {
        type: Sequelize.DECIMAL(30, 18),
        allowNull: true
      },
      feeAmount: {
        type: Sequelize.DECIMAL(30, 6),
        allowNull: true
      },
      feeRate: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'sent', 'confirmed', 'failed'),
        allowNull: false,
        defaultValue: 'pending'
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      transferredAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      confirmedAt: {
        type: Sequelize.DATE,
        allowNull: true
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

    // 인덱스 생성
    await queryInterface.addIndex('vault_transfers', ['depositId']);
    await queryInterface.addIndex('vault_transfers', ['txHash'], { unique: true });
    await queryInterface.addIndex('vault_transfers', ['status']);
    await queryInterface.addIndex('vault_transfers', ['fromAddress']);
    await queryInterface.addIndex('vault_transfers', ['toVaultAddress']);
    await queryInterface.addIndex('vault_transfers', ['vaultId']);
    await queryInterface.addIndex('vault_transfers', ['transferredAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('vault_transfers');
  }
};
