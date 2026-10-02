# P2/P3 실행 계약

AST는 저장 엔진 자료구조를 직접 노출하지 않고 `execute-ast`를 통해 실행한다.

현재 실행 기준선:

- CREATE TABLE
- INSERT row AST
- literal SQL INSERT values mapped into a row AST
- literal SQL UPDATE assignment and predicate mapped into engine changes
- literal SQL DELETE predicate mapped into engine removal
- SELECT 전체
- UPDATE 전체
- DELETE 전체
- ALTER TABLE ADD COLUMN 및 기존 행의 NULL 기본값
- DROP TABLE 및 삭제 후 카탈로그 부재
- alias-qualified LEFT JOIN의 미매칭 보존
- grouped COUNT(column) 및 COUNT(*) 결과 행 생성

정렬된 key→row-id 기준선은 `btree.fls`에 있다. 페이지 분할·영속 인덱스·
쿼리 플래너 연결은 아직 남아 있다.
