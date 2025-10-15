const { User } = require('../models');
const { Op } = require('sequelize');

/**
 * 사용자 목록 조회
 * Query params: email, memberType, status, role, _page, _limit, _sort, _order
 */
exports.getUsers = async (req, res) => {
  try {
    const {
      email,
      memberType,
      status,
      role,
      _page = 1,
      _limit = 100,
      _sort = 'createdAt',
      _order = 'desc'
    } = req.query;

    const where = {};
    if (email) where.email = email;
    if (memberType) where.memberType = memberType;
    if (status) where.status = status;
    if (role) where.role = role;

    const page = parseInt(_page);
    const limit = parseInt(_limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [[_sort, _order.toUpperCase()]]
    });

    res.set('X-Total-Count', count.toString());
    res.json(rows);
  } catch (error) {
    console.error('사용자 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 사용자 상세 조회
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('사용자 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 사용자 생성
 */
exports.createUser = async (req, res) => {
  try {
    const userData = req.body;

    // ID가 없으면 자동 생성
    if (!userData.id) {
      userData.id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    const user = await User.create(userData);
    res.status(201).json(user);
  } catch (error) {
    console.error('사용자 생성 실패:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 사용자 수정 (PATCH)
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update(updateData);
    res.json(user);
  } catch (error) {
    console.error('사용자 수정 실패:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 사용자 삭제
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('사용자 삭제 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 사용자 출금 주소 목록 조회 (JOIN)
 * GET /api/users/:id/addresses
 */
exports.getUserAddresses = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, coin, _page = 1, _limit = 100, _sort = 'addedAt', _order = 'desc' } = req.query;

    const { Address } = require('../models');

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const where = { userId: id };
    if (type) where.type = type;
    if (coin) where.coin = coin;

    const page = parseInt(_page);
    const limit = parseInt(_limit);
    const offset = (page - 1) * limit;

    const { count, rows: addresses } = await Address.findAndCountAll({
      where,
      limit,
      offset,
      order: [[_sort, _order.toUpperCase()]]
    });

    res.set('X-Total-Count', count.toString());
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        memberType: user.memberType
      },
      addresses,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('사용자 주소 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 사용자 입금 주소 목록 조회 (JOIN)
 * GET /api/users/:id/deposit-addresses
 */
exports.getUserDepositAddresses = async (req, res) => {
  try {
    const { id } = req.params;
    const { coin, network, isActive, _page = 1, _limit = 100, _sort = 'addedAt', _order = 'desc' } = req.query;

    const { DepositAddress } = require('../models');

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const where = { userId: id };
    if (coin) where.coin = coin;
    if (network) where.network = network;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const page = parseInt(_page);
    const limit = parseInt(_limit);
    const offset = (page - 1) * limit;

    const { count, rows: depositAddresses } = await DepositAddress.findAndCountAll({
      where,
      limit,
      offset,
      order: [[_sort, _order.toUpperCase()]]
    });

    res.set('X-Total-Count', count.toString());
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        memberType: user.memberType
      },
      depositAddresses,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('사용자 입금 주소 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 사용자 입금 내역 조회 (JOIN with DepositAddress)
 * GET /api/users/:id/deposits
 */
exports.getUserDeposits = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, asset, network, _page = 1, _limit = 100, _sort = 'detectedAt', _order = 'desc' } = req.query;

    const { Deposit, DepositAddress } = require('../models');

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const where = { userId: id };
    if (asset) where.asset = asset;
    if (network) where.network = network;
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      where.status = { [Op.in]: statusArray };
    }

    const page = parseInt(_page);
    const limit = parseInt(_limit);
    const offset = (page - 1) * limit;

    const { count, rows: deposits } = await Deposit.findAndCountAll({
      where,
      include: [{
        model: DepositAddress,
        as: 'depositAddress',
        attributes: ['id', 'label', 'address', 'coin', 'network']
      }],
      limit,
      offset,
      order: [[_sort, _order.toUpperCase()]]
    });

    res.set('X-Total-Count', count.toString());
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        memberType: user.memberType
      },
      deposits,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('사용자 입금 내역 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 사용자 통계 조회
 * GET /api/users/:id/stats
 */
exports.getUserStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { sequelize } = require('../models');

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 통계 쿼리 실행
    const [addressStats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_addresses,
        COUNT(CASE WHEN type = 'personal' THEN 1 END) as personal_addresses,
        COUNT(CASE WHEN type = 'vasp' THEN 1 END) as vasp_addresses,
        SUM(tx_count) as total_transactions
      FROM addresses
      WHERE user_id = :userId
    `, {
      replacements: { userId: id },
      type: sequelize.QueryTypes.SELECT
    });

    const [depositStats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_deposits,
        COUNT(CASE WHEN status = 'confirmed' OR status = 'credited' THEN 1 END) as confirmed_deposits,
        SUM(CASE WHEN status = 'confirmed' OR status = 'credited' THEN CAST(amount AS DECIMAL) ELSE 0 END) as total_amount,
        MAX(detected_at) as last_deposit_at
      FROM deposits
      WHERE user_id = :userId
    `, {
      replacements: { userId: id },
      type: sequelize.QueryTypes.SELECT
    });

    const [depositAddressStats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_deposit_addresses,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_addresses
      FROM deposit_addresses
      WHERE user_id = :userId
    `, {
      replacements: { userId: id },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        memberType: user.memberType
      },
      stats: {
        addresses: {
          total: parseInt(addressStats.total_addresses) || 0,
          personal: parseInt(addressStats.personal_addresses) || 0,
          vasp: parseInt(addressStats.vasp_addresses) || 0,
          totalTransactions: parseInt(addressStats.total_transactions) || 0
        },
        deposits: {
          total: parseInt(depositStats.total_deposits) || 0,
          confirmed: parseInt(depositStats.confirmed_deposits) || 0,
          totalAmount: parseFloat(depositStats.total_amount) || 0,
          lastDepositAt: depositStats.last_deposit_at
        },
        depositAddresses: {
          total: parseInt(depositAddressStats.total_deposit_addresses) || 0,
          active: parseInt(depositAddressStats.active_addresses) || 0
        }
      }
    });
  } catch (error) {
    console.error('사용자 통계 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
