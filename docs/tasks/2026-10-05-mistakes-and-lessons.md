# 2026-10-05 AFJ-DB95 검수 실수 모음

목적: 이번 1.0 검수에서 발생한 실수와 재발 방지 규칙을 다음 작업의 체크리스트로 남긴다.

## 1. 계획보다 먼저 전체 gate를 실행함

- 실수: Phase 1 exit criteria와 Phase 2 runtime 계약 정리가 완전히 닫히기 전에 전체 release gate를 실행했다.
- 결과: 환경 차단, 실제 회귀, 아직 분류하지 않은 실패가 한 결과에 섞여 계획이 흔들렸다.
- 교훈: 다음부터는 `phase exit → targeted regression → 다음 phase` 순서를 지키고, 전체 gate는 Phase 6에서만 실행한다.

## 2. 공유 WAL/page 경로로 테스트를 병렬 실행함

- 실수: recovery 테스트 여러 개를 기본 `/tmp/afj-db95-tcp-catalog.wal`로 동시에 실행했다.
- 결과: 서로의 WAL을 읽어 `WAL_CORRUPT` 같은 가짜 실패가 발생했다.
- 교훈: recovery 테스트는 기본 경로를 사용하지 않는다. 각 테스트에 고유한 `AFJ_DB_WAL`, `AFJ_DB_CATALOG_PAGES`를 주고 순차 실행한다.

## 3. sandbox의 listen 차단을 코드 FAIL처럼 해석함

- 실수: `listen EPERM`을 초기 gate 결과에서 FAIL로 집계했다.
- 결과: 실제 코드 회귀와 실행 환경 BLOCKED가 같은 숫자에 들어갔다.
- 교훈: `listen EPERM`, 권한, 외부 서비스 부재는 `BLOCKED(environment)`로 별도 분류한다. 실제 listen 가능한 승인 환경에서 재검수한다.

## 4. 임시 디버그를 수정 중 남김

- 실수: `.fls`에 DEBUG 출력과 임시 debug fixture를 여러 차례 추가했다.
- 결과: 괄호 누락으로 parse failure가 생겼고, 테스트 출력이 판단을 방해했다.
- 교훈: 임시 계측은 한 파일에서만 하고, 계측 직후 `rg DEBUG`, `git diff --check`, syntax check를 실행한다. 임시 파일은 같은 작업 단위에서 제거한다.

## 5. lazy 값에 `arr_flatten`을 바로 적용함

- 실수: composite query의 lazy 결과를 `arr_flatten [value]`로 materialize하려 했다.
- 결과: 일반 compound query가 오히려 첫 query에서 멈췄다.
- 교훈: FreeLang lazy collection은 자료형별로 실제 소비 방법을 확인한다. 작은 재현 → 한 가설 → targeted test 순서로 검증하고, map/filter 결과를 JSON 왕복이나 무분별한 flatten으로 처리하지 않는다.

## 6. 디버깅 중 조건을 임시로 바꾸고 즉시 확인하지 않음

- 실수: debug patch 과정에서 composite equality branch의 `index != nil` 조건이 빠졌다.
- 결과: 의도하지 않은 diff가 생겼고, 뒤늦게 diff review에서 발견해 원복했다.
- 교훈: 매 patch 직후 `git diff -- <file>`와 해당 파일의 targeted check를 실행한다. 디버그 수정과 기능 수정은 별도 patch로 유지한다.

## 7. 문서 상태를 코드 상태보다 늦게 갱신함

- 실수: 계획 문서에는 Phase 0~1 상태가 남아 있는데 실제 작업은 Phase 2/3 blocker까지 진행됐다.
- 결과: 무엇이 완료됐고 다음 작업이 무엇인지 문서만 보고는 정확히 알 수 없었다.
- 교훈: 각 phase exit 또는 blocker 변경 직후 문서에 `상태·명령·결과·남은 blocker`를 갱신한다.

## 현재 재발 방지 기준

```text
phase exit 확인
→ 고유 temp 경로 준비
→ 순차 targeted test
→ diff/check/debug 잔여 검사
→ 문서 갱신
→ 다음 phase로 이동
```

현재 고유 경로 재실행 결과: WAL, catalog page, lazy snapshot, row-version recovery/checkpoint, MVCC, compound range 모두 PASS.
`tcp-range-predicate`도 B+Tree 비교값을 executor와 같은 숫자 정규화로 맞춘 뒤 PASS했다. sandbox listen BLOCKED 항목은 아직 남아 있다.

추가 Phase 3 재실행: transaction isolation, savepoint, deadlock, lock timeout, backup restore, auth lockout/reset/recovery, session cleanup/TTL 모두 PASS.

## 8. listener 준비 신호를 실제 bind 완료로 오해함

- 실수: daemon의 `TCP server STARTED` 출력만 기다리고 즉시 TLS client를 연결했다.
- 결과: 비동기 worker가 실제 포트를 bind하기 전 연결해 `ECONNREFUSED`가 발생했다. production TLS와 TLS proxy 통합이 같은 이유로 실패했다.
- 교훈: 네트워크 통합 테스트는 애플리케이션 시작 로그와 별도로 실제 포트 probe를 통과해야 한다. 제품 실패와 fixture race를 분리한다.

## 9. peer 메타데이터를 handler에서 버림

- 실수: runtime의 `(event conn payload peer)` 계약을 구현해 놓고 AFJ handler를 3개 인자로 유지했다.
- 결과: 실제 TCP에서는 peer 주소가 저장되지 않아 IP별 rate limit이 연결별 limit으로 동작했다.
- 교훈: runtime callback 시그니처 변경은 제품 handler, 직접 호출 fixture, 실제 socket smoke를 한 묶음으로 재검증한다.

현재 재검증 결과: peer IP rate limit, runtime peer IP rate limit, production native TLS integration, TLS adapter handshake/reload, large corpus 모두 PASS.

## 10. native MariaDB fixture에서 scheduler tick을 빠뜨림

- 실수: `native-mariadb-daemon.fls`가 raw listener를 시작한 뒤 `fl-yield` 없이 타이머만 실행했다.
- 결과: 외부 client가 handshake 응답을 받지 못해 auth가 timeout됐다.
- 교훈: runtime IO worker를 사용하는 모든 daemon fixture는 `fl-yield` 소비 루프와 실제 port probe를 함께 가져야 한다.

수정 후 native MariaDB auth rejection과 prepared를 실제 listen 환경에서 PASS했다. MariaDB client core는 root 없는 임시 경로로 준비해 표준-client 케이스도 재현했다.

최종 재검증: schema MVCC 및 composite numeric/NULL type-order 회귀를 gate에 편입한 뒤 전체 release gate `59 PASS / 0 FAIL`. full composite collation/혼합 타입 compatibility는 별도 1.0 조건으로 남아 있다.
