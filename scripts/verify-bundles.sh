#!/usr/bin/env bash
# Levels 1, 2 and 3 of every bundle (the PI set's FULL and the DU set's HIDDEN ones), offline,
# with the patched public-interface-verify
# (tools/public-interface, UC-2 + UC-3):
#
#   ./scripts/verify-bundles.sh            every bundle of deployments/bundles.json
#   ./scripts/verify-bundles.sh UPROMPI    just one
#
# Inputs per contract, both produced here by scripts/simulate-pi.ts (the deployment plan
# run in the Compact simulator, verifier keys installed as a deploy installs them):
#   out/sim/<ID>/event-payload.hex   the publishBundle parts the contract emitted, merged
#   out/sim/<ID>/state.hex           the contract's serialized state
# A second bundle of a contract (a record with `contract`, e.g. LMOONDU-v2 for the P2 pair)
# is verified against that contract's state, with its own recorded payload as the event.
# Result: out/sim/<ID>/verify-l3.json (the tool's --json report); the script fails unless
# every bundle reaches Level 3.
#
# Level 3 recompiles each bundle's published source (the whole contract for a FULL interface,
# the interface file for a HIDDEN one) with keys: minutes per contract. It needs a compactc 0.34.0 — COMPACTC=<path to compactc>
# (e.g. the toolchain mounted into a container), otherwise the `compact` CLI with
# `+0.34.0` — and the zk parameters up to k=18 (MIDNIGHT_PP or ~/.cache/midnight/zk-params).
# Nothing is fetched: the bundles are read from bundles/<path>/.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHIM="$(mktemp -d)"
trap 'rm -rf "$SHIM"' EXIT

if [ -n "${COMPACTC:-}" ]; then
  [ -x "$COMPACTC" ] || { echo "COMPACTC=$COMPACTC is not executable" >&2; exit 2; }
  cat > "$SHIM/compact" <<EOF
#!/bin/sh
[ "\${1:-}" = compile ] || { echo "compact stand-in: only 'compile' is supported" >&2; exit 2; }
shift
case "\${1:-}" in +0.34.0) shift ;; +*) echo "compact stand-in: only 0.34.0 is available" >&2; exit 2 ;; esac
exec "$COMPACTC" "\$@"
EOF
else
  REAL_COMPACT="$(command -v compact)" || { echo "neither COMPACTC nor the compact CLI is available" >&2; exit 2; }
  cat > "$SHIM/compact" <<EOF
#!/bin/sh
[ "\${1:-}" = compile ] || exec "$REAL_COMPACT" "\$@"
shift
case "\${1:-}" in +*) shift ;; esac
exec "$REAL_COMPACT" compile +0.34.0 "\$@"
EOF
fi
chmod 755 "$SHIM/compact"
export COMPACT_BIN="$SHIM/compact"
echo "== $("$COMPACT_BIN" compile --version | head -1) (COMPACT_BIN=$COMPACT_BIN)"

cd "$ROOT"
ids=("$@")
if [ "${#ids[@]}" -eq 0 ]; then
  mapfile -t ids < <(node -e 'for (const b of require("./deployments/bundles.json").bundles) console.log(b.id)')
fi
# The contracts whose plans to simulate: each bundle's own contract (a second bundle's `contract`).
mapfile -t contracts < <(node -e 'const all=require("./deployments/bundles.json").bundles; const s=new Set(); for (const id of process.argv.slice(1)) { const b=all.find((x)=>x.id===id); if(!b) { console.error("no bundle "+id); process.exit(3); } s.add(b.contract ?? b.id); } for (const c of s) console.log(c)' "${ids[@]}")
node --import tsx scripts/simulate-pi.ts "${contracts[@]}"

status=0
for id in "${ids[@]}"; do
  path="$(node -e 'const b=require("./deployments/bundles.json").bundles.find((x)=>x.id===process.argv[1]); if(!b) process.exit(3); console.log(b.path)' "$id")"
  contract="$(node -e 'const b=require("./deployments/bundles.json").bundles.find((x)=>x.id===process.argv[1]); console.log(b.contract ?? b.id)' "$id")"
  out="out/sim/$id"
  mkdir -p "$out"
  if [ "$contract" = "$id" ]; then
    payload="$(cat "$out/event-payload.hex")"
  else
    # a second bundle: its own pointer, the contract's simulated state
    payload="$(node -e 'console.log(require("./deployments/bundles.json").bundles.find((x)=>x.id===process.argv[1]).payloadHex)' "$id")"
  fi
  echo; echo "== $id: bundles/$path — Level 3 (recompile with keys) against $contract's state"
  start=$(date +%s)
  set +e
  node tools/public-interface/src/verify.mjs --bundle "bundles/$path" \
    --event-payload "$payload" --state "out/sim/$contract/state.hex" --level 3 --json > "$out/verify-l3.json"
  rc=$?
  set -e
  secs=$(( $(date +%s) - start ))
  summary="$(node -e '
    const r = require(process.argv[1]);
    const rows = (r.checks.level3 && r.checks.level3.rows) || [];
    const fails = rows.filter((x) => x.status !== "OK").map((x) => x.item + " " + x.status + (x.reason ? " (" + x.reason + ")" : ""));
    console.log(`level ${r.level}/${r.requestedLevel}; L1 ${r.checks.level1.ok}; L2 ${r.checks.level2 && r.checks.level2.ok}; L3 ${r.checks.level3 && r.checks.level3.ok} (${rows.length} items${fails.length ? "; " + fails.join("; ") : ""}${r.checks.level3 && r.checks.level3.error ? "; " + r.checks.level3.error : ""}); parts ${r.event.parts}; url ${Buffer.byteLength(r.event.url)} B`);
    process.exit(r.level === 3 ? 0 : 1);
  ' "$ROOT/$out/verify-l3.json")" || status=1
  echo "   exit $rc, ${secs} s: $summary"
done
exit "$status"
