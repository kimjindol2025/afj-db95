# P2 쿼리 연산 계약

- inner join은 양쪽 key가 같은 행을 병합한다.
- order-by는 지정 컬럼 오름차순을 반환한다.
- group-count는 컬럼별 행 수를 반환한다.
- 연산은 입력 행을 변경하지 않는다.

`engine.fls`에서 JOIN과 GROUP 실행까지 연결했고, 실제 runtime smoke를
통과했다. ORDER는 정렬 연산 기준선과 함께 유지한다.
