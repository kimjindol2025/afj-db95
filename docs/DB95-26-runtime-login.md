# DB95-26 — 시작 기준 확인

현재 FX HEAD: 19364839e103aa8ecd3d5f59d7106ce41ef9763c.

실행 파일 SHA-256 확인값:

- 기존 Stage3: bb6b1a355e4e47360607a648b9d13ab24f43d056d5f58d87ec78fa8f657510f3
- DB95-25 Stage4: 1d86c0b1140f98710927ba847458b811122d6bd7f9ead4fee79bde918e901769

기존 생성 C와 새 생성 C는 동일하나 링크한 런타임이 달라졌다. 기존 컴파일러 뒤에 추가된 커밋은 c0fab4ef(curl transport), 6a499b55(buf-str/sleep-ms), ea0256eb(버퍼 기본 함수), 8b1399dc(rem/println flush), 80d9b3a0(비트 함수 등록), d5261125(NOT/회전), 19364839(비트 인자 정규화)다. DB95-25에서 기존 Stage3로 현재 self/cgc-main.fl을 번역하고 현재 런타임 및 cgc-bridge.c와 링크했다. Stage0는 사용하지 않았다.

보존된 Stage2·3·4 생성 C와 DB95-25 compiler-v3/stage4.c를 직접 해시 계산한 값은 모두 다음과 같다:

7b119bfd435ee5979edf48b1ec75c0c50c3803b527fcae907e484460807509d2

이 값은 기존 DB95-21 보고서와 일치한다. 다만 지시서에 제시된 1d70ead0…와 다르므로 그 기준 고정점을 유지했다고 판정할 수 없다. 작업 저장소 문서 및 작업 증거의 해시 기록에서 1d70ead0…를 찾지 못했다. 해당 생성 C의 전체 SHA와 기준 커밋/자료 식별 확인이 필요하다. 새로운 bootstrap 검증은 수행하지 않았다.

기존 함수 조사:
- file_mtime: runtime/io.c의 _fl_file_modified가 수정 시간을 밀리초로 반환하며 실패 시 0을 반환한다. 기존 함수 연결 후보가 있다.
- buf-to-binary: 기존 v11_buf_decode 및 길이를 보존하는 문자열/Latin-1 함수 조합을 검토할 수 있다. fl_base64_decode 단독 사용은 NUL 포함 데이터가 fl_str_val에서 잘릴 수 있어 부적합하다.

이 회차에서는 구현·시험·gate·커밋·푸시를 아직 수행하지 않았다. DB95-25의 42/71은 이전 집계이며 이 회차 결과로 재사용하지 않는다.

DB95_SUMMARY=0/4, PASS=미측정 FAIL=미측정 TIMEOUT=미측정

## 보충 1 — 기준 정정 후 재개

사장님 결정에 따라 이번 FX 생성 C 기준은 `7b119bfd435ee5979edf48b1ec75c0c50c3803b527fcae907e484460807509d2`다. 위 최초 중단 기록의 `1d70ead0…` 비교는 폐기한다. 다른 저장소의 값이다.

재개 시작 및 현재 작업 종료 시 보존된 Stage2·3·4 C를 다시 sha256sum으로 확인했다. 세 파일 모두 다음과 같다. 이번 작업에서 컴파일러를 재빌드하거나 bootstrap을 새로 수행하지 않았다.

```text
7b119bfd435ee5979edf48b1ec75c0c50c3803b527fcae907e484460807509d2  <가림>/stage2.c
7b119bfd435ee5979edf48b1ec75c0c50c3803b527fcae907e484460807509d2  <가림>/stage3.c
7b119bfd435ee5979edf48b1ec75c0c50c3803b527fcae907e484460807509d2  <가림>/stage4.c
1d86c0b1140f98710927ba847458b811122d6bd7f9ead4fee79bde918e901769  <가림>/stage4-bin
```

### 기존 함수 조합 및 단위 시험

- `buf-to-binary`: 기존 v11_buf_decode → fl_v11_latin1_decode 조합. 버퍼의 바이트별 Latin-1 문자열을 반환하고 NUL·상위 비트를 보존한다. 빈 버퍼는 빈 문자열이다.
- `buf-from-binary`: 기존 fl_v11_latin1_encode → v11_buf_encode 조합. 기존 case 3에서 요구하는 역변환을 함께 연결해 왕복 보존을 검증했다.
- `file_mtime`: 기존 _fl_file_modified 연결. 수정 시각을 밀리초로 반환하며 없는 파일은 0이다. 새 OS/C 기능 구현은 추가하지 않았다.
- 시험: FX tests/db95-26-runtime.fls. 정상 버퍼는 00 ff 80 41 42, 경계는 빈 버퍼. 정상 파일은 touch로 1700000000초를 지정한 임시 fixture, 경계는 존재하지 않는 파일이다.

```text
BINARY_NORMAL_PASS
BINARY_EMPTY_PASS
MTIME_NORMAL_PASS
MTIME_MISSING_PASS
```

### case 25 로그인 실패의 실제 원인

원본 시험을 수정하지 않고 임시 진단 복사본에서 응답의 ok/error와 루프 인덱스만 기록했다. 토큰은 기록하지 않았다. println flush는 적용된 런타임을 사용했다.

```text
Uncaught error (line 104): LOGIN_DIAGNOSTIC ok=false error=SESSION_LIMIT
Uncaught error (line 104): LOGIN_DIAGNOSTIC index=0 ok=false error=SESSION_LIMIT
```

src/tcp-server.fls:1945-1946은 세션 수가 한도에 도달하면 이 응답을 반환한다. AFJ_DB_MAX_SESSIONS는 설정되지 않았고 기본 한도는 64다. tests/tcp-long-soak.fls:99-106의 while 본문에는 로그인 let 다음에 client-index 증가가 있지만 생성 C에는 증가 호출이 없다. FX self/cgc-main.fl:2372-2373의 cgc-while은 `(get $args 1)`만 생성해 두 번째 이후 본문을 누락한다. 따라서 8회로 끝나야 할 루프가 인덱스 0에서 반복되어 한도에 도달한다. 생성 C의 중첩 deref는 내부 바인딩 박스 처리이며 이것만으로 오류라고 판단하지 않는다.

최소 재현(임시 자료 <가림>/DB95-26/while-body.fls):

```clojure
(define running (atom true))
(define observed (atom 0))
(while @running
  (reset! running false)
  (reset! observed 1))
(println (str "WHILE_SECOND_BODY=" @observed))
(if (= @observed 1) (println "WHILE_BODY_PASS") (throw "while dropped second body"))
```

실행 원문:

```text
WHILE_SECOND_BODY=0
Uncaught error (line 7): while dropped second body
EXIT=1
```

이번 지시의 수정 범위는 런타임/앱이므로 컴파일러 수정과 새 고정점 검증 허용 여부를 질문했다. 컴파일러·원본 시험·러너·기대값·제한시간은 바꾸지 않았다. 게이트는 아직 실행하지 않았다. 이전 42/71을 이번 측정값으로 쓰지 않는다. 단위 시험과 진단 기록은 임시 자료에 보존한다.

언어 성과: 기존 런타임 조합으로 바이너리 버퍼 왕복 변환과 파일 수정시각을 연결했고 단위 시험 4/4를 확인했다. 데몬 로그인 시험 통과는 아직 확인하지 못했다.

현재 기준표: 기준 및 시작/끝 해시 1/4 충족, 새 내장 단위 시험 2/4 충족, case 25 미통과, 전체 gate 미실행. 푸시 상태는 후속 기록으로 남긴다.


FX 내장 연결 커밋: 886af1c434d7a8f70bceb851360ff6600d2c3c3b. Forgejo 다음 GitHub에 푸시하고 ls-remote로 양쪽 동일 HEAD를 확인했다. 민감정보 diff 검사 및 diff --check를 통과했다. 보고서는 별도 문서 커밋 후 같은 순서로 푸시하고 원격 검증 결과를 최종 응답에 기록한다. 원본 컴파일러 실행 파일은 보존했다.

DB95_SUMMARY=2/4, PASS=미측정 FAIL=미측정 TIMEOUT=미측정

## 보충 2 — cgc-while 최소 수정

컴파일러 수정 승인을 받아 self/cgc-main.fl:2373 한 줄만 교체했다(+1/-1). `(cgc (get $args 1))`을 `(cgc-do (slice $args 1 (length $args)))`로 바꿨다. 다른 컴파일러 함수는 수정하지 않았다.

재현을 FX tests/db95-26-while.fl(7줄)에 추가했다. 앞 절의 실패 재현과 같은 내용이다. 수정 전 `WHILE_SECOND_BODY=0`, exit 1; 수정 후 출력은 다음과 같고 exit 0이다.

```text
WHILE_SECOND_BODY=1
WHILE_BODY_PASS
```

기존 실행 파일 1d86c0b1140f98710927ba847458b811122d6bd7f9ead4fee79bde918e901769에서 시작해 새 소스로 Stage1을 만든 후 순차적으로 Stage2·3·4를 만들었다. Stage0·시드 교체 없이 분리된 임시 자료에서 실행했다.

```text
STAGE1=e4fb1a898828cd873989008e248cdcadeb5dc7ce72ac4b68d5f3ea1b28c6f487
STAGE2=e4fb1a898828cd873989008e248cdcadeb5dc7ce72ac4b68d5f3ea1b28c6f487
STAGE3=e4fb1a898828cd873989008e248cdcadeb5dc7ce72ac4b68d5f3ea1b28c6f487
STAGE4=e4fb1a898828cd873989008e248cdcadeb5dc7ce72ac4b68d5f3ea1b28c6f487
FIXPOINT_MATCH=PASS
```

새 Stage4 실행 파일 SHA-256: 7bca2ea4c37619bce3f6047d88e9bace717129034c92836c322d2ba845cfdb2a.

기존 7b119bfd… 생성 C 대비 raw diff는 자동 생성 변수/함수 번호 이동을 포함한다. arg/av/anon/env/logic/loop/catch/try 및 __env의 자동 번호를 정규화한 diff는 `@@ -4736,7 +4736,7 @@` 한 곳만 남는다. 해당 함수 __fl_binding_1421은 cgc-while이며 호출이 cgc → cgc-do(slice ...)로 바뀐 내용이다. Stage1과 Stage4 C도 cmp 동일하다. 원본 diff 및 정규화 diff는 <가림>/DB95-26에 보존했다.

### 기존 단위 시험

아래 12개 파일이 모두 통과했다. 기존 단위 시험 회귀는 0건이다. 각 파일 내부 확인값과 오류 기대값은 변경하지 않았다.

- FX: db95-26-while, db95-26-runtime, buf-str-compat, sleep-ms-compat, buf-buffer-compat, rem-compat, rem-zero-divisor, println-flush-child, bit-ops-compat, bit-adapter-compat.
- afj-db95: db95-25-buf-u32le, db95-25-sha1-abc.
- rem-zero-divisor는 기존 rem-zero-check.sh로 exit 1과 원문 오류를 확인했고, println-flush-child는 기존 println-flush-check.sh로 리디렉션 후 0.1초 시점의 문구를 확인했다.

### case 25 단독 실행

기존 worker, 환경값 및 360초 제한으로 실행했다. 로그인 SESSION_LIMIT은 넘었고 쓰기·조회 검증이 진행됐다. 그러나 최종 종료 코드는 124이며 통과가 아니다.

```text
CASE25_EXIT=124
afj-db95 TCP 300s soak PASS writes=16376 throughput=54.586666666666666/s p95=173ms max=323ms
Uncaught error (line 131): [finally] Function not found: finally (at line 167, col 0)
```

PASS 문구가 반복 출력됐지만 종료 결과를 기준으로 실패로 기록한다. 시험 원본의 while/후속 표현식 배치와 finally 처리가 후속 조사 대상이다. cgc-while 밖의 컴파일러 및 시험 원본은 수정하지 않았다. 제한시간도 바꾸지 않았다.

전체 gate는 단독 시험 뒤 공용 잠금 아래 원래 러너로 실행한다. 첫 대기용 background 프로세스는 gate 시작 파일이나 case 기록을 만들지 않고 종료되어 실제 실행으로 세지 않는다. 이후 foreground 실행의 한 프로세스에서 71건을 완료하는지 확인한다.

### 메모리 경고 및 실행 중단

사용자의 메모리 경고 뒤 확인한 커널 기록에서 2026-11-05 02:12:43에 case-bin OOM 종료를 확인했다. 식별정보는 가렸다.

```text
Out of memory: Killed process 158215 (case-bin) total-vm:202632992kB, anon-rss:175861936kB, file-rss:6880kB, shmem-rss:0kB
```

익명 RSS만 약 168GiB다. gate는 case 26 FAIL exit=124까지 집계했고 case 27 로그가 있으나 완료 파일과 71건 최종 요약은 없다. OOM 프로세스가 정확히 어느 case에 해당하는지는 추가 확인이 필요하다. case 26·27 로그에 중간 PASS 문구가 있으나 완료 판정으로 쓰지 않는다. 확인 시점에 gate·컴파일러·case-bin·daemon-bin 프로세스는 남아 있지 않았다. 같은 조건의 재시작은 시스템 OOM 재발 위험 때문에 보류한다. 사용자 지시대로 일부 구간을 이어 돌려 합산하지 않았다.

완료 기준: 수정 전 실패/수정 후 통과 및 새 고정점 검증은 충족했다. 기존 단위 시험은 12개 파일 모두 통과했으나 case 25는 미통과다. 71건 gate 미완료이므로 PASS 44 이상과 기존 42건 전체 회귀 여부는 확정할 수 없다. 원인 조사 또는 메모리 안전 실행 방안 확인 없이 무거운 시험을 추가 실행하지 않는다.

언어 성과: FreeLang while의 두 번째 이후 본문 누락을 수정했고 최소 재현과 기존 단위 시험을 통과했다. 전체 DB95 통과 수는 이번 회차 미확정이다.

DB95_SUMMARY=2/4, PASS=미확정 FAIL=미확정 TIMEOUT=미확정, FIXED_POINT=e4fb1a898828cd873989008e248cdcadeb5dc7ce72ac4b68d5f3ea1b28c6f487

## 메모리 경고 후 재개 — repeat 복사 폭증 수정

사용자가 메모리 문제 해결과 계속 진행을 지시했다. 기존 원본 시험은 그대로 두고 런타임 fl_repeat의 복사 경로를 조사했다.

src/backup.fls:380의 backup-large-smoke-test는 `(repeat 2097152 "L")`을 join해 2MiB 입력을 만든다. runtime/aliases.c:689의 fl_repeat는 fl_vec_push로 한 개씩 추가했고, runtime/collection.c:100의 불변 push는 매번 기존 벡터 전체를 복사한다. 이전 벡터는 arena 종료까지 남아 전체 메모리 비용이 제곱으로 증가한다. while 수정과 무관하게 이 repeat 경로만 분리한 재현에서도 메모리 폭증을 확인했다. kernel OOM PID의 case 번호는 로그로 단정하지 않으며, case 26·27이 공통으로 실행하는 백업 대용량 경로를 재현한 결과다.

안전 재현에는 prlimit --as=2147483648 --core=0을 적용했다. 이는 프로세스 주소 공간을 2GiB로 제한해 시스템 전체 OOM 재발을 막는다. 기존 시간 제한 및 시험 기대값은 바꾸지 않았다.

수정 전 원문:

```text
REPRO_EXIT=139
Command terminated by signal 11
ELAPSED=1.63 MAX_RSS_KB=2053616 EXIT=0
```

위 time의 EXIT=0은 signal 종료에서 출력된 값이며 성공이 아니다. 실제 shell 종료 코드는 139다. 메모리 상한 도달 후 런타임 할당 실패 경로에서 signal 11이 발생했다. 이 재현은 수정 전 증거로만 남긴다.

수정은 runtime/aliases.c fl_repeat의 +3/-3이다. fl_vec_new/fl_vec_push 반복을 기존 fl_vec_builder_new/fl_vec_builder_push/fl_vec_builder_freeze 조합으로 교체했다. 외부로 돌려주는 값은 기존과 같은 불변 벡터다. 다른 컬렉션 함수·컴파일러·시험 원본은 바꾸지 않았다.

FX tests/db95-26-repeat.fls에 실제 2,097,152개 입력과 마지막 값·join 길이, 0·음수·정상 값 보존 확인을 추가했다. 수정 후 원문:

```text
REPRO_EXIT=0
ELAPSED=0.11 MAX_RSS_KB=70736 EXIT=0
REPEAT_LARGE_PASS
REPEAT_BOUNDARIES_PASS
```

백업 원본 worker를 동일한 2GiB 상한, 기존 120초 제한, 수정된 /dev 바인드와 공용 잠금 아래 실행한 결과:

```text
CASE=26 EXIT=0
ELAPSED=15.97 MAX_RSS_KB=116772 EXIT=0
CASE=27 EXIT=0
ELAPSED=15.64 MAX_RSS_KB=118116 EXIT=0
```

전체 gate를 새 로그 디렉터리에서 처음부터 실행한다. 프로세스별 2GiB 주소 공간 상한을 상속시키며, 러너·기대값·시간 제한은 변경하지 않는다. 기존 OOM 중단 결과와 합산하지 않는다.

### 안전 실행 완료 및 최종 집계

이번 gate는 처음부터 한 프로세스로 71건을 완료했다. 이전 OOM 중단 기록을 합산하지 않았다. 원문:

```text
NATIVE_GATE_PASS=45 FAIL=26 TIMEOUT=1 SKIP=0 TOTAL=71
GATE_EXIT=1
2026-11-04T18:12:06Z
NEW_PASS=3
NEW_PASS=26
NEW_PASS=27
BASELINE42_REGRESSIONS=0 NEW_PASSES=3
```

TIMEOUT=1은 FAIL=26에 포함된다. 이전 통과 42건은 모두 유지했고 case 3·26·27이 추가 통과했다. 실패가 있으므로 gate 종료 코드 1은 정상적으로 기록된 전체 결과이며 중단을 뜻하지 않는다.

case 25는 다시 exit 124였다. timeout 뒤 자식 case-bin·daemon-bin이 남아 약 1GiB RSS까지 증가하는 것을 확인했다. 해당 실행의 PID와 이름을 확인하고 그 두 프로세스만 TERM 후 필요 시 KILL로 종료했다. gate와 다음 case는 건드리지 않았다. 최종 시점에 case-bin·daemon-bin·Stage 컴파일러 잔류 프로세스는 없었다. 이 시간 초과/자식 정리 문제는 백업 repeat 복사 문제와 별개이며, 러너 수정은 하지 않았다. case 25는 추가 재시도하지 않는다. 최종 로그에는 기존 finally 미등록 오류도 남아 있다.

최종 실행에서는 프로세스별 주소 공간 2GiB 상한을 유지했다. 이를 무제한 환경의 결과로 표현하지 않는다. 향후 시험도 동일한 메모리 보호, 단일 공용 잠금, 종료 후 자식 프로세스 확인을 적용해야 한다. 전체 시스템 OOM을 유발한 이전 조건으로 되돌리지 않는다.

종료 시 원래 실행 파일 SHA는 1d86c0b1140f98710927ba847458b811122d6bd7f9ead4fee79bde918e901769, while 수정 컴파일러 SHA는 7bca2ea4c37619bce3f6047d88e9bace717129034c92836c322d2ba845cfdb2a로 시작값과 같다. 보존된 Stage2·3·4 생성 C 모두 e4fb1a898828cd873989008e248cdcadeb5dc7ce72ac4b68d5f3ea1b28c6f487이다. repeat 수정은 시험 실행 파일에 링크되는 런타임 변경이며 컴파일러 실행 파일을 교체하거나 생성 C를 바꾸지 않았다.

| 기준 | 결과 |
|---|---|
| 1/4 수정 전 while 실패, 수정 후 통과 | 충족 |
| 2/4 Stage2·3·4 일치 및 while만 의미 변경 | 충족 |
| 3/4 case 25 통과 및 기존 단위 시험 회귀 0 | 미충족: case 25 exit 124. 기존 단위 12개 파일은 통과 |
| 4/4 단일 gate PASS 44 이상, 기존 42건 회귀 0, 양쪽 원격 | 집계 조건 충족. 아래 변경과 보고서를 커밋 후 양쪽 원격 검증 |

언어 성과: while 본문 전체가 실행되며, repeat의 벡터 반복 복사를 기존 빌더 조합으로 바꿔 2,097,152개 입력을 0.11초·70,736KiB에서 처리했다. curl 없이 native gate 45/71, 기존 42건 회귀 0. case 25 시간 초과는 남아 있다.

DB95_SUMMARY=3/4, PASS=45 FAIL=26 TIMEOUT=1, FIXED_POINT=e4fb1a898828cd873989008e248cdcadeb5dc7ce72ac4b68d5f3ea1b28c6f487
