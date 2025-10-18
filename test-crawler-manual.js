/**
 * 입금 크롤러 수동 실행 테스트
 */
require('dotenv').config();
const depositCrawler = require('./src/services/depositCrawler');

console.log('=== 입금 크롤러 수동 실행 테스트 ===\n');

async function test() {
  try {
    await depositCrawler.runOnce();
    console.log('\n=== 크롤러 실행 완료 ===');
    process.exit(0);
  } catch (error) {
    console.error('\n=== 크롤러 실행 실패 ===');
    console.error('에러:', error);
    process.exit(1);
  }
}

test();
