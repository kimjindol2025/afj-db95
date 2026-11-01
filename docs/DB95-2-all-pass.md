# DB95-2 전체 시험 실패 조사

실행 위치: <가림>의 격리 작업트리. 23·25번 서버 접속·실행 없음. blog1 코드 변경 없음. 비교 실행기는 두 커밋에 동일하게 적용했다.

## 1. 원본과 시작 커밋 비교

DB95-1에서 실패 10건에는 제한시간 초과 1건이 포함돼 있다. 따라서 비교 대상은 고유 시험 10개이며, ‘실패 10건 + 시간초과 1건’을 별개의 11개 시험으로 더하지 않는다. 원본 `88b4aa2ca11e5355240a1d93ece8321315c669cc`와 시작 커밋 `fcc7ba6e93f25d3d4ef47b616ad8a8e617d9030b`에서 각 시험을 한 번씩, 기존 제한시간과 문턱값으로 실행했다.

| 기존 case | 원본 exit / 경과 | 시작 커밋 exit / 경과 | 분류 |
|---:|---|---|---|
| 9 | 1 / 18s | 1 / 18s | 양쪽 실패 |
| 25 | 1 / 24s | 1 / 24s | 양쪽 실패 |
| 60 | 1 / 15s | 1 / 16s | 양쪽 실패 |
| 61 | 1 / 16s | 1 / 15s | 양쪽 실패 |
| 62 | 1 / 20s | 1 / 20s | 양쪽 실패 |
| 63 | 124 / 120s | 124 / 120s | 양쪽 제한시간 초과 |
| 67 | 1 / 7s | 1 / 8s | 양쪽 실패 |
| 68 | 1 / 9s | 1 / 9s | 양쪽 실패 |
| 69 | 1 / 14s | 1 / 13s | 양쪽 실패 |
| 71 | 1 / 8s | 1 / 9s | 양쪽 실패 |

시작 커밋에서만 새로 실패한 항목은 0개다.

## 2. 원인 묶음과 증거

### A. TCP 이벤트 인수 불일치와 응답 부재

- case 9: `[E_NET_TIMEOUT] tcp-send <가림>: 3000ms 안에 응답 없음`
- case 25: `Error: soak request timeout: login`
- case 63: `actual ''`, `expected '{"ok":true,"type":"pong"}\n'`
- case 67: `Error: FreeLang JSON probe timeout`
- case 9를 살필 때 서버 프로세스가 실행 중이고 포트가 `LISTEN` 상태임을 확인했다. 원문에서 주소만 가린 관측: `LISTEN 0 511 <가림> <가림> users:(("node",pid=1861781,fd=22))`. 이는 그 시점에 포트가 아예 열리지 않은 경우와 구분된다. 스모크는 열린 포트에 요청한 뒤 3초 동안 응답을 받지 못했다.
- 재현 시험을 본체 수정 전에 커밋했다. FreeLang 이벤트 루프는 인수 3개를 전달하지만 db95 TCP 핸들러는 4개를 필수로 요구했다: `Function 'afj-db-tcp-handler' expects 4 args (event, conn, payload, peer), got 3`; `DB95_RUNTIME_CALLBACK_REPRO_EXIT=1`. 별도 TCP 스모크도 `DB95_TCP_SMOKE_EXIT=1`이었다.
- 네 번째 인수를 선택값으로 만들었다. 기존 4인수 호출의 동작은 유지한다. 수정 후 `PASS db95-2-runtime-callback`, `DB95_CALLBACK_AFTER_EXIT=0`, `PASS db95-2-tcp-smoke`, `DB95_TCP_AFTER_EXIT=0`.
- 수정 위치: `src/tcp-server.fls:1996`. 재현 위치: `tests/db95-2-runtime-callback.fls:5`, `tests/db95-2-tcp-smoke.sh:1`.
- 기존 5분 성능 시험도 문턱값 변경 없이 통과했다: `afj-db95 TCP 300s soak PASS writes=872 throughput=2.91/s p95=2879ms max=3277ms`, `DB95_SOAK_AFTER_EXIT=0`.
- TCP 수정 뒤 보안 조건을 맞춘 격리 작업트리의 case 9는 TCP 시간초과를 지나 `Function not found: tcp-server-tls`에서 중단됐다: `DB95_CANARY_SECURE_AFTER_EXIT=1`. 일반 임시 경로에서 실행한 별도 시도는 `AFJ_DB_AUTH_STATE_INSECURE_PATH`로 앞서 중단돼 TLS 증거로 사용하지 않았다.
- 현재 실행기의 raw TCP 이벤트에는 접속자 주소가 실리지 않고 콜백에 인수 3개만 전달된다. 선택 인수로 TCP 응답은 복구했지만 IP 단위 제한을 유지하려면 실행기가 실제 접속자 주소를 제공해야 한다. 시작 커밋의 런타임 IP 시험은 로그에 PASS 문구 없이 64초 뒤 exit 0으로 끝났으나, TCP가 응답하게 된 수정 뒤에는 case 56에서 `actual undefined`, `expected 'RATE_LIMITED'`로 실패했다. **새로 드러난 실패**로 별도 기록한다. 확인되지 않은 주소를 만들어 제한을 통과시키지 않았다.

### B. MariaDB 접속 이벤트 이름 불일치

- case 68·71: `ERROR 2013 (HY000): Lost connection to server at 'handshake: reading initial communication packet', system error: 110`
- case 69: `Error: native auth packet timeout`
- 실행기는 접속 시 `accept`를 보내는데 MariaDB 핸들러는 `connect`에서만 핸드셰이크를 시작했다. 재현 시험 선커밋 후 수정 전 `DB95_MARIADB_ACCEPT_MISSING`, `DB95_MARIADB_ACCEPT_BEFORE_EXIT=1`.
- 두 이벤트를 처리하고 런타임의 3인수 호출을 허용했다. 수정 후 `PASS db95-2-mariadb-accept`, `DB95_MARIADB_ACCEPT_AFTER_EXIT=0`, `afj-db95 native MariaDB auth rejection PASS`, `DB95_NATIVE_AUTH_AFTER_EXIT=0`.
- 수정 위치: `src/mariadb-wire.fls:461`. 재현 위치: `tests/db95-2-mariadb-accept.fls:6`.
- 기존 대상 시험 재실행 원문: `DB95_AFTER case=63 exit=0`, `DB95_AFTER case=67 exit=0`, `DB95_AFTER case=68 exit=0`, `DB95_AFTER case=69 exit=0`, `DB95_AFTER case=71 exit=0`.
- DB95-1 색인·WAL 재현 묶음 재검증: `DB95_FIXED_RUN_PASS=1`, `DB95_FIXED_RUN_PASS=2`, `DB95_FIXED_RUN_PASS=3`, `DB95_THREE_PASS=3/3`, `DB95_DB95_1_REGRESSION_EXIT=0`.

### C. 실행기의 네이티브 TLS 함수 부재

- case 60: `[tcp-server-tls] Function not found: tcp-server-tls`.
- case 61: `[tcp-server-tls] Function not found: tcp-server-tls`.
- case 62: `[start-afj-tcp] [tcp-server-tls] Function not found: tcp-server-tls`.
- 이 함수는 실행기 제공 기능이다. 실행기에 함수가 없어 시험용 FreeLang 코드가 시작 단계에서 중단된다. db95의 `.fls` 핸들러만 바꿔 네이티브 TLS 함수 자체를 제공할 수 없다. 실행기 범위와 새 JS·TS·Python 금지 규칙에 관한 사용자 답변을 기다린다.

## 3. 수정 뒤 전체 게이트

보안 조건을 맞춘 격리 작업트리에서 기존 `release-gate.sh` 71개 항목을 한 번 모두 실행했다. 기존 기대값·문턱값·제한시간과 시험 목록은 바꾸지 않았다. 결과 원문:

```text
DB95_2_GATE_PASS=66 FAIL=5 TIMEOUT_120S=0 SKIP=0 TOTAL=71
[release-gate] END case=9 status=FAIL elapsed=37s label=local canary rollback
[release-gate] END case=56 status=FAIL elapsed=4s label=runtime peer IP rate limit
[release-gate] END case=60 status=FAIL elapsed=16s label=native TLS listener
[release-gate] END case=61 status=FAIL elapsed=15s label=native TLS mTLS/reload
[release-gate] END case=62 status=FAIL elapsed=20s label=production native TLS integration
DB95_2_GATE_EXIT=1
```

DB95-1 전체 게이트의 `61 PASS / 10 FAIL`에서 `66 PASS / 5 FAIL`로 바뀌었다. 이전 실패 중 case 25·63·67·68·69·71은 통과했다. 새로 드러난 case 56 실패를 숨기지 않았다. 첫 전체 실행이 실패했으므로 `71 PASS / 0 FAIL`의 2회 연속 조건은 충족하지 않았고, 같은 미해결 실행기 조건에서 두 번째 전체 실행을 통과로 간주하지 않는다.

## 4. 판정과 남은 작업

| DB95_SUMMARY 항목 | 판정 |
|---|---|
| 원본과 시작 커밋 분류표 | 통과 |
| 원인 묶음별 로그 근거 | 통과 |
| 모든 묶음의 재현 선커밋·본체 수정·통과 | 미달: 실행기 TLS와 접속자 IP 계약 미완료 |
| 전체 71건 2회 연속 실패·시간초과·SKIP 0 | 미달: 첫 실행 5 FAIL |
| Forgejo 다음 GitHub 푸시와 HEAD·깨끗한 작업트리 확인 | 최종 채팅의 원격 HEAD로 확인 |

다음 수정은 실행기에서 `tcp-server-tls`와 실제 접속자 주소 전달 기능을 제공해야 한다. 이는 현재 지시된 db95 저장소와 새 JS·TS·Python 금지 범위를 벗어난다. 사용자 범위 결정 전에는 접속자 주소를 임의 값으로 만들어 시험을 통과시키거나 기대값·문턱값·제한시간을 바꾸지 않는다. 현재 가지의 TCP 수정은 네이티브 TLS와 IP 제한 계약이 완료되기 전까지 운영 반영 근거가 아니다.

시작 커밋 이후 새 JS·TS·Python 소스 0개. 커밋 전 전체 변경 및 보고서의 `git diff --check` 오류 0건, 추가 줄의 인증 URL·비밀키·토큰·로컬 절대 경로 패턴 검사 0건. 패턴 검사만으로 모든 비밀의 부재를 증명하지는 않는다.

DB95_SUMMARY=3/5
