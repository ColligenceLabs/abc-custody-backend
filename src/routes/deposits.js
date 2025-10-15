const express = require('express');
const router = express.Router();
const depositController = require('../controllers/depositController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Deposit:
 *       type: object
 *       required:
 *         - userId
 *         - depositAddressId
 *         - txHash
 *         - asset
 *         - network
 *         - amount
 *         - fromAddress
 *         - toAddress
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         depositAddressId:
 *           type: string
 *         txHash:
 *           type: string
 *         asset:
 *           type: string
 *         network:
 *           type: string
 *         amount:
 *           type: string
 *         status:
 *           type: string
 *           enum: [detected, confirming, confirmed, credited]
 *         senderVerified:
 *           type: boolean
 */

/**
 * @swagger
 * /api/deposits:
 *   get:
 *     summary: 입금 내역 조회
 *     tags: [Deposits]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [detected, confirming, confirmed, credited]
 *         description: 다중 선택 가능 (status=detected&status=confirmed)
 *       - in: query
 *         name: asset
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 입금 내역 목록
 */
router.get('/', depositController.getDeposits);

/**
 * @swagger
 * /api/deposits/active:
 *   get:
 *     summary: 진행 중인 입금 조회 (detected, confirming 상태)
 *     tags: [Deposits]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 진행 중인 입금 목록
 */
router.get('/active', depositController.getActiveDeposits);

/**
 * @swagger
 * /api/deposits/history:
 *   get:
 *     summary: 입금 히스토리 조회 (confirmed, credited 상태)
 *     tags: [Deposits]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 입금 히스토리 (페이지네이션 포함)
 */
router.get('/history', depositController.getDepositHistory);

/**
 * @swagger
 * /api/deposits/summary:
 *   get:
 *     summary: 입금 요약 통계 (SQL 집계)
 *     tags: [Deposits]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: asset
 *         schema:
 *           type: string
 *       - in: query
 *         name: network
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: 입금 통계 (상태별, 자산별, 네트워크별)
 */
router.get('/summary', depositController.getDepositsSummary);

/**
 * @swagger
 * /api/deposits/{id}:
 *   get:
 *     summary: 입금 상세 조회
 *     tags: [Deposits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 입금 정보
 */
router.get('/:id', depositController.getDepositById);

/**
 * @swagger
 * /api/deposits/{id}/full:
 *   get:
 *     summary: 입금 전체 정보 조회 (User + DepositAddress JOIN)
 *     tags: [Deposits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 입금 정보 (사용자, 입금주소 정보 포함)
 *       404:
 *         description: 입금 내역을 찾을 수 없음
 */
router.get('/:id/full', depositController.getDepositFull);

/**
 * @swagger
 * /api/deposits/bulk:
 *   post:
 *     summary: 대량 입금 생성 (트랜잭션)
 *     tags: [Deposits]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deposits:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Deposit'
 *     responses:
 *       201:
 *         description: 대량 입금 생성 성공
 *       400:
 *         description: 요청 형식 오류
 */
router.post('/bulk', authenticate, authorize('admin', 'manager', 'operator'), depositController.createBulkDeposits);

/**
 * @swagger
 * /api/deposits:
 *   post:
 *     summary: 입금 기록 생성
 *     tags: [Deposits]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Deposit'
 *     responses:
 *       201:
 *         description: 입금 기록 생성 성공
 *       409:
 *         description: 트랜잭션이 이미 존재함
 */
router.post('/', authenticate, depositController.createDeposit);

/**
 * @swagger
 * /api/deposits/{id}:
 *   patch:
 *     summary: 입금 정보 수정
 *     tags: [Deposits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 수정된 입금 정보
 */
router.patch('/:id', authenticate, authorize('admin', 'manager', 'operator'), depositController.updateDeposit);

/**
 * @swagger
 * /api/deposits/{id}:
 *   delete:
 *     summary: 입금 기록 삭제
 *     tags: [Deposits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: 삭제 성공
 */
router.delete('/:id', authenticate, authorize('admin'), depositController.deleteDeposit);

module.exports = router;
