# 제약 조건 계약

- INTEGER/TEXT/BOOLEAN 타입을 검사한다.
- nullable=false 컬럼은 NULL을 거부한다.
- `CREATE TABLE`의 PRIMARY KEY/UNIQUE/NOT NULL 선언을 SQL 스키마로 보존한다.
- primary-key 중복은 `PRIMARY_KEY_VIOLATION`으로 실제 INSERT에서 거부한다.
- UNIQUE 컬럼 중복은 `UNIQUE_VIOLATION`으로 실제 INSERT에서 거부한다.
- `CONSTRAINT ... FOREIGN KEY(...) REFERENCES ...`를 파싱하고 INSERT 시 대상이 없으면 `FOREIGN_KEY_VIOLATION`으로 거부한다.
- `CHECK(column operator literal)`를 파싱하고 INSERT 시 false면 `CHECK_VIOLATION`으로 거부한다.
- 유효한 행은 저장 후보로 통과한다.

UPDATE/DELETE 시 참조 무결성 재검증과 복합 CHECK/FK 표현식은 후속 단계로 남아 있다.
