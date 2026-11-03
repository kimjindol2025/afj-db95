# DB95-10 회귀 복구와 row 묶음

접수번호: RUN-20261103-08. 경로는 `<가림>` 처리한다. 실행 환경에서 node를 호출하지 않았다.

## 0. 기준 HEAD

- afj-db95 `native-run`: `b60320b86de044179f284d2e7aa537a111e6da0f`
- freelang-v11-fx `feat/db95-native-peer`: `21d588f4e95efb0619cc5aacfe849a49a595758e`
- DB95-8 FX 비교 HEAD: `be83234e627cfcc85abb7ee993e8309cbdd3730b`

## 1. 회귀 원인

DB95-9의 보고에는 v11 6건 중 네 실패가 기록되어 있다. 원문 첫 오류는 다음과 같다.

| 시험 | 실패 원문 |
|---|---|
| `has-key` | `error: implicit declaration of function ‘map_has_key_p’; did you mean ‘fl_has_key’?` |
| `closure-map-capture` | `error: ‘collation’ undeclared (first use in this function)`; 이어 `‘row’ undeclared`, `‘key’ undeclared` |
| `afj-file-names` | `error: implicit declaration of function ‘file_append’; did you mean ‘_fl_file_append’?`; 이어 `implicit declaration of function ‘file_size’` |
| `closure-capture` | `error: ‘row’ undeclared (first use in this function)` |

동일한 최종 Stage1 컴파일러(`<가림>`)로 DB95-8 HEAD와 DB95-9 현재 HEAD를 비교한 결과:

```text
DB95-8: has-key=FAIL closure-map-capture=PASS afj-file-names=PASS closure-capture=PASS
DB95-9: has-key=FAIL closure-map-capture=PASS afj-file-names=PASS closure-capture=PASS
```

따라서 callback flat 인자, raw_tcp 5인자, symbol closure 변경은 이 네 결과의 원인이 아니다. 네 실패 기록은 Stage0 컴파일러를 회귀 실행에 사용한 단계 오류였으며, 그 Stage0에서는 기준본과 현재본 모두 네 시험이 실패했다.

남은 실제 언어 결함은 기준본에도 있던 predicate 정규화 문제다. `self/cgc-main.fl:1119`는 `map-has-key?`만 매핑했지만 parser는 predicate를 `map-has-key-p`로 정규화해 생성 C에 없는 `map_has_key_p` 호출을 냈다. `runtime/collection.c:166`에는 `fl_map_has_key`가 구현되어 있다. `self/cgc-main.fl:1120-1121`에 정규화된 이름의 매핑을 추가해 같은 runtime API로 연결했다. fixture, 기대값, 임계값, 시험 활성 상태는 변경하지 않았다.

## 2. 회귀 및 raw_tcp 확인

최종 native compiler는 현 FX checkout의 `bootstrap/stage0.c`에서 `self/cgc-main.fl`을 다시 번역하고 runtime과 링크해 만들었다. 잠금 전에 `ps`를 저장했고, 모든 무거운 시험은 `flock -o /tmp/fl-heavy.lock` 안에서 수행했다.

```text
has-key=PASS
raw-peer-ports=PASS
closure-map-capture=PASS
afj-file-names=PASS
closure-capture=PASS
peer-address=PASS
V11_SCOPED_REGRESSION_PASS=6 FAIL=0
```

raw_tcp 가벼운 확인:

```text
RAW_PEER=PASS
RAW_NAME_DISPATCH=REJECTED
```

`raw-peer-ports.sh`도 통과했다. 보류 경계 probe는 float yield 0초, 빈 host 오류를 관찰한 뒤 chunk 단계에서 결과를 내지 못하고 종료되었다. 이 다섯 경계(빈 host, 소수 yield, 4096-byte chunk, NUL 잘림, 느린 상대)는 수정하지 않았다.

## 3. 보호 묶음과 전체 DB95 gate

gate 원문:

```text
NATIVE_GATE_PASS=34 FAIL=37 TIMEOUT=0 SKIP=0 TOTAL=71
```

첫 오류 묶음 전체 표(큰 순):

| 첫 오류 묶음 | 건수 |
|---|---:|
| PASS | 34 |
| `compiler:unsupported-literal` | 11 |
| `missing-native:buf_str` | 4 |
| `compiler-js-input:nil-kind` | 3 |
| `missing-native:sleep_ms` | 3 |
| `missing-native:file_mtime` | 2 |
| `missing-runner:node` | 2 |
| `runtime:[oversized-wal-smoke-test] oversized WAL was accepted` | 2 |
| `NATIVE_PASS_MARKER_MISSING` | 1 |
| `missing-native:buf_to_binary` | 1 |
| `missing-native:rem` | 1 |
| `production-tls-boundary` | 1 |
| `runtime:TCP row-version WAL recovery failed` | 1 |
| `runtime:TCP row-version chain integration failed` | 1 |
| `runtime:durable row-version checkpoint was not written` | 1 |
| `runtime:file_write PATH_OR_ACCESS_DENIED` | 1 |
| `runtime:lazy transaction snapshot changed` | 1 |
| `runtime:range delete conflict was not detected` | 1 |

보호 묶음 첫 오류 수는 `peer=0`, `process_exit=0`, `regex_match_i=0`, `has_key_p=0`이다. 이전 보고의 `compiler:undeclared:row=43`은 올바른 최종 컴파일러로 재실행한 결과 재현되지 않았다. 이번 최대 묶음은 `compiler:unsupported-literal` 11건이며 다음 후보는 `missing-native:buf_str` 4건이다. 이 단계에서는 묶음 수정에 착수하지 않았다.

푸시 후 올바른 `CPATH`/`LIBRARY_PATH`를 지정해 71건을 다시 실행한 결과도 동일했다:

```text
NATIVE_GATE_PASS=34 FAIL=37 TIMEOUT=0 SKIP=0 TOTAL=71
```

첫 재실행은 이 두 헤더 경로를 넘기지 않아 `curl/curl.h` 컴파일 오류가 반복됐다. 동일 오류가 세 차례 나온 뒤 그 실행을 중단하고 환경을 바로잡아 위의 유효한 결과를 얻었다. 푸시 후에도 보호 묶음은 각각 0건이고 `compiler:undeclared:row`는 0건이다.

## 4. 고정점, 커밋, 푸시

격리 native bootstrap은 첫 실행에서 curl 헤더 include 경로 누락으로 빌드 실패했다. `CPATH`와 `LIBRARY_PATH`를 지정한 재실행은 통과했다. 재실행은 strace 없이 수행했다. 원문 해시:

```text
STAGE2_SHA=6a0d4e384a18834d4f0cb03c10460aade5bf05f999f5db981dd5dc275d313e7d
STAGE3_SHA=6a0d4e384a18834d4f0cb03c10460aade5bf05f999f5db981dd5dc275d313e7d
STAGE4_SHA=6a0d4e384a18834d4f0cb03c10460aade5bf05f999f5db981dd5dc275d313e7d
```

`FIXPOINT_LOG`: Stage2·3·4는 동일하다. 이전 고정점 `2e7a802f8102c5bf4826bae532486778212ebcbe50539ab74316936f2c3d122f`에서 새 고정점으로 바뀐 이유는 `self/cgc-main.fl`에 정규화된 `map-has-key-p`의 native API 매핑을 추가했기 때문이다. Stage0 seed는 변경하지 않았다.

민감정보 diff 검사는 두 저장소 모두 통과했다. 커밋 및 Forgejo → GitHub 푸시:

| 저장소 | 커밋 | Forgejo | GitHub |
|---|---|---|---|
| freelang-v11-fx `feat/db95-native-peer` | `b8fdb29b94eec109db245172237c2d5a55e4c001` | PASS | PASS |
| afj-db95 `native-run` | `203861dc075f4496f9cac040a9e74cc53b27f743` | PASS | PASS |

두 저장소 모두 푸시 후 local, Forgejo, GitHub의 branch HEAD가 일치함을 확인했다. 이 보고서의 사후 gate 결과를 추가한 AFJ 문서 커밋은 별도 후속 커밋으로 Forgejo에 먼저, GitHub에 이어 푸시한다.

## 5. row 묶음(43건)

회귀 6/6과 푸시가 끝난 뒤 row 묶음을 진단했다. 대표 row 오류는 올바른 최종 컴파일러 기준 두 71건 실행에서 0건이라 수정 전 실패 재현 시험을 만들 수 없었다. 기존 43건은 Stage0 컴파일러로 실행했던 결과이며, 언어 회귀나 DB95 호출 결함으로 재현되지 않았다. 기대값과 row 코드를 바꾸지 않았다. 다음 최대 묶음 후보는 `compiler:unsupported-literal` 11건이고, 그 다음은 `missing-native:buf_str` 4건이다.

## 언어 성과

`map-has-key?`가 `map-has-key-p`로 정규화되는 약속에 맞춰 native compiler 매핑을 보완했다. DB95가 드러낸 결함은 predicate 이름 정규화와 native API codegen 매핑의 불일치다.

DB95_SUMMARY=4/5
