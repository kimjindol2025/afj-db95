# afj-db95

FreeLang Script의 공식 관계형 데이터베이스를 목표로 하는 프로젝트입니다.

공식 계획과 1.0 완료 기준은 [`docs/official-db-plan.md`](docs/official-db-plan.md)에
고정합니다.

## 현재 단계

현재는 실행 가능한 관계형 코어, JSON Lines WAL, fd_fsync 기반 durable
transaction 복구 기준선을 제공합니다. 아직 공식 1.0 DB는 아닙니다.

- 테이블 생성
- 행 삽입
- 전체 조회
- 기본 조건 조회
- 행 수정·삭제
- 최소 DDL: `ALTER TABLE ... ADD COLUMN`, `DROP TABLE`
- 스키마 메타데이터 보관
- 변경 이벤트 WAL 기록
- WAL 이벤트 재생을 통한 메모리 복구
- prepare/commit marker와 torn transaction 복구
- fd_fsync durable append
- 엔진 catalog 통합 트랜잭션: COMMIT/ROLLBACK/SAVEPOINT

외부 MariaDB 호환 corpus와 대규모 장애 주입은 공식 1.0 전 검증 과제로 남아 있습니다.

## 실행

```text
node /root/freelang-surface-v0-clean-ek3qo2/v11/bootstrap.js run src/afj-db95.fls
```

TCP 운영 인스턴스는 환경변수로 인스턴스별 WAL 위치와 root 비밀번호를 지정할 수
있습니다. 미설정 시 기존 개발 기본값을 사용합니다.

```text
AFJ_DB_WAL=/var/lib/afj-db95/catalog.wal
AFJ_DB_ROOT_PASSWORD=<운영용-비밀번호>
AFJ_DB_PORT=43995
AFJ_DB_BIND_HOST=127.0.0.1
```

운영에서는 `/tmp` 기본 WAL 경로와 `development-only` 기본 비밀번호를 사용하지
않아야 합니다.

모니터링은 TCP JSON 요청 `{"type":"health"}`를 인증 없이 사용할 수 있습니다.
응답의 `ok`, `service`, `status`, `wal` 필드를 readiness/liveness 점검에 사용합니다.
인증된 세션은 `{"type":"shutdown","token":"..."}` 요청으로 graceful shutdown을
수행할 수 있습니다. 포트는 `AFJ_DB_PORT`로 지정하며 1~65535 범위만 허용합니다.
bind 주소는 `AFJ_DB_BIND_HOST`로 지정합니다. 기본값은 기존 호환성을 위해
`0.0.0.0`이며, 외부 노출을 막으려면 `127.0.0.1` 또는 운영 네트워크 주소를
지정해야 합니다.

## 목표

MariaDB 내부 구현을 복제하는 것이 아니라, 주요 SQL·트랜잭션·운영 기능을 FreeLang Script로 단계적으로 호환합니다.
