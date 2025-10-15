const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    pool: dbConfig.pool,
    logging: dbConfig.logging
  }
);

const db = {
  sequelize,
  Sequelize
};

// Import models
db.User = require('./User')(sequelize);
db.Address = require('./Address')(sequelize);
db.DepositAddress = require('./DepositAddress')(sequelize);
db.Deposit = require('./Deposit')(sequelize);
db.VaultTransfer = require('./VaultTransfer')(sequelize);

// Define associations
db.User.hasMany(db.Address, { foreignKey: 'userId', as: 'addresses' });
db.Address.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

db.User.hasMany(db.DepositAddress, { foreignKey: 'userId', as: 'depositAddresses' });
db.DepositAddress.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

db.User.hasMany(db.Deposit, { foreignKey: 'userId', as: 'deposits' });
db.Deposit.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

db.DepositAddress.hasMany(db.Deposit, { foreignKey: 'depositAddressId', as: 'deposits' });
db.Deposit.belongsTo(db.DepositAddress, { foreignKey: 'depositAddressId', as: 'depositAddress' });

db.Deposit.hasMany(db.VaultTransfer, { foreignKey: 'depositId', as: 'vaultTransfers' });
db.VaultTransfer.belongsTo(db.Deposit, { foreignKey: 'depositId', as: 'deposit' });

module.exports = db;
