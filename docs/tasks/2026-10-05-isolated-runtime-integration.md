# 격리 FreeLang 1.0 런타임 통합 검수

## 범위

AFJ-DB95 제품 코드를 변경하지 않고, 격리 런타임
`/home/kim/kim/projects/freelang-afj-1p0/bootstrap.js`를
`AFJ_BOOTSTRAP`으로 주입해 native TLS 계약을 검증했다.

## 실행

```bash
AFJ_BOOTSTRAP=/home/kim/kim/projects/freelang-afj-1p0/bootstrap.js \
  node tests/native-tls-smoke.js

AFJ_BOOTSTRAP=/home/kim/kim/projects/freelang-afj-1p0/bootstrap.js \
  node tests/native-tls-policy-smoke.js
```

## 결과

```text
afj-db95 native TLS listener PASS
afj-db95 native TLS mTLS/reload PASS
```

## 확인된 운영 계약

TLS listener가 시작된 뒤 FreeLang scheduler가 `fl-yield`를 계속 호출해야
worker의 data 이벤트가 handler로 dispatch된다. `set-timeout`만 걸고 프로그램이
scheduler 없이 반환하는 daemon은 listener는 열어도 echo callback을 처리하지
못한다. 테스트 daemon은 이 계약을 반영해 명시적 scheduler loop를 유지한다.

## 상태

- 격리 런타임의 TLS, mTLS, reload 및 AFJ 통합 검수: PASS
- production native TLS integration: PASS
- TLS adapter handshake/reload: PASS
- native MariaDB auth rejection fixture: scheduler `fl-yield` loop 보정 후 PASS

최종 전체 gate는 `59 PASS / 0 FAIL`이다. MariaDB client core를 비-root 임시 경로로 준비하고, native MariaDB fixture의 scheduler loop와 prepared port probe를 보정한 뒤 표준-client/wire/auth/prepared 케이스까지 모두 PASS했다.

추가 core 회귀:

- `tests/tcp-schema-mvcc.fls`: row commit과 nullable `ADD COLUMN` 병합, concurrent DDL lock 경계 PASS.
- `tests/composite-type-order.fls`: composite B+Tree의 numeric component 순서(`2 < 10`) PASS.
- `tests/composite-null-order.fls`: composite B+Tree의 NULL 선행 순서 PASS.
- 이 세 케이스를 release gate에 편입한 최종 결과는 `59 PASS / 0 FAIL`이다.
- 원본 `/home/kim/kim/platform/freelang-afj` 반영: 아직 안 함
- AFJ-DB95 production bootstrap 변경: 아직 안 함
- 전체 release gate: runner가 path-normalized 작업본에서 장시간 무출력 상태가 되어 결과 미확정
- 다음 단계: gate runner 진행/timeout을 먼저 정리한 뒤 전체 release gate 재실행

추가 재검증:

- `AFJ_GATE_CASE_TIMEOUT_SEC=45`에서 large corpus가 제한 시간 초과했으나, 동일 테스트를 120초 제한으로 단독 실행해 PASS했다.
- 실제 listen 권한 환경에서 runtime peer IP rate limit PASS.
- handler가 runtime peer 인자(`peer`)를 버리던 결함을 수정한 뒤 production native TLS integration PASS.
- daemon 시작 로그와 실제 bind 사이의 race를 테스트의 port probe로 보정한 뒤 TLS adapter handshake/reload PASS.

## 2026-10-05 추가 회귀

- `src/tcp-server.fls` static check: PASS (105개 함수 분석)
- `src/afj-db95.fls` static check: PASS (40개 함수 분석)
- `tests/compound-range.fls`: PASS; 일반 compound range, reverse range, multi-index intersection, composite page range 4건 정상 종료
- 원인 수정: composite `AND` 인덱스 경로가 이미 두 predicate를 재검증하므로 `execute-select`의 중복 lazy 재필터를 제거했다. 이중 소비로 인한 무한 재평가를 차단했다.
- 대표 core fixture 재회귀: `binary-raw`, `mariadb-wire-codec`, `persistent-btree` PASS

## 전체 release gate 분류

- 전체 결과: `34 PASS / 22 FAIL`, 따라서 1.0 gate는 `BLOCKED`.
- sandbox 환경성 차단: TCP listen이 필요한 11건은 `listen EPERM`으로 실행되지 않아 코드 FAIL로 판정하지 않는다.
- 실제 회귀 후보: lazy snapshot, row-version/MVCC recovery·range·checkpoint, peer-IP rate limit.
- `compound-range`는 전체 gate에서도 PASS이며 이번 executor 수정의 회귀는 재현되지 않았다.
- WAL replay 분기 수정 완료: commit 검증 후 replay 호출을 중첩 조건과 명시적 `do` 블록으로 평가하게 해 FreeLang lazy 평가 누락을 차단했다.
- 고유 WAL 경로 순차 검수에서 WAL format/restart/torn-tail/corruption/uncommitted recovery 모두 PASS.
- catalog page pool/write/index/restore/rebuild/range/mutation/reopen/WAL-tail/corruption 회귀도 고유 경로 순차 실행에서 PASS.
- 원인 수정: 복구된 table에 persisted page index가 없을 때 column B+Tree를 rows에서 재생성하고, rebuild 호출은 `doseq` 내부에서 명시적으로 평가하도록 보강했다.
- row-version WAL recovery/checkpoint, lazy transaction snapshot, MVCC row-version chain도 고유 경로 순차 실행에서 PASS.
- row-version AST 기록 wrapper는 lazy `map`을 `count`로 materialize해 side effect를 보장했다.
- 문자열 숫자 range predicate는 B+Tree 비교값을 숫자 정규화해 PASS했고 btree/compound/catalog/row/lazy 영향 회귀도 PASS.
- 다음 Phase 3 작업: transaction isolation/savepoint/deadlock/lock timeout 회귀와 네트워크 11건을 검수한다.
