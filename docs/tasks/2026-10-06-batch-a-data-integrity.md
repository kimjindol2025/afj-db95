# 2026-10-06 묶음 A — 데이터 정확성·트랜잭션

상위 기준: [`../commercial-readiness-matrix.md`](../commercial-readiness-matrix.md)

## 목표

동시성·장애·인덱스 재구축 상황에서도 커밋 데이터가 유실·중복·오인 조회되지
않는다는 상용 승격 증거를 만든다.

## 범위

- READ COMMITTED / REPEATABLE READ / SERIALIZABLE
- lost update, dirty read, phantom, write skew
- COMMIT / ROLLBACK / SAVEPOINT와 강제 종료 복구
- 복합 인덱스의 재오픈·구형 페이지 재구축·타입/NULL 정렬
- 인덱스 경로 결과와 full scan 결과의 동일성

## 종료 조건

```text
FAIL 0
BLOCKED 0 (환경 차단은 제품 결함과 분리해 증거 남김)
데이터 손실 0
중복 커밋 0
오인 조회 0
각 시나리오 재현 명령·로그·판정 문서화
```

## 일괄 검수 명령

```bash
AFJ_BOOTSTRAP=/home/kim/kim/projects/freelang-afj-1p0/bootstrap.js \
  bash tests/release-gate.sh
```

표적 증거는 다음 범위를 포함한다.

```text
tests/transaction-isolation.fls
tests/tcp-isolation-levels.fls
tests/tcp-mvcc-conflicts.fls
tests/tcp-range-predicate.fls
tests/tcp-schema-mvcc.fls
tests/wal-format.fls
tests/compound-index.fls
tests/compound-range.fls
tests/persistent-btree.fls
tests/composite-schema-order.fls
tests/composite-mixed-type-order.fls
tests/composite-reopen-rebuild.fls
tests/composite-schema-range.fls
```

## 종료 결과

- 전체 release gate: 63 PASS / 0 FAIL (실제 listen 승인 환경)
- schema-aware composite ordering: PASS
- schema MVCC merge: PASS
- write skew·혼합 선언 타입·schema-aware 복합 범위·구형 페이지 재구축: PASS
- 언어별 collation과 `COLLATE`/문자셋 호환성: B 묶음으로 이관

## 작업 규칙

A 묶음 종료 조건은 충족했다. 다만 이는 상용서비스 승격이 아니라 다음 B 묶음으로
이동할 수 있다는 뜻이다. 새로 발견한 범위 밖의 위험은 B/C/D backlog로 이관한다.
