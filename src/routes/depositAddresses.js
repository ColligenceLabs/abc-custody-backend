const express = require('express');
const router = express.Router();
const depositAddressController = require('../controllers/depositAddressController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     DepositAddress:
 *       type: object
 *       required:
 *         - userId
 *         - label
 *         - coin
 *         - network
 *         - address
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         label:
 *           type: string
 *         coin:
 *           type: string
 *         network:
 *           type: string
 *         address:
 *           type: string
 *         isActive:
 *           type: boolean
 */

/**
 * @swagger
 * /api/depositAddresses:
 *   get:
 *     summary: 입금 주소 목록 조회
 *     tags: [DepositAddresses]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: coin
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: 입금 주소 목록
 */
router.get('/', depositAddressController.getDepositAddresses);

/**
 * @swagger
 * /api/depositAddresses/{id}:
 *   get:
 *     summary: 입금 주소 상세 조회
 *     tags: [DepositAddresses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 입금 주소 정보
 */
router.get('/:id', depositAddressController.getDepositAddressById);

/**
 * @swagger
 * /api/depositAddresses:
 *   post:
 *     summary: 입금 주소 생성
 *     tags: [DepositAddresses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DepositAddress'
 *     responses:
 *       201:
 *         description: 입금 주소 생성 성공
 *       409:
 *         description: 주소가 이미 존재함
 */
router.post('/', authenticate, depositAddressController.createDepositAddress);

/**
 * @swagger
 * /api/depositAddresses/{id}:
 *   patch:
 *     summary: 입금 주소 수정
 *     tags: [DepositAddresses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 수정된 입금 주소 정보
 */
router.patch('/:id', authenticate, depositAddressController.updateDepositAddress);

/**
 * @swagger
 * /api/depositAddresses/{id}:
 *   delete:
 *     summary: 입금 주소 삭제 (Soft Delete)
 *     tags: [DepositAddresses]
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
router.delete('/:id', authenticate, depositAddressController.deleteDepositAddress);

module.exports = router;
