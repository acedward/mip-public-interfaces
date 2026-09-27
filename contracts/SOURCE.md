# Sources of the vendored Compact modules

The two modules below are **copies, unmodified**, of pinned upstream files. Do not edit
them here: change them upstream and re-copy, then update this table.
`test/sources.test.ts` fails if a copy's SHA-256 drifts from the value pinned here.

| File | Upstream repository | Commit | Upstream path | Git blob | SHA-256 of the copy |
|---|---|---|---|---|---|
| `TokenMetadata.compact` | [`acedward/mip-0018-midnight-contracts`](https://github.com/acedward/mip-0018-midnight-contracts), branch `feat/00024-01-mip-0018` | `cb6c675ddbbb4a82d0bcaf87ad863c934becce31` | `contracts/TokenMetadata.compact` | `9772bfbc23de554db45256e9c34d5d798aa7c670` | `7d16b4da4209f48815da07950513bbd58b2f14d795db8fe54f7fd2d5b7fb5847` |
| `OffChainInterface.compact` | [`acedward/public-interfaces-for-compact-contracts`](https://github.com/acedward/public-interfaces-for-compact-contracts), PR #6 head | `1cf947786d55739ec4e89aef9258ebef0d8687fa` (file last changed in `cb92708766b60a0abfcdce53d1772baa1318e122`) | `compact/OffChainInterface.compact` | `cfff5194df63708ffe1a9782dfe7f1226441b1e6` | `c9aaba4de48b17ac3c532e296a223da95836e5ad0d3f0e83f5d15f35cfc94f88` |

## What each one is

- **`TokenMetadata.compact`** — the MIP-0018 reference module on the UC-1 layout (an
  amendment in development of `mip-0018:token-metadata[v1]`: 2-byte little-endian
  `val-len` at offset 66, value from offset 68, one declaration per package, values of
  any length as multi-part packages), with the **emitter secret** (`emitterSecretHash`
  sealed ledger field, `emitterSecret` witness, `initializeEmitter`, `assertEmitter`).
  Every emitting circuit of this repository's contracts — metadata circuits **and**
  `publishBundle` — calls `assertEmitter()` first, so one secret per contract gates
  every event it emits.
- **`OffChainInterface.compact`** — the only contract code the Public Interfaces draft
  adds: `publishBundle(payload: Bytes<256>)`, which emits the `Misc` event
  `pad(32, "mip-xxxx:public-interface[v1]")`. The module has no access control of its
  own; this repository's contracts wrap it in a circuit that checks the emitter secret
  first. Under the Multi-Part Event opt-in (UC-2 of project 00024), a bundle pointer
  whose `index.json` URL does not fit one event (more than 224 bytes) is published as
  several `publishBundle` calls in ONE guaranteed intent; the reader merges them into
  one package, `commitment ++ utf8(url)`, zero padded to `256·k` bytes. The module
  itself is unchanged by that: each call still emits one 256-byte part.

Both carry `SPDX-License-Identifier: Apache-2.0` upstream.
