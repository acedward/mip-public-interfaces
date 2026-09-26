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
(`spec/00024-upstream-spec-changes.md` of the organizer; entries UC-2, UC-3, UC-6, UC-7).

## What differs from the pinned commit

The copy commit changes nothing in the tools. Each patch after it is ONE commit of
this repository, so `git log -- tools/public-interface` lists them:

| Commit | Change | Upstream log |
|---|---|---|
| copy (`00024-02-A3a`) | not copied: `MIP-SPEC-DRAFT.md` (the draft's normative text — cite upstream, do not fork it) and `deploy-tools/package.json` + `deploy-tools/package-lock.json` (the live example's Stagenet deployer; never installed or run here — the tests use only its no-dependency, no-network paths — and its lock pins a second `ledger-v9`, 1.0.0-rc.3). `package.json` gains the bin aliases `public-interface-verify` and `public-interface-deploy-check` beside `coc-verify` / `coc-deploy-check` (same files) | UC-6 |
| UC-3 patch (`00024-02-A3b`) | deploy-check accepts interfaces whose circuits take a witness and marks those circuits **verify-only**; verify reaches Level 1–3 on them; execution still refuses a bundle that declares a witness | UC-3 |
| UC-2 patch (`00024-02-A3c`) | multi-part pointers: a `256·k` payload (commitment ++ URL, zero padded) split into 256-byte parts; the parser takes `256·k`; publications discovered as Multi-Part Event packages grouped by transaction and intent (the intent from each event's `raw`), newest in canonical order (block, transaction, first part) | UC-2 |

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
