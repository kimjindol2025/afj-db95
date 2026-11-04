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
