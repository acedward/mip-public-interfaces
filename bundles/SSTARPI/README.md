# Published contract interface

This directory is the off-chain interface bundle for a Midnight contract. The
contract advertises a 32-byte commitment to `index.json` and the URL of
that `index.json` in its public-interface event, which its
`publishBundle` circuit emits. The newest such event wins.

| | |
|---|---|
| URL | `http://bundles/SSTARPI/index.json` |
| Contract address | _not recorded — pass `--address` to the verifier_ |
| Indexer | _not recorded — pass `--indexer` to the verifier_ |
| Published circuits | `name`, `symbol`, `decimals`, `domainSep`, `tokenColor`, `mint`, `publishRepository`, `publishBundle` |
| Compiler / language / runtime | 0.34.0 / 0.26.0 / 0.19.0 |

## Verify

Use a verifier you obtained independently of this bundle, for example the one in
the repository that built it (https://github.com/acedward/compact-off-chain-circuits):

```sh
node <compact-off-chain-circuits>/src/verify.mjs --bundle-url http://bundles/SSTARPI/index.json \
  --indexer <graphql url> --address <hex> --level 3
```

This interface declares witnesses (`emitterSecret`): its circuits take
private inputs a consumer does not have, so they are verified, not executed. Without
`--bundle-url` the verifier takes the URL from the contract's latest public-interface
event. It downloads `index.json`, checks it against the commitment on chain, then
downloads each file it lists into a private temporary directory and checks its sha256
(Level 1); it checks that every verifier key is the key the chain stores for that entry
point (Level 2); with `--level 3` it recompiles `src/generated/SSTARPI.compact` with your
installed compact (this bundle was built with 0.34.0) and checks that it reproduces the
shipped keys, `out/contract/index.js` and `out/compiler/contract-info.json` byte for
byte. Nothing is executed or submitted and no proof is produced. Files that
`index.json` does not list are never fetched.

Offline, check a local copy of this directory and supply the inputs directly:

```sh
node <compact-off-chain-circuits>/src/verify.mjs --bundle <this directory> \
  --event-payload <payload hex, 256 bytes per part> --state <state hex or file> --level 3
```

## What is here

`index.json` lists every other file with its sha256 and size. `src/` is the
published source: the contract's WHOLE source — a FULL interface, every circuit of the
contract is published — and the modules it imports. `out/` is what
that source compiles to: one verifier key per published circuit, the generated
wrapper that executes them, and the compiler's contract description. Prover keys
and zkir are not needed to read and are not shipped.

Upload this directory as is, so that the URL above serves its `index.json` and
each listed file is served at its path relative to it. A changed or missing
listed file fails verification; extra files on the host are ignored.

## Licence and provenance

`LICENSE`, `NOTICE`, `SOURCE.md` state the licences, attributions and provenance of the
files here. They are listed in `index.json` like every other file.
