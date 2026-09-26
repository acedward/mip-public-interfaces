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

The local-chain deploy-and-publish script (network from the `MN_*` variables) is task
02-B4.
