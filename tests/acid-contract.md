# ACID 계약

- active transaction의 write는 메모리 staged 상태다.
- COMMIT marker가 WAL에 append된 뒤 committed 상태가 된다.
- ROLLBACK transaction은 WAL commit 목록에 나타나지 않는다.
- replay는 commit marker가 있는 transaction만 복원 대상으로 반환한다.

현재는 단일 프로세스 commit 경계 기준선이다. fsync, 잠금, 동시성 장애
주입과 실제 row 적용은 후속 통합 단계다.
