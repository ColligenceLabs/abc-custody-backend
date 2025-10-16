const { Withdrawal } = require('../models');
const { Op } = require('sequelize');

/**
 * 출금 목록 조회
 * Query params: userId, memberType, status, currency, search, dateFrom, dateTo, _page, _limit, _sort, _order
 */
exports.getWithdrawals = async (req, res) => {
  try {
    const {
      userId,
      memberType,
      status,
      currency,
      search,
      dateFrom,
      dateTo,
      _page = 1,
      _limit = 100,
      _sort = 'initiatedAt',
      _order = 'desc'
    } = req.query;

    const where = {};

    // 필터 조건 설정
    if (userId) where.userId = userId;
    if (memberType) where.memberType = memberType;
    if (status) where.status = status;
    if (currency) where.currency = currency;

    // 검색 조건 (ID, 제목, 자산)
    if (search) {
      where[Op.or] = [
        { id: { [Op.iLike]: `%${search}%` } },
        { title: { [Op.iLike]: `%${search}%` } },
        { currency: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // 기간 필터
    if (dateFrom || dateTo) {
      where.initiatedAt = {};
      if (dateFrom) where.initiatedAt[Op.gte] = new Date(dateFrom);
      if (dateTo) where.initiatedAt[Op.lte] = new Date(dateTo);
    }

    const page = parseInt(_page);
    const limit = parseInt(_limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await Withdrawal.findAndCountAll({
      where,
      limit,
      offset,
      order: [[_sort, _order.toUpperCase()]]
    });

    res.set('X-Total-Count', count.toString());
    res.json(rows);
  } catch (error) {
    console.error('출금 목록 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 출금 상세 조회
 */
exports.getWithdrawalById = async (req, res) => {
  try {
    const { id } = req.params;
    const withdrawal = await Withdrawal.findByPk(id);

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    res.json(withdrawal);
  } catch (error) {
    console.error('출금 상세 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 출금 신청 생성
 */
exports.createWithdrawal = async (req, res) => {
  try {
    const withdrawalData = req.body;

    // 필수 필드 검증
    const requiredFields = ['id', 'title', 'fromAddress', 'toAddress', 'amount', 'currency', 'userId', 'memberType', 'initiator'];
    for (const field of requiredFields) {
      if (!withdrawalData[field]) {
        return res.status(400).json({
          error: 'Validation error',
          message: `Required field missing: ${field}`
        });
      }
    }

    // 중복 ID 확인
    const existing = await Withdrawal.findByPk(withdrawalData.id);
    if (existing) {
      return res.status(409).json({
        error: 'Duplicate ID',
        message: '이미 존재하는 출금 신청 ID입니다.'
      });
    }

    // initiatedAt이 없으면 현재 시간으로 설정
    if (!withdrawalData.initiatedAt) {
      withdrawalData.initiatedAt = new Date();
    }

    // 출금 신청 생성
    const withdrawal = await Withdrawal.create(withdrawalData);

    res.status(201).json(withdrawal);
  } catch (error) {
    console.error('출금 신청 생성 실패:', error);
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors?.map(e => ({
          field: e.path,
          message: e.message
        })) || [{ message: error.message }]
      });
    }
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 출금 정보 수정 (PATCH)
 */
exports.updateWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const withdrawal = await Withdrawal.findByPk(id);
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    await withdrawal.update(updateData);
    res.json(withdrawal);
  } catch (error) {
    console.error('출금 정보 수정 실패:', error);
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
 * 출금 신청 삭제 (Hard Delete)
 */
exports.deleteWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;

    const withdrawal = await Withdrawal.findByPk(id);
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // Hard delete: DB에서 실제로 삭제
    await withdrawal.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('출금 신청 삭제 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
