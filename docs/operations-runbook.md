# AFJ-DB95 운영 검수 런북

## 상태 확인

운영 listener에 다음 JSON을 newline으로 전송한다.

```json
{"type":"health"}
{"type":"metrics"}
```

`health.ok=true`, `health.status=running`, `health.wal=true`가 readiness
조건이다. metrics의 `queries`, `commits`, `rollbacks`, `errors`를 수집하고
`alerts`에 `ERROR_RATE_HIGH`가 있으면 오류율 상승으로 분류한다. 현재 기본
alert 기준은 `errors >= 5`이며, 실제 외부 알림 시스템의 연결은 배포 환경
소유자가 붙이는 별도 작업이다.

## 장애 대응

1. health를 확인해 WAL 상태와 listener 생존을 구분한다.
2. metrics의 errors/rollbacks와 audit log를 같은 시각 범위로 보존한다.
3. 쓰기 장애는 새 쓰기를 중단하고 WAL·디스크 용량을 보존한다.
4. 백업 복원 런북을 실행한 뒤 복원된 checksum과 샘플 조회를 확인한다.
5. canary/rollback 환경에서는 이전 artifact로 되돌린 뒤 같은 health/metrics
   검수를 다시 실행한다.

## 검수 명령

```bash
node "$AFJ_BOOTSTRAP" run tests/metrics-contract.fls
node "$AFJ_BOOTSTRAP" run tests/tcp-health-smoke.fls
```

