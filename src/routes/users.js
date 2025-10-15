const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - phone
 *         - memberType
 *         - memberId
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         role:
 *           type: string
 *           enum: [admin, manager, operator, viewer]
 *         status:
 *           type: string
 *           enum: [active, inactive, pending]
 *         memberType:
 *           type: string
 *           enum: [individual, corporate]
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 사용자 목록 조회
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: email
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
 *           enum: [active, inactive, pending]
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
 *     responses:
 *       200:
 *         description: 사용자 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get('/', userController.getUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: 사용자 상세 조회
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 사용자 정보
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: 사용자를 찾을 수 없음
 */
router.get('/:id', userController.getUserById);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: 사용자 생성
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: 사용자 생성 성공
 *       400:
 *         description: 유효성 검증 실패
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 권한 부족 (admin만 가능)
 */
router.post('/', authenticate, authorize('admin'), userController.createUser);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: 사용자 정보 수정
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
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
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: 수정된 사용자 정보
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 권한 부족
 *       404:
 *         description: 사용자를 찾을 수 없음
 */
router.patch('/:id', authenticate, authorize('admin', 'manager'), userController.updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: 사용자 삭제
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: 삭제 성공
 *       401:
 *         description: 인증 필요
 *       403:
 *         description: 권한 부족 (admin만 가능)
 *       404:
 *         description: 사용자를 찾을 수 없음
 */
router.delete('/:id', authenticate, authorize('admin'), userController.deleteUser);

/**
 * @swagger
 * /api/users/{id}/addresses:
 *   get:
 *     summary: 사용자 출금 주소 목록 조회 (JOIN)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
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
 *         description: 사용자 정보와 주소 목록
 *       404:
 *         description: 사용자를 찾을 수 없음
 */
router.get('/:id/addresses', userController.getUserAddresses);

/**
 * @swagger
 * /api/users/{id}/deposit-addresses:
 *   get:
 *     summary: 사용자 입금 주소 목록 조회 (JOIN)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: coin
 *         schema:
 *           type: string
 *       - in: query
 *         name: network
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: 사용자 정보와 입금 주소 목록
 *       404:
 *         description: 사용자를 찾을 수 없음
 */
router.get('/:id/deposit-addresses', userController.getUserDepositAddresses);

/**
 * @swagger
 * /api/users/{id}/deposits:
 *   get:
 *     summary: 사용자 입금 내역 조회 (JOIN with DepositAddress)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [detected, confirming, confirmed, credited]
 *       - in: query
 *         name: asset
 *         schema:
 *           type: string
 *       - in: query
 *         name: network
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 사용자 정보와 입금 내역 (입금 주소 정보 포함)
 *       404:
 *         description: 사용자를 찾을 수 없음
 */
router.get('/:id/deposits', userController.getUserDeposits);

/**
 * @swagger
 * /api/users/{id}/stats:
 *   get:
 *     summary: 사용자 통계 조회 (SQL 집계)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 사용자 통계 정보 (주소, 입금, 입금주소 통계)
 *       404:
 *         description: 사용자를 찾을 수 없음
 */
router.get('/:id/stats', userController.getUserStats);

module.exports = router;
