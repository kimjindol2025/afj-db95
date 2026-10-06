# FreeLang 네이티브 DB 언어 통합 계획

상태: 목표 기준선 (2026-10-07)

## 목적

FreeLang v11·FX·FreeLangScript에서 DB를 별도 서버에 먼저 연결하는 대신,
언어 호출 부호 하나로 로컬 네이티브 DB를 열고 사용할 수 있게 한다.
이 문서는 문법, 런타임 소유권, 권한 경계, 단계별 검수의 단일 기준이다.

## 목표 사용 형태

```lisp
;; 기본: 프로젝트 로컬 네이티브 DB를 자동 연결
(define users (db "app"))
(db-exec users "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)")
(db-exec-p users "INSERT INTO users (id, name) VALUES (?, ?)" (list 1 "Kim"))
(db-query-p users "SELECT * FROM users WHERE id = ?" (list 1))
```

초기 구현에서는 `db`를 새로운 SQL 문법 전체로 만들지 않고,
기존 FreeLang 표현식 안에서 DB 핸들을 반환하는 특수 호출로 정의한다.
따라서 SQL 파서와 언어 파서를 한 번에 섞지 않는다.

`@db`는 현재 채택하지 않는다. FreeLang에서 `@이름`은 이미 atom 역참조
문법이므로, `@db("app")`를 추가하면 기존 프로그램의 의미를 깨뜨릴 수
있다. 호출 부호가 꼭 필요하다는 요구는 유지하되, 1차 정식 문법은 기존
호출 체계와 충돌하지 않는 `(db "app")`로 고정한다. 별도 단축 표기는
역참조 호환성 테스트를 통과한 뒤에만 추가한다.

## 의미 계약

| 항목 | 계약 |
|---|---|
| DB 이름 | 프로젝트 설정 기준의 논리 이름이며 경로 문자열 자체가 아님 |
| 기본 저장소 | 실행 프로젝트 아래의 네이티브 DB 디렉터리 |
| 자동 연결 | 첫 `(db "name")` 평가 때만 열고 동일 이름은 런타임 세션에서 재사용 |
| 종료 | 프로그램 종료/런타임 정리 시 flush·close |
| 기본 엔진 | FX 네이티브 DB provider; AFJ-DB95는 호환·회귀 기준선 |
| 원격 연결 | 자동 연결하지 않음. 별도 provider와 명시 권한이 필요 |
| 권한 | DB capability가 없으면 `DB_PERMISSION_DENIED` |
| 오류 | 언어 공통 구조 오류로 반환하며 SQLite/MariaDB 원문에 의존하지 않음 |

## 소유권과 라우팅

```text
.fl  → FreeLang v11/FX parser·evaluator·native runtime
.fls → v11 evaluator를 통해 같은 DB builtin을 사용
afj-db95 → SQL/트랜잭션/WAL/복구/호환성의 검증 기준선
```

`db`의 문법·평가 의미는 v11/FX가 소유한다. Script profile에만 별도
문법이나 JS 우회 구현을 추가하지 않는다. 현재 FX에 있는
`sqlite_open`·`fxb_sqlite_*`는 native provider 구현의 출발점이지만,
자동 연결 계약 그 자체는 아니다.

## 단계별 완료 조건

### 1. 계약 고정

- `(db "name")` 호출이 lexer/parser에서 안정적으로 식별된다.
- 이름 누락·빈 이름·잘못된 타입이 결정적 오류가 된다.
- 기본 경로와 원격 금지 정책이 문서와 테스트에 고정된다.

### 2. 인터프리터 경로

- v11 evaluator가 `db`를 native provider에 전달한다.
- 동일 이름의 반복 호출이 동일 핸들을 재사용한다.
- CREATE/INSERT/SELECT/parameter binding/close가 실제 실행된다.

### 3. FX 네이티브 경로

- FX C runtime이 같은 의미와 오류 코드를 제공한다.
- ELF 실행 파일에서 WAL·복구·동시 접근의 최소 회귀가 통과한다.
- 인터프리터와 native 결과의 차이가 계약 표에 기록된다.

### 4. Script profile

- `.fls`에서 별도 adapter builtin 없이 같은 `(db "name")` 호출이 동작한다.
- DB capability가 없는 실행은 실제로 거부된다.
- 기존 사용자 변경사항을 덮어쓰지 않고 profile 회귀를 통과한다.

### 5. 검수·릴리스 경계

- smoke → lint/check → edge → regression → native integration →
  적대적 리뷰 순서로 실제 실행한다.
- local native DB PASS와 상용/원격 운영 PASS를 분리한다.
- 모든 결과와 남은 BLOCKED를 문서화한다.

## 금지하는 자동화

- `db`가 몰래 외부 네트워크나 MariaDB에 접속하지 않는다.
- DB 권한을 우회하기 위해 Script의 파일/네트워크 권한을 넓히지 않는다.
- 현재 AFJ-DB95의 TCP 서버를 언어 builtin으로 포장하고 네이티브 DB라고
  보고하지 않는다.
- 통합 전 기존 `sqlite_*` API를 삭제하지 않는다. 호환 기간 동안 명시 API와
  자동 연결 API의 결과를 비교한다.

## 현재 상태

- 설계: 이 문서로 기준선 생성
- 기존 네이티브 SQLite provider: 존재
- `(db "name")` 문법: FX native + v11 interpreter + Script 수직 슬라이스 구현
- `@db` 표기: 기존 atom 역참조와 충돌하므로 보류
- 자동 연결: local native/host provider 1차 구현
- 문장 배열 트랜잭션: FX native + v11 interpreter + Script host에서 COMMIT/ROLLBACK 검증
- Script capability 통합: `--allow-db[=name,...]` 구현 및 실제 거부/허용 검증
- 검수: 기존 AFJ-DB95 릴리스 게이트는 DB 엔진 자체의 증거이며,
  `db` 통합의 증거로 간주하지 않음

다음 구현 단위는 FX self-host/compiler 정본 mapping, transaction/WAL 회귀,
전체 FreeLangScript conformance를 통과시키는 것이다.
