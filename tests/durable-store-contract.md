# 통합 durable store 계약

- COMMIT은 prepare와 commit marker를 모두 `fd_fsync` 후 기록한다.
- commit marker와 checksum이 맞는 write만 catalog에 적용한다.
- commit 없는 prepare는 재시작 복구에서 사라진다.
- 실제 row 결과는 file WAL 재생 후에도 유지된다.
- checksum이 다른 commit marker는 적용되지 않는다.
