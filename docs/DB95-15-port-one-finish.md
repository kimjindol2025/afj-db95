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

사용자가 mainline named callback 방식 적용을 승인했다. 이에 fixture를 named handler 문자열 `"tcp-client-smoke-handler"`를 전달하도록 바꾸고, 서버 시작·연결·송신·수신 순서의 yield 지점을 유지했다. 승인 뒤 실행은 잠금 대기 중 중단했으며, named callback 적용 후 PING→PONG은 아직 검증하지 않았다. TCP 런타임 및 case 25 포트/gate 동작도 미검증이다.

## 미수행 항목

- fixture PING→PONG 바이트 일치: 미통과
- case 25 `.fls` 동등 포트와 gate 연결: 미완료
- case 25의 node/JS 0건 trace 및 71건 gate: 미실행
- 민감정보 diff 검사, 진행본 커밋, Forgejo/GitHub 푸시: 이번 진행본 저장에서 수행

## 언어 성과

FX의 기존 DB95-13 native TCP client API 변경은 보존했다. 임시 포트 선택을 위해 `tcp-client-free-port`를 `runtime/v11-ops.h`와 `runtime/v11-tcp.h`에 추가했으며, mainline named callback을 사용하는 fixture로 바꿨다. 승인 뒤 smoke와 case 25 gate는 실행하지 않아 PONG 및 포트 이식은 미검증이다. DB95가 드러낸 결함은 smoke fixture가 named callback API 대신 inline closure를 전달한 점이다.

DB95_SUMMARY=1/5
