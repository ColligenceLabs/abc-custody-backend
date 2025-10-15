/**
 * Ethereum Transaction Utility
 * Ethers.js를 사용한 Ethereum 트랜잭션 생성 및 전송
 */

const { ethers } = require('ethers');
const {
  getCurrentBlock,
  hexToDecimal
} = require('./quicknode');

const BLOCKCHAIN_ENV = process.env.BLOCKCHAIN_ENV || 'testnet';
const QUICKNODE_URL = BLOCKCHAIN_ENV === 'mainnet'
  ? process.env.QUICKNODE_MAINNET_URL
  : process.env.QUICKNODE_HOLESKY_URL;

// Provider 생성
const provider = new ethers.JsonRpcProvider(QUICKNODE_URL);

// ERC-20 토큰 ABI (transfer 메서드만 포함)
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

/**
 * Wei를 ETH로 변환
 * @param {string|bigint} wei - Wei 금액
 * @returns {string} ETH 금액
 */
function weiToEth(wei) {
  return ethers.formatEther(wei);
}

/**
 * ETH를 Wei로 변환
 * @param {string} eth - ETH 금액
 * @returns {bigint} Wei 금액
 */
function ethToWei(eth) {
  return ethers.parseEther(eth);
}

/**
 * 주소의 ETH 잔액 조회
 * @param {string} address - 이더리움 주소
 * @returns {Promise<object>} { balance: string (ETH), balanceWei: bigint }
 */
async function getEthBalance(address) {
  const balanceWei = await provider.getBalance(address);
  return {
    balance: weiToEth(balanceWei),
    balanceWei: balanceWei
  };
}

/**
 * ERC-20 토큰 잔액 조회
 * @param {string} tokenAddress - 토큰 컨트랙트 주소
 * @param {string} ownerAddress - 소유자 주소
 * @returns {Promise<object>} { balance: string, balanceRaw: bigint, decimals: number }
 */
async function getERC20Balance(tokenAddress, ownerAddress) {
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const [balanceRaw, decimals] = await Promise.all([
    contract.balanceOf(ownerAddress),
    contract.decimals()
  ]);

  const balance = ethers.formatUnits(balanceRaw, decimals);

  return {
    balance,
    balanceRaw,
    decimals
  };
}

/**
 * 가스 가격 조회
 * @returns {Promise<object>} { gasPrice: bigint, maxFeePerGas: bigint, maxPriorityFeePerGas: bigint }
 */
async function getGasPrice() {
  const feeData = await provider.getFeeData();

  return {
    gasPrice: feeData.gasPrice,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
  };
}

/**
 * ETH 전송 가스 추정
 * @param {string} from - 발신 주소
 * @param {string} to - 수신 주소
 * @param {string} amountEth - 전송 금액 (ETH)
 * @returns {Promise<object>} { gasLimit: bigint, estimatedGasFee: string (ETH) }
 */
async function estimateEthTransferGas(from, to, amountEth) {
  const amountWei = ethToWei(amountEth);
  const feeData = await provider.getFeeData();

  const gasLimit = await provider.estimateGas({
    from,
    to,
    value: amountWei
  });

  // 가스 비용 계산 (gasLimit * maxFeePerGas)
  const gasCostWei = gasLimit * feeData.maxFeePerGas;
  const estimatedGasFee = weiToEth(gasCostWei);

  return {
    gasLimit,
    estimatedGasFee
  };
}

/**
 * ERC-20 토큰 전송 가스 추정
 * @param {string} from - 발신 주소
 * @param {string} to - 수신 주소
 * @param {string} amount - 전송 금액
 * @param {string} tokenAddress - 토큰 컨트랙트 주소
 * @returns {Promise<object>} { gasLimit: bigint, estimatedGasFee: string (ETH) }
 */
async function estimateERC20TransferGas(from, to, amount, tokenAddress) {
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const decimals = await contract.decimals();
  const amountRaw = ethers.parseUnits(amount, decimals);
  const feeData = await provider.getFeeData();

  const gasLimit = await contract.transfer.estimateGas(to, amountRaw, { from });

  const gasCostWei = gasLimit * feeData.maxFeePerGas;
  const estimatedGasFee = weiToEth(gasCostWei);

  return {
    gasLimit,
    estimatedGasFee
  };
}

/**
 * ETH 전송 트랜잭션 생성 및 서명
 * @param {string} from - 발신 주소
 * @param {string} to - 수신 주소
 * @param {string} amountEth - 전송 금액 (ETH)
 * @param {string} privateKey - 개인키 (0x 접두사 포함)
 * @returns {Promise<string>} 서명된 트랜잭션 (raw transaction hex)
 */
async function createETHTransfer(from, to, amountEth, privateKey) {
  const wallet = new ethers.Wallet(privateKey, provider);
  const amountWei = ethToWei(amountEth);
  const feeData = await provider.getFeeData();
  const nonce = await provider.getTransactionCount(from, 'pending');

  const tx = {
    to,
    value: amountWei,
    nonce,
    gasLimit: 21000n, // ETH 전송의 표준 가스 한도
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    chainId: (await provider.getNetwork()).chainId
  };

  const signedTx = await wallet.signTransaction(tx);
  return signedTx;
}

/**
 * ERC-20 토큰 전송 트랜잭션 생성 및 서명
 * @param {string} from - 발신 주소
 * @param {string} to - 수신 주소
 * @param {string} amount - 전송 금액
 * @param {string} privateKey - 개인키 (0x 접두사 포함)
 * @param {string} tokenAddress - 토큰 컨트랙트 주소
 * @returns {Promise<string>} 서명된 트랜잭션 (raw transaction hex)
 */
async function createERC20Transfer(from, to, amount, privateKey, tokenAddress) {
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
  const decimals = await contract.decimals();
  const amountRaw = ethers.parseUnits(amount, decimals);

  const tx = await contract.transfer.populateTransaction(to, amountRaw);
  const feeData = await provider.getFeeData();
  const nonce = await provider.getTransactionCount(from, 'pending');

  tx.nonce = nonce;
  tx.maxFeePerGas = feeData.maxFeePerGas;
  tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
  tx.gasLimit = await contract.transfer.estimateGas(to, amountRaw);
  tx.chainId = (await provider.getNetwork()).chainId;

  const signedTx = await wallet.signTransaction(tx);
  return signedTx;
}

/**
 * 서명된 트랜잭션 전송
 * @param {string} signedTx - 서명된 트랜잭션
 * @returns {Promise<object>} { txHash: string, txResponse: object }
 */
async function sendTransaction(signedTx) {
  const txResponse = await provider.broadcastTransaction(signedTx);
  return {
    txHash: txResponse.hash,
    txResponse
  };
}

/**
 * 트랜잭션 컨펌 대기
 * @param {string} txHash - 트랜잭션 해시
 * @param {number} confirmations - 필요한 컨펌 수 (기본값: 1)
 * @returns {Promise<object>} 트랜잭션 영수증
 */
async function waitForConfirmation(txHash, confirmations = 1) {
  const receipt = await provider.waitForTransaction(txHash, confirmations);
  return receipt;
}

/**
 * 트랜잭션 영수증 조회
 * @param {string} txHash - 트랜잭션 해시
 * @returns {Promise<object|null>} 트랜잭션 영수증 (없으면 null)
 */
async function getTransactionReceipt(txHash) {
  const receipt = await provider.getTransactionReceipt(txHash);
  return receipt;
}

module.exports = {
  provider,
  weiToEth,
  ethToWei,
  getEthBalance,
  getERC20Balance,
  getGasPrice,
  estimateEthTransferGas,
  estimateERC20TransferGas,
  createETHTransfer,
  createERC20Transfer,
  sendTransaction,
  waitForConfirmation,
  getTransactionReceipt
};
