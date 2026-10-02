# MariaDB/AFJ-DB Differential Report

- Date: 2026-10-02
- MariaDB: mariadbd  Ver 11.8.3-MariaDB-1build1 from Ubuntu for debian-linux-gnu on aarch64 (-- Please help get to 10k stars at https://github.com/MariaDB/Server)
- Corpus: mariadb-compatibility-expanded.sql
- Same input statement count: MariaDB=21, AFJ=21
- Runner execution: PASS
- Same input both databases: PASS
- Result comparison: FAIL
- AFJ cases: PASS=12 UNSUPPORTED=0 FAIL=9
- Error code tests: RECORDED/PASS: engine constraint and FK/CHECK error contracts
- Isolation tests: RECORDED/PASS: COMMIT, ROLLBACK and SAVEPOINT contracts

## Explicit differences
{"type":"case","case":1,"sql":"DROP DATABASE IF EXISTS afj_expanded","status":"FAIL","response":{"ok":false,"error":"SQL_ERROR"}}
{"type":"case","case":2,"sql":"CREATE DATABASE afj_expanded","status":"FAIL","response":{"ok":false,"error":"SQL_ERROR"}}
{"type":"case","case":3,"sql":"USE afj_expanded","status":"FAIL","response":{"ok":false,"error":"SQL_ERROR"}}
{"type":"case","case":6,"sql":"INSERT INTO teams VALUES (1,'core'),(2,'ops')","status":"FAIL","response":{"ok":false,"error":"SQL_ERROR"}}
{"type":"case","case":7,"sql":"INSERT INTO users VALUES   (1,'Kim',1,TRUE,NULL),   (2,'Lee',2,TRUE,'lee@example.test'),   (3,'Park',1,FALSE,NULL)","status":"FAIL","response":{"ok":false,"error":"SQL_ERROR"}}
{"type":"case","case":13,"sql":"ALTER TABLE users ADD COLUMN phone VARCHAR(32)","status":"FAIL","response":{"ok":false,"error":"SQL_ERROR"}}
{"type":"case","case":14,"sql":"START TRANSACTION","status":"FAIL","response":{"ok":false,"error":"SQL_ERROR"}}
{"type":"case","case":16,"sql":"ROLLBACK","status":"FAIL","response":{"ok":false,"error":"SQL_ERROR"}}
{"type":"case","case":17,"sql":"SELECT id,active FROM users WHERE id=2","status":"FAIL","response":{"ok":false,"error":"SQL_ERROR"}}

## MariaDB normalized checkpoints
id	name
2	Lee
1	Kim
id	name	team_id	active	email
1	Kim	1	1	NULL
3	Park	1	0	NULL
id	name	team_id	active	email
2	Lee	2	1	lee@example.test
name	n
core	2
ops	1
remaining
3
id	active
2	1
remaining
2

## Triage: nine differences

재현 명령:

```text
bash tests/mariadb-afj-differential-runner.sh
```

이 명령은 매 실행마다 새 MariaDB 11.8.3 datadir를 만들고, AFJ TCP
`/tmp/afj-db95-tcp-catalog.wal`을 삭제한 뒤 같은 21개 문장을 순서대로
실행한다. 따라서 각 실행의 초기 상태는 MariaDB와 AFJ-DB 모두 빈 catalog다.

| case | 최소 SQL | MariaDB | AFJ-DB | 분류 | 원인 근거 |
|---:|---|---|---|---|---|
| 1 | `DROP DATABASE IF EXISTS afj_expanded` | PASS, DB 없음 | `SQL_ERROR`, 상태 변화 없음 | 파서 미지원 | `parse-drop`은 `DROP TABLE`만 허용 |
| 2 | `CREATE DATABASE afj_expanded` | PASS, DB 생성 | `SQL_ERROR`, DB catalog 없음 | 파서 미지원 | `parse-create`는 `CREATE TABLE`만 허용 |
| 3 | `USE afj_expanded` | PASS, 현재 DB 변경 | `SQL_ERROR`, 현재 DB 개념 없음 | 파서 미지원 | `parse-sql`에 `USE` 분기 없음 |
| 6 | `INSERT INTO teams VALUES (1,'core'),(2,'ops')` | PASS, teams 2행 | `SQL_ERROR`, teams 0행 | 파서 미지원 | `parse-insert`는 컬럼 목록이 있는 6-token 형태만 허용 |
| 7 | `INSERT INTO users VALUES (...)` | PASS, users 3행 | `SQL_ERROR`, users 0행 | 파서 미지원 | 컬럼 목록 없는 `INSERT` 형태를 허용하지 않음 |
| 13 | `ALTER TABLE users ADD COLUMN phone VARCHAR(32)` | PASS, phone 컬럼 추가 | `SQL_ERROR`, schema 미변경 | 파서 미지원 | `parse-alter`는 `ADD COLUMN <name>` 6-token 형태만 허용 |
| 14 | `START TRANSACTION` | PASS, transaction 시작 | `SQL_ERROR`, tx 상태 없음 | 프로토콜/파서 미지원 | SQL parser에는 transaction 문법이 없고 TCP에는 별도 `tx` endpoint만 있음 |
| 16 | `ROLLBACK` | PASS, 변경 취소 | `SQL_ERROR`, tx 상태 없음 | 프로토콜/파서 미지원 | `ROLLBACK`은 SQL parser가 아니라 TCP `tx` 요청의 `op`로만 제공됨 |
| 17 | `SELECT id,active FROM users WHERE id=2` | PASS, `id=2 active=1` | `SQL_ERROR`, 후속 행 조회 불가 | 파서 미지원 | 기본 SELECT parser는 `*` projection만 허용하며 명시적 projection 분기가 없음 |

### Case 17 상태 영향

Case 17의 오류는 case 14/16의 transaction 상태가 남아서 생긴 것으로
보이지 않는다. 전체 runner의 동일 초기 상태 결과와 `parse-select`의
projection 분기 소스를 함께 확인하면
`SELECT id,active FROM users WHERE id=2`는 기본 parser 경로에서
`SQL_ERROR`가 난다. 따라서 상태 불일치가 아니라 parser 미지원으로
확정한다.

### Triage conclusion

- `NINE_DIFFERENCES_REPRODUCED=PASS`
- `SAME_INITIAL_STATE=PASS`
- `DATABASE_RESULTS_CAPTURED=PASS`
- `DIFFERENCE_CLASSIFICATION=PASS`
- `ROOT_CAUSE=CONFIRMED` for all nine cases
- `runner normalization error`: 없음. AFJ 응답은 원문 `SQL_ERROR`이며,
  runner는 이를 숨기거나 `UNSUPPORTED`로 변환하지 않았다.
- 분류별 건수: 파서 미지원 7건, 프로토콜/파서 미지원 2건, 실행기 미지원 0건,
  의미/상태 불일치 0건, runner 정규화 오류 0건, 원인 미확정 0건.
- `CODE_CHANGE=NO`: 이 triage 단계에서는 구현 파일을 수정하지 않았다.
