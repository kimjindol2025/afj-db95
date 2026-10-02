# 인덱스 엔진 통합 계약

`indexed-engine.fls`는 엔진 테이블의 실제 행으로 정렬 B+Tree를 만들고,
키→row-id→row 결과를 반환한다.

- 같은 키의 여러 행을 모두 찾는다.
- 결과는 full scan predicate 결과와 개수·순서가 같다.
- 기존 `btree.fls`의 leaf/root split 계약과 실제 엔진 row 조회를 연결한다.

후속 단계에서는 INSERT/UPDATE/DELETE commit마다 인덱스를 증분 갱신하고,
페이지-backed B+Tree를 저장 엔진 WAL과 통합한다.
