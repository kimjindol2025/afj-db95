# afj-db95

FreeLang Script의 공식 관계형 데이터베이스를 목표로 하는 프로젝트입니다.

공식 계획과 1.0 완료 기준은 [`docs/official-db-plan.md`](docs/official-db-plan.md)에
고정합니다.

## 현재 단계

현재는 실행 가능한 관계형 코어, JSON Lines WAL, fd_fsync 기반 durable
transaction 복구 기준선을 제공합니다. 아직 공식 1.0 DB는 아닙니다.

- 테이블 생성
- 행 삽입
- 전체 조회
- 기본 조건 조회
- 행 수정·삭제
- 최소 DDL: `ALTER TABLE ... ADD COLUMN`, `DROP TABLE`
- 스키마 메타데이터 보관
- 변경 이벤트 WAL 기록
- WAL 이벤트 재생을 통한 메모리 복구
- prepare/commit marker와 torn transaction 복구
- fd_fsync durable append
- 엔진 catalog 통합 트랜잭션: COMMIT/ROLLBACK/SAVEPOINT

외부 MariaDB 호환 corpus와 대규모 장애 주입은 공식 1.0 전 검증 과제로 남아 있습니다.

## 실행

```text
export AFJ_BOOTSTRAP=/path/to/freelang-afj/bootstrap.js
node "$AFJ_BOOTSTRAP" run src/afj-db95.fls
```

TCP 운영 인스턴스는 환경변수로 인스턴스별 WAL 위치와 root 비밀번호를 지정할 수
있습니다. 미설정 시 기존 개발 기본값을 사용합니다.

```text
AFJ_DB_MODE=production
AFJ_DB_WAL=/var/lib/afj-db95/catalog.wal
AFJ_DB_ROOT_PASSWORD=<운영용-비밀번호>
AFJ_DB_AUDIT_LOG=/var/log/afj-db95/audit.jsonl
AFJ_DB_AUTH_STATE=/var/lib/afj-db95/auth-state.jsonl
AFJ_DB_PORT=43995
AFJ_DB_BIND_HOST=127.0.0.1
AFJ_DB_MAX_SESSIONS=64
AFJ_DB_SESSION_TTL_MS=3600000
AFJ_DB_MAX_AUTH_FAILURES=5
AFJ_DB_AUTH_LOCKOUT_MS=60000
AFJ_DB_PASSWORD_MIN_LENGTH=8
AFJ_DB_RATE_MAX_REQUESTS=60
AFJ_DB_RATE_WINDOW_MS=60000
AFJ_DB_LOCK_WAIT_TIMEOUT_MS=5000
AFJ_DB_REQUEST_TIMEOUT_MS=10000
AFJ_DB_PAGE_CACHE_PAGES=64
AFJ_DB_TLS_CERT=/etc/afj-db95/server.crt
AFJ_DB_TLS_KEY=/etc/afj-db95/server.key
AFJ_DB_TLS_BIND_HOST=127.0.0.1
AFJ_DB_TLS_PORT=43996
AFJ_DB_TLS_IDLE_TIMEOUT_MS=60000
AFJ_DB_TLS_CA=/etc/afj-db95/clients-ca.crt
AFJ_DB_TLS_REQUIRE_CLIENT_CERT=0
```

`AFJ_DB_MODE=production`에서는 WAL 경로, root 비밀번호, audit log, 인증 상태
경로를 반드시 지정해야 합니다. audit log 경로는 인증 성공·실패와 권한 변경을
JSON Lines로 기록하고, 인증 상태 파일은 역할·권한·비밀번호 해시를 JSON Lines로
복구합니다. 인증 상태 파일에는 평문 비밀번호를 저장하지 않으며 WAL·audit log와
같이 접근권한을 제한해야 합니다. `/tmp` 기본 WAL 경로와 `development-only` 기본 비밀번호는 개발
모드에서만 허용됩니다. 외부 bind 주소가 필요하면 운영 네트워크 주소를
명시적으로 지정하고 방화벽·TLS·접근제어를 함께 구성해야 합니다.
동시 세션 수는 `AFJ_DB_MAX_SESSIONS`로 제한하며 허용 범위는 1~4096입니다.
사용자별 반복 인증 실패는 `AFJ_DB_MAX_AUTH_FAILURES` 횟수 후
`AUTH_LOCKED`로 차단하며 허용 범위는 1~100입니다. 시간 기반 해제와 IP별
해제 시간은 `AFJ_DB_AUTH_LOCKOUT_MS`로 지정하며 1초~1시간 범위입니다.
비밀번호 교체는 `rotate-password` 경로에서 수행하며 새 비밀번호는 기본 8자
이상이어야 합니다. IP별 rate limit은 현재 FreeLang TCP 런타임이 원격 IP를
노출하지 않아 연결별 rate limit을 먼저 적용하고, IP 단위는 후속 런타임 게이트입니다.
연결별 rate limit은 `AFJ_DB_RATE_MAX_REQUESTS`와 `AFJ_DB_RATE_WINDOW_MS`로
설정하며 기본값은 60회/60초입니다.
table lock 충돌은 `AFJ_DB_LOCK_WAIT_TIMEOUT_MS` 후 `LOCK_TIMEOUT`으로 종료하며,
timeout transaction은 staged 변경과 lock을 함께 rollback합니다. 허용 범위는
1ms~1시간입니다.
줄바꿈 없는 TCP 요청은 `AFJ_DB_REQUEST_TIMEOUT_MS` 후 `REQUEST_TIMEOUT`으로
연결을 종료하고 누적 buffer를 삭제합니다. 허용 범위는 100ms~1시간입니다.
page-set 읽기는 `AFJ_DB_PAGE_CACHE_PAGES`로 bounded LRU cache 크기를 제한하며,
허용 범위는 1~4096 page입니다. page 원문 fingerprint가 바뀌면 cache hit를
사용하지 않아 외부 파일 손상을 숨기지 않습니다.
세션은 `AFJ_DB_SESSION_TTL_MS` 후 자동 만료되며, 만료 시 prepared statement,
transaction, lock을 함께 정리합니다. 허용 범위는 1초~24시간입니다.

모니터링은 TCP JSON 요청 `{"type":"health"}`를 인증 없이 사용할 수 있습니다.
응답의 `ok`, `service`, `status`, `wal` 필드를 readiness/liveness 점검에 사용합니다.
인증된 세션은 `{"type":"shutdown","token":"..."}` 요청으로 graceful shutdown을
수행할 수 있습니다. 포트는 `AFJ_DB_PORT`로 지정하며 1~65535 범위만 허용합니다.
bind 주소는 `AFJ_DB_BIND_HOST`로 지정합니다. 개발 모드의 기존 기본값은
`0.0.0.0`이고, production 모드의 안전한 기본값은 `127.0.0.1`입니다.
FreeLang runtime의 native TLS listener가 없으므로 production DB listener 자체는
localhost 밖 bind를 계속 거부합니다. 외부 TLS transport가 필요하면 인증서·키를
지정한 뒤 별도 Node adapter를 실행합니다.

```bash
node tools/afj-tls-proxy.js
```

adapter는 loopback JSON TCP를 TLS 1.2+로 전달하고 만료 인증서를 거부합니다.
운영 외부 공개 전에는 CA/mTLS, client hostname verification, 평문 우회 차단과
인증서 교체 장애 테스트를 별도 릴리스 gate로 통과해야 합니다.
기존 HTTP adapter는 개발·계약 테스트 전용이며 `AFJ_DB_MODE=production`에서
시작되지 않습니다.

운영 후보 gate는 `AFJ_BOOTSTRAP=/path/to/freelang-afj/bootstrap.js bash tests/release-gate.sh`로 실행합니다. 결과는
`docs/release-gate-report.md`에 기록되며, 자동 회귀가 모두 통과해도 TLS,
MariaDB wire protocol, 완전한 MVCC와 대규모 soak 같은 미완료 게이트가 있으면
`BLOCKED`로 종료합니다.

## 목표

MariaDB 내부 구현을 복제하는 것이 아니라, 주요 SQL·트랜잭션·운영 기능을 FreeLang Script로 단계적으로 호환합니다.
현재 실행 가능한 compatibility scorecard는 94%이며, 미검증 기능을 완료로
계산하지 않습니다. 이 수치는 공식 1.0 릴리스 판정이 아니라 현재 회귀 세트의
검증 상태를 나타냅니다.
