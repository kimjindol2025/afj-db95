# Native shop product name COUNT: Demo Gadget

- Contract: `SELECT COUNT(*) FROM shop_products WHERE name=?` with exact-match bind `Demo Gadget`.
- Fixture: seeds `Demo Widget` and `Demo Gadget` unchanged; one Native MariaDB connection using the existing daemon and prepared-statement route.
- Result: PASS 1/1; server returned one row with value `1`, no ERR packet.
- Native trial: 6.375s; daemon AOT: 0.
- Product source files changed: no. The task added only the FL contract fixture and this evidence.
- This result covers this exact COUNT contract only; it does not promote other held or failed contracts.
