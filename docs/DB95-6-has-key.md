# DB95-6: v11 Map 키 검사와 TCP 포트 확인

실행 위치: 격리 작업 공간 `<가림>`. 23·25번 서버와 운영 데이터는 사용하지 않았다. 무거운 시험은 실행 전 `ps`로 확인하고 공용 잠금 아래에서 실행했다. 부트스트랩에는 바깥 `strace`를 씌우지 않았다.

## 시작점

| 저장소 | 지정 로컬 HEAD | 확인 결과 |
| --- | --- | --- |
| afj-db95 `native-run` | `c3681884f3fdd48c2ca08269925968925917cd73` | 일치. 먼저 Forgejo, 다음 GitHub에 진단 커밋 푸시. 양쪽 `native-run` HEAD는 `c3681884f3fdd48c2ca08269925968925917cd73`. |
| freelang-v11-fx `feat/db95-native-peer` | `f890da34aa9d5ee5b6b5c6a827a93886b3fc330e` | 일치. |

## 1. `has-key?` 재현과 구현

재현 시험 커밋: `ae91576`. 있는 키, 없는 키, 값이 `nil`인 키, 빈 Map, Map이 아닌 값을 검사한다. 수정 전 시험의 첫 오류 원문(경로·행은 가림):

```text
<가림>: error: implicit declaration of function ‘has_key_p’ [-Wimplicit-function-declaration]
```

수정 전 종료값은 `1`이었다. 컴파일러의 `has-key?` 분기를 `fl_map_has_key`에 연결하고, 런타임에서 Map의 키를 직접 비교한다. Map이 아닌 입력은 `HAS_KEY_EXPECTED_MAP` 오류로 드러낸다. 구현 커밋: `0d35cec9f086cb9ac6077ba5991f797f7f47600d`. 수정 후 시험 원문:

```text
HAS_KEY_VALUES=PASS
Uncaught error: HAS_KEY_EXPECTED_MAP
HAS_KEY_NON_MAP=PASS
```

## 2. TCP 포트 타입과 반복 시험

TCP 포트의 정수·실수·문자열 변환은 시작 커밋 `f890da3`의 `runtime/raw_tcp.c`에 이미 구현돼 있었다. 이번에 동일 수정을 새 코드처럼 재적용하지 않았다. 기존 수정 전 재현 커밋은 `6d46d11`이다. 이번 반복 연결 시험은 `03fd379`에 먼저 커밋했다. 고정 포트와 임의 포트 각각 10회 연결·응답을 확인한다.

첫 고정 포트 시도는 응답이 비어 실패했다. 서버 출력은 비어 있었다. 별도 한 겹 네트워크 호출 추적의 원문에서 주소와 포트만 가린 결과:

```text
bind(3, {sa_family=AF_INET, sin_port=htons(<가림>), sin_addr=inet_addr("<가림>")}, 16) = -1 EADDRINUSE (Address already in use)
connect(3, {sa_family=AF_INET, sin_port=htons(<가림>), sin_addr=inet_addr("<가림>")}, 16) = -1 ECONNREFUSED (Connection refused)
```

이 실패는 서버가 연결을 받거나 응답하기 전에 바인드에서 발생했다. 해당 고정 포트에 `TIME-WAIT` 연결도 확인했다. 두 번째로 고른 고정 포트 역시 이 호스트의 임시 클라이언트 포트 범위 안에 있었다. 기존 단일 연결 시험을 별도 한 겹 네트워크 추적 아래 그 포트에서 실행했을 때는 다음처럼 성공했다.

```text
TCP_SINGLE_EXIT=0
bind(...) = 0
listen(...) = 0
accept(...) = 4
sendto(..., "RAW_PEER=PASS\n", 14, ...) = 14
RAW_PEER=PASS
```

포트 타입 변환은 이미 동작하며, 반복 시험 포트가 클라이언트 임시 포트와 충돌하지 않도록 선택 범위를 바꿨다. 이 시험 수정 커밋은 `c3dd95a57c7a5d29a6359c198675098e432cd6ba`이다. 수정한 시험은 고정·임의 포트 각 10회를 모두 통과했다.

```text
TCP_FINAL_EXIT=0
TCP_FIXED_PORT=10/10
TCP_RANDOM_PORT=10/10
PEER_FINAL_EXIT=0
PEER_ADDRESS=PASS
```

## 3. 전체 시험과 부트스트랩

`has-key?` 구현 뒤 기존 71건을 한 번 재실행한 원문:

```text
NATIVE_GATE_PASS=0 FAIL=71 TIMEOUT=0 SKIP=0 TOTAL=71
```

DB95-5의 수정 전 결과도 `PASS=0 FAIL=71 TIMEOUT=0 SKIP=0 TOTAL=71`이었다. 통과 수 변화는 **0**이지만, 수정 전 40건이던 `has_key_p` 미선언 첫 오류는 수정 후 **0건**이다. 대표 사례 1의 다음 첫 오류는 `regex_match_i` 미선언이다. 이번 지시서 범위에서 이 후속 기능을 구현하지 않았다.

부트스트랩은 바깥 `strace` 없이 실행했다. stage2=stage3 및 stage3=stage4 비교는 모두 `PASS`였고, 해시 원문은 다음과 같다.

```text
STAGE0_SHA=f7425bf086d99d11231ba79296e194fcc36b454379e46d44131bafb0dc74101c
STAGE1_SHA=412b41fae6ac07254391ccd5943437cde45590e950a51ac277d1f120b04a2596
STAGE2_SHA=412b41fae6ac07254391ccd5943437cde45590e950a51ac277d1f120b04a2596
STAGE3_SHA=412b41fae6ac07254391ccd5943437cde45590e950a51ac277d1f120b04a2596
STAGE4_SHA=412b41fae6ac07254391ccd5943437cde45590e950a51ac277d1f120b04a2596
STAGE2_EQ_STAGE3=PASS
STAGE3_EQ_STAGE4=PASS
STAGE0_EQ_CANONICAL=DIFFERENT
RESIDUAL_PROCESSES=FAIL
```

`STAGE0_SHA`는 스크립트에 고정된 예상 해시와 일치해 시작 검사를 통과했다. `STAGE0_EQ_CANONICAL=DIFFERENT`는 스크립트의 별도 canonical 비교 결과를 그대로 적었다. 바깥 PID 공간에서 두 번 실행했을 때 마지막 잔여 프로세스 검사는 `FAIL`이었다. 다른 작업의 **대기 중인 명령줄**에 `stage2-bin` 문자열이 들어 있었으므로, 그 명령줄을 오인했다는 것은 **추정**이다. 시험 코드를 바꾸지 않고 격리된 PID 공간에서 세 번째로 실행한 결과는 다음과 같다.

```text
BOOTSTRAP_ISOLATED_EXIT=0
STAGE2_EQ_STAGE3=PASS
STAGE3_EQ_STAGE4=PASS
RESIDUAL_PROCESSES=0
CLEAN_CHECKOUT=PASS
```

격리 실행에서도 위 stage0~4 해시는 동일했다. v11 범위 회귀 6개 중 첫 실행은 5개 통과·1개 실패였다. 실패한 접속자 주소 시험의 최초 호출에는 `FX_NATIVE_STAGE0`가 없었고, 후속 두 실행은 임시 포트 범위에서 빈 본문이었다. 비임시 포트에서 `PEER_ADDRESS=PASS`를 확인했다. 같은 실행 환경에서 6개를 다시 실행한 원문:

```text
has-key=PASS
raw-peer=PASS
closure-map-capture=PASS
afj-file-names=PASS
closure-capture=PASS
peer-address=PASS
V11_SCOPED_REGRESSION_PASS=6 FAIL=0
```

과거 `tests/run-tests.sh`가 요구하는 `jit-test-bin`·`gc-stress-bin`은 이 체크아웃에 없어 이 옛 러너를 전체 회귀 통과로 주장하지 않는다.

## 4. 실행 추적, 민감 정보, 원격

한 겹 `strace -f -e trace=execve`로 `has-key?` 시험을 별도 1회 실행했다. 종료값과 성공한 실행 호출 집계 원문:

```text
STRACE_TEST_EXIT=0
NODE=0 NPM=0 NPX=0 JS_PY_SCRIPT=0 PYTHON=0
```

시작 HEAD 대비 새 JS·TS·Python 소스는 0줄이다. 코드와 보고서 변경분의 민감 정보 검사는 커밋 직전에 수행한다. v11 최종 구현 HEAD는 `c3dd95a57c7a5d29a6359c198675098e432cd6ba`이며, 두 저장소의 원격 HEAD는 푸시 뒤 채팅 보고에 원문으로 적는다.

## 5. 남은 71건 첫 오류 묶음

경로와 생성 C의 위치를 제거하고 각 케이스 로그에서 첫 오류 문장만 집계했다. 합계 71건이다.

| 첫 오류 문장 | 건수 | 대표 사례 |
| --- | ---: | ---: |
| `error: implicit declaration of function ‘regex_match_i’` | 28 | 1 |
| `NATIVE_JS_SOURCE_NOT_PORTED` | 10 | 35 |
| `error: implicit declaration of function ‘arr_flatten’` | 7 | 10 |
| `error: implicit declaration of function ‘json_str’` | 6 | 2 |
| `error: redefinition of ‘__fl_wrap_token_at’` | 4 | 6 |
| `error: implicit declaration of function ‘buf_str’` | 3 | 4 |
| `Uncaught error (line 736): (get nil "kind")` | 3 | 24 |
| `error: implicit declaration of function ‘file_read’` | 2 | 26 |
| `node: command not found` | 2 | 9 |
| `error: redefinition of ‘__fl_wrap_sha1_add’` | 1 | 65 |
| `production TLS boundary returned an unexpected error` | 1 | 59 |
| `error: implicit declaration of function ‘conj’` | 1 | 40 |
| `error: implicit declaration of function ‘buf_to_binary’` | 1 | 3 |
| `Uncaught error (line 41): compatibility scorecard failure` | 1 | 28 |
| `[CGC-ERR] unsupported literal type=unknown` | 1 | 71 |

DB95_SUMMARY=4/5
