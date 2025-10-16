const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

/**
 * @swagger
 * components:
 *   schemas:
 *     Withdrawal:
 *       type: object
 *       required:
 *         - id
 *         - title
 *         - fromAddress
 *         - toAddress
 *         - amount
 *         - currency
 *         - userId
 *         - memberType
 *         - initiator
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         fromAddress:
 *           type: string
 *         toAddress:
 *           type: string
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *           enum: [BTC, ETH, USDT, USDC, SOL]
 *         userId:
 *           type: string
 *         memberType:
 *           type: string
 *           enum: [individual, corporate]
 *         groupId:
 *           type: string
 *         initiator:
 *           type: string
 *         status:
 *           type: string
 *           enum: [draft, submitted, approved, pending, processing, completed, rejected, cancelled, archived, stopped]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description:
 *           type: string
 *         attachments:
 *           type: array
 *         requiredApprovals:
 *           type: array
 *         approvals:
 *           type: array
 *         rejections:
 *           type: array
 */

/**
 * @swagger
 * /api/withdrawals:
 *   get:
 *     summary: 출금 목록 조회 (검색, 필터, 페이지네이션)
 *     tags: [Withdrawals]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: memberType
 *         schema:
 *           type: string
 *           enum: [individual, corporate]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: ID, 제목, 자산 검색
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: _page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: _limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: _sort
 *         schema:
 *           type: string
 *           default: initiatedAt
 *       - in: query
 *         name: _order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: 출금 목록 (X-Total-Count 헤더 포함)
 */
router.get('/', withdrawalController.getWithdrawals);

/**
 * @swagger
 * /api/withdrawals/{id}:
 *   get:
 *     summary: 출금 상세 조회
 *     tags: [Withdrawals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 출금 정보
 *       404:
 *         description: 출금 신청을 찾을 수 없음
 */
router.get('/:id', withdrawalController.getWithdrawalById);

/**
 * @swagger
 * /api/withdrawals:
 *   post:
 *     summary: 출금 신청 생성
 *     tags: [Withdrawals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Withdrawal'
 *     responses:
 *       201:
 *         description: 출금 신청 생성 성공
 *       400:
 *         description: 필수 필드 누락
 *       409:
 *         description: 중복 ID
 */
router.post('/', authenticate, withdrawalController.createWithdrawal);

/**
 * @swagger
 * /api/withdrawals/{id}:
 *   patch:
 *     summary: 출금 정보 수정 (상태 업데이트, 승인/반려 등)
 *     tags: [Withdrawals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 수정된 출금 정보
 *       404:
 *         description: 출금 신청을 찾을 수 없음
 */
router.patch('/:id', authenticate, authorize('admin', 'manager', 'operator'), withdrawalController.updateWithdrawal);

/**
 * @swagger
 * /api/withdrawals/{id}:
 *   delete:
 *     summary: 출금 신청 삭제
 *     tags: [Withdrawals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: 삭제 성공
 *       404:
 *         description: 출금 신청을 찾을 수 없음
 */
router.delete('/:id', authenticate, authorize('admin'), withdrawalController.deleteWithdrawal);

/**
 * @swagger
 * /api/withdrawals/{id}/attachments:
 *   post:
 *     summary: 출금 신청 첨부파일 업로드
 *     tags: [Withdrawals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 첨부파일 (최대 5개, 각 10MB 이하, PDF/DOC/XLS/PPT/HWP/JPG/PNG)
 *     responses:
 *       200:
 *         description: 파일 업로드 성공
 *       400:
 *         description: 파일 형식 또는 크기 오류
 *       404:
 *         description: 출금 신청을 찾을 수 없음
 */
router.post('/:id/attachments', authenticate, upload.array('files', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { Withdrawal } = require('../models');

    const withdrawal = await Withdrawal.findByPk(id);
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // 업로드된 파일 정보
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      uploadedAt: new Date().toISOString()
    }));

    // 기존 첨부파일에 추가
    const currentAttachments = withdrawal.attachments || [];
    const updatedAttachments = [...currentAttachments, ...uploadedFiles];

    await withdrawal.update({ attachments: updatedAttachments });

    res.json({
      message: '파일 업로드 성공',
      files: uploadedFiles,
      totalAttachments: updatedAttachments.length
    });
  } catch (error) {
    console.error('파일 업로드 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
