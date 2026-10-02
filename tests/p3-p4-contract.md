# P3/P4 계약

## 인덱스

현재 hash index와 ordered B+Tree로 키→행 ID 매핑을 검증한다. unique-key
갱신(`btree-put`)과 secondary-index 중복 키 보존(`btree-add`)을 분리했고,
`indexed-engine.fls`에서 실제 엔진 행 조회와 full scan 결과를 비교한다.
페이지-backed B+Tree와 UNIQUE/PRIMARY KEY 제약의 저장 엔진 통합은 후속
릴리스 게이트다. `indexed-wal.fls`는 add/remove 증분 이벤트의 fd_fsync
재생 기준선을 제공하고, `indexed-transaction.fls`는 catalog와 index의
rollback/commit 원자성을 검증한다.

## 트랜잭션

현재 상태 머신은 BEGIN, 쓰기 목록, SAVEPOINT, ROLLBACK TO, COMMIT,
ROLLBACK의 상태 전이를 검증한다. `transaction-engine.fls`는 실제
`engine-catalog`에 snapshot/restore를 적용해 CREATE/INSERT 변경의
COMMIT·ROLLBACK·SAVEPOINT 결과까지 검증한다. fd_fsync 복구와 잠금·MVCC·
격리 수준은 각각 별도 계약에서 검증한다.
