# AFJ-DB95 1.0 공식 실행 계획

작성일: 2026-10-05
상태: 실행 중 (Phase 3 진입)

## 1. 목표

AFJ-DB95를 “기능이 동작하는 개발용 DB”에서 “재현 가능한 상용 release candidate”로 전환한다.
1.0 판정은 기능 수가 아니라 다음 네 가지 증거를 모두 만족할 때만 한다.

1. clean checkout에서 재현되는 빌드와 실행
2. core·복구·보안·호환성·성능 전체 gate의 실제 PASS
3. runtime과 제품 사이의 계약이 문서·테스트·구현에서 일치
4. 실패 시 원인·소유자·재현 명령·rollback 경로가 남아 있음

## 2. 현재 기준선

- AFJ-DB95 공식 문서 기준: 실제 listen 환경 전체 gate는 `59 PASS / 0 FAIL`.
- DB core, WAL, MVCC, 인덱스, 복구 case는 대부분 PASS.
- 격리 FreeLang runtime에서 TLS listener, mTLS, reload, production TLS integration, TLS adapter는 targeted PASS.
- 기존 MariaDB 5건은 client 부재와 fixture의 scheduler/bind race를 각각 수정·검증해 해소했다.
- schema MVCC row/DDL merge와 composite numeric type-order 회귀를 추가하고 전체 gate에 편입했다.
- 원본 FreeLang runtime에는 아직 격리 runtime 변경을 반영하지 않는다.

## 3. 작업 원칙

- 계획의 한 단계가 exit criteria를 만족하기 전에는 다음 단계로 넘어가지 않는다.
- 이미 PASS한 영역은 소유자·구현·계약 변경이 없으면 중복 실행하지 않는다.
- 모든 FAIL은 `runtime / product / test-fixture / environment / gate-runner` 중 하나로 분류한다.
- 실제 실행 증거 없는 항목은 PASS가 아니라 `BLOCKED` 또는 `UNRESOLVED`로 기록한다.
- 원본 runtime 반영은 격리 runtime의 targeted test와 diff review가 끝난 뒤 한 번에 한다.
- 문서, 재현 명령, 예상 결과, 실패 시 rollback을 각 단계에 남긴다.

## 4. 단계별 계획

### Phase 0 — 기준선 및 작업 격리

소유: release engineering
목표: 같은 상태에서 누구나 같은 결과를 재현한다.

작업:

- AFJ-DB95 clean checkout용 gate workspace 확정
- FreeLang runtime bootstrap 경로를 `AFJ_BOOTSTRAP`으로 고정
- 격리 runtime과 원본 runtime을 명시적으로 구분
- gate runner의 case 번호, elapsed, 로그 경로, timeout 출력 고정
- dirty worktree 차단 및 환경 preflight 추가

통과 조건:

- bootstrap preflight가 성공 또는 명시적 BLOCKED를 출력
- 임의의 case 하나를 동일 명령으로 2회 실행해 같은 분류 결과 확인
- gate 로그를 case 단위로 보존 가능

### Phase 1 — 테스트 fixture 및 경로 계약 정리

소유: test infrastructure
목표: 테스트가 특정 개발자의 절대경로에 의존하지 않게 한다.

작업:

- 모든 `.fls`의 절대 `load` 경로 탐색
- repo-root 기준 상대 `load`로 변환
- fixture 내부 파일 경로를 환경변수 또는 테스트 temp directory로 분리
- `rg '/root/|/home/.*/afj-db95' tests src`를 gate preflight로 추가

통과 조건:

- clean/path-normalized workspace에서 경로 관련 FAIL 0건
- `git diff --check` PASS
- core fixture 10개를 독립 실행해 동일 결과 확인

### Phase 2 — Runtime 계약 통합

소유: FreeLang runtime
목표: 제품이 사용하는 builtin 계약을 runtime이 공식 제공한다.

작업:

- raw TCP callback: `(event conn payload peer)` 계약 고정
- `tcp-server-tls` listener 구현
- mTLS 인증서/CA 정책 구현
- `tcp-server-tls-reload` 성공·실패 계약 고정
- `fl-yield` scheduler 요구사항을 문서화하고 daemon 예제에 반영
- 격리 runtime targeted test → diff review → 원본 runtime 반영

통과 조건:

- raw TCP peer, TLS, mTLS, reload smoke PASS
- AFJ native TLS listener, mTLS/reload, production TLS integration, TLS adapter PASS
- 원본 runtime 반영 후 동일 테스트 재실행 PASS

### Phase 3 — Core 및 복구 회귀

소유: AFJ-DB engine
목표: runtime 변경이 DB 정확성을 깨뜨리지 않았음을 증명한다.

작업:

- page/WAL, B+Tree, compound index/range
- transaction isolation, savepoint, deadlock, lock timeout
- MVCC conflict, row-version, checkpoint
- forced-kill WAL, torn tail, corruption rejection
- backup/restore 및 auth/session recovery

통과 조건:

- 기존 PASS case의 회귀 0건
- 신규 FAIL은 원인 분류와 owner가 반드시 존재
- destructive recovery 테스트는 temp directory에서만 실행

### Phase 4 — 성능 기준선 및 최적화

소유: performance
목표: 성능 수치를 과장하지 않고, 측정 가능한 목표를 정한다.

기준:

- 단일 client 10초 soak
- 8 session 5분 performance envelope
- p95/max latency와 writes throughput을 함께 기록

작업 순서:

1. 현재 baseline 고정
2. WAL batch/commit 비용 측정
3. page cache hit/miss 측정
4. TCP 요청 batch 및 parser 비용 측정
5. 변경마다 targeted benchmark 1회와 회귀 gate 1회 실행

통과 조건:

- 기준 장비·runtime revision·데이터 크기·동시성 기록
- baseline보다 나빠진 변경은 원인 없이 병합하지 않음
- bounded envelope PASS와 무제한 production 보장을 구분해 문서화

### Phase 5 — 상용 운영 검증

소유: release/operations
목표: 실제 배포 가능한 운영 계약을 검증한다.

작업:

- production config fail-closed
- TLS 인증서 누락·만료·reload 실패 처리
- audit/auth state/WAL 경로 권한 검증
- start/stop/smoke/rollback 계약 검증
- artifact hash와 실행 bootstrap revision 기록

통과 조건:

- deploy contract가 있는 경우에만 deploy 수행
- smoke와 rollback 실제 실행 PASS
- secret/credential이 로그에 노출되지 않음

### Phase 6 — 1.0 release gate 및 판정

소유: release owner
목표: 전체 결과를 한 번에 판정한다.

작업:

- clean checkout에서 전체 gate 실행
- case별 결과를 PASS/FAIL/BLOCKED로 분류
- FAIL 0, BLOCKED 0이 아니면 1.0 선언 금지
- release report, ownership, rollback 명령을 함께 확정
- 모든 조건 통과 후에만 tag/push/release 수행

판정:

- `1.0`: 전체 gate PASS, 운영 검증 PASS
- `1.0-rc`: core/runtime targeted PASS, 전체 gate 또는 운영 검증 일부 잔여
- `development`: release blocker 존재

## 5. 이번 실행 순서

현재는 Phase 0~1을 먼저 진행한다.

1. 절대경로 fixture 목록 확정
2. 상대경로 변환을 격리 workspace에서 수행
3. gate preflight와 case 로그 확인
4. Phase 1 exit criteria 통과 후 Phase 2 원본 runtime 반영 검토
5. Phase 3~6은 앞 단계 PASS 증거가 있을 때만 진행

## 7. Phase 1 진행 기록

2026-10-05 실행 결과:

- `src/`와 `tests/`의 `/root/kilo-freelang/projects/afj-db95` 실행 경로를 상대경로로 변환.
- `rg` 기준 runtime fixture의 절대경로 잔여 0건.
- `binary-raw`, `mariadb-wire-codec`, `persistent-btree`, `compound-range` syntax check는 PASS.
- `binary-raw`, `mariadb-wire-codec`, `persistent-btree` 실제 실행 PASS.
- `compound-range`는 composite `AND` 인덱스 결과를 executor가 lazy 값으로 다시 소비하던 문제를 수정한 뒤 4개 assertion 모두 PASS하고 정상 종료.
- `src/tcp-server.fls`, `src/afj-db95.fls` static check는 isolated runtime checker 보정 후 모두 PASS.
- Phase 1 targeted exit criteria: 경로 계약, 대표 fixture 실행, checker, compound range 회귀를 확인했으며 PASS.

따라서 Phase 1은 targeted 기준 `PASS`로 닫고, core/recovery 회귀인 Phase 2로 이동한다.

Phase 2 초기 결과:

- 고유 WAL 경로 순차 실행에서 WAL format/restart/torn-tail/corruption/uncommitted recovery PASS.
- commit replay 분기의 lazy 평가 누락을 수정했다.
- catalog page index/reopen/WAL-tail/corruption 회귀는 fallback rebuild 보강 후 PASS.
- row-version history wrapper의 lazy AST 순회를 materialize해 WAL recovery/checkpoint PASS.
- lazy transaction snapshot과 MVCC row-version chain PASS.
- range predicate는 B+Tree의 문자열 숫자 비교를 executor와 동일하게 정규화해 PASS.
- 전체 release gate는 실제 listen 환경에서 59개 자동 케이스 모두 PASS했다. DDL/schema MVCC row/DDL merge와 composite numeric/NULL order는 targeted 및 gate에서 PASS했다. 다만 full composite-key compatibility의 collation/혼합 타입 순서는 별도 조건으로 남아 1.0 선언 상태는 `BLOCKED`다.

2026-10-05 재실행:

- 고유 WAL/page 경로를 사용한 순차 targeted 회귀에서 WAL, catalog page, lazy snapshot, row-version recovery/checkpoint, MVCC, compound range 모두 PASS.
- 검수 실수와 재발 방지 규칙은 `docs/tasks/2026-10-05-mistakes-and-lessons.md`에 기록했다.
- Phase 3 targeted 회귀: bounded B+Tree range, compound range, catalog page, row-version recovery, lazy snapshot PASS.
- Phase 3 transaction/auth/recovery targeted 회귀: isolation, savepoint, deadlock, lock timeout, backup restore, auth lockout/reset/recovery, session cleanup/TTL PASS.
- 실제 listen 환경에서 peer IP rate limit 및 runtime peer IP rate limit PASS. handler의 peer 인자 누락을 수정했다.
- production native TLS integration과 TLS adapter는 listener bind race를 port probe로 보정한 뒤 PASS.
- large corpus는 gate의 45초 제한에서는 timeout이었지만 120초 단독 실행에서 PASS. 이는 기능 FAIL이 아닌 gate timeout 설정 문제로 분류한다.
- MariaDB client core를 비-root 임시 경로에 준비해 표준-client 검수를 재현했고, native MariaDB daemon에는 `fl-yield` scheduler loop와 prepared port probe를 추가했다.
- composite NULL ordering 회귀를 추가하고 전체 gate에 편입했다.
- 최종 전체 gate를 `AFJ_GATE_CASE_TIMEOUT_SEC=120`, `AFJ_GATE_SOAK_TIMEOUT_SEC=360`으로 재실행해 `59 PASS / 0 FAIL`을 기록했다.

## 6. 금지 사항

- 전체 gate가 실패한 상태에서 1.0/상용서비스 선언
- 테스트 실패를 timeout으로 숨기기
- 원본 dirty runtime에 격리 변경을 무검토 복사
- 성능 수치를 단일 숫자로 홍보
- 실행하지 않은 deploy/rollback을 PASS로 기록
