# Database Migration 작성 가이드

## 중요 유의사항

### 1. 컬럼명은 camelCase 사용

Sequelize 모델은 `underscored: false` (기본값)로 설정되어 있어 **camelCase**로 컬럼이 생성됩니다.

❌ **잘못된 예 (snake_case)**:
```javascript
await queryInterface.createTable('vault_transfers', {
  deposit_id: { type: Sequelize.STRING },  // 에러 발생!
  from_address: { type: Sequelize.STRING } // 에러 발생!
});
```

✅ **올바른 예 (camelCase)**:
```javascript
await queryInterface.createTable('vault_transfers', {
  depositId: { type: Sequelize.STRING },
  fromAddress: { type: Sequelize.STRING }
});
```

### 2. Idempotent Migration (중복 실행 방지)

Migration은 여러 번 실행될 수 있으므로 **멱등성(idempotency)**을 보장해야 합니다.

#### 테이블 생성 시
```javascript
async up(queryInterface, Sequelize) {
  // 테이블 존재 여부 확인
  const tableExists = await queryInterface.showAllTables()
    .then(tables => tables.includes('table_name'));

  if (tableExists) {
    console.log('table_name 테이블이 이미 존재합니다. 스킵합니다.');
    return;
  }

  await queryInterface.createTable('table_name', {
    // 컬럼 정의...
  });
}
```

#### 컬럼 추가 시
```javascript
async up(queryInterface, Sequelize) {
  const tableDescription = await queryInterface.describeTable('table_name');

  if (!tableDescription.newColumn) {
    await queryInterface.addColumn('table_name', 'newColumn', {
      type: Sequelize.STRING,
      allowNull: true
    });
    console.log('newColumn 컬럼이 추가되었습니다.');
  } else {
    console.log('newColumn 컬럼이 이미 존재합니다. 스킵합니다.');
  }
}
```

### 3. 인덱스 생성 시 중복 방지

```javascript
// 인덱스는 camelCase 컬럼명 사용
await queryInterface.addIndex('table_name', ['columnName']);

// Unique 인덱스는 옵션으로 명시
await queryInterface.addIndex('table_name', ['txHash'], { unique: true });
```

### 4. Foreign Key는 모델에서 자동 생성

Migration에서는 Foreign Key를 명시하지 않아도 Sequelize가 `sync({ alter: true })`로 자동 생성합니다.

```javascript
// 모델에서 정의 (src/models/VaultTransfer.js)
depositId: {
  type: DataTypes.STRING,
  references: {
    model: 'deposits',
    key: 'id'
  },
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE'
}
```

### 5. Down Migration도 작성

```javascript
async down(queryInterface, Sequelize) {
  const tableExists = await queryInterface.showAllTables()
    .then(tables => tables.includes('table_name'));

  if (tableExists) {
    await queryInterface.dropTable('table_name');
  }
}
```

## Migration 실행 방법

### 생성
```bash
npx sequelize-cli migration:generate --name create-table-name
```

### 실행
```bash
npx sequelize-cli db:migrate
```

### 롤백
```bash
npx sequelize-cli db:migrate:undo        # 마지막 1개 롤백
npx sequelize-cli db:migrate:undo:all    # 전체 롤백
```

### 상태 확인
```bash
npx sequelize-cli db:migrate:status
```

## 일반적인 에러 해결

### "column does not exist" 에러
- 원인: snake_case를 사용했거나 컬럼명 오타
- 해결: camelCase 확인 및 모델 정의와 일치 여부 확인

### "relation already exists" 에러
- 원인: 테이블/인덱스가 이미 존재
- 해결: 존재 여부 확인 로직 추가

### "violates foreign key constraint" 에러
- 원인: 참조 테이블/데이터 미존재
- 해결: 참조 테이블 먼저 생성, 데이터 정합성 확인

## 프로젝트 컨벤션

1. **파일명**: `YYYYMMDDHHMMSS-description.js`
2. **컬럼명**: camelCase (예: `depositId`, `fromAddress`)
3. **테이블명**: snake_case (예: `vault_transfers`)
4. **타임스탬프**: `createdAt`, `updatedAt` (camelCase)
5. **ENUM 타입**: 모델에서 정의, Migration에서는 직접 작성
6. **멱등성**: 모든 Migration은 여러 번 실행 가능하도록 작성

## 체크리스트

- [ ] camelCase 컬럼명 사용 확인
- [ ] 테이블/컬럼 존재 여부 확인 로직 추가
- [ ] 인덱스 이름 중복 방지
- [ ] down() 메서드 작성
- [ ] Migration 실행 후 에러 없는지 확인
- [ ] 여러 번 실행해도 에러 없는지 확인

## 참고 자료

- [Sequelize Migrations 공식 문서](https://sequelize.org/docs/v6/other-topics/migrations/)
- 프로젝트 모델 정의: `src/models/`
- 기존 Migration 예시: `src/migrations/20251015000000-create-vault-transfers-table.js`
