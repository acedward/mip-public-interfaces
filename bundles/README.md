# bundles/

The public-interface bundles of the PI contracts and of the DU (dual) contracts, exactly as
the local stack's static server serves them (`resources/00024-local-stack/bundles/` of
project 00024 mirrors this directory; its compose service `bundles` answers at
`http://bundles/` inside the stack's network). Each subdirectory is one bundle at the path of
its URL:

| Bundle | Contract | Form | URL | Parts |
|---|---|---|---|---|
| `LSUNPI` | `LSUNPI` | FULL | `http://bundles/LSUNPI/index.json` | 1 |
| `SSTARPI` | `SSTARPI` | FULL | `http://bundles/SSTARPI/index.json` | 1 |
| `CNSTPI` | `CNSTPI` | FULL | `http://bundles/CNSTPI/index.json` | 1 |
| `UPROMPI` | `UPROMPI` | FULL | `http://bundles/UPROMPI/an-interface-bundle-whose-index-json-url-is-longer-than-the-224-bytes-one-publishBundle-event-holds/so-the-contract-publishes-its-pointer-as-a-two-part-multi-part-event-package/in-one-guaranteed-intent/index.json` (235 bytes) | **2** |
| `SNEBDU` | `SNEBDU` | HIDDEN | `http://bundles/SNEBDU/index.json` | 1 |
| `LMOONDU` | `LMOONDU` | HIDDEN | `http://bundles/LMOONDU/index.json` | 1 |
| `LMOONDU-v2` | `LMOONDU` | HIDDEN | `http://bundles/LMOONDU-v2/index.json` | 1 |
| `UMETDU` | `UMETDU` | HIDDEN | `http://bundles/UMETDU/index.json` | 1 |
| `DAURDU` | `DAURDU` | HIDDEN | `http://bundles/DAURDU/index.json` | 1 |

Written by `scripts/bundle.ts` with `public-interface-deploy-check` (the patched copy in
`tools/public-interface/`); the commitment, URL, payload and `publishBundle` parts of each
are in `../deployments/bundles.json`. Do not edit a file here: every byte is covered by the
bundle's `index.json` and its commitment, which the contract publishes on chain.

**FULL** (the PI contracts; the Public Interfaces draft's open form): `src/` holds the whole
contract source (`src/generated/<ID>.compact`) and every module it imports —
`TokenMetadata.compact`, `OffChainInterface.compact` and, for the OpenZeppelin based
contracts, the vendored OpenZeppelin modules.

**HIDDEN** (the DU contracts; the draft's private form): `src/` holds ONE file,
`src/<ID>.Interface.compact` (`contracts/interfaces/`, written by `scripts/du-interfaces.ts`):
it imports no module, declares the deployed contract's ledger slot by slot under hidden
names, and publishes every impure circuit of the contract, with the module circuits they
call written out as local circuits — not the contract's source as written, and not its pure
getter. Every published circuit compiles to the deployed contract's verifier key
(deploy-check refuses the bundle otherwise). `LMOONDU-v2` is a second valid bundle of
LMOONDU's interface — the same source and keys at another location, with one more listed
file (`PUBLICATION.md`), so another commitment — for the same-block pair of spec 00024
§9.2 P2.

In both forms `out/` holds one verifier key per published circuit, the generated wrapper and
the contract description (proving keys and ZKIR are not shipped), and every bundle carries
its own `LICENSE`, `NOTICE` and `SOURCE.md`: the licences, attributions and provenance of the
files it ships — for a HIDDEN bundle also every upstream file its interface adapts code from
and how ("Modifications") — listed in its `index.json` like every other file, so a bundle
downloaded on its own is complete. Verify one offline:

```sh
./scripts/verify-bundles.sh LSUNPI     # Levels 1-3 against the simulated deployment
./scripts/verify-bundles.sh SNEBDU
```
