/**
 * QuickNode RPC API Utility (Backend)
 * Mainnet: Ethereum Mainnet with Token and NFT API v2 Bundle
 * Testnet: Holesky with Standard RPC
 */

const axios = require('axios');

const BLOCKCHAIN_ENV = process.env.BLOCKCHAIN_ENV || 'testnet';
const QUICKNODE_URL = BLOCKCHAIN_ENV === 'mainnet'
  ? process.env.QUICKNODE_MAINNET_URL
  : process.env.QUICKNODE_HOLESKY_URL;

if (!QUICKNODE_URL) {
  console.warn(`QUICKNODE URL이 설정되지 않았습니다. (환경: ${BLOCKCHAIN_ENV})`);
}

/**
 * JSON-RPC 호출 공통 함수
 * @param {string} method - RPC 메소드명
 * @param {Array} params - 메소드 파라미터 배열
 * @returns {Promise<any>} RPC 응답 result
 */
async function rpcCall(method, params = []) {
  const request = {
    jsonrpc: '2.0',
    method,
    params,
    id: 1,
  };

  try {
    const response = await axios.post(QUICKNODE_URL, request, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.data.error) {
      throw new Error(`RPC error: ${response.data.error.message}`);
    }

    return response.data.result;
  } catch (error) {
    console.error(`RPC call failed for method ${method}:`, error.message);
    throw error;
  }
}

/**
 * 현재 블록 높이 조회
 * @returns {Promise<string>} 현재 블록 번호 (hex string)
 */
async function getCurrentBlock() {
  return await rpcCall('eth_blockNumber', []);
}

/**
 * 특정 주소의 트랜잭션 조회 (QuickNode 전용 메소드)
 * Token and NFT API v2 Bundle 필요 (Mainnet용)
 * @param {string} address - 이더리움 주소
 * @param {number} page - 페이지 번호 (기본값: 1)
 * @param {number} perPage - 페이지당 결과 수 (기본값: 100)
 * @returns {Promise<any>} 트랜잭션 목록
 */
async function getTransactionsByAddress(address, page = 1, perPage = 100) {
  return await rpcCall('qn_getTransactionsByAddress', [
    {
      address,
      page,
      perPage,
    },
  ]);
}

/**
 * 특정 블록 이후의 트랜잭션 조회 (Testnet용 - Holesky)
 * Standard RPC 메소드 사용 - DB에 저장된 마지막 블록부터 조회
 * @param {string} address - 이더리움 주소
 * @param {number|null} fromBlock - 시작 블록 번호 (null이면 최근 10블록)
 * @param {number} maxBlocksToCheck - 최대 조회 블록 수 (기본값: 10)
 * @returns {Promise<{transactions: Array, lastCheckedBlock: number}>}
 */
async function getTransactionsSinceBlock(address, fromBlock = null, maxBlocksToCheck = 10) {
  try {
    const currentBlockHex = await getCurrentBlock();
    const currentBlock = hexToDecimal(currentBlockHex);

    // fromBlock이 null이면 최근 10블록만 조회
    const startBlock = fromBlock ? fromBlock + 1 : Math.max(0, currentBlock - maxBlocksToCheck);
    const endBlock = Math.min(currentBlock, startBlock + maxBlocksToCheck - 1);

    console.log(`[QuickNode] 주소 ${address} 블록 ${startBlock} ~ ${endBlock} 조회 (총 ${endBlock - startBlock + 1}블록)`);

    const transactions = [];
    const seenTxHashes = new Set();

    // startBlock부터 endBlock까지 순차 조회
    for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
      try {
        const blockHex = '0x' + blockNum.toString(16);
        const block = await rpcCall('eth_getBlockByNumber', [blockHex, true]);

        if (block && block.transactions) {
          for (const tx of block.transactions) {
            // 우리 주소로 들어온 트랜잭션만 필터링
            if (tx.to && tx.to.toLowerCase() === address.toLowerCase() && !seenTxHashes.has(tx.hash)) {
              seenTxHashes.add(tx.hash);
              transactions.push({
                transactionHash: tx.hash,
                blockNumber: hexToDecimal(tx.blockNumber).toString(),
                fromAddress: tx.from,
                toAddress: tx.to,
                value: hexToDecimal(tx.value).toString(),
                timestamp: hexToDecimal(block.timestamp),
              });
            }
          }
        }
      } catch (blockError) {
        console.error(`블록 ${blockNum} 조회 실패:`, blockError.message);
      }
    }

    return {
      transactions,
      lastCheckedBlock: endBlock
    };
  } catch (error) {
    console.error('블록 기반 트랜잭션 조회 실패:', error.message);
    throw error;
  }
}

/**
 * eth_getBlockByNumber를 사용한 트랜잭션 조회 (레거시, 호환성 유지)
 * @deprecated getTransactionsSinceBlock 사용 권장
 * @param {string} address - 이더리움 주소
 * @returns {Promise<any>} qn_getTransactionsByAddress 호환 형식
 */
async function getTransactionsByAddressLogs(address) {
  try {
    const result = await getTransactionsSinceBlock(address, null, 10);
    return {
      paginatedItems: result.transactions,
      pageNumber: 1,
      totalItems: result.transactions.length,
    };
  } catch (error) {
    console.error('블록 기반 트랜잭션 조회 실패:', error.message);
    throw error;
  }
}

/**
 * 환경에 따라 적절한 메소드로 트랜잭션 조회
 * Mainnet: qn_getTransactionsByAddress (Token API)
 * Testnet: eth_getLogs 기반 조회
 * @param {string} address - 이더리움 주소
 * @param {number} page - 페이지 번호 (mainnet에서만 사용)
 * @param {number} perPage - 페이지당 결과 수 (mainnet에서만 사용)
 * @returns {Promise<any>} 트랜잭션 목록
 */
async function getTransactionsForAddress(address, page = 1, perPage = 100) {
  if (BLOCKCHAIN_ENV === 'mainnet') {
    return await getTransactionsByAddress(address, page, perPage);
  } else {
    return await getTransactionsByAddressLogs(address);
  }
}

/**
 * 트랜잭션 영수증 조회
 * @param {string} txHash - 트랜잭션 해시
 * @returns {Promise<any>} 트랜잭션 영수증
 */
async function getTransactionReceipt(txHash) {
  return await rpcCall('eth_getTransactionReceipt', [txHash]);
}

/**
 * 트랜잭션 상세 조회
 * @param {string} txHash - 트랜잭션 해시
 * @returns {Promise<any>} 트랜잭션 상세 정보
 */
async function getTransactionByHash(txHash) {
  return await rpcCall('eth_getTransactionByHash', [txHash]);
}

/**
 * 주소의 잔액 조회
 * @param {string} address - 이더리움 주소
 * @param {string} blockTag - 블록 태그 (기본값: 'latest')
 * @returns {Promise<string>} 잔액 (wei, hex string)
 */
async function getBalance(address, blockTag = 'latest') {
  return await rpcCall('eth_getBalance', [address, blockTag]);
}

/**
 * 확인 수 계산
 * @param {number} txBlockNumber - 트랜잭션 블록 번호
 * @param {number} currentBlock - 현재 블록 번호
 * @returns {number} 확인 수
 */
function calculateConfirmations(txBlockNumber, currentBlock) {
  return Math.max(0, currentBlock - txBlockNumber);
}

/**
 * Wei를 ETH로 변환
 * @param {string|number} wei - Wei 금액 (hex string 또는 number)
 * @returns {string} ETH 금액 (소수점 6자리)
 */
function weiToEth(wei) {
  const weiValue = typeof wei === 'string' ? parseInt(wei, 16) : wei;
  return (weiValue / 1e18).toFixed(6);
}

/**
 * Hex string을 decimal number로 변환
 * @param {string} hex - Hex string (예: '0x1a')
 * @returns {number} Decimal number
 */
function hexToDecimal(hex) {
  return parseInt(hex, 16);
}

module.exports = {
  rpcCall,
  getCurrentBlock,
  getTransactionsByAddress,
  getTransactionsSinceBlock,
  getTransactionsByAddressLogs,
  getTransactionsForAddress,
  getTransactionReceipt,
  getTransactionByHash,
  getBalance,
  calculateConfirmations,
  weiToEth,
  hexToDecimal,
};
