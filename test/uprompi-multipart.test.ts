// SPDX-License-Identifier: Apache-2.0
//
// Sub-plan 02-B3, offline: UPROMPI's interface pointer is a 2-part Multi-Part Event
// package. Its index.json URL (deployments/bundles.json) is longer than the 224 bytes one
// `publishBundle` event holds, so the Multi-Part Event reference publisher
// (vendor/compact-multi-part-event) sends both `publishBundle(part)` calls in ONE
// guaranteed intent. The real compiled UPROMPI (contracts/managed/UPROMPI, every verifier
// key installed as a deploy installs them) is deployed into an in-process ledger-v9 chain,
// the transaction is applied with proofs erased, and the pointer is read back three ways:
// by the Multi-Part Event reader, by the patched public-interface tool from the events'
// real `raw` bytes (as an indexer serves them), and by public-interface-verify Levels 1-2
// against the ledger's own state for the contract.
//
// Needs the patched tools installed: `npm run tools:ci`.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ContractOperation, createConstructorContext, type ContractState } from '@midnight-ntwrk/compact-runtime';
import * as ledger from '@midnightntwrk/ledger-v9';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  bindingFromContract,
  buildPackageTransaction,
  type BuiltTransaction,
  type EmissionBinding,
} from '../vendor/compact-multi-part-event/src/publisher/index.js';
import { partEventsFromLedgerEvents, readPackages, splitEventValue } from '../vendor/compact-multi-part-event/src/reader/index.js';
import { emitterSecretHashOf, STRANGER_EMITTER_SECRET, TEST_EMITTER_SECRET } from './helpers/simulator.js';
import { deploy, LocalChain, NETWORK } from './helpers/local-ledger.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const MANAGED = join(ROOT, 'contracts', 'managed', 'UPROMPI');
const NAME = 'mip-xxxx:public-interface[v1]';
const COIN_PUBLIC_KEY = '0'.repeat(64);

type PS = { readonly emitterSecret: Uint8Array };
type UpromContract = {
  initialState(ctx: unknown, ...args: unknown[]): Promise<{ currentContractState: ContractState }>;
};
type Bundle = { id: string; url: string; urlBytes: number; parts: number; commitment: string; payloadHex: string; partsHex: string[]; path: string; circuits: string[] };
type Hash = { parsePayload(p: Uint8Array): { commitment: Buffer; url: string; parts: number } };
type Indexer = { fetchLatestBundlePublication(url: string, address: string): Promise<{ id: number; parts: number; partIds: number[]; segment: number; payload: Buffer; txHash: string } | null> };
type EventMod = { PUBLIC_INTERFACE_EVENT_HEX: string };
type Verify = {
  verify(o: { bundleDir: string; eventPayload: Uint8Array; stateBytes: Uint8Array; level: number }): Promise<{
    level: number;
    event: { url: string; parts: number; commitment: string };
    checks: { level1: { ok: boolean; reason?: string }; level2?: { ok: boolean; rows: { circuit: string; status: string }[] } };
  }>;
};

const bundle = (JSON.parse(readFileSync(join(ROOT, 'deployments', 'bundles.json'), 'utf8')) as { bundles: Bundle[] }).bundles.find((b) => b.id === 'UPROMPI') as Bundle;
const matrixRow = (JSON.parse(readFileSync(join(ROOT, 'deployments', 'generated-matrix.json'), 'utf8')) as { rows: { id: string; constructorArgs: { name_: string; symbol_: string } }[] }).rows.find((r) => r.id === 'UPROMPI');
const parts = bundle.partsHex.map((h) => Uint8Array.from(Buffer.from(h, 'hex')));
const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');

let Contract: new (w: unknown) => UpromContract;
let hash: Hash;
let indexer: Indexer;
let eventMod: EventMod;
let verifier: Verify;
let chain: LocalChain;
let address: string;

const contract = () => new Contract({ emitterSecret: ({ privateState }: { privateState: PS }) => [privateState, privateState.emitterSecret] });
const bindingFor = (secret: Uint8Array): EmissionBinding<PS> =>
  bindingFromContract(contract() as never, 'publishBundle', () => ({ emitterSecret: secret }));
const config = { network: NETWORK, coinPublicKey: COIN_PUBLIC_KEY };

beforeAll(async () => {
  if (!existsSync(join(ROOT, 'tools', 'public-interface', 'node_modules'))) throw new Error('run `npm run tools:ci` first');
  ({ Contract } = (await import(pathToFileURL(join(MANAGED, 'contract', 'index.js')).href)) as { Contract: typeof Contract });
  hash = (await import('../tools/public-interface/src/hash.mjs')) as unknown as Hash;
  indexer = (await import('../tools/public-interface/src/indexer.mjs')) as unknown as Indexer;
  eventMod = (await import('../tools/public-interface/src/event.mjs')) as unknown as EventMod;
  verifier = (await import('../tools/public-interface/src/verify.mjs')) as unknown as Verify;

  chain = new LocalChain();
  const initial = await contract().initialState(
    createConstructorContext<PS>({ emitterSecret: TEST_EMITTER_SECRET }, COIN_PUBLIC_KEY),
    emitterSecretHashOf(TEST_EMITTER_SECRET),
    matrixRow?.constructorArgs.name_,
    matrixRow?.constructorArgs.symbol_,
  );
  const state = initial.currentContractState;
  // A deploy installs one verifier key per circuit: the committed keys of the compiled contract.
  for (const f of readdirSync(join(MANAGED, 'keys')).filter((f) => f.endsWith('.verifier'))) {
    const op = new ContractOperation();
    op.verifierKey = new Uint8Array(readFileSync(join(MANAGED, 'keys', f)));
    state.setOperation(f.slice(0, -'.verifier'.length), op);
  }
  address = deploy(chain, state);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('UPROMPI\'s pointer is 2 parts (deployments/bundles.json)', () => {
  it('its index.json URL is longer than 224 bytes: 512 bytes of commitment ++ URL, split in two', () => {
    expect(bundle.urlBytes).toBeGreaterThan(224);
    expect(bundle.parts).toBe(2);
    expect(parts).toHaveLength(2);
    expect(hex(Buffer.concat(parts))).toBe(bundle.payloadHex);
    expect(hash.parsePayload(Buffer.concat(parts))).toMatchObject({ url: bundle.url, parts: 2 });
  });
});

describe('published with the Multi-Part Event reference publisher, applied to an in-process ledger', () => {
  let built: BuiltTransaction;
  let result: ledger.TransactionResult;
  let height: number;

  beforeAll(async () => {
    built = await buildPackageTransaction(chain.source(), config, { contract: address, name: NAME, binding: bindingFor(TEST_EMITTER_SECRET), parts });
    height = chain.height;
    result = chain.apply(built.transaction.eraseProofs());
  });

  it('ONE guaranteed intent holding both publishBundle calls, in order', () => {
    expect(built.packages).toHaveLength(1);
    const [pkg] = built.packages;
    expect(pkg?.parts.map(hex)).toEqual(bundle.partsHex);
    const intents = built.transaction.intents;
    expect([...(intents?.keys() ?? [])]).toEqual([pkg?.segment]);
    const actions = intents?.get(pkg?.segment ?? 0)?.actions ?? [];
    expect(actions).toHaveLength(2);
    for (const action of actions) {
      expect(action).toBeInstanceOf(ledger.ContractCall);
      const call = action as ledger.ContractCall<ledger.PreProof>;
      expect(call.entryPoint).toBe('publishBundle');
      expect(call.guaranteedTranscript).toBeDefined();
      expect(call.fallibleTranscript).toBeUndefined();
    }
  });

  it('applied: two events of one intent form ONE package — the recorded 512-byte pointer', () => {
    expect(result.type, String(result.error)).toBe('success');
    expect(result.events.map((e) => e.source.physicalSegment)).toEqual([built.packages[0]?.segment, built.packages[0]?.segment]);
    const { events, issues } = partEventsFromLedgerEvents(result.events, { network: NETWORK });
    expect(issues).toEqual([]);
    const { packages } = readPackages(events, { optIns: [{ contract: address, name: NAME }] });
    expect(packages).toHaveLength(1);
    expect(packages[0]?.status).toBe('accepted');
    expect(packages[0]?.parts).toHaveLength(2);
    expect(hex(packages[0]?.payload ?? new Uint8Array())).toBe(bundle.payloadHex);
  });

  it('the patched tool reads the publication back from the events\' real raw bytes: 2 parts, the full URL', async () => {
    let id = 0;
    const served = result.events.flatMap((event) => {
      id += 1;
      if (event.content.tag !== 'contractLog') return [];
      const [part] = partEventsFromLedgerEvents([event], { network: NETWORK }).events;
      if (part === undefined) return [];
      return [{
        __typename: 'MiscContractEvent', id, raw: hex(event.serialize()),
        name: eventMod.PUBLIC_INTERFACE_EVENT_HEX, payload: hex(splitEventValue(part.value).payload),
        transaction: { id: 1, hash: event.source.transactionHash, block: { height } },
      }];
    });
    globalThis.fetch = vi.fn(async (_url: unknown, init?: { body?: unknown }) => {
      const body = JSON.parse(String(init?.body)) as { variables: { offset: number } };
      return { ok: true, status: 200, json: async () => ({ data: { contractEvents: body.variables.offset === 0 ? served : [] } }) };
    }) as unknown as typeof fetch;
    const latest = await indexer.fetchLatestBundlePublication('http://indexer.local/api/v4/graphql', address);
    expect(latest).toMatchObject({ parts: 2, partIds: [1, 2], segment: built.packages[0]?.segment });
    expect(hex(latest?.payload ?? new Uint8Array())).toBe(bundle.payloadHex);
    expect(hash.parsePayload(latest?.payload ?? new Uint8Array()).url).toBe(bundle.url);
  });

  it('public-interface-verify Levels 1-2: the committed bundle against the pointer the chain holds and the ledger\'s state of UPROMPI', async () => {
    const onChain = chain.state.index(address);
    expect(onChain).toBeDefined();
    const r = await verifier.verify({
      bundleDir: join(ROOT, 'bundles', ...bundle.path.split('/').filter(Boolean)),
      eventPayload: Uint8Array.from(Buffer.from(bundle.payloadHex, 'hex')),
      stateBytes: onChain?.serialize() ?? new Uint8Array(),
      level: 2,
    });
    expect(r.event).toMatchObject({ url: bundle.url, parts: 2, commitment: bundle.commitment });
    expect(r.checks.level1.ok, r.checks.level1.reason).toBe(true);
    expect(r.checks.level2?.ok).toBe(true);
    expect(r.checks.level2?.rows.map((x) => x.circuit).sort()).toEqual([...bundle.circuits].sort());
    expect(r.level).toBe(2);
  });

  it('a stranger cannot publish UPROMPI\'s pointer: the emitter check fails while executing', async () => {
    await expect(buildPackageTransaction(chain.source(), config, { contract: address, name: NAME, binding: bindingFor(STRANGER_EMITTER_SECRET), parts }))
      .rejects.toThrow(/caller is not the emitter/);
  });
});
