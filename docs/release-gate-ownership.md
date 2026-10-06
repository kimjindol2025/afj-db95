# Release Gate 실패 소유권 매트릭스

정본 gate 실행: 2026-10-06T16:24:11Z, `60 PASS / 11 FAIL`, 전체 판정
`BLOCKED` ([release-gate-report.md](release-gate-report.md)). 이 수치는
보고서에 기록된 실행 결과이며, 환경 의존 실패를 임의로 제외하지 않는다.
`59 PASS / 0 FAIL`은 현재 결과가 아니다. 별도 실행 증거와 시각이 확인되지
않았으므로 최신/정본 수치로 사용하지 않는다. 아래 historical baseline은
해당 시점의 원인 분류용으로만 유지한다.

이 문서는 실패 수를 누적하지 않고, 어느 저장소·환경에서 계약을 완성해야
하는지 고정한다. 소유자가 다른 영역의 코드를 추측 수정하지 않는다.

## 소유권

| Case | 분류 | 1차 소유자 | 현재 근거 | 완료 조건 |
|---|---|---|---|---|
| 9, 60–62 | runtime 계약 / 구조적 미완료 | `/home/kim/kim/platform/freelang-afj` | canary와 native TLS 경로에서 `tcp-server-tls` 미정의 | listener, mTLS, reload 정의·등록 및 runtime regressions PASS |
| 25 | 성능 실행 FAIL / 원인 미확정 | AFJ-DB95 TCP soak + 실행 환경 | 5분 envelope에서 `soak request timeout: login` | 재현 가능한 동일 조건 실행에서 p95/max 기준 충족 |
| 63 | adapter integration FAIL | `afj-db95/tools/afj-tls-proxy.js` + test | handshake/reload 응답이 빈 문자열 | adapter test가 기대 pong 응답을 수신 |
| 64 | wire unit FAIL / 원인 미확정 | `afj-db95/tests/mariadb-wire-unit.js` | unit case 실패. 인수인계에 구체 원인 로그 없음 | 실패 로그 회수 후 원인 수정 및 unit PASS |
| 67 | 환경 blocker | 실행 환경/CI image | `mariadb` 실행 파일 부재: `spawn mariadb ENOENT` | `mariadb --version` 및 standard-client smoke가 같은 환경에서 PASS |
| 68–69, 71 | 공동 진단 / 구조적 미완료 | AFJ-DB95 MariaDB adapter + runtime/환경 | wire/auth/prepared 경로 timeout·응답 부재 또는 client boundary 실패; 원인 분리 증거 부족 | handshake → auth → prepared를 각각 분리 재현하고 각 요구 테스트 PASS |

실패 수는 소유권 행의 그룹 수가 아니라 정본 report의 개별 case 표를 따른다.
현재 기록된 11개 FAIL은 9, 25, 60–64, 67–69, 71이다.

## 실행 순서

1. 환경 확인: `command -v mariadb mariadb-admin mariadbd`와 버전 기록.
2. case 9/60–62 runtime 확인: `tcp-server-tls` 정의·등록 여부를 AFJ runtime
   자체 테스트로 확정.
3. AFJ-DB95 test harness: case 48 adapter handshake를 단독 재현한다.
4. MariaDB 진단은 case 64 unit log 확인 후 case 67 client dependency,
   cases 68–69 wire/auth, case 71 prepared를 각각 분리해 기록한다.
5. 소유자별 수정이 끝난 뒤에만 전체 release gate를 재실행한다.

## 중복 방지 규칙

- 이미 PASS한 core·복구·기타 회귀 case는 소유자 변경이 없으면 재실행하지 않는다.
- TCP 5분 성능 case는 정본 실행에서 FAIL(`soak request timeout: login`)이다.
  이전 문서의 PASS 설명을 근거로 재분류하지 말고, 원인 변경 시에만 targeted 재검증한다.
- 실패 case는 원인 가설과 소유자가 바뀐 경우에만 다시 실행한다.
- `auth-query` 커밋은 현재 `main`에 있지만 기존 TCP 계약의 release-gate case가
  아니므로 gate PASS 수에 포함하지 않는다.
- 모든 수정은 해당 소유자 runtime/test와 AFJ-DB95 gate의 두 단계 증거를 남긴다.

## 현재 판정

`DEVELOPMENT` 유지. 정본 결과는 `60 PASS / 11 FAIL`, release gate는
`BLOCKED`; 사내 베타와 상용서비스 승격은 보류한다. 11건은 테스트 결과상의
FAIL이며, 각각의 제품·runtime·환경 원인은 분리해서 추적한다. 특히 `mariadb`
실행 파일 부재와 일부 timeout은 환경 요인이 확인됐거나 아직 분리되지 않은
상태지만, 이를 PASS로 바꾸지 않는다. `tcp-server-tls` 미정의와 미완료
TLS/MariaDB 요구는 구조적 미완료로 계속 기록한다.

`8f171b6`의 내부 배포 계약은 개발용 내부 배포 범위다. 그 계약의 check/smoke/
deploy 결과는 이 상용 release gate의 PASS 근거로 계산하지 않는다.
