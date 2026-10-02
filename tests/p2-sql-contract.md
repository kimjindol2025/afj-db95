# P2 SQL 계약

SQL 실행기는 먼저 안정적인 AST를 만든 뒤 저장 엔진에 전달한다.

현재 구현된 최소 문법:

- `SELECT * FROM table`
- `SELECT * FROM table WHERE column value`
- `SELECT * FROM table WHERE column=value`
- `SELECT * FROM table WHERE column IS NULL`
- `SELECT * FROM table WHERE column IS NOT NULL`
- `SELECT * FROM table LIMIT n`
- WHERE 조건을 가진 UPDATE/DELETE AST 실행
- `CREATE TABLE table`
- `ALTER TABLE table ADD COLUMN column`
- `DROP TABLE table`
- `INSERT INTO table`
- `INSERT INTO table (column,...) VALUES (value,...)`
- multiple rows in one `VALUES (...), (...)` statement
- `UPDATE table`
- `UPDATE table SET column=value WHERE column=value`
- `DELETE FROM table`
- `DELETE FROM table WHERE column=value`
- `SELECT COUNT(*) AS alias FROM table`
- grouped `COUNT(qualified.column)` with aliased `LEFT JOIN` and `ORDER BY`
- projected columns with `WHERE`, `ORDER BY ... DESC`
- column definitions `INT`/`TEXT`/`BOOLEAN`, `PRIMARY KEY`, `UNIQUE`, `NOT NULL`

현재 문법은 최소 AST 기준선이며, `IS NULL`은 NULL 의미론을 적용한다.
`ALTER TABLE`은 기존 행에 NULL 컬럼을
추가하고 `DROP TABLE`은 카탈로그에서 테이블을 제거한다. 스키마 컬럼 정의와
PRIMARY/UNIQUE/NOT NULL 검증은 실제 INSERT 경로에 연결되어 있다. FOREIGN KEY,
CHECK, 타입 변환과 정교한 오류 위치는 후속 단계다. MariaDB corpus의
grouped `COUNT`와 alias `LEFT JOIN`은 `sql-core.fls`와 `engine.fls`에서
파싱·실행 회귀를 통과했다.
