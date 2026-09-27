#!/usr/bin/env bash
# Build the Public Interfaces reference tools' examples and run their own test suite
# on this repository's patched copy (tools/public-interface/, see its SOURCE.md).
#
#   ./scripts/tools-check.sh            npm ci (if needed) + build + test
#   ./scripts/tools-check.sh --force    rebuild every example (passed to build.sh)
#
# The copy's scripts and tests are kept as upstream wrote them; this harness supplies
# the environment they assume:
#   * `compact`: the tests call `compact compile <src> <out>` with the DEFAULT
#     toolchain. Here it is pinned to 0.34.0: with COMPACTC=<path to compactc 0.34.0>
#     that binary runs directly (e.g. a toolchain mounted into a container); otherwise
#     the `compact` CLI runs `compact compile +0.34.0` (the host default is untouched).
#   * `stat`: upstream's scripts/build.sh calls BSD `stat -f %m` (macOS). On a GNU
#     system that exits non-zero and the script stops; a shim maps it to `stat -c %Y`.
#   * vitest's worker RPC timeout: upstream's tests compile synchronously
#     (execFileSync) inside the vitest worker; generating the keys of a circuit that
#     emits a runtime Bytes<256> payload takes minutes on a slower host, longer than
#     vitest's fixed 60 s worker RPC timeout, which then reports one unhandled error
#     ("Timeout calling \"onTaskUpdate\"") and exits 1 although every test passed.
#     This harness accepts that run with a WARNING only when every test passed and
#     every unhandled error is that timeout; anything else keeps its exit status.
# Key generation needs the zk parameters (MIDNIGHT_PP or ~/.cache/midnight/zk-params).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS="$ROOT/tools/public-interface"
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

if stat --version >/dev/null 2>&1; then   # GNU coreutils: no BSD `stat -f %m`
  REAL_STAT="$(command -v stat)"
  cat > "$SHIM/stat" <<EOF
#!/bin/sh
if [ "\${1:-}" = -f ] && [ "\${2:-}" = %m ]; then shift 2; exec "$REAL_STAT" -c %Y "\$@"; fi
exec "$REAL_STAT" "\$@"
EOF
  chmod 755 "$SHIM/stat"
fi

export COMPACT_BIN="$SHIM/compact"
export PATH="$SHIM:$PATH"
echo "== compactc $("$COMPACT_BIN" compile --version)"

cd "$TOOLS"
[ -d node_modules ] || npm ci
./scripts/build.sh "$@"

LOG="$SHIM/vitest.log"
set +e
npm test > "$LOG" 2>&1
rc=$?
set -e
cat "$LOG"
if [ "$rc" -ne 0 ]; then
  plain="$(sed 's/\x1b\[[0-9;]*m//g' "$LOG")"
  errors="$(sed -n 's/^ *Errors *\([0-9][0-9]*\) errors\{0,1\}.*/\1/p' <<<"$plain" | tail -1)"
  timeouts="$(grep -c 'Error: \[vitest-worker\]: Timeout calling "onTaskUpdate"' <<<"$plain" || true)"
  if grep -Eq '^ *Tests +[0-9]+ passed' <<<"$plain" && ! grep -Eq '^ *(Tests|Test Files) .*failed' <<<"$plain" \
     && [ -n "$errors" ] && [ "$errors" -ge 1 ] && [ "$errors" = "$timeouts" ]; then
    echo "== WARNING: every test passed; vitest reported $errors unhandled worker RPC timeout(s) (a synchronous compile outlasted its 60 s RPC timeout) — accepted, see the header of this script"
    exit 0
  fi
  exit "$rc"
fi
