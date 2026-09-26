#!/usr/bin/env bash
# Compile this repository's contracts with the pinned Compact toolchain.
#
#   ./scripts/compile.sh                    every contract below, into contracts/managed/<name>/
#   ./scripts/compile.sh probe/PublicInterfaceProbe   just one (path under contracts/, no .compact)
#   ./scripts/compile.sh --check            compile into a temp tree and diff against the
#                                           committed one (implies SKIP_ZK: keys are not compared)
#   SKIP_ZK=true ./scripts/compile.sh       no key generation (TypeScript output only)
#
# Layout and rules as in acedward/mip-0018-midnight-contracts: `compact compile +0.34.0`
# (the host default toolchain is untouched), one contract at a time (key generation is
# the memory peak), the source map rooted at the repository. Proving keys are not
# committed; verifier keys ARE (.gitignore): a public-interface bundle ships them and
# Level 2 compares them with the chain.
set -euo pipefail

COMPACT_VERSION="${COMPACT_VERSION:-0.34.0}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$ROOT/contracts"
OUT_DIR="$SRC_DIR/managed"

# TokenMetadata.compact and OffChainInterface.compact are modules (vendored, see
# contracts/SOURCE.md); every importer compiles them transitively.
CONTRACTS=(
  "probe/PublicInterfaceProbe"
)

CHECK=0
SELECTED=()
for arg in "$@"; do
  case "$arg" in
    --check) CHECK=1 ;;
    -*) echo "unknown flag: $arg" >&2; exit 2 ;;
    *) SELECTED+=("$arg") ;;
  esac
done
if [ "${#SELECTED[@]}" -gt 0 ]; then CONTRACTS=("${SELECTED[@]}"); fi

compiler() { compact compile "+$COMPACT_VERSION" "$@"; }
# The generated source map records the path from the target directory back to the
# sources; this is the value a compile into contracts/managed/<name>/ produces.
SOURCE_ROOT='../../../'

echo "== compactc $(compiler --version) (language $(compiler --language-version), runtime $(compiler --runtime-version))"
FLAGS=()
if [ "$CHECK" = "1" ]; then SKIP_ZK=true; fi
if [ "${SKIP_ZK:-}" = "true" ]; then FLAGS+=(--skip-zk); echo "== SKIP_ZK=true: no keys will be generated"; fi

TARGET_ROOT="$OUT_DIR"
if [ "$CHECK" = "1" ]; then
  TARGET_ROOT="$(mktemp -d)"
  trap 'rm -rf "$TARGET_ROOT"' EXIT
fi

for name in "${CONTRACTS[@]}"; do
  src="$SRC_DIR/$name.compact"
  [ -f "$src" ] || { echo "missing source: $src" >&2; exit 1; }
  out="$TARGET_ROOT/$(basename "$name")"
  echo; echo "== $name"
  if avail_mb=$(free -m 2>/dev/null | awk '/^Mem:/ {print $7}') && [ -n "$avail_mb" ]; then
    echo "   memory: ${avail_mb} MiB available"
    if [ "${SKIP_ZK:-}" != "true" ] && [ "$avail_mb" -lt 1536 ]; then
      echo "   refusing to generate keys with less than 1.5 GiB available" >&2; exit 3
    fi
  fi
  mkdir -p "$out"
  compiler ${FLAGS[@]+"${FLAGS[@]}"} --sourceRoot "$SOURCE_ROOT" "$src" "$out"
done

if [ "$CHECK" = "1" ]; then
  status=0
  for name in "${CONTRACTS[@]}"; do
    base="$(basename "$name")"
    # --skip-zk writes an empty expectedVk table and no keys, so index.js, its source
    # map and the manifest (which hashes them) differ from a keyed build: compare the rest.
    if diff -r -q -x keys -x '*.bzkir' -x index.js -x index.js.map -x contract-manifest.json "$OUT_DIR/$base" "$TARGET_ROOT/$base"; then
      echo "== $base: managed/ matches the sources (index.js, its map and the manifest excluded: they embed key hashes)"
    else
      echo "== $base: managed/ DIFFERS from a fresh compile" >&2; status=1
    fi
  done
  exit "$status"
fi
echo; echo "== done; artefacts in $OUT_DIR"
