# `deployments/` — provenance of the copied file

Two files are copied from another repository — `reference-set.json` (the input every contract set
is generated from) and `mip18-generated-matrix.json` (the MIP-18 twins' plan, the independent
oracle `test/dual.test.ts` checks every DU declaration against); every other file here is this
repository's own (see `README.md` for what each one is and what writes it).

| This file | Upstream | Commit | Upstream path (git blob) | SHA-256 | Changes |
|---|---|---|---|---|---|
| `reference-set.json` | [`acedward/mip-0018-midnight-contracts`](https://github.com/acedward/mip-0018-midnight-contracts) (Apache-2.0) | `cb6c675ddbbb4a82d0bcaf87ad863c934becce31` (branch `feat/00024-01-mip-0018`) | `deployments/reference-set.json` (`0cc572fb247bbf2ed04703be046ca78cded6bd3a`) | `6b37b56af510d3483899e04690762b12dc0a059853ed07fdd4036e5c2bf6a40b` | **none** (byte-identical; pinned by `test/sources.test.ts`) |
| `mip18-generated-matrix.json` | [`acedward/mip-0018-midnight-contracts`](https://github.com/acedward/mip-0018-midnight-contracts) (Apache-2.0) | `cb6c675ddbbb4a82d0bcaf87ad863c934becce31` (branch `feat/00024-01-mip-0018`) | `deployments/generated-matrix.json` (`3000ae229bae3285c70ea8f58d6fd5d568aeb986`) | `5da77454807c18ce9f836ceb11e69cd27d0e044094b4b8c298e1ea5b23d47ff0` | **none** (byte-identical, renamed; pinned by `test/sources.test.ts`). Read only by `test/dual.test.ts`: the rows `SNEB18`, `LMOON18`, `UMET18`, `DAUR18` are the twins whose MIP-0018 declarations the DU set must carry byte for byte, but for the variant's name, symbol, domain and `repository` URL |
