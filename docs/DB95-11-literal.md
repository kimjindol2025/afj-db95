# DB95-11 unsupported-literal 확인

접수번호: RUN-20261103-10

## 시작 기준

- freelang-v11-fx `feat/db95-native-peer`: `b8fdb29b94eec109db245172237c2d5a55e4c001`
- afj-db95 `native-run`: `f67661bae549204ada8250848f9897eb07ec7a1b`
- 지정된 고정점 SHA-256: `6a0d4e384a18834d4f0cb03c10460aade5bf05f999f5db981dd5dc275d313e7d`

## 컴파일러 사전 확인

시험에 사용할 실행 파일 경로는 `<가림>`이다. 지시서가 요구한 SHA-256 비교:

```text
COMPILER_SHA256=4411e601988d9b7e5444f6b0973ca60d15751bd618efd456d9f4a9963318c7d3
EXPECTED_FIXPOINT_SHA256=6a0d4e384a18834d4f0cb03c10460aade5bf05f999f5db981dd5dc275d313e7d
COMPILER_HASH_MATCH=FAIL
STAGE2_SOURCE_SHA256=6a0d4e384a18834d4f0cb03c10460aade5bf05f999f5db981dd5dc275d313e7d
```

Stage2 생성 소스는 지정 해시와 일치하지만, 테스트 실행에 필요한 컴파일러 실행 파일의 해시는 일치하지 않는다. 규칙에 따라 unsupported-literal 재현, 회귀, DB95 gate, bootstrap 및 푸시는 시작하지 않았다. 수정 전 실패 증거와 표기 분류도 생성하지 않았다.

진행 조건: 테스트에 사용할 실행 파일 자체의 SHA-256이 지정된 고정점과 같아야 하는지, 아니면 실행 파일을 생성한 Stage2 소스의 SHA-256을 비교하라는 뜻인지 확인이 필요하다.

DB95_SUMMARY=0/5

## RUN-20261103-10b 재개 확인

### 컴파일러 확인

시험용 실행 파일: `<가림>/compiler` (Stage0 실행 파일이 아님).

```text
COMPILER_SHA256=4411e601988d9b7e5444f6b0973ca60d15751bd618efd456d9f4a9963318c7d3
STAGE2_SOURCE_SHA256=6a0d4e384a18834d4f0cb03c10460aade5bf05f999f5db981dd5dc275d313e7d
EXPECTED_FIXED_POINT_SHA256=6a0d4e384a18834d4f0cb03c10460aade5bf05f999f5db981dd5dc275d313e7d
STAGE0_SELECTED=NO
COMPILER_SHA256_BEFORE=4411e601988d9b7e5444f6b0973ca60d15751bd618efd456d9f4a9963318c7d3
COMPILER_SHA256_AFTER=4411e601988d9b7e5444f6b0973ca60d15751bd618efd456d9f4a9963318c7d3
```

Stage2 소스는 기준 고정점 해시와 일치한다. 실행 파일 SHA는 별도 실행 기준값으로 기록했고, 시험 중 동일함도 확인했다. `fix/raw-tcp-review` 브랜치나 해당 작업 디렉터리는 이 작업에서 건드리지 않았다.

### unsupported-literal 11건의 출처 판정

이전 유효 gate의 11건은 모두 `.js` 입력이었다. 각 첫 진단 원문은 `[CGC-ERR] unsupported literal type=unknown line=N`이며, 문제 줄의 표기는 아래와 같다.

| Gate case | 입력 파일:줄 | 문제 줄의 표기 | 첫 오류 원문 |
|---:|---|---|---|
| 35 | `tcp-transaction-kill-recovery.js:12` | JS arrow `=>` | `[CGC-ERR] unsupported literal type=unknown line=12` |
| 56 | `ip-rate-limit-runtime.js:12` | JS arrow `=>` | `[CGC-ERR] unsupported literal type=unknown line=12` |
| 60 | `native-tls-smoke.js:9` | JS `const` destructuring | `[CGC-ERR] unsupported literal type=unknown line=9` |
| 61 | `native-tls-policy-smoke.js:9` | JS `const` destructuring | `[CGC-ERR] unsupported literal type=unknown line=9` |
| 62 | `production-native-tls.js:9` | JS `const` destructuring | `[CGC-ERR] unsupported literal type=unknown line=9` |
| 63 | `tls-proxy-smoke.js:8` | JS `const` declaration | `[CGC-ERR] unsupported literal type=unknown line=8` |
| 64 | `mariadb-wire-unit.js:9` | JS arrow `=>` | `[CGC-ERR] unsupported literal type=unknown line=9` |
| 67 | `mariadb-wire-smoke.js:15` | JS arrow `=>` | `[CGC-ERR] unsupported literal type=unknown line=15` |
| 68 | `native-mariadb-smoke.js:9` | JS arrow `=>` | `[CGC-ERR] unsupported literal type=unknown line=9` |
| 69 | `native-mariadb-auth.js:11` | JS arrow `=>` | `[CGC-ERR] unsupported literal type=unknown line=11` |
| 71 | `native-mariadb-prepared.js:11` | JS `function` declaration | `[CGC-ERR] unsupported literal type=unknown line=11` |

`tests/native-release-gate.sh:32-35` confirms `.js` inputs are passed to the compiler and then the worker emits `NATIVE_JS_SOURCE_NOT_PORTED` and fails. These first diagnostics are produced while trying to parse JavaScript syntax as FreeLang; they do not identify unsupported FreeLang literal forms. The hex literal in case 71 is on the preceding line, not the first-diagnostic line.

As a focused `.fl` probe, `(println 0x0002a201)` compiled with the verified compiler:

```text
HEX_LITERAL_COMPILE=PASS VALUE=172545
HEX_LITERAL_DIAGNOSTIC=NONE
```

No FreeLang literal defect has been reproduced from this 11-case group. No JS/DB95 runner, expected value, or source was changed. Adding JS arrow, destructuring, or function-declaration syntax to FreeLang would not be a literal fix and would not make the gate's `.js` worker pass; therefore the unsupported-literal change, 71-case rerun, bootstrap, and push are stopped pending a valid `.fl` literal target or a new scope decision. The JS runner was not changed and Node was not used.

DB95_SUMMARY=0/5
