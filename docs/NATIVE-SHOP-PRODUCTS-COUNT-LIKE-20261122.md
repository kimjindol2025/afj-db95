# Native shop COUNT LIKE

- SQL: `SELECT COUNT(*) FROM shop_products WHERE name LIKE ?`
- Bind: `%Widget%`
- Result: 1/1 PASS; server returned one row with value `1`, no error.
- Native trial: 1.124s; daemon AOT, flc, gcc, and ld during the trial: 0.
- The daemon ELF was built from the approved COUNT LIKE parser guard. The trial reused the existing compiled FL client for the byte-identical preserved fixture.
- This records only the COUNT LIKE contract; prior failed evidence remains preserved.
