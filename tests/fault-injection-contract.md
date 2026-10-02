# WAL 장애 주입 계약

`durable-store.fls`는 다음 비정상 종료 시나리오를 검증한다.

- committed prepare/commit 이후 마지막 prepare JSON이 잘려도 committed
  row는 유지한다.
- WAL 중간의 손상 레코드는 조용히 건너뛰지 않고 `WAL_CORRUPT`로 거부한다.
- checksum이 다른 commit marker와 commit 없는 prepare는 적용하지 않는다.
