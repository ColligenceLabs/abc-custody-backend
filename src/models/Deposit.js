const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Deposit = sequelize.define('Deposit', {
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
    depositAddressId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'deposit_addresses',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    txHash: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    asset: {
      type: DataTypes.STRING,
      allowNull: false
    },
    network: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(30, 6),
      allowNull: false
    },
    fromAddress: {
      type: DataTypes.STRING,
      allowNull: false
    },
    toAddress: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('detected', 'confirming', 'confirmed', 'credited'),
      allowNull: false,
      defaultValue: 'detected'
    },
    senderVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    currentConfirmations: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    requiredConfirmations: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 12
    },
    blockHeight: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    detectedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'deposits',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['txHash']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['depositAddressId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['asset']
      },
      {
        fields: ['detectedAt']
      },
      {
        fields: ['confirmedAt']
      }
    ]
  });

  return Deposit;
};
