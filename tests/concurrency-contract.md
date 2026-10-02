# 동시성 계약

- 같은 resource의 다른 transaction은 잠금을 획득하지 못한다.
- 동일 transaction의 재획득은 성공한다.
- 소유 transaction은 모든 잠금을 해제할 수 있다.
- READ COMMITTED는 dirty read를 허용하지 않는다.
- REPEATABLE READ는 repeatable read를 보장한다.
- SERIALIZABLE은 phantom을 허용하지 않는다.
- 두 transaction의 순환 대기는 `DEADLOCK_DETECTED`로 중단한다.

`concurrent-engine.fls`에서 lock conflict를 실제 UPDATE 이전에 차단하고,
해제 후 UPDATE 성공까지 검증한다. 대기 큐·victim 선택·실제 MVCC
snapshot과의 완전한 다중 프로세스 통합은 후속 단계다.
