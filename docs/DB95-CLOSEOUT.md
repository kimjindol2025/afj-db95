# DB95 closeout — DB95-209 through DB95-211

## Current status

**보류(쇼핑몰 주문 저장 전 28번 필요)**

This closeout summarizes the existing DB95-210 gate result and DB95-209/211 findings. No gate, build, or test was rerun for this document.

## DB95-210 gate

Recorded result: **52 PASS / 18 FAIL / 1 TIMEOUT / 71 total**. Case 25 is the one timeout and is included among the 19 failed cases.

| Case | Name | Classification |
|---:|---|---|
| 9 | local canary rollback | JS/node 제외 |
| 24 | TCP concurrency | JS/node 제외 |
| 25 | TCP 5m performance envelope | 시간 초과 |
| 28 | compatibility scorecard | 진짜 실패 |
| 30 | MariaDB remediation regression | 진짜 실패 |
| 34 | forced-kill WAL recovery | JS/node 제외 |
| 35 | TCP transaction forced-kill recovery | JS/node 제외 |
| 56 | runtime peer IP rate limit | JS/node 제외 |
| 59 | production TLS boundary | JS/node 제외 |
| 60 | native TLS listener | JS/node 제외 |
| 61 | native TLS mTLS/reload | JS/node 제외 |
| 62 | production native TLS integration | JS/node 제외 |
| 63 | TLS adapter handshake/reload | JS/node 제외 |
| 64 | MariaDB wire packet unit | JS/node 제외 |
| 66 | MariaDB wire prepared | JS/node 제외 |
| 67 | MariaDB standard-client smoke | JS/node 제외 |
| 68 | native MariaDB wire | JS/node 제외 |
| 69 | native MariaDB auth rejection | JS/node 제외 |
| 71 | native MariaDB prepared | JS/node 제외 |

Classification totals: **JS/node 제외 16, 시간 초과 1, 진짜 실패 2; 합계 19.**

### Case 28 — compatibility scorecard

The scorecard reports **88%**, below its **95%** target. MVCC and B+Tree are marked incomplete in the scorecard. Reaching the target requires implementing and verifying those actual features; changing only a PASS marker would not resolve the shortfall.

### Case 30 — remediation regression evidence path

After the SQL checks pass, the case tries to write `../docs/remediation-recovery-path.txt`. Runtime path protection at `v11-file.h:15` rejects any `..` path component. Keep that protection. Changing the test’s evidence-file handling requires separate approval.

## Fixed point and build notes

DB95-211 verified the generated-C fixed point: **Stage2 = Stage3 = Stage4 = `e4fb1a89`** (full SHA recorded in `DB95-211-FIXPOINT.md`). The prior apparent mismatch came from comparing generated-C hashes with Stage2/3/4 ELF hashes. ELF metadata includes the stage C filename, so ELF SHA values differ by stage; judge the fixed point using generated-C SHA only. Record ELF SHA and Build ID separately.

The first link attempt could not resolve `-lcurl` through the default search path. It succeeded using the pre-existing `LIBRARY_PATH` from the earlier build record (`<가림>`); no system configuration or packages changed.

## DB95-209 change

Commit `b72de62a` changed one input-construction line in `src/afj-db95.fls`: the oversized-WAL fixture now calls `str_join` with the Native API’s separator-first order. This corrects the test input construction and does not change the WAL validation rule.

## Restart order

1. **Case 28:** implement and verify MVCC, then B+Tree.
2. **Case 30:** proceed after separate approval of the test evidence-file handling; preserve runtime path protection.
3. **Case 25:** investigate the timeout cause.
4. **JS/node excluded 16:** decide whether to port them to Native.

## Re-entry point

- Branch: `fix/db95-210-last-two`
- Closeout document starts from HEAD `7942de73`.
- Last recorded native gate remains DB95-210: `52 PASS / 18 FAIL / 1 TIMEOUT`.
- Release and production use remain on hold until the required database correctness work and verification are complete.

```text
STATUS=보류(쇼핑몰 주문 저장 전 28번 필요)
GATE=52 PASS / 18 FAIL / 1 TIMEOUT
FIXED_POINT_C=e4fb1a89 (Stage2=Stage3=Stage4)
CASE28=88%, target 95%; MVCC then B+Tree implementation required
CASE30=path protection retained; test evidence path needs separate approval
```
