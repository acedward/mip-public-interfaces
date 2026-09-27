// SPDX-License-Identifier: Apache-2.0
//
// Task 02-B4, offline: the pure parts of the on-chain scripts (scripts/profile.ts,
// scripts/deploy-lib.ts, scripts/staged-deploy.ts). The on-chain behaviour itself is exercised
// on the project's local chain (deploy-and-publish.ts / stranger-check.ts), not here.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  accountIdOf,
  emitterSecretHashOf,
  hexOf,
  holderBytes,
  PI_WITNESSES,
  pointerParts,
  witnessesFor,
} from '../scripts/profile.js';
import { provableCircuits, readBundles, readMatrix } from '../scripts/deploy-lib.js';
import * as sim from '../scripts/simulate-pi.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const sha256 = (b: Buffer | Uint8Array) => createHash('sha256').update(b).digest('hex');

describe('pointerParts (UC-2 payload: commitment ++ utf8(url), zero padded to 256·k, split)', () => {
  it.each(readBundles().bundles.map((b) => [b.id, b] as const))('%s: equals deployments/bundles.json', (_id, b) => {
    const parts = pointerParts(b.commitment, b.url);
    expect(parts.map(hexOf)).toEqual(b.partsHex);
    expect(parts).toHaveLength(b.parts);
  });

  it('every fixture case of fixtures/bundles/cases.json', () => {
    const cases = (JSON.parse(readFileSync(join(ROOT, 'fixtures', 'bundles', 'cases.json'), 'utf8')) as {
      cases: { case: string; commitment: string; url: string; partsHex: string[] }[];
    }).cases;
    for (const c of cases) expect(pointerParts(c.commitment, c.url).map(hexOf), c.case).toEqual(c.partsHex);
  });

  it('225 bytes of commitment ++ URL need 2 parts; a NUL in the URL or a short commitment is refused', () => {
    expect(pointerParts('11'.repeat(32), 'h'.repeat(224))).toHaveLength(1);
    expect(pointerParts('11'.repeat(32), 'h'.repeat(225))).toHaveLength(2);
    expect(() => pointerParts('11'.repeat(31), 'http://x')).toThrow(/32 bytes/);
    expect(() => pointerParts('11'.repeat(32), 'http://x\u0000y')).toThrow(/NUL/);
  });
});

describe('secrets and recipients match the Compact contracts (simulator)', () => {
  it('emitterSecretHashOf = TM_emitterSecretHashOf (scripts/simulate-pi.ts)', () => {
    expect(hexOf(emitterSecretHashOf(sim.TEST_EMITTER_SECRET))).toBe(hexOf(sim.emitterSecretHashOf(sim.TEST_EMITTER_SECRET)));
  });
  it('accountIdOf = OpenZeppelin Utils.computeAccountId; holderBytes as the simulator', () => {
    expect(hexOf(accountIdOf(sim.TEST_OWNER_SK))).toBe(hexOf(sim.accountIdOf(sim.TEST_OWNER_SK)));
    expect(hexOf(holderBytes('holder:lsun-1'))).toBe(hexOf(sim.holderBytes('holder:lsun-1')));
  });
});

describe('the witness table answers exactly what each compiled contract declares', () => {
  it.each(readMatrix().rows.map((r) => [r.id, r.contract] as const))('%s', (_id, contract) => {
    const info = JSON.parse(readFileSync(join(ROOT, 'contracts', 'managed', contract, 'compiler', 'contract-info.json'), 'utf8')) as {
      witnesses: { name: string }[];
    };
    const w = witnessesFor(contract);
    expect(Object.keys(w).sort()).toEqual(info.witnesses.map((x) => x.name).sort());
    for (const name of Object.keys(w)) expect(w[name]).toBe(PI_WITNESSES[name as keyof typeof PI_WITNESSES]);
  });
  it('every PI contract has a publishBundle key and 8-11 provable circuits (one deploy each, no staging expected)', () => {
    for (const row of readMatrix().rows) {
      const circuits = provableCircuits(row.contract);
      expect(circuits).toContain('publishBundle');
      expect(circuits.length).toBeGreaterThanOrEqual(8);
      expect(circuits.length).toBeLessThanOrEqual(11);
    }
  });
});

describe('scripts/staged-deploy.ts is the source repository\'s file, unchanged (scripts/SOURCE.md)', () => {
  it('SHA-256 519cc09d…c563 (mip-0018-midnight-contracts cb6c675)', () => {
    expect(sha256(readFileSync(join(ROOT, 'scripts', 'staged-deploy.ts')))).toBe('519cc09d7e319a4a96e3d2dfa6986725e53e3ac7f825f4909d9d4be581ccc563');
  });
});
