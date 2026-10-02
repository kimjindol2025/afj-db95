# MariaDB 회귀 계약

회귀 스위트는 지원 SQL의 AST type과 오류 없는 parse 결과를 실제 FreeLang
런타임에서 재검증한다. 모든 case가 통과해야 compatibility matrix에서
MariaDB regression 항목을 `passed=true`로 유지한다.
