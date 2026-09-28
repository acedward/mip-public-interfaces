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

const VENDOR_OZ = join(CONTRACTS, 'vendor', 'openzeppelin');

/** `[file, sha256]` for every row of contracts/vendor/openzeppelin/SOURCE.md's file table. */
const pinnedOz = (): [string, string][] =>
  readFileSync(join(VENDOR_OZ, 'SOURCE.md'), 'utf8')
    .split('\n')
    .filter((line) => /^\| `[^`]+` \| `[^`]+` \| `[0-9a-f]{40}` \| `[0-9a-f]{64}` \|$/.test(line))
    .map((line) => {
      const cells = line.split('|').map((c) => c.trim().replace(/`/g, ''));
      return [cells[1] ?? '', cells[4] ?? ''];
    });

describe('the vendored OpenZeppelin Compact modules (contracts/vendor/openzeppelin/SOURCE.md)', () => {
  it('pins the five modules the PI contracts import (transitively) and the LICENSE', () => {
    expect(pinnedOz().map(([file]) => file).sort()).toEqual([
      'LICENSE',
      'token/FungibleToken.compact',
      'token/NativeShieldedToken.compact',
      'token/NativeShieldedTokenCore.compact',
      'token/NativeShieldedTokenFamily.compact',
      'utils/Utils.compact',
    ]);
  });

  it.each(pinnedOz())('%s is byte-identical to its pinned upstream copy', (file, digest) => {
    expect(sha256(readFileSync(join(VENDOR_OZ, file)))).toBe(digest);
  });

  it.each(pinnedOz().filter(([file]) => file.endsWith('.compact')))(
    '%s is byte-identical to the installed @openzeppelin/compact-contracts 0.4.0-alpha.3',
    (file) => {
      const installed = join(ROOT, 'node_modules', '@openzeppelin', 'compact-contracts', file);
      expect(readFileSync(join(VENDOR_OZ, file)).equals(readFileSync(installed))).toBe(true);
    },
  );
});

describe('the reference set (deployments/reference-set.json, a pinned copy — deployments/SOURCE.md)', () => {
  it('is byte-identical to acedward/mip-0018-midnight-contracts @ cb6c675 deployments/reference-set.json', () => {
    expect(sha256(readFileSync(join(ROOT, 'deployments', 'reference-set.json')))).toBe(
      '6b37b56af510d3483899e04690762b12dc0a059853ed07fdd4036e5c2bf6a40b',
    );
  });

  it('deployments/SOURCE.md records that pin (upstream, commit, blob, SHA-256)', () => {
    const row = readFileSync(join(ROOT, 'deployments', 'SOURCE.md'), 'utf8').split('\n').find((l) => l.startsWith('| `reference-set.json` |'));
    expect(row).toBeDefined();
    for (const pin of ['acedward/mip-0018-midnight-contracts', 'cb6c675ddbbb4a82d0bcaf87ad863c934becce31', '0cc572fb247bbf2ed04703be046ca78cded6bd3a', '6b37b56af510d3483899e04690762b12dc0a059853ed07fdd4036e5c2bf6a40b']) {
      expect(row).toContain(pin);
    }
  });
});

describe('the MIP-18 twins\' plan (deployments/mip18-generated-matrix.json, a pinned copy — deployments/SOURCE.md)', () => {
  it('is byte-identical to acedward/mip-0018-midnight-contracts @ cb6c675 deployments/generated-matrix.json', () => {
    expect(sha256(readFileSync(join(ROOT, 'deployments', 'mip18-generated-matrix.json')))).toBe(
      '5da77454807c18ce9f836ceb11e69cd27d0e044094b4b8c298e1ea5b23d47ff0',
    );
  });

  it('deployments/SOURCE.md records that pin (upstream, commit, blob, SHA-256)', () => {
    const row = readFileSync(join(ROOT, 'deployments', 'SOURCE.md'), 'utf8').split('\n').find((l) => l.startsWith('| `mip18-generated-matrix.json` |'));
    expect(row).toBeDefined();
    for (const pin of ['acedward/mip-0018-midnight-contracts', 'cb6c675ddbbb4a82d0bcaf87ad863c934becce31', '3000ae229bae3285c70ea8f58d6fd5d568aeb986', '5da77454807c18ce9f836ceb11e69cd27d0e044094b4b8c298e1ea5b23d47ff0']) {
      expect(row).toContain(pin);
    }
  });
});

describe('copied scripts (scripts/SOURCE.md)', () => {
  it('records every script adapted from acedward/mip-0018-midnight-contracts @ cb6c675, with its upstream blob and SHA-256', () => {
    const rows = readFileSync(join(ROOT, 'scripts', 'SOURCE.md'), 'utf8').split('\n').filter((l) => /^\| `[^`]+` \| `scripts\//.test(l));
    const files = rows.map((l) => /^\| `([^`]+)`/.exec(l)![1]);
    expect(files).toEqual(expect.arrayContaining(['staged-deploy.ts', 'profile.ts', 'stranger-check.ts', 'compile.sh']));
    const compile = rows.find((l) => l.startsWith('| `compile.sh` |'))!;
    expect(compile).toContain('ef5bb6a83992b1cd5d2bafffa560637f96c06abc');
    expect(compile).toContain('62caa8cf29abcb213d8b00cd53a0deb0ce0cfd05049564d6a964663c934e0ad2');
  });
});

describe('.gitignore keeps secrets out of the repository', () => {
  it('ignores secret files, private state and generated maintenance keys', () => {
    const patterns = readFileSync(join(ROOT, '.gitignore'), 'utf8').split('\n').map((l) => l.trim());
    for (const p of ['.env', '*.secret', '*.mnemonic', '*.seed', '*.maintenance-key.json', 'midnight-level-db/']) expect(patterns).toContain(p);
  });
});
