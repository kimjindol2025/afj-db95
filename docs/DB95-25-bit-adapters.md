# DB95-25 보충 5 — 비트 어댑터와 32비트 LE 버퍼

## 커밋과 작업 기준
- 선행 비트 함수 5개 등록 커밋: 80d9b3a0df9ef33cb5d42e04dbc3b83d880ab00c.
- 이번 비트 어댑터/시험 커밋: d52611256b02cb39eac24b679a0c5f32b94b48f6, Forgejo fix/db95-23-nocurl HEAD 일치 확인.
- compiler base Stage3 SHA-256 시작·종료: bb6b1a355e4e47360607a648b9d13ab24f43d056d5f58d87ec78fa8f657510f3.
- 시험용 Stage4 compiler SHA-256 시작·종료: 1d86c0b1140f98710927ba847458b811122d6bd7f9ead4fee79bde918e901769.
- Stage0는 사용하지 않았다. Stage3에서 현재 FX 소스와 런타임을 반영한 Stage4 실행 파일을 만들었다.

## 비트 어댑터와 SHA-1
bit_not은 32비트 마스크와 기존 fl_bit_and·fl_bit_xor 조합으로, bit_rotate_left는 기존 fl_bit_shl·fl_bit_shr·fl_bit_or·fl_bit_and 조합으로 연결했다. 기존 다섯 비트 기본 함수도 정수 리터럴뿐 아니라 정수값을 담은 FreeLang 숫자 인자를 FL_INT로 정규화한 뒤 기존 C 함수를 호출하도록 했다. SHA-1 소스의 산술 결과가 FL_FLOAT로 전달되어 기존 함수가 .i를 읽을 때 워드값이 손상되는 문제가 확인됐기 때문이다. 비트 연산의 새 C 구현은 추가하지 않았다.

- tests/bit-adapter-compat.fls: BIT_NOT_ADAPTER_PASS, BIT_ROTATE_LEFT_ADAPTER_PASS 출력으로 통과. 회전 정상값, 0·31·32 경계, 최상위 비트와 NOT 경계를 확인했다.
- tests/db95-25-sha1-abc.fls: 출력 원문 afj-db95 SHA-1 implementation loaded, DB95_SHA1_ABC_PASS.
- SHA-1 "abc" 공개값은 qZk+NkcGgWq6PiVxeFDCbJzQ2J0=와 일치했다.

## buf_u32le
src/mariadb-wire.fls에 buf_u32le을 추가했다. 기존 mariadb-u32le의 buf-u8, buf-concat, bit-and, bit_shr 조합을 호출하므로 결과는 little-endian 4바이트다. 새 C 코드는 없다.

tests/db95-25-buf-u32le.fls의 정상값 0x12345678, 경계 0, 0xFFFFFFFF 확인이 모두 통과했다. 출력 원문: BUF_U32LE_PASS=3/3.

## case 결과
case 4·5·65·70의 단독 worker 실행에서는 테스트 본문이 각각 PASS 문구를 출력했지만, 처음에는 worker stdout을 잘못된 파일로 보내 래퍼의 PASS-marker 확인이 실패했다. 이후 전체 case 실행에서는 공식 출력 경로로 확인했고 네 case 모두 PASS였다.

| case | 결과 | 근거 |
|---:|---|---|
| 4 | PASS | MariaDB packet codec PASS |
| 5 | PASS | MariaDB charset contract PASS |
| 65 | PASS | SHA-1 vectors PASS, MariaDB native token PASS |
| 70 | PASS | native MariaDB decoder PASS |
| 25 | FAIL | Uncaught error (line 104): soak login assertion failed |

case 25의 제한 및 soak 설정은 그대로 유지했다.

## 71건 gate
첫 native-release-gate.sh 프로세스는 Orca 재시작으로 case 16 뒤 종료됐고 최종 요약을 출력하지 못했다. 이미 실행된 1–16은 다시 돌리지 않았다. 공용 잠금과 동일한 /dev bind 환경에서 같은 native-release-gate.sh --worker 경로로 17–71을 이어 실행하고 결과를 합쳤다. 따라서 71 case 번호가 1부터 71까지 각각 한 번씩 기록됐으며, 이 결과는 재시작 후 이어서 완성한 집계다. 전체 runner가 한 프로세스로 끝까지 완료됐다고 주장하지 않는다.

집계 원문:

NATIVE_GATE_PASS=42 FAIL=29 TIMEOUT=0 SKIP=0 TOTAL=71

이전 34 PASS case 목록과 비교해 기존 PASS가 깨진 사례는 0건이었다. compiler-v3 시작·종료 SHA-256은 모두 1d86c0b1140f98710927ba847458b811122d6bd7f9ead4fee79bde918e901769이다.

## 새 미등록 내장 목록
이번 gate 로그에서 함수 미등록으로 확인된 항목만 기록한다. 구현은 하지 않았다.

| 내장 | case | 원문 오류 |
|---|---:|---|
| buf-to-binary | 3 | Function not found: buf-to-binary |
| file_mtime | 26, 27 | Function not found: file_mtime |

## 푸시 상태
- FX adapter/test commit d52611256b02cb39eac24b679a0c5f32b94b48f6는 Forgejo에 있고 원격 HEAD 일치를 확인했다.
- 숫자 정규화 변경 커밋: FX 19364839e103aa8ecd3d5f59d7106ce41ef9763c (Forgejo 원격 HEAD 일치 확인). DB95 구현·시험·보고서 커밋: f1953d6bb65c6911ba85e40c43a752dd3aca66c1 (Forgejo native-run HEAD 일치 확인).
- GitHub는 보류한다.

## 기준표
- 1/4: 어댑터 커밋 및 Forgejo 일치 — PASS.
- 2/4: 어댑터·SHA-1·buf_u32le 단위시험 — PASS, 3/3 및 "abc" 공개값 일치.
- 3/4: case 4·5·65·70 PASS, 71개 case 집계 완성, 기존 34 PASS 회귀 0 — PASS (gate는 재시작 뒤 이어서 집계).
- 4/4: PASS 42, 신규 미등록 내장 2종 목록화 — PASS.

언어 성과: FreeLang v11에서 32비트 NOT/회전과 숫자 워드의 비트 연산을 지원하고, FreeLang 코드로 SHA-1 및 MariaDB 4바이트 리틀엔디언 버퍼를 계산한다.

DB95_SUMMARY=4/4, PASS=42 FAIL=29 TIMEOUT=0
