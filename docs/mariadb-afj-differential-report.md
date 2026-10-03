# MariaDB/AFJ-DB Differential Report

- Date: 2026-10-03
- MariaDB: mariadbd  Ver 11.8.3-MariaDB-1build1 from Ubuntu for debian-linux-gnu on aarch64 (-- Please help get to 10k stars at https://github.com/MariaDB/Server)
- Corpus: mariadb-compatibility-expanded.sql
- Same input statement count: MariaDB=21, AFJ=21
- Runner execution: PASS
- Same input both databases: PASS
- Result comparison: PASS
- AFJ cases: PASS=21 UNSUPPORTED=0 FAIL=0
- Error code tests: RECORDED/PASS: engine constraint and FK/CHECK error contracts
- Isolation tests: RECORDED/PASS: COMMIT, ROLLBACK and SAVEPOINT contracts

## Explicit differences
- None

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
