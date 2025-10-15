/**
 * BlockDaemon Vault API Utility
 * BlockDaemon Institutional Vault API 호출 함수
 */

const axios = require('axios');

const BLOCKDAEMON_API_URL = process.env.BLOCKDAEMON_API_URL || 'https://abc.blockdaemon-wallet.com';
const BLOCKDAEMON_API_KEY = process.env.BLOCKDAEMON_API_KEY;
const DEFAULT_VAULT_ID = parseInt(process.env.BLOCKDAEMON_DEFAULT_VAULT_ID || '7');

if (!BLOCKDAEMON_API_KEY) {
  console.warn('[BlockDaemon] API Key가 설정되지 않았습니다.');
}

/**
 * BlockDaemon API 공통 호출 함수
 * @param {string} endpoint - API 엔드포인트
 * @param {object} options - axios 옵션
 * @returns {Promise<any>} API 응답 데이터
 */
async function apiCall(endpoint, options = {}) {
  const url = `${BLOCKDAEMON_API_URL}${endpoint}`;

  const config = {
    ...options,
    headers: {
      'accept': 'application/json',
      'Authorization': BLOCKDAEMON_API_KEY,
      ...(options.headers || {})
    }
  };

  try {
    const response = await axios(url, config);
    return response.data;
  } catch (error) {
    console.error(`[BlockDaemon] API 호출 실패 (${endpoint}):`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Vault 목록 조회
 * @param {number} page - 페이지 번호 (기본값: 1)
 * @param {number} pageSize - 페이지 크기 (기본값: 100)
 * @returns {Promise<object>} Vault 목록
 */
async function getVaultList(page = 1, pageSize = 100) {
  return await apiCall(`/api/vaults?page=${page}&pageSize=${pageSize}`);
}

/**
 * 특정 Vault 상세 정보 조회
 * @param {number} vaultId - Vault ID
 * @returns {Promise<object>} Vault 상세 정보
 */
async function getVaultById(vaultId) {
  return await apiCall(`/api/vaults/${vaultId}`);
}

/**
 * Vault의 자산별 주소 조회
 * @param {number} vaultId - Vault ID
 * @param {string} asset - 자산 심볼 (ETH, BTC, USDT 등)
 * @returns {Promise<object>} 주소 정보
 */
async function getVaultAddress(vaultId, asset) {
  return await apiCall(`/api/vaults/${vaultId}/assets/${asset}`);
}

/**
 * Vault의 자산 목록 조회
 * @param {number} vaultId - Vault ID
 * @param {number} page - 페이지 번호 (기본값: 1)
 * @param {number} pageSize - 페이지 크기 (기본값: 10)
 * @returns {Promise<object>} 자산 목록
 */
async function getVaultAssets(vaultId, page = 1, pageSize = 10) {
  return await apiCall(`/api/assets?vaultId=${vaultId}&page=${page}&pageSize=${pageSize}`);
}

/**
 * 기본 Vault의 Ethereum 주소 조회
 * @returns {Promise<string>} Ethereum 주소
 */
async function getDefaultVaultEthAddress() {
  const result = await getVaultAddress(DEFAULT_VAULT_ID, 'ETH');

  if (!result.Addresses || result.Addresses.length === 0) {
    throw new Error(`Vault ${DEFAULT_VAULT_ID}에 ETH 주소가 없습니다.`);
  }

  // MainAddress를 우선 반환
  const mainAddress = result.Addresses.find(addr => addr.MainAddress);
  if (mainAddress) {
    return mainAddress.Address;
  }

  // MainAddress가 없으면 첫 번째 주소 반환
  return result.Addresses[0].Address;
}

module.exports = {
  getVaultList,
  getVaultById,
  getVaultAddress,
  getVaultAssets,
  getDefaultVaultEthAddress,
  DEFAULT_VAULT_ID
};
