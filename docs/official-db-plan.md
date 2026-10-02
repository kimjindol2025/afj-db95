# AFJ-DB 공식 데이터베이스 계획

## 1. 프로젝트 선언

`afj-db95`는 FreeLang Script의 공식 관계형 데이터베이스다.
목표는 외부 DB에 의존하는 예제 라이브러리가 아니라, FreeLang 프로그램이
직접 연결하고 운영할 수 있는 독립 DBMS를 제공하는 것이다.

구현 언어는 FreeLang Script(`.fls`)를 원칙으로 한다. 다른 언어는 FreeLang
런타임의 운영체제·소켓·파일 API가 제공되지 않는 경우의 최소 어댑터에만
허용하며, 핵심 저장 엔진과 SQL 실행기는 다른 언어로 옮기지 않는다.

## 2. 완성 목표

### 공식 1.0 완료 기준

- SQL 호환성: MariaDB 주요 SQL 문법 회귀 테스트 95% 이상
- 데이터 무결성: 정상 종료·비정상 종료 후 커밋 데이터 손실 0건
- 트랜잭션: ACID 계약 테스트 전체 통과
- 격리: READ COMMITTED, REPEATABLE READ, SERIALIZABLE 제공
- 서버: 인증·사용자·권한·TCP 클라이언트 연결 제공
- 운영: 백업·복구·마이그레이션·상태 점검 제공
- 호환: FreeLang Script 표준 DB API와 CLI 제공
- 재현성: 동일 입력·동일 버전에서 동일 결과와 동일 오류 코드
- 안정성: 회귀 테스트, 장애 주입 테스트, 장시간 테스트 통과

95%는 기능 수가 아니라 아래의 가중 호환성 점수로 판정한다.

```text
SQL 30% + 저장/복구 25% + 트랜잭션 20% + 서버/권한 15% + 운영도구 10%
```

각 영역에서 테스트로 입증되지 않은 기능은 완료 점수에 포함하지 않는다.
현재 점수는 `src/compatibility.fls`의 실행 가능한 feature matrix로 계산한다.
외부 MariaDB client/server 비교는 `docs/mariadb-compatibility.md`의 별도
릴리스 게이트다.

## 3. 아키텍처 경계

```text
FreeLang Script API
        │
SQL Lexer / Parser / Planner
        │
Executor ── Transaction Manager ── Lock/MVCC
        │
Catalog ── Buffer Pool ── Page File / WAL
        │
TCP Protocol / Auth / Admin CLI
```

핵심 불변식:

1. WAL flush가 끝나기 전에는 COMMIT을 성공으로 응답하지 않는다.
2. 복구는 마지막 유효 WAL 레코드까지만 적용한다.
3. 페이지와 WAL에는 버전·체크섬·길이를 기록한다.
4. SQL 실행기는 저장 엔진의 내부 자료구조를 직접 변경하지 않는다.
5. 모든 외부 오류는 안정적인 AFJ-DB 오류 코드로 변환한다.

## 4. 단계별 계획과 종료 게이트

### P0 — 계약과 기준선

현재 M0/M1의 CRUD·논리 WAL을 정리하고 API, 오류 코드, 페이지·WAL 파일
포맷 초안을 고정한다. JSON 개발 페이지 포맷과 SHA-256 검증 기준선을 둔다.

종료 조건: 계약 테스트와 결정론 테스트 통과.

### P1 — 저장 엔진 (기준선 통과, 완료 전)

페이지 파일, 레코드 직렬화, 체크섬, append-only WAL, flush, 재시작 복구를
구현한다. 현재 JSON Lines WAL, 페이지 checksum, close/reopen 복구 기준선과
실제 smoke test를 통과했다.

종료 조건: kill/restart 장애 주입 테스트에서 커밋 데이터 보존.

### P2 — SQL 코어 (진행 중)

CREATE, ALTER, DROP, INSERT, SELECT, UPDATE, DELETE, WHERE, ORDER BY,
GROUP BY, JOIN, 서브쿼리, NULL, 타입 변환을 구현한다.

현재 최소 명령의 AST 파서와 WHERE·JOIN·정렬·집계를 포함한 저장 엔진 실행기 기준선을 구현한다. 종료
조건은 문법·실행·오류 회귀 세트 90% 이상이다.

### P3 — 인덱스와 옵티마이저 (진행 중)

B+Tree, 복합 인덱스, UNIQUE, PRIMARY KEY, 통계 기반 기본 플랜 선택을
구현한다.

현재 hash index와 정렬 B+Tree 기준선을 두고, `indexed-engine.fls`에서
실제 엔진 행의 키 조회와 full scan 결과 동일성을 검증한다. 또한
`persistent-index.fls`에서 B+Tree snapshot을 checksum 페이지로 재오픈한다.
종료 조건은 페이지 기반 B+Tree, 인덱스 사용 여부와 결과 동일성 검증이다.

### P4 — 트랜잭션과 동시성 (진행 중)

BEGIN, COMMIT, ROLLBACK, SAVEPOINT, 잠금, MVCC, 격리 수준을 구현한다.

현재 상태 머신, 실제 엔진 catalog에 연결된 COMMIT/ROLLBACK/SAVEPOINT,
MVCC 가시성, commit-marker WAL, 잠금·격리 정책 기준선을 둔다. 종료 조건은
ACID·lost update·dirty read·phantom 회귀 테스트 통과다.

### P5 — 서버와 보안 (진행 중)

TCP 프로토콜, 연결 수명, 인증, 사용자·역할·권한, prepared statement를
구현한다.

현재 사용자·역할·권한·비밀번호 해시와 HTTP adapter·transport-independent 요청 처리,
줄 단위 JSON TCP server를 둔다. `tcp-server.fls`는 독립 프로세스 client로
로그인·token·SQL·권한 거부·listener 종료를 검증한다. 종료 조건은 외부
클라이언트 smoke test와 권한 우회 테스트 통과다. TLS, wire-level MariaDB
client protocol, 다중 세션의 저장 엔진 공유는 아직 후속 게이트다.

### P6 — 운영 기능 (진행 중)

백업, 복구, export/import, migration, health check, metrics, 로그 회전을
구현한다.

현재 파일 백업·복원·manifest·health·metrics·migration 기준선을 둔다. 종료 조건은 빈 DB·대형 DB·
손상 WAL 복구 시나리오 통과다.

### P7 — 공식 릴리스 (미완료)

문서, 예제, 호환성 점수, 성능 기준, 보안 점검, 모바일 환경 제한을
공개하고 `1.0.0`을 태그할 준비를 한다.

종료 조건: 모든 릴리스 게이트 PASS. 현재 내부 compatibility matrix는
100%지만, 실제 MariaDB 호환성 corpus·통합 ACID 장애 테스트가 남아 있어
아직 1.0을 선언하지 않는다.

## 5. 당장 만들 순서

1. `docs/`의 계약을 테스트 파일로 변환
2. 페이지 크기·헤더·레코드·WAL 포맷 결정
3. FreeLang Script 파일 API capability 확인
4. 파일 append/read와 checksum 구현
5. commit/recovery 테스트 작성
6. 기존 메모리 CRUD를 저장 엔진 뒤로 이동
7. 실제 재시작 테스트로 M1 종료 판정

## 6. 금지 사항

- SQLite/MariaDB를 내부 구현으로 감싸고 공식 DB라고 부르지 않는다.
- 테스트하지 않은 기능을 호환 기능으로 표시하지 않는다.
- 영속성·트랜잭션 없이 1.0을 선언하지 않는다.
- 핵심 DB 코드를 JavaScript, Python, C 등으로 대체하지 않는다.
- 성능 수치를 실행 증거 없이 문서에 기재하지 않는다.

## 7. 릴리스 버전 정책

- `0.x`: 저장 포맷과 API가 변경될 수 있는 개발 버전
- `1.0.0`: 위 공식 완료 기준을 모두 통과한 첫 공식 버전
- `1.x`: 호환성을 깨지 않는 기능 추가
- 저장 포맷 변경은 migration 도구 없이는 허용하지 않음
