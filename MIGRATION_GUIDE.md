# PostgreSQL RDBMS 최적화 마이그레이션 가이드

## 개요

이 가이드는 json-server에서 PostgreSQL RDBMS로 마이그레이션하면서 추가된 고급 SQL 기능 활용 API에 대한 안내서입니다.

json-server는 간단한 REST API를 제공하지만 RDBMS의 고급 기능(JOIN, 집계 쿼리, 트랜잭션)을 사용할 수 없었습니다. PostgreSQL + Sequelize ORM을 통해 이러한 기능들을 활용하여 성능과 기능을 크게 향상시켰습니다.

## 주요 개선 사항

### 1. JWT 인증 시스템
- **이전**: 인증 없이 모든 API 접근 가능
- **현재**: 보안 필요 API에 JWT 토큰 기반 인증 적용
- **보안**: 안전한 사용자 인증 및 권한 관리

### 2. JOIN을 통한 관련 데이터 통합 조회
- **이전**: 여러 번의 API 요청 필요 (N+1 문제)
- **현재**: 단일 요청으로 관련 데이터 함께 조회
- **성능**: API 요청 횟수 감소, 네트워크 오버헤드 감소

### 3. SQL 집계 쿼리를 통한 통계 기능
- **이전**: 프론트엔드에서 직접 계산 필요
- **현재**: 데이터베이스 레벨에서 효율적인 집계 처리
- **성능**: 대량 데이터 처리 시 성능 대폭 향상

### 4. 트랜잭션 지원
- **이전**: 원자성 보장 불가
- **현재**: 여러 작업을 하나의 트랜잭션으로 처리
- **안정성**: 데이터 일관성 보장

### 5. 복잡한 필터링 및 검색
- **이전**: 제한적인 쿼리 파라미터
- **현재**: 다양한 조건 조합 및 JSONB 필드 검색 가능
- **유연성**: 비즈니스 요구사항에 맞는 유연한 검색

## API 엔드포인트 목록

### 인증 API (신규)

#### 기본 로그인 (이메일/비밀번호)

**로그인**
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**응답:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h",
  "user": {
    "id": "user_1",
    "name": "홍길동",
    "email": "user@example.com",
    "role": "admin",
    "status": "active",
    "memberType": "individual"
  }
}
```

#### Google Authenticator OTP 로그인 (2단계)

**1단계: 이메일 확인**
```
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "user@example.com",
  "memberType": "individual"
}
```

**응답:**
```json
{
  "success": true,
  "message": "Email verified",
  "user": {
    "id": "user_1",
    "name": "홍길동",
    "email": "user@example.com",
    "phone": "010-1234-5678",
    "memberType": "individual",
    "hasGASetup": true,
    "isFirstLogin": false
  },
  "requiresOTP": true
}
```

**2단계: OTP 검증 및 JWT 토큰 발급**
```
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "memberType": "individual",
  "otpCode": "123456"
}
```

**응답:**
```json
{
  "success": true,
  "message": "OTP verification successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h",
  "user": {
    "id": "user_1",
    "name": "홍길동",
    "email": "user@example.com",
    "role": "admin",
    "status": "active",
    "memberType": "individual",
    "hasGASetup": true
  }
}
```

#### 사용자 정보 및 토큰 관리

**현재 사용자 정보 조회**
```
GET /api/auth/me
Authorization: Bearer <token>
```

**비밀번호 변경**
```
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

**토큰 갱신**
```
POST /api/auth/refresh
Authorization: Bearer <token>
```

**응답:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

### 기존 API (호환성 유지)

모든 기존 json-server API는 100% 호환됩니다 (조회 API는 인증 불필요):

```
GET    /api/users
GET    /api/users/:id
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id

GET    /api/addresses
GET    /api/addresses/:id
POST   /api/addresses
PATCH  /api/addresses/:id
DELETE /api/addresses/:id

GET    /api/deposit-addresses
GET    /api/deposit-addresses/:id
POST   /api/deposit-addresses
PATCH  /api/deposit-addresses/:id
DELETE /api/deposit-addresses/:id

GET    /api/deposits
GET    /api/deposits/:id
GET    /api/deposits/txHash/:txHash
POST   /api/deposits
PATCH  /api/deposits/:id
DELETE /api/deposits/:id
```

### 새로운 PostgreSQL 최적화 API

#### User 관련 JOIN API

**1. 사용자의 출금 주소 목록 조회 (JOIN)**
```
GET /api/users/:id/addresses?type=personal&coin=BTC&_page=1&_limit=10
```

**응답 예시:**
```json
{
  "user": {
    "id": "user_1",
    "name": "홍길동",
    "email": "hong@example.com",
    "memberType": "individual"
  },
  "addresses": [
    {
      "id": "addr_personal_1",
      "label": "내 BTC 지갑",
      "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      "coin": "BTC",
      "type": "personal"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

**프론트엔드 마이그레이션:**
```javascript
// 이전 방식 (2번의 API 호출)
const user = await fetch(`/api/users/${userId}`).then(r => r.json());
const addresses = await fetch(`/api/addresses?userId=${userId}&type=personal`).then(r => r.json());

// 새로운 방식 (1번의 API 호출)
const result = await fetch(`/api/users/${userId}/addresses?type=personal`).then(r => r.json());
// result.user: 사용자 정보
// result.addresses: 주소 목록
// result.pagination: 페이지네이션 정보
```

**2. 사용자의 입금 주소 목록 조회 (JOIN)**
```
GET /api/users/:id/deposit-addresses?coin=ETH&network=ethereum&isActive=true
```

**응답 예시:**
```json
{
  "user": {
    "id": "user_1",
    "name": "홍길동",
    "email": "hong@example.com",
    "memberType": "individual"
  },
  "depositAddresses": [
    {
      "id": "dep_addr_1",
      "label": "ETH 입금주소",
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "coin": "ETH",
      "network": "ethereum",
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1
  }
}
```

**3. 사용자의 입금 내역 조회 (DepositAddress JOIN)**
```
GET /api/users/:id/deposits?status=confirmed&asset=BTC&_page=1&_limit=20
```

**응답 예시:**
```json
{
  "user": {
    "id": "user_1",
    "name": "홍길동",
    "email": "hong@example.com",
    "memberType": "individual"
  },
  "deposits": [
    {
      "id": "dep_1",
      "txHash": "abc123...",
      "asset": "BTC",
      "amount": "0.5",
      "status": "confirmed",
      "depositAddress": {
        "id": "dep_addr_1",
        "label": "BTC 입금주소",
        "address": "bc1q...",
        "coin": "BTC",
        "network": "bitcoin"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

**프론트엔드 마이그레이션:**
```javascript
// 이전 방식 (각 입금마다 입금주소 정보를 위한 추가 API 호출 필요)
const deposits = await fetch(`/api/deposits?userId=${userId}`).then(r => r.json());
// deposits 각각에 대해 depositAddress를 별도로 fetch 필요

// 새로운 방식 (입금주소 정보가 함께 포함됨)
const result = await fetch(`/api/users/${userId}/deposits`).then(r => r.json());
// result.deposits[0].depositAddress에 바로 접근 가능
```

**4. 사용자 통계 조회 (SQL 집계)**
```
GET /api/users/:id/stats
```

**응답 예시:**
```json
{
  "user": {
    "id": "user_1",
    "name": "홍길동",
    "email": "hong@example.com",
    "memberType": "individual"
  },
  "stats": {
    "addresses": {
      "total": 10,
      "personal": 7,
      "vasp": 3,
      "totalTransactions": 145
    },
    "deposits": {
      "total": 25,
      "confirmed": 23,
      "totalAmount": 15.5,
      "lastDepositAt": "2025-10-14T10:30:00.000Z"
    },
    "depositAddresses": {
      "total": 5,
      "active": 4
    }
  }
}
```

**프론트엔드 마이그레이션:**
```javascript
// 이전 방식 (여러 API 호출 + 프론트엔드 계산)
const addresses = await fetch(`/api/addresses?userId=${userId}`).then(r => r.json());
const deposits = await fetch(`/api/deposits?userId=${userId}`).then(r => r.json());
const depositAddresses = await fetch(`/api/deposit-addresses?userId=${userId}`).then(r => r.json());

// 프론트엔드에서 직접 계산
const stats = {
  totalAddresses: addresses.length,
  personalAddresses: addresses.filter(a => a.type === 'personal').length,
  // ... 복잡한 계산 로직
};

// 새로운 방식 (단일 API 호출로 모든 통계 제공)
const result = await fetch(`/api/users/${userId}/stats`).then(r => r.json());
// result.stats에 모든 통계가 계산되어 있음
```

#### Deposit 관련 API

**5. 입금 전체 정보 조회 (User + DepositAddress JOIN)**
```
GET /api/deposits/:id/full
```

**응답 예시:**
```json
{
  "id": "dep_1",
  "txHash": "0xabc123...",
  "asset": "ETH",
  "network": "ethereum",
  "amount": "1.5",
  "status": "confirmed",
  "user": {
    "id": "user_1",
    "name": "홍길동",
    "email": "hong@example.com",
    "memberType": "individual",
    "phone": "010-1234-5678"
  },
  "depositAddress": {
    "id": "dep_addr_1",
    "label": "ETH 입금주소",
    "address": "0x742d35Cc...",
    "coin": "ETH",
    "network": "ethereum"
  }
}
```

**프론트엔드 마이그레이션:**
```javascript
// 이전 방식 (3번의 API 호출)
const deposit = await fetch(`/api/deposits/${depositId}`).then(r => r.json());
const user = await fetch(`/api/users/${deposit.userId}`).then(r => r.json());
const depositAddress = await fetch(`/api/deposit-addresses/${deposit.depositAddressId}`).then(r => r.json());

// 새로운 방식 (1번의 API 호출)
const fullDeposit = await fetch(`/api/deposits/${depositId}/full`).then(r => r.json());
// fullDeposit.user, fullDeposit.depositAddress에 바로 접근
```

**6. 입금 요약 통계 (SQL 집계)**
```
GET /api/deposits/summary?userId=user_1&asset=BTC&startDate=2025-01-01&endDate=2025-10-14
```

**응답 예시:**
```json
{
  "overall": {
    "totalDeposits": 150,
    "totalAmount": 25.75,
    "avgAmount": 0.172,
    "firstDeposit": "2025-01-15T08:30:00.000Z",
    "lastDeposit": "2025-10-14T15:45:00.000Z"
  },
  "byStatus": [
    {
      "status": "detected",
      "count": "10",
      "total_amount": "1.5"
    },
    {
      "status": "confirmed",
      "count": "120",
      "total_amount": "22.0"
    },
    {
      "status": "credited",
      "count": "20",
      "total_amount": "2.25"
    }
  ],
  "byAsset": [
    {
      "asset": "BTC",
      "count": "80",
      "total_amount": "15.5",
      "avg_amount": "0.194",
      "min_amount": "0.001",
      "max_amount": "2.5"
    },
    {
      "asset": "ETH",
      "count": "70",
      "total_amount": "10.25",
      "avg_amount": "0.146",
      "min_amount": "0.01",
      "max_amount": "1.8"
    }
  ],
  "byNetwork": [
    {
      "network": "bitcoin",
      "count": "80",
      "total_amount": "15.5"
    },
    {
      "network": "ethereum",
      "count": "70",
      "total_amount": "10.25"
    }
  ]
}
```

**프론트엔드 마이그레이션:**
```javascript
// 이전 방식 (모든 데이터 가져와서 프론트엔드 계산)
const allDeposits = await fetch(`/api/deposits?userId=${userId}`).then(r => r.json());

// 프론트엔드에서 복잡한 계산
const summary = {
  totalDeposits: allDeposits.length,
  totalAmount: allDeposits.reduce((sum, d) => sum + parseFloat(d.amount), 0),
  byStatus: {},
  byAsset: {},
  // ... 복잡한 집계 로직
};

// 새로운 방식 (데이터베이스에서 효율적으로 계산)
const summary = await fetch(`/api/deposits/summary?userId=${userId}`).then(r => r.json());
// summary.overall, summary.byStatus, summary.byAsset 등에 바로 접근
```

**7. 대량 입금 생성 (트랜잭션)**
```
POST /api/deposits/bulk
Content-Type: application/json

{
  "deposits": [
    {
      "userId": "user_1",
      "depositAddressId": "dep_addr_1",
      "txHash": "0xabc123...",
      "asset": "ETH",
      "network": "ethereum",
      "amount": "1.5",
      "fromAddress": "0x123...",
      "toAddress": "0x456..."
    },
    {
      "userId": "user_2",
      "depositAddressId": "dep_addr_2",
      "txHash": "0xdef456...",
      "asset": "BTC",
      "network": "bitcoin",
      "amount": "0.5",
      "fromAddress": "bc1q123...",
      "toAddress": "bc1q456..."
    }
  ]
}
```

**응답 예시:**
```json
{
  "success": true,
  "created": 2,
  "deposits": [
    { "id": "dep_123", "txHash": "0xabc123...", ... },
    { "id": "dep_124", "txHash": "0xdef456...", ... }
  ]
}
```

**프론트엔드 마이그레이션:**
```javascript
// 이전 방식 (각각 POST, 실패 시 롤백 불가)
for (const deposit of deposits) {
  await fetch('/api/deposits', {
    method: 'POST',
    body: JSON.stringify(deposit)
  });
  // 중간에 실패하면 일부만 생성되는 문제
}

// 새로운 방식 (트랜잭션으로 모두 성공 or 모두 실패)
const result = await fetch('/api/deposits/bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ deposits })
}).then(r => r.json());
// 모든 입금이 성공하거나, 하나라도 실패하면 전체 롤백
```

#### Address 관련 API

**8. 주소와 사용자 정보 함께 조회 (JOIN)**
```
GET /api/addresses/:id/with-user
```

**응답 예시:**
```json
{
  "id": "addr_personal_1",
  "label": "내 BTC 지갑",
  "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  "coin": "BTC",
  "type": "personal",
  "permissions": {
    "canDeposit": true,
    "canWithdraw": true
  },
  "user": {
    "id": "user_1",
    "name": "홍길동",
    "email": "hong@example.com",
    "memberType": "individual",
    "phone": "010-1234-5678"
  }
}
```

**9. 주소 사용 통계**
```
GET /api/addresses/:id/usage-stats
```

**응답 예시:**
```json
{
  "addressInfo": {
    "id": "addr_personal_1",
    "label": "내 BTC 지갑",
    "address": "bc1q...",
    "coin": "BTC",
    "type": "personal"
  },
  "usage": {
    "txCount": 145,
    "lastUsed": "2025-10-14T15:30:00.000Z",
    "addedAt": "2025-01-01T00:00:00.000Z"
  },
  "limits": {
    "dailyLimits": {
      "deposit": 1000000,
      "withdrawal": 1000000
    },
    "dailyUsage": {
      "date": "2025-10-14",
      "depositAmount": 250000,
      "withdrawalAmount": 150000,
      "lastResetAt": "2025-10-14T00:00:00.000Z"
    }
  },
  "permissions": {
    "canDeposit": true,
    "canWithdraw": true
  }
}
```

**10. 일일 사용량 업데이트 (트랜잭션)**
```
PATCH /api/addresses/:id/daily-usage
Content-Type: application/json

{
  "depositAmount": 100000,
  "withdrawalAmount": 50000
}
```

**응답 예시 (성공):**
```json
{
  "id": "addr_personal_1",
  "dailyUsage": {
    "date": "2025-10-14",
    "depositAmount": 350000,
    "withdrawalAmount": 200000,
    "lastResetAt": "2025-10-14T00:00:00.000Z"
  },
  // ... 전체 주소 정보
}
```

**응답 예시 (한도 초과):**
```json
{
  "error": "Daily deposit limit exceeded",
  "limit": 1000000,
  "current": 1100000
}
```

**프론트엔드 마이그레이션:**
```javascript
// 이전 방식 (경쟁 조건 발생 가능)
const address = await fetch(`/api/addresses/${addressId}`).then(r => r.json());
const newUsage = {
  depositAmount: (address.dailyUsage?.depositAmount || 0) + 100000,
  withdrawalAmount: (address.dailyUsage?.withdrawalAmount || 0) + 50000
};
// 한도 체크도 프론트엔드에서 해야 함
if (newUsage.depositAmount > address.dailyLimits.deposit) {
  alert('한도 초과');
  return;
}
await fetch(`/api/addresses/${addressId}`, {
  method: 'PATCH',
  body: JSON.stringify({ dailyUsage: newUsage })
});

// 새로운 방식 (트랜잭션으로 원자적 업데이트 + 자동 한도 체크)
try {
  const result = await fetch(`/api/addresses/${addressId}/daily-usage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      depositAmount: 100000,
      withdrawalAmount: 50000
    })
  }).then(r => r.json());

  if (result.error) {
    alert(`${result.error}: ${result.current}/${result.limit}`);
  }
} catch (error) {
  // 에러 처리
}
```

## JWT 인증 마이그레이션

### 프론트엔드 구현 가이드

**1. 로그인 및 토큰 저장**

```javascript
// 로그인 함수
async function login(email, password) {
  try {
    const response = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();

    // 토큰을 localStorage에 저장
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  } catch (error) {
    console.error('로그인 실패:', error);
    throw error;
  }
}
```

**2. API 요청 시 토큰 포함**

```javascript
// 인증이 필요한 API 호출 헬퍼 함수
async function authenticatedFetch(url, options = {}) {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('로그인이 필요합니다');
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  // 401 에러 시 로그아웃 처리
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
  }

  return response;
}

// 사용 예시
async function createAddress(addressData) {
  const response = await authenticatedFetch('http://localhost:4000/api/addresses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(addressData)
  });

  return response.json();
}
```

**3. Axios 사용 시**

```javascript
import axios from 'axios';

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: 'http://localhost:4000/api'
});

// 요청 인터셉터 - 모든 요청에 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 401 에러 시 자동 로그아웃
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 사용 예시
async function createAddress(addressData) {
  const response = await api.post('/addresses', addressData);
  return response.data;
}

async function getUsers() {
  const response = await api.get('/users');
  return response.data;
}
```

**4. 토큰 갱신 로직**

```javascript
// 토큰 갱신 함수
async function refreshToken() {
  try {
    const response = await authenticatedFetch('http://localhost:4000/api/auth/refresh', {
      method: 'POST'
    });

    const data = await response.json();
    localStorage.setItem('token', data.token);

    return data.token;
  } catch (error) {
    console.error('토큰 갱신 실패:', error);
    // 로그아웃 처리
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw error;
  }
}

// 토큰 만료 전 자동 갱신 (선택사항)
function startTokenRefreshTimer() {
  // 23시간마다 토큰 갱신 (토큰 유효기간 24시간)
  setInterval(() => {
    refreshToken();
  }, 23 * 60 * 60 * 1000);
}
```

### 인증이 필요한 API 목록

**Users API (변경 작업만 인증 필요)**
- ✅ `POST /api/users` - admin만 가능
- ✅ `PATCH /api/users/:id` - admin, manager 가능
- ✅ `DELETE /api/users/:id` - admin만 가능
- ❌ `GET /api/users` - 인증 불필요
- ❌ `GET /api/users/:id` - 인증 불필요
- ❌ `GET /api/users/:id/addresses` - 인증 불필요 (조회)
- ❌ `GET /api/users/:id/deposits` - 인증 불필요 (조회)
- ❌ `GET /api/users/:id/stats` - 인증 불필요 (조회)

**Addresses API (변경 작업만 인증 필요)**
- ✅ `POST /api/addresses` - 인증 필요
- ✅ `PATCH /api/addresses/:id` - 인증 필요
- ✅ `PATCH /api/addresses/:id/daily-usage` - 인증 필요
- ✅ `DELETE /api/addresses/:id` - admin, manager만 가능
- ❌ `GET /api/addresses` - 인증 불필요
- ❌ `GET /api/addresses/:id` - 인증 불필요
- ❌ `GET /api/addresses/:id/with-user` - 인증 불필요 (조회)
- ❌ `GET /api/addresses/:id/usage-stats` - 인증 불필요 (조회)

**Deposits API (변경 작업만 인증 필요)**
- ✅ `POST /api/deposits` - 인증 필요
- ✅ `POST /api/deposits/bulk` - admin, manager, operator 가능
- ✅ `PATCH /api/deposits/:id` - admin, manager, operator 가능
- ✅ `DELETE /api/deposits/:id` - admin만 가능
- ❌ `GET /api/deposits` - 인증 불필요
- ❌ `GET /api/deposits/:id` - 인증 불필요
- ❌ `GET /api/deposits/:id/full` - 인증 불필요 (조회)
- ❌ `GET /api/deposits/summary` - 인증 불필요 (조회)

**DepositAddresses API (변경 작업만 인증 필요)**
- ✅ `POST /api/depositAddresses` - 인증 필요
- ✅ `PATCH /api/depositAddresses/:id` - 인증 필요
- ✅ `DELETE /api/depositAddresses/:id` - admin, manager만 가능
- ❌ `GET /api/depositAddresses` - 인증 불필요
- ❌ `GET /api/depositAddresses/:id` - 인증 불필요

### 권한 레벨

1. **admin**: 모든 작업 가능 (사용자 생성/삭제, 모든 데이터 삭제)
2. **manager**: 대부분 작업 가능 (사용자 수정, 주소 삭제, 입금 관리)
3. **operator**: 입금 관련 작업 가능 (입금 생성, 수정)
4. **viewer**: 조회만 가능

## 마이그레이션 체크리스트

### 1단계: 인증 시스템 구현
- [ ] 로그인 페이지 구현
- [ ] 토큰 저장 로직 구현 (localStorage 또는 sessionStorage)
- [ ] API 요청 인터셉터 구현 (Authorization 헤더 자동 추가)
- [ ] 401 에러 처리 로직 구현 (자동 로그아웃)
- [ ] 토큰 갱신 로직 구현 (선택사항)

### 2단계: 기존 API 호환성 확인
- [ ] 모든 기존 API 엔드포인트가 정상 작동하는지 확인
- [ ] 응답 데이터 구조가 동일한지 확인
- [ ] 쿼리 파라미터가 정상 작동하는지 확인
- [ ] 조회 API는 토큰 없이 작동하는지 확인

### 3단계: 성능 개선 가능한 부분 식별
- [ ] 여러 번의 API 호출로 데이터를 조합하는 부분 찾기
- [ ] 프론트엔드에서 집계/통계 계산하는 부분 찾기
- [ ] 여러 작업을 순차적으로 수행하는 부분 찾기

### 4단계: 새 API로 점진적 마이그레이션
- [ ] JOIN API로 다중 호출 제거
- [ ] 통계 API로 프론트엔드 계산 로직 제거
- [ ] 트랜잭션 API로 데이터 일관성 보장

### 5단계: 테스트 및 검증
- [ ] 새 API 응답 구조 확인
- [ ] 에러 처리 로직 추가
- [ ] 성능 개선 효과 측정
- [ ] 인증 흐름 테스트 (로그인, 로그아웃, 토큰 만료)

## 성능 비교

### 예시 1: 사용자 정보 + 입금 내역 조회

**이전 방식:**
```
요청 1: GET /api/users/user_1          (50ms)
요청 2: GET /api/deposits?userId=user_1 (100ms)
총 150ms + 네트워크 오버헤드
```

**새로운 방식:**
```
요청 1: GET /api/users/user_1/deposits  (80ms)
총 80ms
```
→ **46% 성능 향상**

### 예시 2: 입금 통계 계산 (1000건 데이터)

**이전 방식:**
```
요청 1: GET /api/deposits?userId=user_1 (500ms)
계산: 프론트엔드 집계 계산           (100ms)
총 600ms
```

**새로운 방식:**
```
요청 1: GET /api/deposits/summary?userId=user_1 (50ms)
총 50ms
```
→ **92% 성능 향상**

## 추가 고려사항

### 에러 처리

새 API들은 다음과 같은 에러를 반환할 수 있습니다:

```javascript
// 404: 리소스를 찾을 수 없음
{
  "error": "User not found"
}

// 400: 한도 초과 등 비즈니스 로직 에러
{
  "error": "Daily deposit limit exceeded",
  "limit": 1000000,
  "current": 1100000
}

// 500: 서버 내부 오류
{
  "error": "Internal server error",
  "message": "상세 에러 메시지"
}
```

### 페이지네이션

모든 목록 조회 API는 동일한 페이지네이션을 지원합니다:

```
?_page=1&_limit=20&_sort=createdAt&_order=desc
```

응답 헤더에 `X-Total-Count`가 포함되며, JOIN API는 응답 본문에 `pagination` 객체도 포함됩니다.

### JSONB 필드 활용

PostgreSQL의 JSONB 필드를 활용하여 유연한 데이터 구조를 지원합니다:

- `permissions`: 권한 설정
- `walletLimit`: 지갑 한도
- `vaspInfo`: VASP 정보
- `dailyUsage`: 일일 사용량
- `dailyLimits`: 일일 한도

이러한 필드들은 구조화되지 않은 데이터를 저장할 수 있어 스키마 변경 없이 새로운 속성을 추가할 수 있습니다.

## 프론트엔드 Google Authenticator 연동 가이드

### 개요

프론트엔드에서 현재 Google Authenticator 검증을 직접 처리하고 있으나, 이를 백엔드 API로 이전하여 더 안전하고 일관된 인증 흐름을 구현할 수 있습니다.

**현재 프론트엔드 흐름:**
1. 이메일 입력 → 사용자 조회
2. OTP 입력 → **프론트엔드에서 TOTP 검증** (OTPAuth 라이브러리)
3. SMS 인증 → mock 검증
4. 완료 → localStorage에 세션 저장 (JWT 토큰 없음)

**새로운 백엔드 API 흐름:**
1. 이메일 입력 → `POST /api/auth/verify-email` (사용자 확인)
2. OTP 입력 → `POST /api/auth/verify-otp` (백엔드에서 TOTP 검증 + JWT 토큰 발급)
3. 완료 → JWT 토큰으로 인증된 API 사용

### 주요 변경 사항

#### 1. AuthContext.tsx 수정

**현재 코드 (프론트엔드 OTP 검증):**
```typescript
// src/contexts/AuthContext.tsx (367-399번 라인)
const verifyOtp = async (otp: string) => {
  // ...

  // 프론트엔드에서 직접 TOTP 검증
  if (authStep.user.totpSecret) {
    const OTPAuth = await import('otpauth');
    const secret = OTPAuth.Secret.fromBase32(authStep.user.totpSecret);
    const totp = new OTPAuth.TOTP({
      issuer: 'CustodyDashboard',
      label: authStep.user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret
    });

    // TOTP 검증
    const delta = totp.validate({
      token: otp,
      window: 2
    });

    isValid = delta !== null;
  }

  // ...
};
```

**변경 후 (백엔드 API 호출):**
```typescript
// src/contexts/AuthContext.tsx
const verifyOtp = async (otp: string) => {
  if (!authStep.user || authStep.step !== 'otp') {
    return { success: false, message: '잘못된 접근입니다.' };
  }

  try {
    // 백엔드 OTP 검증 API 호출
    const response = await fetch('http://localhost:4000/api/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: authStep.email || authStep.user.email,
        memberType: authStep.memberType,
        otpCode: otp
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // JWT 토큰 저장
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // 사용자 상태 업데이트
      setUser(data.user);
      setIsAuthenticated(true);
      setAuthStep({ step: 'completed', user: data.user, attempts: 0, maxAttempts: 5 });

      // ServicePlan 설정
      setSelectedPlan(data.user.memberType === 'individual' ? 'individual' : 'enterprise');

      // 대시보드로 이동
      router.push('/overview');

      return { success: true, message: 'OTP 인증에 성공했습니다.' };
    } else {
      // 실패 처리
      const newAttempts = authStep.attempts + 1;
      setAuthStep(prev => ({ ...prev, attempts: newAttempts }));

      // 차단 체크
      if (data.isBlocked) {
        localStorage.setItem('blocked_info', JSON.stringify({
          until: data.blockedUntil,
          reason: data.blockReason,
          email: authStep.email || authStep.user.email
        }));
        router.push('/login/blocked');
        return {
          success: false,
          message: '차단 페이지로 이동합니다.',
          isBlocked: true,
          blockedUntil: data.blockedUntil,
          blockReason: data.blockReason
        };
      }

      return { success: false, message: data.message || 'OTP 코드가 올바르지 않습니다.' };
    }
  } catch (error) {
    console.error('OTP 검증 오류:', error);
    return { success: false, message: 'OTP 인증 중 오류가 발생했습니다.' };
  }
};
```

#### 2. login 함수 수정 (이메일 확인만 담당)

**변경 후:**
```typescript
// src/contexts/AuthContext.tsx
const login = async (email: string, memberType: 'individual' | 'corporate') => {
  // 차단 상태 확인 (기존 로직 유지)
  const blockStatus = checkBlockStatus(email);
  if (blockStatus.isBlocked) {
    // ... 차단 처리
  }

  try {
    // 백엔드 이메일 확인 API 호출
    const response = await fetch('http://localhost:4000/api/auth/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, memberType })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // 성공 시 저장된 실패 기록 초기화
      setStoredAttempts(email, 0);

      // OTP가 필요한지 확인
      if (data.requiresOTP) {
        setAuthStep({
          step: 'otp',
          email,
          user: data.user,
          memberType,
          attempts: 0,
          maxAttempts: 5
        });
        return { success: true, message: 'OTP 코드를 입력해주세요.' };
      } else {
        // OTP가 설정되지 않은 경우 (신규 사용자 등)
        // GA 설정 단계나 다른 흐름으로 진행
        return { success: true, message: 'Google Authenticator 설정이 필요합니다.' };
      }
    } else {
      // 실패 처리
      const newAttempts = authStep.attempts + 1;
      setAuthStep(prev => ({ ...prev, attempts: newAttempts }));
      setStoredAttempts(email, getStoredAttempts(email).count + 1);

      return { success: false, message: data.message || '등록되지 않은 이메일입니다.' };
    }
  } catch (error) {
    console.error('이메일 확인 오류:', error);
    return { success: false, message: '이메일 확인 중 오류가 발생했습니다.' };
  }
};
```

#### 3. API 요청 헬퍼 함수 추가

**src/lib/api/auth.ts 추가:**
```typescript
// src/lib/api/auth.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * 이메일 확인 (Google Authenticator 로그인 1단계)
 */
export async function verifyEmail(email: string, memberType: 'individual' | 'corporate') {
  const response = await fetch(`${API_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, memberType }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '이메일 확인에 실패했습니다.');
  }

  return response.json();
}

/**
 * Google Authenticator OTP 검증 및 JWT 토큰 발급 (로그인 2단계)
 */
export async function verifyOTP(
  email: string,
  memberType: 'individual' | 'corporate',
  otpCode: string
) {
  const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, memberType, otpCode }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'OTP 검증에 실패했습니다.');
  }

  return response.json();
}

/**
 * 토큰 갱신
 */
export async function refreshToken(token: string) {
  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '토큰 갱신에 실패했습니다.');
  }

  return response.json();
}
```

#### 4. JWT 토큰 관리

**localStorage에 JWT 토큰 저장:**
```typescript
// 로그인 성공 시
localStorage.setItem('token', data.token);
localStorage.setItem('user', JSON.stringify(data.user));
```

**모든 API 요청에 Authorization 헤더 추가:**
```typescript
// 기존 fetch 래퍼 함수 수정
async function authenticatedFetch(url, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // 401 에러 시 자동 로그아웃
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
  }

  return response;
}
```

**자동 토큰 갱신 (선택사항):**
```typescript
// 앱 초기화 시 토큰 갱신 타이머 시작
function startTokenRefreshTimer() {
  // 23시간마다 토큰 갱신 (토큰 유효기간 24시간)
  setInterval(async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await refreshToken(token);
        localStorage.setItem('token', response.token);
        console.log('토큰이 자동으로 갱신되었습니다.');
      } catch (error) {
        console.error('토큰 갱신 실패:', error);
        // 갱신 실패 시 로그아웃
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
  }, 23 * 60 * 60 * 1000); // 23시간
}

// App 컴포넌트에서 호출
useEffect(() => {
  startTokenRefreshTimer();
}, []);
```

### JWT 토큰 스펙

**토큰 내용 (Payload):**
```json
{
  "id": "user_1",
  "email": "user@example.com",
  "role": "admin",
  "memberType": "individual",
  "iat": 1697328000,
  "exp": 1697414400
}
```

**토큰 유효기간:** 24시간 (`JWT_EXPIRES_IN=24h`)

**토큰 형식:** `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 보안 고려사항

1. **TOTP Secret 보안**: `totpSecret`은 절대 프론트엔드로 전송하지 않음 (백엔드에서만 검증)
2. **JWT 토큰 보안**:
   - HttpOnly 쿠키 사용 고려 (XSS 공격 방지)
   - 현재는 localStorage 사용 (간단한 구현)
3. **만료 처리**: 토큰 만료 시 401 에러 → 자동 로그아웃 및 로그인 페이지 리다이렉트
4. **토큰 갱신**: 자동 갱신 타이머로 사용자 경험 개선
5. **HTTPS 사용**: 프로덕션에서는 반드시 HTTPS 사용

### 마이그레이션 단계

1. ✅ **백엔드 API 구현 완료** (이미 완료)
   - `POST /api/auth/verify-email`
   - `POST /api/auth/verify-otp`
   - `POST /api/auth/refresh`

2. 📝 **프론트엔드 수정 필요**
   - `src/contexts/AuthContext.tsx`: `login` 및 `verifyOtp` 함수 수정
   - `src/lib/api/auth.ts`: API 호출 헬퍼 함수 추가
   - JWT 토큰 저장 및 관리 로직 추가
   - API 요청 인터셉터에 Authorization 헤더 자동 추가

3. 🧪 **테스트 시나리오**
   - 정상 로그인 흐름 (이메일 → OTP → 대시보드)
   - 잘못된 OTP 코드 입력 (5회 실패 시 차단)
   - 토큰 만료 후 자동 로그아웃
   - 토큰 갱신 기능
   - 인증이 필요한 API 호출 (POST/PATCH/DELETE)

4. 🚀 **배포 전 확인사항**
   - `.env` 파일에 `JWT_SECRET` 설정 (프로덕션용 강력한 시크릿)
   - `JWT_EXPIRES_IN` 설정 확인 (기본 24시간)
   - HTTPS 적용 여부 확인
   - CORS 설정 확인

## 문의 및 지원

마이그레이션 과정에서 문제가 발생하면 백엔드 팀에 문의하세요.

---

**작성일**: 2025-10-14
**버전**: 1.0.0
**작성자**: Backend Development Team
