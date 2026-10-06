# AFJ-DB95 백업·복구 런북

현재 저장소의 백업 계약은 파일별 checksum과 manifest integrity를 함께
검증한다. 운영자는 WAL, catalog snapshot, index snapshot을 같은 manifest에
포함해야 한다.

## 사전 조건

- 서비스 쓰기 상태와 WAL 경로를 기록한다.
- 백업 대상과 복원 대상은 서로 다른 경로로 지정한다.
- manifest의 `version`, `integrity`, 각 파일의 size/checksum을 보존한다.

## 자동 검수

```bash
node "$AFJ_BOOTSTRAP" run src/backup.fls
node "$AFJ_BOOTSTRAP" run tests/backup-soak.fls
node "$AFJ_BOOTSTRAP" run tests/fault-injection-restart.fls
```

복원 후에는 서비스 기동, health, 샘플 SELECT, WAL 존재를 순서대로 확인한다.
manifest가 손상되거나 backup checksum이 다르면 복원을 중단하고
`BACKUP_SET_MANIFEST_INVALID` 또는 `BACKUP_SET_CHECKSUM_MISMATCH`를 장애
분류값으로 기록한다.
