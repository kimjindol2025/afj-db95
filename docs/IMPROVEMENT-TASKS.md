# afj-db95 운영 적합성 개선 태스크

이 문서는 현재 운영에 부적합한 영역을 구현·검증 가능한 작업으로 분해한
실행 목록이다. 각 태스크는 코드 구현만으로 완료하지 않고, 재현 가능한
회귀·장애·보안 검증까지 통과해야 완료로 표시한다.

## 우선순위

- `P0`: 데이터 손실·비인가 접근을 막기 위한 선행 작업
- `P1`: 실제 단일 호스트 서비스로 사용할 수 있게 하는 작업
- `P2`: MariaDB 호환성과 성능을 넓히는 작업
- `P3`: 금융·결제 수준 또는 1.0 릴리스 진입 작업

## 태스크 목록

### P0 — 공식 범위와 문서 추적

- [x] `AFJ-000` FreeLang Script 공식 DB 경계 선언
  - 핵심 DB 구현·저장 엔진·SQL 실행기·검증 시나리오의 기준 언어를
    FreeLang Script(`.fls`)로 고정한다.
  - Node.js·Bash·SSH·외부 DB client는 런타임 실행, 최소 transport adapter,
    원격 점검과 검증 orchestration에만 사용한다.
  - 검증: `docs/official-db-plan.md`의 언어 경계와 README 실행 절차가 일치하는지
    확인하고, 다른 언어의 핵심 구현 대체를 금지한다.
  - 완료 증거: 공식 계획, README, 프로젝트 지침에 경계와 예외를 기록했다.

### P0 — 안전한 기본값과 데이터 무결성

- [x] `AFJ-001` 운영 기본값 정리
  - `/tmp` WAL과 개발용 root 비밀번호를 운영 실행에서 거부한다.
  - bind 기본값을 `127.0.0.1`로 변경하고 외부 노출은 명시적 설정으로만 허용한다.
  - 운영 설정 누락·위험 조합을 안정적인 오류 코드로 반환한다.
  - 검증: 안전 기본값, 위험 설정 거부, 설정 회귀 테스트.
  - 완료 증거: `AFJ_DB_MODE=production`에서 WAL·root 비밀번호 누락,
    `development-only` 비밀번호, `/tmp` WAL 경로를 거부하고, 명시적 production
    설정 로드와 기존 M0/TCP 회귀가 통과했다.

- [ ] `AFJ-002` WAL·페이지 포맷 고정
  - 버전·길이·checksum·commit 경계를 검증한다.
  - 중간 손상, torn write, 잘린 마지막 레코드의 처리 정책을 고정한다.
  - WAL 레코드 최대 크기를 쓰기·재생 양쪽에서 제한한다.
  - 검증: 강제 종료·손상 주입·재시작 데이터 보존 테스트.
  - 진행 증거: TCP WAL에 1 MiB 레코드 상한과 복구 시 동일 상한 검사를 추가했다.
  - 추가 증거: TCP WAL prepare/commit에 version·length·checksum envelope와
    `tests/wal-format.fls` 회귀를 추가했다.
  - 추가 증거: 공통 `src/afj-db95.fls` WAL도 동일한 version·length·checksum
    envelope를 사용하고, 중간 손상은 `WAL_CORRUPT`로 거부하며 newline 없는
    마지막 torn fragment는 폐기한다. `afj-db95.fls`의 durable·corrupt·torn
    WAL smoke가 통과했다.
  - 추가 증거: TCP 복구도 파일의 최종 newline 유무를 확인해 newline으로 끝난
    손상 레코드는 `WAL_CORRUPT`로 거부하고, 정상 prepare+commit은 재시작 후
    catalog로 재생한다. `tests/wal-format.fls`에서 restart recovery, torn tail,
    corruption rejection, uncommitted prepare discard를 모두 통과했다.
  - 추가 증거: 공통 `src/afj-db95.fls`의 page envelope 전체 크기를 4096-byte
    page limit으로 검사하고, WAL 재생도 version·length·checksum과 고정 1 MiB
    `afj-wal-record-limit` 기준을 함께 적용한다. 새 oversized WAL smoke와
    공통 page/durable/corrupt/torn smoke가 통과했고 `tests/wal-format.fls`의
    TCP WAL 계약도 통과했다.
  - 추가 증거: `tests/fault-injection-restart.sh`가 FreeLang WAL writer를 실제
    프로세스로 실행한 뒤 committed transaction과 prepare-only transaction을
    기록한 시점에 `SIGKILL`하고, 새 프로세스의 recovery가 committed row만
    복원하는 것을 확인했다. 결과는 `afj-db95 forced-kill process recovery PASS`다.
  - 남은 게이트: 실제 프로세스 강제 종료 중간 쓰기, torn write 주입, 대형
    page-set·WAL 장시간 soak와 TCP catalog 전체 page migration은 아직 남았다.

- [ ] `AFJ-003` 백업·복구 무결성
  - 온라인/오프라인 백업, manifest, checksum, 복구 대상 검증을 제공한다.
  - 복구 후 catalog·WAL·인덱스 일치성을 검사한다.
  - 검증: 빈 DB·대형 DB·손상 백업·부분 복구 회귀.
  - 진행 증거: 파일 백업 bundle의 manifest 생성과 복구 전·후 checksum 검증을 추가했다.
  - 추가 증거: catalog·WAL·인덱스 같은 여러 파일을 하나의 versioned manifest로
    백업·복구하는 `backup-set`과 파일별 checksum 검증을 추가했다. 손상된 구성요소는
    복구 전에 `BACKUP_SET_CHECKSUM_MISMATCH`로 거부한다.
  - 추가 증거: backup-set manifest를 version 2로 고정하고 source/backup의 크기·checksum을
    함께 기록한다. 복사 중 source 변경과 backup 크기 변조를 복구 전에 거부하며,
    manifest integrity field 회귀가 통과했다.
  - 추가 증거: `backup-live-state-set`이 동일 snapshot의 catalog·index와 WAL을
    하나의 `afj-db95-live-state` manifest로 묶고, 3개 구성요소의 verified restore를
    수행한다. `src/backup.fls`의 live backup state smoke가 통과했다.
  - 검증 기록: `node /root/freelang-surface-v0-clean-ek3qo2/v11/bootstrap.js run
    src/backup.fls`에서 기본 backup, manifest corruption, backup-set,
    backup-set corruption, live-state restore, empty backup, partial backup이
    모두 PASS했다. manifest 자체의 integrity 변조 거부도 PASS했다. 2MiB 대형
    backup의 restore와 source/destination checksum 비교도 PASS했다.
  - 추가 증거: live-state restore 뒤 catalog의 실제 행과 index bucket의 row-id·키
    일치를 `backup-validate-state-consistency`로 검사한다. 복구 index를 존재하지
    않는 row-id로 변조한 회귀가 `BACKUP_STATE_INCONSISTENT`로 거부되고
    `afj-db95 live backup consistency PASS`가 출력됐다.
  - 추가 soak 증거: `tests/backup-soak.fls`가 동일 checksum manifest로
    12회 연속 source→backup→restore를 수행하고 매 회 payload 일치를
    검증하는 `afj-db95 backup restore soak PASS rounds=12`를 기록했다.
    무제한 장시간 soak와 live source mutation 중 snapshot 일관성은 여전히
    운영 환경 범위로 남긴다.

### P1 — 단일 호스트 운영 서비스

- [ ] `AFJ-004` 세션·저장 엔진 공유 모델 정리
  - 다중 TCP 세션이 동일 catalog와 WAL을 안전하게 공유하도록 분리한다.
  - 세션 종료 시 lock·transaction·prepared statement를 정리한다.
  - 검증: 다중 클라이언트 동시 CRUD·재접속·세션 누수 테스트.
  - 진행 증거: prepared statement에 소유 session token을 연결하고 타 세션 실행을 거부한다.
  - 추가 증거: 하나의 TCP connection에서 중복 login을 `SESSION_ALREADY_AUTHENTICATED`로
    거부해 token 누수를 막고, connection/session cleanup 회귀에서 재사용 guard를 확인한다.
  - 추가 증거: TCP transaction과 savepoint snapshot이 catalog와 engine index를 함께
    보존·복원하며, rollback 후 stale primary-key index가 남지 않는 회귀가 통과했다.

- [ ] `AFJ-005` 인증·권한·감사 강화
  - 사용자·역할·권한 변경을 영속화하고 password rotation을 지원한다.
  - 모든 쓰기·권한 거부·관리 명령을 audit log로 남긴다.
  - 검증: 권한 우회·토큰 재사용·비밀번호 교체·감사 로그 회귀.
  - 진행 증거: production audit log 경로 필수화와 인증·TCP login·grant·user 이벤트
    기록을 추가했다.
  - 추가 증거: `AFJ_DB_AUTH_STATE` JSON Lines에 역할·권한·비밀번호 해시 변경을
    기록하고 시작 시 재생한다. production에서는 상태 경로 누락과 `/tmp` 경로를
    거부한다. `tests/auth-state-recovery.fls`에서 재생 후 권한·인증 복원과 평문
    비밀번호 비저장을 검증했다. 상태 이벤트에도 version·length·checksum envelope를
    적용하고 마지막 torn fragment를 폐기하는 복구 회귀를 추가했다.
  - 추가 증거: `rotate-password`가 기존 비밀번호를 해시로 교체하고 상태 이벤트와
    audit 이벤트를 남기며, 짧은 비밀번호를 거부한다.
  - 검증 기록: `AFJ_DB_AUTH_STATE=/tmp/afj-db95-auth-state-test.jsonl`를 지정한
    auth-state recovery가 replay, password policy, plaintext protection을 모두
    PASS했다.

- [ ] `AFJ-006` 외부 노출 방어
  - 요청 크기·SQL 길이·동시 연결·timeout·rate limit을 제한한다.
  - health endpoint와 관리 endpoint를 분리한다.
  - TCP 요청 1 MiB, SQL 문장 256 KiB 상한을 적용한다.
  - 동시 세션 수를 1~4096 범위의 설정으로 제한한다.
  - 사용자별 반복 인증 실패를 `AUTH_LOCKED`로 차단한다.
  - 검증: flood·oversized request·slow client·비인가 관리 요청 테스트.
  - 추가 증거: `tests/auth-lockout.fls`에서 기본 5회 실패 후 잠금 회귀 통과.
  - 시간 기반 잠금 해제는 callback timer가 아니라 `lockout-until` timestamp를
    인증 시점에 판정하도록 구현했고, `AFJ_DB_AUTH_LOCKOUT_MS=1000`과
    `sleep_ms`를 사용하는 `tests/auth-lockout-reset.fls` 회귀가 실제 해제를 확인한다.
  - 추가 증거: `tests/request-limits.fls`에서 요청 1 MiB·SQL 256 KiB 경계 통과.
  - production 외부 bind는 TLS 구현 전까지 항상 거부한다.
  - 세션 TTL 만료 시 transaction·lock·prepared statement를 정리한다.
  - 추가 증거: `tests/session-cleanup.fls`에서 만료 정리 경로 통과.
  - 추가 증거: session TTL을 취소 불가능한 callback timer 대신 expiry timestamp로
    판정하고 요청 시 만료·정리한다. `tests/session-ttl.fls`에서 만료 후 AUTH_REQUIRED,
    session/expiry 삭제를 검증했다.
  - FreeLang v11 `tcp-server-raw`에 remoteAddress 네 번째 이벤트 인자를 추가하고,
    기존 3인자 handler 호환성을 유지했다. DB는 연결 시 peer 주소를 저장해 같은
    IP의 여러 connection이 하나의 rate budget을 공유하고, 주소가 없는 환경에서는
    connection id로 안전하게 fallback한다.
  - 추가 증거: `AFJ_DB_RATE_MAX_REQUESTS`/`AFJ_DB_RATE_WINDOW_MS` 기반 연결별
    rate limit과 `RATE_LIMITED` 응답 경로를 추가하고
    `tests/connection-rate-limit.fls`를 등록했다. 기본값과 독립적인 계약
    검증은 `AFJ_DB_RATE_MAX_REQUESTS=2 node .../bootstrap.js run
    tests/connection-rate-limit.fls`로 재현한다.
  - 추가 증거: TCP fragment 누적·여러 줄 요청 처리와 누적 1 MiB 상한을
    `afj-tcp-process-buffer`로 추가했다. runtime의 one-shot timer에 취소 API가
    없어 generation guard로 stale callback을 무해화한다.
  - 추가 증거: 부분 요청마다 `AFJ_DB_REQUEST_TIMEOUT_MS` deadline generation을
    기록하고, timer callback이 같은 generation일 때만 `REQUEST_TIMEOUT`으로
    connection·buffer를 정리한다. `tests/tcp-slow-timeout.fls`에서 cleanup을
    검증했다. 실제 socket idle timer의 end-to-end 검증은 runtime event-loop 게이트다.
  - 검증 기록: 확장 release gate에서 auth lockout/reset, session cleanup/TTL,
    connection rate limit, peer IP rate limit, fragmented TCP requests가 모두
    PASS했다. `tests/ip-rate-limit-runtime.js`는 실제 TCP daemon에 두
    loopback connection을 열어 동일 peer의 공유 budget을 검증했다.

- [ ] `AFJ-007` TLS 전송 계층
  - FreeLang runtime TLS capability를 확인하고 최소 어댑터를 정의한다.
  - 인증서 교체·만료·호스트명 검증 실패를 처리한다.
  - 검증: TLS handshake, 평문 차단, 잘못된 인증서, 인증서 교체 테스트.
  - 추가 증거: FreeLang v11 `tcp-server-tls` capability를 추가해 TLS 1.2+
    listener와 기존 raw TCP와 호환되는 event contract를 제공한다. 인증서·키
    파일을 읽지 못하면 시작을 거부하고 평문 client는 handshake 단계에서
    종료한다.
    loopback JSON TCP를 TLS 1.2+로 감싸고, 만료 인증서를 거부하며, `SIGHUP`
    또는 `reloadCertificates()`로 인증서를 교체한다. `tests/tls-proxy-smoke.js`
    에서 Node adapter의 실제 handshake, 인증서 reload, 올바른 hostname 통과, 잘못된 hostname
    거부, client certificate 없는 연결 거부, mTLS 연결 통과, 인증서 파일
    제거 후 reload 실패 주입, 실제 FreeLang TCP daemon을 통한 loopback
    integration handshake를 검증했다. `tests/native-tls-smoke.js`에서 native
    handshake·평문 차단을, `tests/production-native-tls.js`에서 production
    `0.0.0.0` 외부 bind와 DB ping을 검증했다. `tests/production-tls-boundary.sh`는
    인증서 없는 production 외부 bind가 `AFJ_DB_TLS_REQUIRED`로 거부되는지
    확인한다.
  - 검증 완료: FreeLang v11 `tcp-server-tls` capability의 handshake·평문 차단,
    production 외부 bind, CA 기반 mTLS, client 인증서 없는 연결 거부,
    native certificate reload 성공 및 잘못된 파일 reload 실패 주입을 모두
    `tests/native-tls-smoke.js`, `tests/native-tls-policy-smoke.js`,
    `tests/production-native-tls.js`, `tests/production-tls-boundary.sh`로
    재현했다. Node TLS adapter는 기존 compatibility 경로로 유지한다.

### P2 — SQL·MariaDB 호환성

- [ ] `AFJ-008` 정식 SQL lexer/parser/AST
  - 공백 분할 기반 파서를 정식 토큰·문자열·주석·괄호 처리로 교체한다.
  - 오류 위치·오류 코드를 안정화한다.
  - 트랜잭션 종료문과 statement terminator(`;`)를 동일한 AST로 정규화한다.
  - 검증: 문법 corpus와 오류 corpus 회귀.
  - 진행 증거: quote-aware whitespace tokenization, `--` trailing comment 제거,
    statement terminator 정규화를 추가하고 기존 AST 회귀에 문자열 공백 사례를
    포함했다. 추가로 quote·괄호 깊이를 보존하는 delimiter 분할기로 quoted comma
    값과 다중 INSERT·스키마 정의를 검증한다. 전체 lexer/parser 교체와 오류 위치
    고정은 아직 남아 있다.

- [ ] `AFJ-009` 복잡한 조회 실행기
  - JOIN, LEFT JOIN, 서브쿼리, NULL, 자료형 변환, ORDER/GROUP/HAVING을 확장한다.
  - 대형 결과 집합의 streaming 경로를 추가한다.
  - 검증: MariaDB differential corpus 95% 이상.

- [ ] `AFJ-010` MariaDB 클라이언트 호환
  - wire-level protocol 또는 공식 client adapter를 제공한다.
  - prepared statement, parameter binding, error mapping을 지원한다.
  - 검증: 표준 MariaDB client smoke와 prepared statement 회귀.
  - 진행 증거: `server-engine-execute-prepared-params`가 quote-aware `?`
    placeholder를 SQL literal로 바인딩하고, 문자열 내부 `?`는 보존하며,
    parameter count mismatch를 거부하는 회귀가 통과했다. wire-level MariaDB
    protocol과 표준 client smoke는 아직 남아 있다. TCP query 예외는 알려진
    constraint·WAL·parameter 오류를 안정 코드로 매핑하고 미지 오류만
    `SQL_ERROR`로 반환하는 `tests/error-mapping.fls` 회귀를 추가했다.
  - 추가 증거: TCP JSON adapter에 `prepare`/`execute` 요청을 연결해 세션 소유권,
    quote-aware parameter binding, count mismatch, 타 세션 실행 거부를 검증했다.
    `tests/tcp-prepared.fls`가 통과했다. 이는 MariaDB wire-level 호환을 대체하지
    않으며 표준 MariaDB client smoke는 계속 남아 있다.
  - 추가 증거: Node transport adapter에 `COM_STMT_PREPARE`,
    `COM_STMT_EXECUTE`, `COM_STMT_CLOSE`를 연결하고 LONG/VARCHAR/null
    parameter decoding을 추가했다. `tests/mariadb-wire-prepared.js`에서
    실제 binary packet handshake, prepared execution, result row를 검증했다.
  - 추가 진행 증거: FreeLang binary foundation에 raw TCP 문자열과 base64
    buffer 사이의 무손실 변환(`raw-to-b64`, `b64-to-raw`)을 추가하고,
    `src/mariadb-wire.fls`에 3-byte little-endian packet framing,
    sequence/payload extraction, length-encoded string, OK/error packet
    codec을 구현했다. `tests/binary-raw.fls`와
    `tests/mariadb-wire-codec.fls`가 각각 PASS했다.
  - native 통합 증거: `src/mariadb-wire.fls`가 FreeLang raw TCP listener에서
    handshake, COM_QUERY, COM_STMT_PREPARE/EXECUTE/CLOSE, result set과
    안정적인 error packet을 처리한다. `tests/native-mariadb-smoke.js`와
    `tests/native-mariadb-prepared.js`가 실제 `mariadb` client 및 binary
    prepared packet으로 각각 PASS했다. `tests/native-mariadb-decoder.fls`와
    확장 prepared 회귀가 INT·NULL·문자열·다중 parameter binding과 type-cache
    재실행(`new-params-bound=0`)을 검증한다.
    로그인 capability의 Protocol 4.1 비트 해석·상태 기록과 미지원 client
    거부도 `tests/native-mariadb-decoder.fls`에서 검증한다. 추가로 32-bit
    client capability, max-packet-size, charset을 파싱하고 서버 지원 capability와
    negotiated intersection을 세션 상태에 기록한다. native decoder와 표준
    client/prepared smoke가 이 교섭 경로를 통과한다. 순수 FreeLang Script
    `src/sha1.fls`가 SHA-1 표준 벡터와 `mysql_native_password` challenge를
    계산하며, listener가 올바른 `AFJ_DB_ROOT_PASSWORD` 토큰은 통과시키고
    잘못된 토큰은 1045로 거부한다. `tests/mariadb-sha1.fls`와 native auth
    회귀가 통과했다. caching_sha2_password 등 다른 auth plugin과 TLS의
    production hardening은 남아 있다. login username과 auth-response 길이도
    파싱해 `root` 이외 사용자와 빈 auth response를 native listener에서
    `ACCESS_DENIED`로 거부하며, `tests/native-mariadb-auth.js`가 실제 packet
    회귀를 통과한다.

- [ ] `AFJ-011` 호환성 점수 자동화
  - SQL 30%, 저장/복구 25%, 트랜잭션 20%, 서버/권한 15%, 운영 10%를 자동 계산한다.
  - 미검증 기능은 점수에서 제외한다.
  - 검증: 동일 corpus 반복 실행 시 동일 점수·동일 오류 코드.
  - 진행 증거: 미완료 MVCC·격리·deadlock 기능을 scorecard에서 `passed=false`로 정정했다.

### P2 — 대규모 데이터·성능

- [ ] `AFJ-012` 페이지 기반 저장소·buffer pool
  - 전체 catalog 메모리 적재를 제거하고 페이지 cache와 eviction을 추가한다.
  - 큰 행·큰 테이블·재시작 시 메모리 사용량을 제한한다.
  - 검증: 대형 corpus, 메모리 상한, 재시작, 장시간 soak.
  - 진행 증거: `write-page-set`/`read-page-set`이 4096-byte checksum page를
    순서·총량 헤더와 함께 여러 파일 페이지로 분할하고 재조립한다. 대형 payload와
    손상 page 거부를 `src/afj-db95.fls` smoke에서 검증했다. 아직 buffer pool,
    eviction, TCP engine의 전체 catalog 메모리 제거는 남아 있다.
  - 추가 증거: page-set 읽기 경로에 fingerprint-aware bounded LRU page cache를
    연결했다. `AFJ_DB_PAGE_CACHE_PAGES`로 1~4096 page 상한을 설정하고, 초과 시
    가장 오래 사용한 page를 eviction한다. raw line fingerprint를 cache key에
    포함해 외부 파일 변경·손상 시 stale cache가 검증을 우회하지 않는다.
    `AFJ_DB_PAGE_CACHE_PAGES=2 node ... run src/afj-db95.fls`에서 roundtrip,
    eviction bound, corruption rejection을 통과했다. TCP catalog 전체의 page
    migration과 buffer-pool pin/flush 정책은 아직 남아 있다.
  - 검증 기록: `tests/large-corpus-soak.fls`에서 1,000행 bulk insert와 primary
    index select/update/delete를 수행해 대형 corpus 회귀가 PASS했다. 이는
    bounded corpus 증거이며 장시간 production soak를 대체하지 않는다.
  - 추가 증거: `AFJ_DB_CATALOG_PAGES`가 설정된 TCP 경로에서 catalog snapshot을
    checksum page-set으로 기록하고, 재시작 시 checkpoint 이후 WAL tail만 재생한다.
    `tests/tcp-catalog-pages.fls`의 page write/restore, WAL tail, corruption
    rejection이 모두 PASS했다. 개발 모드의 미설정 기본값은 기존 WAL-only 동작을
    유지하며 production은 WAL 옆 page path를 기본 사용한다.
  - 추가 증거: `tests/tcp-concurrency-smoke.js`에서 FreeLang TCP daemon에 8개
    동시 세션을 연결하고 병렬 INSERT 후 SELECT 결과를 확인해 bounded concurrency
    회귀가 PASS했다. 이는 장시간 production soak나 완전한 buffer-pool 검증을
    대체하지 않는다.
  - 추가 증거: `tests/tcp-long-soak.js`가 `tcp-soak-daemon.fls`를 60초 동안
    유지하면서 8개 세션의 병렬 INSERT와 indexed SELECT checkpoint를 반복했다.
    `afj-db95 TCP 60s soak PASS writes=80`으로 WAL·세션·동시성 경로의 재현 가능한
    장시간 회귀를 확보했다. 이는 무제한 production soak와 성능 envelope를
    대체하지 않는다.
  - 추가 성능 증거: 동일한 soak harness가 8개 세션 병렬 쓰기를 300초 동안
    수행하고 `writes=248`, `throughput=0.83/s`, `p95=11084ms`, `max=13138ms`를
    기록했다. p95 15000ms, max 20000ms envelope를 통과했으며, release gate는
    `AFJ_SOAK_MS=300000`과 동일한 임계값을 사용한다. 이 수치는 현재 모바일
    런타임에서의 bounded envelope이며 무제한 처리량 보장을 의미하지 않는다.
  - 추가 증거: TCP catalog page 경로에 bounded page pool을 연결했다.
    `AFJ_DB_PAGE_POOL_PAGES` 상한, pin된 page 보호, dirty→flushed 전환과
    unpinned LRU eviction을 `tests/tcp-catalog-pages.fls`에서 검증했고,
    page write/read checkpoint 경로도 동일 pool을 사용한다. 추가로 TCP catalog
    checkpoint manifest를 version 2로 전환해 전체 catalog를 manifest에 내장하지
    않고 table별 SHA-256 page-set으로 분리했다. recovery는 manifest의 table
    descriptor를 통해 각 table page-set을 검증·재조립하고 deterministic index
    rebuild 후 WAL tail을 이어서 재생한다. `tests/tcp-catalog-pages.fls`에서
    table-page write/restore, manifest B+Tree table index, table-page B+Tree
    persistence/reopen, index rebuild, WAL tail, corruption rejection, bounded
    pool을 모두 PASS했다. `AFJ_DB_LAZY_TABLES=true` 경로의 placeholder recovery,
    요청 시 table page load, cache 상한 1의 LRU eviction과 reload도
    `tests/tcp-lazy-catalog.fls`에서 통과했다. 같은 회귀에서 transaction 시작
    후 최초 table 접근만 materialize하고, 다른 세션의 후속 commit을
    REPEATABLE READ snapshot에 노출하지 않는 lazy transaction snapshot도
    PASS했다.

- [ ] `AFJ-013` 인덱스·옵티마이저
  - B+Tree·복합 인덱스·UNIQUE·PRIMARY KEY를 영속화한다.
  - full scan과 index scan 결과 동일성을 검증한다.
  - 검증: 선택도별 plan 비교, 인덱스 손상 복구, 성능 회귀.
  - 진행 증거: primary/unique key 기준 엔진 index map을 CRUD 변경 시 재구성하고,
    equality predicate에 `index-scan` 계획을 사용한다. `src/engine.fls`에서 같은
    행에 대한 index-scan/full-scan 결과 동등성을 검증했다. UPDATE·DELETE 뒤에도
    동일 key 조회가 최신 행과 빈 결과를 반환하고, 테이블/데이터베이스 삭제 시
    stale index를 제거하는 회귀를 추가했다. `src/btree.fls`의 recursive
    internal split을 구현해 다중 leaf split·검색을 검증하고,
    `tests/persistent-btree.fls`에서 20개 key의 recursive B+Tree를 checksum
    page로 저장·재오픈하는 회귀를 추가했다. 아직 TCP executor catalog에
    이제 TCP table page에 checksum B+Tree leaf root를 `page-indexes`로 저장하고
    recovery 시 executor index로 재사용한다. equality/range 조회는 복구된
    B+Tree 경로를 사용하며 `tests/tcp-catalog-pages.fls`의 persistence/reopen
    및 mutation-refresh 회귀가 PASS했다. recursive split은 별도
    `tests/persistent-btree.fls`에서 검증하며, 통계 기반 선택도 최적화와 복합
    인덱스는 남아 있다.

### P3 — 금융·결제 수준 트랜잭션

- [ ] `AFJ-014` MVCC·격리 수준
  - READ COMMITTED, REPEATABLE READ, SERIALIZABLE snapshot을 구현한다.
  - dirty read, non-repeatable read, phantom, lost update를 차단한다.
  - 검증: 동시 세션 스케줄러 기반 ACID 회귀.
  - 진행 증거: TCP `BEGIN` transaction은 working catalog/index를 전역 상태와
    분리하고 COMMIT 때만 게시한다. `tests/transaction-isolation.fls`에서 다른
    세션의 dirty read 차단, rollback 제거, commit 게시를 검증했다. 명시적
    phantom·write skew 검증과 완전한 MVCC는 아직 남아 있다. 또한
    `SAVEPOINT`, `ROLLBACK TO SAVEPOINT`, `RELEASE SAVEPOINT`를 TCP SQL 경로에
    연결하고, `tests/tcp-savepoint.fls`에서 앞선 staged 변경만 보존하는 부분
    롤백과 커밋 게시를 검증했다.
  - 추가 증거: `START TRANSACTION ISOLATION LEVEL`로 READ COMMITTED,
    REPEATABLE READ, SERIALIZABLE을 선택할 수 있다. READ COMMITTED는 statement
    직전에 committed catalog를 재구성하고 자기 staged AST를 재적용하며,
    SERIALIZABLE은 읽기 table lock으로 concurrent writer를 차단한다.
    `tests/tcp-isolation-levels.fls`에서 세 동작을 검증했다.
  - 추가 증거: transaction 시작 시 commit revision을 기록하고, staged write의
    commit 시점에 revision을 optimistic validation한다. 서로 다른 table을
    수정해 table lock을 우회하는 write skew/lost update도 `TX_CONFLICT`로
    rollback한다. REPEATABLE READ phantom 비가시성, SERIALIZABLE predicate
    lock, stale second commit 회귀를 `tests/tcp-mvcc-conflicts.fls`에서
    검증했다. 완전한 row-version MVCC와 predicate/index range validation은
    아직 남아 있다.
  - 추가 증거: `src/mvcc.fls`에 commit revision과 transaction snapshot을
    연결한 immutable row version, update 시 구버전 tombstone·신버전 생성,
    rollback 시 미커밋 version 제거를 구현했다. `tests/mvcc-row-version.fls`에서
    오래된 snapshot의 balance 보존과 rollback 누수 방지를 각각 PASS했다.
    이 코어 증거만으로 TCP executor의 완전한 row-version·predicate range
    validation 완료를 주장하지 않으며, 해당 통합 게이트는 계속 남긴다.
  - 추가 진행 증거: TCP transaction state에 table commit revision snapshot과
    읽은 predicate 목록을 기록하고, staged write commit 시 predicate table의
    revision 변화를 검증해 stale range read를 `TX_CONFLICT`로 거부하는
    validation 경로를 연결했다. `tests/tcp-isolation-levels.fls`와
    `tests/tcp-mvcc-conflicts.fls`가 기존 isolation/phantom/write-skew
    회귀와 함께 PASS했다. 이는 아직 row별 version chain과 index-range
    granular validation을 대체하지 않는다.
  - 추가 통합 증거: `src/tcp-server.fls`의 committed catalog commit 경로가
    table별 immutable row-version chain을 생성·종료(tombstone)하고,
    transaction 시작 snapshot은 해당 revision으로 visible row를 재구성한다.
    `tests/tcp-mvcc-conflicts.fls`에서 실제 TCP update/commit 뒤 이전 snapshot의
    balance와 최신 snapshot의 balance, 동일 row의 version chain 길이를 함께
    검증하는 `afj-db95 TCP row-version chain PASS`를 확인했다. 또한
    `tests/tcp-row-version-recovery.fls`가 WAL replay로 revision과 version chain을
    재구성하는 `afj-db95 TCP row-version WAL recovery PASS`를 확인했다. 아직
    index 내부의 페이지 단위 range scan은 아니지만, `src/sql-core.fls`의 범위
    연산자(`>`, `>=`, `<`, `<=`, `!=`, `<>`)와 `src/engine.fls` 비교 실행을
    연결했다. `tests/tcp-range-predicate.fls`에서 `id > 10` 조회의 신규 행
    phantom 비가시성과 stale predicate write의 `TX_CONFLICT`를 실제 TCP
    transaction 경로로 확인했다. `engine.fls`는 primary/unique index bucket의
    `>`, `>=`, `<`, `<=`, `!=`, `<>` 후보를 먼저 좁히고 row-level predicate로
    확정하며 `index-range-scan` 계획을 반환한다. 이는 범위 conflict와 후보
    검증의 통합 증거지만, 페이지 기반 B+Tree range scan 완료를 의미하지
    않는다. checkpoint table page에 row-version history를 저장·복원하는
    durable 경로는 별도 회귀로 검증했으며, WAL history 압축은 운영 최적화
    범위로 남아 있다.
  - 추가 granular 증거: `afj-tcp-row-version-predicate-conflict?`가 snapshot
    이후 생성·tombstone된 row version 중 실제 predicate를 만족하는 변경만
    충돌로 판정한다. `tests/tcp-range-predicate.fls`는 범위 안 삽입의
    `TX_CONFLICT`와 범위 밖 삽입 후 reader commit 허용을 각각
    `afj-db95 TCP range predicate conflict PASS`,
    `afj-db95 TCP granular range validation PASS`로 검증한다. 같은 회귀에서
    범위 내 update와 delete tombstone도 `afj-db95 TCP granular range
    update/delete PASS`로 확인한다. global revision 보수 충돌만 쓰던 경로에서
    row-version 기반 후보 검증으로 확장했지만, 다중 인덱스·복합 predicate와
    page-level B+Tree range scan은 table page recovery 경로에 연결했지만,
    다중 인덱스·복합 predicate는 남아 있다.
  - 추가 AFJ-013 증거: SQL DDL의 `UNIQUE (tenant,email)`을 구조화된
    `unique-groups`로 보존하고, 엔진이 pair 전체를 기준으로 중복을 거부하며
    composite bucket과 page-index leaf를 재구성하고, 두 equality predicate의
    `AND` 조회에 `index-scan` 계획을 사용한다. `tests/compound-index.fls`가
    composite lookup, 동일 pair 거부와 서로 다른 tenant의 동일 email 허용을
    `PASS`로 검증했다.
  - 추가 range 증거: 내부 B+Tree node의 최소·최대 키로 불필요한 child를
    건너뛰는 bounded range traversal을 연결했다. `tests/btree-range.fls`가
    `>`, `<=`, `<>` 결과와 경계 key를 재귀 tree fixture에서 검증한다.
  - 추가 복합 predicate 증거: SQL parser가 두 개의 `AND` predicate에서
    equality와 range 연산자를 함께 보존하고, executor가 사용 가능한 단일
    인덱스 후보를 먼저 좁힌 뒤 전체 predicate를 재검증한다. `tests/compound-range.fls`
    에서 `id > 1 AND tenant = 'a'`와 역순 조건의 `index-range-scan`, 결과 행,
    경계 조건을 검증한다. 서로 다른 두 단일 인덱스 후보의 row-id 교집합도
    같은 회귀에서 검증한다. page-level composite B+Tree range traversal은
    여전히 남는다.
  - 추가 durable 증거: catalog page checkpoint의 table page에 immutable
    `row-version-history`와 manifest의 `commit-revision`·`table-revisions`를
    함께 저장하고, recovery가 WAL tail 없이도 이전 snapshot과 최신 snapshot을
    재구성한다. `tests/tcp-row-version-checkpoint.fls`가 checkpoint write/recovery와
    동일 row의 구버전·신버전 조회를 각각 `PASS`로 검증했다.

- [ ] `AFJ-015` deadlock·복구 정책
  - lock wait timeout, deadlock detection, victim rollback을 추가한다.
  - 재시작 시 미완료 transaction과 prepared transaction을 분리 복구한다.
  - 검증: 교착·timeout·강제 종료·재시작 회귀.
  - 추가 증거: TCP lock manager에 wait-for cycle 검출을 연결해 일반 충돌은
    `LOCK_CONFLICT`, cycle은 `DEADLOCK_DETECTED`로 구분한다. 두 transaction이
    서로 다른 table을 잠근 뒤 역순으로 요청하는 `tests/tcp-deadlock.fls`가 통과했다.
  - 추가 증거: 교착을 만든 요청 transaction을 결정론적 victim으로 즉시 rollback하고
    staged catalog/index·transaction state·소유 lock을 정리한다. 회귀에서 victim
    token과 lock 제거까지 확인한다.
  - 추가 증거: `AFJ_DB_LOCK_WAIT_TIMEOUT_MS` 기반 비동기 재시도 timeout을 추가하고,
    timeout victim도 동일하게 transaction·wait-for·lock을 정리한다. 환경변수 1000ms
    회귀 `tests/tcp-lock-timeout.fls`가 통과했다.
  - 추가 증거: commit marker 없는 prepare-only WAL을 restart recovery에서 무시해
    강제 종료 중 미완료 transaction이 게시되지 않는 `tests/wal-format.fls`
    회귀가 통과했다.
  - 추가 증거: `tests/tcp-transaction-kill-recovery.js`에서 실제 TCP transaction에
    committed row와 staged-uncommitted row를 만든 뒤 daemon을 `SIGKILL`하고 같은
    WAL로 재시작했다. 복구 후 committed row만 남는
    `afj-db95 TCP transaction forced-kill recovery PASS`를 확인했다.

- [ ] `AFJ-016` 1.0 릴리스 게이트
  - 보안·호환성·성능·복구·운영 문서와 증거를 하나의 release report로 묶는다.
  - 모든 P0~P3 태스크와 공식 완료 기준을 확인한다.
  - 검증: clean checkout 재현 빌드·전체 회귀·릴리스 후보 smoke.
  - 추가 증거: `tests/release-gate.sh`가 syntax/WAL/backup/auth/TCP/MVCC/TLS
    회귀를 실행해 `docs/release-gate-report.md`에 결과를 기록한다.
    그러나 MariaDB production hardening, 완전한 row-version MVCC,
    index-range granular validation, executor lazy catalog eviction을
    명시적으로 감지해 release status를 `BLOCKED`로 유지한다.
  - 최신 실행 기록: `2026-10-04T01:35:57Z`, 자동 케이스 `54 PASS, 0 FAIL`.
    범위 predicate conflict와 durable row-version checkpoint 회귀도 통과했지만, 위 구조적 차단 항목 때문에
    exit status 2와 `Release status: BLOCKED`를 유지했다.

### P3 — 문서와 릴리스 추적

- [x] `AFJ-017` 공식 완료 단계·증거 추적 문서화
  - 언어 경계, 저장소, SQL, 트랜잭션, 서버·보안, 백업·복구, 운영성, 릴리스
    gate, 문서·추적성의 9개 완료 단계를 공식 계획의 추적표로 고정한다.
  - 각 단계가 하나 이상의 AFJ 태스크와 연결되는지 확인하고, 구현 미완료 항목은
    완료로 표시하지 않는다.
  - 현재 release blocker, 실행 명령, 결과 보고서 위치와 모바일·원격 환경 제한을
    함께 기록한다.
  - 완료 증거: `docs/official-db-plan.md` §7 및 본 문서의 AFJ-000~AFJ-017
    태스크 목록.

## 실행 순서

`AFJ-000 → AFJ-001 → AFJ-002 → AFJ-003 → AFJ-004/005/006 → AFJ-007 →
AFJ-008/009/010/011 → AFJ-012/013 → AFJ-014/015 → AFJ-016 → AFJ-017`

P0가 완료되기 전에는 운영 배포를 허용하지 않는다. 각 태스크 완료 시
구현 파일, 실행 명령, 결과 로그, 남은 제한을 함께 기록한다.

문서화 상태: 공식 완성 단계와 AFJ 태스크 등록은 완료되었다. 이는 구현 완료나
릴리스 승인을 의미하지 않으며, 각 태스크의 체크박스는 실제 검증 증거가 있을
때만 변경한다.
