# afj-db95 로드맵

## M0 — 메모리 관계형 코어

카탈로그, 테이블, CRUD, 조건 조회.

## M1 — 저장 엔진 (진행 중)

논리 WAL 이벤트와 재생, JSON Lines 파일 append/read 기준선을 구현했다.
페이지 헤더·길이·SHA-256과 파일 닫기 후 재오픈 복구 smoke test도 통과했다.
4096-byte page limit과 손상 WAL 차단(`WAL_CORRUPT`)도 통과했다.
`durable-store.fls`에서 fd_fsync prepare/commit, row 적용, torn prepare
제외 재복구까지 통합 검증했다.
다음 작업은 대규모 장애 주입과 외부 호환성 corpus다.
마지막 torn WAL tail 무시는 구현했고, 중간 WAL 손상 거부까지 fault
injection 계약으로 검증했다.

## M2 — SQL

토큰화, CREATE/INSERT/SELECT/UPDATE/DELETE, 표현식, JOIN.

## M3 — 트랜잭션

BEGIN/COMMIT/ROLLBACK, 잠금, MVCC, 격리 수준.

## M4 — 서버·호환성

TCP 프로토콜, 인증, 사용자 권한, 백업·복구, 호환성 회귀 테스트.

95% 목표의 판정은 기능 목록과 MariaDB 호환성 테스트 통과율로 별도 측정한다.
