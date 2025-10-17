const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Withdrawal = sequelize.define('Withdrawal', {
    // 기본 정보
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fromAddress: {
      type: DataTypes.STRING,
      allowNull: false
    },
    toAddress: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(30, 10),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false
    },

    // 회원 정보
    userId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    memberType: {
      type: DataTypes.ENUM('individual', 'corporate'),
      allowNull: false
    },
    groupId: {
      type: DataTypes.STRING,
      allowNull: true // 개인 회원은 null
    },
    initiator: {
      type: DataTypes.STRING,
      allowNull: false
    },

    // 상태 관리
    status: {
      type: DataTypes.ENUM(
        // 공통 상태
        'withdrawal_wait',       // 출금대기 (24시간 홀드)
        'aml_review',           // AML 검토 중
        'approval_pending',     // 승인 대기 (AML 통과 후)
        'aml_issue',            // AML 문제 감지
        'processing',           // 블록체인 전송 처리 중
        'withdrawal_pending',   // 출금 대기 중 (BlockDaemon API 호출 완료)
        'transferring',         // 출금중 (TxHash 기록됨, 블록체인 전송 중)
        'success',              // 출금 완료
        'failed',               // 기술적 실패 (재시도 가능)
        'admin_rejected',       // 관리자 거부 (재시도 불가)
        'withdrawal_stopped',   // 사용자 취소

        // 기업회원 전용
        'withdrawal_request',   // 출금 신청 (최초)
        'withdrawal_reapply',   // 재신청 (반려 후)
        'rejected',             // 결재 반려
        'archived'              // 아카이브 처리 (종료)
      ),
      allowNull: false,
      defaultValue: 'withdrawal_wait'  // 개인 회원 기본값 (출금 대기)
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: true // 개인 회원은 null
    },

    // 설명 및 첨부파일
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    attachments: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },

    // 승인 관련 (법인 전용)
    requiredApprovals: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    approvals: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    rejections: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },

    // Air-gap 관련 (법인 전용)
    airGapSessionId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    securityReviewBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    securityReviewAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    signatureCompleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },

    // 블록체인 정보
    txHash: {
      type: DataTypes.STRING,
      allowNull: true
    },
    txid: {
      type: DataTypes.STRING,
      allowNull: true
    },
    blockdaemonTransactionId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    blockConfirmations: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },

    // 개인 회원 전용
    queuePosition: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    waitingPeriodHours: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    processingScheduledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    processingStep: {
      type: DataTypes.ENUM('security_check', 'blockchain_broadcast', 'confirmation'),
      allowNull: true
    },
    cancellable: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },

    // 완료/취소 정보
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelledBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    rejectedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // 감사 추적
    auditTrail: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },

    // 재신청 정보 (법인 전용)
    originalRequestId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    reapplicationCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },

    // 타임스탬프
    initiatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'withdrawals',
    timestamps: true, // createdAt, updatedAt 자동 관리
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['currency']
      },
      {
        fields: ['initiatedAt']
      },
      {
        fields: ['memberType']
      },
      {
        fields: ['userId', 'status']
      }
    ]
  });

  return Withdrawal;
};
