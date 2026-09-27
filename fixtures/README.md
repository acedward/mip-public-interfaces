# fixtures/

Test inputs exported from the contract sets for the token indexer (project 00024-02,
phase 02-B5) by `scripts/export-fixtures.ts` (deterministic; `test/fixtures.test.ts`
regenerates and compares). Each directory has a `SOURCE.md` with the toolchain and the
SHA-256 of every input and output.

| Directory | What |
|---|---|
| `simulator/` | the PI set's deployment plans run in the Compact simulator: `events.json` (every `Misc` event — the `repository` declarations and the interface pointer parts — and the Multi-Part Event packages they form; UPROMPI's pointer is the one 2-part package), `interfaces.json` (each contract's publication, bundle, circuits, verify-only circuits and serialized state — the Level 2 input) |
| `bundles/` | verification cases, all built from LSUNPI: `valid`, `tampered-file`, `wrong-hash`, `over-size-cap` (exceeds a 1 MiB cap), `loopback-host`, `compiler-not-installed` (compactc 0.33.0); `cases.json` gives each case's URL, event payload and expected outcome; `LSUNPI.state.hex` is the state every case verifies against |
