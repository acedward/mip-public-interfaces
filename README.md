# mip-public-interfaces

Contract sets for testing the **Public Interfaces for Compact Contracts** draft
together with the **Multi-Part Event** draft on Midnight, next to MIP-0018
on-chain token metadata:

- **PI** contracts publish their public interface — a verifiable off-chain bundle
  (source, verifier keys, generated wrapper) whose commitment and URL the contract
  emits as the `mip-xxxx:public-interface[v1]` event — and declare only a
  `repository` key under MIP-0018.
- **DU** (dual) contracts publish MIP-0018 metadata (including values longer than one
  event holds) and a HIDDEN interface side by side.

This repository is the public-interface analogue of
[`acedward/mip-0018-midnight-contracts`](https://github.com/acedward/mip-0018-midnight-contracts)
(same layout: module, generator, deploy and fixture scripts), built on
[OpenZeppelin Compact Contracts](https://github.com/OpenZeppelin/compact-contracts)
v0.4.0-alpha.3 wherever it has a module.

| Tag | Standard | Pinned text |
|---|---|---|
| [A] | MIP-0018 On-Chain Token Metadata Emission, `mip-0018:token-metadata[v1]`, with the UC-1 amendment in development (2-byte `val-len`, multi-part values) | [`acedward/mip-0018-midnight-contracts`](https://github.com/acedward/mip-0018-midnight-contracts) |
| [B] | Public Interfaces for Compact Contracts (draft), `mip-xxxx:public-interface[v1]` | [`acedward/public-interfaces-for-compact-contracts`](https://github.com/acedward/public-interfaces-for-compact-contracts) PR #6 @ `1cf9477` |
| [Y] | Multi-Part Event (draft), `mip-xxxx:multi-part[v1]` | [`acedward/compact-multi-part-event`](https://github.com/acedward/compact-multi-part-event) PR #1 @ `f2425f2` |

Everything here is **in development** and is exercised on a local Midnight 2.x chain;
nothing is deployed to a public network yet.

Status: **in development** (branch `feat/00024-02-public-interface`).

## Layout

```
contracts/TokenMetadata.compact      MIP-0018 module (UC-1 layout, emitter secret) — vendored, see contracts/SOURCE.md
contracts/OffChainInterface.compact  [B]'s publishBundle module — vendored, see contracts/SOURCE.md
contracts/probe/                     PublicInterfaceProbe: publishBundle behind the emitter secret (a test harness)
contracts/managed/                   compiler output (generated JS/TS, ZKIR, metadata, verifier keys; no proving keys)
tools/public-interface/              public-interface-deploy-check / public-interface-verify: a patched copy of
                                     [B]'s reference tools (own npm package; see its SOURCE.md)
vendor/compact-multi-part-event/     [Y]'s reference publisher and reader, unmodified (see its SOURCE.md)
scripts/                             compile, tools harness; generator, deploy, bundle and fixture scripts to come
deployments/                         the contract matrix and public deployment records
fixtures/                            test inputs exported for the token indexer
test/                                this repository's tests (vitest)
```

**Publishing a long pointer.** Events named `mip-xxxx:public-interface[v1]` follow the
Multi-Part Event rule here (an amendment in development of [B]): a bundle pointer is
`commitment ++ utf8(index.json URL)`, zero padded to `256·k` bytes, and a URL longer
than 224 bytes is published as `k` `publishBundle(part)` calls in ONE guaranteed intent
— built with [Y]'s reference publisher (`vendor/compact-multi-part-event`). The patched
tools split, discover and verify such pointers (`tools/public-interface/SOURCE.md`).

## Toolchain

| Piece | Version |
|---|---|
| Compact compiler | `compactc` 0.34.0 (`compact compile +0.34.0`; language 0.26.0, runtime 0.19.0) |
| `@midnight-ntwrk/compact-runtime` | 0.19.0 |
| `@midnightntwrk/ledger-v9` | 1.0.0-rc.5 — pinned as a dependency **and** in `overrides`, so exactly one copy is installed |
| `@midnightntwrk/onchain-runtime-v4` | 4.0.0-rc.3 |
| `@openzeppelin/compact-contracts` | 0.4.0-alpha.3 |
| Node / npm | Node 24.21 with npm 11.19 (e.g. `node:24-bookworm-slim`); older npm 11 releases can crash on `overrides` |

```sh
npm ci
npm run tools:ci      # the patched public-interface tools are their own npm package
npm run typecheck
npm test              # this repository's tests (the one-copy pin check, the publisher test)
npm run tools:check   # the tools' own build and suite (minutes: it compiles [B]'s examples with keys)
./scripts/compile.sh  # recompile contracts/managed/ with compactc 0.34.0
```

The public-interface tools are called `public-interface-deploy-check` and
`public-interface-verify` (`npm run public-interface-verify -- --help`); the copied
binaries keep their upstream names `coc-deploy-check` / `coc-verify` as aliases.

## License

Apache-2.0 — see [LICENSE](./LICENSE).
