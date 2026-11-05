# DB95-27 대상 10건 원인 표 — 독립 검토 보충

2026-11-05 후속 대조 반영. 상태: GATE=3/3, TABLE=10/10(원인 분류 기준). case 12·39의 동일 런타임 대조와 단독 2/2 PASS를 별도 QA가 확인했다. 전체 Native Release Gate는 BLOCKED다. TABLE=10/10은 시험 10/10 PASS가 아니며 case 9 HOLD를 포함한다. 지정 목록의 신규 재실행 집계는 DB95-192-case12-39.md를 따른다.

별도 검증자가 tests/release-gate.sh의 run_case 호출 순서로 번호를 대조했다. case 7은 src/afj-db95.fls다. 기준 HEAD c315ef23과 DB95-27의 단독 실패 로그도 직접 확인했다. 새 독립 재실행이 아니라 기존 증거 검토이며, 수정 후 case 7은 DB95-191에서 PASS했다.

| case | 시험 파일 | 수정 전 실패한 줄·메시지 | 원인 분류 | 수정 또는 조사 위치 | 현재 증거 |
|---:|---|---|---|---|---|
| 7 | src/afj-db95.fls | 455/486: oversized WAL was accepted | 확정: repeat가 FL_FLOAT 횟수를 0으로 처리하여 padding 소실 | FX runtime/aliases.c fl_repeat | 수정 후 EXIT=0, oversized WAL PASS |
| 9 | .freelang/canary.sh | 하위 smoke.sh 11: node: command not found | 확정: 외부 실행 의존성, 셸 보류 묶음과 중복. awk 호출도 존재 | .freelang/canary.sh, smoke.sh, tcp-smoke.sh 및 TLS 이식 경로 | HOLD, 이번 실행 없음 |
| 12 | tests/tcp-lazy-catalog.fls | 101: lazy transaction snapshot changed | 확정: 일반 map deref로 CREATE+INSERT 최초 행 history가 비어 lazy snapshot에서 누락 | src/tcp-server.fls afj-tcp-record-table-row-versions 3곳 | 같은 runtime의 baseline EXIT=1, 수정본 단독 EXIT=0; 이번 baseline 저장 페이지에서 최초 id=1 history 누락 확인 |
| 13 | tests/persistent-btree.fls | load한 afj-db95.fls 455/486: oversized WAL was accepted | 확정: case 7과 같은 repeat 숫자 태그 문제 | FX runtime/aliases.c fl_repeat | 수정 후 EXIT=0, persistent recursive B+Tree PASS |
| 28 | src/compatibility.fls | 37–40의 baseline=88% 출력 후 NATIVE_PASS_MARKER_MISSING | 확정: scorecard 통과 기준 95% 미충족. 언어 런타임 오류 아님 | src/compatibility.fls의 기능별 실제 달성 근거; 러너 PASS 마커는 증상 | 이번 목록 재실행 EXIT=1, 같은 88%·marker 실패. 기준·기대값 유지 |
| 30 | tests/mariadb-remediation-regression.fls | 130: file_write failed: PATH_OR_ACCESS_DENIED | 확정: ../ 경로와 native 파일 정책 충돌 | FX runtime/v11-file.h vf_path와 시험의 상대 경로 계약 | 이번 목록 재실행 EXIT=1, 같은 경로 거부. 정책 약화·시험 수정 없음 |
| 38 | tests/tcp-mvcc-conflicts.fls | 58: TCP row-version chain integration failed | 확정: 일반 map에 deref를 적용해 신규 행 버전 기록 누락 | src/tcp-server.fls afj-tcp-record-table-row-versions 3곳 | 수정 후 EXIT=0, 이후 전체 원본 assertion도 통과 |
| 39 | tests/tcp-range-predicate.fls | 136: range delete conflict was not detected | 확정: 일반 map deref로 UPDATE 시 생존 행도 조기 tombstone 처리되어 실제 DELETE의 새 revision이 누락되는 경로 | src/tcp-server.fls afj-tcp-record-table-row-versions 3곳 | 같은 runtime의 baseline EXIT=1, 수정본 단독 EXIT=0; 세부 revision 경로는 소스 추론이며 중간값 trace는 아님 |
| 41 | tests/tcp-row-version-recovery.fls | 43: TCP row-version WAL recovery failed | 확정: case 38과 같은 map deref로 버전 기록 누락 | src/tcp-server.fls afj-tcp-record-table-row-versions | 수정 후 EXIT=0, WAL recovery PASS |
| 42 | tests/tcp-row-version-checkpoint.fls | 40: durable row-version checkpoint was not written | 확정: case 38과 같은 map deref로 버전 체인 누락 | src/tcp-server.fls afj-tcp-record-table-row-versions | 수정 후 EXIT=0, checkpoint write/recovery PASS; 별도 프로세스 복원 증거도 QA 대조 |

case 28은 marker만 추가하거나 95% 문턱을 낮춰 해결하지 않는다. case 30은 `..` 거부 정책을 무조건 해제해 해결하지 않는다. 각 계약을 보존하는 별도 수정·검증이 필요하다.

기존 DB95-27 실패 로그는 `<가림>/DB95-27/`, 최초 수정 후 증거는 `<가림>/DB95-191/`에 있다. 이번 최신 목록 실행 원문은 `<가림>/DB95-next/`, 가린 검수 사본은 docs/evidence/DB95-192에 있다. case 9의 과거 증거는 `<가림>/DB95-26/gate-memory-safe/`의 로그다. 별도 QA 상세는 DB95-independent-QA.md 및 DB95-192-case12-39.md를 따른다. 원인 확정 범위와 수정 후 검증 범위를 혼동하지 않는다.

원래 GATE 3항목은 기준 커밋 확인·case 7 경로 확인·case 7 단독 실패 재현이다. 71개 전체 gate 또는 세 차례 전체 실행을 뜻하지 않는다. 커밋·푸시·배포는 보류했다.
