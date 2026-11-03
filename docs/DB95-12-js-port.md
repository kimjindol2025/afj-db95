# DB95-12 남은 JS 원본 이식

접수번호: RUN-20261103-13

## 시작 기준

- freelang-v11-fx `feat/db95-native-peer`: `b8fdb29b94eec109db245172237c2d5a55e4c001`
- afj-db95 `native-run` DB95-11 보고서 커밋: `8d77ce2e30b19dba9b18b1538ac87cb543fe0df2`
- DB95-11에 기록된 gate 기준: `NATIVE_GATE_PASS=34 FAIL=37 TOTAL=71`
- DB95-11의 Stage2 고정점: `6a0d4e384a18834d4f0cb03c10460aade5bf05f999f5db981dd5dc275d313e7d`

## JS 미이식 목록

기존 gate 로그의 `NATIVE_JS_SOURCE_NOT_PORTED` case를 기준으로 정리했다. 각 파일이 gate에서 사용되는 시험은 1건이다.

| Gate case | 시험 | 원본 파일 | 줄 수 |
|---:|---|---|---:|
| 24 | TCP concurrency | `tests/tcp-concurrency-smoke.js` | 143 |
| 25 | TCP 5m performance envelope | `tests/tcp-long-soak.js` | 43 |
| 35 | TCP transaction forced-kill recovery | `tests/tcp-transaction-kill-recovery.js` | 141 |
| 56 | runtime peer IP rate limit | `tests/ip-rate-limit-runtime.js` | 114 |
| 60 | native TLS listener | `tests/native-tls-smoke.js` | 95 |
| 61 | native TLS mTLS/reload | `tests/native-tls-policy-smoke.js` | 102 |
| 62 | production native TLS integration | `tests/production-native-tls.js` | 104 |
| 63 | TLS adapter handshake/reload | `tests/tls-proxy-smoke.js` | 213 |
| 64 | MariaDB wire packet unit | `tests/mariadb-wire-unit.js` | 80 |
| 66 | MariaDB wire prepared | `tests/mariadb-wire-prepared.js` | 157 |
| 67 | MariaDB standard-client smoke | `tests/mariadb-wire-smoke.js` | 149 |
| 68 | native MariaDB wire | `tests/native-mariadb-smoke.js` | 98 |
| 69 | native MariaDB auth rejection | `tests/native-mariadb-auth.js` | 126 |
| 71 | native MariaDB prepared | `tests/native-mariadb-prepared.js` | 157 |

`NATIVE_JS_SOURCE_NOT_PORTED` 총합은 14건이다. 기존 37건 FAIL 가운데 이 묶음은 14건이다. DB95-11에서 `unsupported-literal`로 잘못 분류됐던 11건은 이 목록 중 case 35, 56, 60, 61, 62, 63, 64, 67, 68, 69, 71이며 JS 미이식으로 분류한다. 이는 각 원본을 FreeLang으로 번역한 결과가 아니므로 `missing-runner:node`로 분류하지 않는다.

## 이식 조사 및 상태

각 gate 시험은 별도 원본 하나를 직접 참조한다. 원본 JS를 유지하면서 case를 `.fl`로 전환하려면 시험 의미를 보존하는 FreeLang 대체 시험을 먼저 작성해야 한다. 확인한 대표 원본들은 daemon을 시작해 TCP 클라이언트 여러 개를 연결하거나, `mariadb` 클라이언트를 자식 프로세스로 실행하거나, TLS 인증서를 생성하고 재시작/리로드를 검증한다. 기존 `mariadb-wire-codec.fls`는 패킷 codec 단위 시험이며 `mariadb-wire-unit.js`의 서버 handshake와 실제 MariaDB 클라이언트 왕복을 대체하지 않는다. 따라서 이를 case에 연결해 동등한 통과로 취급하지 않았다.

이번 실행에서 `.js` 원본은 삭제·수정하지 않았고 native gate의 시험 매핑도 바꾸지 않았다. 의미가 보존되는 `.fl` 포트가 아직 만들어지지 않아 이식 파일 및 관련 시험의 통과 수는 0이다. JS 러너 수정이나 Node 실행도 없었다. 전체 gate는 재실행하지 않았으며, 이에 따라 새 통과 수와 첫 오류 표, 회귀/raw_tcp/보호 묶음 결과, 고정점 재확인 및 푸시는 미완료다.

## 다음 후보

동일하게 1 gate case씩 연결된 목록에서 실제 port 난이도와 의존 API를 비교한 뒤 다음 대상을 선정한다. 우선 검토 가능한 TCP 후보는 case 24 `tcp-concurrency-smoke.js`(143줄)이며, 서버 기동/포트 선정/여러 클라이언트 동작을 FreeLang 시험이 같은 범위로 검증할 수 있는지부터 확인해야 한다.

언어 성과: 없음. DB95 gate에서 확인된 이번 묶음의 문제는 14개 시험 원본이 아직 FreeLang `.fl`로 이식되지 않아 native gate가 실행하지 못한다는 점이다.

DB95_SUMMARY=1/5
