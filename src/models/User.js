const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'manager', 'operator', 'viewer'),
      allowNull: false,
      defaultValue: 'viewer'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'pending'),
      allowNull: false,
      defaultValue: 'pending'
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true
    },
    position: {
      type: DataTypes.STRING,
      allowNull: true
    },
    hasGASetup: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    gaSetupDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    totpSecret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isFirstLogin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    memberType: {
      type: DataTypes.ENUM('individual', 'corporate'),
      allowNull: false
    },
    // Individual 회원 전용 필드
    individualUserId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    gender: {
      type: DataTypes.ENUM('male', 'female'),
      allowNull: true
    },
    residentNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    identityVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    kycLevel: {
      type: DataTypes.ENUM('level1', 'level2', 'level3'),
      allowNull: true
    },
    kycVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    walletLimit: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        dailyWithdrawal: 10000000,
        monthlyWithdrawal: 50000000,
        singleTransaction: 5000000
      }
    },
    carrier: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fundSource: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Corporate 회원 전용 필드
    organizationUserId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    organizationId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    memberId: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'users',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        fields: ['memberType']
      },
      {
        fields: ['status']
      },
      {
        fields: ['organizationId']
      }
    ]
  });

  return User;
};
