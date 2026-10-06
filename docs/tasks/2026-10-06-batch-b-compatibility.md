# 2026-10-06 묶음 B — SQL/MariaDB 호환성 계약

상위 기준: [`../commercial-readiness-matrix.md`](../commercial-readiness-matrix.md)

## 목표

“MariaDB 호환”이라는 포괄 문구를 실제 지원 계약으로 바꾼다. 지원한다고
문서에 적힌 것은 parser·executor·TCP/wire·오류 응답까지 같은 범위에서
검증되어야 하며, 미지원 기능은 안정적인 거부로 분류한다.

## 현재 baseline

- 전체 release gate: 69 PASS / 0 FAIL (COLLATE 변경 전 baseline)
- 준비된 SQL corpus: 내부·외부 대응 케이스는 PASS
- 내부 가중 compatibility scorecard: 88% (전체 제품 완료 지표로 유지)
- native MariaDB: COM_QUERY, prepared, INT/NULL/string/multi-parameter,
  mysql_native_password 범위 PASS
- 미지원 계약 표적 테스트는 `tests/mariadb-unsupported-contract.fls`로 관리한다.
- 무컬럼 다중행 BOOLEAN INSERT와 그 뒤의 MVCC/WAL 복구 경로는
  `tests/mariadb-remediation-regression.fls`에서 검증한다.

## 현재 지원 계약 초안

| 범위 | 상태 | 비고 |
|---|---:|---|
| CRUD, WHERE, ORDER/GROUP, JOIN/COUNT | PASS(검증 범위) | 준비된 corpus 기준 |
| PK/UNIQUE/FK/NOT NULL/CHECK | PASS(검증 범위) | 지원 타입은 INTEGER/TEXT/BOOLEAN 중심 |
| COMMIT/ROLLBACK/SAVEPOINT | PASS(검증 범위) | TCP/엔진 회귀 포함 |
| prepared statement | PASS(검증 범위) | JSON adapter와 MariaDB wire 별도 검증 |
| MariaDB wire handshake/query/prepared | PASS(검증 범위) | 표준 client smoke 포함 |
| wire charset | PASS(UTF-8 범위) | charset ID 33/45만 협상, 그 외 `CHARSET_NOT_SUPPORTED`로 거부 |
| mysql_native_password | PASS | 다른 auth plugin은 미지원 범위 |
| COLLATE 실행 지원 | PASS(제한 범위) | `utf8mb4_bin`, `utf8mb4_general_ci`, `utf8_general_ci`; 기타는 `COLLATION_NOT_SUPPORTED` |
| charset/collation 전체 호환 | BLOCKED | 언어별 collation 규칙과 전체 MariaDB 동치 미완료 |
| USE/다중 database 전체 호환 | PASS(검증 범위) | `tests/tcp-database-scope.fls`: 세션별 선택·동일 테이블명 격리·실패 USE 보존·DROP eviction |
| CREATE DATABASE 실행 계약 | PASS(검증 범위) | namespace 충돌 검사 수정 후 실행 계약 회귀 통과 |
| AFJ 내부 오류 토큰 매핑 | PASS(검증 범위) | `tests/error-mapping.fls`: 제약·DB·트랜잭션·락 오류 토큰 보존 |
| 전체 MariaDB 오류코드 동치 | BLOCKED | 현재는 AFJ 오류 계약 중심 |
| 서브쿼리/HAVING/CASE/UNION/날짜 함수 | BLOCKED | 지원 목록과 differential corpus 부족 |

## 종료 조건

```text
지원 SQL/자료형/오류코드/prepared/auth/charset 목록 승인
미지원 입력의 오류 코드와 메시지 계약 고정
지원 목록의 내부·TCP·MariaDB differential 회귀 PASS
문서에 없는 기능을 호환성 점수에 포함하지 않음

## B 종료 판정

- **PASS(제한 프로파일)**: 71-case release gate 71 PASS / 0 FAIL.
- `COLLATE` 제한 계약과 `UNSUPPORTED_SQL` 오류 매핑 targeted test PASS.
- 전체 MariaDB 수치 오류코드 동치와 미지원 SQL 확장은 1차 상용 프로파일
  밖으로 명시했으며, 다음 프로파일의 별도 범위다.
```

## 진행 순서

1. parser/engine/wire가 실제로 지원하는 항목을 자동 목록화한다.
2. 준비된 corpus와 MariaDB 결과를 같은 입력·출력 표로 정규화한다.
3. 지원하지 않는 대표 문법을 `unsupported` 오류 계약으로 고정한다.
4. charset/collation/auth plugin의 지원 경계를 결정한다. USE/다중 database 세션 범위는 검증 범위 내에서 고정했다.
5. B 전체 gate를 재실행하고 문서·scorecard·README의 숫자를 일치시킨다.

B가 끝난 뒤에도 “MariaDB 호환”은 위 제한 프로파일의 의미로만 사용한다.
