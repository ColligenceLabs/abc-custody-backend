'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 컬럼 존재 여부 확인
    const tableDescription = await queryInterface.describeTable('vault_transfers');

    if (!tableDescription.feeAmount) {
      await queryInterface.addColumn('vault_transfers', 'feeAmount', {
        type: Sequelize.DECIMAL(30, 6),
        allowNull: true,
        defaultValue: null
      });
      console.log('feeAmount 컬럼이 추가되었습니다.');
    } else {
      console.log('feeAmount 컬럼이 이미 존재합니다. 스킵합니다.');
    }

    if (!tableDescription.feeRate) {
      await queryInterface.addColumn('vault_transfers', 'feeRate', {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true,
        defaultValue: null
      });
      console.log('feeRate 컬럼이 추가되었습니다.');
    } else {
      console.log('feeRate 컬럼이 이미 존재합니다. 스킵합니다.');
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('vault_transfers');

    if (tableDescription.feeAmount) {
      await queryInterface.removeColumn('vault_transfers', 'feeAmount');
    }

    if (tableDescription.feeRate) {
      await queryInterface.removeColumn('vault_transfers', 'feeRate');
    }
  }
};
