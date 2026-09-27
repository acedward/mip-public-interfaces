#!/usr/bin/env bash
# Levels 1, 2 and 3 of every PI bundle, offline, with the patched public-interface-verify
# (tools/public-interface, UC-2 + UC-3):
#
#   ./scripts/verify-bundles.sh            all four bundles of deployments/bundles.json
#   ./scripts/verify-bundles.sh UPROMPI    just one
#
# Inputs per contract, both produced here by scripts/simulate-pi.ts (the deployment plan
# run in the Compact simulator, verifier keys installed as a deploy installs them):
#   out/sim/<ID>/event-payload.hex   the publishBundle parts the contract emitted, merged
#   out/sim/<ID>/state.hex           the contract's serialized state
# Result: out/sim/<ID>/verify-l3.json (the tool's --json report); the script fails unless
# every bundle reaches Level 3.
#
# Level 3 recompiles each bundle's published source (the whole contract, FULL interface)
# with keys: minutes per contract. It needs a compactc 0.34.0 — COMPACTC=<path to compactc>
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
node --import tsx scripts/simulate-pi.ts "$@"

ids=("$@")
if [ "${#ids[@]}" -eq 0 ]; then
  mapfile -t ids < <(node -e 'for (const b of require("./deployments/bundles.json").bundles) console.log(b.id)')
fi

status=0
for id in "${ids[@]}"; do
  path="$(node -e 'const b=require("./deployments/bundles.json").bundles.find((x)=>x.id===process.argv[1]); if(!b) process.exit(3); console.log(b.path)' "$id")"
  out="out/sim/$id"
  echo; echo "== $id: bundles/$path — Level 3 (recompile with keys)"
  start=$(date +%s)
  set +e
  node tools/public-interface/src/verify.mjs --bundle "bundles/$path" \
    --event-payload "$(cat "$out/event-payload.hex")" --state "$out/state.hex" --level 3 --json > "$out/verify-l3.json"
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
