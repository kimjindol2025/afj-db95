# DB95-9 다음 첫 오류 묶음

접수번호: RUN-20261103-06. 실행 중 경로·주소·키·인증정보는 `<가림>` 처리한다.

## 0. 시작 기준과 DB95-8 원문 수치

- afj-db95 `native-run`: `273f1894d6851ff2e7c2965b343627ec23f0cd44`
- freelang-v11-fx `feat/db95-native-peer`: `be83234e627cfcc85abb7ee993e8309cbdd3730b`

DB95-8의 71건 결과 원문:

```text
NATIVE_GATE_PASS=15 FAIL=56 TIMEOUT=0 SKIP=0 TOTAL=71
```

DB95-8에서 `process_exit` 첫 오류는 27건에서 0건이 되었다. DB95-8 원문 첫 오류 묶음 전체 표:

| 첫 오류/결과 묶음 | DB95-7 전 | DB95-8 후 |
|---|---:|---:|
| process_exit 첫 오류 | 27 | 0 |
| `compiler:undeclared:peer` | 0 | 27 |
| PASS | 0 | 15 |
| `compiler:unsupported-literal` | 11 | 11 |
| `missing-native:buf_str` | 4 | 4 |
| `compiler-js-input:nil-kind` | 3 | 3 |
| `missing-native:file_mtime` | 2 | 2 |
| `missing-runner:node` | 2 | 2 |
| `runtime:[oversized-wal-smoke-test] oversized WAL was accepted` | 2 | 2 |
| `NATIVE_PASS_MARKER_MISSING` | 1 | 1 |
| `missing-native:buf_to_binary` | 1 | 1 |
| `missing-native:rem` | 1 | 1 |
| `missing-native:sleep_ms` | 1 | 1 |
| `production-tls-boundary` | 1 | 1 |

이번 대상은 표의 다음 최대 묶음 `compiler:undeclared:peer` 27건이며 TLS가 아니다.

## 1. 재현 시험과 원인

대표 재현은 `docs/evidence/db95-9/optional-arg-before.fl`이다. 수정 전 Stage0 번역은 `COMPILER_EXIT=0`이었지만 생성 C의 문법 검사 결과 `GCC_EXIT=1`, `error: ‘peer’ undeclared (first use in this function)`이었다. 대응하는 flat 인자 시험 `flat-peer-after.fl`은 `COMPILER_EXIT=0 GCC_EXIT=0`이다.

원인은 DB95 콜백 선언이다. `src/tcp-server.fls:1996`과 `src/mariadb-wire.fls:461`에서 `[peer nil]` 중첩 인자를 사용했지만, 본줄기 native TCP 콜백은 `runtime/v11-tcp.h:113-114`에서 `[event conn payload peer]` flat 4인자 API로 호출한다. 컴파일러 `self/cgc-main.fl:937-952`는 flat 변수/리터럴 인자만 처리하여 중첩 선택 인자 안의 `peer`를 함수 매개변수로 바인딩하지 않았다. 언어 미구현을 새로 늘리는 대신 두 DB95 호출 선언을 본줄기 API와 일치시켰다.

## 2. 수정 및 raw_tcp 안전 보강

DB95 두 핸들러 선언의 마지막 인자를 `[peer nil]`에서 `peer`로 바꿨다. 기대값은 바꾸지 않았다.

`runtime/raw_tcp.c`에서는 문자열 핸들러용 `RawHandler4`, `raw_named_handler`, `dlsym` 분기를 제거했다. `fl_tcp_server_raw`는 이제 `FL_FN`만 허용하고, `raw_emit`은 함수 값에 다섯 인자(이벤트, 연결, 데이터, 주소, 상대 포트)를 전달한다. 수정 전 위험 재현 `raw-name-before.log`에서는 환경변수로 받은 함수 이름이 `RAW_NAME_CALLBACK=CALLED`로 실행되었다. 소스 점검 결과 `runtime/raw_tcp.c` 안에 문자열 handler 분기, `dlsym`, 외부 이름의 함수 호출 경로가 남아 있지 않다.

후속 RUN-20261103-07의 가벼운 시험에서 함수 값 handler 호출과 상대 포트 전달은 `RAW_PEER=PASS`, 글자 이름 handler는 `RAW_NAME_RESULT=error`, `runtime/raw_tcp.c` 이름 dispatch 심볼 검색은 `RAW_TCP_NO_NAME_DISPATCH=PASS`였다. symbol 값 closure 번역/실행 시험은 `73`을 출력했다. `raw-tcp-contract-probes.sh`의 나머지 경계 항목은 아직 무거운 잠금을 기다려 미실행이다.

다음 지시서 후보로 보류한 미수정 경계: 빈 host 처리(raw_tcp.c 약 115행), 실수 `fl-yield`(약 165행), 4096바이트 수신 청크, NUL 바이트 뒤 잘림, 느린 상대에 대한 2초 송신 정체. 재현 스크립트는 이들을 고치지 않고 관찰하도록 준비 중이며, 결과는 아직 없다.

`self/cgc-main.fl`의 symbol 값 closure 사례를 위한 `tests/native-bootstrap/symbol-value-no-capture.fl`도 작성했으나 미실행이다.

## 3. 재시험 및 회귀

2026-11-03 01:09:42 UTC 시작한 잠금 대기는 18분 26초 후인 01:28:08 UTC에 실행됐다. 기다리는 동안 `ps`로 다른 `run-task946-full.sh`의 `flock` 점유를 반복 확인했으며 강제 해제나 프로세스 종료는 하지 않았다.

DB95 71건 원문 요약:

```text
NATIVE_GATE_PASS=0 FAIL=71 TIMEOUT=0 SKIP=0 TOTAL=71
```

첫 오류 전체 그룹표(큰 순):

| 첫 오류 묶음 | 건수 |
|---|---:|
| `compiler:undeclared:row` | 43 |
| `compiler:unsupported-literal` | 14 |
| `missing-native:file_append` | 3 |
| `compiler:undeclared:column` | 3 |
| `missing-runner:node` | 2 |
| `missing-native:file_size` | 2 |
| `runtime:Uncaught error (line 41): compatibility scorecard failure` | 1 |
| `production-tls-boundary` | 1 |
| `missing-native:buf_to_binary` | 1 |
| `compiler:undeclared:reader_tx` | 1 |

대상 `compiler:undeclared:peer`는 0건이다. `process_exit`, `regex_match_i`, `has_key_p` 첫 오류도 각각 0건으로 유지됐다. 전체 통과가 0건이고 새 최대 묶음이 생겼으므로 결과를 성공으로 취급하지 않고 push하지 않는다. 원문 첫 오류는 경로를 `<가림>` 처리해 `docs/evidence/db95-9/first-errors.tsv`에, 그룹 수는 `first-error-groups.tsv`에 보관했다.

두 번째 잠금 대기는 2026-11-03 01:31:53 UTC 시작해 약 30분 10초 후 회귀를 시작했다. `ps`에서 다른 `run-task946-full.sh`가 잠금을 보유하는 것을 확인하고 기다렸으며 강제 해제/중단은 하지 않았다.

v11 범위 회귀 6개 개별 결과는 `has-key=FAIL`, `raw-peer-ports=PASS`, `closure-map-capture=FAIL`, `afj-file-names=FAIL`, `closure-capture=FAIL`, `peer-address=PASS`로 2 PASS / 4 FAIL이다. 기존 회귀 shell의 `V11_SCOPED_REGRESSION_PASS=5 FAIL=1` 합계 표시는 실패를 boolean으로만 세어 개별 결과와 맞지 않아 사용하지 않았다. 실패 첫 진단은 각각 `fl_not` 인자 타입, `row`/`key` 미선언, `file_append`/`file_size` 미선언, `row` 미선언이다. 통과한 raw peer port 시험은 고정 10/10 및 임의 포트 10/10이다.

격리 native bootstrap은 완료했다. strace 없이 실행했다. 원문 해시:

```text
STAGE0_SHA=f7425bf086d99d11231ba79296e194fcc36b454379e46d44131bafb0dc74101c
STAGE1_SHA=b60f8752d4f4045d0acccdd1489697ecb9c142e3d4b4d4f2618cbd23f7aaa344
STAGE2_SHA=2e7a802f8102c5bf4826bae532486778212ebcbe50539ab74316936f2c3d122f
STAGE3_SHA=2e7a802f8102c5bf4826bae532486778212ebcbe50539ab74316936f2c3d122f
STAGE4_SHA=2e7a802f8102c5bf4826bae532486778212ebcbe50539ab74316936f2c3d122f
RESIDUAL_PROCESSES=0
CLEAN_CHECKOUT=PASS
BOOTSTRAP_STRACE=0
```

Stage2, Stage3, and Stage4 are the same fixed point. `STAGE0_EQ_CANONICAL=DIFFERENT` was also reported by the script. Sanitized raw logs are under `docs/evidence/db95-9/`.

## 4. 다음 지시서 후보

다음 지시서 최대 묶음 후보는 `compiler:undeclared:row` 43건이다. TLS 묶음은 첫 오류 1건이다. raw_tcp 경계: 빈 host, 소수 yield, 4096바이트 chunk, NUL 잘림, 느린 수신자 송신 정체는 수정하지 않고 별도 후보로 유지한다.

## 5. 언어 성과와 푸시

언어 기능 변경 없음. DB95가 드러낸 결함은 본줄기 flat native TCP callback 인자 API와 맞지 않는 중첩 optional 인자 때문에 peer 바인딩이 생성 C에서 누락된 점이다. 민감정보 패턴 diff 검사를 통과한 로컬 커밋은 DB95 `2505b7f`, FX `21d588f`이다. Forgejo/GitHub 푸시는 gate와 회귀가 통과한 뒤 진행한다.

완료 항목: 시작 기준 및 오류 표 기록, 재현/원인 판정, DB95 callback 호출 선언 교정, raw_tcp 문자열 dispatch 제거, 가벼운 raw_tcp 및 symbol closure 확인, 로컬 민감정보 검사/커밋, DB95 71건 재시험 및 보호 묶음 회귀 판정, v11 회귀, 격리 bootstrap(5/6). 게이트와 범위 회귀 실패가 있어 push 및 원격 HEAD 확인은 하지 않았다.

DB95_SUMMARY=5/6
