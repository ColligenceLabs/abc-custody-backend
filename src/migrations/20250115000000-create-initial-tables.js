'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('admin', 'manager', 'operator', 'viewer'),
        allowNull: false,
        defaultValue: 'viewer'
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'pending'),
        allowNull: false,
        defaultValue: 'pending'
      },
      lastLogin: {
        type: Sequelize.DATE,
        allowNull: true
      },
      permissions: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      },
      department: {
        type: Sequelize.STRING,
        allowNull: true
      },
      position: {
        type: Sequelize.STRING,
        allowNull: true
      },
      hasGASetup: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      gaSetupDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      totpSecret: {
        type: Sequelize.STRING,
        allowNull: true
      },
      isFirstLogin: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      memberType: {
        type: Sequelize.ENUM('individual', 'corporate'),
        allowNull: false
      },
      individualUserId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      birthDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      gender: {
        type: Sequelize.ENUM('male', 'female'),
        allowNull: true
      },
      residentNumber: {
        type: Sequelize.STRING,
        allowNull: true
      },
      identityVerified: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      kycLevel: {
        type: Sequelize.ENUM('level1', 'level2', 'level3'),
        allowNull: true
      },
      kycVerifiedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      walletLimit: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      carrier: {
        type: Sequelize.STRING,
        allowNull: true
      },
      fundSource: {
        type: Sequelize.STRING,
        allowNull: true
      },
      organizationUserId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      organizationId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      memberId: {
        type: Sequelize.STRING,
        allowNull: false
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

    // Create indexes for users table
    await queryInterface.addIndex('users', ['email'], { unique: true });
    await queryInterface.addIndex('users', ['memberType']);
    await queryInterface.addIndex('users', ['status']);
    await queryInterface.addIndex('users', ['organizationId']);

    // Create addresses table
    await queryInterface.createTable('addresses', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
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
      label: {
        type: Sequelize.STRING,
        allowNull: false
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false
      },
      coin: {
        type: Sequelize.STRING,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('personal', 'vasp'),
        allowNull: false,
        defaultValue: 'personal'
      },
      permissions: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: { canDeposit: true, canWithdraw: true }
      },
      addedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      lastUsed: {
        type: Sequelize.DATE,
        allowNull: true
      },
      txCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      dailyLimits: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: { deposit: 1000000, withdrawal: 1000000 }
      },
      dailyUsage: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      vaspInfo: {
        type: Sequelize.JSONB,
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

    // Create indexes for addresses table
    await queryInterface.addIndex('addresses', ['userId']);
    await queryInterface.addIndex('addresses', ['type']);
    await queryInterface.addIndex('addresses', ['coin']);
    await queryInterface.addIndex('addresses', ['address']);

    // Create deposit_addresses table
    await queryInterface.createTable('deposit_addresses', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
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
      label: {
        type: Sequelize.STRING,
        allowNull: false
      },
      coin: {
        type: Sequelize.STRING,
        allowNull: false
      },
      network: {
        type: Sequelize.STRING,
        allowNull: false
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      privateKey: {
        type: Sequelize.STRING,
        allowNull: true
      },
      type: {
        type: Sequelize.ENUM('personal', 'vasp'),
        allowNull: false,
        defaultValue: 'personal'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      addedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      contractAddress: {
        type: Sequelize.STRING,
        allowNull: true
      },
      priceKRW: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true
      },
      priceUSD: {
        type: Sequelize.DECIMAL(20, 2),
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

    // Create indexes for deposit_addresses table
    await queryInterface.addIndex('deposit_addresses', ['address'], { unique: true });
    await queryInterface.addIndex('deposit_addresses', ['userId']);
    await queryInterface.addIndex('deposit_addresses', ['coin']);
    await queryInterface.addIndex('deposit_addresses', ['network']);
    await queryInterface.addIndex('deposit_addresses', ['isActive']);

    // Create deposits table
    await queryInterface.createTable('deposits', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
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
      depositAddressId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'deposit_addresses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      txHash: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
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
      fromAddress: {
        type: Sequelize.STRING,
        allowNull: false
      },
      toAddress: {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('detected', 'confirming', 'confirmed', 'credited'),
        allowNull: false,
        defaultValue: 'detected'
      },
      senderVerified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      currentConfirmations: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      requiredConfirmations: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 12
      },
      blockHeight: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      detectedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
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

    // Create indexes for deposits table
    await queryInterface.addIndex('deposits', ['txHash'], { unique: true });
    await queryInterface.addIndex('deposits', ['userId']);
    await queryInterface.addIndex('deposits', ['depositAddressId']);
    await queryInterface.addIndex('deposits', ['status']);
    await queryInterface.addIndex('deposits', ['asset']);
    await queryInterface.addIndex('deposits', ['detectedAt']);
    await queryInterface.addIndex('deposits', ['confirmedAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('deposits');
    await queryInterface.dropTable('deposit_addresses');
    await queryInterface.dropTable('addresses');
    await queryInterface.dropTable('users');
  }
};
