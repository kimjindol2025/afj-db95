# Durable row/index bundle 계약

`durable-bundle.fls`는 row와 secondary-index 이벤트를 하나의
prepare/commit checksum bundle로 기록한다.

- prepare/commit은 `fd_fsync`한다.
- commit 없는 torn prepare는 row와 index 모두 복구하지 않는다.
- committed row와 index는 함께 재생된다.
