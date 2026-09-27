// SPDX-License-Identifier: Apache-2.0
//
// Sub-plan 03-A3, offline: the P4 case of spec 00024 §9.2 (audit F3) — ONE transaction whose ONE
// guaranteed intent holds a MIP-0018 package (UMETDU's `repository` declaration) AND a
// public-interface package (UMETDU's pointer) of the same dual contract. The real compiled UMETDU
// (every verifier key installed as a deploy installs them) is deployed into an in-process
// ledger-v9 chain; scripts/dual-intent.ts builds the transaction (the Multi-Part Event reference
// publisher's `addGuaranteedIntent` with an arbitrary call array, both calls against one pinned
// state); it is applied with proofs erased and read back by the Multi-Part Event reader: TWO
// packages — equal transaction, address and segment, distinct names — each processed by its own
// protocol. A two-intent transaction is extra coverage only; it never counts as P4.
//
// Needs the patched tools installed: `npm run tools:ci`.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ContractOperation, createConstructorContext, type ContractState } from '@midnight-ntwrk/compact-runtime';
import * as ledger from '@midnightntwrk/ledger-v9';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { assertDualIntent, buildDualIntentTransaction, type BuiltDualIntent, type DualIntentCall, executeCalls } from '../scripts/dual-intent.js';
import { addGuaranteedIntent, PackageCheckError, prePartitionCallFor } from '../vendor/compact-multi-part-event/src/publisher/index.js';
import { partEventsFromLedgerEvents, readPackages, splitEventValue } from '../vendor/compact-multi-part-event/src/reader/index.js';
import { emitterSecretHashOf, STRANGER_EMITTER_SECRET, TEST_EMITTER_SECRET } from './helpers/simulator.js';
import { deploy, LocalChain, NETWORK } from './helpers/local-ledger.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const ID = 'UMETDU';
const MANAGED = join(ROOT, 'contracts', 'managed', ID);
const MIP18 = 'mip-0018:token-metadata[v1]';
const PI = 'mip-xxxx:public-interface[v1]';
const COIN_PUBLIC_KEY = '0'.repeat(64);

type PS = { readonly emitterSecret: Uint8Array };
type Compiled = { initialState(ctx: unknown, ...args: unknown[]): Promise<{ currentContractState: ContractState }>; impureCircuits: Record<string, never> };
type Bundle = { id: string; url: string; parts: number; commitment: string; payloadHex: string; partsHex: string[]; path: string };
type Row = { id: string; constructorArgs: { name_: string; symbol_: string }; steps: { circuit: string; declaration?: { key: string; payloadHex: string; text: string } }[] };
type Hash = { parsePayload(p: Uint8Array): { commitment: Buffer; url: string; parts: number } };
type Indexer = { fetchLatestBundlePublication(url: string, address: string): Promise<{ parts: number; segment: number; payload: Buffer; txHash: string } | null> };
type EventMod = { PUBLIC_INTERFACE_EVENT_HEX: string };

const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
const unhex = (t: string) => Uint8Array.from(Buffer.from(t, 'hex'));
const row = (JSON.parse(readFileSync(join(ROOT, 'deployments', 'dual-matrix.json'), 'utf8')) as { rows: Row[] }).rows.find((r) => r.id === ID) as Row;
const bundle = (JSON.parse(readFileSync(join(ROOT, 'deployments', 'bundles.json'), 'utf8')) as { bundles: Bundle[] }).bundles.find((b) => b.id === ID) as Bundle;
const repository = row.steps.find((s) => s.circuit === 'publishRepository')?.declaration as { key: string; payloadHex: string; text: string };
const repositoryPayload = unhex(repository.payloadHex);
const pointerPart = unhex(bundle.partsHex[0] ?? '');

let Contract: new (w: unknown) => Compiled;
let hash: Hash;
let indexer: Indexer;
let eventMod: EventMod;
let chain: LocalChain;
let address: string;

const contract = () => new Contract({ emitterSecret: ({ privateState }: { privateState: PS }) => [privateState, privateState.emitterSecret] });
const CALLS: DualIntentCall[] = [
  { circuit: 'publishRepository', args: [], name: MIP18, payloads: [repositoryPayload] },
  { circuit: 'publishBundle', args: [pointerPart], name: PI, payloads: [pointerPart] },
];
const config = { network: NETWORK, coinPublicKey: COIN_PUBLIC_KEY };
const build = (secret: Uint8Array, calls = CALLS) =>
  buildDualIntentTransaction(chain.source(), config, { address, contract: contract() as never, createPrivateState: () => ({ emitterSecret: secret }), calls });

beforeAll(async () => {
  if (!existsSync(join(ROOT, 'tools', 'public-interface', 'node_modules'))) throw new Error('run `npm run tools:ci` first');
  ({ Contract } = (await import(pathToFileURL(join(MANAGED, 'contract', 'index.js')).href)) as { Contract: typeof Contract });
  hash = (await import('../tools/public-interface/src/hash.mjs')) as unknown as Hash;
  indexer = (await import('../tools/public-interface/src/indexer.mjs')) as unknown as Indexer;
  eventMod = (await import('../tools/public-interface/src/event.mjs')) as unknown as EventMod;
  chain = new LocalChain();
  const initial = await contract().initialState(
    createConstructorContext<PS>({ emitterSecret: TEST_EMITTER_SECRET }, COIN_PUBLIC_KEY),
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
afterEach(() => { vi.unstubAllGlobals(); });

describe('the inputs: UMETDU\'s repository declaration and its one-part pointer', () => {
  it('a MIP-0018 declaration of 256 bytes and a 256-byte pointer part — two event names', () => {
    expect(repository.key).toBe('repository');
    expect(repositoryPayload).toHaveLength(256);
    expect(bundle.parts).toBe(1);
    expect(pointerPart).toHaveLength(256);
    expect(hash.parsePayload(pointerPart)).toMatchObject({ url: bundle.url, parts: 1 });
  });
});

describe('P4: ONE transaction, ONE guaranteed intent, a MIP-0018 package and a public-interface package of UMETDU', () => {
  let built: BuiltDualIntent;
  let result: ledger.TransactionResult;
  let height: number;

  beforeAll(async () => {
    built = await build(TEST_EMITTER_SECRET);
    height = chain.height;
    result = chain.apply(built.transaction.eraseProofs());
  });

  it('built: exactly one intent holding both calls, in order — publishRepository then publishBundle — guaranteed transcripts only', () => {
    const intents = built.transaction.intents;
    expect([...(intents?.keys() ?? [])]).toEqual([built.expected.segment]);
    const actions = intents?.get(built.expected.segment)?.actions ?? [];
    expect(actions).toHaveLength(2);
    expect(actions.map((a) => (a as ledger.ContractCall<ledger.PreProof>).entryPoint)).toEqual(['publishRepository', 'publishBundle']);
    for (const action of actions) {
      expect(action).toBeInstanceOf(ledger.ContractCall);
      const call = action as ledger.ContractCall<ledger.PreProof>;
      expect(call.address).toBe(address);
      expect(call.guaranteedTranscript).toBeDefined();
      expect(call.fallibleTranscript).toBeUndefined();
    }
    expect(() => assertDualIntent(built.transaction, built.expected, 'test')).not.toThrow();
  });

  it('applied (proofs erased): success; both events carry the same transaction hash and the same physical segment', () => {
    expect(result.type, String(result.error)).toBe('success');
    const logs = result.events.filter((e) => e.content.tag === 'contractLog');
    expect(logs).toHaveLength(2);
    expect(logs.map((e) => e.source.physicalSegment)).toEqual([built.expected.segment, built.expected.segment]);
    expect(new Set(logs.map((e) => e.source.transactionHash)).size).toBe(1);
  });

  it('the Multi-Part Event reader: TWO packages — equal transaction, address and segment; distinct names; each its own bytes', () => {
    const { events, issues } = partEventsFromLedgerEvents(result.events, { network: NETWORK });
    expect(issues).toEqual([]);
    expect(events).toHaveLength(2);
    const { packages } = readPackages(events, { optIns: [{ contract: address, name: MIP18 }, { contract: address, name: PI }] });
    expect(packages).toHaveLength(2);
    for (const p of packages) {
      expect(p.status).toBe('accepted');
      expect(p.contract).toBe(address);
      expect(p.parts).toHaveLength(1);
    }
    const [a, b] = packages;
    expect(a?.transactionHash).toBe(b?.transactionHash);
    expect(a?.segment).toBe(built.expected.segment);
    expect(b?.segment).toBe(built.expected.segment);
    expect(new Set(packages.map((p) => p.nameText))).toEqual(new Set([MIP18, PI]));
    expect(hex(packages.find((p) => p.nameText === MIP18)?.payload ?? new Uint8Array())).toBe(hex(repositoryPayload));
    expect(hex(packages.find((p) => p.nameText === PI)?.payload ?? new Uint8Array())).toBe(hex(pointerPart));
  });

  it('each package is processed by its own protocol: MIP-0018 reads `repository` = the source URL; the Public Interfaces parser reads the bundle pointer', () => {
    const { events } = partEventsFromLedgerEvents(result.events, { network: NETWORK });
    const { packages } = readPackages(events, { optIns: [{ contract: address, name: MIP18 }, { contract: address, name: PI }] });
    const metadata = packages.find((p) => p.nameText === MIP18)?.payload ?? new Uint8Array();
    const len = metadata[66]! | (metadata[67]! << 8);
    expect([metadata[65], Buffer.from(metadata.subarray(68, 68 + len)).toString('utf8')]).toEqual([4, repository.text]);
    const pointer = hash.parsePayload(packages.find((p) => p.nameText === PI)?.payload ?? new Uint8Array());
    expect([pointer.commitment.toString('hex'), pointer.url, pointer.parts]).toEqual([bundle.commitment, bundle.url, 1]);
  });

  it('negative control of the rule: grouped WITHOUT the name, the two events would be ONE group of 2 parts — the merge P4 guards against', () => {
    const { events } = partEventsFromLedgerEvents(result.events, { network: NETWORK });
    const groups = new Set(events.map((e) => `${e.contract}/${e.transactionHash}/${e.segment}`));
    expect(groups.size).toBe(1);
    expect(events).toHaveLength(2);
  });

  it('the patched public-interface tool reads UMETDU\'s pointer back from the events\' real raw bytes and ignores the MIP-0018 event of the same intent', async () => {
    let id = 0;
    const served = result.events.flatMap((event) => {
      id += 1;
      if (event.content.tag !== 'contractLog') return [];
      const [part] = partEventsFromLedgerEvents([event], { network: NETWORK }).events;
      if (part === undefined) return [];
      const split = splitEventValue(part.value);
      return [{
        __typename: 'MiscContractEvent', id, raw: hex(event.serialize()),
        name: hex(split.name), payload: hex(split.payload),
        transaction: { id: 1, hash: event.source.transactionHash, block: { height } },
      }];
    });
    expect(served.map((e) => e.name)).toContain(eventMod.PUBLIC_INTERFACE_EVENT_HEX);
    globalThis.fetch = vi.fn(async (_url: unknown, init?: { body?: unknown }) => {
      const body = JSON.parse(String(init?.body)) as { variables: { offset: number } };
      return { ok: true, status: 200, json: async () => ({ data: { contractEvents: body.variables.offset === 0 ? served : [] } }) };
    }) as unknown as typeof fetch;
    const latest = await indexer.fetchLatestBundlePublication('http://indexer.local/api/v4/graphql', address);
    expect(latest).toMatchObject({ parts: 1, segment: built.expected.segment });
    expect(hex(latest?.payload ?? new Uint8Array())).toBe(hex(pointerPart));
  });

  it('a stranger cannot build it: the emitter check fails while executing, before any intent exists', async () => {
    await expect(build(STRANGER_EMITTER_SECRET)).rejects.toThrow(/caller is not the emitter/);
  });

  it('the P4 check refuses an intent that lost a call, or whose calls are in another order', () => {
    expect(() => assertDualIntent(built.transaction, { ...built.expected, calls: [...built.expected.calls, built.expected.calls[0]!] }, 'test')).toThrow(PackageCheckError);
    expect(() => assertDualIntent(built.transaction, { ...built.expected, calls: [...built.expected.calls].reverse() }, 'test')).toThrow(/entry point/);
  });
});

describe('extra coverage (NOT P4): the same two calls in TWO intents of one transaction are two packages in two segments', () => {
  it('two intents, one call each (the publisher\'s addGuaranteedIntent once per call); applied; two packages, one transaction, different segments', async () => {
    const executed = await executeCalls(chain.source(), config, {
      address, contract: contract() as never, createPrivateState: () => ({ emitterSecret: TEST_EMITTER_SECRET }), calls: CALLS,
    });
    let tx = ledger.Transaction.fromPartsRandomized(NETWORK);
    const segments: number[] = [];
    for (const [i, trace] of executed.traces.entries()) {
      const added = addGuaranteedIntent(tx, () => [prePartitionCallFor(trace, executed.ledgerState, executed.locations[i]!)], executed.ledgerParameters, executed.ttl, 8);
      tx = added.transaction;
      segments.push(added.segment);
    }
    expect(new Set(segments).size).toBe(2);
    const applied = chain.apply(tx.eraseProofs());
    expect(applied.type, String(applied.error)).toBe('success');
    const { events } = partEventsFromLedgerEvents(applied.events, { network: NETWORK });
    const { packages } = readPackages(events, { optIns: [{ contract: address, name: MIP18 }, { contract: address, name: PI }] });
    expect(packages).toHaveLength(2);
    expect(packages[0]?.transactionHash).toBe(packages[1]?.transactionHash);
    expect(new Set(packages.map((p) => p.segment))).toEqual(new Set(segments));
    // …and the P4 check refuses it: no intent holds both calls.
    expect(() => assertDualIntent(tx, { contract: address, segment: segments[0]!, calls: CALLS.map((c) => ({ entryPoint: c.circuit, name: c.name, payloads: c.payloads })) }, 'test')).toThrow(/1 actions, expected 2/);
  });
});
