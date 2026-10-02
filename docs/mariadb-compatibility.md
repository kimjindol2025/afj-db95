# MariaDB 외부 호환성 검증

## 환경 확인

- `mariadb` client: 11.8.3 설치됨
- `mariadbd`: 11.8.3 설치됨
- 기본 socket `/run/mysqld/mysqld.sock`: 서버 미실행
- `/root/mariadb_data`: 기존 datadir이며 작업 지침상 직접 기동·변경하지 않음

## 현재 증거

내부 FreeLang 회귀 스위트는 9/9 통과했고, 내부 가중 compatibility matrix는
100%다. 이는 프로젝트가 정의한 회귀 범위의 결과다.

추가로 저장소의 [`tests/mariadb-compatibility.sql`](../tests/mariadb-compatibility.sql)을
기준으로 `/tmp/afj-db95-mariadb-test`에 MariaDB 11.8.3 임시 인스턴스를
기동하여 외부 SQL corpus를 실행했다.

- `CREATE DATABASE`, 두 테이블과 PK/UNIQUE/FK/NOT NULL
- `ALTER TABLE ... ADD COLUMN`, `DROP TABLE`
- 다중 행 `INSERT`
- `WHERE` + `ORDER BY`
- `IS NULL` / `IS NOT NULL`
- `LEFT JOIN` + `GROUP BY` + `COUNT`
- `START TRANSACTION` + `UPDATE` + `ROLLBACK`
- `UPDATE` + `DELETE` + `COUNT`

FreeLang 실행기에서도 동일한 핵심 집계 조합을 직접 검증한다. `engine.fls`는
별칭을 포함한 `LEFT JOIN`, `GROUP BY t.id,t.name`, `COUNT(u.id)`에서
`core=2`, `ops=1`을 확인하고, 별도 `COUNT(*)`에서 `remaining=3`을 확인한다.

P5 서버 기준선도 `tcp-server.fls`와 독립 프로세스 harness에서 검증한다.
로그인 token, CREATE/INSERT/SELECT, 잘못된 token의 `AUTH_REQUIRED` 응답이
실제 TCP 연결을 통해 통과한다.

관찰 결과는 각각 `Lee/Kim`, `core=2/ops=1`, rollback 후 `id=1 active=1`,
최종 `remaining=2`로 정상 동작했다. 이 corpus는 FreeLang 내부 회귀의
대응 케이스와 의미가 일치했지만, 전체 MariaDB 호환성의 증명은 아니다.

## 남은 외부 게이트

남은 게이트는 오류 코드/프로토콜 호환성, 격리 수준·동시성, 인덱스 계획,
DDL/권한/백업 및 더 큰 SQL corpus의 자동화된 양방향 비교다. 따라서 이번
수동 corpus 통과만으로 외부 MariaDB 호환성을 완료로 판정하지 않는다.
