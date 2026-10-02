# MariaDB 호환성 점수 계약

`src/compatibility.fls`의 feature matrix만을 공식 점수의 입력으로 사용한다.

- 통과 표시는 실제 런타임 테스트가 있는 기능만 `passed=true`다.
- 가중치 합계는 100이다.
- 공식 1.0 목표는 weighted score 95 이상이다.
- 현재 미통과 항목도 숨기지 않고 matrix에 표시한다.
- matrix 100%는 이 저장소의 정의된 회귀 범위 통과를 뜻하며, 외부
  MariaDB 호환성 전체를 자동으로 증명하지 않는다.

현재 matrix에 포함된 B+Tree, fsync/원자성, deadlock 탐지, MariaDB 회귀
스위트는 모두 실행 증거가 있다. 다만 이 내부 점수는 전체 MariaDB 제품
호환성의 증명이 아니며, 외부 corpus의 자동 양방향 비교는 별도 게이트다.
