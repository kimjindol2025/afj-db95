# DB95 191 Coding 구현명세서

## 행 버전

src/tcp-server.fls의 afj-tcp-record-table-row-versions에서 current는 afj-tcp-row-map이 반환한 map이다. 삭제 여부 조회, 키 순회, 행 조회의 (deref current) 3곳을 current로 바꾼다. atom인 afj-tcp-row-versions 및 다른 deref는 유지한다. 런타임 deref의 의미를 바꾸지 않는다.

기존 시험 38/41/42의 종료 코드 0 및 PASS 마커가 필요하다. 별도 검증은 checkpoint 생성 프로세스와 복원 프로세스를 분리하고 revision 2의 값 10, revision 3의 값 20, schema revision 1, 두 버전의 생성·삭제 revision을 검증한다. 런타임 재시작 이후 복원을 확인하되 내구성 전체를 입증하는 것으로 확대하지 않는다.

## repeat

FX runtime/aliases.c의 fl_repeat에서 FL_INT 경로와 vector builder를 유지한다. FL_FLOAT는 유한하고 소수부가 없으며 int64 범위 내일 때만 int64_t로 변환한다. 0·음수는 기존 정수와 같이 빈 벡터다. 소수부가 있는 값, NaN, 무한대, int64 범위 밖 값은 변환 전에 명시적 오류를 발생시킨다. 기존 비숫자 입력 동작은 범위 밖으로 유지한다.

새 회귀 시험은 산술식 (+ 1048576 1), padding 길이와 양 끝 문자, 산술식 (+ 1 2)·(+ 0 0)·(- 0 1)로 만든 FL_FLOAT 횟수, 분수·범위 밖·NaN·무한대 오류를 확인한다. 실수 표기 리터럴은 FL_INT로 내려갈 수 있으므로 이 경계 검증에 사용하지 않는다. 기존 db95-26-repeat 시험의 2MiB 입력과 정수 경계도 재실행한다. case 7/13은 원본 그대로 실행한다.

기존 Stage4 실행 파일을 사용한다. 컴파일러 소스와 실행 파일을 교체하지 않으며 Stage0와 seed를 사용하지 않는다. 기존 Stage2·3·4 생성 C 해시의 동일성은 보존 여부만 확인하고 수정 런타임의 새 bootstrap 검증으로 표현하지 않는다.
