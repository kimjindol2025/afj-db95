# DB95 지속 실행 런처

`tests/tcp-daemon.fls`는 통합 테스트를 위해 일정 시간이 지나면 종료됩니다.
운영·로컬 검증에서는 `scripts/run-json-daemon.sh`를 사용해 데몬 종료 시 자동
재기동합니다.

```bash
AFJ_DB_BIND_HOST=127.0.0.1 \
AFJ_DB_PORT=43995 \
AFJ_DB_WAL=/var/lib/afj-db95/db95.wal \
./scripts/run-json-daemon.sh
```

기본 바인딩은 `127.0.0.1`이며, 외부 공개가 필요한 경우에도 방화벽과 인증을
별도로 구성해야 합니다. 런처는 데몬이 정상 종료하거나 비정상 종료해도 2초 후
재기동합니다.
