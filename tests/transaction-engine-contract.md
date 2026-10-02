# 트랜잭션 엔진 통합 계약

`transaction-engine.fls`는 트랜잭션 경계를 실제 `engine-catalog`에 적용한다.

- `BEGIN` 이전의 catalog snapshot을 보관한다.
- `execute-ast` 변경은 active transaction에서만 허용한다.
- `ROLLBACK`은 CREATE/INSERT 변경을 모두 제거한다.
- `COMMIT`은 엔진 변경을 보존한다.
- `SAVEPOINT` 및 `ROLLBACK TO`는 savepoint 이전 변경만 유지한다.

이 계약은 메모리 엔진 원자성을 검증한다. fd_fsync WAL 복구 보장은
`durable-store.fls` 계약에서 별도로 검증한다.
