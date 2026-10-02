# HTTP 서버 계약

- GET `/health`는 서비스 상태를 반환한다.
- GET `/ping`은 pong을 반환한다.
- POST `/login`은 검증된 사용자에 Bearer token을 발급한다.
- POST `/query`는 SQL AST를 만들고 파일 WAL 기반 catalog에 SELECT/INSERT/
  UPDATE/DELETE/ALTER TABLE ADD COLUMN/DROP TABLE을 실행한다.
- 인증 없는 query는 `AUTH_REQUIRED`로 거부한다.
- route 등록과 server start는 분리한다.
- 테스트는 persistent daemon을 남기지 않는다.

실제 임시 TCP 포트에서 curl로 health, SELECT, INSERT 200 응답을 검증한다.
catalog 파일은 요청 callback의 runtime 전역 경계를 피하기 위해 절대 경로
WAL로 읽고 쓴다. DDL도 create/alter/drop 이벤트로 재생된다.

검증 메모: 현재 runtime의 실제 route API인
`(route "GET" "/health" handler)` 형식으로 임시 포트에서 curl smoke를
수행했고 HTTP 200과 JSON 응답을 확인했다. 테스트 종료 후 서버 PID를
종료했으며 포트를 남기지 않았다.
