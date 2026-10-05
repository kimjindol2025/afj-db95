# AFJ-DB95 릴리스 게이트 회복 태스크

- 작성일: 2026-10-05 (KST)
- 기준 커밋: `59450700f72263e37136c0f9d8de98e32fe33381`
- GitHub 이슈: [#1 P0 복합 키 정확성 및 릴리스 게이트 회복](https://github.com/kimjindol2025/afj-db95/issues/1)
- 상태: 진행 중
- 우선순위: P0 정확성 → P0 재현성 → P0 성능 게이트 → P1 회귀/복구

## 배경

최근 composite page-range predicate 재검사 수정이 반영됐지만, 최신 릴리스 리포트는
`55 PASS, 1 FAIL`이며 상태가 `BLOCKED`다. 또한 복합 인덱스 키를 문자열 구분자로
합치는 구현은 값 자체에 `|`가 포함되는 경우 충돌할 수 있고, 숫자와 문자열의 타입
구분도 잃는다.

근거:

- `docs/release-gate-report.md`: 자동 검수 55 PASS / 1 FAIL, TCP 5m performance envelope 실패
- `src/engine.fls`: `engine-composite-key-token`이 `|` 구분자 문자열을 생성
- `tests/release-gate.sh`: 런타임 경로가 특정 `/root/...` 절대경로에 고정됨

## 작업 항목

### P0-1 복합 키 인코딩 정확성

- [x] JSON 배열 기반 타입 안전 토큰 인코더 구현
- [x] `a|b,c`와 `a,b|c` 충돌 회귀 테스트 추가
- [x] `1`과 `"1"` 구분 테스트 추가
- [x] B-tree 복합 범위 파트 디코더를 새 토큰 형식에 맞춤

완료 조건: 동일 토큰 오인으로 잘못된 행을 반환하거나 unique 충돌을 일으키는
재현 테스트가 실제 FreeLang 런타임에서 통과한다. 현재 targeted check와
`compound-index.fls`, `compound-range.fls`가 실제 AFJ 런타임에서 통과했다.

### P0-2 실행 경로 재현성

- [ ] `.fl`/`.fls` 테스트의 저장소 절대 `load` 경로 제거 — clean runtime HEAD의
  파일 기준 `load` 해석과 현재 runtime의 해석이 달라 단순 상대경로 치환을 되돌림;
  runner/runtime 계약 재설계 필요
- [x] JS/셸 검수기의 하드코딩된 bootstrap 경로 제거
- [x] 저장소 루트 기준 경로와 `AFJ_BOOTSTRAP`/`FREELANG_AFJ_ROOT` 지원
- [ ] 새 clone에서 preflight가 실패 원인을 명시하도록 보강

완료 조건: 저장소 위치가 달라도 문서화된 명령으로 동일 검수를 시작할 수 있다.
JS/셸 검수기의 bootstrap 경로는 환경변수 기반으로 바꿨지만, FreeLang 소스의
`load` 경로는 runtime 후보 간 의미 차이 때문에 아직 미완료다.

### P0-3 릴리스 게이트 회복

- [ ] `TCP 5m performance envelope` 실패 원인 재현
- [ ] 원인 수정 후 전체 `tests/release-gate.sh` 재실행
- [ ] 자동 실패 0건인지 확인하고 건축적 blocker는 별도로 기록

완료 조건: 자동 검수와 구조적 미완료 항목을 섞지 않고 보고한다.

### P1 복구·회귀 범위

- [ ] backup/restore soak
- [ ] WAL torn-write 및 복구
- [ ] row-version checkpoint/snapshot/index recovery
- [ ] CI에서 check → targeted test → full gate를 직렬 실행

## 검수 방식

1. 스모크: 최소 `.fls`/엔진 실행
2. 체크: 저장소 제공 syntax/type 검사
3. 엣지: 복합 키 충돌 입력 5개 이상
4. 회귀: compound index/range + 전체 release gate
5. 실제 연동: TCP 경로와 성능 envelope
6. CI 유사: `tests/release-gate.sh`
7. 적대적 리뷰: 데이터 오인, 타입 소실, 경로 의존성, false positive를 파일/행과
   재현 명령으로 기록

## 현재 미확인/차단

- GitHub CLI 인증 토큰이 만료되어 CLI 이슈 생성은 현재 차단됨.
- 실제 전체 게이트의 최신 실행 결과는 수정 후 다시 생성해야 함.
- FreeLang 런타임의 현재 clone 위치 독립 실행은 아직 검증하지 않음.

## 변경 로그

### 2026-10-05

- GitHub `kimjindol2025/afj-db95` 최신 커밋과 전일 업데이트를 확인함.
- 저장소를 `/home/kim/kim/projects/afj-db95`에 작업 사본으로 준비함.
- 이 태스크 문서를 추가함.
- 복합 키를 JSON 배열 토큰으로 바꾸고 충돌/타입 소실 회귀 테스트를 추가함.
- 엔진 문법/type check 및 복합 인덱스·복합 범위 테스트를 실행함.

## 2026-10-05 검증 기록

- `git diff --check`: PASS
- `node /home/kim/kim/platform/freelang-afj/bootstrap.js check src/engine.fls`: PASS
- `tests/compound-index.fls`, `tests/compound-range.fls`: path-normalized 임시
  복제본에서 새 JSON 토큰 edge case 포함 PASS. 원본 checkout에서의 직접 실행은
  `/root/kilo...` 경로 `EACCES` 때문에 여전히 BLOCKED다.
- `node --check` 변경 JS 및 `bash -n` 변경 셸: PASS
- `bash tests/release-gate.sh` without runtime env: 명시적 preflight BLOCKED (exit 2)
- 전체 release gate: 아직 실행하지 않음. 기존 문서상 TCP 5분 envelope 실패가 있어 P0-3로 남김.

## 성능 실패 원인 조사

- 초기 10초 축약 soak에서 서버 시작은 PASS했지만 첫 `login`이 timeout됨.
- 원인은 `tcp-server-raw` runtime이 `(event, conn, payload)` 3개 인자로 호출하는데
  `afj-db-tcp-handler`가 `(event, conn, payload, peer)` 4개 인자를 요구한 계약 불일치였다.
- 핸들러를 3개 인자로 수정하고 peer 정보가 없을 때 connection id로 rate-limit
  fallback하도록 한 뒤 path-normalized 임시 복제본에서 login 및 10초 soak이 PASS했다.
- 현재 AFJ runtime의 `tcp-server-raw`는 IO worker ring-buffer를 사용하며,
  이 경로는 `fl-yield`가 worker 이벤트를 읽어 evaluator로 전달한다.
- `src/tcp-server.fls`는 `fl-event-drain`만 호출해 data 이벤트를 소비하지 못하고
  있었다. 이벤트 루프를 `fl-yield 10` 기반으로 바꿨다.
- 최소 raw-yield smoke에서는 현재 dirty runtime과 clean runtime 모두 worker-ring
  이벤트 dispatch가 PASS했다. runtime worker-ring 자체는 원인이 아니었다.

### 경로 재현성 조사

- 깨끗한 AFJ runtime HEAD에서 `tests/tcp-long-soak.js`를 실행하면 daemon 시작 전에
  `tests/src/tcp-server.fls` ENOENT가 발생했다.
- 이는 테스트 파일 기준 상대 `load`를 기대하는 runtime과 저장소/현재 dirty runtime의
  해석이 다르다는 증거다.
- 저장소의 `.fl` `load`를 일괄 상대경로로 바꾸는 수정은 호환성 없는 우회로 판단해
  되돌렸고, 별도 runner 계약으로 재설계할 항목으로 남겼다.

## 2026-10-05 후속 검증

- `node ... check src/tcp-server.fls`: PASS
- `node ... check src/engine.fls`: PASS
- path-normalized 임시 복제본의 `compound-index.fls`: PASS
- path-normalized 임시 복제본의 `compound-range.fls`: PASS
- path-normalized 임시 복제본의 TCP 10초 soak: PASS
  (`writes=72`, `throughput=7.20/s`, `p95=1233ms`, `max=1462ms`)
- path-normalized 임시 복제본의 TCP 300초 performance envelope: PASS
  (`writes=1272`, `throughput=4.24/s`, `p95=2288ms`, `max=2977ms`)
- 전체 `tests/release-gate.sh`는 개별 case 로그를 내부 임시파일로만 모으고
  장시간 무출력으로 진행되어 종료 증거를 만들지 못해 중단했다. 전체 gate는
  PASS로 보고하지 않는다.
- `tests/release-gate.sh`에 case별 START/END, timeout, 실패 로그 tail 출력을 추가한
  뒤 path-normalized clone에서 재시도했다. 이제 정지 지점을 관측할 수 있다.
- 재시도에서 확인된 별도 실패: case 3 `b64-to-raw` builtin 없음, case 4
  `utf8-encode` builtin 없음, case 33 slow-timeout cleanup 실패, case 40/41
  peer IP rate-limit 기대 불일치, case 44 production TLS boundary의 `/root`
  상태 파일 `EACCES`.
- case 14의 5분 soak은 진단 실행에서 30초 case timeout을 설정해 의도적으로
  중단됐으므로 성능 실패 근거로 사용하지 않는다. 별도 300초 soak은 PASS다.
- 남은 P0: 전체 release gate의 case별 종료 증거, 원본 checkout의
  runner/runtime 경로 계약

## 2026-10-05 review-checklist 검수

검수 스킬의 7단계 분류를 실제 path-normalized 임시 clone과 AFJ runtime에 적용했다.

| 단계 | 결과 | 근거 |
|---|---|---|
| 스모크 | PASS | `node ... run src/afj-db95.fls`; oversized WAL 포함 전체 entrypoint smoke PASS |
| 체크/린트 | PASS | `node ... check src/tcp-server.fls`, `git diff --check` |
| 엣지 | PASS | compound index/range, B-tree range, request limits, fragmented TCP 5개 경로 |
| 회귀 | PASS | backup restore soak, WAL format/corruption/uncommitted recovery |
| 실제 연동 | PASS | TCP 10초 soak: writes=72, p95=1172ms, max=1241ms |
| CI 유사 | BLOCKED/FAIL | `fl-tools review`: runner 없음, TEST BLOCKED, REVIEW FAIL |
| 적대적 리뷰 | FINDINGS | oversized WAL 오류 문자열 계약, 절대 `load` 경로, 전체 gate 무출력 정지 |

적대적 리뷰 발견 및 처리:

1. `src/afj-db95.fls:449` — `error_message`가 runtime context를 포함한
   `WAL_CORRUPT`를 반환하는데 테스트가 정확히 `"WAL_CORRUPT"`만 비교한다.
   재현: `node "$AFJ_BOOTSTRAP" run src/afj-db95.fls`.
   최소 수정으로 context를 허용하는 regex 비교로 바꿨고, 재실행 결과
   oversized WAL PASS 및 entrypoint 전체 PASS. 확신도: 높음.
2. 다수 `.fl` 파일의 `/root/kilo...` 절대 `load` 경로는 새 clone에서 재현되지 않는다.
   임시 치환 clone에서만 실제 테스트를 실행할 수 있었고, runner/runtime 계약 수정이
   필요하다. 확신도: 높음.
3. `tests/release-gate.sh`는 원래 case별 로그를 임시 파일에 숨긴 채 장시간 무출력으로
   실행됐다. case별 START/END·timeout·실패 tail을 추가해 관측성은 해결했지만,
   실제 gate 자체는 여러 case 실패가 남아 있다. 확신도: 높음.

결론: `BLOCKED` — oversized WAL smoke는 수정 후 PASS로 회복됐다. 핵심 TCP 경로와
성능도 통과했지만, CI 유사 runner 부재·절대 load 경로·전체 gate case별 종료 증거가
남아 상용 판정으로 승격할 수 없다.
