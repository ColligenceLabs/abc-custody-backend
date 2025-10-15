/**
 * QuickNode Sepolia RPC API Utility (Backend)
 * Token and NFT API v2 Bundle 포함
 */

const axios = require('axios');

const QUICKNODE_URL = process.env.QUICKNODE_SEPOLIA_URL;

if (!QUICKNODE_URL) {
  console.warn('QUICKNODE_SEPOLIA_URL이 설정되지 않았습니다.');
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
 * Token and NFT API v2 Bundle 필요
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
  getTransactionReceipt,
  getTransactionByHash,
  getBalance,
  calculateConfirmations,
  weiToEth,
  hexToDecimal,
};
