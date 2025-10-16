const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         token:
 *           type: string
 *         expiresIn:
 *           type: string
 *         user:
 *           type: object
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 사용자 로그인
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: 인증 실패 (이메일 또는 비밀번호 오류)
 *       403:
 *         description: 계정이 활성화되지 않음
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 현재 로그인한 사용자 정보 조회
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보
 *       401:
 *         description: 인증 필요
 */
router.get('/me', authenticate, authController.getCurrentUser);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: 비밀번호 변경
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: 비밀번호 변경 성공
 *       401:
 *         description: 현재 비밀번호가 올바르지 않음
 */
router.post('/change-password', authenticate, authController.changePassword);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: 토큰 갱신
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 새 토큰 발급 성공
 *       401:
 *         description: 인증 필요
 */
router.post('/refresh', authenticate, authController.refreshToken);

/**
 * @swagger
 * /api/auth/send-email-pin:
 *   post:
 *     summary: 이메일 인증 PIN 코드 전송
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'user@example.com'
 *     responses:
 *       200:
 *         description: PIN 코드 전송 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 expiresIn:
 *                   type: integer
 *                   description: PIN 유효 시간 (초)
 *       400:
 *         description: 잘못된 요청
 */
router.post('/send-email-pin', authController.sendEmailPin);

/**
 * @swagger
 * /api/auth/verify-email-pin-login:
 *   post:
 *     summary: 이메일 인증 PIN 코드 검증 (로그인용 - 계정 확인 포함)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - pinCode
 *               - memberType
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'user@example.com'
 *               pinCode:
 *                 type: string
 *                 example: '123456'
 *                 description: 6자리 PIN 코드
 *               memberType:
 *                 type: string
 *                 enum: [individual, corporate]
 *                 example: 'individual'
 *     responses:
 *       200:
 *         description: PIN 검증 및 사용자 확인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                 requiresOTP:
 *                   type: boolean
 *       401:
 *         description: PIN 코드가 올바르지 않음
 *       404:
 *         description: 사용자를 찾을 수 없음
 */
router.post('/verify-email-pin-login', authController.verifyEmailPinLogin);

/**
 * @swagger
 * /api/auth/verify-email-pin-signup:
 *   post:
 *     summary: 이메일 인증 PIN 코드 검증 (회원가입용 - PIN만 검증)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - pinCode
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'newuser@example.com'
 *               pinCode:
 *                 type: string
 *                 example: '123456'
 *                 description: 6자리 PIN 코드
 *     responses:
 *       200:
 *         description: PIN 검증 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 email:
 *                   type: string
 *       401:
 *         description: PIN 코드가 올바르지 않음
 */
router.post('/verify-email-pin-signup', authController.verifyEmailPinSignup);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: 이메일 확인 (Google Authenticator 로그인 1단계)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - memberType
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'user@example.com'
 *               memberType:
 *                 type: string
 *                 enum: [individual, corporate]
 *                 example: 'individual'
 *     responses:
 *       200:
 *         description: 이메일 확인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     memberType:
 *                       type: string
 *                     hasGASetup:
 *                       type: boolean
 *                     isFirstLogin:
 *                       type: boolean
 *                 requiresOTP:
 *                   type: boolean
 *                   description: Google Authenticator 설정 여부
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       403:
 *         description: 계정이 활성화되지 않음
 */
router.post('/verify-email', authController.verifyEmail);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Google Authenticator OTP 검증 및 JWT 토큰 발급 (로그인 2단계)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - memberType
 *               - otpCode
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'user@example.com'
 *               memberType:
 *                 type: string
 *                 enum: [individual, corporate]
 *                 example: 'individual'
 *               otpCode:
 *                 type: string
 *                 pattern: '^\d{6}$'
 *                 example: '123456'
 *                 description: Google Authenticator 6자리 코드
 *     responses:
 *       200:
 *         description: OTP 검증 성공 및 JWT 토큰 발급
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: JWT 토큰 (24시간 유효)
 *                 expiresIn:
 *                   type: string
 *                   example: '24h'
 *                 user:
 *                   type: object
 *       400:
 *         description: Google Authenticator 미설정 또는 잘못된 OTP 형식
 *       401:
 *         description: OTP 코드 불일치 또는 만료됨
 *       403:
 *         description: 계정이 활성화되지 않음
 */
router.post('/verify-otp', authController.verifyOtp);

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: 회원가입 (인증 없이 누구나 가입 가능)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 example: '홍길동'
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'user@example.com'
 *               phone:
 *                 type: string
 *                 example: '010-1234-5678'
 *               memberType:
 *                 type: string
 *                 enum: [individual, corporate]
 *                 example: 'individual'
 *               fundSource:
 *                 type: string
 *                 example: 'salary'
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *       400:
 *         description: 유효성 검증 실패
 *       409:
 *         description: 이메일 중복
 */
router.post('/signup', authController.signup);

module.exports = router;
