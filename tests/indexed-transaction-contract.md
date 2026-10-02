# 인덱스·트랜잭션 원자성 계약

`indexed-transaction.fls`는 engine catalog와 secondary B+Tree를 같은
트랜잭션 snapshot으로 관리한다.

- rollback은 row와 index entry를 함께 제거한다.
- commit은 중복 키 row와 row-id 인덱스를 함께 보존한다.
- 인덱스 누수와 catalog 누수를 각각 독립적으로 검사한다.

fd_fsync WAL의 내구성은 `durable-store.fls`/`indexed-wal.fls` 계약에서
별도로 검증한다.
