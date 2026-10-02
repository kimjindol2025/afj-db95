# MariaDB 호환성 측정 보고서

측정일: 2026-10-02  
기준 DB: MariaDB 11.8.3  
대상: AFJ-DB95 FreeLang Script 관계형 코어

## 실행 결과

| 항목 | 결과 |
|---|---:|
| 기존 FreeLang MariaDB parser 회귀 | 19/19 PASS |
| 확장 FreeLang parser corpus | 28/28 PASS |
| 기본 외부 MariaDB SQL corpus | 실행 PASS |
| 확장 외부 MariaDB SQL corpus | 실행 PASS |
| 확장 corpus 출력 확인 | SELECT, NULL, LEFT JOIN/GROUP, rollback, UPDATE/DELETE 통과 |

확장 corpus는 CREATE TABLE, PRIMARY KEY, UNIQUE, FOREIGN KEY, CHECK,
다중 행 INSERT, `WHERE active=TRUE`, `IS NULL`, `IS NOT NULL`,
`LEFT JOIN`/`GROUP BY`/`COUNT`, `ALTER TABLE`, transaction rollback,
UPDATE, DELETE를 포함한다.

## 판정 범위

현재 측정값은 준비된 corpus 기준으로는 28/28이며, 이 corpus 안에서는
100%다. 이것을 MariaDB 전체 호환성 95%로 해석하지 않는다.

95% 공식 판정에는 서브쿼리, `HAVING`, `CASE`, 타입 변환·날짜 함수,
UNION, 오류 코드 일치, 격리 수준별 동시성, prepared statement, TLS,
백업·복구·migration 및 대규모 외부 corpus가 추가로 필요하다.
