# scripts/

The generator, compile, bundle and fixture scripts of the contract sets, on the layout of
`acedward/mip-0018-midnight-contracts` (project 00024-02, phase 02-B). TypeScript runs with
`node --import tsx`; the tests use the same entry points.

| Script | What |
|---|---|
| `generate-pi-contracts.ts` | writes `contracts/generated/<ID>.compact` and `deployments/generated-matrix.json` from `deployments/reference-set.json` + `deployments/public-interface-set.json` (`--out <dir>` writes elsewhere) |
| `compile.sh` | `compact compile +0.34.0`, one contract at a time, into `contracts/managed/<name>/` (`--check`: compare with a fresh `--skip-zk` compile) |
| `bundle.ts` | `public-interface-deploy-check` (patched, `tools/public-interface/`) for every PI contract: `bundles/<path>/` + `deployments/bundles.json`; `--mirror <dir>` also copies each bundle to `<dir>/<path>` (the local stack's `bundles/`) |
| `simulate-pi.ts` | runs a contract's plan in the Compact simulator (constructor, verifier keys, every step, the `publishBundle` parts): the state and event-payload inputs of `public-interface-verify`; CLI writes `out/sim/<ID>/` |
| `verify-bundles.sh` | Levels 1-3 of every bundle, offline (needs a compactc 0.34.0 and the zk parameters) |
| `export-fixtures.ts` | `fixtures/simulator/` and `fixtures/bundles/` for the token indexer (deterministic; `--out <dir>`) |
| `tools-check.sh` | the patched tools' own build and test suite |
| `deploy-and-publish.ts` | **on chain** (task 02-B4): deploys the PI set and runs each plan — `repository` declarations, mints, transfer, then the pointer of `deployments/bundles.json` through the Multi-Part Event publisher (all `publishBundle` parts of one pointer in ONE guaranteed intent; UPROMPI = 2 parts); record `MN_DEPLOYMENT_FILE` (`out/…`, not committed) |
| `publish-pointer.ts` | **on chain**: further pointers (a new bundle version) or pointers on fresh instances of a PI contract, from a plan file, in one wallet session |
| `stranger-check.ts` | **on chain**: every emitting circuit (`publish*Repository`, `publishBundle`) refused without the emitter secret; a multi-part pointer also through the publisher |
| `chain.ts`, `deploy-lib.ts`, `profile.ts`, `staged-deploy.ts` | the shared on-chain session (wallet, providers, publisher adapters), the record and the plain / staged deploy, the `MN_*` profile and secrets — reused from `mip-0018-midnight-contracts` @ `cb6c675` (`SOURCE.md`) |

The on-chain scripts take the network from the `MN_*` variables (`MN_NETWORK_ID=undeployed` requires
every endpoint: `MN_INDEXER_URL`, `MN_INDEXER_WS_URL`, `MN_NODE_URL`, `MN_NODE_WS_URL`,
`MN_PROOF_SERVER_URL`) and read every secret from a mode-600 file: `MN_MNEMONIC_FILE` (the paying
wallet), `MN_EMITTER_SECRET_FILE` (`METADATA_EMISSOR_SECRET`, 32 bytes hex), `MN_FUNGIBLE_SK_FILE`
(LSUNPI's OpenZeppelin account secret, 32 bytes hex); `MN_PRIVATE_STATE_DIR` holds midnight-js's
LevelDB, `MN_MAINTENANCE_KEY_DIR` (mode 700) the maintenance key of a staged deploy. The proof
server sees the secrets as private inputs — run your own. They were run on the project's local
Midnight 2.x chain only (spec 00024 §6.1); run them as
`node --import tsx scripts/<name>.ts …` from the repository root (Node 24).
