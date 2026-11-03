# DB95-15 — fixture 이벤트 순서와 case 25 포트

RUN-ID: `RUN-20261103-18`

## 기준과 보존 상태

- FX `feat/db95-native-peer` 시작 HEAD: `b8fdb29b94eec109db245172237c2d5a55e4c001`
- afj-db95 `native-run` 시작 HEAD: `afda8174f666fb7dc49b58c162b2bdb9618924c1`
- FX의 DB95-13 미커밋 변경(runtime/v11-ops.h, runtime/v11-tcp.h, tests/native-bootstrap/tcp-client.fl)은 유지했다. afj-db95의 기존 미추적 `docs/DB95-13-port-one.md`도 변경하지 않았다.
- Stage0 컴파일러는 사용하지 않았다. 기준 실행 파일 SHA-256은 `4411e601988d9b7e5444f6b0973ca60d15751bd618efd456d9f4a9963318c7d3`이며 bootstrap 전후 같은 값이었다.

## Bootstrap 고정점

첫 링크 시도는 컴파일러 전용 `cgc-bridge.c`를 링크 목록에서 빠뜨려 `fl_compiler_bindings`, `fl_compiler_realpath`, `fl_compiler_browser_generate`, `fl_compiler_add_extern` 미정의 심볼로 실패했다. 링크 목록을 바로잡아 Stage2·3·4를 생성했다.

```text
STAGE2_SHA=6a0d4e384a18834d4f0cb03c10460aade5bf05f999f5db981dd5dc275d313e7d
STAGE3_SHA=6a0d4e384a18834d4f0cb03c10460aade5bf05f999f5db981dd5dc275d313e7d
STAGE4_SHA=6a0d4e384a18834d4f0cb03c10460aade5bf05f999f5db981dd5dc275d313e7d
FIXPOINT_2_3_4=PASS
STAGE2_COMPILER_SHA=5cf2d59c8c8885a98ca2b20bb08f3e03e41e915dfdf4d722523dd3da65b6e2c0
REFERENCE_COMPILER_SHA_BEFORE=4411e601988d9b7e5444f6b0973ca60d15751bd618efd456d9f4a9963318c7d3
REFERENCE_COMPILER_SHA_AFTER=4411e601988d9b7e5444f6b0973ca60d15751bd618efd456d9f4a9963318c7d3
```

## Fixture 진단과 중단 사유

기대 바이트는 보냄 `50 49 4e 47 0a` (`PING\n`), 받음 `50 4f 4e 47 0a` (`PONG\n`) 그대로 두었다. `runtime/raw_tcp.c`는 수정하지 않았다.

| 실행 | fixture 순서 | 결과 |
|---|---|---|
| 1 | client open 다음 poll, write 다음 poll 1회 | `Uncaught error (line 20): TCP_CLIENT_RESPONSE_MISMATCH` |
| 2 | client open 다음 poll, write 다음 poll 2회 | `Uncaught error (line 21): TCP_CLIENT_RESPONSE_MISMATCH` |
| 3 | 같은 순서, callback/read 결과 진단 출력 추가 | `Uncaught error (line 23): TCP_CLIENT_RESPONSE_MISMATCH`; `TCP_CLIENT_RESPONSE=null ERRORS=[["io-err","recoverable","handler","not a function"],["io-err","recoverable","handler","not a function"]]` |

세 번 모두 같은 응답 불일치 지점에서 실패했으므로 지시의 3회 중단 규칙에 따라 추가 실행을 멈췄다. 진단상 poll 수만으로 해결되는 문제가 아니며, `tcp-server-raw`가 named callback 문자열을 받아 `fl_named_fn`으로 호출하는데 fixture는 inline `fn` 값을 전달하고 있다. 근거: FX `runtime/v11-tcp.h:38, 97, 111-117, 240`; `tests/native-bootstrap/legacy-api-names.md`는 mainline 이름을 named callback 경로, `fl-tcp-*`를 closure 경로로 구분한다.

사용자가 mainline named callback 방식 적용을 승인했다. 이에 fixture를 named handler 문자열 `"tcp-client-smoke-handler"`를 전달하도록 바꾸고, 서버 시작·연결·송신·수신 순서의 yield 지점을 유지했다. 당시 승인 뒤 시험은 잠금 대기 중 중단했다. 후속 재개에서 named callback 적용 후 PING→PONG과 오답 기대값 거부를 확인했다.

## 미수행 항목

- fixture PING→PONG 왕복 및 오답 기대값 거부: 통과
- case 25 `.fls` gate 연결은 했으나 worker가 daemon 컴파일 120초 제한으로 종료되어 동등 실행 미확인
- case 25 trace에서 node/JS 실행 0건 확인. 71건 gate와 전체 회귀는 미실행
- 기존 진행 커밋은 Forgejo/GitHub에 푸시됨. 이번 TMPDIR/finally/보고서 변경은 미커밋·미푸시

## 재개 기록 — compiler 복구와 case 25

후속 실행 산출물은 `<가림>/db95-8/artifacts/RUN-20261103-18` 아래에 두었다. gate worker는 case별 `TMPDIR`을 case 디렉터리 아래로 설정하고, soak fixture는 `TMPDIR`이 없으면 실패하도록 바꿔 루트 `/tmp`에 시험 데이터를 쓰지 않게 했다. 수정된 gate 셸은 `bash -n` 및 `git diff --check`를 통과했다.

기준 Stage2 생성 소스와 SHA-256이 `6a0d4e384a18834d4f0cb03c10460aade5bf05f999f5db981dd5dc275d313e7d`로 일치하는 기존 Stage2 실행 파일을 찾아 작업 경로로 복사했다. 실행 파일 SHA-256은 `9e08f102a579aed6ad77edac06997637e9f7b05dbe7197de1002107a6e905864`이며, smoke 및 case 25 실행 전후 동일했다. 이전 실행 파일 SHA-256 `4411e601988d9b7e5444f6b0973ca60d15751bd618efd456d9f4a9963318c7d3`은 찾지 못해, 현재 이 해시가 기록된 실행 파일로 작업했다.

시스템 설치 없이 공식 OS 저장소의 `libcurl-devel-8.12.1-4.el10_2.7.x86_64` 패키지를 작업 산출물 경로에 받고 RPM 서명 검증 `digests signatures OK`를 확인해 헤더를 사용했다. 시스템 runtime libcurl은 `8.9.1-5.el10.x86_64`다. 패키지는 설치하지 않았고, linker symlink도 작업 산출물 안에서만 만들었다.

확인 결과:

```text
TCP_CLIENT_GENERATE_C_SYNTAX=PASS
TCP_CLIENT_ROUNDTRIP=PASS
Uncaught error (line 19): TCP_CLIENT_RESPONSE_MISMATCH
TCP_CLIENT_WRONG_EXPECTATION=REJECTED
EXISTING_TRY_CATCH_SYNTAX=PASS
TCP_LONG_SOAK_GENERATE_C_SYNTAX=PASS
COMPILER_SHA_AFTER=9e08f102a579aed6ad77edac06997637e9f7b05dbe7197de1002107a6e905864
```

soak `.fls`의 첫 생성 C 검사는 `catch`가 일반 호출로 출력되어 `catch` implicit declaration 및 `__fl_binding_63` 미선언 오류로 실패했다. JS의 `finally` 정리와 동등하게 `.fls`를 `(finally (tcp-soak-cleanup))` 구조로 바꾼 뒤 생성 C 문법 검사는 통과했다.

case 25 worker는 단일 `strace -f -e trace=execve` 아래 실행했다. trace에서 `CASE25_NODE_JS_EXEC=0`이었다. 그러나 daemon 생성용 Stage2 컴파일이 `timeout 120s`에 도달해 종료됐다. 원문 결과는 `Uncaught error (line 59): soak daemon build failed: `이며 trace의 Stage2 compiler 종료 상태는 `124`다. 원래 300000ms soak 제한은 변경하지 않았다. case 25는 PASS가 아니다. 71건 gate 및 전체 회귀는 실행하지 않았다.

## 언어 성과

FX의 기존 DB95-13 native TCP client API와 `tcp-client-free-port`를 보존했고, mainline named callback smoke로 PING→PONG을 확인했다. DB95가 드러낸 결함은 smoke fixture가 named callback API 대신 inline closure를 전달한 점이다. case 25 포트 이식은 생성 C 문법과 JS 미사용 trace까지만 확인했고, 내부 daemon 컴파일 시간 제한으로 실행 PASS는 확인하지 못했다.


## DB95-15 보충 — 컴파일 시간 측정

컴파일러는 지정대로 기존 바이너리를 그대로 사용했다. 측정 전후 실행 파일 SHA-256은 `9e08f102a579aed6ad77edac06997637e9f7b05dbe7197de1002107a6e905864`였다. Stage2 생성 소스 SHA-256은 `6a0d4e384a18834d4f0cb03c10460aade5bf05f999f5db981dd5dc275d313e7d`였다. 재빌드는 하지 않았다.

측정 전 부하 원문:

```text
00:30:36 up  1:49,  5 users,  load average: 7.58, 6.87, 6.30
```

`nproc` 결과는 `72`였다. 측정 전 `ps` 상위 15행은 `artifacts/RUN-20261103-18/measurement/preload.txt`에 보존했다. 해당 목록에는 `tmp-archive-wit`가 59.2% CPU로 있었지만 case-bin, daemon-bin, native-release-gate, tcp-long-soak 프로세스는 없었다. 잠금 기록 `lock.txt`상 `flock -o /tmp/fl-heavy.lock` 대기는 `0`초였다. 측정 아티팩트는 작업공간 경로 아래에 두었다.

두 경우 모두 같은 기존 컴파일러로 daemon 컴파일 단계만 실행했다. case25 결과는 원문 `CASE25_DAEMON_COMPILE_SECONDS=313.32`, 비교 대상인 이미 통과한 case 3 `raw binary boundary` 결과는 원문 `COMPARE_CASE3_COMPILE_SECONDS=0.01`이다. 생성 C 크기는 case25 `7529 1599030` (줄, 바이트), case 3 `24 1645` (줄, 바이트)였다. case25의 입력 소스 그래프는 5개 파일 합계 4,644줄, 202,229바이트였다.

판정은 **(다) 컴파일러가 해당 구조에서 느림**이다. 측정 전 load average는 72 CPU에 비해 낮았고, 측정 중 컴파일러가 대체로 CPU 한 코어를 사용했으므로 전체 시스템 부하가 주원인인 (가)로 보기 어렵다. case25가 case3보다 훨씬 큰 입력·출력을 만들므로 단순 규모 영향(나)을 완전히 분리할 대조군은 없지만, 1.6MB 생성 C에 313.32초가 걸리고 1,645바이트 생성 사례는 0.01초인 차이를 근거로 컴파일러의 이 코드 구조 처리 비용을 주원인으로 판단한다. 이는 두 사례만 비교한 진단적 추론이며, case25 실행 자체는 앞서 기록한 120초 내부 제한 때문에 미통과 상태다.

| 보충 확인 | 결과 |
|---|---|
| 보충 1/2 — case25와 비교 case 컴파일 시간 원문 기록 | PASS — `313.32`, `0.01` |
| 보충 2/2 — 판정 근거 및 푸시·HEAD 일치 | PASS — 판정 근거 기록; Forgejo와 GitHub 모두 2e001b92d81e0d822b80ea756a8767d7710026a7 확인 |


DB95_SUMMARY=2/5
