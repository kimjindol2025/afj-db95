# 운영 도구 계약

- metrics는 queries/commits/rollbacks/errors를 추적한다.
- WAL 경로가 있으면 health status는 ok다.
- WAL 경로가 없으면 health status는 degraded다.
- migration version은 전진만 허용한다.
- 이미 적용된 버전은 `MIGRATION_NOT_FORWARD`로 거부한다.
