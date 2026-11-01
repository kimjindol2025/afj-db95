# DB95-5 진단 보고서

실행 위치: 격리 작업 공간 `<가림>`. 23·25번 서버, 운영 데이터, 다른 제품 저장소는 사용하지 않았다. 이번 장에서는 소스 파일·시험 기대값·seed를 수정하지 않았다.

## 1. 시작점과 증거 보관

| 저장소 | 지정 로컬 HEAD | 증거 가지 Forgejo HEAD | 증거 가지 GitHub HEAD |
| --- | --- | --- | --- |
| afj-db95 | `9937dd0ee51ace5d8633237c33fcba563e2b56f1` | `9937dd0ee51ace5d8633237c33fcba563e2b56f1` | `9937dd0ee51ace5d8633237c33fcba563e2b56f1` |
| freelang-v11-fx | `f890da34aa9d5ee5b6b5c6a827a93886b3fc330e` | `f890da34aa9d5ee5b6b5c6a827a93886b3fc330e` | `f890da34aa9d5ee5b6b5c6a827a93886b3fc330e` |

두 저장소의 `evidence-db95-4` 가지만 Forgejo → GitHub 순서로 푸시하고 원격 ref를 다시 조회했다. 기존 `native-run`, `feat/db95-native-peer`는 푸시하지 않았다. 증거: [db95 GitHub 가지](https://github.com/kimjindol2025/afj-db95/tree/evidence-db95-4), [v11 GitHub 가지](https://github.com/kimjindol2025/freelang-v11-fx/tree/evidence-db95-4).

## 2. bootstrap SIGKILL

비교 기준 `master` HEAD는 로컬·Forgejo·GitHub 모두 `1d217f53a8aade8a288c0dcad0a1ba23b610f102`였다. 변경본과 원본의 `bootstrap/stage0.c` SHA-256은 둘 다 `f7425bf086d99d11231ba79296e194fcc36b454379e46d44131bafb0dc74101c`다. 두 번 모두 같은 공용 잠금과 바깥 시스템 호출 추적 아래 각자의 `scripts/verify-native-bootstrap.sh`를 1회 실행했다.

변경본 실행 직전 `ps` 필터 원문:

```text
    PID    PPID STAT     ELAPSED COMMAND
2938116  128621 Ss         06:01 flock
2939224  128621 Ss         05:38 flock
2942213 2942188 S          05:03 flock
2943216 2943192 S          04:51 flock
2947997 2947996 S          04:14 flock
3061051 2106386 S          00:34 flock
```

변경본 실행 직전 `free -h` 원문:

```text
               total        used        free      shared  buff/cache   available
Mem:           188Gi        25Gi        86Gi       1.3Gi        79Gi       162Gi
Swap:           31Gi       4.6Gi        27Gi
```

원본 `master` 실행 직전 `ps` 필터 원문:

```text
    PID    PPID STAT     ELAPSED COMMAND
2939224  128621 Ss         05:53 flock
2942213 2942188 S          05:18 flock
2943216 2943192 S          05:06 flock
2947997 2947996 S          04:29 flock
3061051 2106386 S          00:49 flock
```

원본 `master` 실행 직전 `free -h` 원문:

```text
               total        used        free      shared  buff/cache   available
Mem:           188Gi        26Gi        86Gi       1.3Gi        79Gi       162Gi
Swap:           31Gi       4.6Gi        27Gi
```

두 실행 모두 `STAGE0_C_BUILD=PASS` 뒤 종료값 1이었다. 표본 기록은 각각 `STAGE0_RSS_PEAK_KB=0`이다. **이 0은 stage0 프로그램이 실행되기 전에 자식이 죽어 RSS 표본이 없다는 뜻이며 실제 메모리 사용량의 최고치가 아니다.** 두 실행의 cgroup `memory.events`는 전후 모두 다음과 같았다.

```text
low 0
high 0
max 0
oom 0
oom_kill 0
oom_group_kill 0
```

변경본 추적 원문:

```text
3062467 execve(<가림>, ["strace", ...]) = 0
3062467 kill(3062468, SIGKILL)          = 0
3062468 +++ killed by SIGKILL +++
```

원본 `master` 추적 원문:

```text
3062968 kill(3062969, SIGKILL)          = 0
3062969 +++ killed by SIGKILL +++
```

작은 중첩 추적 대조 시험도 같은 현상을 재현했다.

```text
NESTED_STRACE_EXIT=1
strace: test_ptrace_get_syscall_info: PTRACE_TRACEME: Operation not permitted
strace: ptrace(PTRACE_TRACEME, ...): Operation not permitted
3320475 kill(3320476, SIGKILL)          = 0
3320476 +++ killed by SIGKILL +++
```

확인한 원인은 **바깥 `strace`와 bootstrap 스크립트 내부 `strace`의 중첩 추적 충돌**이다. `SIGKILL`은 안쪽 `strace`가 보냈다. 이는 이번 v11 변경에서만 발생한 현상이 아니다. 실제 bootstrap의 stage2·3·4 결과는 이 방법으로 확인할 수 없다. 커널 OOM 검색 결과는 `-- No entries --`였고, 직접 `dmesg`는 `Operation not permitted`였다.

## 3. 원시 TCP 접속 시험

DB95-4의 수정 전 컴파일 오류는 `tcp_write` 미선언과 `RAW_PEER_BEFORE_EXIT=1`이었다. 첫 런타임 구현 뒤 두 시험은 컴파일 후 응답 없이 `RAW_PEER_AFTER_EXIT=1`, `RAW_PEER_RERUN_EXIT=1`이었다. 당시 `str-to-num`은 실수 값을 반환했으나 원시 TCP 서버는 정수 포트만 허용했다. 이는 **서버가 열리기 전에 거부되는 원인**이다. 포트 타입 수리 후 세 번째 시험도 응답 없이 `RAW_PEER_THIRD_EXIT=1`이었다. 이 세 번째 실패의 시스템 호출 추적은 남아 있지 않다.

이번 장의 시스템 호출 추적 재실행은 `TCP_DIAG_EXIT=0`, `RAW_PEER=PASS`였다. 주소·포트 값은 가리고, 성공 여부와 전송 바이트 수만 보존한 원문:

```text
bind(3, {sa_family=AF_INET, sin_port=htons(<가림>), sin_addr=inet_addr("<가림>")}, 16) = 0
listen(3, 64) = 0
connect(3, {sa_family=AF_INET, sin_port=htons(<가림>), sin_addr=inet_addr("<가림>")}, 16) = 0
accept(3, {sa_family=AF_INET, sin_port=htons(<가림>), sin_addr=inet_addr("<가림>")}, [128 => 16]) = 4
sendto(4, "RAW_PEER=PASS\n", 14, MSG_NOSIGNAL, NULL, 0) = 14
```

반면 추적 없는 무작위 포트 재실행은 `TCP_NORMAL_EXIT=1`로 응답이 비었다. 미사용 고정 포트에서는 `FIXED_PORT_BUSY=0`, `TCP_FIXED_EXIT=0`, `RAW_PEER=PASS`였다. 따라서 주소를 읽는 기능 자체는 성공 사례에서 동작했다. **과거 세 번째 실패가 바인드 실패였는지, 연결 뒤 무응답이었는지는 당시 추적이 없어 확정할 수 없다.** 무작위 포트 충돌은 추측이며, 아래 대조 시험은 그 실패 형태만 검증한다.

고정 포트를 일부러 점유한 대조 시험의 원문:

```text
CONFLICT_LISTENER=PASS
CONFLICT_TEST_EXIT=1
Compiled <가림> -> <가림>
117760 bind(3, {sa_family=AF_INET, sin_port=htons(<가림>), sin_addr=inet_addr("<가림>")}, 16) = -1 EADDRINUSE (Address already in use)
ACCEPT_CALLS=0
SENDTO_CALLS=0
```

대조 시험은 바인드 실패만으로 같은 빈 응답을 만들 수 있음을 보여준다. 실제 세 번째 실패의 포트 충돌 여부는 **미확인**이다. 실패 당시 `tcp-server-raw`의 반환값을 시험이 확인하지 않아 서버가 열리지 않은 경우와 연결 후 무응답을 구별할 기록이 없었다.

## 4. 71건의 첫 오류 묶음

DB95-4 마지막 전체 게이트의 사례별 로그 71개에서 경로와 생성 C의 위치를 떼고 첫 오류 문장만 합쳤다. 합계는 71건이다.

| 첫 오류 문장 | 건수 | 대표 사례 |
| --- | ---: | ---: |
| `error: implicit declaration of function ‘has_key_p’` | 40 | 1 |
| `NATIVE_JS_SOURCE_NOT_PORTED` | 14 | 24 |
| `error: implicit declaration of function ‘json_str’; did you mean ‘json_parse’?` | 6 | 2 |
| `error: implicit declaration of function ‘buf_str’` | 3 | 4 |
| `node: command not found` | 2 | 9 |
| `error: implicit declaration of function ‘file_read’; did you mean ‘fl_file_read’?` | 2 | 26 |
| `error: redefinition of ‘__fl_wrap_sha1_add’` | 1 | 65 |
| `production TLS boundary returned an unexpected error` | 1 | 59 |
| `error: implicit declaration of function ‘buf_to_binary’` | 1 | 3 |
| `Uncaught error (line 41): compatibility scorecard failure` | 1 | 28 |

최대 묶음의 대표 `syntax: tcp-server`를 단독 실행한 결과:

```text
CASE1_STANDALONE_EXIT=1
<가림>:1305:91: error: implicit declaration of function ‘has_key_p’ [-Wimplicit-function-declaration]
```

생성 C의 첫 실패식은 `has_key_p(definition, "column")`이고 원본은 `src/sql-core.fls:404`의 `(has-key? definition "column")`이다. 현재 `self/cgc-main.fl`에 `has-key?` 연결이 없고 런타임에도 `has_key_p` 선언·구현이 없다. 그래서 C 식별자 형태로 그대로 나와 컴파일에 실패한다. 이 증거는 **최초로 막힌 원인**을 설명하며, 이를 고쳐도 뒤에 있는 다른 오류가 사라진다는 뜻은 아니다.

## 5. 다음 수정 추천과 상태

**추천 1개:** v11의 `self/cgc-main.fl`에서 `has-key?`를 명시적인 런타임 함수로 연결하고, `runtime/collection.c`·`runtime/runtime.h`에 Map 키 존재 검사를 구현한다. 현재 `fl_map_get`은 키가 없을 때와 키 값이 `nil`일 때 모두 `nil`을 반환하므로, 키를 직접 비교해야 한다. 먼저 `nil` 값이 있는 키를 포함한 최소 재현 시험을 커밋한다. 예상 영향은 40건의 첫 컴파일 차단점 제거이며, 40건 전체 통과를 보장하지 않는다.

이 보고서만 로컬 커밋한다. `evidence-db95-4` 원격 가지는 DB95-4 시점 그대로 보존하며, 기존 작업 가지도 푸시하지 않는다. 새 JS·TS·Python 0줄. 민감 정보 diff 검사와 작업 트리 상태는 커밋 직전·직후에 확인한다.

| DB95_SUMMARY 항목 | 판정 |
| --- | --- |
| 증거 push | 통과 |
| bootstrap 원인 | 통과: 중첩 추적 충돌 재현 |
| TCP 실패 원인 | 부분: 초기 타입 불일치 확인, 세 번째 당시 수락 여부 미확인 |
| 71건 묶음·대표 원인 | 통과 |
| 다음 수정 추천·작업 트리 | 통과: 추천 1개와 민감 정보 검사 후 로컬 커밋, 작업 트리 확인 |

DB95_SUMMARY=4/5
