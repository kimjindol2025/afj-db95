# 원자적 커밋 계약

- prepare marker는 아직 적용된 commit이 아니다.
- commit marker와 prepare checksum이 일치할 때만 복구한다.
- commit marker가 없는 torn transaction은 복구하지 않는다.
- checksum이 다른 commit은 복구하지 않는다.

prepare/commit append는 `fd_fsync`를 호출해 OS 수준 durable flush를
요청한다. 실제 runtime 파일 테스트가 이 경계를 검증한다.
