# DB95 191 Coding 검증 결과

2026-11-05 최초 DB95-191 회차 기록. 당시 상태: 요청된 두 원인의 수정 및 지정 검증 PASS, 커밋·푸시·배포 없음. 후속 재검증·검수 브랜치 처리는 DB95-192-case12-39.md에 기록한다.

후속 별도 검증자 QA는 DB95-independent-QA.md에 기록했다. 최초 실수형 경계 리터럴 시험의 누락을 발견하여 산술식 입력으로 보완하고 재실행·재검토했다. 이 문서의 정상 복원·지정 시험 PASS와 릴리스 승인은 구분하며, 전체 릴리스는 BLOCKED다.

기준 HEAD는 DB95 c315ef23, FX a9ffce18이며 작업 뒤에도 동일하다. 기존 미추적 DB95-13 문서와 tmp 자료를 보존했다. 기획서, 구현명세서, 작업 지시는 각각 DB95-191-plan.md, DB95-191-spec.md, DB95-191-work-order.md다.

## 원인과 수정

| 원인 | 수정 | 근거 |
|---|---|---|
| 일반 map을 deref하여 nil이 됨 | src/tcp-server.fls의 afj-tcp-record-table-row-versions에서 current에 대한 deref 3곳 제거 | afj-tcp-row-map은 map 반환. runtime/aliases.c의 fl_deref는 future가 아닌 일반 map을 nil로 처리. 기존 버전만 닫히고 신규 버전 추가가 누락되던 경로를 수정 |
| 산술식 반복 횟수가 FL_FLOAT여서 0으로 처리됨 | FX runtime/aliases.c의 fl_repeat에서 유한한 int64 범위의 정수값 FL_FLOAT를 변환 | v11 산술 결과는 FL_FLOAT. 이전 oversized WAL의 padding은 빈 문자열이고 파일은 138바이트였음. 수정 후 별도 시험에서 padding 길이 1048577 및 양 끝 문자 확인 |

repeat의 기존 정수 경로와 vector builder를 유지했다. 0·음수 실수는 빈 벡터이며 분수·NaN·무한대·int64 범위 밖 실수는 변환 전에 명시적으로 거부한다. 런타임 전체 deref 동작, 컴파일러 self 소스, seed를 바꾸지 않았다.

## 실행 증거

원본 gate의 run_case 호출 순서로 case 번호·파일·환경값을 추출했다. tests/native-release-gate.sh --worker를 사용하고 각 원본 worker의 120초 제한을 유지했다. 무거운 실행 전 ps를 확인하고 flock -o /tmp/fl-heavy.lock과 prlimit --as=2147483648 --core=0 안에서 순차 실행했다. /tmp는 이번 작업 전용 저장 디렉터리에 바인드했다. node·awk·JS·TS·Python 실행은 없다.

| 검증 | 종료 코드 | 실제 출력 |
|---|---:|---|
| case 38 / tcp-mvcc-conflicts.fls | 0 | afj-db95 TCP row-version chain PASS; 이후 phantom/write-skew·schema·중복 행·DDL/DML 등 전체 원본 시험도 종료 0 |
| case 41 / tcp-row-version-recovery.fls | 0 | afj-db95 TCP row-version WAL recovery PASS |
| case 42 / tcp-row-version-checkpoint.fls | 0 | afj-db95 durable row-version checkpoint write PASS; afj-db95 durable row-version checkpoint recovery PASS |
| 새 repeat 회귀 / db95-191-repeat.fls | 0 | REPEAT_ARITHMETIC_PADDING_PASS length=1048577; REPEAT_FLOAT_BOUNDARIES_PASS |
| 기존 repeat 회귀 / db95-26-repeat.fls | 0 | REPEAT_LARGE_PASS; REPEAT_BOUNDARIES_PASS |
| 별도 checkpoint 생성 프로세스 | 0 | CHECKPOINT_WRITE_PASS old=10 current=20 chain=2 |
| 별도 checkpoint 복원 프로세스 | 0 | CHECKPOINT_FRESH_PROCESS_RECOVERY_PASS old=10 current=20 chain=2 |
| case 7 / afj-db95.fls | 0 | afj-db95 oversized WAL PASS |
| case 13 / persistent-btree.fls | 0 | afj-db95 persistent recursive B+Tree PASS |

각 실행은 1회이며 이번 수정 후 실패는 0건이다. 같은 원인 3회 실패 중단 조건은 발생하지 않았다. 종료 코드와 PASS 출력 모두 확인했으며 중간 PASS만으로 성공 판정하지 않았다.

추가 검증 실행 명령: `bash tmp/DB95-191/verify-extra.sh`. 이 보조 스크립트는 새 임시 파일이며 기존 러너를 수정하지 않는다. 원본 case 38/41/42는 같은 worker 명령과 원본 환경값으로 먼저 실행했다. 로그는 `<가림>/DB95-191/`의 각 case 디렉터리 output.log/result 및 checkpoint/read.log/read-result에 보존했다.

## 독립 검증 범위

새 checkpoint 시험은 기존 원본 시험과 별도 입력을 사용한다. 생성 프로세스 종료 후 동일 실행 파일을 새 OS 프로세스로 시작해 복원한다. 저장 페이지의 두 버전, manifest revision 3, WAL 길이·prefix SHA-256 일치도 직접 검사한다. 실제 저장 체인은 다음과 같다.

```text
value=10 created=2 deleted=3
value=20 created=3 deleted=null
```

복원 후 revision 2에서 10, revision 3에서 20, schema revision 1과 chain 길이 2를 확인했다. 이는 같은 세션의 메모리 상태에 의존하지 않는 검증이다. 별도 검증자나 외부 AI의 검수는 아니며, 전원 차단·전체 내구성 검증을 의미하지 않는다.

정적 검토에서도 일반 map의 deref 3곳과 repeat의 숫자 변환 외 제품 코드 변경이 없음을 확인했다. 원본 시험·기대값·러너 변경은 0건이다. 두 저장소 git diff --check 통과.

종료 후 ps에서 이번 작업의 case-bin·daemon-bin·Stage 컴파일러·cc1·flock 잔류가 없음을 확인했다. 시작 전부터 존재한 별도 bwrap 프로세스는 건드리지 않았다.

기존 Stage4 실행 파일 SHA-256은 7bca2ea4c37619bce3f6047d88e9bace717129034c92836c322d2ba845cfdb2a로 유지한다. 보존된 Stage2·3·4 생성 C는 모두 e4fb1a898828cd873989008e248cdcadeb5dc7ce72ac4b68d5f3ea1b28c6f487이다. bootstrap을 새로 실행하지 않았으므로 수정 런타임의 새 고정점 검증으로 주장하지 않는다.

case 9는 HOLD이며 실행하지 않았다. case 12/39 및 전체 71건 gate는 이번 범위에서 재실행하지 않았다. 기존 45/71을 새 전체 통과 수로 갱신하지 않는다. 프로젝트의 제품 완성·출시 가능 여부 역시 이 제한된 검증으로 판단하지 않는다.
