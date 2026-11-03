# DB95-16 — case 25 컴파일 지연 원인 진단

RUN-ID: `RUN-20261104-08`

## 기준과 보존

- afj-db95 시작 HEAD: `c07262d9cfb552788c86dabd64afe1f11543e033` (`native-run`)
- FX Stage2 컴파일러: `<가림>/artifacts/RUN-20261103-18/stage2-compiler`
- 실행 파일 SHA-256 시작값: `9e08f102a579aed6ad77edac06997637e9f7b05dbe7197de1002107a6e905864`
- 실행 파일 SHA-256 종료값: `9e08f102a579aed6ad77edac06997637e9f7b05dbe7197de1002107a6e905864`
- 재빌드하지 않았다. 원본 `.fls`, FX 컴파일러·런타임은 수정하지 않았다. 복사본, C 출력, 실행 파일은 모두 `afj-db95/tmp/RUN-20261104-08/` 아래에 두었다.
- DB95-15 기준 전체 daemon FreeLang→C 기록: `CASE25_DAEMON_COMPILE_SECONDS=313.32`.

## 규모 비교

아래 줄·바이트 값은 `wc -lc` 출력이고, 함수 수는 named `defn` 수다. 최장 함수는 괄호 균형으로 닫히는 `defn` 범위를 셌다. case25 daemon은 다섯 모듈을 `load`한다.

| 대상 | 입력 파일/범위 | 줄 | 바이트 | 함수 수 | 최장 함수 | 생성 C 줄 | 생성 C 바이트 |
|---|---|---:|---:|---:|---|---:|---:|
| case 25 wrapper | `tests/tcp-long-soak.fls` | 167 | 8293 | 2 | `tcp-soak-request`, 8줄 | 241 | 44574 |
| case 25 daemon | `tests/tcp-soak-daemon.fls` | 10 | 425 | 0 | 없음 | 7529 | 1599030 |
| case25 load 그래프 (`tcp-server`, `engine`, `sql-core`, `protocol`, `auth`) | 5개 모듈 합계 | 4644 | 202229 | 265 | `parse-select-basic`, 121줄 | daemon C에 포함 | daemon C에 포함 |
| case 3 | `tests/binary-raw.fls` | 6 | 279 | 0 | 없음 | 24 | 1645 |

## 함수 단위 분할 측정

다섯 모듈의 함수 265개를 원본 파일 순서와 함수 선언 순서로 나눴다. 나머지 최상위 정의는 복사본에 유지하고 함수 선언만 지정 구간으로 제한했다. 각 결과는 진단용 생성 C이며 실행하지 않았다.

| 함수 번호 | 함수 수 | FreeLang→C 원문 시간 | 생성 C 원문 크기 (줄, 바이트) |
|---|---:|---|---|
| 1–132 | 132 | `ELAPSED_SECONDS=184.41` | `4168 818116` |
| 133–265 | 133 | `ELAPSED_SECONDS=123.20` | `4168 953092` |
| 1–66 | 66 | `ELAPSED_SECONDS=58.12` | `2496 476326` |
| 67–132 | 66 | `ELAPSED_SECONDS=61.45` | `2479 518784` |
| 67–99 | 33 | `ELAPSED_SECONDS=24.19` | `1557 332949` |
| 100–132 | 33 | `ELAPSED_SECONDS=24.15` | `1729 357059` |
| 133–198 | 66 | `ELAPSED_SECONDS=54.28` | `2366 494584` |
| 199–265 | 67 | `ELAPSED_SECONDS=47.28` | `2609 631583` |

## 모듈 및 큰 함수 측정

모듈별 측정은 임시 복사본에서 해당 파일의 `load` 행만 제거하고 함수 정의를 모두 보존했다. 빠진 다른 모듈 함수에 대한 호출은 실행하지 않고 코드 생성 시간만 측정했다.

| 단독 모듈 | 입력 줄·바이트 | 함수 수 | FreeLang→C 원문 시간 | 생성 C 줄·바이트 |
|---|---:|---:|---|---:|
| `src/tcp-server.fls` | `2040 87419` | 115 | `ELAPSED_SECONDS=173.10` | `3310 620785` |
| `src/engine.fls` | `1525 67101` | 96 | `ELAPSED_SECONDS=101.15` | `2669 557638` |
| `src/sql-core.fls` | `711 33488` | 33 | `ELAPSED_SECONDS=26.12` | `965 298117` |
| `src/auth.fls` | `280 10771` | 14 | `ELAPSED_SECONDS=3.06` | `467 76485` |
| `src/protocol.fls` | `67 2607` | 7 | `ELAPSED_SECONDS=0.35` | `153 20998` |

가장 긴 세 함수는 각각 독립 복사본으로도 재어 보았다.

| 함수 | 원본 함수 줄 | 최대 괄호 깊이 | FreeLang→C 원문 시간 | 생성 C 줄·바이트 |
|---|---:|---:|---|---:|
| `parse-select-basic` | 121 | 14 | `ELAPSED_SECONDS=1.05` | `89 55757` |
| `execute-select` | 94 | 12 이하 | `ELAPSED_SECONDS=0.68` | `92 29421` |
| `afj-tcp-line` | 66 | 15 | `ELAPSED_SECONDS=0.53` | `153 29274` |

측정마다 `ps`로 heavy 시험을 확인하고 `flock -o /tmp/fl-heavy.lock` 아래에서 실행했다. 다른 작업의 Stage2 컴파일 또는 native gate가 보일 때에는 끝날 때까지 기다렸다. case25의 120초 제한, 71건 gate는 사용·실행하지 않았다.

## 단계 비교와 판정

같은 전체 daemon C(`7529`줄, `1599030`바이트)를 기존 DB95-15 산출물에서 가져와 runtime 소스와 함께 GCC compile/link만 별도 측정했다. 출력은 `GCC_COMPILE_LINK_SECONDS=37.84`였다. FreeLang→C 전체 단계 `313.32`초가 C compile/link `37.84`초보다 약 8.3배 길다.

판정은 **(나) 전체 코드 크기와 함수 수에 따른 누적 비용**이다. 가장 큰 모듈은 `tcp-server.fls`(115개 함수, 173.10초), 다음은 `engine.fls`(96개 함수, 101.15초)였다. 함수 절반 분할 시간은 함수 수·생성 C 크기에 따라 함께 줄었고, 세 장함수 독립 생성은 0.53–1.05초였다. 가장 깊은 `afj-tcp-line`(괄호 깊이 15)도 단독 시간은 0.53초여서 특정 장함수나 깊은 중첩 하나가 전체 지연을 만든다는 증거는 없다. 따라서 2/4의 격리 단위는 `src/tcp-server.fls` 모듈이며, 모듈 안의 단일 함수/구문 결함으로 단정하지 않는다.

제안만 기록: 컴파일러를 바꾸기 전에 함수 수·생성 C 크기와 비례해 비용이 증가하는 codegen 경로를 profiler로 나누어 보고, 이후 큰 모듈의 증분/모듈 단위 컴파일을 검토한다. 이번에는 어떤 구현도 바꾸지 않았다.

## 기준표

| 항목 | 결과 |
|---|---|
| 1/4 두 case 규모 비교 | PASS |
| 2/4 느린 단위 좁힘 | PASS — `tcp-server.fls` 모듈. 개별 함수 단일 원인은 확인되지 않음 |
| 3/4 FreeLang→C와 C 단계 분리 | PASS — `313.32초` 대 `37.84초` |
| 4/4 판정 근거, 문서 커밋·Forgejo→GitHub 푸시 및 동일 HEAD 확인 | PASS — 두 원격 ref가 최종 로컬 HEAD와 같은지 푸시 뒤 확인 완료 |

## 언어 성과

FreeLang은 단일 장함수보다 115개 함수·2,040줄의 `tcp-server.fls` 및 96개 함수·1,525줄의 `engine.fls`처럼 큰 모듈 그래프를 FreeLang→C로 펼칠 때 컴파일 시간이 크게 늘어난다.

DB95_SUMMARY=4/4
