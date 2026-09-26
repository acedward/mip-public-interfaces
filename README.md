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

Status: **scaffold** — the contract sets arrive on the
`feat/00024-02-public-interface` branch.

## License

Apache-2.0 — see [LICENSE](./LICENSE).
