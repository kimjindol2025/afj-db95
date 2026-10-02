# Codex 작업 기록

## 공식 목표

FreeLang Script만으로 FreeLang 공식 DB를 만들고, MariaDB 주요 기능의
호환성 95%를 테스트로 증명한다.

상세한 완료 기준은 `docs/official-db-plan.md`를 따른다.

## 현재 마일스톤

P0: 계약과 기준선.
P1: 페이지 저장소·WAL·재시작 복구.
P2: SQL 코어.
P3: 인덱스·옵티마이저.
P4: 트랜잭션·MVCC.
P5: 서버·인증·권한.
P6: 운영 도구.
P7: 공식 1.0 릴리스.

## 다음 마일스톤

M1: 파일 페이지 포맷과 append-only WAL.
M2: SELECT 파서와 조건식 실행기.
M3: 트랜잭션·잠금·MVCC.

커밋과 push는 사용자 명시 요청 전까지 수행하지 않는다.
