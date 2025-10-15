const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VaultTransfer = sequelize.define('VaultTransfer', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    depositId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'deposits',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    fromAddress: {
      type: DataTypes.STRING,
      allowNull: false
    },
    toVaultAddress: {
      type: DataTypes.STRING,
      allowNull: false
    },
    vaultId: {
      type: DataTypes.INTEGER,
      allowNull: true
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
    txHash: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    gasUsed: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    gasFee: {
      type: DataTypes.DECIMAL(30, 18),
      allowNull: true
    },
    feeAmount: {
      type: DataTypes.DECIMAL(30, 6),
      allowNull: true,
      comment: 'Fee amount deducted from transfer'
    },
    feeRate: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      comment: 'Fee rate applied (e.g., 0.05 for 5%)'
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'confirmed', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    transferredAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'vault_transfers',
    timestamps: true,
    indexes: [
      {
        fields: ['depositId']
      },
      {
        unique: true,
        fields: ['txHash']
      },
      {
        fields: ['status']
      },
      {
        fields: ['fromAddress']
      },
      {
        fields: ['toVaultAddress']
      },
      {
        fields: ['vaultId']
      },
      {
        fields: ['transferredAt']
      }
    ]
  });

  return VaultTransfer;
};
