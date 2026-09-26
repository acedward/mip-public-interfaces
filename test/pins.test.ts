// SPDX-License-Identifier: Apache-2.0
//
// The toolchain pins of project 00024 (standing instruction 17): ONE
// `@midnightntwrk/ledger-v9`, 1.0.0-rc.5, pinned both as a dependency and as an
// override, with its companions at the versions every 00024 repository shares.
// After an install, exactly one copy of each pinned runtime package may exist.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  compact: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  overrides: Record<string, string>;
};

/** Every installed copy of `name` under the root's node_modules, as `{ path, version }`. */
function installedCopies(name: string): { path: string; version: string }[] {
  const found: { path: string; version: string }[] = [];
  const visit = (nodeModules: string): void => {
    if (!existsSync(nodeModules)) return;
    const manifest = join(nodeModules, ...name.split('/'), 'package.json');
    if (existsSync(manifest)) {
      found.push({ path: manifest, version: (JSON.parse(readFileSync(manifest, 'utf8')) as { version: string }).version });
    }
    for (const entry of readdirSync(nodeModules)) {
      const dirs = entry.startsWith('@')
        ? readdirSync(join(nodeModules, entry)).map((sub) => join(nodeModules, entry, sub))
        : [join(nodeModules, entry)];
      for (const dir of dirs) {
        const nested = join(dir, 'node_modules');
        if (existsSync(nested) && statSync(nested).isDirectory()) visit(nested);
      }
    }
  };
  visit(join(ROOT, 'node_modules'));
  return found;
}

const PINS: Record<string, string> = {
  '@midnightntwrk/ledger-v9': '1.0.0-rc.5',
  '@midnight-ntwrk/compact-runtime': '0.19.0',
  '@midnightntwrk/onchain-runtime-v4': '4.0.0-rc.3',
};

describe('toolchain pins (standing instruction 17)', () => {
  it.each(Object.entries(PINS))('%s is pinned to %s as a dependency and as an override', (name, version) => {
    expect(pkg.dependencies[name]).toBe(version);
    expect(pkg.overrides[name]).toBe(version);
  });

  it('OpenZeppelin Compact Contracts 0.4.0-alpha.3 and compiler 0.34.0', () => {
    expect(pkg.devDependencies['@openzeppelin/compact-contracts']).toBe('0.4.0-alpha.3');
    expect(pkg.compact).toEqual({ compiler: '0.34.0', language: '0.26.0', runtime: '0.19.0' });
  });

  it.each(Object.entries(PINS))('exactly one copy of %s (%s) is installed', (name, version) => {
    const copies = installedCopies(name);
    expect(copies.map((c) => c.version)).toEqual([version]);
  });

  it('the OpenZeppelin modules the contract sets build on are installed', () => {
    const oz = join(ROOT, 'node_modules', '@openzeppelin', 'compact-contracts');
    expect((JSON.parse(readFileSync(join(oz, 'package.json'), 'utf8')) as { version: string }).version).toBe('0.4.0-alpha.3');
    for (const module of ['token/FungibleToken', 'token/NativeShieldedToken', 'token/NativeShieldedTokenFamily', 'utils/Utils']) {
      expect(existsSync(join(oz, `${module}.compact`)), module).toBe(true);
    }
  });
});
