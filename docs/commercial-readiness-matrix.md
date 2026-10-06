# AFJ-DB95 상용서비스 판정표

작성일: 2026-10-06 (KST)

이 문서는 AFJ-DB95의 상용서비스 여부를 판단하는 단일 기준표다. 자동 회귀
개수만으로 상용을 선언하지 않는다. 각 행의 증거가 실제 실행 결과로 채워지고,
`BLOCKED`가 0이 될 때만 상용 후보로 승격한다.

## 현재 판정

```text
개발용       PASS
사내 베타    BLOCKED
상용서비스   BLOCKED
1.0          BLOCKED
```

현재 release gate는 `70 PASS / 0 FAIL`이다. 이는 자동 회귀 관문 결과이며,
아래 운영·호환성·장애·배포 조건을 통과했다는 뜻이 아니다.

## 판정 규칙

- `PASS`: 명령, 환경, 결과 로그가 모두 보존된 실제 실행 증거가 있다.
- `FAIL`: 재현 가능한 제품·런타임·테스트 계약 결함이 있다.
- `BLOCKED`: 필요한 환경·소유자·정의가 없거나 실제 증거가 아직 없다.
- `SIDE`: 상용 본체에서 분리해도 되는 기능이다. SIDE는 상용 필수 조건을
  면제하지 않으며, 지원 범위를 문서에 명시해야 한다.
- `UNRESOLVED`: 결과가 서로 충돌해 먼저 기준을 정리해야 한다.

## 상용 필수 판정표

| 영역 | 상용 요구사항 | 현재 상태 | 증거/문서 | 소유 묶음 |
|---|---|---:|---|---|
| 저장·복구 | 정상/강제종료/손상 WAL 후 커밋 데이터 보존 | PASS(범위 내) | `tests/release-gate.sh`, WAL·backup 회귀 | A |
| 트랜잭션 | ACID, lost update, dirty read, phantom, write skew | PASS(검증 범위) | MVCC·격리·phantom/write-skew·강제종료 회귀 및 전체 gate | A |
| 인덱스 | 정렬·복합키·NULL·타입·재오픈 결과 일치 | PASS(바이너리 정렬 범위) | schema-aware equality/range·혼합 타입·구형 재구축 회귀 및 전체 gate | A |
| SQL 호환 | 제한 프로파일의 문법·자료형·오류 토큰 및 differential 결과 | PASS(제한 프로파일) | 70-case gate, `COLLATE` 제한 계약, `UNSUPPORTED_SQL`/AFJ 오류 토큰 | B |
| 프로토콜 | 지원 client, prepared, 오류·charset·capability 계약 | PASS(검증 범위) | MariaDB standard/native client, prepared, UTF-8 ID 33/45, mysql_native_password | B |
| 인증·권한 | 권한 우회·세션 만료·lockout·감사 로그 | PASS(검증 범위) | release gate auth/session cases | C |
| TLS | 외부 bind, CA/mTLS, reload, 만료·오류·평문 우회 차단 | PASS(검증 범위) | native TLS를 상용 정본으로 고정; production integration/mTLS/reload/boundary PASS | C |
| 운영 | health, metrics, 로그, 설정 검증, 용량·제한 | PASS(계약 범위) | health/metrics/threshold alert 및 `operations-runbook.md`; 외부 알림 연결은 배포 범위 | C |
| 백업 | 운영 snapshot, 복원, 복원 후 무결성·절차 리허설 | PASS(검증 범위) | backup/restore/fault-injection gate 및 `backup-restore-runbook.md` | C |
| 배포 | clean clone build/start/smoke/rollback 실제 실행 | BLOCKED | `.freelang` check/test/artifact/smoke/rollback 계약 추가; clean clone·실서버 실행 미완료 | D |
| 관측 | canary, 알림, 장애 분류, rollback 판단 기준 | BLOCKED | 자동 테스트 로그 외 운영 관측 증거 없음 | D |
| 재현성 | clean clone·고정 runtime·CI에서 동일 결과 | PASS(clean clone) | workspace clean clone `READY=YES`, 70-case gate 70 PASS / 0 FAIL | D |
| 보안 리뷰 | 적대적 코드 리뷰, 데이터 손실·중복·오인 조회 검증 | BLOCKED | 일부 회귀만 존재; 독립 리뷰 보고서 없음 | D |
| 문서·지원 | 지원/미지원 기능, 제한, 복구·롤백 절차 공개 | UNRESOLVED | `README`, `official-db-plan`, `release-readiness-plan` 시점 불일치 | D |

## 작업 묶음

### A — 데이터 정확성·트랜잭션 — 완료

목표: 장애와 동시성에서 데이터가 틀리지 않는다는 증거 확보.

- write skew, phantom, 다중 세션 rollback/재시작, 인덱스 재오픈 일치성
- 복합키 바이너리 정렬·혼합 SQL 타입·NULL 정책을 명시하고 테스트
- PASS 기준: 재현 명령과 결과 로그가 있고 데이터 손실·중복·오인 조회 0건

collation 언어별 규칙은 B에서 지원 범위를 고정한다. 현재 `utf8mb4_bin`과
`utf8mb4_general_ci`/`utf8_general_ci`만 실행 지원하고, 기타 언어별 collation은
`COLLATION_NOT_SUPPORTED`로 명시 거부한다.

### B — 호환성 계약

목표: “MariaDB 호환”이라는 넓은 표현을 지원 범위로 축소·고정.

- 지원 SQL/자료형/오류코드/prepared/auth plugin 목록 확정
- unsupported 기능은 예측 가능한 오류와 문서로 고정
- PASS 기준: differential corpus와 실제 client 결과가 문서 범위 안에서 일치

### C — 운영·보안

목표: 개발자가 직접 조작하지 않아도 안전하게 운영 가능한 경계 확보.

- TLS 운영 방식 하나를 정본으로 선택하고 native/adapter를 혼용하지 않음
- 백업 복원, 인증서 교체, 권한 회수, 감사 로그, rate/timeout 장애 리허설
- PASS 기준: 실패 주입 후 탐지·복구·롤백 절차를 다른 사람이 재현

### D — 배포·재현·최종 판정

목표: 새 clone에서 같은 결과가 나오고, 실패 시 되돌릴 수 있음.

- clean clone CI gate
- `start → review → deploy → smoke → rollback` 계약 확정
- canary, metrics, alert, rollback rehearsal
- 문서 충돌 제거 및 최종 지원 범위 공개
- PASS 기준: 상용 후보 release artifact, hash, smoke, rollback 증거 보존

## 승격 조건

다음 조건을 모두 만족하기 전에는 상용서비스나 1.0을 선언하지 않는다.

```text
A/B/C/D의 상용 필수 행: BLOCKED 0, FAIL 0, UNRESOLVED 0
clean clone CI: PASS
release artifact smoke: PASS
backup restore rehearsal: PASS
rollback rehearsal: PASS
적대적 리뷰: 종료
지원/미지원 범위 문서: 승인
```

## 진행 방식

각 묶음은 개별 기능 하나가 아니라 묶음의 종료 조건을 한 번에 검수한다.
중간에 발견된 결함은 해당 묶음의 backlog에 누적하며, 결함 하나를 고칠 때마다
상용 판정을 갱신하지 않는다. 묶음 종료 시에만 전체 상태표와 증거를 갱신한다.

현재 실행 위치는 `C 진입`이다. B는 제한 상용 프로파일과 미지원 오류 계약을
70-case gate로 닫았으며, 다음은 C의 운영·보안 출구 조건이다. 각 묶음의
담당 파일·명령·예상 산출물은
이 문서와 [`docs/roadmap.md`](roadmap.md)에 기록한다.
