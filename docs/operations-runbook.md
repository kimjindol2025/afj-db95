# AFJ-DB95 운영 검수 런북

현재 Native 상용 판정은 HOLD이며 운영 배포는 승인되지 않았다. 아래 절차의
존재는 실제 운영 리허설 완료를 뜻하지 않는다. 실행 근거는
[최신 전체 진단](NATIVE-RELEASE-20261120.md)과
[커밋 불확실성 검증](NATIVE-COMMIT-HEALTH.md)을 따른다.

## 상태 확인

운영 listener에 다음 JSON을 newline으로 전송한다.

```json
{"type":"health"}
{"type":"metrics"}
```

`health.ok=true`, `health.status=running`, `health.wal=true`가 readiness
조건이다. metrics의 `queries`, `commits`, `rollbacks`, `errors`를 수집하고
`alerts`에 `ERROR_RATE_HIGH`가 있으면 오류율 상승으로 분류한다. 그 기준은
`errors >= 5`다. `STORAGE_RECOVERY_REQUIRED`는 오류 개수와 관계없이 저장소
접근 차단을 뜻한다. 실제 외부 알림 시스템의 연결은 배포 환경 소유자가
붙이는 별도 작업이다.

커밋 결과가 불확실하면 health는 `ok:false`, `status:recovery-required`,
`commit-outcome:unknown`, `retryable:false`, `restart-required:true`와 실패
단계를 반환한다. listener가 살아 있어도 readiness 실패다. 이후 SQL 및
트랜잭션 요청은 `STORAGE_RECOVERY_REQUIRED`로 거부된다.

## 장애 대응

1. health를 확인해 WAL 상태와 listener 생존을 구분한다.
2. metrics의 errors/rollbacks와 audit log를 같은 시각 범위로 보존한다.
3. 쓰기 장애는 새 쓰기를 중단하고 WAL·디스크 용량을 보존한다.
4. 백업 복원 런북을 실행한 뒤 복원된 checksum과 샘플 조회를 확인한다.
5. canary/rollback 환경에서는 이전 artifact로 되돌린 뒤 같은 health/metrics
   검수를 다시 실행한다.

### COMMIT_OUTCOME_UNKNOWN 처리

1. 클라이언트는 해당 요청을 성공이나 확정 실패로 기록하지 않는다. 자동
   재시도를 멈추고 요청 내용, 마지막으로 확인된 ACK, 오류 시각을 보존한다.
2. 이 프로세스에서 읽기·쓰기·ROLLBACK·live recovery를 재시도하지 않는다.
   메모리 복원은 디스크 커밋 취소를 뜻하지 않는다. WAL 커밋이 이미 기록되어
   새 프로세스 복구 후 요청 결과가 나타날 수 있다.
3. 운영 소유자는 저장소와 I/O 장애 원인을 확인하고 WAL, 현재/이전 manifest,
   참조 세대 및 오류 근거를 함께 보존한다. WAL 삭제, 빈 DB로 초기화, 최신
   manifest만 복사하거나 임의로 이전 manifest를 덮어쓰는 복구는 금지한다.
4. 원인을 해결한 뒤 새 프로세스로 정상 복구한다. 복구 실패 시 파일을
   보존하고 일관된 백업·복구 절차를 따른다. 기존 프로세스의 상태 차단을
   해제하는 API나 자동 재시작은 이 변경에 포함되지 않는다.
5. 복구된 데이터와 마지막 ACK, 결과 불명 요청을 대조해 반영 여부를 확인한다.
   현재 요청 프로토콜은 멱등 재시도 키를 제공하지 않으므로 단순 재전송을
   중복 방지 절차로 취급하지 않는다. readiness와 데이터 확인 후에만 서비스
   재개를 판단한다. 실제 운영 서비스 제어는 별도 승인 범위다.

이 절차는 TCP SQL 경로의 scoped 검증에 근거한다. 다중 writer 소유권,
저장소 root 식별, 디스크 용량 제한, 물리적 전원 장애 및 운영 복구 리허설은
아직 완료되지 않았다.

## 기존 AFJ/Node 검수 명령 이력

다음 명령은 기존 실행 경로의 이력이며 Native 검수 완료 근거가 아니다.
현재 Native 원본 게이트와 실패 분류는 최신 전체 진단 문서를 따른다.

```bash
node "$AFJ_BOOTSTRAP" run tests/metrics-contract.fls
node "$AFJ_BOOTSTRAP" run tests/tcp-health-smoke.fls
```

