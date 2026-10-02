# 인증 서버-엔진 통합 계약

`server-engine.fls`는 protocol session, auth role/permission, SQL engine을
하나의 요청 경로로 연결한다.

- 인증 전 query는 `AUTH_REQUIRED`다.
- root는 `db.read`/`db.write`로 CRUD를 실행한다.
- prepared statement도 같은 인증·권한 경로를 사용한다.
- read-only role은 SELECT만 성공하고 INSERT는 `PERMISSION_DENIED`다.
