# DB95-19 — IR 태그 비교 비용 감소

RUN-ID: `RUN-20261104-21`

## 기준과 보존

- FX 시작 HEAD: `11ac0991e2827fe7c05f3160688eeedffb676de0`
- FX 작업 브랜치: `perf/ir-chk-tag`
- afj-db95 시작 HEAD: `e686d68620f63af9545def03e7bc49748f731158` (`native-run`)
- 변경 전 컴파일러 SHA-256 시작·종료: `9e08f102a579aed6ad77edac06997637e9f7b05dbe7197de1002107a6e905864`
- 새 사용 컴파일러(Stage3 실행 파일) SHA-256: `c4bb4153fd8f1ff230c17ffb49d1d29f976b15d478cd3ebaa3569235fcf9d64e`
- 모든 임시 입력·출력은 작업 디렉터리의 `tmp/RUN-20261104-21/` 아래에 뒀다. 기존 afj-db95 미추적 파일은 보존했다.
- Stage0는 사용하지 않았다. 71건 전체 gate도 실행하지 않았다.

## 1. 수정 전 측정

측정은 다른 무거운 작업과 겹치지 않도록 `ps` 확인 후 `flock -o /tmp/fl-heavy.lock` 안에서 각 입력을 한 번씩 컴파일했다. 시간 파일의 원문은 다음과 같다.

| 입력 | 측정 원문 | 이전 비교값 |
|---|---|---|
| case 3 `tests/binary-raw.fls` | `ELAPSED_SECONDS=0.02 MAX_RSS_KIB=5348 EXIT=0` | `COMPARE_CASE3_COMPILE_SECONDS=0.01` (DB95-15 기록) |
| case 25% `tcp-server.fls` | `ELAPSED_SECONDS=140.22 MAX_RSS_KIB=880184 EXIT=0` | `ELAPSED_SECONDS=148.80` |
| case 100% `tcp-server.fls` | `ELAPSED_SECONDS=285.31 MAX_RSS_KIB=1321172 EXIT=0` | `ELAPSED_SECONDS=276.90` |

이전 비교값과 이번 수정 전 값은 단일 측정끼리도 차이가 있었다. 수정 전·후는 이번 회차에서 같은 경로의 입력을 각 한 번씩 측정했다.

## 2. 변경 범위와 방식

FX diff는 `self/cgc-main.fl`의 IR 검사 영역 한 곳에만 있다. `ir-chk`가 반복해서 검사하는 `:kind`, `:type`, `:op` 문자열 비교와 허용 태그 목록 검색을 `ir-tag-eq`/`ir-tag-includes`로 바꿨다. 이 함수들은 기존 `str-index-of`의 바이트 검색을 이용하며, 양방향 위치 0 검색으로 완전 일치와 prefix를 구분한다. 런타임 API, 기대값, 제한 시간 및 다른 함수는 바꾸지 않았다. `git diff --check`는 통과했다.

## 3. 자체 컴파일 고정점

`verify-fixpoint.sh`는 내장 기본 180초 제한에서 첫 `GEN_A_GENERATE`가 종료됐고 원문은 `GEN_A_GENERATE=FAIL`이다. 로그에는 진단이 없었다. 제한을 변경하지 않고, 같은 Stage2→3→4 절차를 직접 수행해 끝까지 확인했다. 컴파일러는 지정된 원본 Stage2이며 Stage0는 사용하지 않았다. GCC 빌드에는 기존 임시 curl 헤더 경로를 `CPATH`/`LIBRARY_PATH`로 지정했다.

```text
5a7403f1be355e40bdcbbeca59564384d039c9d60a10a6f41bdc1cde31fdda25  Stage2 source
5a7403f1be355e40bdcbbeca59564384d039c9d60a10a6f41bdc1cde31fdda25  Stage3 source
5a7403f1be355e40bdcbbeca59564384d039c9d60a10a6f41bdc1cde31fdda25  Stage4 source
```

Stage2=Stage3=Stage4 source 해시가 일치한다.

## 4. 수정 후 측정 및 동등성

새 Stage3 컴파일러로 각 입력을 한 번씩 컴파일했다.

| 입력 | 수정 전 원문 | 수정 후 원문 | 생성 C SHA-256 및 비교 |
|---|---|---|---|
| case 3 | `ELAPSED_SECONDS=0.02 MAX_RSS_KIB=5348 EXIT=0` | `ELAPSED_SECONDS=0.02 MAX_RSS_KIB=8392 EXIT=0` | `c88274d2ad9a6dc8d94fb050d9b7590b9b0fecaba528ed7a80f83d85d88a1779`; `CASE3_C_CMP=0` |
| 25% | `ELAPSED_SECONDS=140.22 MAX_RSS_KIB=880184 EXIT=0` | `ELAPSED_SECONDS=140.47 MAX_RSS_KIB=883440 EXIT=0` | `eda76996efde7ebfb43b8de95ee8632e6acee35455c9bc6f82c7dad502ef7d4c`; `CASE25_C_CMP=0` |
| 100% | `ELAPSED_SECONDS=285.31 MAX_RSS_KIB=1321172 EXIT=0` | `ELAPSED_SECONDS=283.28 MAX_RSS_KIB=1324960 EXIT=0` | `7bf45e803f514f38f7a723cfb0546d0fbb312f914b714204f06c36c288efacd8`; `CASE100_C_CMP=0` |

세 생성 C 파일은 수정 전후 SHA-256과 바이트 내용이 모두 같았다. case 100% 측정은 한 번 기준으로 `285.31초 → 283.28초`(2.03초 감소)다. 25%는 `140.22초 → 140.47초`로 사실상 같았다.

선택 실행은 `tests/native-release-gate.sh --worker`로 case 3과 case 25만 수행했다. 전체 71건은 실행하지 않았다.

| 선택 case | 수정 전 대조 | 수정 후 결과 |
|---|---|---|
| 3 `raw binary boundary` | 원본 9e08 실행 파일도 `Uncaught error: [buf-to-binary] Function not found: buf-to-binary (at line 2, col 0)` | Stage3 실행 파일에서 같은 원문과 exit 1 |
| 25 `TCP 5m performance envelope` daemon build | DB95-15 기록: 내부 `timeout 120s`로 daemon compile이 끝나지 않아 실패 | 내부 120초 제한에서 `Uncaught error (line 59): soak daemon build failed: `, exit 1 |

과거 `docs/release-gate-report.md`에는 raw binary boundary PASS가 적혀 있으나, 이번 회차 동일 worker A/B는 둘 다 같은 미지원 함수 오류였다. 따라서 과거 집계와 현재 worker의 입력/컴파일러 상태가 다른 점을 기록하며, 이번 변경으로 그 차이를 해결했다고 주장하지 않는다. 25 daemon은 이전 DB95-15와 마찬가지로 컴파일 제한에서 실패했다.

## 기준표

| 항목 | 결과 |
|---|---|
| 1/5 수정 전 시간 3개 | PASS — 원문과 이전 비교값을 기록 |
| 2/5 diff 범위 | PASS — `self/cgc-main.fl` IR 태그 검사 영역에 한정 |
| 3/5 자체 컴파일 고정점 | PASS — 직접 Stage2·3·4 source SHA-256 일치 |
| 4/5 속도 및 선택 case 결과 | PASS — 100% 2.03초 감소, C 출력 동일. case 3/25의 수정 전·후 worker 결과를 비교해 기록 |
| 5/5 푸시 및 원격 HEAD 일치 | PASS — FX와 afj-db95 모두 Forgejo→GitHub 순으로 푸시하고 원격 branch ref가 로컬 HEAD와 일치함을 확인 |

## 커밋과 푸시

- FX `perf/ir-chk-tag`: `2bf14b3055b0ec8ee89a957a045d79b7b9b9be3d`; Forgejo와 GitHub ref 모두 이 커밋이다.
- afj-db95 `native-run`: 소스 변경 없이 보고서만 커밋했다. 보고서 커밋을 Forgejo→GitHub 순으로 푸시했고 최종 원격 ref 일치를 확인했다.
- 두 저장소 모두 main 병합 없이 작업 브랜치만 푸시했다.

## 언어 성과

FreeLang 컴파일러의 IR 태그 비교를 기존 바이트 검색으로 바꿨고, 100% 입력 단일 측정은 `285.31초`에서 `283.28초`로 줄었다. case 3/25 실행 동작은 이번 회차의 원본 컴파일러와 Stage3 컴파일러에서 각각 같은 결과를 냈다.

DB95_SUMMARY=5/5
