# tools/public-interface — source

A **patched copy** of the reference tools of the *Public Interfaces for Compact
Contracts* draft: `public-interface-deploy-check` (the publisher's pre-publish check,
`src/deployer.mjs`) and `public-interface-verify` (the consumer's Level 1/2/3 check,
`src/verify.mjs`), with their own test suite.

| | |
|---|---|
| Upstream | [`acedward/public-interfaces-for-compact-contracts`](https://github.com/acedward/public-interfaces-for-compact-contracts) |
| Pinned commit | `1cf947786d55739ec4e89aef9258ebef0d8687fa` (PR #6 head; `src/`, `compact/` unchanged since `1879be5`) |
| Copied with | `git archive 1cf9477 -- .gitignore LICENSE NOTICE README.md package.json package-lock.json vitest.config.mjs compact compact-examples scripts src test deploy-tools` |
| License | Apache-2.0 (`LICENSE`, `NOTICE` kept as upstream ships them) |

The upstream repository stays read-only: every change below is a local patch whose
diff is recorded, with its rationale, in project 00024's upstream log
(`spec/00024-upstream-spec-changes.md` of the organizer; entries UC-2, UC-3, UC-6, UC-7, UC-15).

## What differs from the pinned commit

The copy commit changes nothing in the tools. Each patch after it is ONE commit of
this repository, so `git log -- tools/public-interface` lists them:

| Commit | Change | Upstream log |
|---|---|---|
| copy (`00024-02-A3a`) | not copied: `MIP-SPEC-DRAFT.md` (the draft's normative text — cite upstream, do not fork it) and `deploy-tools/package.json` + `deploy-tools/package-lock.json` (the live example's Stagenet deployer; never installed or run here — the tests use only its no-dependency, no-network paths — and its lock pins a second `ledger-v9`, 1.0.0-rc.3). `package.json` gains the bin aliases `public-interface-verify` and `public-interface-deploy-check` beside `coc-verify` / `coc-deploy-check` (same files) | UC-6 |
| test-only (`00024-02-A3a2`) | `test/readme.test.mjs`: two expectations follow PR #6's rewritten README (upstream drift, both fail on the pinned commit); `package.json`: devDependency `@scure/bip39` 2.0.1 (deploy-tools' own pin) so Vite resolves `deploy-tools/profile.mjs`'s dynamic import from this package instead of the parent repository's hoisted 1.6.0 (a nesting artifact; the function is never called by the tests). Questions file Q24 | UC-8 |
| UC-3 patch (`00024-02-A3b`) | deploy-check accepts interfaces whose circuits take a witness and marks those circuits **verify-only**; verify reaches Level 1–3 on them; execution still refuses a bundle that declares a witness | UC-3 |
| UC-2 patch (`00024-02-A3c`) | multi-part pointers: a `256·k` payload (commitment ++ URL, zero padded) split into 256-byte parts (deploy-check prints one `publishBundle` call per part); the parser takes `256·k`; publications discovered as Multi-Part Event packages grouped by transaction and intent (the intent from each event's `raw`, so `@midnightntwrk/ledger-v9` 1.0.0-rc.5 becomes a dependency and an override — project 00024 standing instruction 17), newest in canonical order (block, transaction, first part); `scripts/simulate-deploy.mjs` emits one event per part; tests: `test/multipart.test.mjs` (new; incl. `test/fixtures/live-event.json`, the live Stagenet publication's real `raw` event), `hash`, `size`, `indexer` updated | UC-2 |
| bundle licence + README patch (`00024-02-E2-C1+C3`, 02-E audit) | `src/bundle.mjs` `assembleBundle` takes two optional arguments: `extraFiles` (files the publisher ships — here `LICENSE`, `NOTICE`, `SOURCE.md` — written before `index.json`, so they are listed and committed like every file; a path the index cannot carry is refused, an existing file is never replaced) and `interfaceKind: 'full'`; the generated README of a bundle that declares witnesses says it is verified at Levels 1–3 and never executed (no `--circuit` example: `src/execute.mjs` refuses such a bundle, UC-3), a FULL interface is not called "deliberately partial", and listed extra files get a "Licence and provenance" section. `src/deployer.mjs` `deployCheck` passes both through. Without them the README and the bundle are byte-identical to upstream's | UC-15 |

## Multi-part: the format versus the tools

Two different statements, both true after UC-2 and only the first before it:

- **The payload format extends to several parts.** A pointer is `commitment ++
  utf8(url)`, zero padded; read as "32 bytes, then everything up to the trailing
  zeros", a `256·k` payload is the same layout with a longer URL, and a URL of up to
  224 bytes is byte for byte the original one-event payload. Nothing in the format had
  to change.
- **The tools build, discover and parse several parts.** Upstream's tools did not:
  `deployer.mjs` refused URLs over 224 bytes, `hash.mjs` built and parsed exactly 256
  bytes, and `indexer.mjs` took the last individual event. After UC-2, deploy-check
  splits the pointer into parts, the parser takes `256·k` bytes, and the indexer reader
  forms Multi-Part Event packages — events of the name grouped by transaction and intent,
  the intent read from each event's `raw` bytes — and picks the newest package in
  canonical order. `test/multipart.test.mjs` tests the two statements separately.

## Running the suite

The tests need the examples built (`scripts/build.sh`, several minutes with key
generation) and a `compact` that compiles with 0.34.0. Upstream's scripts assume
macOS (`stat -f %m`) and the `compact` CLI's default toolchain; the repository root's
`scripts/tools-check.sh` supplies both on Linux without changing the copy:

```sh
./scripts/tools-check.sh                       # from the repository root
COMPACTC=/path/to/compactc ./scripts/tools-check.sh   # a compactc 0.34.0 binary instead of the CLI
```

`test/check-repo.test.mjs` skips here (this directory is not a git checkout root), and
`scripts/check-repo.mjs` describes upstream's own repository layout; neither applies to
the copy.
