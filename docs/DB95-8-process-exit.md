# DB95-8 본줄기 병합·process_exit

접수번호: RUN-20261102-06. DB95 창. 경로·주소·키·인증정보: <가림>.

## 출발점과 병합 후보

시작 FX feat/db95-native-peer HEAD: 985824f4b60a3131e33a94ef0bab6a253b0d8fe5
시작 afj-db95 native-run HEAD: 5e77c7237eb55f97c360ebe85f000d3191113e43
두 HEAD가 지시값과 일치하고 양쪽 작업 트리가 CLEAN임을 확인했다.

E09·E10·J-1이 포함된 본줄기 후보는 feat/blog-platform-completion이다.
Forgejo·GitHub에서 조회·fetch한 최신 HEAD는 모두 02176817d44f4d998a3f0b8ac04cec4373e04a7f.
E09 8bd0d3d5d8bd93b991aca2c081f229e35dae9271,
E10 7379dd85c5960893becb9eecfbb67ee77dda0990,
J-1 39b9bbcfef60911b43a20638b8f8dd7c24d953f7을 포함하는지 ancestry를 확인했다.
현재 master의 1d217f53a8aade8a288c0dcad0a1ba23b610f102는 이 기능들을 포함한 본줄기 후보가 아니다.

병합 전에 git merge-tree --write-tree --name-only로 검사했다.
실제 merge·rebase·reset은 하지 않았다. MERGE_HEAD 없음, MERGE_STARTED=0.
사전 검사 종료 1, 충돌 파일 3개:

- runtime/http.c
- runtime/runtime.h
- scripts/verify-native-bootstrap.sh

부모·base·충돌 목록 원문은 merge-preflight.txt. 원래 preview 로그는 비공개로 보존하고 해시를 기록했다.
단순 텍스트 충돌 외에 아래 공개 API 약속 충돌을 확인해 실제 병합 전에 멈췄다.

## 양쪽 기능·고정 정답의 충돌

같은 두 probe를 각 브랜치의 native compiler와 해당 브랜치 runtime으로 빌드·실행했다.
무거운 실행 전 ps를 기록하고 공통 flock 아래 실행했다. JS·TS·Python이나 node 러너를 사용하지 않았다.
원문은 regex-contract-proof.txt.

```text
BRANCH=peer PROBE=regex-order EXIT=0
PATTERN_FIRST=true
TEXT_FIRST=false
BRANCH=peer PROBE=regex-type EXIT=1
Uncaught error: regex_match_i: string arguments required
BRANCH=mainline PROBE=regex-order EXIT=0
PATTERN_FIRST=false
TEXT_FIRST=true
BRANCH=mainline PROBE=regex-type EXIT=0
NIL_MATCH=true
```

첫 probe의 두 식은 각각 (regex_match "^A+$" "AAA")와 (regex_match "AAA" "^A+$")다.
DB95 가지는 기존 native pattern-first, 본줄기는 v11 text-first로 해석한다.
동일한 함수 이름과 두 문자열 인자만으로 두 약속을 동시에 선택할 수 없다.
둘째 probe의 식은 (regex_match_i nil ".*")다. DB95-7의 native 계약은 문자열 외 인자 오류,
본줄기의 v11 계약은 자동 문자열 변환이므로 결과가 다르다.

DB95-7 고정 시험은 native pattern-first 결과와 문자열 인자 오류를 검사한다.
본줄기 phase3 정규식 시험은 v11 text-first와 자체 정규식 VM 동작을 검사한다.
기대값을 바꾸거나 한쪽 분기를 덮어서 양쪽 통과로 보고하지 않았다.

본줄기에는 기존 native kebab-case API와 v11 underscore API를 구분하는 경로가 있다.
구체적인 제안은 본줄기의 regex_match·regex_match_i를 유지하고,
DB95-7의 레거시 검사 호출을 기존 regex-match·regex-match-i 이름으로 옮기는 것이다.
기대값·문턱값은 유지하되, 고정 검사에서 가리키는 API 이름의 이관이므로 사용자 판단을 요청했다.
승인 전에는 검사 호출·기대값·컴파일러 바인딩을 수정하지 않는다.

이는 지시서 1의 “충돌은 양쪽 기능을 모두 살리는 쪽으로 푼다. 판단이 어려우면 멈추고 보고한다”에 따른 중단이다.
정답값 변경이나 검사 끄기를 요청하는 것이 아니며, 공개 API 이름·버전 구분 결정을 기다린다.

## process_exit와 언어 성과 칸

본줄기의 v11-compat.h에는 process-exit 구현이 이미 있다.
underscore process_exit는 builtin 이름 정규화로 같은 handler에 연결된다.
현재 handler는 정수 종료 코드를 검사하고 fl_schedule_shutdown 뒤 C exit를 호출한다.
따라서 본줄기 병합 후 고정 시험으로 실제 종료 코드·출력 flush·정리 작업을 확인한 뒤
부족한 동작만 수정해야 한다. 기존 구현을 새 성과로 중복 보고하지 않는다.

**이번에 언어에서 새로 생기거나 고쳐진 것: 아직 없음.**
실제 병합을 보류했으므로 process_exit 정답 선커밋·구현, 71건 재실행,
E09·E10·J-1·DB95-6/7 병합 후 회귀, native 회귀·옛 러너·격리 bootstrap은 아직 미실행이다.
이전 실행의 통과 수나 해시를 이번 병합 결과로 복사하지 않았다.

단계 기준은 메모리 관계형 코어 검증이며, 영속성·트랜잭션·네트워크 제품 완성이나 DB95 출시 완료를 주장하지 않는다.
23·25 서버 및 금지 제품에는 명령·시험을 실행하지 않았고 seed·JS 러너·기대값·임계값을 변경하지 않았다.

## 판정

| 항목 | 현재 판정 |
|---|---|
| 1 본줄기 병합·E09·E10·J-1 | 미완료: 충돌 목록·계약 재현 후 API 이관 결정 대기 |
| 2 process_exit 선커밋·구현 | 미실행: 병합 이전 |
| 3 71건 재실행 | 미실행 |
| 4 회귀·bootstrap | 미실행 |
| 5 푸시·원격 일치·CLEAN | 미실행: 원격 변경 없음 |

보고서·사전 진단 증거만 보존한다. 원본 로그·ps·probe 해시는 raw-sha256.txt에 기록했다.

DB95_SUMMARY=0/5
