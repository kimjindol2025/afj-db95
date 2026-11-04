# DB95-18 — 크기와 함께 늘어나는 컴파일 비용 진단

RUN-ID: `RUN-20261104-18`

## 기준과 보존

- afj-db95 시작 HEAD: `b631d457f351786b77bebba0230221b41340a656` (`native-run`)
- FX Stage2 컴파일러: `<가림>/artifacts/RUN-20261103-18/stage2-compiler`
- 실행 파일 SHA-256 시작: `9e08f102a579aed6ad77edac06997637e9f7b05dbe7197de1002107a6e905864`
- 실행 파일 SHA-256 종료: `9e08f102a579aed6ad77edac06997637e9f7b05dbe7197de1002107a6e905864`
- 원본 `.fl`/컴파일러/런타임은 수정하지 않았다. 25% 입력 하나를 한 번 실행해 GDB 표본을 수집했다. 별도 컴파일 입력, `-pg` 빌드, 71건 gate 실행은 없었다.
- 표본 원문은 `tmp/RUN-20261104-18/gdb-samples.log`에 보관했다.

## 1. DB95-17 오류 원문과 원인

DB95-17 GDB 오류 원문 첫 줄:

```text
Selected thread is running.
```

원인은 **스택을 읽기 전에 inferior가 정지하지 않은 것**이다. 이전 batch 방식은 비동기 실행 중단이 완료되기 전에 `thread apply all bt`를 요청했다. 권한 거부나 attach 차단은 아니었다. DB95-18에서는 처음부터 대화형 GDB 안에서 Stage2를 실행하고 터미널 Ctrl-C로 정지한 뒤 표본을 읽었으며, 정상 동작했다. GDB는 native ELF 심볼을 읽었지만 DWARF 디버그 정보는 없었다. 이로 인해 일부 최상위 `__fl_binding_*` 식별자를 소스 함수명으로 자동 변환할 수 없는 제한은 남았다.

## 2. 25% 입력 표본 100개

동일 Stage2 실행 파일로 `tmp/RUN-20261104-12/size25/src/tcp-server.fls`를 GDB 안에서 컴파일했다. 컴파일은 `Compiled ...` 및 `exited normally`로 종료했다. 실행 중 100회 정지 표본을 얻었다.

`#0` 현재 명령 위치 분포:

| 함수 | 표본 수 |
|---|---:|
| `t_units.isra` | 49/100 |
| `t_unit` | 47/100 |
| `fl_v11_builtin` | 1/100 |
| `fl_arena_alloc` | 1/100 |
| `__strncmp_avx2_rtm` | 1/100 |
| `__memmove_avx_unaligned_erms_rtm` | 1/100 |

100개 전체 backtrace에서 나온 native 프레임 빈도 상위 5개다. 이 값은 표본마다 여러 프레임을 세므로 표본 수보다 합계가 크다.

| Native 함수 | 프레임 출현 | 런타임 정의 위치 |
|---|---:|---|
| `fl_v11_context_call` | 444 | `runtime/v11-error.h:33` |
| `fl_fn_call` | 377 | `runtime/collection.c:263` |
| `fl_v11_builtin` | 99 | `runtime/v11-compat.h:750` |
| `t_units.isra` | 97 | `runtime/v11-compat.h:92` (`t_units`) |
| `t_unit` | 48 | `runtime/v11-compat.h:26` |

GDB callstack의 source line 값은 `__fl_binding_288`에서 `self/cgc-main.fl:2573`, `__fl_binding_293`에서 `self/cgc-main.fl:2582`를 가리켰다. 두 위치는 `ir-chk` 안의 `sexpr`/`block` 종류 검사다. `ir-validate`는 모든 AST 노드에 `ir-chk`를 호출한다 (`self/cgc-main.fl:2597–2604`); `ir-chk`는 여러 문자열 태그를 비교하고, `includes-item`도 문자열 equality를 순회한다 (`self/cgc-main.fl:2549–2595`).

상위 native 함수 각각을 상위 5개의 서로 다른 FreeLang `defn` 이름으로 역매핑하지는 못했다. Stage2에 DWARF가 없고 다수 프레임이 `__fl_binding_<id>`로만 표시됐다. 확보된 소스 대응은 위처럼 `ir-chk`의 직접 frame line 두 곳과 그 반복 호출 경로다. 나머지 binding 번호를 임의로 함수명에 대응시키지 않았다.

## 3. case 3과 25% 입력 비교 및 판정

기존 기록의 case 3 컴파일 시간은 `COMPARE_CASE3_COMPILE_SECONDS=0.01` (`docs/DB95-15-port-one-finish.md`)이다. DB95-17의 같은 Stage2, 25% `tcp-server.fls` 단독 측정은 `ELAPSED_SECONDS=148.80`이다. 따라서 약 106초를 입력 크기와 무관한 고정 상수로 볼 근거는 없다. 작은 case 3은 0.01초인 반면, 25% 입력에서는 표본의 96/100이 `t_units` 또는 `t_unit` 안에 있었다.

`runtime/v11-compat.h:92`의 `t_units`는 문자열을 UTF-16 단위로 순회해 새 `TUnits` 버퍼를 만들며, `runtime/v11-compat.h:26`의 `t_unit`은 버퍼가 찰 때 `realloc`한다. 이 경로가 `fl_v11_text_get`/문자열 비교에서 반복 호출된다. AST 노드를 모두 검사하는 `ir-chk`의 tag 문자열 비교가 이 할당·변환을 반복시키는 것으로 판단한다.

판정: **(다) 메모리 할당과 문자열 변환/복사가 차지한다.** 특정 `self/*.fl` 함수 하나가 전체 시간의 과반을 독점한다고 표본만으로 말할 수는 없다. `ir-chk` 호출 경로는 확인했지만, 직접 비용은 반복되는 native `t_units`/`t_unit` 변환과 재할당에 집중되어 있다. 파일 읽기나 import가 주원인이라는 표본 증거는 없었다.

## 기준표

| 항목 | 결과 |
|---|---|
| 1/4 GDB 오류 원문과 원인 | PASS |
| 2/4 표본 100개 이상 | PASS — 100개 |
| 3/4 상위 5개 함수와 `self/*.fl` 소스 위치 | PARTIAL — native 상위 5개와 런타임 위치는 기록. `ir-chk`의 직접 source line 두 곳을 확인했으나, 5개 FreeLang 함수명으로 완전 역매핑하지 못함 |
| 4/4 판정, 문서 커밋·Forgejo→GitHub 푸시·동일 HEAD | 진행 중 |

## 언어 성과

예 — 병목 native 함수는 `t_units`/`t_unit`, FreeLang 호출 경로는 `ir-chk`로 식별했다. AST 검증의 반복 문자열 태그 비교가 UTF-16 배열 생성과 재할당을 반복한다.

DB95_SUMMARY=3/4
