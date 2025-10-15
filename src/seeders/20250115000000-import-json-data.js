'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // JSON 파일 읽기 (프론트엔드 프로젝트의 db.json 파일)
    const jsonPath = path.join(__dirname, '../../../abc-custody/json-server/db.json');

    let data;
    try {
      const jsonData = fs.readFileSync(jsonPath, 'utf8');
      data = JSON.parse(jsonData);
    } catch (error) {
      console.log('db.json 파일을 찾을 수 없습니다. 테스트 데이터를 생성합니다.');
      // db.json이 없을 경우 기본 데이터
      data = {
        users: [],
        addresses: [],
        depositAddresses: [],
        deposits: []
      };
    }

    // Users 데이터 임포트
    if (data.users && data.users.length > 0) {
      const users = data.users.map(user => ({
        ...user,
        lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
        gaSetupDate: user.gaSetupDate ? new Date(user.gaSetupDate) : null,
        kycVerifiedAt: user.kycVerifiedAt ? new Date(user.kycVerifiedAt) : null,
        birthDate: user.birthDate || null,
        permissions: JSON.stringify(user.permissions || []),
        walletLimit: user.walletLimit ? JSON.stringify(user.walletLimit) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await queryInterface.bulkInsert('users', users, {});
      console.log(`✅ ${users.length}개의 사용자 데이터를 임포트했습니다.`);
    }

    // Addresses 데이터 임포트
    if (data.addresses && data.addresses.length > 0) {
      const addresses = data.addresses.map(addr => ({
        ...addr,
        addedAt: addr.addedAt ? new Date(addr.addedAt) : new Date(),
        lastUsed: addr.lastUsed ? new Date(addr.lastUsed) : null,
        permissions: JSON.stringify(addr.permissions || { canDeposit: true, canWithdraw: true }),
        dailyLimits: JSON.stringify(addr.dailyLimits || { deposit: 1000000, withdrawal: 1000000 }),
        dailyUsage: addr.dailyUsage ? JSON.stringify(addr.dailyUsage) : null,
        vaspInfo: addr.vaspInfo ? JSON.stringify(addr.vaspInfo) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await queryInterface.bulkInsert('addresses', addresses, {});
      console.log(`✅ ${addresses.length}개의 출금 주소 데이터를 임포트했습니다.`);
    }

    // Deposit Addresses 데이터 임포트
    if (data.depositAddresses && data.depositAddresses.length > 0) {
      const depositAddresses = data.depositAddresses.map(addr => ({
        ...addr,
        addedAt: addr.addedAt ? new Date(addr.addedAt) : new Date(),
        priceKRW: addr.priceKRW || null,
        priceUSD: addr.priceUSD || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await queryInterface.bulkInsert('deposit_addresses', depositAddresses, {});
      console.log(`✅ ${depositAddresses.length}개의 입금 주소 데이터를 임포트했습니다.`);
    }

    // Deposits 데이터 임포트
    if (data.deposits && data.deposits.length > 0) {
      const deposits = data.deposits.map(dep => ({
        ...dep,
        detectedAt: dep.detectedAt ? new Date(dep.detectedAt) : new Date(),
        confirmedAt: dep.confirmedAt ? new Date(dep.confirmedAt) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await queryInterface.bulkInsert('deposits', deposits, {});
      console.log(`✅ ${deposits.length}개의 입금 데이터를 임포트했습니다.`);
    }

    console.log('🎉 모든 데이터 임포트가 완료되었습니다!');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('deposits', null, {});
    await queryInterface.bulkDelete('deposit_addresses', null, {});
    await queryInterface.bulkDelete('addresses', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
