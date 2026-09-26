# vendor/compact-multi-part-event — source

An **unmodified copy** of the reference **publisher** of the *Multi-Part Event* draft
(`mip-xxxx:multi-part[v1]`), with the **reader** it imports. This repository's
contracts publish a public-interface pointer longer than one event (a URL over 224
bytes) as several `publishBundle` calls in ONE guaranteed intent; the publisher builds
that transaction (one pinned state, one intent per package, every package checked at
every stage).

| | |
|---|---|
| Upstream | [`acedward/compact-multi-part-event`](https://github.com/acedward/compact-multi-part-event) (package `compact-multi-segment-emit`, export `./publisher`) |
| Pinned commit | `f2425f2722615c167b7b94814d6f3f282375479e` (PR #1 head; `src/` unchanged since `b77006a`) |
| Copied with | `git archive f2425f2 -- LICENSE src/publisher src/reader` |
| License | Apache-2.0 (`LICENSE`, as upstream ships it) |
| Changes | none — do not edit here; re-copy from a new pin and update this file |

## Why a copy and not a git dependency

The plan asked for a git dependency at the pinned commit first. It installs, but not
usably: `github:acedward/compact-multi-part-event#f2425f2…` gives a package holding only
`LICENSE`, `README.md` and `package.json`, and `import('compact-multi-segment-emit/publisher')`
fails with `ERR_MODULE_NOT_FOUND …/dist/publisher/index.js`. The package's `exports`
point at `dist/`, the TypeScript build output, which is not committed, and there is no
`prepare` script to build it on install (this repository installs with
`ignore-scripts=true`, which would refuse one anyway). `"private": true` and
`engines.node >=24.21.0 <25` do not matter for a git dependency in Node 24.21. Recorded
in project 00024's evidence note (§02-A step 4).

## Files

The reader is copied whole because `src/publisher/*` imports `../reader/bytes.js`,
`../reader/event.js` and `../reader/transaction.js`, and `transaction.ts` imports
`packages.ts`. The code is TypeScript with NodeNext `.js` import specifiers; it runs
under vitest and tsx. It depends on `@midnightntwrk/ledger-v9` and
`@midnight-ntwrk/compact-runtime`, which resolve to this repository's pins (ledger-v9
1.0.0-rc.5 — upstream pins rc.3; its own suite passes on rc.5, project 00024 P0.2).

| Path | Git blob @ `f2425f2` | SHA-256 |
|---|---|---|
| `LICENSE` | `d645695673349e3947e8e5ae42332d0ac3164cd7` | `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30` |
| `src/publisher/binding.ts` | `46b1f53acc0e086755629f08026d8b8e7331b7b0` | `c6c74d9044649dd08e15481f613403cf80a3c3e633996f1e0f5cb3fe5e18639a` |
| `src/publisher/compose.ts` | `6aa1ebd9391321d2c3437c701fbdfefab66c56bb` | `76f5951573b28a7b425d8d3ede6fd4a5bc41785a4250cb66d7f878c8c3ff68d9` |
| `src/publisher/finalize.ts` | `0011142ca3659f8e11b40db541a8490fc7ee3977` | `8c4b6fe811f3a012bc5691af6d3b89ae6e7fec646733ac3c680715e2e772cc6e` |
| `src/publisher/generic.ts` | `932fb94dcb7d7a50b25ac9ca89f7b0ec94afb562` | `38fea06c52db9d3157dd8d24a9d6f355fb54e12614d6fe452911c3510e276f46` |
| `src/publisher/guard.ts` | `5551e9245a84102febcb62ebfb10e521c17a3ce2` | `db92e2c6a6f2f689f622660a1db6a0496e9c1e3cea7dd21b00e81c7f173cb8c9` |
| `src/publisher/index.ts` | `35b9b0ec16013fb5a23ee17c55915a01e62dce0e` | `bf7ee04cebec9aacd14427d2fd24482dbd10a92fc66fc97faeec1d4772ae2035` |
| `src/publisher/parts.ts` | `ed66f33e24a3a4da55481e245a879ef8b86b61ee` | `0b77556c8971cd488df9229aeb2f54af3e229f9f2bf86d4e23a032a6b8a4449f` |
| `src/reader/bytes.ts` | `7e6436f3a97ddcfd490c18e0c09e864e8aa9e772` | `4307a13e8901b6f0474c1dd7f84eaeca9faa5a0936aa14069567de4960513947` |
| `src/reader/event.ts` | `df706b2e1129d08f2ce28570cf5dbcc497ac147e` | `844d882fb02c19c20eea087631d9127c30e35e077b6d634b4e02903d95c26049` |
| `src/reader/index.ts` | `84c5176fd7b641dc137cc7129cb34bd6603a0c21` | `8c045c88b60d697dccd69ca55a775da2ea79d75d4a05314dbfcaf5f71acdd10b` |
| `src/reader/packages.ts` | `d2ed13601b7396c408cd1492d08f7aab4e9c6589` | `75b90193ec093663bb0025c092b7050935e207c57304f77e57fd7ff06eb35d92` |
| `src/reader/transaction.ts` | `b8aac712ea8c7b4883ed5fa2e234a82058b5a583` | `060e83e81afcc6070d92dcd5f741021668a8209cd2cfe4c2be42a977f736ef49` |

`test/sources.test.ts` fails if a copy drifts from the SHA-256 pinned here.
`test/helpers/local-ledger.ts` is adapted (not copied) from upstream's
`tests/helpers/ledger.ts` @ `f2425f2`: a blank ledger-v9 `LedgerState` with real
`ContractDeploy` transactions and `wellFormed` + `apply` with balancing, signatures and
contract proofs relaxed.
