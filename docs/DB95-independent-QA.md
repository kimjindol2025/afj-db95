# DB95 별도 검증자 QA

2026-11-05. 릴리스 판정: BLOCKED. 커밋·푸시·배포 보류.

사용자의 별도 검증자 요청에 따라 구현 담당과 분리된 검증 에이전트 db95_independent_qa가 읽기 전용으로 코드·생성 C·로그·저장 파일을 직접 확인했다. 외부 AI 서비스나 서버에 연결하지 않았다. 이 검토는 독립 코드·증거 검토이며, 검증자가 전체 시험을 새로 실행한 것은 아니다.

## 최초 검토

| 항목 | 판정 | 직접 확인한 증거 |
|---|---|---|
| 기준 | PASS | DB95 c315ef23, FX a9ffce18 |
| 일반 map deref 수정 | PASS | 일반 map 반환과 fl_deref 동작, 수정된 3곳 대조 |
| repeat 변환 | PASS | 변환 전 유한성·정수값·int64 범위 검사 |
| case 7/13/38/41/42 기록 | PASS | 실제 result의 EXIT=0과 대응 PASS 로그 |
| 별도 프로세스 checkpoint 기록 | PASS | 생성·복원 EXIT=0, 저장 페이지의 두 버전 및 revision |
| padding·기존 2MiB 기록 | PASS | 길이 1048577, 기존 반복 시험 PASS |
| 실수형 0·음수 경계 | 최초 UNVERIFIED | 3.0/0.0/-1.0 리터럴이 생성 C에서 fl_int로 변환됨 |
| 장애 내구성·전체 gate | UNVERIFIED | 이번 검토에서 신규 실행하지 않음 |

이전 DB95-191-results.md의 독립 검증은 별도 프로세스 시험을 의미했다. 별도 검증자의 QA가 이미 수행됐다는 의미로 해석하면 안 된다. 이번 문서가 별도 검증자의 실제 검토 기록이다.

## 지적 반영 및 보충 검토

새 시험 db95-191-repeat.fls의 세 입력을 (+ 1 2), (+ 0 0), (- 0 1)로 변경했다. 기존 원본 회귀 시험은 수정하지 않았다. 구현 담당이 동일 Stage4·2GiB 상한·공용 잠금·120초 worker로 새 시험을 한 번 재실행했다.

```text
REPEAT_QA_EXIT=0
REPEAT_ARITHMETIC_PADDING_PASS length=1048577
REPEAT_FLOAT_BOUNDARIES_PASS
```

별도 검증자는 `<가림>/DB95-QA/repeat/case.c`의 62·64·66행에서 산술 반환값이 fl_repeat에 전달됨을 확인했다. runtime/v11-compat.h:1057–1075와 대조하여 해당 산술 결과가 FL_FLOAT임을 확인했고 output.log 및 result를 직접 읽었다. 따라서 변경 후 실수형 0·음수 경계 검증은 제출 증거 기준 PASS다. 수정 전 시험의 누락 사실은 위 기록에 남긴다.

## 남은 회귀 위험과 릴리스 차단 조건

1. runtime/collection.c의 vector builder는 malloc/realloc 실패와 uint32 capacity 배증 오버플로를 검사하지 않는다. 기존 정수 횟수에도 존재했던 위험으로 이번 변경이 새로 만든 결함이라고 단정하지 않는다. 다만 큰 산술식 횟수가 도달할 수 있어 메모리 부족 시 오류·프로세스 생존 검증 및 대책이 필요하다. 이번 작업에서는 OOM을 유발하는 시험을 하지 않았다.
2. 정상 저장 후 checkpoint 재시작 복원은 확인됐다. 강제 종료·WAL 손상·페이지/manifest 교체 중단·fsync 실패는 미검증이다.
3. case 9 HOLD, 전체 Native Release Gate BLOCKED다. 지정 5건 통과로 전체 통과 수를 갱신하지 않는다.
4. 수정된 런타임으로 bootstrap을 새로 수행한 것은 아니다. 기존 실행 파일·생성 C 해시 보존 확인과 새 고정점 검증을 구분한다.

검증자는 원본 시험·러너의 tracked 변경 없음, 두 저장소 diff --check 통과, 기존 Stage4 및 Stage2·3·4 생성 C 해시의 보고서 일치도 확인했다. 커밋·푸시·배포는 수행하지 않았다.

## 최초 대상 10건과 원래 GATE 정의 추가 대조

검증자는 원본 run_case 호출 순서로 대상 7·9·12·13·28·30·38·39·41·42의 파일 매핑을 확인했다. 기준 HEAD와 case 7 경로 및 DB95-27 단독 실패 로그도 직접 확인했다. 원래 GATE=3/3은 이 세 증거를 뜻하며 71개 전체 gate를 세 번 실행한다는 뜻이 아니다.

case 9는 셸 보류 묶음과 중복되는 외부 실행 의존성, case 28은 baseline 88%와 95% PASS 기준 미충족, case 30은 `..`를 거부하는 native 파일 정책과 시험 경로의 충돌로 확인했다. 이 세 건은 내장 함수 누락으로 분류하지 않는다. 이 최초 검토 당시에는 case 12/39의 정확한 원인을 확정하지 않았으므로 경로 확인만으로 TABLE=10/10을 선언하지 않았다.

## 후속 case 12·39 인과관계 검토

후속 사용자 지시에 따라 수행한 동일 runtime 대조에서 baseline 두 건은 기존 메시지로 EXIT=1, map deref 3곳을 제거한 소스는 단독 두 건 모두 EXIT=0이었다. 별도 검증자가 기준 소스 Git blob·3곳 diff·원본 러너/시험 cmp·SHA 검사·실제 완료 로그를 확인했다. 이번 baseline 전용 저장소에서 최초 id=1 history가 빠진 자료도 확인했다.

이에 공통 map deref 결함의 인과관계 검토는 PASS다. case 39의 세부 revision 흐름은 소스 추론이며 중간값 실측 trace는 없다는 제한을 유지한다. TABLE=10/10은 이제 원인 분류 완성도로 사용할 수 있으나 case 9 HOLD나 case 28/30 FAIL을 시험 PASS로 바꾸지 않는다. 목록 최종 재검수 및 조건부 GitHub 검수 푸시는 DB95-192-case12-39.md에 별도로 기록한다.
