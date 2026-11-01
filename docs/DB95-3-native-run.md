# DB95-3: v11 네이티브 실행 조사

실행 위치: 격리된 로컬 작업 공간 `<가림>`. 23·25번 서버와 운영 데이터는 사용하지 않았다.

## 시작점과 범위

- db95 `silent-fix`: `9a148d1549c88013771f332e0c7e6677b49a7d3e` 확인 후 `native-run` 분기.
- freelang-v11-fx 두 원격 `master`: `1d217f53a8aade8a288c0dcad0a1ba23b610f102` 확인 후 별도 작업 분기.
- FX README.md:4는 FX C 네이티브 언어와 AFJ Language가 **서로 다른 언어**라고 명시한다. db95의 `.fls`를 FX가 그대로 실행할 수 있다는 전제는 성립하지 않는다.
- `bootstrap/stage0.c` 원본 해시와 `bootstrap/stage0.sha256`은 모두 `f7425bf086d99d11231ba79296e194fcc36b454379e46d44131bafb0dc74101c`. seed 변경 없음.

## 1. 내장 기능 조사

`src/*.fls`에서 주석·문자열을 제외하고 함수 위치의 이름을 뽑아 db95의 `defn`을 제외했다. [전체 후보 표](https://github.com/kimjindol2025/afj-db95/blob/native-run/docs/DB95-3-builtins.tsv)는 123개 이름, 첫 사용 위치, FX 컴파일러/런타임의 줄 또는 정확한 이름 검색 0건을 기록한다. 이것은 **정적 이름 조사**이며 72개 이름의 존재가 동작 호환성을 증명하지는 않는다. 특히 인자 순서와 반환값은 별도 검증이 필요하다.

| 구분 | 수 | 주요 근거 |
| --- | ---: | --- |
| 같은 이름이 보임 | 72 | `self/cgc-main.fl:1232` JSON, `self/cgc-main.fl:1328` SHA-256 |
| 이름이 없거나 제공하지 않음 | 36 | db95 `src/tcp-server.fls:2033`의 `tcp-server-raw`, `:2030`의 `tcp-server-tls`, `:303`의 `fl-yield`, `src/durable-store.fls:8`의 `fd_open`, `src/mariadb-wire.fls:312`의 `buf-to-binary`; FX `runtime/runtime.h:368-381`은 HTTP 서버만 선언 |
| 같은 목적의 다른 API/동작 | 15 | db95 `src/tcp-server.fls:314`의 `now_ms`와 FX `runtime/runtime.h:246`의 `now-ms` 대응; db95 `file_read`와 FX 파일 읽기 이름 차이; FX `self/cgc-main.fl:1121`의 `append`는 벡터 push |

파일: 읽기/쓰기의 표기 차이와 파일 기술자 API 부재가 WAL 경로를 막는다. TCP: FX `runtime/http.c:959-1063`은 HTTP 서버이며 db95가 요구하는 원시 TCP 이벤트·소켓 쓰기·이벤트 루프 API가 없다. TLS: FX `runtime/http.c:1382`의 HTTPS 서버는 있으나 db95의 원시 TCP TLS와 동일하지 않다. 시간: `now-ms`는 있으나 `now_ms`와 예약 함수가 다르다. 접속자 주소: FX `runtime/http.c:457-498`의 HTTP 요청 맵에 주소가 없고 db95 `src/tcp-server.fls:1996-2007`은 원시 TCP 이벤트의 네 번째 인자를 쓴다.

## 2. JS 파일 18개 분류

[파일별 표](https://github.com/kimjindol2025/afj-db95/blob/native-run/docs/DB95-3-js-map.tsv): 실행기 1, 시험 15, 도구 2. 각 파일의 FreeLang/셸 이식 대상과 삭제 조건을 적었다. 이번에 JS 파일을 지우거나 바꾸지 않았다. 대체 시험과 기능의 동등성이 확인되기 전에는 **어느 것도 삭제 가능하다고 판정하지 않았다**.

## 3. Node 없는 실행 길과 71건 원문

`tests/native-release-gate.sh`를 시험 전에 커밋했다. 기존 `tests/release-gate.sh`의 `run_case` 71개, 각 제한시간(일반 120초, 장기 360초), 성공 표지를 유지한다. FX 네이티브 Stage0 → C 문법/링크 → 생성 바이너리 실행을 시도한다. 아직 이식되지 않은 JS 시험은 실행하지 않고 명시적 FAIL로 집계한다. 셸 시험도 Node/Python이 없는 제한된 PATH에서 실행한다. 그러므로 이 게이트는 **이식 가능성 진단**이며 기존 71개 시험의 동등한 네이티브 대체물이 아니다.

첫 실행 원문:

```text
NATIVE_GATE_PASS=0 FAIL=71 TIMEOUT=0 SKIP=0 TOTAL=71
DB95_NATIVE_GATE_EXIT=1
STRACE_SUCCESS node=0 npm=0 npx=0 python=0 js=0
```

대표 실패 원문(실행 위치만 가림):

```text
Compiled <가림>/src/tcp-server.fls -> <가림>/case-1/case.c
<가림>/case-1/case.c:853:16: error: ‘row’ undeclared (first use in this function); did you mean ‘throw’?
<가림>/case-1/case.c:859:49: error: ‘column’ undeclared (first use in this function)
<fl>:2:14: error: implicit declaration of function ‘buf_to_binary’
<fl>:3:15: error: implicit declaration of function ‘buf_from_binary’
NATIVE_JS_SOURCE_NOT_PORTED
```

첫 게이트의 셸 격리 PATH에서 `tar`가 빠져 한 사례가 `tar: command not found`로 실패했다. `tar`를 추가해 재실행했으나 그 사례에서 다시 `gzip: command not found`가 나왔다. 이 둘은 시험 도구 결함이므로 네이티브 호환성 증거로 세지 않는다. `gzip`까지 추가한 세 번째 전체 실행에서는 그 사례가 `.freelang/smoke.sh: line 11: node: command not found`로 실패했다. 이로써 최종 게이트는 실행기가 아직 이식되지 않은 상태를 드러낸다. 세 번 모두 전체 수치는 아래와 같았고, 지시된 반복 실패 규칙에 따라 추가 재시도는 하지 않는다.

```text
NATIVE_GATE_PASS=0 FAIL=71 TIMEOUT=0 SKIP=0 TOTAL=71
DB95_NATIVE_GATE3_EXIT=1
STRACE_SUCCESS node=0 npm=0 npx=0 python=0 js=0
```

나머지 실패도 각 사례 로그를 따로 확인해야 한다.

## 4. 접속자 주소와 부트스트랩

FX `tests/native-bootstrap/peer-address.fl`와 `.sh`를 먼저 커밋했다. 첫 시험은 시험용 링크 명령에 `-rdynamic`이 빠져 HTTP 라우트가 등록되지 않는 시험 도구 결함을 드러냈다. 해당 결함을 고친 같은 재현 시험을 **수정 전 코드의 별도 작업 트리**에서 실행한 원문은 다음과 같다.

```text
PEER_ADDRESS_BODY=
PEER_BEFORE2_EXIT=1
```

FX `runtime/http.c`는 HTTP 요청 맵에 `getpeername`/`inet_ntop`으로 구한 `peer-address`를 추가했다. 일반 HTTP와 HTTPS 요청 경로에 모두 전달한다. 시험은 조작된 `X-Forwarded-For` 헤더를 보내도 소켓 주소를 반환한다.

```text
PEER_ADDRESS_BODY=<가림>
PEER_ADDRESS=PASS
PEER_AFTER2_EXIT=0
```

이 수정은 **FX HTTP 요청 경로만** 해결한다. db95가 쓰는 `tcp-server-raw` 이벤트의 네 번째 인자는 FX에 원시 TCP 서버·스케줄러가 없어 아직 전달되지 않는다. 따라서 db95 접속자 주소 1건과 전체 v11 회귀시험 0건 실패 조건은 완료로 세지 않는다.

FX `scripts/verify-native-bootstrap.sh`를 stage4까지 확장하여 실행한 원문:

```text
STAGE2_EQ_STAGE3=PASS
STAGE3_EQ_STAGE4=PASS
ARRAY_LOOP=PASS
NODE_INVOCATIONS=0
NPM_INVOCATIONS=0
TS_JS_INVOCATIONS=0
STAGE2_SHA=aa8bed315d2bae91630fcff72d7edcafb9afafd84dc357133bb271c3d1bda4fd
STAGE3_SHA=aa8bed315d2bae91630fcff72d7edcafb9afafd84dc357133bb271c3d1bda4fd
STAGE4_SHA=aa8bed315d2bae91630fcff72d7edcafb9afafd84dc357133bb271c3d1bda4fd
RESIDUAL_PROCESSES=0
DB95_FX_BOOTSTRAP_EXIT=0
```

## 5. TLS 4건의 다음 단계

| 방법 | 예상 작업량 | 위험 | 판정 |
| --- | --- | --- | --- |
| FreeLang으로 TLS 프로토콜 직접 구현 | 매우 큼. 인증서, 암호군, mTLS, 갱신, 취약점 대응까지 포함 | 높음. 암호 프로토콜 자체 구현 위험 | 추천하지 않음 |
| v11 네이티브에서 OS의 OpenSSL 라이브러리 호출 | 중간~큼. FX HTTPS 사례가 있으나 db95 원시 TCP, mTLS, 인증서 갱신 어댑터는 새로 필요 | 중간. C 경계·스레드·인증서 수명 관리 필요 | **추천** |
| 외부 TLS 프록시 프로세스 사용 | 코드 작업은 작음, 배포·감독 작업은 추가 | 프로세스 의존, 프록시와 원본 접속자 주소 전달 문제 | 임시 우회만 |

이번에는 TLS 4건 구현을 하지 않았다. 우선 AFJ Script와 FX 문법·런타임 차이 및 원시 TCP 기능부터 해결해야 한다.

## 미완료와 원격

- 미완료: AFJ Script → FX 이식, 원시 TCP와 주소 이벤트, 바이너리/파일 기술자 API, JS 시험·도구의 동등한 대체물. 따라서 db95 71건 통과와 전체 FX 회귀시험 0건 실패는 아직 주장할 수 없다.
- 신규 JS/TS/Python 소스 0줄. 기존 기대값·문턱값·제한시간·시험 삭제·SKIP 변경 0건. 23·25번 서버·운영 데이터 접근 0건.
- 두 저장소의 기능 가지를 Forgejo 다음 GitHub 순으로 푸시하고, 두 원격의 최종 HEAD 원문과 작업 트리 상태는 채팅 보고에 기록한다. 최종 HEAD를 이 문서 안에 쓰면 문서 커밋의 해시가 다시 바뀌므로 자기 참조를 피한다.

완료 판정: (1) 정적 기능 조사표 완료, (2) JS 18개 분류 완료, (3) Node 없는 71건 시도 완료, (4) 접속자 주소는 HTTP 경로와 부트스트랩만 통과하고 db95 원시 TCP는 미완료, (5) TLS 비교와 두 원격 푸시 완료 후 판정.

DB95_SUMMARY=4/5
