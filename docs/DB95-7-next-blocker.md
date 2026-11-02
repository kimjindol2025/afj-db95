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
두 .fl 원본과 runtime/jit.c는 존재한다. 기존 ELF 복사 대신 native compiler→C→GCC로 별도 격리 위치에서 만들 수 있는지 확인한다.
추적 ELF 크기 원문: jit-test-bin 146200 bytes, gc-stress-bin 150720 bytes. 호스트와 ELF는 x86-64.
파일 부재는 소스 부재나 기능 미구현으로 단정할 수 없다. .gitignore의 *-bin 규칙이 추적 파일을 삭제한 것은 아니다.

## 최대 묶음

정답 선커밋 FX HEAD: fa8cbbb260b757ec1ec8332a0c48d8caa541f949

정답은 15개 case-insensitive 결과·3개 기존 API 결과와 오류 3건이다. 구현 전 regex_match_i 미선언으로 재현 실패했으며 원문을 보존했다.
AFJ 호출부는 text, pattern 순서다. 기존 native regex_match는 pattern, text 순서이며 변경하지 않는다.
기존 native POSIX ERE engine으로 새 이름을 구현한다. JS RegExp 전체 문법·자동 문자열 변환 호환은 주장하지 않는다.
지정 FX 브랜치에는 E09·E10 브라우저 기능과 시험이 없어 그 처리 범위는 별도 질문 중이다.

DB95_SUMMARY=1/5
