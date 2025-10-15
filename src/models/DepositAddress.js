const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DepositAddress = sequelize.define('DepositAddress', {
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
    coin: {
      type: DataTypes.STRING,
      allowNull: false
    },
    network: {
      type: DataTypes.STRING,
      allowNull: false
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    privateKey: {
      type: DataTypes.STRING,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('personal', 'vasp'),
      allowNull: false,
      defaultValue: 'personal'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    addedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    contractAddress: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
    priceKRW: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: true
    },
    priceUSD: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: true
    }
  }, {
    tableName: 'deposit_addresses',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['address']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['coin']
      },
      {
        fields: ['network']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  return DepositAddress;
};
