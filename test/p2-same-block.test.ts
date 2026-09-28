// SPDX-License-Identifier: Apache-2.0
//
// Sub-plan 03-C step 3, offline: the P2 case of spec 00024 §9.2 — two valid, distinguishable
// public-interface publications of ONE contract (LMOONDU's own bundle and `LMOONDU-v2`, different
// commitments) in the SAME block. On a chain, scripts/publish-same-block.ts proves and balances
// both before submitting either, then submits both right after a block boundary; here:
//  - the pure rule it records: the newest publication is the later one BY OBSERVED POSITION
//    (block, then transaction position), never by submission order (scripts/same-block.ts);
//  - "submit at a block boundary": nothing is submitted before the best block changes, then all;
//  - the construction: the real compiled LMOONDU (every verifier key installed) in an in-process
//    ledger-v9 chain; both pointer transactions are built by the Multi-Part Event publisher against
//    ONE pinned state (publishBundle writes no ledger field, so neither invalidates the other) and
//    applied in ONE block, in either order: both succeed, and [Y]'s reader reads two packages —
//    one per transaction — whose order in the block is the application order.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ContractOperation, createConstructorContext, type ContractState } from '@midnight-ntwrk/compact-runtime';
import type * as ledger from '@midnightntwrk/ledger-v9';
import { beforeAll, describe, expect, it } from 'vitest';

import { laterByPosition, pairVerdict, submitAtBlockBoundary, type ObservedPublication } from '../scripts/same-block.js';
import { bindingFromContract, buildPackageTransaction } from '../vendor/compact-multi-part-event/src/publisher/index.js';
import { partEventsFromLedgerEvents, readPackages } from '../vendor/compact-multi-part-event/src/reader/index.js';
import { emitterSecretHashOf, TEST_EMITTER_SECRET } from './helpers/simulator.js';
import { deploy, LocalChain, NETWORK } from './helpers/local-ledger.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const ID = 'LMOONDU';
const MANAGED = join(ROOT, 'contracts', 'managed', ID);
const PI = 'mip-xxxx:public-interface[v1]';
const COIN_PUBLIC_KEY = '0'.repeat(64);

type PS = { readonly emitterSecret: Uint8Array; readonly fungibleSk: Uint8Array };
type Compiled = { initialState(ctx: unknown, ...args: unknown[]): Promise<{ currentContractState: ContractState }>; impureCircuits: Record<string, never> };
type Bundle = { id: string; contract?: string; url: string; parts: number; commitment: string; partsHex: string[] };
type Row = { id: string; constructorArgs: { name_: string; symbol_: string } };

const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
const unhex = (t: string) => Uint8Array.from(Buffer.from(t, 'hex'));
const bundles = (JSON.parse(readFileSync(join(ROOT, 'deployments', 'bundles.json'), 'utf8')) as { bundles: Bundle[] }).bundles;
const bundleA = bundles.find((b) => b.id === 'LMOONDU') as Bundle;
const bundleB = bundles.find((b) => b.id === 'LMOONDU-v2') as Bundle;
const row = (JSON.parse(readFileSync(join(ROOT, 'deployments', 'dual-matrix.json'), 'utf8')) as { rows: Row[] }).rows.find((r) => r.id === ID) as Row;
const PS_OK: PS = { emitterSecret: TEST_EMITTER_SECRET, fungibleSk: new Uint8Array(32).fill(7) };

const pub = (label: string, blockHeight: number, txPosition: number, submittedAt: number): ObservedPublication =>
  ({ label, txHash: `${label}-${blockHeight}-${txPosition}`, blockHeight, txPosition, submittedAt });

describe('P2 rule as recorded (scripts/same-block.ts): later by OBSERVED position, never by submission order', () => {
  it('same block: the higher transaction position wins, whatever was submitted later', () => {
    const early = pub('LMOONDU', 700, 1, 2_000);      // submitted LATER but earlier in the block
    const late = pub('LMOONDU-v2', 700, 2, 1_000);    // submitted EARLIER but later in the block
    expect(laterByPosition(early, late).label).toBe('LMOONDU-v2');
    expect(laterByPosition(late, early).label).toBe('LMOONDU-v2');
    const verdict = pairVerdict(early, late);
    expect(verdict).toMatchObject({ sameBlock: true, submissionOrderAgrees: false });
    expect(verdict.later.label).toBe('LMOONDU-v2');
    expect(verdict.earlier.label).toBe('LMOONDU');
  });

  it('negative control: a rule by submission order would pick the other one on the same pair', () => {
    const early = pub('LMOONDU', 700, 1, 2_000);
    const late = pub('LMOONDU-v2', 700, 2, 1_000);
    const bySubmission = early.submittedAt > late.submittedAt ? early : late;
    expect(bySubmission.label).not.toBe(laterByPosition(early, late).label);
  });

  it('different blocks: the higher block wins; not a same-block pair', () => {
    const a = pub('LMOONDU', 700, 5, 1);
    const b = pub('LMOONDU-v2', 701, 0, 2);
    expect(pairVerdict(a, b)).toMatchObject({ sameBlock: false });
    expect(laterByPosition(a, b).label).toBe('LMOONDU-v2');
  });

  it('refuses an impossible observation: one transaction twice, or two at one position', () => {
    const a = pub('LMOONDU', 700, 1, 1);
    expect(() => laterByPosition(a, a)).toThrow(/same transaction/);
    expect(() => laterByPosition(a, { ...pub('LMOONDU-v2', 700, 1, 2) })).toThrow(/same position/);
  });
});

describe('submitAtBlockBoundary: nothing before the best block changes, then everything at once', () => {
  it('waits for the next height, then submits both', async () => {
    const heights = [10, 10, 10, 11];
    let clock = 0;
    const submitted: { which: string; at: number; heightSeen: number }[] = [];
    let seen = 0;
    const readHeight = async () => { seen = heights.shift() ?? 11; return seen; };
    const { boundaryHeight, results } = await submitAtBlockBoundary(readHeight, [
      async () => { submitted.push({ which: 'A', at: clock, heightSeen: seen }); return 'txA'; },
      async () => { submitted.push({ which: 'B', at: clock, heightSeen: seen }); return 'txB'; },
    ], { pollMs: 1, now: () => clock, sleep: async (ms) => { clock += ms; } });
    expect(boundaryHeight).toBe(11);
    expect(results.map((r) => r.value)).toEqual(['txA', 'txB']);
    expect(submitted.map((s) => s.heightSeen)).toEqual([11, 11]);
    expect(submitted.map((s) => s.at)).toEqual([3, 3]);
  });

  it('gives up when no block comes', async () => {
    let clock = 0;
    let calls = 0;
    await expect(submitAtBlockBoundary(async () => 10, [async () => { calls += 1; return 'x'; }], {
      pollMs: 100, timeoutMs: 1_000, now: () => clock, sleep: async (ms) => { clock += ms; },
    })).rejects.toThrow(/no new block/);
    expect(calls).toBe(0);
  });
});

describe('P2 construction: LMOONDU and LMOONDU-v2 published in ONE block against ONE pinned state', () => {
  let Contract: new (w: unknown) => Compiled;
  let chain: LocalChain;
  let address: string;

  const contract = () => new Contract({
    emitterSecret: ({ privateState }: { privateState: PS }) => [privateState, privateState.emitterSecret],
    wit_FungibleTokenSK: ({ privateState }: { privateState: PS }) => [privateState, privateState.fungibleSk],
  });
  const build = (bundle: Bundle) => buildPackageTransaction(
    chain.source(),
    { network: NETWORK, coinPublicKey: COIN_PUBLIC_KEY, maxParts: 8 },
    { contract: address, name: PI, binding: bindingFromContract(contract() as never, 'publishBundle', () => PS_OK), parts: bundle.partsHex.map(unhex) },
  );
  const packagesOf = (results: ledger.TransactionResult[]) => {
    const all = results.flatMap((r) => r.events);
    const { events, issues } = partEventsFromLedgerEvents(all, { network: NETWORK });
    expect(issues).toEqual([]);
    return readPackages(events, { optIns: [{ contract: address, name: PI }] }).packages;
  };

  beforeAll(async () => {
    ({ Contract } = (await import(pathToFileURL(join(MANAGED, 'contract', 'index.js')).href)) as { Contract: typeof Contract });
    chain = new LocalChain();
    const initial = await contract().initialState(
      createConstructorContext<PS>(PS_OK, COIN_PUBLIC_KEY),
      emitterSecretHashOf(TEST_EMITTER_SECRET),
      row.constructorArgs.name_,
      row.constructorArgs.symbol_,
    );
    const state = initial.currentContractState;
    for (const f of readdirSync(join(MANAGED, 'keys')).filter((f) => f.endsWith('.verifier'))) {
      const op = new ContractOperation();
      op.verifierKey = new Uint8Array(readFileSync(join(MANAGED, 'keys', f)));
      state.setOperation(f.slice(0, -'.verifier'.length), op);
    }
    address = deploy(chain, state);
  });

  it('the inputs: two one-part pointers of the same contract with different commitments', () => {
    expect(existsSync(join(MANAGED, 'keys', 'publishBundle.verifier'))).toBe(true);
    expect(bundleA.parts).toBe(1);
    expect(bundleB.parts).toBe(1);
    expect(bundleB.contract).toBe(ID);
    expect(bundleA.commitment).not.toBe(bundleB.commitment);
  });

  for (const order of [['LMOONDU', 'LMOONDU-v2'], ['LMOONDU-v2', 'LMOONDU']] as const) {
    it(`built against one pinned state, applied in ONE block as [${order.join(', ')}]: both succeed; two packages; the block order is the application order`, async () => {
      const [first, second] = order.map((id) => (id === 'LMOONDU' ? bundleA : bundleB)) as [Bundle, Bundle];
      const builtFirst = await build(first);
      const builtSecond = await build(second);
      expect(builtSecond.block.height).toBe(builtFirst.block.height); // one pinned state
      const blockHeight = chain.height;
      const results = chain.applyBlock([builtFirst.transaction.eraseProofs(), builtSecond.transaction.eraseProofs()]);
      expect(results.map((r) => r.type), results.map((r) => String(r.error)).join('; ')).toEqual(['success', 'success']);
      const packages = packagesOf(results);
      expect(packages).toHaveLength(2);
      for (const p of packages) {
        expect(p.status).toBe('accepted');
        expect(p.contract).toBe(address);
        expect(p.nameText).toBe(PI);
        expect(p.parts).toHaveLength(1);
      }
      expect(new Set(packages.map((p) => p.transactionHash)).size).toBe(2);
      const txOrder = results.map((r) => r.events.find((e) => e.content.tag === 'contractLog')?.source.transactionHash);
      const observed = packages.map((p) => {
        const position = txOrder.indexOf(p.transactionHash);
        const commitment = hex((p.payload ?? new Uint8Array()).subarray(0, 32));
        return pub(commitment === bundleA.commitment ? 'LMOONDU' : 'LMOONDU-v2', blockHeight, position, 0);
      });
      expect(observed.map((o) => o.txPosition).sort()).toEqual([0, 1]);
      expect(pairVerdict(observed[0]!, observed[1]!)).toMatchObject({ sameBlock: true });
      expect(laterByPosition(observed[0]!, observed[1]!).label).toBe(order[1]);
    });
  }

  it('the second publication is not refused for having been built on the state before the first (publishBundle writes no ledger field)', async () => {
    const pinned = await build(bundleA);
    chain.applyBlock([(await build(bundleB)).transaction.eraseProofs()]);
    const [late] = chain.applyBlock([pinned.transaction.eraseProofs()]);
    expect(late?.type, String(late?.error)).toBe('success');
  });
});
