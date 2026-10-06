# AFJ-DB95 clean clone·artifact 계약

프로젝트의 실행 계약은 `.freelang/`에 둔다. FreeLang Script 본체를 바꾸지
않고, 외부 shell은 runtime 주입·검수·artifact 포장만 담당한다.

`bin/fl-script-unified.js`는 같은 경계를 `fl-tools`의 SCRIPT runner 형식으로
연결하는 어댑터일 뿐이며, SQL/DB 본체 구현에는 사용하지 않는다.

```text
.freelang/check.sh     syntax/type check
.freelang/test.sh      전체 release gate
.freelang/artifact.sh  재현 가능한 tar.gz + SHA-256
.freelang/smoke.sh     artifact 핵심 smoke
.freelang/rollback.sh  이전 artifact 선택·hash 확인
```

필수 환경은 `AFJ_BOOTSTRAP` 하나다. 배포 대상 서버·PM2 이름·포트는 이 계약에
하드코딩하지 않는다. 실제 배포자는 artifact hash를 승인한 뒤 별도 환경에서
활성화한다.

## clean clone 검수

```bash
AFJ_BOOTSTRAP=/path/to/bootstrap.js .freelang/check.sh
AFJ_BOOTSTRAP=/path/to/bootstrap.js .freelang/smoke.sh
AFJ_BOOTSTRAP=/path/to/bootstrap.js .freelang/artifact.sh /tmp/afj-db95.tar.gz
```

2026-10-07 workspace clean clone에서 `fl-tools start`가 `READY=YES`였고,
전체 gate 71 PASS / 0 FAIL, artifact smoke, SHA-256, rollback artifact 선택까지
재현했다. 실제 클라우드/배포 서버에서의 활성화는 별도 운영 권한이 필요한
다음 경계다.

release gate는 매 실행마다 임시 WAL/remediation/auth/audit 경로를 주입해 이전
실행의 `/tmp`·docs 상태가 다음 검수에 섞이지 않도록 한다.
