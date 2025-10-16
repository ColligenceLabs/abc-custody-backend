const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const OTPAuth = require('otpauth');

/**
 * 로그인
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 입력 검증
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    // 사용자 조회
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // 비밀번호 확인
    // 개발 환경에서는 비밀번호가 해시되어 있지 않을 수 있으므로 두 가지 방법으로 체크
    let isPasswordValid = false;

    if (user.password && user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      // bcrypt 해시된 비밀번호
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      // 평문 비밀번호 (개발용 - 실제 프로덕션에서는 사용하지 않음)
      isPasswordValid = password === user.password;
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // 계정 상태 확인
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Account not active',
        message: `Your account is ${user.status}. Please contact administrator.`
      });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        memberType: user.memberType
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    );

    // 마지막 로그인 시간 업데이트
    await user.update({ lastLogin: new Date() });

    // 응답 (비밀번호 제외)
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      memberType: user.memberType,
      phone: user.phone,
      department: user.department,
      position: user.position
    };

    res.json({
      success: true,
      message: 'Login successful',
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      user: userResponse
    });
  } catch (error) {
    console.error('로그인 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 현재 사용자 정보 조회
 * GET /api/auth/me
 */
exports.getCurrentUser = async (req, res) => {
  try {
    // authenticate 미들웨어가 req.user에 사용자 정보를 저장함
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] } // 비밀번호 제외
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Current user not found in database'
      });
    }

    res.json(user);
  } catch (error) {
    console.error('사용자 정보 조회 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 비밀번호 변경
 * POST /api/auth/change-password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 입력 검증
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'New password must be at least 8 characters long'
      });
    }

    // 사용자 조회
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // 현재 비밀번호 확인
    let isPasswordValid = false;

    if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
      isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    } else {
      isPasswordValid = currentPassword === user.password;
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Current password is incorrect'
      });
    }

    // 새 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    await user.update({ password: hashedPassword });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('비밀번호 변경 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 토큰 갱신
 * POST /api/auth/refresh
 */
exports.refreshToken = async (req, res) => {
  try {
    // 현재 토큰에서 사용자 정보 가져오기 (authenticate 미들웨어 사용)
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Account not active',
        message: `Your account is ${user.status}`
      });
    }

    // 새 토큰 생성
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        memberType: user.memberType
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  } catch (error) {
    console.error('토큰 갱신 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Google Authenticator OTP 검증 및 로그인
 * POST /api/auth/verify-otp
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, memberType, otpCode } = req.body;

    // 입력 검증
    if (!email || !memberType || !otpCode) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email, memberType, and otpCode are required'
      });
    }

    if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'OTP code must be 6 digits'
      });
    }

    // 사용자 조회
    const user = await User.findOne({
      where: {
        email,
        memberType
      }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or member type'
      });
    }

    // 계정 상태 확인
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Account not active',
        message: `Your account is ${user.status}. Please contact administrator.`
      });
    }

    // Google Authenticator 설정 확인
    if (!user.totpSecret || !user.hasGASetup) {
      return res.status(400).json({
        error: 'Google Authenticator not set up',
        message: 'Please set up Google Authenticator first'
      });
    }

    // TOTP 검증
    try {
      const secret = OTPAuth.Secret.fromBase32(user.totpSecret);
      const totp = new OTPAuth.TOTP({
        issuer: 'CustodyDashboard',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret
      });

      // TOTP 검증 (±2 윈도우 = ±60초)
      const delta = totp.validate({
        token: otpCode,
        window: 2
      });

      if (delta === null) {
        return res.status(401).json({
          error: 'Invalid OTP',
          message: 'The OTP code is incorrect or expired'
        });
      }

      // 인증 성공 - JWT 토큰 생성
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          memberType: user.memberType
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        }
      );

      // 마지막 로그인 시간 업데이트
      await user.update({ lastLogin: new Date() });

      // 응답 (비밀번호 제외)
      const userResponse = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        memberType: user.memberType,
        phone: user.phone,
        department: user.department,
        position: user.position,
        hasGASetup: user.hasGASetup
      };

      res.json({
        success: true,
        message: 'OTP verification successful',
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        user: userResponse
      });

    } catch (error) {
      console.error('TOTP 검증 오류:', error);
      return res.status(500).json({
        error: 'OTP verification error',
        message: 'Failed to verify OTP code'
      });
    }

  } catch (error) {
    console.error('OTP 검증 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 이메일 인증 PIN 코드 전송
 * POST /api/auth/send-email-pin
 */
exports.sendEmailPin = async (req, res) => {
  try {
    const { email } = req.body;

    // 입력 검증
    if (!email) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email is required'
      });
    }

    // TODO: 추후 3rd party API 적용 (이메일 발송 서비스)
    // 실제로는 SendGrid, AWS SES, Mailgun 등을 사용하여 PIN 코드 발송
    // const pinCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 PIN
    // await emailService.sendPinCode(email, pinCode);
    // await redis.set(`email_pin:${email}`, pinCode, 'EX', 300); // 5분 만료

    // 현재는 모든 요청을 성공으로 처리
    res.json({
      success: true,
      message: 'PIN 코드가 이메일로 전송되었습니다.',
      expiresIn: 300 // 5분
    });

  } catch (error) {
    console.error('이메일 PIN 전송 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 이메일 인증 PIN 코드 검증 (로그인용 - 계정 존재 확인 포함)
 * POST /api/auth/verify-email-pin-login
 */
exports.verifyEmailPinLogin = async (req, res) => {
  try {
    const { email, pinCode, memberType } = req.body;

    // 입력 검증
    if (!email || !pinCode || !memberType) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email, pinCode, and memberType are required'
      });
    }

    // TODO: 추후 3rd party API 적용 (PIN 검증)
    // 실제로는 Redis 등에 저장된 PIN 코드와 비교
    // const storedPin = await redis.get(`email_pin:${email}`);
    // if (!storedPin || storedPin !== pinCode) {
    //   return res.status(401).json({
    //     error: 'Invalid PIN',
    //     message: 'PIN 코드가 올바르지 않거나 만료되었습니다.'
    //   });
    // }

    // 현재는 모든 PIN을 유효한 것으로 처리

    // 사용자 조회 (로그인용이므로 계정 존재 확인)
    const user = await User.findOne({
      where: {
        email,
        memberType
      },
      attributes: { exclude: ['password', 'totpSecret'] }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with this email and member type'
      });
    }

    // 계정 상태 확인
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Account not active',
        message: `Your account is ${user.status}. Please contact administrator.`
      });
    }

    // PIN 검증 성공 후 Redis에서 삭제
    // await redis.del(`email_pin:${email}`);

    res.json({
      success: true,
      message: 'Email PIN verified',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        memberType: user.memberType,
        hasGASetup: user.hasGASetup,
        isFirstLogin: user.isFirstLogin
      },
      requiresOTP: user.hasGASetup
    });

  } catch (error) {
    console.error('이메일 PIN 검증 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 이메일 인증 PIN 코드 검증 (회원가입용 - 계정 존재 확인 안함)
 * POST /api/auth/verify-email-pin-signup
 */
exports.verifyEmailPinSignup = async (req, res) => {
  try {
    const { email, pinCode } = req.body;

    // 입력 검증
    if (!email || !pinCode) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and pinCode are required'
      });
    }

    // TODO: 추후 3rd party API 적용 (PIN 검증)
    // 실제로는 Redis 등에 저장된 PIN 코드와 비교
    // const storedPin = await redis.get(`email_pin:${email}`);
    // if (!storedPin || storedPin !== pinCode) {
    //   return res.status(401).json({
    //     error: 'Invalid PIN',
    //     message: 'PIN 코드가 올바르지 않거나 만료되었습니다.'
    //   });
    // }

    // 현재는 모든 PIN을 유효한 것으로 처리

    // PIN 검증 성공 후 Redis에서 삭제
    // await redis.del(`email_pin:${email}`);

    res.json({
      success: true,
      message: 'Email PIN verified for signup',
      email: email
    });

  } catch (error) {
    console.error('이메일 PIN 검증 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 사용자 이메일 확인 (OTP 검증 전 단계)
 * POST /api/auth/verify-email
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { email, memberType } = req.body;

    // 입력 검증
    if (!email || !memberType) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and memberType are required'
      });
    }

    // 사용자 조회
    const user = await User.findOne({
      where: {
        email,
        memberType
      },
      attributes: { exclude: ['password', 'totpSecret'] }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with this email and member type'
      });
    }

    // 계정 상태 확인
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Account not active',
        message: `Your account is ${user.status}. Please contact administrator.`
      });
    }

    res.json({
      success: true,
      message: 'Email verified',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        memberType: user.memberType,
        hasGASetup: user.hasGASetup,
        isFirstLogin: user.isFirstLogin
      },
      requiresOTP: user.hasGASetup
    });

  } catch (error) {
    console.error('이메일 확인 실패:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 회원가입
 * POST /api/auth/signup
 */
exports.signup = async (req, res) => {
  try {
    const userData = req.body;

    // 필수 필드 검증
    if (!userData.email || !userData.phone) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and phone are required'
      });
    }

    // 이메일 중복 확인
    const existingUser = await User.findOne({
      where: { email: userData.email }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Email already exists',
        message: 'This email is already registered'
      });
    }

    // ID 자동 생성
    if (!userData.id) {
      userData.id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 기본값 설정 (회원가입은 viewer 권한으로만 생성)
    const newUserData = {
      ...userData,
      role: 'viewer',
      status: 'active',
      hasGASetup: false,
      isFirstLogin: true
    };

    // 사용자 생성
    const user = await User.create(newUserData);

    // 비밀번호와 민감한 정보 제외하고 응답
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      memberType: user.memberType,
      department: user.department,
      position: user.position
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('회원가입 실패:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
