const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Address = sequelize.define('Address', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    coin: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('personal', 'vasp'),
      allowNull: false,
      defaultValue: 'personal'
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        canDeposit: true,
        canWithdraw: true
      }
    },
    addedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    lastUsed: {
      type: DataTypes.DATE,
      allowNull: true
    },
    txCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    dailyLimits: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        deposit: 1000000,
        withdrawal: 1000000
      }
    },
    dailyUsage: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        date: new Date().toISOString().split('T')[0],
        depositAmount: 0,
        withdrawalAmount: 0,
        lastResetAt: new Date().toISOString()
      }
    },
    // VASP 전용 필드
    vaspInfo: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    }
  }, {
    tableName: 'addresses',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['type']
      },
      {
        fields: ['coin']
      },
      {
        fields: ['address']
      }
    ]
  });

  return Address;
};
