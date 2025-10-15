const { Deposit } = require('../models');
const { Op } = require('sequelize');

/**
 * 입금 내역 조회
 * Query params: userId, status (다중), asset, _page, _limit, _sort, _order
 */
exports.getDeposits = async (req, res) => {
  try {
    const {
      userId,
      status,
      asset,
      _page = 1,
      _limit = 100,
      _sort = 'detectedAt',
      _order = 'desc'
    } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (asset) where.asset = asset;

    // status는 배열로 올 수 있음 (json-server와 동일한 동작)
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      where.status = { [Op.in]: statusArray };
    }

    const page = parseInt(_page);
    const limit = parseInt(_limit);
    const offset = (page - 1) * limit;

    const { VaultTransfer } = require('../models');

    const { count, rows } = await Deposit.findAndCountAll({
      where,
      include: [
        {
          model: VaultTransfer,
          as: 'vaultTransfers',
          required: false,
          attributes: ['id', 'status', 'txHash', 'feeAmount', 'feeRate', 'transferredAt', 'confirmedAt']
        }
      ],
      limit,
      offset,
      order: [[_sort, _order.toUpperCase()]]
    });

    // Vault 전송 정보 추가
    const depositsWithVaultInfo = rows.map(deposit => {
      const depositJson = deposit.toJSON();
      const vaultTransferred = depositJson.vaultTransfers?.some(vt => vt.status === 'confirmed') || false;
      const latestVaultTransfer = depositJson.vaultTransfers?.[0] || null;

      return {
        ...depositJson,
        vaultTransferred,
        latestVaultTransfer
      };
    });

    res.set('X-Total-Count', count.toString());
    res.json(depositsWithVaultInfo);
  } catch (error) {
    console.error('입금 내역 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 입금 상세 조회
 */
exports.getDepositById = async (req, res) => {
  try {
    const { id } = req.params;
    const deposit = await Deposit.findByPk(id);

    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    res.json(deposit);
  } catch (error) {
    console.error('입금 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * txHash로 입금 조회
 */
exports.getDepositByTxHash = async (req, res) => {
  try {
    const { txHash } = req.params;
    const deposit = await Deposit.findOne({
      where: { txHash }
    });

    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    res.json(deposit);
  } catch (error) {
    console.error('입금 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 입금 생성
 */
exports.createDeposit = async (req, res) => {
  try {
    const depositData = req.body;

    // 중복 txHash 확인
    if (depositData.txHash) {
      const existing = await Deposit.findOne({
        where: { txHash: depositData.txHash }
      });

      if (existing) {
        return res.status(409).json({ error: 'Transaction already exists' });
      }
    }

    // ID가 없으면 자동 생성
    if (!depositData.id) {
      depositData.id = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // detectedAt이 없으면 현재 시각으로 설정
    if (!depositData.detectedAt) {
      depositData.detectedAt = new Date();
    }

    const deposit = await Deposit.create(depositData);
    res.status(201).json(deposit);
  } catch (error) {
    console.error('입금 생성 실패:', error);
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
 * 입금 수정 (PATCH)
 */
exports.updateDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const deposit = await Deposit.findByPk(id);
    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    await deposit.update(updateData);
    res.json(deposit);
  } catch (error) {
    console.error('입금 수정 실패:', error);
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
 * 입금 삭제
 */
exports.deleteDeposit = async (req, res) => {
  try {
    const { id } = req.params;

    const deposit = await Deposit.findByPk(id);
    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    await deposit.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('입금 삭제 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 입금 전체 정보 조회 (User + DepositAddress JOIN)
 * GET /api/deposits/:id/full
 */
exports.getDepositFull = async (req, res) => {
  try {
    const { id } = req.params;
    const { User, DepositAddress } = require('../models');

    const deposit = await Deposit.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'memberType', 'phone']
        },
        {
          model: DepositAddress,
          as: 'depositAddress',
          attributes: ['id', 'label', 'address', 'coin', 'network', 'type']
        }
      ]
    });

    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    res.json(deposit);
  } catch (error) {
    console.error('입금 전체 정보 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 입금 요약 통계
 * GET /api/deposits/summary
 */
exports.getDepositsSummary = async (req, res) => {
  try {
    const { userId, asset, network, startDate, endDate } = req.query;
    const { sequelize } = require('../models');

    const conditions = [];
    const replacements = {};

    if (userId) {
      conditions.push('user_id = :userId');
      replacements.userId = userId;
    }
    if (asset) {
      conditions.push('asset = :asset');
      replacements.asset = asset;
    }
    if (network) {
      conditions.push('network = :network');
      replacements.network = network;
    }
    if (startDate) {
      conditions.push('detected_at >= :startDate');
      replacements.startDate = startDate;
    }
    if (endDate) {
      conditions.push('detected_at <= :endDate');
      replacements.endDate = endDate;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 상태별 통계
    const [statusStats] = await sequelize.query(`
      SELECT
        status,
        COUNT(*) as count,
        SUM(CAST(amount AS DECIMAL)) as total_amount
      FROM deposits
      ${whereClause}
      GROUP BY status
      ORDER BY status
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    // 자산별 통계
    const assetStats = await sequelize.query(`
      SELECT
        asset,
        COUNT(*) as count,
        SUM(CAST(amount AS DECIMAL)) as total_amount,
        AVG(CAST(amount AS DECIMAL)) as avg_amount,
        MIN(CAST(amount AS DECIMAL)) as min_amount,
        MAX(CAST(amount AS DECIMAL)) as max_amount
      FROM deposits
      ${whereClause}
      GROUP BY asset
      ORDER BY total_amount DESC
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    // 네트워크별 통계
    const networkStats = await sequelize.query(`
      SELECT
        network,
        COUNT(*) as count,
        SUM(CAST(amount AS DECIMAL)) as total_amount
      FROM deposits
      ${whereClause}
      GROUP BY network
      ORDER BY count DESC
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    // 전체 통계
    const [overallStats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_deposits,
        SUM(CAST(amount AS DECIMAL)) as total_amount,
        AVG(CAST(amount AS DECIMAL)) as avg_amount,
        MIN(detected_at) as first_deposit,
        MAX(detected_at) as last_deposit
      FROM deposits
      ${whereClause}
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      overall: {
        totalDeposits: parseInt(overallStats.total_deposits) || 0,
        totalAmount: parseFloat(overallStats.total_amount) || 0,
        avgAmount: parseFloat(overallStats.avg_amount) || 0,
        firstDeposit: overallStats.first_deposit,
        lastDeposit: overallStats.last_deposit
      },
      byStatus: statusStats || [],
      byAsset: assetStats || [],
      byNetwork: networkStats || []
    });
  } catch (error) {
    console.error('입금 통계 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 대량 입금 생성 (트랜잭션)
 * POST /api/deposits/bulk
 */
exports.createBulkDeposits = async (req, res) => {
  const { sequelize } = require('../models');
  const t = await sequelize.transaction();

  try {
    const { deposits } = req.body;

    if (!Array.isArray(deposits) || deposits.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'deposits array is required' });
    }

    const createdDeposits = [];

    for (const depositData of deposits) {
      // 중복 txHash 확인
      if (depositData.txHash) {
        const existing = await Deposit.findOne({
          where: { txHash: depositData.txHash },
          transaction: t
        });

        if (existing) {
          continue; // 이미 존재하는 경우 스킵
        }
      }

      // ID가 없으면 자동 생성
      if (!depositData.id) {
        depositData.id = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // detectedAt이 없으면 현재 시각으로 설정
      if (!depositData.detectedAt) {
        depositData.detectedAt = new Date();
      }

      const deposit = await Deposit.create(depositData, { transaction: t });
      createdDeposits.push(deposit);
    }

    await t.commit();

    res.status(201).json({
      success: true,
      created: createdDeposits.length,
      deposits: createdDeposits
    });
  } catch (error) {
    await t.rollback();
    console.error('대량 입금 생성 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 진행 중인 입금 조회 (detected, confirming 상태)
 * GET /api/deposits/active?userId=xxx
 */
exports.getActiveDeposits = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { VaultTransfer } = require('../models');

    const deposits = await Deposit.findAll({
      where: {
        userId,
        status: { [Op.in]: ['detected', 'confirming'] }
      },
      include: [
        {
          model: VaultTransfer,
          as: 'vaultTransfers',
          required: false,
          attributes: ['id', 'status', 'txHash', 'feeAmount', 'feeRate', 'transferredAt', 'confirmedAt']
        }
      ],
      order: [['detectedAt', 'DESC']]
    });

    // Vault 전송 정보 추가 (진행 중인 입금은 보통 전송 전이지만 일관성을 위해 포함)
    const depositsWithVaultInfo = deposits.map(deposit => {
      const depositJson = deposit.toJSON();
      const vaultTransferred = depositJson.vaultTransfers?.some(vt => vt.status === 'confirmed') || false;
      const latestVaultTransfer = depositJson.vaultTransfers?.[0] || null;

      return {
        ...depositJson,
        vaultTransferred,
        latestVaultTransfer
      };
    });

    res.json(depositsWithVaultInfo);
  } catch (error) {
    console.error('진행 중인 입금 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 입금 히스토리 조회 (confirmed, credited 상태)
 * GET /api/deposits/history?userId=xxx&page=1&limit=20
 */
exports.getDepositHistory = async (req, res) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { VaultTransfer } = require('../models');

    const { count, rows } = await Deposit.findAndCountAll({
      where: {
        userId,
        status: { [Op.in]: ['confirmed', 'credited'] }
      },
      include: [
        {
          model: VaultTransfer,
          as: 'vaultTransfers',
          required: false,
          attributes: ['id', 'status', 'txHash', 'amount', 'feeAmount', 'feeRate', 'transferredAt', 'confirmedAt']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['confirmedAt', 'DESC'], ['detectedAt', 'DESC']]
    });

    // Vault 전송 정보를 포함한 응답 생성
    const depositsWithVaultInfo = rows.map(deposit => {
      const depositJson = deposit.toJSON();

      // Vault 전송 완료 여부 (confirmed 상태인 전송이 있으면 true)
      const vaultTransferred = depositJson.vaultTransfers?.some(vt => vt.status === 'confirmed') || false;

      // 최신 Vault 전송 정보
      const latestVaultTransfer = depositJson.vaultTransfers?.[0] || null;

      return {
        ...depositJson,
        vaultTransferred,
        latestVaultTransfer
      };
    });

    res.json({
      deposits: depositsWithVaultInfo,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit))
    });
  } catch (error) {
    console.error('입금 히스토리 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
