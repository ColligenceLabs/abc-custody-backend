const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ABC Custody Backend API',
      version: '1.0.0',
      description: `
API documentation for ABC Custody Backend

## 기능
- 사용자 관리 (개인/법인 회원)
- 출금 주소 화이트리스트 관리
- 입금 주소 관리
- 입금 내역 추적 및 관리

## 주요 특징
- RESTful API 설계
- PostgreSQL 데이터베이스
- Sequelize ORM
- 페이지네이션 지원
- 필터링 및 정렬 지원
      `,
      contact: {
        name: 'API Support',
        email: 'support@abc-custody.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      parameters: {
        pageParam: {
          in: 'query',
          name: '_page',
          schema: {
            type: 'integer',
            default: 1,
            minimum: 1
          },
          description: '페이지 번호'
        },
        limitParam: {
          in: 'query',
          name: '_limit',
          schema: {
            type: 'integer',
            default: 100,
            minimum: 1,
            maximum: 1000
          },
          description: '페이지당 항목 수'
        },
        sortParam: {
          in: 'query',
          name: '_sort',
          schema: {
            type: 'string',
            default: 'createdAt'
          },
          description: '정렬 기준 필드'
        },
        orderParam: {
          in: 'query',
          name: '_order',
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc'
          },
          description: '정렬 순서'
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: '서버 상태 확인'
      },
      {
        name: 'Users',
        description: '사용자 관리 API'
      },
      {
        name: 'Addresses',
        description: '출금 주소 관리 API'
      },
      {
        name: 'DepositAddresses',
        description: '입금 주소 관리 API'
      },
      {
        name: 'Deposits',
        description: '입금 내역 관리 API'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
