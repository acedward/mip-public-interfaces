// SPDX-License-Identifier: Apache-2.0
//
// The vendored files are unmodified copies of pinned upstream files: the Compact
// modules (contracts/SOURCE.md) and the Multi-Part Event publisher and reader
// (vendor/compact-multi-part-event/SOURCE.md). A copy that drifts from its pinned
// SHA-256 fails here.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const CONTRACTS = join(ROOT, 'contracts');
const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

/** `[file, sha256]` for every row of contracts/SOURCE.md's table. */
const pinned = (): [string, string][] =>
  readFileSync(join(CONTRACTS, 'SOURCE.md'), 'utf8')
    .split('\n')
    .filter((line) => /^\| `[^`]+\.compact` \|/.test(line))
    .map((line) => {
      const cells = line.split('|').map((c) => c.trim());
      const file = /^`([^`]+)`$/.exec(cells[1] ?? '')?.[1];
      const digest = /^`([0-9a-f]{64})`$/.exec(cells[cells.length - 2] ?? '')?.[1];
      if (!file || !digest) throw new Error(`malformed SOURCE.md row: ${line}`);
      return [file, digest];
    });

const VENDOR_Y = join(ROOT, 'vendor', 'compact-multi-part-event');

/** `[path, sha256]` for every row of vendor/compact-multi-part-event/SOURCE.md's file table. */
const pinnedY = (): [string, string][] =>
  readFileSync(join(VENDOR_Y, 'SOURCE.md'), 'utf8')
    .split('\n')
    .filter((line) => /^\| `(LICENSE|src\/[^`]+)` \| `[0-9a-f]{40}` \| `[0-9a-f]{64}` \|$/.test(line))
    .map((line) => {
      const [, path, , digest] = line.split('|').map((c) => c.trim().replace(/`/g, ''));
      return [path ?? '', digest ?? ''];
    });

describe('the vendored Multi-Part Event publisher and reader (vendor/compact-multi-part-event/SOURCE.md)', () => {
  it('pins LICENSE and every file of src/publisher and src/reader', () => {
    const files = pinnedY().map(([path]) => path);
    expect(files).toContain('LICENSE');
    expect(files.filter((f) => f.startsWith('src/publisher/'))).toHaveLength(7);
    expect(files.filter((f) => f.startsWith('src/reader/'))).toHaveLength(5);
  });

  it.each(pinnedY())('%s is byte-identical to its pinned upstream copy', (path, digest) => {
    expect(sha256(readFileSync(join(VENDOR_Y, path)))).toBe(digest);
  });
});

describe('vendored Compact modules (contracts/SOURCE.md)', () => {
  it('pins exactly TokenMetadata.compact and OffChainInterface.compact', () => {
    expect(pinned().map(([file]) => file).sort()).toEqual(['OffChainInterface.compact', 'TokenMetadata.compact']);
  });

  it.each(pinned())('%s is byte-identical to its pinned upstream copy', (file, digest) => {
    expect(sha256(readFileSync(join(CONTRACTS, file)))).toBe(digest);
  });

  it('TokenMetadata carries the UC-1 event name and the emitter secret; OffChainInterface the [B] event name', () => {
    const tm = readFileSync(join(CONTRACTS, 'TokenMetadata.compact'), 'utf8');
    expect(tm).toContain('return pad(32, "mip-0018:token-metadata[v1]");');
    expect(tm).toContain('export circuit assertEmitter(): []');
    expect(tm).toContain('witness emitterSecret(): Bytes<32>;');
    const oci = readFileSync(join(CONTRACTS, 'OffChainInterface.compact'), 'utf8');
    expect(oci).toContain('export circuit publishBundle(payload: Bytes<256>): []');
    expect(oci).toContain('name: pad(32, "mip-xxxx:public-interface[v1]")');
  });
});
