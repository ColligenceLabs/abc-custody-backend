const jwt = require('jsonwebtoken');

/**
 * JWT 인증 미들웨어
 * Authorization 헤더의 Bearer 토큰을 검증하고 사용자 정보를 req.user에 저장
 */
exports.authenticate = (req, res, next) => {
  try {
    // Authorization 헤더 확인
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No authorization header provided'
      });
    }

    // Bearer 토큰 형식 확인
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Invalid token format',
        message: 'Authorization header must be in format: Bearer <token>'
      });
    }

    const token = parts[1];

    // 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 토큰 만료 확인 (jwt.verify가 자동으로 확인하지만 명시적으로 체크)
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please login again.'
      });
    }

    // 사용자 정보를 request에 저장
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      memberType: decoded.memberType
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token verification failed'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please login again.'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: error.message
    });
  }
};

/**
 * 역할 기반 인증 미들웨어
 * 특정 역할을 가진 사용자만 접근 가능하도록 제한
 * @param {Array<string>} allowedRoles - 허용된 역할 목록
 */
exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // authenticate 미들웨어가 먼저 실행되어야 함
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please authenticate first'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * 선택적 인증 미들웨어
 * 토큰이 있으면 검증하고, 없어도 다음으로 진행
 * 공개 API이지만 인증된 사용자에게는 추가 정보를 제공할 때 유용
 */
exports.optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      // 토큰이 없으면 그냥 진행
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      // 토큰 형식이 잘못되었어도 그냥 진행
      return next();
    }

    const token = parts[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 유효한 토큰이면 사용자 정보 저장
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      memberType: decoded.memberType
    };

    next();
  } catch (error) {
    // 토큰 검증 실패해도 그냥 진행 (선택적 인증)
    next();
  }
};
