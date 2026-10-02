# 증분 인덱스 WAL 계약

`indexed-wal.fls`는 secondary B+Tree 변경을 append-only WAL로 기록한다.

- add/remove 이벤트는 `fd_fsync` 후 적용한다.
- 중복 키 row-id를 보존한다.
- 재오픈 시 모든 이벤트를 재생해 같은 B+Tree를 복원한다.
- remove 이벤트는 지정한 key/row-id만 제거한다.
