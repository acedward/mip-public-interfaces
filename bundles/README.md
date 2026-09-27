# bundles/

The public-interface bundles of the PI contracts, exactly as the local stack's static
server serves them (`resources/00024-local-stack/bundles/` of project 00024 mirrors this
directory; its compose service `bundles` answers at `http://bundles/` inside the stack's
network). Each subdirectory is one bundle at the path of its URL:

| Contract | URL | Parts |
|---|---|---|
| `LSUNPI` | `http://bundles/LSUNPI/index.json` | 1 |
| `SSTARPI` | `http://bundles/SSTARPI/index.json` | 1 |
| `CNSTPI` | `http://bundles/CNSTPI/index.json` | 1 |
| `UPROMPI` | `http://bundles/UPROMPI/an-interface-bundle-whose-index-json-url-is-longer-than-the-224-bytes-one-publishBundle-event-holds/so-the-contract-publishes-its-pointer-as-a-two-part-multi-part-event-package/in-one-guaranteed-intent/index.json` (235 bytes) | **2** |

Written by `scripts/bundle.ts` with `public-interface-deploy-check` (the patched copy in
`tools/public-interface/`); the commitment, URL, payload and `publishBundle` parts of each
are in `../deployments/bundles.json`. Do not edit a file here: every byte is covered by the
bundle's `index.json` and its commitment, which the contract publishes on chain.

Each bundle is a **FULL** interface (the Public Interfaces draft's open form): `src/`
holds the whole contract source (`src/generated/<ID>.compact`) and every module it
imports — `TokenMetadata.compact`, `OffChainInterface.compact` and, for the OpenZeppelin
based contracts, the vendored OpenZeppelin modules (MIT; their notice is
`contracts/vendor/openzeppelin/LICENSE` of this repository); `out/` holds one verifier key
per circuit, the generated wrapper and the contract description. Proving keys and ZKIR are
not shipped. Verify one offline:

```sh
./scripts/verify-bundles.sh LSUNPI     # Levels 1-3 against the simulated deployment
```
