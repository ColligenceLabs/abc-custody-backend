# ABC Custody Backend API

Node.js + Express + Sequelize + PostgreSQL 기반의 ABC Custody 백엔드 API 서버입니다.

## 🚀 기능

- **사용자 관리**: 개인/법인 회원 관리, 권한 관리, KYC 처리
- **출금 주소 관리**: 화이트리스트 주소 관리 (personal/vasp 타입)
- **입금 주소 관리**: 입금용 주소 생성 및 관리
- **입금 내역 관리**: 입금 트랜잭션 추적 및 상태 관리

## 📋 요구사항

- Node.js >= 16.x
- Docker & Docker Compose
- PostgreSQL 15 (Docker로 자동 설치)

## 🛠️ 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.example`을 `.env`로 복사하고 필요한 값을 설정합니다.
```bash
cp .env.example .env
```

### 3. PostgreSQL 시작 (Docker)
```bash
docker-compose up -d
```

PostgreSQL이 포트 5455에서 실행됩니다.

### 4. 데이터베이스 마이그레이션
```bash
npm run db:migrate
```

### 5. 초기 데이터 시딩 (선택사항)
```bash
npm run db:seed
```

이 명령은 `../abc-custody/json-server/db.json` 파일의 데이터를 PostgreSQL로 임포트합니다.

### 6. 서버 실행
```bash
# 개발 모드 (nodemon)
npm run dev

# 프로덕션 모드
npm start
```

## 📚 API 문서

서버 실행 후 다음 URL에서 Swagger 문서를 확인할 수 있습니다:

- **API 문서**: http://localhost:3000/api-docs
- **서버 루트**: http://localhost:3000
- **헬스 체크**: http://localhost:3000/api/health

## 🗂️ 프로젝트 구조

```
abc-custody-backend/
├── src/
│   ├── config/
│   │   ├── database.js       # Sequelize 데이터베이스 설정
│   │   └── swagger.js        # Swagger 문서 설정
│   ├── models/
│   │   ├── index.js          # Sequelize 모델 로더
│   │   ├── User.js           # 사용자 모델
│   │   ├── Address.js        # 출금 주소 모델
│   │   ├── DepositAddress.js # 입금 주소 모델
│   │   └── Deposit.js        # 입금 내역 모델
│   ├── controllers/
│   │   ├── userController.js
│   │   ├── addressController.js
│   │   ├── depositAddressController.js
│   │   └── depositController.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── users.js
│   │   ├── addresses.js
│   │   ├── depositAddresses.js
│   │   └── deposits.js
│   ├── migrations/           # 데이터베이스 마이그레이션
│   ├── seeders/              # 시드 데이터
│   └── server.js             # Express 서버 진입점
├── .env                      # 환경 변수
├── .sequelizerc             # Sequelize CLI 설정
├── docker-compose.yml       # PostgreSQL Docker 설정
└── package.json
```

## 🔌 API 엔드포인트

### Users API
- `GET /api/users` - 사용자 목록 조회
- `GET /api/users/:id` - 사용자 상세 조회
- `POST /api/users` - 사용자 생성
- `PATCH /api/users/:id` - 사용자 수정
- `DELETE /api/users/:id` - 사용자 삭제

### Addresses API (출금 주소)
- `GET /api/addresses` - 주소 목록 조회
- `GET /api/addresses/:id` - 주소 상세 조회
- `POST /api/addresses` - 주소 추가
- `PATCH /api/addresses/:id` - 주소 수정
- `DELETE /api/addresses/:id` - 주소 삭제

### Deposit Addresses API (입금 주소)
- `GET /api/depositAddresses` - 입금 주소 목록 조회
- `GET /api/depositAddresses/:id` - 입금 주소 상세 조회
- `POST /api/depositAddresses` - 입금 주소 생성
- `PATCH /api/depositAddresses/:id` - 입금 주소 수정
- `DELETE /api/depositAddresses/:id` - 입금 주소 삭제 (soft delete)

### Deposits API (입금 내역)
- `GET /api/deposits` - 입금 내역 조회
- `GET /api/deposits/:id` - 입금 상세 조회
- `POST /api/deposits` - 입금 기록 생성
- `PATCH /api/deposits/:id` - 입금 상태 업데이트
- `DELETE /api/deposits/:id` - 입금 기록 삭제

## 🔍 쿼리 파라미터

모든 GET 엔드포인트는 다음 쿼리 파라미터를 지원합니다:

- `_page`: 페이지 번호 (기본값: 1)
- `_limit`: 페이지당 항목 수 (기본값: 100)
- `_sort`: 정렬 기준 필드 (기본값: createdAt)
- `_order`: 정렬 순서 (asc/desc, 기본값: desc)

예시:
```
GET /api/users?email=test@example.com&memberType=individual&_page=1&_limit=10
GET /api/addresses?userId=1&type=personal&coin=BTC
GET /api/deposits?userId=1&status=confirmed&status=credited
```

## 🗄️ 데이터베이스 스키마

### Users 테이블
- 개인/법인 회원 정보
- 권한 및 역할 관리
- KYC 정보 및 지갑 한도

### Addresses 테이블
- 출금 화이트리스트 주소
- personal/vasp 타입 구분
- 일일 한도 및 사용량 추적

### Deposit Addresses 테이블
- 입금용 주소 관리
- 네트워크별 주소 구분

### Deposits 테이블
- 입금 트랜잭션 내역
- 컨펌 수 추적 및 상태 관리

## 🐳 Docker 명령어

```bash
# PostgreSQL 시작
docker-compose up -d

# PostgreSQL 중지
docker-compose down

# PostgreSQL 로그 확인
docker-compose logs -f postgres

# PostgreSQL 데이터 볼륨 삭제 (주의!)
docker-compose down -v
```

## 📝 Sequelize CLI 명령어

```bash
# 마이그레이션 실행
npm run db:migrate

# 마이그레이션 되돌리기
npm run db:migrate:undo

# 시드 실행
npm run db:seed

# 시드 되돌리기
npm run db:seed:undo
```

## 🔧 개발 도구

- **Express**: 웹 프레임워크
- **Sequelize**: ORM
- **PostgreSQL**: 데이터베이스
- **Swagger**: API 문서화
- **Docker**: 컨테이너화
- **Nodemon**: 개발 서버 자동 재시작

## 📄 라이선스

ISC
