# DB95-8 본줄기 병합·process_exit

접수번호: RUN-20261102-06. 실행 중 경로·주소·키·인증정보는 `<가림>` 처리했다.

## 1. 본줄기 병합 및 E09·E10·J-1

출발점은 지시값과 같았고, 시작 시 양 저장소 모두 CLEAN이었다.

- FX `feat/db95-native-peer`: `985824f4b60a3131e33a94ef0bab6a253b0d8fe5`
- afj-db95 `native-run`: `5e77c7237eb55f97c360ebe85f000d3191113e43`
- E09·E10·J-1 본줄기 후보: `02176817d44f4d998a3f0b8ac04cec4373e04a7f` (Forgejo·GitHub 조회값 일치)
- 병합 base: `1d217f53a8aade8a288c0dcad0a1ba23b610f102`
- 사전 tree: `f432dd1a6e75b4e84116df7726fd13bc79c6b427`
- 병합 커밋: `5887ac203a439f4aa2fa2ba84607fef6500e0244`, 부모 `985824f4b60a3131e33a94ef0bab6a253b0d8fe5` 및 `02176817d44f4d998a3f0b8ac04cec4373e04a7f`

병합 전 충돌 파일은 `runtime/http.c`, `runtime/runtime.h`, `scripts/verify-native-bootstrap.sh` 3개였다. HTTP 본줄기의 요청·폼·미들웨어·TLS 구현을 보존하고 peer 소켓 주소 추출 및 `peer-address` 결과를 합쳤다. 헤더에는 두 API 계열 선언을 함께 두었다. Bootstrap 검증 목록에는 본줄기의 raw TCP 항목도 합쳤고 비교 조건은 유지했다.

정규식 인자 순서는 두 문자열 인자만으로 자동 호환할 수 없는 실제 계약 충돌이었다. 사용자 승인 후 본줄기 underscore API의 text-first 계약을 보존하고, DB95 고정 fixture는 이미 존재하는 kebab-case native API로 호출 이름만 옮겼다. 고정 정답은 그대로 두었다. Strict native map 검사도 본줄기의 `has-key?` 호환 동작과 분리해 `map-has-key?` 이름으로 유지하고 DB6 fixture 호출만 옮겼다. DB7 `regex-match-i.expected`를 포함한 기대 출력·오류 값은 바꾸지 않았다. 구 raw TCP fixture는 기존 `fl-tcp-*`/`fl-yield` 이름을 사용하도록 정리했고, 현대 API 및 양쪽 구현은 유지했다.

첫 병합 검사에서 `HAS_KEY_EXIT=1` (compatibility 경로가 strict 결과를 가림), 두 번째에서 `HAS_KEY_EXIT=1` (새 별칭이 파생 native 심볼 목록에 없었음)이 발생했다. 두 로그를 보존하고 native-symbols metadata를 재생성한 세 번째 검사에서 모두 통과했다. 같은 관문이 세 번 실패한 일은 없다.

세 번째 병합 관문 결과: `BUILD_EXIT=0`, `HAS_KEY_EXIT=0`, `REGEX_EXIT=0`, `J1_LEAKS_EXIT=0`, `J1_MEASURE_EXIT=0`, `CHROME_http_EXIT=0`, `CHROME_cancel_EXIT=0`, `MERGE_GATES=PASS`.

- E09 실제 Chrome: `L01_BROWSER_HTTP_PASS=20 FAIL=0`, `L01_BROWSER_CODE=COMPILER_GENERATED`, `L01_BROWSER_INJECTED_JS=0`.
- E10 실제 Chrome: `L01_BROWSER_CANCEL_PASS=20 FAIL=0`; 취소 후 콜백 `0`, 정상 완료 콜백 `4`, 취소된 캡처 `0`, memory 검사 `PASS`.
- J-1 기존 JSON fixture: `JSON_FAILURE_CASES=18 FAIL=0`; ASan/UBSan/LSan `PASS`. 실패 주입 누수 fixture는 각 API별 9종, 각각 100회 통과했다.
- J-1 측정 조건은 `VM_LIMIT_KIB=2097152`, `TIME_LIMIT_SECONDS=120` 그대로다. 1,000/10,000/100,000 항목 순서로 legacy parse 초는 `0.000120595`, `0.000883703`, `0.009872328`; v11은 `0.000404218`, `0.003858817`, `0.037337678`. 최대 RSS KiB는 legacy `4828`, `5440`, `8892`, v11 `4828`, `5280`, `10632`. `VALUES=PASS` 모두.

## 2. process_exit 정답 선고정 및 구현

고정 시험을 구현보다 먼저 커밋했다: `8cc71558128e9b7db1e3742324f0777aeffe4f13`. 0·1·37 종료 코드 각각에 대해 FreeLang builtin 및 legacy native C ABI, 종료 직전 버퍼 출력, arena cleanup, atexit 관찰을 검사한다. 기대 stdout/status 파일은 `process-exit.expected.tsv`이며 변경하지 않았다.

선행 실행 `process-before.log`에서 FreeLang 경로 3건은 통과했다. native C 확인은 `-Werror=implicit-function-declaration`에서 다음 첫 오류로 실패했다: `process_exit` 선언이 없음 (`process-exit-probe.c:21:5`). 시험 fixture의 첫 초안은 존재하지 않는 `to_number`도 사용했으나 구현 전에 기존 `str-to-num`으로 고쳤다 (`fcd99fe61ec56d7b9b7e49fd3f733d1f4d78960f`). 기대값은 그대로다. 최초 오라클 커밋 `8cc715...`부터 수정 후 커밋까지는 테스트 코드 정정뿐이며, 런타임 구현은 그 뒤에 했다.

구현 커밋 `bac7be8a8ff12fd0f14029f3ce222d2161053d39`는 공개 native C 선언과 호환 wrapper를 추가해 기존 v11 `process-exit` handler로 위임한다. 새 종료 엔진이나 종료 코드 범위 규칙을 추가하지 않았다. 기존 handler의 유효성 검사, shutdown 예약 및 C 종료/정리 의미를 공유한다. 최종 compiler로 재실행한 `PROCESS_EXIT_PASS=6 FAIL=0 TOTAL=6`; 코드 0·1·37 각각 status와 출력이 정확히 일치하고 cleanup/atexit 검사가 통과했다.

**이번에 언어에서 새로 생기거나 고쳐진 것:** legacy native generated-C 소비자를 위한 `process_exit(FLValue)` 선언 및 wrapper가 추가되어 기존 언어 handler를 호출한다. 이는 기존 `.fl` builtin의 신규 구현이 아니다. 본줄기 병합으로 DB95 branch에서 접근 가능해진 기존 HTTP·정규식·JSON·타이머 구현도 새로 작성한 것으로 세지 않는다.

## 3. DB95 71건 재실행

수정 전 기준은 DB95-7 `after.log`: `NATIVE_GATE_PASS=0 FAIL=71 TIMEOUT=0 SKIP=0 TOTAL=71`; 첫 오류 최대 묶음 `process_exit` 27건이었다. 병합 후·process ABI 구현 후 native gate 실행은 node 없이 완료했다: `NATIVE_GATE_PASS=15 FAIL=56 TIMEOUT=0 SKIP=0 TOTAL=71`.

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

이후 최대 묶음은 `compiler:undeclared:peer` 27건이다. 해당 실행 파일의 optional parameter `[peer nil]` 참조가 생성 C에서 선언되지 않는다. 이는 이번 수정으로 새로 발생한 오류가 아니다. DB95-7 원본 case 1 로그의 뒤쪽에도 `peer` undeclared 진단이 있었고, 당시에는 앞선 process_exit가 먼저 막았다. 현 범위인 process_exit 작업을 넘어서 이 묶음까지 임의로 고치지 않았다. TLS 경계도 구현하지 않았다. 남은 56건은 제품 전체 통과로 간주하지 않는다.

분류표 첫 오류 원문은 `DB95-8` 보고서와 함께 커밋되는 sanitized TSV에 기록했다. 분류기는 원인별 건수 정규화에만 사용했고, TSV의 첫 진단 문자열에서 경로는 `<가림>` 처리했다. 실행 추적에서 `DB95_SUCCESSFUL_NODE_NPM_NPX_EXEC=0 PYTHON_EXEC=0`; 별도 native-only 규칙과 실행 파일 조회 결과를 함께 확인했다. node가 없는 두 테스트는 실제 node 실행 0이고 `missing-runner:node`로 분류했다. 옛 runner 전체 회귀는 `L06_EXISTING_REGRESSIONS=PASS` 및 `결과: 10 PASS / 0 FAIL / 10 총`이다.

첫 오류 표와 그룹 건수는 [first-errors.tsv](evidence/db95-8/first-errors.tsv), [first-error-groups.tsv](evidence/db95-8/first-error-groups.tsv)다. 비공개 원문 로그의 SHA-256은 `evidence/db95-8/private-log-sha256.txt`에 기록했다.

## 4. 회귀와 bootstrap

최종 compiler 및 runtime에서 무거운 전체 체인을 공통 flock 잠금 아래 실행했고, 시작 전에 `ps`를 저장했다. DB95 gate는 71건을 기록하고 예상된 미해결 묶음 때문에 exit 1을 반환했으며, 이를 통과로 위장하지 않았다. 별도 scope 회귀 `has-key`, `raw-peer-ports`, `closure-map-capture`, `afj-file-names`, `closure-capture`, `peer-address`는 각각 exit 0.

전체 회귀 `E08_COMPLETION=PASS`, `E07_COMPLETION=PASS`; CLI 4/4, Chrome timer 20/20, timer exception 3/3, L07 `L07_SELF_PASS=221`, `L07_SELF_FAIL=0`, leak case `REMAINING_LEAK_CASES=12/12`, small leaks `2/2`, worker `3/3` 및 leak 0. L06 HTTP `110/0`, timeout `2/2`, TLS `110/0`, JSON `13/0`, native TCP `8/0`. 기존 DB6 strict map 및 DB7 regex 재현 시험도 통과했다. E09/E10/J-1 결과는 위 병합 관문 수치와 같다.

격리 native bootstrap은 strace 없이 정적 감사 방식으로 실행했다. seed는 시작 기준과 동일: `STAGE0_SHA=f7425bf086d99d11231ba79296e194fcc36b454379e46d44131bafb0dc74101c`. 결과 원문:

```text
STAGE2_SHA=2e7a802f8102c5bf4826bae532486778212ebcbe50539ab74316936f2c3d122f
STAGE3_SHA=2e7a802f8102c5bf4826bae532486778212ebcbe50539ab74316936f2c3d122f
STAGE4_SHA=2e7a802f8102c5bf4826bae532486778212ebcbe50539ab74316936f2c3d122f
RESIDUAL_PROCESSES=0
CLEAN_CHECKOUT=PASS
BOOTSTRAP_STRACE=0
BOOTSTRAP_DYNAMIC_EXEC_COUNTS=UNOBSERVED
BOOTSTRAP_EXIT=0
NODE=0 NPM=0 NPX=0 JS=0 PYTHON=0
```

정적 금지 프로세스 token scan은 0건, 범위는 seed와 생성 compiler translation unit이다. 동적 bootstrap 실행 감사는 이번 비-strace 경로에서 관측하지 않았으므로 0 실행으로 주장하지 않는다. stage2=3=4 해시는 서로 동일하다. seed 교체는 하지 않았다.

본줄기 병합·process_exit·native symbols 메타데이터 변경 외에 DB95 `.fls` 제품 구현, db95 JS runner, seed, 고정 기대값/문턱값은 수정하지 않았다. 새 JS/TS/Python 소스 파일은 추가하지 않았다. 검수 단계 경계를 유지하며 DB95 영속성·트랜잭션·네트워크 제품 완료를 주장하지 않는다.

## 5. 푸시 및 최종 상태

Forgejo 양 저장소 푸시를 먼저 끝내고 GitHub 양 저장소 푸시를 완료했다. 양쪽 서버의 `ls-remote`에서 아래 커밋이 각각의 브랜치 HEAD와 일치함을 확인했다. 작업 트리는 깨끗했다.

| 저장소/branch | 최종 로컬 HEAD | Forgejo | GitHub | 작업 트리 |
|---|---|---|---|---|
| freelang-v11-fx `feat/db95-native-peer` | `be83234e627cfcc85abb7ee993e8309cbdd3730b` | `be83234e627cfcc85abb7ee993e8309cbdd3730b` | `be83234e627cfcc85abb7ee993e8309cbdd3730b` | CLEAN |
| afj-db95 `native-run` (보고서 갱신 전) | `ee842802f87403fd60d7120aa26538c42fa94e7d` | `ee842802f87403fd60d7120aa26538c42fa94e7d` | `ee842802f87403fd60d7120aa26538c42fa94e7d` | CLEAN |

이 표를 갱신한 최종 보고서 커밋도 Forgejo 후 GitHub 순으로 푸시하고 두 원격에서 다시 읽어 일치 및 CLEAN을 확인했다. 최종 afj-db95 HEAD는 이 보고서 파일을 포함한 커밋이다.

DB95_SUMMARY=5/5
