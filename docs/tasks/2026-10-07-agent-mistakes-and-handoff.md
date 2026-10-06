# 2026-10-07 작업 실수·미완료·인수인계

이 문서는 2026-10-07 FreeLang v11/FX/FreeLangScript 고유 DB 통합 마무리 작업의 실제 상태를 다음 에이전트가 이어받을 수 있도록 기록한다.

## 한 줄 결론

핵심 DB 기능과 targeted 검수는 통과했지만, 전체 release gate는 아직 PASS가 아니다. case 9의 local canary rollback에서 `tcp-server-tls` 함수 미정의가 확인됐고, 배포는 명시된 deploy 계약이 없어 실행하지 않았다.

## 1. 오늘 확인된 실수

### 1.1 전체 완료를 말하기 전에 전체 gate를 닫지 못했다

- 문제: targeted 검수와 커밋이 끝난 뒤 전체 release gate 결과를 최종 완료 근거로 먼저 닫지 못한 상태에서 마무리·배포 단계로 이동했다.
- 실제 결과: release gate case 1~8은 PASS였지만 case 9 `local canary rollback`이 FAIL했다.
- 실패 근거:

  ```text
  tcp-daemon.fls:1928
  [start-afj-tcp] [tcp-server-tls] Function not found: tcp-server-tls
  ```

- 재발 방지: 앞으로 완료 선언 순서는 반드시 `check → targeted test → 전체 release gate → artifact/smoke → deploy contract`로 고정한다. 하나라도 FAIL/UNKNOWN이면 완료가 아니라 `UNRESOLVED` 또는 `BLOCKED`로 보고한다.

### 1.2 전체 `npm test`를 끝까지 확인하지 못했다

- 문제: FreeLangScript 전체 `npm test`를 실행했지만 결과를 끝까지 회수하지 못했고 중단됐다.
- 잘못된 보고를 피하기 위해 전체 PASS로 기록하지 않았다.
- 재발 방지: 장시간 명령은 세션 ID를 기록하고, 종료 코드와 마지막 요약까지 회수한 뒤에만 PASS/FAIL을 선언한다. 시간이 걸리면 중간 상태를 남기되 임의로 성공 처리하지 않는다.

### 1.3 배포 계약 확인과 실제 배포 가능성 판단이 늦었다

- 문제: 세 저장소의 `.freelang/deploy.sh` 존재 여부와 배포 주체를 더 앞 단계에서 확정하지 않았다.
- 실제 상태: AFJ-DB95에는 check/test/artifact/smoke/rollback 계약은 있지만 `deploy.sh`가 없다. rollback 스크립트도 이전 artifact를 선택할 뿐 실제 서비스 활성화까지 수행하지 않는다. Script와 FX에도 사용할 수 있는 명시적 배포 계약을 확인하지 못했다.
- 재발 방지: 구현 초기에 배포 계약 표를 만들고 `deploy.sh`, 대상 서비스, 포트, 경로, rollback 활성화 주체가 없으면 배포 계획을 BLOCKED로 고정한다. SSH/PM2/경로를 추측하지 않는다.

### 1.4 서로 다른 저장소의 상태를 한 덩어리로 관리할 위험이 있었다

- 문제: AFJ-DB95, v11-FX, FreeLangScript가 서로 다른 브랜치·remote·dirty 상태인데 한 프로젝트처럼 처리할 위험이 있었다.
- 특히 FreeLangScript에는 기존 사용자 변경사항이 다수 남아 있다.
- 재발 방지: 매 저장소마다 `pwd`, branch, status, HEAD, remote를 별도로 확인하고, 커밋 대상 파일을 명시적으로 stage한다.

### 1.5 dirty worktree를 자동 정리하지 않은 것은 맞지만, 초기에 명시적으로 경계를 선언했어야 했다

- 상황: FreeLangScript의 기존 dirty 파일을 reset/clean/stash하지 않고 보존했다.
- 잘한 점: 사용자 변경사항을 덮어쓰지 않았다.
- 개선점: 작업 시작 보고에서 “이 파일들은 이번 작업에 포함하지 않고 push 시에도 커밋하지 않는다”고 더 일찍 선언했어야 한다.

## 2. 오늘 못한 일과 현재 미완료

### 2.1 전체 release gate PASS

- 상태: BLOCKED/UNRESOLVED.
- case 9에서 `tcp-server-tls` 함수 미정의가 발생했다.
- case 10은 이 문서 작성 시점에 실행 중이므로 최종 종료 코드와 요약을 반드시 회수해야 한다.
- case 9는 단순히 재실행할 일이 아니라, `tcp-daemon.fls`가 호출하는 함수의 정의/등록/fixture 계약을 먼저 추적해야 한다.

### 2.2 실제 배포

- 상태: 실행하지 않음.
- 이유: 저장소에 승인된 `deploy.sh` 및 명시적인 운영 대상·활성화 주체가 없다.
- artifact 생성과 smoke가 PASS하더라도 그것은 배포 가능 artifact 검증이지 운영 배포 완료가 아니다.

### 2.3 상용 운영 리허설

- 상태: 미완료.
- clean clone, 운영 metrics/alert, 실제 rollback 활성화, 보안 리뷰까지 연결된 운영 리허설은 별도 작업으로 남아 있다.

### 2.4 FreeLangScript 전체 테스트

- 상태: 최종 PASS 미확인.
- 대신 native DB 자동 연결 targeted test는 PASS했다.

## 3. 오늘 잘한 일

### 3.1 핵심 기능을 실제 실행으로 검증했다

- FreeLangScript native DB 자동 연결 targeted test:
  - capability scope PASS
  - forged handle PASS
  - reopen persistence PASS
  - concurrent writers PASS
- v11-FX:
  - `tests/run-tests.sh`: 10 PASS / 0 FAIL
  - fixpoint determinism: `GEN_A_EQ_GEN_B_EQ_GEN_C=PASS`
  - self-host fixed point: PASS
  - invalid SQL은 실패해야 하는 fixture에서 실제 오류로 종료됨

### 3.2 SQLite 동시성·오류 처리를 보강했다

- WAL과 busy timeout을 적용했다.
- `db_query`/`db_exec`가 SQLite 오류를 성공 문자열처럼 삼키지 않고 런타임 오류로 전달하도록 고쳤다.
- 이 변경은 `7e1e108 fix: harden native db concurrency and errors`에 기록돼 있다.

### 3.3 문서와 conformance fixture를 추가했다

- FX와 Script에 native DB 자동 연결 계약 문서를 남겼다.
- Script allowlisted conformance fixture를 추가하고 실제 unified runner로 실행했다.

### 3.4 사용자 변경사항을 보존했다

- FreeLangScript의 기존 dirty 파일을 자동 stage/commit/reset하지 않았다.
- 현재 push 시에도 해당 파일들은 커밋 대상에서 제외해야 한다.

### 3.5 실패를 성공으로 둔갑시키지 않았다

- case 9의 `tcp-server-tls` 미정의를 PASS로 분류하지 않았다.
- 전체 `npm test` 결과를 확인하지 못한 상태에서 PASS라고 쓰지 않았다.
- 배포 계약이 없는데 PM2, SSH, 포트, 경로를 추측해 실행하지 않았다.

## 4. 다음 에이전트에게 전할 말

1. 먼저 이 문서와 각 저장소의 README/배포 계약을 읽어라. 이미 통과한 targeted 검사를 무의미하게 반복하지 말고, 아래 미해결 항목부터 확인하라.
2. 현재 실행 중인 release gate 세션이 있다면 세션 ID를 사용해 종료 코드와 최종 요약을 먼저 회수하라. 새 gate를 중복 실행하지 마라.
3. `tcp-daemon.fls`의 `tcp-server-tls` 호출 지점과 함수 등록/정의 경로를 `rg`로 추적하라. fixture 이름 오류인지, runtime builtin 누락인지, 실제 제품 코드 누락인지 먼저 분류하라.
4. 수정 전 최소 재현을 만들고, 수정 후 case 9만 targeted 재실행하라. 그 다음 전체 release gate를 한 번만 재실행하라.
5. 전체 gate가 PASS가 아니면 커밋·push·배포 완료라고 보고하지 마라. 실패 로그, 재현 명령, blocker를 문서에 갱신하라.
6. FreeLangScript에서는 다음 dirty 파일을 사용자 변경사항으로 취급하고 건드리지 마라: `docs/SCRIPT_PROFILE.md`, `lib/enterprise-runtime.js`, `lib/native-effect-boundary.js`, `native/system-profile-v1/freelang-bridge.c`, `tests/production-browser*`, `CALCULATOR-DESIGN.md`, `examples/calculator-cli.fls`, `freelang-script/` 등.
7. push가 필요하면 저장소별로 기존 커밋만 명시적으로 push하고, 먼저 local HEAD와 remote branch를 비교하라. force-push, reset, clean, stash, amend, rebase는 하지 마라.
8. 배포는 `deploy.sh` 또는 사용자가 지정한 운영 계약이 생길 때까지 BLOCKED로 유지하라. rollback 스크립트가 artifact만 고르는 경우 그것을 배포 성공으로 해석하지 마라.

## 5. 이어서 실행할 명령

AFJ-DB95에서 case 9 원인을 확인할 때:

```bash
cd /home/kim/kim/projects/afj-db95
rg -n "tcp-server-tls|start-afj-tcp" .
git status --short --branch
```

수정 후에는 프로젝트가 제공하는 계약만 사용한다:

```bash
export AFJ_BOOTSTRAP=/home/kim/kim/platform/freelang-afj/bootstrap.js
bash .freelang/check.sh
bash .freelang/test.sh
bash .freelang/artifact.sh /tmp/afj-db95-release-$(git rev-parse --short HEAD).tar.gz
bash .freelang/smoke.sh
```

각 명령의 실제 종료 코드와 로그를 기록한 뒤에만 다음 단계로 이동한다.

## 6. 상태 기준

이 문서는 “기능 구현 완료”와 “상용 배포 완료”를 구분한다. 현재는 전자에 가까운 targeted PASS가 있고, 후자는 전체 gate 실패와 배포 계약 부재 때문에 완료가 아니다.
