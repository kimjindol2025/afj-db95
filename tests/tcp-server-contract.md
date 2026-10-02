# TCP 서버 계약

`tcp-server.fls`는 FreeLang 런타임의 raw TCP adapter 위에서 줄 단위 JSON
프로토콜을 제공한다.

- `login`: 사용자 인증 후 세션 token 발급
- `query`: token 검증, `db.read`/`db.write` 권한 확인, SQL 실행
- `ping`: 응답 확인
- `tcp-server-stop`: 기존 연결과 listener 종료
- write 요청은 prepare/commit WAL로 fsync되고 서버 재기동 시 replay
- token별 `BEGIN`/`COMMIT`/`ROLLBACK` 세션 상태
- 미커밋 table에 대한 다른 token의 read/write `TX_CONFLICT` 차단
- 단일 `id` predicate/insert는 row resource로 분리되어 다른 id 접근 허용

`tests/tcp-daemon.fls`와 `tests/tcp-client-smoke.fls`를 독립 프로세스로 실행하여
로그인·CREATE·INSERT·SELECT·잘못된 token 거부를 검증한다. 같은 프로세스의
동기 `tcp-send`는 이벤트 루프를 막을 수 있으므로 반드시 독립 프로세스
구성으로 테스트한다. 첫 daemon에서 CREATE/INSERT 후 종료하고, 두 번째
`tests/tcp-daemon-restart.fls`에서 재기동한 daemon에서
`tests/tcp-restart-smoke.fls`로 SELECT하여 WAL 복구를 증명한다.
`tests/tcp-transaction-smoke.fls`는 rollback 행이 사라지고 commit 행만 남는지
검증한다.
