/**
 * 입금 크롤러 테스트 스크립트
 */
require('dotenv').config();
const { getCurrentBlock, getTransactionsSinceBlock, hexToDecimal } = require('./src/utils/quicknode');

const TEST_ADDRESS = '0xD9c3A22BA547dd4Bf4c5Ed64Dd55c0617e8E1169';
const LAST_CHECKED_BLOCK = 4696330;

async function testDepositCrawler() {
  console.log('=== 입금 크롤러 테스트 시작 ===\n');

  try {
    // 1. 현재 블록 높이 확인
    console.log('1. 현재 블록 높이 조회...');
    const currentBlockHex = await getCurrentBlock();
    const currentBlock = hexToDecimal(currentBlockHex);
    console.log(`현재 블록: ${currentBlock} (Hex: ${currentBlockHex})`);
    console.log(`마지막 체크 블록: ${LAST_CHECKED_BLOCK}`);
    console.log(`확인해야 할 블록 수: ${currentBlock - LAST_CHECKED_BLOCK}\n`);

    // 2. 마지막 체크 블록 이후 트랜잭션 조회
    console.log('2. 입금 주소 트랜잭션 조회...');
    console.log(`주소: ${TEST_ADDRESS}`);
    console.log(`블록 범위: ${LAST_CHECKED_BLOCK + 1} ~ ${currentBlock}\n`);

    const result = await getTransactionsSinceBlock(TEST_ADDRESS, LAST_CHECKED_BLOCK, 10);

    console.log(`조회 결과:`);
    console.log(`- 트랜잭션 수: ${result.transactions.length}`);
    console.log(`- 마지막 체크 블록: ${result.lastCheckedBlock}\n`);

    if (result.transactions.length > 0) {
      console.log('발견된 트랜잭션:');
      result.transactions.forEach((tx, idx) => {
        console.log(`\n[${idx + 1}] ${tx.transactionHash}`);
        console.log(`  - 블록: ${tx.blockNumber}`);
        console.log(`  - From: ${tx.fromAddress}`);
        console.log(`  - To: ${tx.toAddress}`);
        console.log(`  - Value: ${(parseInt(tx.value) / 1e18).toFixed(6)} ETH`);
      });
    } else {
      console.log('새로운 트랜잭션이 없습니다.');
    }

    console.log('\n=== 테스트 완료 ===');
  } catch (error) {
    console.error('테스트 실패:', error.message);
    console.error('상세 에러:', error);
  }
}

testDepositCrawler();
