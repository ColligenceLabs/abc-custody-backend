const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Address:
 *       type: object
 *       required:
 *         - userId
 *         - label
 *         - address
 *         - coin
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         label:
 *           type: string
 *         address:
 *           type: string
 *         coin:
 *           type: string
 *         type:
 *           type: string
 *           enum: [personal, vasp]
 *         permissions:
 *           type: object
 *           properties:
 *             canDeposit:
 *               type: boolean
 *             canWithdraw:
 *               type: boolean
 */

/**
 * @swagger
 * /api/addresses:
 *   get:
 *     summary: 출금 주소 목록 조회
 *     tags: [Addresses]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [personal, vasp]
 *       - in: query
 *         name: coin
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 주소 목록
 */
router.get('/', addressController.getAddresses);

/**
 * @swagger
 * /api/addresses/{id}:
 *   get:
 *     summary: 주소 상세 조회
 *     tags: [Addresses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 주소 정보
 *       404:
 *         description: 주소를 찾을 수 없음
 */
router.get('/:id', addressController.getAddressById);

/**
 * @swagger
 * /api/addresses:
 *   post:
 *     summary: 출금 주소 추가
 *     tags: [Addresses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Address'
 *     responses:
 *       201:
 *         description: 주소 추가 성공
 */
router.post('/', authenticate, addressController.createAddress);

/**
 * @swagger
 * /api/addresses/{id}:
 *   patch:
 *     summary: 주소 정보 수정
 *     tags: [Addresses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 수정된 주소 정보
 */
router.patch('/:id', authenticate, addressController.updateAddress);

/**
 * @swagger
 * /api/addresses/{id}:
 *   delete:
 *     summary: 주소 삭제
 *     tags: [Addresses]
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
router.delete('/:id', authenticate, addressController.deleteAddress);

/**
 * @swagger
 * /api/addresses/{id}/with-user:
 *   get:
 *     summary: 주소와 사용자 정보 함께 조회 (JOIN)
 *     tags: [Addresses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 주소 정보 (사용자 정보 포함)
 *       404:
 *         description: 주소를 찾을 수 없음
 */
router.get('/:id/with-user', addressController.getAddressWithUser);

/**
 * @swagger
 * /api/addresses/{id}/usage-stats:
 *   get:
 *     summary: 주소 사용 통계
 *     tags: [Addresses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 주소 사용 통계 (txCount, 한도, 권한 등)
 *       404:
 *         description: 주소를 찾을 수 없음
 */
router.get('/:id/usage-stats', addressController.getAddressUsageStats);

/**
 * @swagger
 * /api/addresses/{id}/daily-usage:
 *   patch:
 *     summary: 일일 사용량 업데이트 (트랜잭션)
 *     tags: [Addresses]
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
 *             properties:
 *               depositAmount:
 *                 type: number
 *               withdrawalAmount:
 *                 type: number
 *     responses:
 *       200:
 *         description: 업데이트된 주소 정보
 *       400:
 *         description: 일일 한도 초과
 *       404:
 *         description: 주소를 찾을 수 없음
 */
router.patch('/:id/daily-usage', authenticate, addressController.updateDailyUsage);

module.exports = router;
