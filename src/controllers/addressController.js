const { Address } = require('../models');

/**
 * 주소 목록 조회
 * Query params: userId, type, coin, _page, _limit, _sort, _order
 */
exports.getAddresses = async (req, res) => {
  try {
    console.log('📥 주소 조회 요청:', {
      query: req.query,
      body: req.body,
      params: req.params
    });

    const {
      userId,
      type,
      coin,
      _page = 1,
      _limit = 100,
      _sort = 'addedAt',
      _order = 'desc'
    } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (coin) where.coin = coin;

    console.log('🔍 WHERE 조건:', where);

    const page = parseInt(_page);
    const limit = parseInt(_limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await Address.findAndCountAll({
      where,
      limit,
      offset,
      order: [[_sort, _order.toUpperCase()]]
    });

    console.log('✅ 조회 결과:', {
      count,
      rowsLength: rows.length,
      rows: rows.map(r => ({ id: r.id, userId: r.userId, coin: r.coin, label: r.label, canWithdraw: r.permissions.canWithdraw }))
    });

    res.set('X-Total-Count', count.toString());
    res.json(rows);
  } catch (error) {
    console.error('주소 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 주소 상세 조회
 */
exports.getAddressById = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findByPk(id);

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json(address);
  } catch (error) {
    console.error('주소 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 주소 생성
 */
exports.createAddress = async (req, res) => {
  try {
    const addressData = req.body;

    // ID가 없으면 자동 생성
    if (!addressData.id) {
      const type = addressData.type || 'personal';
      addressData.id = `addr_${type}_${Date.now()}`;
    }

    // addedAt이 없으면 현재 시각으로 설정
    if (!addressData.addedAt) {
      addressData.addedAt = new Date();
    }

    const address = await Address.create(addressData);
    res.status(201).json(address);
  } catch (error) {
    console.error('주소 생성 실패:', error);
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
 * 주소 수정 (PATCH)
 */
exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const address = await Address.findByPk(id);
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await address.update(updateData);
    res.json(address);
  } catch (error) {
    console.error('주소 수정 실패:', error);
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
 * 주소 삭제
 */
exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const address = await Address.findByPk(id);
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await address.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('주소 삭제 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 주소와 사용자 정보 함께 조회 (JOIN)
 * GET /api/addresses/:id/with-user
 */
exports.getAddressWithUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { User } = require('../models');

    const address = await Address.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'memberType', 'phone']
      }]
    });

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json(address);
  } catch (error) {
    console.error('주소 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 주소 사용 통계
 * GET /api/addresses/:id/usage-stats
 */
exports.getAddressUsageStats = async (req, res) => {
  try {
    const { id } = req.params;

    const address = await Address.findByPk(id);
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const stats = {
      addressInfo: {
        id: address.id,
        label: address.label,
        address: address.address,
        coin: address.coin,
        type: address.type
      },
      usage: {
        txCount: address.txCount,
        lastUsed: address.lastUsed,
        addedAt: address.addedAt
      },
      limits: {
        dailyLimits: address.dailyLimits,
        dailyUsage: address.dailyUsage
      },
      permissions: address.permissions
    };

    if (address.type === 'vasp' && address.vaspInfo) {
      stats.vaspInfo = address.vaspInfo;
    }

    res.json(stats);
  } catch (error) {
    console.error('주소 통계 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 일일 사용량 업데이트 (트랜잭션)
 * PATCH /api/addresses/:id/daily-usage
 */
exports.updateDailyUsage = async (req, res) => {
  const { sequelize } = require('../models');
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { depositAmount, withdrawalAmount } = req.body;

    const address = await Address.findByPk(id, { transaction: t });
    if (!address) {
      await t.rollback();
      return res.status(404).json({ error: 'Address not found' });
    }

    const today = new Date().toISOString().split('T')[0];
    const currentUsage = address.dailyUsage || {};

    // 날짜가 바뀌었으면 리셋
    const shouldReset = !currentUsage.date || currentUsage.date !== today;

    const newUsage = {
      date: today,
      depositAmount: shouldReset
        ? (depositAmount || 0)
        : (currentUsage.depositAmount || 0) + (depositAmount || 0),
      withdrawalAmount: shouldReset
        ? (withdrawalAmount || 0)
        : (currentUsage.withdrawalAmount || 0) + (withdrawalAmount || 0),
      lastResetAt: shouldReset ? new Date().toISOString() : currentUsage.lastResetAt
    };

    // 한도 체크
    const limits = address.dailyLimits || { deposit: 1000000, withdrawal: 1000000 };
    if (newUsage.depositAmount > limits.deposit) {
      await t.rollback();
      return res.status(400).json({
        error: 'Daily deposit limit exceeded',
        limit: limits.deposit,
        current: newUsage.depositAmount
      });
    }
    if (newUsage.withdrawalAmount > limits.withdrawal) {
      await t.rollback();
      return res.status(400).json({
        error: 'Daily withdrawal limit exceeded',
        limit: limits.withdrawal,
        current: newUsage.withdrawalAmount
      });
    }

    await address.update({ dailyUsage: newUsage }, { transaction: t });
    await t.commit();

    res.json(address);
  } catch (error) {
    await t.rollback();
    console.error('일일 사용량 업데이트 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
