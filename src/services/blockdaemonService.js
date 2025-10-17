/**
 * BlockDaemon API Service
 *
 * Hot Wallet과 Cold Wallet에서의 출금 처리를 담당
 */

require('dotenv').config();

/**
 * BlockDaemon API를 통한 출금 전송
 * @param {Object} withdrawal - 출금 요청 객체
 * @param {number} fromVaultId - 출금할 Vault ID (7: Hot Wallet, 8: Cold Wallet)
 * @returns {Promise<Object>} BlockDaemon API 응답
 */
async function transferFromVault(withdrawal, fromVaultId) {
  const url = `${process.env.BLOCKDAEMON_API_URL}/transactions/transfer`;

  // 항상 외부 주소로 출금 (IsInternal = false)
  const isInternal = false;

  const requestBody = {
    FeePriority: 'High',
    Gross: true,
    IsInternal: isInternal,
    IsRecurring: false,
    Amount: withdrawal.amount.toString(),
    Asset: withdrawal.currency,
    Destination: withdrawal.toAddress,
    FromVaultId: parseInt(fromVaultId),
    Reference: `Withdrawal-${withdrawal.id}`,
    FeeRate: '1'
  };

  console.log('BlockDaemon Transfer 요청 시작...');
  console.log('From Vault:', fromVaultId);
  console.log('Destination:', withdrawal.toAddress);
  console.log('Amount:', withdrawal.amount, withdrawal.currency);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'Authorization': process.env.BLOCKDAEMON_API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response Status:', response.status);

    const text = await response.text();

    // JSON 응답 파싱
    if (text.startsWith('{') || text.startsWith('[')) {
      const json = JSON.parse(text);
      console.log('BlockDaemon API 응답:', JSON.stringify(json, null, 2));

      if (!response.ok) {
        throw new Error(`BlockDaemon API Error: ${JSON.stringify(json)}`);
      }

      return json;
    } else {
      // HTML 에러 응답
      console.error('HTML Response (에러):', text.substring(0, 300));
      throw new Error('BlockDaemon API returned HTML error response');
    }
  } catch (error) {
    console.error('BlockDaemon API 호출 실패:', error.message);
    throw error;
  }
}

/**
 * Hot Wallet (Vault ID: 7)에서 출금
 * @param {Object} withdrawal - 출금 요청 객체
 * @returns {Promise<Object>} BlockDaemon API 응답
 */
async function transferFromHotWallet(withdrawal) {
  const hotWalletId = parseInt(process.env.HOT_WALLET_VAULT_ID || '7');
  console.log('Hot Wallet 출금 시작 (Vault ID:', hotWalletId, ')');
  return transferFromVault(withdrawal, hotWalletId);
}

/**
 * Cold Wallet (Vault ID: 8)에서 출금
 * @param {Object} withdrawal - 출금 요청 객체
 * @returns {Promise<Object>} BlockDaemon API 응답
 */
async function transferFromColdWallet(withdrawal) {
  const coldWalletId = parseInt(process.env.COLD_WALLET_VAULT_ID || '8');
  console.log('Cold Wallet 출금 시작 (Vault ID:', coldWalletId, ')');
  return transferFromVault(withdrawal, coldWalletId);
}

/**
 * BlockDaemon 트랜잭션 상세 조회
 * @param {string|number} transactionId - 트랜잭션 ID
 * @returns {Promise<Object>} 트랜잭션 상세 정보
 */
async function getTransactionDetails(transactionId) {
  const url = `${process.env.BLOCKDAEMON_API_URL}/transactions/${transactionId}`;

  console.log(`BlockDaemon 트랜잭션 상세 조회: ${transactionId}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Authorization': process.env.BLOCKDAEMON_API_KEY
      }
    });

    console.log('Transaction Details Response Status:', response.status);

    const text = await response.text();

    // JSON 응답 파싱
    if (text.startsWith('{') || text.startsWith('[')) {
      const json = JSON.parse(text);
      console.log('BlockDaemon 트랜잭션 상세:', JSON.stringify(json, null, 2));

      if (!response.ok) {
        throw new Error(`BlockDaemon API Error: ${JSON.stringify(json)}`);
      }

      return json;
    } else {
      // HTML 에러 응답
      console.error('HTML Response (에러):', text.substring(0, 300));
      throw new Error('BlockDaemon API returned HTML error response');
    }
  } catch (error) {
    console.error('BlockDaemon 트랜잭션 상세 조회 실패:', error.message);
    throw error;
  }
}

module.exports = {
  transferFromHotWallet,
  transferFromColdWallet,
  transferFromVault,
  getTransactionDetails
};
