# DB95-4: 네이티브 71건 공통 실패 조사

실행 위치: 격리 작업 공간 `<가림>`. 23·25번 서버와 운영 데이터는 사용하지 않았다.

## 시작점

| 저장소 | 가지 | 확인한 시작 HEAD |
| --- | --- | --- |
| afj-db95 | `native-run` | `ea2d58dd6b5c81c7f51d4a696e2d196b5662b42a` |
| freelang-v11-fx | `feat/db95-native-peer` | `102dd1adebbcb57444e8e79ad795faf226e7749b` |

두 가지 모두 시작 시 작업 트리가 깨끗했다. 기존 `tests/release-gate.sh`의 기대값·문턱값·제한시간은 바꾸지 않았다.

## 1. 첫 오류 묶음표

DB95-3 최종 네이티브 실행의 71개 사례별 출력에서 첫 오류 문장을 골랐다. 생성 파일 위치와 C 줄 번호, GCC 경고 표식만 제거하고 문장 본문은 유지했다. JS 사례는 네이티브 게이트가 명시한 `NATIVE_JS_SOURCE_NOT_PORTED`를 첫 오류로 삼았다. 같은 문장만 합쳤으며 총합은 71건이다.

| 첫 오류 문장 | 건수 | 대표 사례 번호 |
| --- | ---: | ---: |
| `error: ‘row’ undeclared (first use in this function); did you mean ‘throw’?` | 43 | 1 |
| `NATIVE_JS_SOURCE_NOT_PORTED` | 14 | 24 |
| `error: ‘column’ undeclared (first use in this function)` | 3 | 13 |
| `error: implicit declaration of function ‘file_append’; did you mean ‘_fl_file_append’?` | 3 | 49 |
| `node: command not found` | 2 | 34 |
| `error: implicit declaration of function ‘file_size’; did you mean ‘_fl_file_size’?` | 2 | 26 |
| `production TLS boundary returned an unexpected error` | 1 | 59 |
| `error: ‘reader_tx’ undeclared (first use in this function)` | 1 | 40 |
| `error: implicit declaration of function ‘buf_to_binary’` | 1 | 3 |
| `Uncaught error: compatibility scorecard failure` | 1 | 28 |

`column`과 `file_append`는 3건으로 동률이다. `row`·`column`은 바깥 인자 캡처라는 같은 원인이며, Map 값 안의 `collation`은 그 문제가 드러난 다음 단계다.

### 가장 큰 묶음의 원인 증거

```text
error: ‘row’ undeclared (first use in this function); did you mean ‘throw’?
```

db95 `src/engine.fls:20`은 `(fn [column] (get row column))`을 쓴다. FX의 생성 C 함수는 `return get(row, column);`을 내면서 `row` 환경 변수를 선언하지 않았다. FX `self/cgc-main.fl`의 `cgc-collect-vars`는 AST `variable`만 수집했으나 AFJ의 일반 이름은 `literal`/`symbol`로 파싱됐다. 최소 재현의 수정 전 결과:

```text
error: ‘row’ undeclared (first use in this function); did you mean ‘throw’?
CLOSURE_BEFORE_EXIT=1
```

JS 14건은 시험 소스 자체가 JavaScript이므로 FX 컴파일러로 실행할 수 없다. 이를 숨기거나 SKIP으로 바꾸지 않았다. 14개 시험의 동등한 FreeLang 시험 이식이 필요하다.

## 2. 묶음별 수정과 71건 변화

| 원인 | 먼저 커밋한 최소 재현 | 수정 | 재현 결과 | 수정 후 71건 |
| --- | --- | --- | --- | --- |
| 일반 이름의 클로저 캡처 | `tests/native-bootstrap/closure-capture.fl` | FX `self/cgc-main.fl`에서 `literal/symbol` 수집 | `CLOSURE_CAPTURE_OUTPUT=1` | `PASS=0 FAIL=71 TIMEOUT=0 SKIP=0` |
| Map 값 안의 캡처 | `tests/native-bootstrap/closure-map-capture.fl` | FX `self/cgc-main.fl`의 Map 값 AST 순회 | `CLOSURE_MAP_CAPTURE=PASS` | 세 수정 합친 최종 `PASS=0 FAIL=71 TIMEOUT=0 SKIP=0` |
| 파일 API의 AFJ 이름 | `tests/native-bootstrap/afj-file-names.fl` | FX `self/cgc-main.fl`의 `file_append`·`file_size` 연결 | `AFJ_FILE_NAMES=PASS` | 세 수정 합친 최종 `PASS=0 FAIL=71 TIMEOUT=0 SKIP=0` |

첫 수정 뒤 첫 오류 묶음은 `row` 43건에서 `collation` 39건으로 이동했다. 전체 통과는 0건 그대로였다. `collation`은 Map 값 안의 캡처 누락이며 별도 재현의 수정 전 오류는 다음과 같다.

```text
error: ‘collation’ undeclared (first use in this function)
CLOSURE_MAP_BEFORE_EXIT=1
```

파일 이름 최소 재현의 수정 전 오류:

```text
error: implicit declaration of function ‘file_append’; did you mean ‘_fl_file_append’?
error: implicit declaration of function ‘file_size’; did you mean ‘_fl_file_size’?
FILE_NAMES_BEFORE_EXIT=1
```

최종 게이트에서 첫 사례의 첫 오류는 `error: implicit declaration of function ‘has_key_p’`로 이동했다. `file_append`·`file_size` 호출은 더 이상 첫 오류가 아니지만, `file_read`·`json_str` 등 다음 미지원 API와 JS 14건이 남았다. 중간 전체 게이트는 첫 수정 뒤 1회, 세 수정을 합친 뒤 1회 실행했다. 각 하위 수정 직후 71건을 따로 실행하지는 않았다.

## 3. 원시 TCP 접속자 주소·포트

FX `tests/native-bootstrap/raw-peer.fl`과 셸 시험을 구현보다 먼저 커밋했다. FX `runtime/raw_tcp.c`는 `tcp-server-raw`로 수신한 연결의 주소·포트를 운영체제 소켓 메타데이터에서 읽어 콜백에 전달한다. `fl-yield`가 이벤트를 처리하며 `tcp-write`·`tcp-drop`·`tcp-peer-port`를 연결했다. 기존 네 인자 이름 핸들러에는 주소를 네 번째 인자로 보내고, 다섯 인자 FreeLang 콜백에는 포트도 전달한다.

수정 전 시험은 `error: implicit declaration of function ‘tcp_write’; did you mean ‘fl_tcp_write’?`와 `RAW_PEER_BEFORE_EXIT=1`이었다. 수정 후 첫 시험은 컴파일 성공 뒤 응답 없이 종료했다. 실패 시 서버 출력을 보이게 한 두 번째 시험도 서버 출력과 응답이 비어 있었고 `RAW_PEER_RERUN_EXIT=1`이었다. `str-to-num`이 실수를 반환하는데 TCP 서버가 정수 포트만 받는 점을 고친 뒤 세 번째 시험도 `RAW_PEER_THIRD_EXIT=1`이었다. 세 번째 실패로 멈춤 규칙에 도달하여 더 수정하거나 시험하지 않았다. **본문 바이트는 현재 C 문자열로 변환**하므로 내장 NUL이 있는 MariaDB 바이너리 스트림은 아직 지원하지 않는다. 기존 db95 원본 `tests/ip-rate-limit-runtime.js`는 네이티브 게이트에서 `NATIVE_JS_SOURCE_NOT_PORTED`다. 해당 db95 시험 통과는 입증하지 못했다.

## 4. v11 회귀·bootstrap·실행 추적

`bootstrap/stage0.c`와 `bootstrap/stage0.sha256`의 값은 둘 다 `f7425bf086d99d11231ba79296e194fcc36b454379e46d44131bafb0dc74101c`이며 변경하지 않았다. bootstrap을 두 번 실행했으나 둘 다 `STAGE0_C_BUILD=PASS` 뒤 Stage0→Stage1 생성 프로세스가 `SIGKILL`로 종료되었다. 종료 원인은 미확인이다. 원문 종료값은 `BOOTSTRAP_EXIT=1`, `BOOTSTRAP2_EXIT=1`이다. 따라서 stage2·3·4 해시와 v11 회귀 실패 0건은 입증하지 못했다. 기존 `tests/run-tests.sh`가 요구하는 `jit-test-bin`, `gc-stress-bin` 실행 파일도 이 작업 가지에는 없다.

bootstrap 두 실행의 strace 성공 실행 수는 각각 `STRACE_SUCCESS node=0 npm=0 npx=0 python=0 js=0`이었다.

## 5. 최종 결과와 원격

마지막 전체 71건 실행 원문: `NATIVE_GATE_PASS=0 FAIL=71 TIMEOUT=0 SKIP=0 TOTAL=71`, 실행 종료 `DB95_4_GATE_FINAL_EXIT=1`. 이 실행은 TCP 포트 타입 수정 전이다. strace 성공 실행 수 원문: `FINAL_STRACE_SUCCESS node=0 npm=0 npx=0 python=0 js=0`. 새 JS·TS·Python 파일 변경은 0건이다.

세 번째 TCP 재현 실패로 지시서의 멈춤 규칙에 도달했다. 두 저장소 모두 로컬 가지에만 커밋했고, Forgejo와 GitHub에는 푸시하지 않았다. 원격 HEAD는 확인 당시 db95 `ea2d58dd6b5c81c7f51d4a696e2d196b5662b42a`, FX `102dd1adebbcb57444e8e79ad795faf226e7749b`였다. 추가 원격 상태 확인은 하지 않았다.

| 항목 | 판정 | 근거 |
| --- | --- | --- |
| 실패 묶음표 | 통과 | 71건의 첫 오류와 건수·대표 사례 기록 |
| 묶음 3개 재현·수정 | 미통과 | 최소 재현은 통과했으나 71건 통과 수 0, JS 묶음 미이식 |
| TCP 접속자 주소 | 미통과 | 실제 연결 재현 3회 실패, db95 원본 시험 미통과 |
| v11 회귀·bootstrap | 미통과 | bootstrap 2회 SIGKILL, stage2·3·4 해시 미확보 |
| push·최종 71건 결과 | 미통과 | 71건 수치는 확보했으나 멈춤 규칙에 따라 푸시하지 않음 |

DB95_SUMMARY=1/5
