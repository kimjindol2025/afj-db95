# 엔진 동시성 통합 계약

`concurrent-engine.fls`는 lock manager 결과를 실제 엔진 변경 전에 검사한다.

- 다른 transaction이 X lock을 보유하면 UPDATE가 `LOCK_CONFLICT`로 거부된다.
- 충돌 거부 시 engine row는 변경되지 않는다.
- 소유자가 lock을 release하면 다음 transaction의 UPDATE가 성공한다.
- deadlock cycle 검출은 `locking.fls` 계약과 함께 유지된다.
