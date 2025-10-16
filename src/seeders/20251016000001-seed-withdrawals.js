'use strict';

/**
 * Seeder: withdrawals 테이블에 mock 데이터 삽입
 * 법인 출금 4개 + 개인 출금 13개 = 총 17개
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // 법인 출금 Mock 데이터 (CorporateWithdrawalManagement)
    const corporateWithdrawals = [
      {
        id: '2025-09-0001',
        title: '파트너사 결제 - Q3 정산',
        fromAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        toAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        amount: 5.5,
        currency: 'BTC',
        userId: '1',
        memberType: 'corporate',
        groupId: '1',
        initiator: '김기안자',
        initiatedAt: new Date('2025-09-02T09:00:00Z'),
        status: 'pending',
        priority: 'high',
        description: '3분기 파트너사 수수료 정산을 위한 출금',
        requiredApprovals: JSON.stringify(['박CFO', '이CISO']),
        approvals: JSON.stringify([
          { approver: '박CFO', approvedAt: '2025-09-02T10:30:00Z', comment: '검토 완료 승인' }
        ]),
        rejections: JSON.stringify([]),
        airGapSessionId: 'airgap-session-001',
        securityReviewBy: '이CISO',
        securityReviewAt: new Date('2025-09-02T11:00:00Z'),
        signatureCompleted: true,
        auditTrail: JSON.stringify([
          { timestamp: '2025-09-02T09:00:00Z', action: 'created', actor: '김기안자', details: '출금 신청 생성' },
          { timestamp: '2025-09-02T10:30:00Z', action: 'approved', actor: '박CFO', details: '1차 승인 완료' },
          { timestamp: '2025-09-02T11:00:00Z', action: 'security_reviewed', actor: '이CISO', details: '보안 검토 완료' }
        ]),
        createdAt: now,
        updatedAt: now
      },
      {
        id: '2025-09-0002',
        title: '거래소 유동성 공급',
        fromAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        toAddress: '0x28C6c06298d514Db089934071355E5743bf21d60',
        amount: 150000,
        currency: 'USDT',
        userId: '1',
        memberType: 'corporate',
        groupId: '1',
        initiator: '이재무',
        initiatedAt: new Date('2025-09-05T14:30:00Z'),
        status: 'processing',
        priority: 'critical',
        description: '거래소 유동성 확보를 위한 USDT 이체',
        requiredApprovals: JSON.stringify(['박CFO', '이CISO', '김CEO']),
        approvals: JSON.stringify([
          { approver: '박CFO', approvedAt: '2025-09-05T15:00:00Z', comment: '긴급 승인' },
          { approver: '이CISO', approvedAt: '2025-09-05T15:20:00Z', comment: '보안 검토 완료' },
          { approver: '김CEO', approvedAt: '2025-09-05T15:40:00Z', comment: '최종 승인' }
        ]),
        rejections: JSON.stringify([]),
        airGapSessionId: 'airgap-session-002',
        securityReviewBy: '이CISO',
        securityReviewAt: new Date('2025-09-05T15:20:00Z'),
        signatureCompleted: true,
        processingStep: 'blockchain_broadcast',
        txHash: '0x9a7b8c3d1e2f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
        blockConfirmations: 8,
        auditTrail: JSON.stringify([
          { timestamp: '2025-09-05T14:30:00Z', action: 'created', actor: '이재무', details: '긴급 출금 신청' },
          { timestamp: '2025-09-05T15:40:00Z', action: 'approved', actor: '김CEO', details: '최종 승인 완료' },
          { timestamp: '2025-09-05T16:00:00Z', action: 'processing', actor: 'system', details: '블록체인 전송 시작' }
        ]),
        createdAt: now,
        updatedAt: now
      },
      {
        id: '2025-09-0003',
        title: '리서치 기관 수수료',
        fromAddress: '0x123abc456def789ghi012jkl345mno678pqr901st',
        toAddress: '0xabc123def456ghi789jkl012mno345pqr678stu901',
        amount: 2.5,
        currency: 'ETH',
        userId: '1',
        memberType: 'corporate',
        groupId: '1',
        initiator: '김기안자',
        initiatedAt: new Date('2025-09-10T09:00:00Z'),
        status: 'rejected',
        priority: 'medium',
        description: '외부 리서치 기관 컨설팅 비용 정산',
        requiredApprovals: JSON.stringify(['박CFO']),
        approvals: JSON.stringify([]),
        rejections: JSON.stringify([
          { rejector: '박CFO', rejectedAt: '2025-09-10T11:00:00Z', reason: '계약서 미비' }
        ]),
        rejectedAt: new Date('2025-09-10T11:00:00Z'),
        auditTrail: JSON.stringify([
          { timestamp: '2025-09-10T09:00:00Z', action: 'created', actor: '김기안자', details: '출금 신청 생성' },
          { timestamp: '2025-09-10T11:00:00Z', action: 'rejected', actor: '박CFO', details: '계약서 미비로 반려' }
        ]),
        createdAt: now,
        updatedAt: now
      },
      {
        id: '2025-09-0004',
        title: '직원 성과급 지급',
        fromAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        toAddress: 'bc1q9876xyz5432abc1234def5678ghi9012jkl3456',
        amount: 1.2,
        currency: 'BTC',
        userId: '1',
        memberType: 'corporate',
        groupId: '1',
        initiator: '이재무',
        initiatedAt: new Date('2025-09-15T10:00:00Z'),
        status: 'completed',
        priority: 'low',
        description: '2025년 2분기 성과급 BTC 지급',
        requiredApprovals: JSON.stringify(['박CFO']),
        approvals: JSON.stringify([
          { approver: '박CFO', approvedAt: '2025-09-15T11:00:00Z', comment: '승인' }
        ]),
        rejections: JSON.stringify([]),
        airGapSessionId: 'airgap-session-004',
        securityReviewBy: '이CISO',
        securityReviewAt: new Date('2025-09-15T11:30:00Z'),
        signatureCompleted: true,
        txHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
        blockConfirmations: 12,
        completedAt: new Date('2025-09-15T13:00:00Z'),
        auditTrail: JSON.stringify([
          { timestamp: '2025-09-15T10:00:00Z', action: 'created', actor: '이재무', details: '성과급 출금 신청' },
          { timestamp: '2025-09-15T11:00:00Z', action: 'approved', actor: '박CFO', details: '승인 완료' },
          { timestamp: '2025-09-15T13:00:00Z', action: 'completed', actor: 'system', details: '출금 완료' }
        ]),
        createdAt: now,
        updatedAt: now
      }
    ];

    // 개인 출금 Mock 데이터 (IndividualWithdrawalManagement)
    const individualWithdrawals = [
      // 완료된 출금 7개
      {
        id: 'IND-2025-09-0001',
        title: '완료 - 개인 지갑 이동',
        fromAddress: 'bc1q1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s',
        toAddress: 'bc1q9s8r7q6p5o4n3m2l1k0j9i8h7g6f5e4d3c2b1a',
        amount: 0.5,
        currency: 'BTC',
        userId: '0',
        memberType: 'individual',
        initiator: '김개인',
        initiatedAt: new Date('2025-09-01T10:00:00Z'),
        status: 'completed',
        description: '하드웨어 지갑으로 비트코인 이동',
        queuePosition: null,
        waitingPeriodHours: 24,
        processingScheduledAt: new Date('2025-09-02T10:00:00Z'),
        processingStep: 'confirmation',
        txHash: '0xabc123def456',
        blockConfirmations: 12,
        completedAt: new Date('2025-09-02T12:00:00Z'),
        auditTrail: JSON.stringify([
          { timestamp: '2025-09-01T10:00:00Z', action: 'created', actor: '김개인' },
          { timestamp: '2025-09-02T10:00:00Z', action: 'processing_started', actor: 'system' },
          { timestamp: '2025-09-02T12:00:00Z', action: 'completed', actor: 'system' }
        ]),
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'IND-2025-09-0002',
        title: '완료 - USDT 현금화',
        fromAddress: '0x1111222233334444555566667777888899990000',
        toAddress: '0x0000999988887777666655554444333322221111',
        amount: 5000,
        currency: 'USDT',
        userId: '0',
        memberType: 'individual',
        initiator: '김개인',
        initiatedAt: new Date('2025-09-03T14:00:00Z'),
        status: 'completed',
        description: '거래소 현금화를 위한 USDT 전송',
        queuePosition: null,
        waitingPeriodHours: 24,
        processingScheduledAt: new Date('2025-09-04T14:00:00Z'),
        processingStep: 'confirmation',
        txHash: '0xdef789ghi012',
        blockConfirmations: 20,
        completedAt: new Date('2025-09-04T15:30:00Z'),
        auditTrail: JSON.stringify([
          { timestamp: '2025-09-03T14:00:00Z', action: 'created', actor: '김개인' },
          { timestamp: '2025-09-04T14:00:00Z', action: 'processing_started', actor: 'system' },
          { timestamp: '2025-09-04T15:30:00Z', action: 'completed', actor: 'system' }
        ]),
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'IND-2025-09-0003',
        title: '완료 - 이더리움 스테이킹',
        fromAddress: '0xaaabbbcccdddeeefff000111222333444555666',
        toAddress: '0x666555444333222111000fffeeeddddcccbbbaaa',
        amount: 3.2,
        currency: 'ETH',
        userId: '0',
        memberType: 'individual',
        initiator: '김개인',
        initiatedAt: new Date('2025-09-05T09:00:00Z'),
        status: 'completed',
        description: '스테이킹 플랫폼으로 ETH 전송',
        queuePosition: null,
        waitingPeriodHours: 24,
        processingScheduledAt: new Date('2025-09-06T09:00:00Z'),
        processingStep: 'confirmation',
        txHash: '0xghi345jkl678',
        blockConfirmations: 15,
        completedAt: new Date('2025-09-06T10:00:00Z'),
        auditTrail: JSON.stringify([
          { timestamp: '2025-09-05T09:00:00Z', action: 'created', actor: '김개인' },
          { timestamp: '2025-09-06T09:00:00Z', action: 'processing_started', actor: 'system' },
          { timestamp: '2025-09-06T10:00:00Z', action: 'completed', actor: 'system' }
        ]),
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'IND-2025-09-0004',
        title: '완료 - NFT 구매 자금',
        fromAddress: '0x777888999000aaabbbcccdddeeefff111222333',
        toAddress: '0x333222111fffeeedddcccbbbaaa000999888777',
        amount: 1.5,
        currency: 'ETH',
        userId: '0',
        memberType: 'individual',
        initiator: '김개인',
        initiatedAt: new Date('2025-09-07T16:00:00Z'),
        status: 'completed',
        description: 'OpenSea NFT 구매를 위한 출금',
        queuePosition: null,
        waitingPeriodHours: 24,
        processingScheduledAt: new Date('2025-09-08T16:00:00Z'),
        processingStep: 'confirmation',
        txHash: '0xjkl901mno234',
        blockConfirmations: 18,
        completedAt: new Date('2025-09-08T17:15:00Z'),
        auditTrail: JSON.stringify([
          { timestamp: '2025-09-07T16:00:00Z', action: 'created', actor: '김개인' },
          { timestamp: '2025-09-08T16:00:00Z', action: 'processing_started', actor: 'system' },
          { timestamp: '2025-09-08T17:15:00Z', action: 'completed', actor: 'system' }
        ]),
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'IND-2025-09-0005',
        title: '완료 - 솔라나 전송',
        fromAddress: '8x9y0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q',
        toAddress: '7q6p5o4n3m2l1k0j9i8h7g6f5e4d3c2b1a0z9y8x',
        amount: 100,
        currency: 'SOL',
        userId: '0',
        memberType: 'individual',
        initiator: '김개인',
        initiatedAt: new Date('2025-09-09T11:00:00Z'),
        status: 'completed',
        description: '솔라나 DEX 유동성 공급',
        queuePosition: null,
        waitingPeriodHours: 24,
        processingScheduledAt: new Date('2025-09-10T11:00:00Z'),
        processingStep: 'confirmation',
        txHash: '0xpqr567stu890',
        blockConfirmations: 25,
        completedAt: new Date('2025-09-10T11:45:00Z'),
        auditTrail: JSON.stringify([
          { timestamp: '2025-09-09T11:00:00Z', action: 'created', actor: '김개인' },
          { timestamp: '2025-09-10T11:00:00Z', action: 'processing_started', actor: 'system' },
          { timestamp: '2025-09-10T11:45:00Z', action: 'completed', actor: 'system' }
        ]),
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'IND-2025-09-0006',
        title: '완료 - 거래소 입금',
        fromAddress: 'bc1q2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
        toAddress: 'bc1q0t9s8r7q6p5o4n3m2l1k0j9i8h7g6f5e4d3c2b',
        amount: 0.3,
        currency: 'BTC',
        userId: '0',
        memberType: 'individual',
        initiator: '김개인',
        initiatedAt: new Date('2025-09-12T13:00:00Z'),
        status: 'completed',
        description: '빗썸 거래소 비트코인 입금',
        queuePosition: null,
        waitingPeriodHours: 24,
        processingScheduledAt: new Date('2025-09-13T13:00:00Z'),
        processingStep: 'confirmation',
        txHash: '0xvwx123yz456',
        blockConfirmations: 10,
        completedAt: new Date('2025-09-13T14:20:00Z'),
        auditTrail: JSON.stringify([
          { timestamp: '2025-09-12T13:00:00Z', action: 'created', actor: '김개인' },
          { timestamp: '2025-09-13T13:00:00Z', action: 'processing_started', actor: 'system' },
          { timestamp: '2025-09-13T14:20:00Z', action: 'completed', actor: 'system' }
        ]),
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'IND-2025-09-0007',
        title: '완료 - USDC 전송',
        fromAddress: '0x4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w',
        toAddress: '0x3w2v1u0t9s8r7q6p5o4n3m2l1k0j9i8h7g6f5e4d',
        amount: 10000,
        currency: 'USDC',
        userId: '0',
        memberType: 'individual',
        initiator: '김개인',
        initiatedAt: new Date('2025-09-14T15:30:00Z'),
        status: 'completed',
        description: '스테이블코인 현금화',
        queuePosition: null,
        waitingPeriodHours: 24,
        processingScheduledAt: new Date('2025-09-15T15:30:00Z'),
        processingStep: 'confirmation',
        txHash: '0xabc789def012',
        blockConfirmations: 22,
        completedAt: new Date('2025-09-15T16:00:00Z'),
        auditTrail: JSON.stringify([
          { timestamp: '2025-09-14T15:30:00Z', action: 'created', actor: '김개인' },
          { timestamp: '2025-09-15T15:30:00Z', action: 'processing_started', actor: 'system' },
          { timestamp: '2025-09-15T16:00:00Z', action: 'completed', actor: 'system' }
        ]),
        createdAt: now,
        updatedAt: now
      },
      // 취소된 출금 2개
      {
        id: 'IND-2025-09-0009',
        title: '취소 - 급여일 출금',
        fromAddress: 'bc1q5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w',
        toAddress: 'bc1q3w2v1u0t9s8r7q6p5o4n3m2l1k0j9i8h7g6f5e',
        amount: 0.15,
        currency: 'BTC',
        userId: '0',
        memberType: 'individual',
        initiator: '김개인',
        initiatedAt: new Date('2025-10-01T10:00:00Z'),
        status: 'cancelled',
        description: '긴급 자금 필요 (취소됨)',
        queuePosition: null,
        waitingPeriodHours: 24,
        processingScheduledAt: new Date('2025-10-02T10:00:00Z'),
        cancellable: false,
        cancelledAt: new Date('2025-10-01T12:00:00Z'),
        cancelledBy: '김개인',
        auditTrail: JSON.stringify([
          { timestamp: '2025-10-01T10:00:00Z', action: 'created', actor: '김개인' },
          { timestamp: '2025-10-01T12:00:00Z', action: 'cancelled', actor: '김개인', reason: '출금 계획 변경' }
        ]),
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'IND-2025-10-0005',
        title: '취소 - 테스트 출금',
        fromAddress: '0x6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y',
        toAddress: '0x5y4x3w2v1u0t9s8r7q6p5o4n3m2l1k0j9i8h7g6f',
        amount: 100,
        currency: 'USDT',
        userId: '0',
        memberType: 'individual',
        initiator: '김개인',
        initiatedAt: new Date('2025-10-05T14:00:00Z'),
        status: 'cancelled',
        description: '테스트 목적 출금 (취소됨)',
        queuePosition: null,
        waitingPeriodHours: 24,
        processingScheduledAt: new Date('2025-10-06T14:00:00Z'),
        cancellable: false,
        cancelledAt: new Date('2025-10-05T15:00:00Z'),
        cancelledBy: '김개인',
        auditTrail: JSON.stringify([
          { timestamp: '2025-10-05T14:00:00Z', action: 'created', actor: '김개인' },
          { timestamp: '2025-10-05T15:00:00Z', action: 'cancelled', actor: '김개인', reason: '테스트 완료' }
        ]),
        createdAt: now,
        updatedAt: now
      },
      // 진행 중인 출금 4개
      {
        id: 'IND-2025-09-0008',
        title: '출금 대기 - 거래소 입금',
        fromAddress: 'bc1q3c5d789abc0123456789def0123456789abcde',
        toAddress: 'bc1q7f8g123fedcba987654321fedcba987654321f',
        amount: 0.25,
        currency: 'BTC',
        userId: '0',
        memberType: 'individual',
        initiator: '김개인',
        initiatedAt: new Date('2025-10-11T16:20:00Z'),
        status: 'pending',
        description: '업비트 거래소 비트코인 입금',
        queuePosition: 1,
        waitingPeriodHours: 24,
        processingScheduledAt: new Date('2025-10-14T16:20:00Z'),
        cancellable: true,
        auditTrail: JSON.stringify([
          { timestamp: '2025-10-11T16:20:00Z', action: 'created', actor: '김개인' }
        ]),
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'IND-2025-10-0002',
        title: '검토 중 - DeFi 예치',
        fromAddress: '0x8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a',
        toAddress: '0x7a6z5y4x3w2v1u0t9s8r7q6p5o4n3m2l1k0j9i8h',
        amount: 2.0,
        currency: 'ETH',
        userId: '0',
        memberType: 'individual',
        initiator: '김개인',
        initiatedAt: new Date('2025-10-12T09:15:00Z'),
        status: 'pending',
        description: 'Aave 프로토콜 ETH 예치',
        queuePosition: 2,
        waitingPeriodHours: 24,
        processingScheduledAt: new Date('2025-10-13T09:15:00Z'),
        processingStep: 'security_check',
        cancellable: true,
        auditTrail: JSON.stringify([
          { timestamp: '2025-10-12T09:15:00Z', action: 'created', actor: '김개인' },
          { timestamp: '2025-10-12T09:30:00Z', action: 'security_check_started', actor: 'system' }
        ]),
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'IND-2025-10-0003',
        title: '처리 중 - USDT 환전',
        fromAddress: '0x9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b',
        toAddress: '0x8b7a6z5y4x3w2v1u0t9s8r7q6p5o4n3m2l1k0j9i',
        amount: 3000,
        currency: 'USDT',
        userId: '0',
        memberType: 'individual',
        initiator: '김개인',
        initiatedAt: new Date('2025-10-13T11:00:00Z'),
        status: 'processing',
        description: '원화 환전을 위한 USDT 전송',
        queuePosition: null,
        waitingPeriodHours: 24,
        processingScheduledAt: new Date('2025-10-14T11:00:00Z'),
        processingStep: 'blockchain_broadcast',
        txHash: '0xprocessing123',
        blockConfirmations: 3,
        auditTrail: JSON.stringify([
          { timestamp: '2025-10-13T11:00:00Z', action: 'created', actor: '김개인' },
          { timestamp: '2025-10-14T11:00:00Z', action: 'processing_started', actor: 'system' },
          { timestamp: '2025-10-14T11:15:00Z', action: 'blockchain_broadcast', actor: 'system' }
        ]),
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'IND-2025-10-0004',
        title: '대기 중 - 개인 지갑 백업',
        fromAddress: 'bc1q0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b',
        toAddress: 'bc1q8b7a6z5y4x3w2v1u0t9s8r7q6p5o4n3m2l1k0j',
        amount: 0.08,
        currency: 'BTC',
        userId: '0',
        memberType: 'individual',
        initiator: '김개인',
        initiatedAt: new Date('2025-10-14T08:30:00Z'),
        status: 'pending',
        description: '콜드월렛 백업을 위한 소액 전송',
        queuePosition: 3,
        waitingPeriodHours: 24,
        processingScheduledAt: new Date('2025-10-15T08:30:00Z'),
        cancellable: true,
        auditTrail: JSON.stringify([
          { timestamp: '2025-10-14T08:30:00Z', action: 'created', actor: '김개인' }
        ]),
        createdAt: now,
        updatedAt: now
      }
    ];

    // 데이터 삽입
    await queryInterface.bulkInsert('withdrawals', [
      ...corporateWithdrawals,
      ...individualWithdrawals
    ], {});

    console.log('✅ Withdrawals seeder 완료: 법인 4개 + 개인 13개 = 총 17개');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('withdrawals', null, {});
    console.log('✅ Withdrawals seeder 롤백 완료');
  }
};
