# MariaDB 회귀 계약

회귀 스위트는 지원 SQL의 AST type과 오류 없는 parse 결과를 실제 FreeLang
런타임에서 재검증한다. `mariadb-compatibility.sql`과
`mariadb-compatibility-expanded.sql`은 같은 의미의 외부 MariaDB corpus다.
모든 parser case와 외부 SQL 실행이 통과해야 compatibility matrix에서
MariaDB regression 항목을 `passed=true`로 유지한다.

`mariadb-afj-differential-runner.sh`는 같은 확장 SQL 파일을 MariaDB와
AFJ-DB TCP 경로에 각각 실행하고, 결과 checkpoint와 케이스별
`PASS`/`FAIL`/`UNSUPPORTED`를 `docs/mariadb-afj-differential-report.md`에
기록한다.
