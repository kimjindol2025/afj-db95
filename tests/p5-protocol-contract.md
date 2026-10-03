# P5 프로토콜 계약

- 서버 상태는 stopped/running으로 명시한다.
- 세션 토큰 없이는 prepare/query를 허용하지 않는다.
- prepared statement는 서버 상태에 ID로 저장한다.
- ping/health는 인증 없이 사용할 수 있다.
- health는 `ok`, `service`, `status`, `wal` 상태를 반환한다.
- 알 수 없는 요청은 안정적인 `UNKNOWN_REQUEST` 오류를 반환한다.

현재 모듈은 transport-independent JSON 요청 처리기다. 실제 TCP listener와
암호화 전송은 FreeLang runtime capability 검증 후 연결한다.
