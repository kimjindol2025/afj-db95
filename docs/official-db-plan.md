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
구현한다. 현재 JSON Lines WAL, 페이지 checksum, 다중 checksum page set,
close/reopen 복구 기준선과 실제 smoke test를 통과했다. page-set 읽기 경로에는
raw-line fingerprint를 포함한 bounded LRU page cache와 eviction을 연결했다.
buffer-pool pin/flush 정책과 TCP engine의 전체 catalog page migration은 후속
게이트다.

종료 조건: kill/restart 장애 주입 테스트에서 커밋 데이터 보존.

### P2 — SQL 코어 (진행 중)

CREATE, ALTER, DROP, INSERT, SELECT, UPDATE, DELETE, WHERE, ORDER BY,
GROUP BY, JOIN, 서브쿼리, NULL, 타입 변환을 구현한다.

현재 최소 명령의 AST 파서와 WHERE·JOIN·정렬·집계를 포함한 저장 엔진 실행기 기준선을 구현한다. 종료
조건은 문법·실행·오류 회귀 세트 90% 이상이다.

### P3 — 인덱스와 옵티마이저 (진행 중)

B+Tree, 복합 인덱스, UNIQUE, PRIMARY KEY, 통계 기반 기본 플랜 선택을
구현한다.

현재 hash index와 recursive split을 지원하는 정렬 B+Tree 기준선을 두고, `indexed-engine.fls`에서
실제 엔진 행의 키 조회와 full scan 결과 동일성을 검증한다. 또한
`persistent-index.fls`와 `tests/persistent-btree.fls`에서 B+Tree snapshot을
checksum 페이지로 재오픈한다. 종료 조건은 TCP executor catalog까지 페이지
기반 B+Tree를 연결하고, 인덱스 사용 여부와 결과 동일성을 검증하는 것이다.

### P4 — 트랜잭션과 동시성 (진행 중)

BEGIN, COMMIT, ROLLBACK, SAVEPOINT, 잠금, MVCC, 격리 수준을 구현한다.

현재 상태 머신, 실제 엔진 catalog에 연결된 COMMIT/ROLLBACK/SAVEPOINT,
MVCC 가시성, commit-marker WAL, 잠금·격리 정책 기준선을 둔다. 종료 조건은
ACID·lost update·dirty read·phantom 회귀 테스트 통과다. TCP transaction은
working catalog/index를 전역 상태와 분리해 dirty read를 차단하는 기준선을
추가했고, `START TRANSACTION ISOLATION LEVEL`의 READ COMMITTED,
REPEATABLE READ, SERIALIZABLE 선택과 회귀도 추가했다. 완전한 MVCC·phantom·
write skew 검증은 후속 게이트다.

### P5 — 서버와 보안 (진행 중)

TCP 프로토콜, 연결 수명, 인증, 사용자·역할·권한, prepared statement를
구현한다.

현재 사용자·역할·권한·비밀번호 해시와 HTTP adapter·transport-independent 요청 처리,
줄 단위 JSON TCP server를 둔다. `tcp-server.fls`는 독립 프로세스 client로
로그인·token·SQL·권한 거부·listener 종료를 검증한다. 종료 조건은 외부
클라이언트 smoke test와 권한 우회 테스트 통과다. TLS, wire-level MariaDB
client protocol은 아직 후속 게이트다. JSON TCP adapter에는 세션 소유권을
검증하는 `prepare`/`execute`와 parameter binding 기준선을 추가했으며,
다중 세션의 저장 엔진 공유, slow-client timeout의 실제 socket event-loop
검증과 표준 MariaDB client smoke는 후속 게이트다.

### P6 — 운영 기능 (진행 중)

백업, 복구, export/import, migration, health check, metrics, 로그 회전을
구현한다.

현재 파일 백업·복원·manifest·health·metrics·migration 기준선을 둔다. 종료 조건은 빈 DB·대형 DB·
손상 WAL 복구 시나리오 통과다.

### P7 — 공식 릴리스 (미완료)

문서, 예제, 호환성 점수, 성능 기준, 보안 점검, 모바일 환경 제한을
공개하고 `1.0.0`을 태그할 준비를 한다.

종료 조건: 모든 릴리스 게이트 PASS. 현재 실행 가능한 compatibility
scorecard는 88%이며, 완전한 MVCC·write skew·페이지 기반 B+Tree와 wire-level 호환 등 미완료
항목은 점수에서 제외되어 있다. 실제 MariaDB 호환성 corpus·통합 ACID 장애
테스트도 남아 있어 아직
1.0을 선언하지 않는다.

## 운영 적합성 보완 플랜

다음 영역은 현재 구현으로 운영 적합성을 주장할 수 없다. 각 항목은 해당
기능 구현과 독립적인 회귀·장애·보안 검증을 모두 통과해야 운영 후보로
승격한다.

| 현재 부적합 영역 | 보완 계획 | 완료 게이트 |
|---|---|---|
| 일반 MariaDB 대체 운영 DB | MariaDB 주요 SQL·오류 코드·자료형·프로토콜 호환 범위를 고정하고 differential corpus를 확대 | 가중 호환성 점수 95% 이상, 실제 MariaDB 비교 결과 보존 |
| 대규모 데이터·고동시성 서비스 | 페이지 기반 저장소, buffer pool, 인덱스 플랜, connection/session 분리, 장시간 soak를 구현 | 대형 corpus·동시 접속·장시간 soak에서 데이터 손실과 교착 없음 |
| 외부 인터넷 직접 노출 | 기본 bind를 안전한 로컬 주소로 고정하고 peer-IP rate limit, 요청 크기 제한, timeout, audit log, 운영 설정 검사를 추가 | 외부 노출 보안 점검과 비인가 요청 차단 회귀 통과 |
| TLS가 필요한 환경 | FreeLang runtime TLS capability 또는 최소 외부 어댑터를 정의하고 인증서 교체·검증 실패 처리를 추가 | 평문 listener 차단, TLS handshake·만료·잘못된 인증서 테스트 통과 |
| 기존 MariaDB 클라이언트 연결 | wire-level MariaDB protocol 또는 공식 client adapter를 구현하고 prepared statement·error mapping을 검증 | 표준 MariaDB client smoke와 prepared statement 회귀 통과 |
| 복잡한 SQL·대규모 JOIN·서브쿼리 | 정식 lexer/parser/AST, planner, JOIN 알고리즘, 서브쿼리·NULL·자료형 변환을 단계적으로 구현 | MariaDB corpus 문법·실행·오류 회귀 95% 이상 |
| 금융·결제 수준의 MVCC·격리 | transaction manager, snapshot, lock manager, deadlock detection, READ COMMITTED·REPEATABLE READ·SERIALIZABLE을 완성 | dirty read·lost update·phantom·write skew·강제 종료 회귀 전부 통과 |

### 운영 승격 전 공통 체크리스트

1. 기본 설정에서 `/tmp` WAL과 개발용 기본 비밀번호를 제거한다.
2. 인증·권한·TLS·감사 로그·백업·복구 절차를 운영 문서와 실행 테스트로 고정한다.
3. 단일 프로세스 smoke가 아닌 다중 세션·재시작·강제 종료·손상 WAL 테스트를 수행한다.
4. 성능 수치는 데이터 크기, 동시성, 하드웨어, 런타임 버전과 함께 재현 가능하게 기록한다.
5. 위 조건 중 하나라도 미충족이면 버전을 `0.x` 개발 릴리스로 유지한다.

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

## 7. 공식 1.0 완료 추적표

아래 추적표는 공식 DB 완성에 필요한 작업을 실행 가능한 태스크와 연결한
단일 기준이다. `[완료]`는 구현 완료가 아니라 해당 범위가 문서화되고 태스크로
등록되었다는 뜻이며, 각 AFJ 태스크의 구현 완료 표시는 별도의 재현 가능한
검증 증거가 있을 때만 변경한다.

| 완성 단계 | 범위 | 태스크 | 현재 상태 |
|---|---|---|---|
| 1. 언어·경계 고정 | 핵심 DB와 테스트를 FreeLang Script(`.fls`)로 유지하고 외부 언어를 런타임·어댑터·검증으로 제한 | AFJ-000, AFJ-016 | 문서화 완료, 구현 게이트 진행 중 |
| 2. 저장소 완성 | 페이지 파일, WAL, checksum, buffer pool, pin/flush, 재시작·강제 종료 복구 | AFJ-002, AFJ-012 | 진행 중 |
| 3. SQL 기능 | 정식 lexer/parser/AST, CRUD, JOIN, NULL, 타입, GROUP/HAVING, 서브쿼리 | AFJ-008, AFJ-009 | 진행 중 |
| 4. 트랜잭션·동시성 | ACID, row-version MVCC, 격리, phantom, write skew, deadlock, timeout, crash recovery | AFJ-014, AFJ-015 | 진행 중 |
| 5. 서버·보안 | 세션 공유, 인증·권한·감사, rate limit, TLS, MariaDB wire protocol, prepared statement | AFJ-004~AFJ-007, AFJ-010 | 진행 중 |
| 6. 백업·복구 | 온라인·오프라인 backup, manifest, checksum, corruption detection, restore consistency | AFJ-003 | 진행 중 |
| 7. 운영성 | health, metrics, migration, 로그, 대형 데이터·동시성·장시간 soak | AFJ-006, AFJ-012, AFJ-016 | 진행 중 |
| 8. 릴리스 gate | clean checkout, 전체 회귀, 보안·호환성·성능·복구 증거, 모바일 제한 | AFJ-016 | BLOCKED |
| 9. 문서·추적성 | 계획, 태스크, 실행 명령, 결과 로그, 제한사항, release report 연결 | AFJ-017 | 문서화 완료 |

### 현재 릴리스 차단 항목

다음 항목이 모두 해결되고 각각의 증거가 `docs/release-gate-report.md`에
기록되기 전에는 `1.0.0`을 선언하지 않는다.

1. TCP 회귀의 다중 행 INSERT 응답 단절과 ROLLBACK 오류를 수정한다.
2. 완전한 row-version MVCC, index-range granular validation, phantom·write skew를
   검증한다. 범위 predicate parser/executor와 stale predicate conflict의 TCP
   회귀는 `tests/tcp-range-predicate.fls`로 통과했지만, 이를 완전한 index-range
   검증 완료로 간주하지 않는다.
3. TCP catalog를 table별 페이지 파일과 buffer-pool pin/flush 정책으로 이전한다.
   version-2 table-page manifest, page-backed B+Tree leaf index persistence/reopen,
   table page checksum/recovery, WAL tail 복구, bounded pool과 lazy table
   placeholder/LRU eviction, lazy transaction snapshot 회귀는 통과했다.
   recursive split은 별도 persistent B+Tree 회귀로 검증했고, durable
   row-version checkpoint history도 catalog page recovery 회귀로 검증했다.
   page-level row execution과 다중 인덱스·복합 predicate는 남아 있다.
4. native TLS 외부 bind, hostname/CA/mTLS 운영 정책, 인증서 교체와 실패 주입은
   통과했다.
5. MariaDB wire-level protocol의 capability negotiation과 production hardening을
   검증한다. native FreeLang handshake에서 32-bit capability intersection,
   max-packet-size, charset 교섭을 기록하고, COM_QUERY, COM_STMT의
   INT·NULL·string·multi-parameter prepared 범위와 표준 client smoke를 통과했다.
   username/auth-response 길이 검증과 잘못된 사용자 `ACCESS_DENIED` packet 회귀도
   통과했다. FreeLang Script SHA-1 `mysql_native_password` challenge 검증과
   잘못된 토큰의 1045 거부도 native packet 회귀로 통과했다. caching_sha2_password
   등 다른 auth plugin, TLS 및 운영 hardening은 별도 게이트로 남긴다.
6. 대형 corpus·고동시성·5분 성능 envelope 증거는 통과해야 한다. 현재 300초
   실행에서 `writes=248`, `throughput=0.83/s`, `p95=11084ms`, `max=13138ms`를
   기록했고 p95 15000ms/max 20000ms 기준을 통과했다. 이는 bounded 운영
   envelope이며 무제한 production duration을 보장하지 않는다. WAL과 TCP transaction
   강제 종료 복구는 각각 `fault-injection-restart.sh`와
   `tcp-transaction-kill-recovery.js`로 통과했지만 장시간 soak는 아직 남아 있다.

이 추적표와 차단 목록의 태스크 원본은 `docs/IMPROVEMENT-TASKS.md`의
AFJ-000~AFJ-017이다.

## 8. 릴리스 버전 정책

- `0.x`: 저장 포맷과 API가 변경될 수 있는 개발 버전
- `1.0.0`: 위 공식 완료 기준을 모두 통과한 첫 공식 버전
- `1.x`: 호환성을 깨지 않는 기능 추가
- 저장 포맷 변경은 migration 도구 없이는 허용하지 않음
