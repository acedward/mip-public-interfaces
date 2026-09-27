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
import { provableCircuits, readAllRows, readBundles, readDualMatrix, readMatrix, stepArgs } from '../scripts/deploy-lib.js';
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
  it.each(readAllRows().map((r) => [r.id, r.contract] as const))('%s', (_id, contract) => {
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

describe('the DU set on chain (sub-plan 03-A4a): keys and step arguments', () => {
  it('every DU contract has a publishBundle key and 12-16 provable circuits; its pure getter has none', () => {
    for (const row of readDualMatrix().rows) {
      const circuits = provableCircuits(row.contract);
      expect(circuits).toContain('publishBundle');
      expect(circuits.length).toBeGreaterThanOrEqual(12);
      expect(circuits.length).toBeLessThanOrEqual(16);
      expect(circuits).not.toContain(row.id === 'DAURDU' ? 'kinds' : 'kind');
      for (const step of row.steps) expect(circuits, `${row.id} ${step.circuit}`).toContain(step.circuit);
    }
  });

  it('every mint and transfer step gets the simulator corpus\'s arguments on chain — except a shielded mint\'s recipient, which is the deployer', () => {
    const zswapRecipient = { bytes: new Uint8Array(32).fill(0x77) };
    let checked = 0;
    for (const row of readAllRows()) {
      for (const [index, step] of row.steps.entries()) {
        if (step.kind !== 'mint' && step.kind !== 'transfer') continue;
        const onChain = stepArgs(row, step, index, { fungibleSk: sim.TEST_OWNER_SK, zswapRecipient });
        const simulated = sim.argsFor(row as never, step as never, undefined, 0);
        if (step.kind === 'mint' && step.token === 'shielded') {
          expect(onChain.recipient).toBe('deployer');
          expect(onChain.args.slice(step.circuit === 'mintPiece' ? 2 : 1)).toEqual(simulated.slice(step.circuit === 'mintPiece' ? 2 : 1));
          expect(onChain.args).toContainEqual(zswapRecipient);
        } else {
          expect(onChain.args, `${row.id} ${index} ${step.circuit}`).toEqual(simulated);
        }
        checked += 1;
      }
    }
    // PI: 1 ledger mint + 1 transfer (LSUNPI), 1 shielded (SSTARPI), 5 pieces (CNSTPI);
    // DU: 2 shielded (SNEBDU), 1 ledger (LMOONDU), 3 unshielded (UMETDU), 1 + 1 (DAURDU)
    expect(checked).toBe(8 + 8);
  });

  it('an unshielded mint pays a user address: Either<ContractAddress, UserAddress> with the label\'s holderBytes', () => {
    const umet = readDualMatrix().rows.find((r) => r.id === 'UMETDU')!;
    const { args, recipient } = stepArgs(umet, umet.steps[0]!, 0, { fungibleSk: sim.TEST_OWNER_SK, zswapRecipient: { bytes: new Uint8Array(32) } });
    expect(args).toEqual([{ is_left: false, left: { bytes: new Uint8Array(32) }, right: { bytes: holderBytes('user:umet-0') } }, 100n]);
    expect(recipient).toBe(hexOf(holderBytes('user:umet-0')));
  });
});

describe('scripts/staged-deploy.ts is the source repository\'s file, unchanged (scripts/SOURCE.md)', () => {
  it('SHA-256 519cc09d…c563 (mip-0018-midnight-contracts cb6c675)', () => {
    expect(sha256(readFileSync(join(ROOT, 'scripts', 'staged-deploy.ts')))).toBe('519cc09d7e319a4a96e3d2dfa6986725e53e3ac7f825f4909d9d4be581ccc563');
  });
});
