# afj-db95 로드맵

## M0 — 메모리 관계형 코어

카탈로그, 테이블, CRUD, 조건 조회.

## M1 — 저장 엔진 (진행 중)

논리 WAL 이벤트와 재생, JSON Lines 파일 append/read 기준선을 구현했다.
페이지 헤더·길이·SHA-256과 파일 닫기 후 재오픈 복구 smoke test도 통과했다.
4096-byte page limit과 손상 WAL 차단(`WAL_CORRUPT`)도 통과했다.
`durable-store.fls`에서 fd_fsync prepare/commit, row 적용, torn prepare
제외 재복구까지 통합 검증했다.
마지막 torn WAL tail 무시는 구현했고, 중간 WAL 손상 거부까지 fault
injection 계약으로 검증했다. `fault-injection-restart.fls`에서 실제
FreeLang 프로세스를 강제 종료한 뒤 재시작해 committed row 보존과
미완료 prepare 폐기를 검증했다. 다음 작업은 대규모 장애 주입과 외부
호환성 corpus다.

## M2 — SQL

토큰화, CREATE/INSERT/SELECT/UPDATE/DELETE, 표현식, JOIN.

## M3 — 트랜잭션

BEGIN/COMMIT/ROLLBACK, 잠금, MVCC, 격리 수준.

## M4 — 서버·호환성

TCP 프로토콜, 인증, 사용자 권한, 백업·복구, 호환성 회귀 테스트.

95% 목표의 판정은 기능 목록과 MariaDB 호환성 테스트 통과율로 별도 측정한다.

## 상용 승격 경로 — 변경 금지 기준

상용화 출고 절차를 실제 운영 순서로 세분화한 정본은
[`commercial-9-stage-plan.md`](commercial-9-stage-plan.md)다.

기존 M0~M4는 기능 개발 순서이고, 상용 승격은 아래 경로를 따른다. 현재 위치는
`D 대기`다. A~C의 제한 프로파일 출구 조건을 충족했으며, D의 배포·재현
조건을 충족하기 전에는 상용 완료로 넘어가지
않으며, 새로 발견된 기능은 현재 묶음의 backlog에만 추가한다.

```text
S0 기준 고정
  ↓
A 데이터 정확성·트랜잭션
  ↓
B SQL/MariaDB 호환성 계약
  ↓
C 운영·보안·복구
  ↓
D clean clone·CI·배포·canary·rollback
  ↓
상용 후보 판정 → release artifact → 최종 승격
```

### S0 — 기준 고정

- 정본: `docs/commercial-readiness-matrix.md`
- 상태 분류: PASS / FAIL / BLOCKED / SIDE / UNRESOLVED
- 상용 필수 항목에 `BLOCKED`, `FAIL`, `UNRESOLVED`가 하나라도 있으면 승격 금지
- 자동 gate PASS 수는 보조 지표이며 상용 판정을 대체하지 않음

### A — 데이터 정확성·트랜잭션

- 범위: ACID, 격리, phantom/write skew, 장애 복구, 인덱스 재오픈·타입 정렬
- 출구: 손실·중복·오인 조회 0건, 재현 로그 보존, A 필수 행 BLOCKED 0

### B — SQL/MariaDB 호환성 계약 — 완료(제한 프로파일)

- 범위: 지원 문법·자료형·오류코드·prepared·auth plugin·charset
- 출구: 지원 목록 고정, 미지원 오류 고정, differential 결과가 문서 범위와 일치

### C — 운영·보안·복구 — 완료(검증 범위)

- 범위: 운영 관측, backup restore, 장애 리허설 (TLS 정본·인증·권한 포함)
- 출구: 다른 운영자가 복구·탐지·롤백 절차를 재현

### D — 배포·재현·최종 판정

- 범위: clean clone, CI, artifact hash, start/review/deploy/smoke/rollback,
  canary와 alert
- 출구: release artifact의 실제 smoke/rollback 증거와 지원 범위 승인

### 중단 규칙

- 기준 문서와 구현·테스트 결과가 다르면 `UNRESOLVED`로 멈춘다.
- 환경 차단은 제품 PASS로 바꾸지 않고 `BLOCKED(environment)`로 남긴다.
- 개별 결함 수정 직후 상용 판정을 갱신하지 않는다.
- 묶음 출구 검수 전에는 다음 묶음의 기능 개발을 시작하지 않는다.
