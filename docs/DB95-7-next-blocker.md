# DB95-7 다음 첫 오류 묶음

접수번호: RUN-20261102-04. DB95 창.

시작 afj-db95 native-run HEAD: 13295a5626d55881e5c79c07a04379ba40ba060c

시작 FX feat/db95-native-peer HEAD: c3dd95a57c7a5d29a6359c198675098e432cd6ba

두 HEAD 일치·CLEAN 확인 후 시작했다. 실행 위치·경로·주소·키는 <가림>.
23·25 서버 및 금지 제품은 사용하지 않았다. ps 기록 후 공용 flock 아래 실행했다.
기준은 메모리 관계형 코어 검증이며 영속성·트랜잭션·네트워크 제품 완성이나 DB95 출시 완료를 주장하지 않는다.

## 수정 전 71건

```text
NATIVE_GATE_PASS=0 FAIL=71 TIMEOUT=0 SKIP=0 TOTAL=71
SUCCESSFUL_NODE_NPM_NPX_EXEC=0 PYTHON_EXEC=0
```

기존 native-release-gate를 그대로 실행했다. 기대값·120/360초 제한·시험 목록은 변경하지 않았다.
JS 러너는 수정하거나 실행하지 않았다. native compiler에 JS를 입력한 사례는 컴파일 실패로 남았다.
shell 사례의 node 호출은 node가 없는 제한 PATH에서 실패했으며 node 실제 실행은 0이다.
각 로그에서 시간순으로 가장 먼저 나온 오류를 선택했다. 경로만 가렸으며 줄·열 번호와 메시지는 보존했다.
이전 보고서의 NATIVE_JS_SOURCE_NOT_PORTED는 뒤에 출력된 marker였던 사례가 있다. 이번에는 그 앞의 실제 첫 compiler 오류를 기록했다.

| 첫 오류 묶음 | 건수 |
|---|---:|
| `missing-native:regex_match_i` | 28 |
| `compiler:unsupported-literal` | 11 |
| `missing-native:arr_flatten` | 7 |
| `missing-native:json_str` | 6 |
| `duplicate-native:__fl_wrap_token_at` | 4 |
| `compiler-js-input:nil-kind` | 3 |
| `missing-native:buf_str` | 3 |
| `missing-native:file_read` | 2 |
| `missing-runner:node` | 2 |
| `duplicate-native:__fl_wrap_sha1_add` | 1 |
| `missing-native:buf_to_binary` | 1 |
| `missing-native:conj` | 1 |
| `production-tls-boundary` | 1 |
| `runtime:compatibility-scorecard` | 1 |

최대 묶음은 missing-native:regex_match_i 28건. TLS 묶음은 최대가 아니며 구현하지 않는다.
JS 입력은 unsupported-literal 11건과 nil-kind 3건으로 총 14건이다.

| 사례 | 시험 | 상태 | 묶음 | 첫 오류 원문 |
|---:|---|---|---|---|
| 1 | syntax: tcp-server | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 2 | syntax: afj-db95 | FAIL | `missing-native:json_str` | `<가림>:168:23: error: implicit declaration of function ‘json_str’; did you mean ‘json_parse’? [-Wimplicit-function-declaration]` |
| 3 | raw binary boundary | FAIL | `missing-native:buf_to_binary` | `<fl>:2:14: error: implicit declaration of function ‘buf_to_binary’ [-Wimplicit-function-declaration]` |
| 4 | MariaDB packet codec | FAIL | `missing-native:buf_str` | `<fl>:9:28: error: implicit declaration of function ‘buf_str’ [-Wimplicit-function-declaration]` |
| 5 | MariaDB charset contract | FAIL | `missing-native:buf_str` | `<fl>:9:28: error: implicit declaration of function ‘buf_str’ [-Wimplicit-function-declaration]` |
| 6 | COLLATE contract | FAIL | `duplicate-native:__fl_wrap_token_at` | `<가림>:1678:16: error: redefinition of ‘__fl_wrap_token_at’` |
| 7 | page/WAL smoke | FAIL | `missing-native:json_str` | `<가림>:168:23: error: implicit declaration of function ‘json_str’; did you mean ‘json_parse’? [-Wimplicit-function-declaration]` |
| 8 | metrics contract | FAIL | `missing-native:regex_match_i` | `<가림>:1482:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 9 | local canary rollback | FAIL | `missing-runner:node` | `<가림>: line 11: node: command not found` |
| 10 | large corpus | FAIL | `missing-native:arr_flatten` | `<fl>:299:107: error: implicit declaration of function ‘arr_flatten’; did you mean ‘flatten’? [-Wimplicit-function-declaration]` |
| 11 | TCP catalog pages | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 12 | TCP lazy catalog eviction | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 13 | persistent recursive B+Tree | FAIL | `missing-native:json_str` | `<가림>:208:23: error: implicit declaration of function ‘json_str’; did you mean ‘json_parse’? [-Wimplicit-function-declaration]` |
| 14 | bounded B+Tree range | FAIL | `missing-native:arr_flatten` | `<fl>:299:107: error: implicit declaration of function ‘arr_flatten’; did you mean ‘flatten’? [-Wimplicit-function-declaration]` |
| 15 | compound unique index | FAIL | `duplicate-native:__fl_wrap_token_at` | `<가림>:1676:16: error: redefinition of ‘__fl_wrap_token_at’` |
| 16 | compound predicate range | FAIL | `duplicate-native:__fl_wrap_token_at` | `<가림>:1697:16: error: redefinition of ‘__fl_wrap_token_at’` |
| 17 | schema MVCC merge | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 18 | composite type order | FAIL | `missing-native:arr_flatten` | `<fl>:299:107: error: implicit declaration of function ‘arr_flatten’; did you mean ‘flatten’? [-Wimplicit-function-declaration]` |
| 19 | composite NULL order | FAIL | `missing-native:arr_flatten` | `<fl>:299:107: error: implicit declaration of function ‘arr_flatten’; did you mean ‘flatten’? [-Wimplicit-function-declaration]` |
| 20 | schema-aware composite order | FAIL | `missing-native:arr_flatten` | `<fl>:299:107: error: implicit declaration of function ‘arr_flatten’; did you mean ‘flatten’? [-Wimplicit-function-declaration]` |
| 21 | mixed declared composite types | FAIL | `missing-native:arr_flatten` | `<fl>:299:107: error: implicit declaration of function ‘arr_flatten’; did you mean ‘flatten’? [-Wimplicit-function-declaration]` |
| 22 | composite reopen rebuild | FAIL | `missing-native:arr_flatten` | `<fl>:299:107: error: implicit declaration of function ‘arr_flatten’; did you mean ‘flatten’? [-Wimplicit-function-declaration]` |
| 23 | schema-aware composite range | FAIL | `duplicate-native:__fl_wrap_token_at` | `<가림>:1669:16: error: redefinition of ‘__fl_wrap_token_at’` |
| 24 | TCP concurrency | FAIL | `compiler-js-input:nil-kind` | `Uncaught error (line 736): (get nil "kind") — nil에 key 접근 불가. nil 체크 먼저.` |
| 25 | TCP 5m performance envelope | FAIL | `compiler-js-input:nil-kind` | `Uncaught error (line 736): (get nil "kind") — nil에 key 접근 불가. nil 체크 먼저.` |
| 26 | backup smoke | FAIL | `missing-native:file_read` | `<가림>:57:38: error: implicit declaration of function ‘file_read’; did you mean ‘fl_file_read’? [-Wimplicit-function-declaration]` |
| 27 | backup restore soak | FAIL | `missing-native:file_read` | `<가림>:59:38: error: implicit declaration of function ‘file_read’; did you mean ‘fl_file_read’? [-Wimplicit-function-declaration]` |
| 28 | compatibility scorecard | FAIL | `runtime:compatibility-scorecard` | `Uncaught error (line 41): compatibility scorecard failure` |
| 29 | AFJ error token mapping | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 30 | MariaDB remediation regression | FAIL | `missing-native:regex_match_i` | `<가림>:1494:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 31 | MariaDB unsupported contract | FAIL | `missing-native:regex_match_i` | `<가림>:1030:71: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 32 | TCP database session scope | FAIL | `missing-native:regex_match_i` | `<가림>:1488:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 33 | WAL format | FAIL | `missing-native:regex_match_i` | `<가림>:1483:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 34 | forced-kill WAL recovery | FAIL | `missing-runner:node` | `<가림>: line 24: node: command not found` |
| 35 | TCP transaction forced-kill recovery | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=12` |
| 36 | transaction isolation | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 37 | isolation levels | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 38 | MVCC conflicts | FAIL | `missing-native:regex_match_i` | `<가림>:1482:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 39 | range predicate conflict | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 40 | row-version MVCC core | FAIL | `missing-native:conj` | `<fl>:86:441: error: implicit declaration of function ‘conj’ [-Wimplicit-function-declaration]` |
| 41 | row-version WAL recovery | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 42 | row-version catalog checkpoint | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 43 | savepoint | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 44 | deadlock | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 45 | lock timeout | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 46 | prepared JSON adapter | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 47 | request limits | FAIL | `missing-native:regex_match_i` | `<가림>:1482:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 48 | slow request timeout | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 49 | auth lockout | FAIL | `missing-native:json_str` | `<fl>:76:123: error: implicit declaration of function ‘json_str’; did you mean ‘json_parse’? [-Wimplicit-function-declaration]` |
| 50 | auth lockout reset | FAIL | `missing-native:json_str` | `<fl>:76:123: error: implicit declaration of function ‘json_str’; did you mean ‘json_parse’? [-Wimplicit-function-declaration]` |
| 51 | auth state recovery | FAIL | `missing-native:json_str` | `<fl>:76:123: error: implicit declaration of function ‘json_str’; did you mean ‘json_parse’? [-Wimplicit-function-declaration]` |
| 52 | session cleanup | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 53 | session TTL | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 54 | connection rate limit | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 55 | peer IP rate limit | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 56 | runtime peer IP rate limit | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=12` |
| 57 | fragmented TCP requests | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 58 | SQL error mapping | FAIL | `missing-native:regex_match_i` | `<가림>:1480:12: error: implicit declaration of function ‘regex_match_i’; did you mean ‘regex_match’? [-Wimplicit-function-declaration]` |
| 59 | production TLS boundary | FAIL | `production-tls-boundary` | `production TLS boundary returned an unexpected error` |
| 60 | native TLS listener | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=9` |
| 61 | native TLS mTLS/reload | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=9` |
| 62 | production native TLS integration | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=9` |
| 63 | TLS adapter handshake/reload | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=8` |
| 64 | MariaDB wire packet unit | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=9` |
| 65 | MariaDB mysql_native_password SHA-1 | FAIL | `duplicate-native:__fl_wrap_sha1_add` | `<가림>:242:16: error: redefinition of ‘__fl_wrap_sha1_add’` |
| 66 | MariaDB wire prepared | FAIL | `compiler-js-input:nil-kind` | `Uncaught error (line 736): (get nil "kind") — nil에 key 접근 불가. nil 체크 먼저.` |
| 67 | MariaDB standard-client smoke | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=15` |
| 68 | native MariaDB wire | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=9` |
| 69 | native MariaDB auth rejection | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=11` |
| 70 | native MariaDB decoder | FAIL | `missing-native:buf_str` | `<fl>:9:28: error: implicit declaration of function ‘buf_str’ [-Wimplicit-function-declaration]` |
| 71 | native MariaDB prepared | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=11` |

## 옛 러너의 실행 파일

jit-test-bin·gc-stress-bin은 Git 추적 파일이며 index 표시는 각각 S다. sparse-checkout 선택 범위에서 제외돼 작업 트리에 전개되지 않았다.
두 .fl 원본과 runtime/jit.c는 존재한다. 기존 ELF 복사 대신 native compiler→C→GCC로 별도 격리 위치에서 재생성했고 옛 러너 10건을 통과했다.
추적 ELF 크기 원문: jit-test-bin 146200 bytes, gc-stress-bin 150720 bytes. 호스트와 ELF는 x86-64.
파일 부재는 소스 부재나 기능 미구현으로 단정할 수 없다. .gitignore의 *-bin 규칙이 추적 파일을 삭제한 것은 아니다.

## 최대 묶음

정답 선커밋 FX HEAD: fa8cbbb260b757ec1ec8332a0c48d8caa541f949

정답은 15개 case-insensitive 결과·3개 기존 API 결과와 오류 3건이다. 구현 전 regex_match_i 미선언으로 재현 실패했으며 원문을 보존했다.
AFJ 호출부는 text, pattern 순서다. 기존 native regex_match는 pattern, text 순서이며 변경하지 않는다.
기존 native POSIX ERE engine으로 새 이름을 구현했다. JS RegExp 전체 문법·자동 문자열 변환 호환은 주장하지 않는다.
지정 FX 브랜치에는 E09·E10 브라우저 기능과 시험이 없어 그 처리 범위는 별도 질문 중이다.

## 구현 결과와 범위

구현 커밋: 22fc74c4bed99a71f726eea9ce2bf63fb8bcb191.
검증한 FX 최종 HEAD: 985824f4b60a3131e33a94ef0bab6a253b0d8fe5.
기존 POSIX ERE engine에 REG_ICASE를 지정하는 native 함수와 C 선언만 추가했다.
compiler의 기존 일반 native 호출이 해당 선언·구현에 연결되므로 .fl compiler 소스는 변경하지 않았다.
성공·불일치는 boolean, 잘못된 패턴과 문자열이 아닌 인자는 명시적 오류로 드러낸다.
기존 regex_match의 pattern-first 순서·case sensitivity·잘못된 패턴 false 동작은 유지했다.
새 정답 18건과 오류 3건은 수정 후 첫 실행에서 통과했다. 고정 정답은 선커밋 이후 byte 변경 0.
원문: regex-before.txt, regex-after.txt. 수정 전 실패는 증거로만 보존했다.

JS 런타임의 전체 RegExp 문법·자동 타입 변환을 이식한 결과는 아니다.
새 함수는 문자열 입력의 기존 native ERE 문법과 db95 SQL keyword/error 패턴을 검증했다.
기존 JS 러너·db95 핵심 .fls·release/native gate·기대값·제한시간은 수정하지 않았다.
새 JS·TS·Python 소스 파일은 두 저장소 모두 0개. TLS 구현은 수정하지 않았다.

## native로 만든 옛 실행 파일

두 기존 .fl 원본을 현재 native compiler로 C 생성하고 GCC로 링크했다.
JIT 구현은 기존 runtime/jit.c를 포함했으며 새 JIT나 대체 해석기를 만들지 않았다.
원본 repo의 sparse 상태와 추적 ELF를 유지하고 별도 격리 위치 <가림>에 두 실행 파일을 생성했다.
옛 tests/run-tests.sh 사본은 원본과 cmp 일치했으며 같은 10개 기대값으로 실행했다.
원문: missing-binaries.txt, legacy-native.txt.

```text
LEGACY_NATIVE_jit-test_BUILD=PASS
LEGACY_NATIVE_gc-stress_BUILD=PASS
LEGACY_RUNNER_BYTES=UNCHANGED
결과: 10 PASS / 0 FAIL / 10 총
LEGACY_NATIVE_EXIT=0
```

## 71건 재실행 변화

```text
수정 전: NATIVE_GATE_PASS=0 FAIL=71 TIMEOUT=0 SKIP=0 TOTAL=71
수정 후: NATIVE_GATE_PASS=0 FAIL=71 TIMEOUT=0 SKIP=0 TOTAL=71
REGEX_FIRST_ERROR_CASES_BEFORE=28 AFTER=0 REMOVED=28
```

통과 수 변화는 0이다. 선택한 미선언 첫 오류 28건이 사라졌고, 27건은 process_exit 미선언,
1건은 __fl_wrap_token_at 중복 정의로 첫 오류가 이동했다. 28건 전체 시험 통과를 주장하지 않는다.
다음 최대 묶음 process_exit 27건과 다른 잠재 오류는 이번 한 묶음 범위에서 수정하지 않았다.
아래 합계는 전후 각각 71건이다. 원문 TSV와 각 원본 로그 SHA-256을 함께 보존했다.

| 묶음 | 수정 전 | 수정 후 | 변화 |
|---|---:|---:|---:|
| `compiler-js-input:nil-kind` | 3 | 3 | +0 |
| `compiler:unsupported-literal` | 11 | 11 | +0 |
| `duplicate-native:__fl_wrap_sha1_add` | 1 | 1 | +0 |
| `duplicate-native:__fl_wrap_token_at` | 4 | 5 | +1 |
| `missing-native:arr_flatten` | 7 | 7 | +0 |
| `missing-native:buf_str` | 3 | 3 | +0 |
| `missing-native:buf_to_binary` | 1 | 1 | +0 |
| `missing-native:conj` | 1 | 1 | +0 |
| `missing-native:file_read` | 2 | 2 | +0 |
| `missing-native:json_str` | 6 | 6 | +0 |
| `missing-native:process_exit` | 0 | 27 | +27 |
| `missing-native:regex_match_i` | 28 | 0 | -28 |
| `missing-runner:node` | 2 | 2 | +0 |
| `production-tls-boundary` | 1 | 1 | +0 |
| `runtime:compatibility-scorecard` | 1 | 1 | +0 |

production-tls-boundary 1건은 wrapper의 첫 오류 문장이다. 그 로그에는 node 명령 부재도 기록돼 있으며
이 결과만으로 TLS engine 자체의 결함을 입증하지 않는다. JS TLS 사례도 첫 compiler 오류로 분류했다.

| 사례 | 시험 | 상태 | 묶음 | 수정 후 첫 오류 원문 |
|---:|---|---|---|---|
| 1 | syntax: tcp-server | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 2 | syntax: afj-db95 | FAIL | `missing-native:json_str` | `<가림>:168:23: error: implicit declaration of function ‘json_str’; did you mean ‘json_parse’? [-Wimplicit-function-declaration]` |
| 3 | raw binary boundary | FAIL | `missing-native:buf_to_binary` | `<fl>:2:14: error: implicit declaration of function ‘buf_to_binary’ [-Wimplicit-function-declaration]` |
| 4 | MariaDB packet codec | FAIL | `missing-native:buf_str` | `<fl>:9:28: error: implicit declaration of function ‘buf_str’ [-Wimplicit-function-declaration]` |
| 5 | MariaDB charset contract | FAIL | `missing-native:buf_str` | `<fl>:9:28: error: implicit declaration of function ‘buf_str’ [-Wimplicit-function-declaration]` |
| 6 | COLLATE contract | FAIL | `duplicate-native:__fl_wrap_token_at` | `<가림>:1678:16: error: redefinition of ‘__fl_wrap_token_at’` |
| 7 | page/WAL smoke | FAIL | `missing-native:json_str` | `<가림>:168:23: error: implicit declaration of function ‘json_str’; did you mean ‘json_parse’? [-Wimplicit-function-declaration]` |
| 8 | metrics contract | FAIL | `missing-native:process_exit` | `<가림>:1621:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 9 | local canary rollback | FAIL | `missing-runner:node` | `<가림>: line 11: node: command not found` |
| 10 | large corpus | FAIL | `missing-native:arr_flatten` | `<fl>:299:107: error: implicit declaration of function ‘arr_flatten’; did you mean ‘flatten’? [-Wimplicit-function-declaration]` |
| 11 | TCP catalog pages | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 12 | TCP lazy catalog eviction | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 13 | persistent recursive B+Tree | FAIL | `missing-native:json_str` | `<가림>:208:23: error: implicit declaration of function ‘json_str’; did you mean ‘json_parse’? [-Wimplicit-function-declaration]` |
| 14 | bounded B+Tree range | FAIL | `missing-native:arr_flatten` | `<fl>:299:107: error: implicit declaration of function ‘arr_flatten’; did you mean ‘flatten’? [-Wimplicit-function-declaration]` |
| 15 | compound unique index | FAIL | `duplicate-native:__fl_wrap_token_at` | `<가림>:1676:16: error: redefinition of ‘__fl_wrap_token_at’` |
| 16 | compound predicate range | FAIL | `duplicate-native:__fl_wrap_token_at` | `<가림>:1697:16: error: redefinition of ‘__fl_wrap_token_at’` |
| 17 | schema MVCC merge | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 18 | composite type order | FAIL | `missing-native:arr_flatten` | `<fl>:299:107: error: implicit declaration of function ‘arr_flatten’; did you mean ‘flatten’? [-Wimplicit-function-declaration]` |
| 19 | composite NULL order | FAIL | `missing-native:arr_flatten` | `<fl>:299:107: error: implicit declaration of function ‘arr_flatten’; did you mean ‘flatten’? [-Wimplicit-function-declaration]` |
| 20 | schema-aware composite order | FAIL | `missing-native:arr_flatten` | `<fl>:299:107: error: implicit declaration of function ‘arr_flatten’; did you mean ‘flatten’? [-Wimplicit-function-declaration]` |
| 21 | mixed declared composite types | FAIL | `missing-native:arr_flatten` | `<fl>:299:107: error: implicit declaration of function ‘arr_flatten’; did you mean ‘flatten’? [-Wimplicit-function-declaration]` |
| 22 | composite reopen rebuild | FAIL | `missing-native:arr_flatten` | `<fl>:299:107: error: implicit declaration of function ‘arr_flatten’; did you mean ‘flatten’? [-Wimplicit-function-declaration]` |
| 23 | schema-aware composite range | FAIL | `duplicate-native:__fl_wrap_token_at` | `<가림>:1669:16: error: redefinition of ‘__fl_wrap_token_at’` |
| 24 | TCP concurrency | FAIL | `compiler-js-input:nil-kind` | `Uncaught error (line 736): (get nil "kind") — nil에 key 접근 불가. nil 체크 먼저.` |
| 25 | TCP 5m performance envelope | FAIL | `compiler-js-input:nil-kind` | `Uncaught error (line 736): (get nil "kind") — nil에 key 접근 불가. nil 체크 먼저.` |
| 26 | backup smoke | FAIL | `missing-native:file_read` | `<가림>:57:38: error: implicit declaration of function ‘file_read’; did you mean ‘fl_file_read’? [-Wimplicit-function-declaration]` |
| 27 | backup restore soak | FAIL | `missing-native:file_read` | `<가림>:59:38: error: implicit declaration of function ‘file_read’; did you mean ‘fl_file_read’? [-Wimplicit-function-declaration]` |
| 28 | compatibility scorecard | FAIL | `runtime:compatibility-scorecard` | `Uncaught error (line 41): compatibility scorecard failure` |
| 29 | AFJ error token mapping | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 30 | MariaDB remediation regression | FAIL | `missing-native:process_exit` | `<가림>:1633:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 31 | MariaDB unsupported contract | FAIL | `duplicate-native:__fl_wrap_token_at` | `<가림>:1678:16: error: redefinition of ‘__fl_wrap_token_at’` |
| 32 | TCP database session scope | FAIL | `missing-native:process_exit` | `<가림>:1627:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 33 | WAL format | FAIL | `missing-native:process_exit` | `<가림>:1622:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 34 | forced-kill WAL recovery | FAIL | `missing-runner:node` | `<가림>: line 24: node: command not found` |
| 35 | TCP transaction forced-kill recovery | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=12` |
| 36 | transaction isolation | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 37 | isolation levels | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 38 | MVCC conflicts | FAIL | `missing-native:process_exit` | `<가림>:1621:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 39 | range predicate conflict | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 40 | row-version MVCC core | FAIL | `missing-native:conj` | `<fl>:86:441: error: implicit declaration of function ‘conj’ [-Wimplicit-function-declaration]` |
| 41 | row-version WAL recovery | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 42 | row-version catalog checkpoint | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 43 | savepoint | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 44 | deadlock | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 45 | lock timeout | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 46 | prepared JSON adapter | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 47 | request limits | FAIL | `missing-native:process_exit` | `<가림>:1621:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 48 | slow request timeout | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 49 | auth lockout | FAIL | `missing-native:json_str` | `<fl>:76:123: error: implicit declaration of function ‘json_str’; did you mean ‘json_parse’? [-Wimplicit-function-declaration]` |
| 50 | auth lockout reset | FAIL | `missing-native:json_str` | `<fl>:76:123: error: implicit declaration of function ‘json_str’; did you mean ‘json_parse’? [-Wimplicit-function-declaration]` |
| 51 | auth state recovery | FAIL | `missing-native:json_str` | `<fl>:76:123: error: implicit declaration of function ‘json_str’; did you mean ‘json_parse’? [-Wimplicit-function-declaration]` |
| 52 | session cleanup | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 53 | session TTL | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 54 | connection rate limit | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 55 | peer IP rate limit | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 56 | runtime peer IP rate limit | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=12` |
| 57 | fragmented TCP requests | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 58 | SQL error mapping | FAIL | `missing-native:process_exit` | `<가림>:1619:46: error: implicit declaration of function ‘process_exit’; did you mean ‘_fl_process_exec’? [-Wimplicit-function-declaration]` |
| 59 | production TLS boundary | FAIL | `production-tls-boundary` | `production TLS boundary returned an unexpected error` |
| 60 | native TLS listener | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=9` |
| 61 | native TLS mTLS/reload | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=9` |
| 62 | production native TLS integration | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=9` |
| 63 | TLS adapter handshake/reload | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=8` |
| 64 | MariaDB wire packet unit | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=9` |
| 65 | MariaDB mysql_native_password SHA-1 | FAIL | `duplicate-native:__fl_wrap_sha1_add` | `<가림>:242:16: error: redefinition of ‘__fl_wrap_sha1_add’` |
| 66 | MariaDB wire prepared | FAIL | `compiler-js-input:nil-kind` | `Uncaught error (line 736): (get nil "kind") — nil에 key 접근 불가. nil 체크 먼저.` |
| 67 | MariaDB standard-client smoke | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=15` |
| 68 | native MariaDB wire | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=9` |
| 69 | native MariaDB auth rejection | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=11` |
| 70 | native MariaDB decoder | FAIL | `missing-native:buf_str` | `<fl>:9:28: error: implicit declaration of function ‘buf_str’ [-Wimplicit-function-declaration]` |
| 71 | native MariaDB prepared | FAIL | `compiler:unsupported-literal` | `[CGC-ERR] unsupported literal type=unknown line=11` |

## v11 범위 회귀·격리 bootstrap

has-key, raw-peer-ports, closure-map-capture, afj-file-names, closure-capture,
peer-address를 기존 시험 그대로 실행했다. 접속 listener는 기존 환경 인자로 비임시 포트를 사용했다.
새 오류와 기존 오류를 구별하여 같은 점검을 반복 실패시키지 않았다.

```text
has-key=PASS
raw-peer-ports=PASS
closure-map-capture=PASS
afj-file-names=PASS
closure-capture=PASS
peer-address=PASS
V11_SCOPED_REGRESSION_PASS=6 FAIL=0
LEGACY_NATIVE_EXIT=0
BOOTSTRAP_ISOLATED_EXIT=0
DB95_7_REGRESSION=PASS
```

원문: regression.txt, scoped-*.txt. 기존 seed·compiler .fl·옛 러너·fixture는 변경하지 않았다.
원래 trace 기반 bootstrap 검증기는 그대로 두고 별도 static 모드를 추가했다.
동일 세션에서 승인한 “내부 strace도 제거하고, 동일한 seed·빌드·정답·고정점 검사는 유지하되 실행 감사는 정적 감사로 구분해 기록” 방식을 사용했다.
seed 해시·오염 검사·같은 GCC 빌드·stage 비교·배열 loop 결과 3·잔여 프로세스 검사를 유지했다.
PID·user namespace로 격리하고 bootstrap 안팎에 strace 없이 실행했다.

```text
STAGE0_SHA=f7425bf086d99d11231ba79296e194fcc36b454379e46d44131bafb0dc74101c
STAGE1_SHA=412b41fae6ac07254391ccd5943437cde45590e950a51ac277d1f120b04a2596
STAGE2_SHA=412b41fae6ac07254391ccd5943437cde45590e950a51ac277d1f120b04a2596
STAGE3_SHA=412b41fae6ac07254391ccd5943437cde45590e950a51ac277d1f120b04a2596
STAGE4_SHA=412b41fae6ac07254391ccd5943437cde45590e950a51ac277d1f120b04a2596
STAGE2_EQ_STAGE3=PASS
STAGE3_EQ_STAGE4=PASS
ARRAY_LOOP=PASS
RESIDUAL_PROCESSES=0
CLEAN_CHECKOUT=PASS
BOOTSTRAP_STRACE=0
BOOTSTRAP_STATIC_FORBIDDEN_PROCESS_TOKENS=0
BOOTSTRAP_STATIC_AUDIT=PASS
BOOTSTRAP_DYNAMIC_EXEC_COUNTS=UNOBSERVED
BOOTSTRAP_DYNAMIC_FILE_ACCESS_COUNTS=UNOBSERVED
```

고정점은 지정 브랜치의 DB95-6 결과와 동일하다. seed 교체와 canonical 기대값 변경은 없다.
STAGE0_EQ_CANONICAL=DIFFERENT도 원문 그대로 유지했다.
정적 감사는 seed·생성 compiler C의 금지 process 토큰에 한정하며 runtime·링크 전체 동적 감사가 아니다.
원문: bootstrap.txt, bootstrap-static-audit.txt. 동적 감사 0으로 바꾸어 보고하지 않는다.
71건 전후와 범위 회귀·옛 러너의 성공 exec 추적에는 node/npm/npx/Python 실행 0.
원문: exec-audit.txt. 제한 PATH에서 node를 찾지 못한 shell 실패도 숨기지 않았다.

## E09·E10: 대상 브랜치 미구현과 별도 참고 검증

지정 FX 브랜치에는 browser-target.h, browser-core.fl, E09·E10 fixture와 Chrome driver,
--browser CLI 분기가 없다. browser-capability.txt에 각각 PRESENT=0을 기록했다.
이 브랜치에서 E09·E10 Chrome 20/20은 확인할 수 없다.
기능 전체 이식은 이번 최대 오류 묶음 하나의 범위를 크게 넘으므로 처리 범위를 질문해 두었다.
답변 없이 이식하거나 대상 브랜치 통과로 계산하지 않는다.

별도로 해당 기능이 존재하는 검증 완료 브랜치에서 실제 Chrome 참고 재실행을 했다.

```text
BROWSER_BASELINE_BRANCH=feat/blog-platform-completion
BROWSER_BASELINE_HEAD=02176817d44f4d998a3f0b8ac04cec4373e04a7f
BROWSER_BASELINE_http_EXIT=0
BROWSER_BASELINE_cancel_EXIT=0
BROWSER_BASELINE=PASS
L01_BROWSER_HTTP_PASS=20 FAIL=0
L01_BROWSER_CANCEL_PASS=20 FAIL=0
```

원문: browser-baseline.txt, browser-baseline-http.txt, browser-baseline-cancel.txt 및 화면 텍스트.
이 별도 브랜치 결과는 지정 DB95 브랜치의 회귀 통과를 증명하지 않는다.

## 판정과 제출

| 항목 | 판정 |
|---|---|
| 1 첫 오류 분류표 | PASS: 전후 각 71건 원문·묶음·SHA-256 |
| 2 빠진 실행 파일 | PASS: sparse 원인 확인, native 재생성, 옛 러너 10/0 |
| 3 최대 묶음 정답 선커밋·구현 | PASS: regex_match_i 28건, 정답 18/0·오류 3/3 |
| 4 재실행 숫자 변화 | PASS: 통과 0→0, 선택 첫 오류 28→0, 다음 process_exit 27 |
| 5 회귀·bootstrap·푸시·CLEAN | 미완료: 지정 브랜치 E09·E10 미구현. 범위 6/0·bootstrap 및 별도 브라우저 20/20 확인 |

원본 로그·실행 추적·ps는 비공개 <가림>에 보존하고 raw-sha256.txt에 원본 해시를 기록했다.
공개본은 경로·주소를 가리고 CR을 문자 그대로의 \r로 표시하며 수치·해시는 유지한다.
커밋 전 민감정보 diff를 확인하고 Forgejo→GitHub 순서로 제출하며 최종 원격 ref·CLEAN 결과를 추가한다.

DB95_SUMMARY=4/5
