# AFJ-DB95 개발용 → 상용서비스 전환 계획

- 작성일: 2026-10-05 (KST)
- 기준 저장소: `kimjindol2025/afj-db95`
- 추적 이슈: [#1 P0 복합 키 정확성 및 릴리스 게이트 회복](https://github.com/kimjindol2025/afj-db95/issues/1)
- 원칙: 날짜가 아니라 실제 검수 결과로 단계 전환

## 현재 판정

### 개발용 — 현재 가능

로컬에서 SQL/DDL, WAL, 복합 인덱스, 복합 범위 회귀를 실행하고 기능을 개발할 수
있다. 복합 키 충돌 수정은 targeted 검수에서 확인했지만, 저장소 경로 재현성과
외부 TCP 경로는 아직 개발 단계의 차단 항목이다.

### 사내 베타 — 아직 차단

다음 조건을 모두 PASS해야 한다.

- [x] 외부 TCP client의 login/query/close smoke — path-normalized 임시 복제본에서 PASS
- [x] 10초 축약 soak PASS — writes=72, throughput=7.20/s, p95=1233ms, max=1462ms
- [x] 5분 performance envelope PASS — writes=1272, throughput=4.24/s, p95=2288ms, max=2977ms
- [ ] WAL forced-kill 및 backup/restore PASS
- [ ] CI에서 동일 검수를 새 clone 기준으로 재현

### 상용서비스 — 아직 차단

사내 베타 조건에 더해 다음을 모두 PASS해야 한다.

- [ ] 전체 release gate 자동 실패 0건
- [ ] TLS/mTLS·인증·권한·rate limit·timeout 운영 검수
- [ ] crash/restart/backup restore 및 복구 절차 리허설
- [ ] MariaDB 호환 범위와 미지원 기능의 공개 문서화
- [ ] canary 환경에서 실제 외부 client와 관측·롤백 검증
- [ ] 데이터 손실·중복·오인 조회에 대한 적대적 리뷰 종료

## 진행 순서

### 1단계 — runtime TCP 경계(P0)

초기 외부 TCP login timeout의 원인은 runtime worker-ring 자체가 아니라
`tcp-server-raw`의 3인자 핸들러 계약과 AFJ-DB95의 4인자 핸들러 정의 불일치였다.
핸들러를 `handler(event, conn, payload)`로 맞춘 뒤 path-normalized 임시 복제본에서
login과 10초 soak이 통과했다. AFJ runtime 저장소에는 사용자 변경사항이 있으므로
현재 작업에서는 그 저장소를 덮어쓰지 않는다.

완료 조건:

```text
외부 TCP login → query → close PASS (path-normalized 임시 복제본)
단일 client 10초 soak PASS
```

### 2단계 — 성능·복구(P0/P1)

- 5분 soak p95/max threshold PASS
- forced-kill WAL recovery PASS
- backup/restore soak PASS
- row-version/checkpoint recovery PASS

### 3단계 — 전체 게이트·CI(P1)

- `AFJ_BOOTSTRAP`을 지정한 새 clone preflight PASS
- `tests/release-gate.sh` 전체 실행
- 자동 실패 0건
- 결과 리포트와 미완료 architectural blocker 분리

### 4단계 — 베타 운영(P2)

- loopback canary
- 외부 client 1종 이상
- metrics/log/alert
- backup restore rehearsal
- rollback rehearsal

### 5단계 — 상용 판정

모든 상용 조건이 실제 실행 결과로 PASS일 때만 상용서비스 판정을 내린다.
그 전에는 `DEVELOPMENT` 또는 `PRIVATE_BETA`로 명시한다.

## 이번 실행 범위

이번 턴에는 계획을 문서화한 뒤 1단계의 사전 조사와 런타임 경계 재현까지 진행한다. dirty 상태인
`platform/freelang-afj`는 기존 사용자 변경사항을 보존하기 위해 수정하지 않는다.

## 2026-10-05 실행 기록

- `platform/freelang-afj`는 `bootstrap.js`, `src/eval-builtins.ts` 및 다수 파일이
  dirty 상태임을 확인했다.
- `tcp-server-raw`/`fl-yield` 구현은 현재 runtime의 dirty 작업 트리와 결합돼 있어,
  AFJ-DB95 쪽에서 추측으로 수정하지 않는다.
- AFJ-DB95의 외부 login timeout은 `afj-db-tcp-handler`가 4개 인자를 요구했지만
  runtime이 3개만 전달해 callback dispatch가 실패한 것이 원인이었다.
- 핸들러를 3개 인자로 수정한 뒤 최소 TCP smoke와 10초 soak이 PASS했다.
- 깨끗한 AFJ runtime HEAD 후보에서는 테스트 파일 기준 `load` 해석이 달라,
  AFJ-DB95의 상대 `load` 경로를 기계적으로 바꾸는 방식이 호환되지 않음을 확인했다.
  따라서 `.fl` 소스 경로 제거는 단순 치환이 아니라 runner/runtime 계약으로 다시 설계해야 한다.
- 다음 실행 단위는 runtime 변경 소유자와 경계를 정한 뒤, 깨끗한 runtime 후보에서
  `tcp-server-raw → fl-yield → handler` 최소 smoke를 통과했으므로, 다음은 5분
  performance envelope와 전체 release gate 재실행이다.

현재 게이트 요약:

```text
계획 문서화                 PASS
복합 키 targeted 검수       PASS (기존 dirty runtime에서 재현된 결과)
외부 TCP login/query/close   PASS (임시 복제본)
10초 soak                   PASS (임시 복제본)
5분 performance envelope    PASS (임시 복제본)
전체 release gate           BLOCKED — case별 logging 적용 후 별도 실패 확인
상용서비스 판정             BLOCKED
```
