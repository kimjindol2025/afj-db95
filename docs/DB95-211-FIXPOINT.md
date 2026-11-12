# DB95-211 — Fixed-point discrepancy investigation

## Result

`DB95-211=확정`

The reported `ebae6f49… / 2f7f82e9… / 7bca2ea4…` sequence was not a Stage2/3/4 generated-C fixed-point result. Those hashes belong to the preserved `stage2-bin`, `stage3-bin`, and `stage4-bin` ELF files. The DB95-26 fixed-point contract and the new runs compare generated C files. All Stage2/3/4 generated-C hashes are equal to `e4fb1a898828cd873989008e248cdcadeb5dc7ce72ac4b68d5f3ea1b28c6f487`.

The old and new ELF hashes are not interchangeable with generated-C hashes. ELF files also contain the generated input filename in their symbol string table; the current Stage2 and Stage3 binaries have different file hashes but the same GNU Build ID.

## Preserved starting point

- DB95 branch: `fix/db95-210-last-two`
- DB95 HEAD: `b72de62a4eb9a15a6fcacebfb898ffbc3ba19f26`
- DB95 work tree before and after the builds: clean; no source or test changes.
- FX DB95-26 compiler-source commit: `a8f944134f91e04d7e7e6c6d7cd5e00d691bc9d1`, which contains the `cgc-while` change recorded in DB95-26.
- FX revision used for the current-state run: `fa7de514a759849527539914acab4cc131c81ba6`.
- `self/cgc-main.fl` has no diff between those two FX commits. The only changed tracked runtime source in `runtime/` is `runtime/aliases.c`.
- Shared starting Stage4 seed SHA-256: `7bca2ea4c37619bce3f6047d88e9bace717129034c92836c322d2ba845cfdb2a`.

The earlier FX commit `19364839e103aa8ecd3d5f59d7106ce41ef9763c` predates the DB95-26 `cgc-while` change. A diagnostic chain at that revision produced `7b119bfd…` at every C stage. It is not the correct DB95-26 comparison point. The `a8f94413…` chain produced the documented `e4fb1a89…` fixed point.

## Build evidence

The current and DB95-26 chains each generated Stage1 through Stage4 from the same preserved seed, then linked each generated C with the runtime source list and options used for the native compiler (`gcc -O2 -w -rdynamic`, project runtime sources, and the recorded system libraries). Each chain ran under `/tmp/fl-heavy.lock` with a 2 GiB process address-space limit. `ps` was checked before each locked build. No Stage0 was used.

| Chain | FX source | Stage1 C | Stage2 C | Stage3 C | Stage4 C |
|---|---|---|---|---|---|
| Current | `fa7de514…` | `e4fb1a89…` | `e4fb1a89…` | `e4fb1a89…` | `e4fb1a89…` |
| DB95-26 | `a8f94413…` | `e4fb1a89…` | `e4fb1a89…` | `e4fb1a89…` | `e4fb1a89…` |
| Pre-fix diagnostic, not the DB95-26 anchor | `19364839…` | `7b119bfd…` | `7b119bfd…` | `7b119bfd…` | `7b119bfd…` |

The current chain’s generated C files are byte-for-byte equal to the preserved DB95-26 Stage2 and Stage3 C files. Current Stage2/3/4 ELF SHA-256 values are respectively `cd64f9a1…`, `2f94d2e1…`, and `7bd3400c…`; these are recorded separately from the C fixed point. The corresponding Stage2/3/4 ELF SHA values in the preserved DB95-26 artifact are `ebae6e4f…`, `2f7f82e9…`, and `7bca2ea4…`.

## First-difference analysis

- Generated C: `stage2.c` and `stage3.c` compare equal; there is no differing byte or content window. Both are also equal to the preserved DB95-26 C outputs.
- ELF: `stage2-bin` and `stage3-bin` first differ at 1-based byte `1,463,183`, in `.strtab`. The embedded eight-byte string is `stage2.c` versus `stage3.c`; its sixth byte differs: ASCII `2` (`0x32`) versus `3` (`0x33`). The string begins at file offset `1,463,177`. The GNU Build ID is the same for Stage2/3/4 within each newly built chain (`38149e29…` current; `1f423cf1…` DB95-26). This is a deterministic stage-output filename difference in ELF metadata, not a generated-C difference or a timestamp/random value.

## Code, environment, and toolchain assessment

- **Generated compiler output / source:** The current and DB95-26 `self/cgc-main.fl` inputs are identical and produce the same C fixed point. The pre-fix `19364839…` source produces a different C hash, consistent with the later `cgc-while` source change. This machine did not introduce a differing generated-C result.
- **Linked runtime:** `runtime/aliases.c` differs between the DB95-26 and current FX revisions. Consequently, the complete linked ELF is a different build input/result even though the compiler C is unchanged. ELF SHA is therefore not the self-host fixed-point criterion.
- **Per-run values:** The observed Stage2-versus-Stage3 ELF difference is the stage C basename in `.strtab`; it is repeatable and stage-specific. No changing timestamp, random value, or generated-C ordering difference was found.
- **Environment:** The first current-chain attempt generated Stage1 C but linking stopped because the default linker search could not resolve `-lcurl`. No system setting or package was changed; the subsequent build used the pre-existing `LIBRARY_PATH` recorded in the DB95-192 build recipe and completed. This is a linker-search-path requirement, not evidence of machine-specific generated-C instability.
- **Tool versions:** This machine reports GCC/`cc` `14.3.1 20250617 (Red Hat 14.3.1-2)` and Linux `6.12.0-211.73.1.el10_2.x86_64`. The DB95-26 build record does not include a GCC/`cc` version, so a version change cannot be established.

## Conclusion and limits

The supposed DB95-210 fixed-point mismatch is a hash-target mix-up: ELF hashes were reported as if they were generated-C hashes. The fixed-point C is reproducible on this machine at the current FX revision and at the correct DB95-26 FX commit. The earlier pre-fix commit differs in generated C because it predates `cgc-while`; this confirms a source-revision difference, not a host-only anomaly. Toolchain-version equality with DB95-26 remains unverified because the old record omitted the version.

No DB95 tests, source, expectations, timeout, runner, or FX checkout were changed. The only repository addition is this report. No gate, Stage0, or recovery test was run.

```text
DB95-211=확정
재실행해시_C=Stage2 e4fb1a89 / Stage3 e4fb1a89 / Stage4 e4fb1a89 (DB95-26 기록과 같음)
기준커밋해시=a8f944134f91e04d7e7e6c6d7cd5e00d691bc9d1 / e4fb1a89 / e4fb1a89 / e4fb1a89
원인분류=코드(ELF 링크 입력 차이) + 산출물 종류 혼합; 무작위 실행값 아님
첫차이=stage2-bin/.strtab | byte 1,463,183 | stage2.c[2] (0x32) ↔ stage3.c[3] (0x33); C 출력은 byte 차이 없음
도구버전_차이=확인불가
다음제안=고정점은 생성 C SHA로 판정하고 ELF SHA·Build ID는 별도 실행물 증거로 기록
```
