const { Withdrawal } = require('../models');
const { Op } = require('sequelize');
const blockdaemonService = require('../services/blockdaemonService');

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

    // 개인 회원의 경우 processingScheduledAt 자동 설정 (24시간 후)
    if (withdrawalData.memberType === 'individual' && !withdrawalData.processingScheduledAt) {
      const scheduledTime = new Date(withdrawalData.initiatedAt);
      scheduledTime.setHours(scheduledTime.getHours() + 24);
      withdrawalData.processingScheduledAt = scheduledTime;

      // 개인 회원의 경우 cancellable 기본값 true 설정
      if (withdrawalData.cancellable === undefined) {
        withdrawalData.cancellable = true;
      }
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

/**
 * Hot Wallet 승인 (Vault ID: 7)
 * processing → transferring 상태 전환 (BlockDaemon API 호출)
 */
exports.approveWithdrawalHot = async (req, res) => {
  try {
    const { id } = req.params;

    const withdrawal = await Withdrawal.findByPk(id);
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // processing 상태인지 확인
    if (withdrawal.status !== 'processing') {
      return res.status(400).json({
        error: 'Invalid status',
        message: '출금 처리 대기 상태의 출금만 전송할 수 있습니다.'
      });
    }

    console.log(`Hot Wallet 승인 및 트랜잭션 생성 시작: ${id}`);

    // Hot Wallet에서 BlockDaemon API 호출 (트랜잭션 생성, 아직 블록체인 전송 안됨)
    const blockdaemonResponse = await blockdaemonService.transferFromHotWallet(withdrawal);

    // BlockDaemon 응답 구조 상세 로그
    console.log('BlockDaemon 응답 전체:', JSON.stringify(blockdaemonResponse, null, 2));
    console.log('응답 키 목록:', Object.keys(blockdaemonResponse || {}));

    // BlockDaemon Transfer 응답에서 id 추출 (여러 필드명 시도)
    const transactionId =
      blockdaemonResponse?.ID ||  // BlockDaemon은 대문자 ID 사용
      blockdaemonResponse?.id ||
      blockdaemonResponse?.Id ||
      blockdaemonResponse?.transactionId ||
      blockdaemonResponse?.TransactionId ||
      blockdaemonResponse?.requestId ||
      blockdaemonResponse?.RequestId ||
      blockdaemonResponse?.data?.ID ||
      blockdaemonResponse?.data?.id ||
      blockdaemonResponse?.data?.Id;

    if (!transactionId) {
      console.error('트랜잭션 ID를 찾을 수 없습니다. 응답:', blockdaemonResponse);
      throw new Error('BlockDaemon API에서 트랜잭션 ID를 받지 못했습니다. 응답 구조를 확인해주세요.');
    }

    console.log(`BlockDaemon 트랜잭션 ID: ${transactionId} (블록체인 전송 대기 중)`);

    // 출금 상태를 'withdrawal_pending'으로 업데이트
    // txid에 BlockDaemon 트랜잭션 ID 저장, txHash는 아직 없음
    await withdrawal.update({
      status: 'withdrawal_pending',
      txid: transactionId,
      blockdaemonTransactionId: transactionId,
    });

    console.log(`Hot Wallet 트랜잭션 생성 완료: ${id}, txid: ${transactionId}, status: withdrawal_pending`);

    res.json({
      success: true,
      message: 'Hot Wallet 트랜잭션이 생성되었습니다. 블록체인 전송 대기 중입니다.',
      withdrawal: withdrawal,
      blockdaemonResponse: blockdaemonResponse
    });
  } catch (error) {
    console.error('Hot Wallet 승인 및 전송 실패:', error);
    res.status(500).json({
      error: 'Hot Wallet approval and transfer failed',
      message: error.message
    });
  }
};

/**
 * Cold Wallet 승인 (Vault ID: 8)
 * processing → transferring 상태 전환 (BlockDaemon API 호출)
 */
exports.approveWithdrawalCold = async (req, res) => {
  try {
    const { id } = req.params;

    const withdrawal = await Withdrawal.findByPk(id);
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // processing 상태인지 확인
    if (withdrawal.status !== 'processing') {
      return res.status(400).json({
        error: 'Invalid status',
        message: '출금 처리 대기 상태의 출금만 전송할 수 있습니다.'
      });
    }

    console.log(`Cold Wallet 승인 및 트랜잭션 생성 시작: ${id}`);

    // Cold Wallet에서 BlockDaemon API 호출 (트랜잭션 생성, 아직 블록체인 전송 안됨)
    const blockdaemonResponse = await blockdaemonService.transferFromColdWallet(withdrawal);

    // BlockDaemon 응답 구조 상세 로그
    console.log('BlockDaemon 응답 전체:', JSON.stringify(blockdaemonResponse, null, 2));
    console.log('응답 키 목록:', Object.keys(blockdaemonResponse || {}));

    // BlockDaemon Transfer 응답에서 id 추출 (여러 필드명 시도)
    const transactionId =
      blockdaemonResponse?.ID ||  // BlockDaemon은 대문자 ID 사용
      blockdaemonResponse?.id ||
      blockdaemonResponse?.Id ||
      blockdaemonResponse?.transactionId ||
      blockdaemonResponse?.TransactionId ||
      blockdaemonResponse?.requestId ||
      blockdaemonResponse?.RequestId ||
      blockdaemonResponse?.data?.ID ||
      blockdaemonResponse?.data?.id ||
      blockdaemonResponse?.data?.Id;

    if (!transactionId) {
      console.error('트랜잭션 ID를 찾을 수 없습니다. 응답:', blockdaemonResponse);
      throw new Error('BlockDaemon API에서 트랜잭션 ID를 받지 못했습니다. 응답 구조를 확인해주세요.');
    }

    console.log(`BlockDaemon 트랜잭션 ID: ${transactionId} (블록체인 전송 대기 중)`);

    // 출금 상태를 'withdrawal_pending'으로 업데이트
    // txid에 BlockDaemon 트랜잭션 ID 저장, txHash는 아직 없음
    await withdrawal.update({
      status: 'withdrawal_pending',
      txid: transactionId,
      blockdaemonTransactionId: transactionId,
    });

    console.log(`Cold Wallet 트랜잭션 생성 완료: ${id}, txid: ${transactionId}, status: withdrawal_pending`);

    res.json({
      success: true,
      message: 'Cold Wallet 트랜잭션이 생성되었습니다. 블록체인 전송 대기 중입니다.',
      withdrawal: withdrawal,
      blockdaemonResponse: blockdaemonResponse
    });
  } catch (error) {
    console.error('Cold Wallet 승인 및 전송 실패:', error);
    res.status(500).json({
      error: 'Cold Wallet approval and transfer failed',
      message: error.message
    });
  }
};

/**
 * Wallet Transfer 실행 (Hot 또는 Cold)
 * processing → transferring 상태 전환
 */
exports.processWalletTransfer = async (req, res) => {
  try {
    const { id } = req.params;

    const withdrawal = await Withdrawal.findByPk(id);
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // processing 상태인지 확인
    if (withdrawal.status !== 'processing') {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'processing 상태의 출금만 전송 실행할 수 있습니다.'
      });
    }

    console.log(`Wallet Transfer 실행 시작: ${id}`);

    // walletSource 확인 (이전 승인에서 설정되어야 함)
    const isHotWallet = withdrawal.currency === 'ETH' || withdrawal.currency === 'USDT' || withdrawal.currency === 'USDC';

    let blockdaemonResponse;
    if (isHotWallet) {
      // Hot Wallet 전송
      blockdaemonResponse = await blockdaemonService.transferFromHotWallet(withdrawal);
    } else {
      // Cold Wallet 전송
      blockdaemonResponse = await blockdaemonService.transferFromColdWallet(withdrawal);
    }

    // BlockDaemon Transfer 응답에서 id 추출
    const transactionId = blockdaemonResponse.id || blockdaemonResponse.Id;

    if (!transactionId) {
      throw new Error('BlockDaemon API에서 트랜잭션 ID를 받지 못했습니다.');
    }

    console.log(`BlockDaemon 트랜잭션 ID: ${transactionId}`);

    // 트랜잭션 상세 정보 조회
    const transactionDetails = await blockdaemonService.getTransactionDetails(transactionId);

    // Transaction.TxHash 추출
    const txHash = transactionDetails.Transaction?.TxHash || null;

    if (!txHash) {
      console.warn(`트랜잭션 ID ${transactionId}에서 TxHash를 찾을 수 없습니다.`);
    }

    // 출금 상태를 'transferring'으로 업데이트
    await withdrawal.update({
      status: 'transferring',
      txHash: txHash,
      blockdaemonTransactionId: transactionId,
    });

    console.log(`Wallet Transfer 실행 완료: ${id}, txHash: ${txHash}`);

    res.json({
      success: true,
      message: '블록체인 전송이 시작되었습니다.',
      withdrawal: withdrawal,
      blockdaemonResponse: blockdaemonResponse
    });
  } catch (error) {
    console.error('Wallet Transfer 실행 실패:', error);
    res.status(500).json({
      error: 'Wallet transfer failed',
      message: error.message
    });
  }
};

/**
 * 테스트용 AML 검증 완료 처리
 * aml_review → processing 상태 전환
 */
exports.completeAMLReview = async (req, res) => {
  try {
    const { id } = req.params;

    const withdrawal = await Withdrawal.findByPk(id);
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // AML 검토 상태인지 확인
    if (withdrawal.status !== 'aml_review') {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'AML 검토 중 상태의 출금만 처리할 수 있습니다.'
      });
    }

    console.log(`테스트용 AML 검증 완료 처리 시작: ${id}`);

    // processing 상태로 변경
    await withdrawal.update({
      status: 'processing',
    });

    console.log(`테스트용 AML 검증 완료: ${id}, status: processing`);

    res.json({
      success: true,
      message: 'AML 검증이 완료되었습니다. 출금 처리 대기 상태로 전환되었습니다.',
      withdrawal: withdrawal
    });
  } catch (error) {
    console.error('AML 검증 완료 처리 실패:', error);
    res.status(500).json({
      error: 'AML review completion failed',
      message: error.message
    });
  }
};
