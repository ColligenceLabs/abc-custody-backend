const { DepositAddress } = require('../models');
const { Wallet } = require('ethers');

/**
 * 지갑 생성 함수들
 */

// ETH/ERC-20 토큰 지갑 생성
function generateEthWallet() {
  const wallet = Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey
  };
}

// BTC 임시 지갑 생성 (추후 bitcoinjs-lib로 개선 필요)
function generateBtcWallet() {
  const generateRandomBase58 = (length) => {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const generateRandomHex = (length) => {
    return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  };

  return {
    address: 'bc1' + generateRandomBase58(39),
    privateKey: generateRandomHex(64)
  };
}

// SOL 임시 지갑 생성 (추후 @solana/web3.js로 개선 필요)
function generateSolWallet() {
  const generateRandomBase58 = (length) => {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  return {
    address: generateRandomBase58(44),
    privateKey: generateRandomBase58(88)
  };
}

// 자산 유형별 지갑 생성
function generateWalletByCoin(coin) {
  switch(coin) {
    case 'ETH':
    case 'USDT':
    case 'USDC':
      return generateEthWallet();
    case 'BTC':
      return generateBtcWallet();
    case 'SOL':
      return generateSolWallet();
    default:
      return generateEthWallet(); // fallback
  }
}

/**
 * 입금 주소 목록 조회
 * Query params: userId, coin, network, isActive, _page, _limit, _sort, _order
 */
exports.getDepositAddresses = async (req, res) => {
  try {
    const {
      userId,
      coin,
      network,
      isActive,
      _page = 1,
      _limit = 100,
      _sort = 'addedAt',
      _order = 'desc'
    } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (coin) where.coin = coin;
    if (network) where.network = network;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const page = parseInt(_page);
    const limit = parseInt(_limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await DepositAddress.findAndCountAll({
      where,
      limit,
      offset,
      order: [[_sort, _order.toUpperCase()]]
    });

    res.set('X-Total-Count', count.toString());
    res.json(rows);
  } catch (error) {
    console.error('입금 주소 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 입금 주소 상세 조회
 */
exports.getDepositAddressById = async (req, res) => {
  try {
    const { id } = req.params;
    const depositAddress = await DepositAddress.findByPk(id);

    if (!depositAddress) {
      return res.status(404).json({ error: 'Deposit address not found' });
    }

    res.json(depositAddress);
  } catch (error) {
    console.error('입금 주소 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 입금 주소 생성 (백엔드에서 지갑 자동 생성)
 */
exports.createDepositAddress = async (req, res) => {
  try {
    const { userId, coin, label, network, type, priceKRW, priceUSD, contractAddress } = req.body;

    // 필수 필드 검증
    if (!userId || !coin || !network) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Required fields: userId, coin, network'
      });
    }

    // 중복 검증: userId + coin 조합 확인 (사용자별 자산 유형별 1개만 허용)
    const existing = await DepositAddress.findOne({
      where: {
        userId,
        coin,
        isActive: true
      }
    });

    if (existing) {
      return res.status(409).json({
        error: 'Duplicate asset',
        message: `${coin} 자산은 이미 추가되었습니다.`
      });
    }

    // 백엔드에서 지갑 생성
    const { address, privateKey } = generateWalletByCoin(coin);

    // MVP 시연용: Ethereum 네트워크 지갑 생성 시 가스비 자동 지급
    // 입금 주소에 0.01 ETH를 미리 지급하여 Vault 전송 시 가스비로 사용
    if ((network === 'Ethereum' || network === 'Holesky') && process.env.GAS_POOL_PRIVATE_KEY) {
      try {
        const { createETHTransfer, sendTransaction } = require('../utils/ethereum');

        const GAS_POOL_PRIVATE_KEY = process.env.GAS_POOL_PRIVATE_KEY;
        const GAS_AMOUNT = process.env.GAS_POOL_AMOUNT || '0.01'; // 기본값 0.01 ETH

        console.log(`[MVP Demo] 새 입금 주소 ${address}에 가스비 ${GAS_AMOUNT} ETH 전송 중...`);

        const signedTx = await createETHTransfer(GAS_POOL_PRIVATE_KEY, address, GAS_AMOUNT);
        const { txHash } = await sendTransaction(signedTx);

        console.log(`[MVP Demo] 가스비 전송 완료: ${txHash}`);
      } catch (gasError) {
        // 가스비 전송 실패해도 입금 주소는 생성
        console.error('[MVP Demo] 가스비 전송 실패:', gasError.message);
      }
    }

    // ID와 addedAt 자동 생성
    const depositAddressData = {
      id: `dep_addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      label: label || `${coin} 입금 주소`,
      coin,
      network,
      address,
      privateKey, // 암호화 저장 (추후 개선 필요)
      type: type || 'personal',
      isActive: true,
      contractAddress: contractAddress || null,
      priceKRW: priceKRW || null,
      priceUSD: priceUSD || null,
      addedAt: new Date()
    };

    const depositAddress = await DepositAddress.create(depositAddressData);

    // privateKey는 응답에서 제외 (보안)
    const response = {
      id: depositAddress.id,
      userId: depositAddress.userId,
      label: depositAddress.label,
      coin: depositAddress.coin,
      network: depositAddress.network,
      address: depositAddress.address,
      type: depositAddress.type,
      isActive: depositAddress.isActive,
      contractAddress: depositAddress.contractAddress,
      priceKRW: depositAddress.priceKRW,
      priceUSD: depositAddress.priceUSD,
      addedAt: depositAddress.addedAt
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('입금 주소 생성 실패:', error);
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
 * 입금 주소 수정 (PATCH)
 */
exports.updateDepositAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const depositAddress = await DepositAddress.findByPk(id);
    if (!depositAddress) {
      return res.status(404).json({ error: 'Deposit address not found' });
    }

    await depositAddress.update(updateData);
    res.json(depositAddress);
  } catch (error) {
    console.error('입금 주소 수정 실패:', error);
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
 * 입금 주소 삭제 (Hard Delete)
 */
exports.deleteDepositAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const depositAddress = await DepositAddress.findByPk(id);
    if (!depositAddress) {
      return res.status(404).json({ error: 'Deposit address not found' });
    }

    // Hard delete: DB에서 실제로 삭제
    await depositAddress.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('입금 주소 삭제 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
