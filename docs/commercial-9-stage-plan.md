# AFJ-DB95 상용화 9단계 계획

이 문서는 개발용 DB를 상용서비스로 승격하는 전체 출고 순서다.
각 단계는 실제 실행 증거가 있어야 PASS이며, 이전 단계가 BLOCKED인 상태에서
다음 단계를 상용 완료로 표시하지 않는다.

## 9단계 요약

| 단계 | 이름 | 핵심 질문 | 현재 상태 |
|---:|---|---|---|
| 1 | 기준·범위 고정 | 무엇을 지원하고 무엇을 지원하지 않는가? | PASS(문서 정합성 보완 중) |
| 2 | 데이터 정확성 | 장애·동시성에도 데이터가 틀리지 않는가? | PASS(검증 범위) |
| 3 | SQL/MariaDB 호환 | 지원 프로파일과 오류 계약이 실제로 일치하는가? | PASS(제한 프로파일) |
| 4 | 연결·보안 | 인증·권한·TLS·charset 경계가 안전한가? | PASS(검증 범위) |
| 5 | 운영 관측 | 상태·metrics·오류를 운영자가 볼 수 있는가? | PASS(계약 범위) |
| 6 | 백업·복구 | 장애 후 다른 운영자가 복구할 수 있는가? | PASS(검증 범위) |
| 7 | clean clone·클라우드 준비 | 새 환경에서 같은 artifact가 실행되는가? | PASS(clean clone) / BLOCKED(cloud) |
| 8 | 베타·canary·rollback | 작은 트래픽으로 배포하고 되돌릴 수 있는가? | PASS(local) / BLOCKED(cloud) |
| 9 | 상용 출고 판정 | 모든 증거가 모여 실제 출시 가능한가? | BLOCKED |

## 단계별 출구 조건

### 1. 기준·범위 고정

- 정본 판정표, 지원/미지원 SQL, 자료형, charset, auth plugin을 문서화한다.
- 프로젝트 지침·README·판정표의 단계와 숫자가 일치해야 한다.
- 산출물: `commercial-readiness-matrix.md`, 지원 범위 문서.

현재는 판정표가 있으나 프로젝트 `AGENTS.md`의 초기 메모리 코어 선언과
실제 TCP/WAL/TLS 구현 설명이 달라 문서 정합성 보완이 필요하다.

### 2. 데이터 정확성

- CRUD, MVCC, 트랜잭션, lock, WAL, 강제종료, 인덱스 재오픈을 검증한다.
- 손실·중복·오인 조회가 없어야 한다.
- 현재 증거: 전체 release gate의 A 회귀와 remediation `25/25 PASS`.

### 3. SQL/MariaDB 호환

- 지원 SQL은 parser → executor → TCP/wire까지 같은 결과여야 한다.
- 미지원 SQL은 조용히 오작동하지 않고 안정적인 오류를 반환해야 한다.
- 1차 상용 프로파일은 CRUD/WHERE/ORDER/GROUP/JOIN/COUNT, 제약,
  트랜잭션, prepared, MariaDB wire, UTF-8 charset ID 33/45로 고정한다.
- `utf8mb4_bin`, `utf8mb4_general_ci`, `utf8_general_ci`는 실행하고, 기타
  언어별 collation은 `COLLATION_NOT_SUPPORTED`로 거부한다.
- 미지원 SQL은 `UNSUPPORTED_SQL`로 거부한다. 서브쿼리/HAVING/CASE/UNION/
  날짜 함수와 전체 MariaDB 수치 오류코드 동치는 1차 상용 프로파일 밖이다.
- 종료 조건: 지원 프로파일 differential corpus, 지원표, 오류표가 모두 PASS.

### 4. 연결·보안

- root/user 인증, 권한 우회, lockout, session TTL, rate limit, timeout을 검증한다.
- wire charset은 현재 UTF-8 ID 33/45 범위로 고정한다.
- TLS 운영 정본은 native listener로 고정하고 adapter는 호환성 경로로 둔다.
- production 외부 bind, CA/mTLS, 인증서 reload/실패 주입, 평문 우회 차단은
  release gate에서 PASS했다.
- 종료 조건: CA/mTLS, 인증서 교체·만료·실패 주입, 권한 회수까지 재현.

### 5. 운영 관측

- `health`로 liveness/readiness를 확인한다.
- `metrics`로 queries/commits/rollbacks/errors를 확인한다.
- 오류 로그, 감사 로그, 임계치 alert, 장애 분류를 연결한다.
- health/metrics/threshold alert 계약과 운영 런북은 PASS 범위다. 외부 알림
  시스템 연결과 canary는 8단계에서 검증한다.

### 6. 백업·복구

- 정상 backup, 손상 backup 거부, restore 후 checksum·catalog·WAL 일치를 검증한다.
- 강제종료·torn WAL·인증 상태·TLS 설정 실패의 복구 절차를 문서화한다.
- [`docs/backup-restore-runbook.md`](backup-restore-runbook.md)의 명령과
  checksum/manifest 실패 분류로 다른 운영자가 복구 절차를 재현한다.

### 7. clean clone·클라우드 준비

- 새 clone에 고정 runtime을 연결하고 `start → check → test → artifact`를 실행한다.
- artifact hash, runtime version, 환경변수 계약, 포트·WAL 경로를 고정한다.
- 이 단계에서 처음 클라우드 실행 환경을 준비한다. 제품 계약이 고정되기
  전의 임시 클라우드 배포는 상용 증거로 인정하지 않는다.
- `.freelang` 계약을 추가했고 workspace clean clone에서 check, 전체 gate,
  artifact hash, smoke, rollback artifact 선택을 PASS했다. 실제 클라우드
  배포 권한·환경은 아직 없어 cloud 출구는 BLOCKED다.

### 8. 베타·canary·rollback

- 내부/소수 client로 canary를 실행한다.
- metrics 임계치 초과, 오류율 증가, WAL/디스크 이상을 alert로 감지한다.
- 이전 artifact로 실제 rollback하고 데이터 보존을 재검증한다.
- 종료 조건: canary → 장애 주입 → 탐지 → rollback → 복구 보고서.
- `.freelang/canary.sh`가 artifact hash, smoke, production native TLS,
  이전 artifact 선택을 로컬에서 재현한다. 실제 cloud traffic canary와
  외부 alert 연결은 운영 환경 권한이 필요하다.

### 9. 상용 출고 판정

- 1~8단계의 BLOCKED/FAIL/UNRESOLVED가 0이어야 한다.
- 전체 release gate, clean clone, artifact smoke, backup restore,
  rollback, 적대적 보안 리뷰 결과를 하나의 release report로 묶는다.
- 버전·artifact hash·지원 범위·운영 연락처·복구 절차를 승인한다.
- 이 단계가 끝나기 전에는 `1.0`이나 `상용서비스`를 선언하지 않는다.

## 현재 실행 순서

```text
3 SQL/MariaDB 계약 마무리
→ 4 연결·보안 운영 정본
→ 5 metrics/alert 계약
→ 6 복구 런북·검증
→ 7 clean clone·artifact·클라우드 준비
→ 8 canary·rollback
→ 9 최종 출고 판정
```

현재 첫 작업은 3단계의 남은 SQL 계약이지만, 프로젝트 runner가 없는 상태이므로
7단계의 clean clone 실행 계약도 병행 backlog로 추적한다.
