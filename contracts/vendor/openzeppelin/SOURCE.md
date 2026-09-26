# Sources of the vendored OpenZeppelin Compact modules

The files below are **copies, unmodified**, of OpenZeppelin Compact Contracts
**v0.4.0-alpha.3** — the same bytes as the npm package
`@openzeppelin/compact-contracts@0.4.0-alpha.3` this repository pins (a devDependency)
and as the git tag. Do not edit them here: re-copy from a new pin and update this
table. `test/sources.test.ts` fails if a copy drifts from its SHA-256 below or from the
installed npm package's file.

| | |
|---|---|
| Upstream | [`OpenZeppelin/compact-contracts`](https://github.com/OpenZeppelin/compact-contracts) |
| Tag / commit | `v0.4.0-alpha.3` / `2109614046377d883094a1d7618ecce1f26c0fe8` |
| Copied with | `git show 2109614:contracts/src/<path>.compact` (and `git show 2109614:LICENSE`) |
| License | MIT (`LICENSE`, as upstream ships it; each file carries `SPDX-License-Identifier: MIT`) |

| File | Upstream path | Git blob | SHA-256 of the copy |
|---|---|---|---|
| `token/FungibleToken.compact` | `contracts/src/token/FungibleToken.compact` | `53c4ba49729b1c35accdaf10cc187edae610cb03` | `78047c735811c133b82369c9e23acf49a9706d0473dfa959d9cf7eea2ef42021` |
| `token/NativeShieldedToken.compact` | `contracts/src/token/NativeShieldedToken.compact` | `a0c8d5047c8062e5e070387a39b9d8aacd34d481` | `b977c419ec885dcdafe3149f6e1177197629fe6d58f683748d023c550d5c9905` |
| `token/NativeShieldedTokenCore.compact` | `contracts/src/token/NativeShieldedTokenCore.compact` | `983b740302a2f48978781b3ef6461557bb3825dd` | `1edaac1a5f4a53cf102c78216272852633afd55e3cd8bf9ab146f62e679f33a6` |
| `token/NativeShieldedTokenFamily.compact` | `contracts/src/token/NativeShieldedTokenFamily.compact` | `aceef835118e8404c728aee5e819e84a01c8cca3` | `9044376825f40799dd8af4fc863253111bb4842f90b308e10e448ff1e333848e` |
| `utils/Utils.compact` | `contracts/src/utils/Utils.compact` | `f90313bb8a3d33b5521da0d4cea7f1d6a5fe9169` | `215d6374bb22a7c950bb43d046f6380f2c432fb841a2fcead2a35766d159f314` |
| `LICENSE` | `LICENSE` | `e22ac902fcb2307a92b6a0fc4322cfd5e6cdee7e` | `962972db2ada97eed6e24955d0e477784e77a5c226aa451b8fbd0029cf244501` |

## Why a copy instead of importing from `node_modules`

A public-interface bundle ships the published source **and every module it imports**
(`tools/public-interface/src/bundle.mjs` `resolveImports`), and its path rules refuse
any path with a `node_modules` segment (`src/hash.mjs` `pathProblem`; the walker skips
`node_modules` too). The FULL interfaces of this repository publish the whole contract
source, so the OpenZeppelin modules they build on must live at a path a bundle can
carry. The same holds for the `repository` declaration: the source it points at on
GitHub must be complete without an `npm install`. The Public Interfaces reference
repository vendors OpenZeppelin the same way (`compact-examples/openzeppelin/vendor/`).

Only the modules the generated contracts import (directly or transitively) are copied:
`FungibleToken` → `Utils`; `NativeShieldedToken` → `NativeShieldedTokenCore` → `Utils`;
`NativeShieldedTokenFamily` → `NativeShieldedTokenCore` → `Utils`.
