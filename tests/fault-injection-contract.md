# WAL 장애 주입 계약

`durable-store.fls`는 다음 비정상 종료 시나리오를 검증한다.

- committed prepare/commit 이후 마지막 prepare JSON이 잘려도 committed
  row는 유지한다.
- WAL 중간의 손상 레코드는 조용히 건너뛰지 않고 `WAL_CORRUPT`로 거부한다.
- checksum이 다른 commit marker와 commit 없는 prepare는 적용하지 않는다.

## 실제 프로세스 종료 회귀

`fault-injection-restart.fls`는 첫 실행에서 `fd_fsync`된 committed row와
commit marker가 없는 prepare row를 기록하고 대기한다. 테스트 harness가 첫
프로세스를 강제 종료한 뒤 같은 파일을 두 번째 실행하면 committed row만
복구되어야 한다.
