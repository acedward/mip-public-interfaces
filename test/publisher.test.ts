// SPDX-License-Identifier: Apache-2.0
//
// The Multi-Part Event reference publisher (vendor/compact-multi-part-event), used the
// way this repository's contracts publish a public-interface pointer: every part of a
// pointer is one `publishBundle(part)` call, all in ONE guaranteed intent. Everything
// runs offline: the probe contract (contracts/probe/PublicInterfaceProbe.compact,
// `publishBundle` behind the emitter secret) is deployed into an in-process ledger-v9
// state, transactions are built by the publisher, applied with proofs erased, and the
// events read back — by the Multi-Part Event reader, and by this repository's patched
// public-interface tools (tools/public-interface, UC-2) from the events' real `raw`
// bytes, as an indexer serves them.
//
// Needs the patched tools installed: `npm run tools:ci`.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConstructorContext } from '@midnight-ntwrk/compact-runtime';
import * as ledger from '@midnightntwrk/ledger-v9';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import * as probe from '../contracts/managed/PublicInterfaceProbe/contract/index.js';
import {
  bindingFromContract,
  buildPackagesTransaction,
  buildPackageTransaction,
  type BuiltTransaction,
  type EmissionBinding,
  splitPayload,
} from '../vendor/compact-multi-part-event/src/publisher/index.js';
import { partEventsFromLedgerEvents, readPackages, splitEventValue } from '../vendor/compact-multi-part-event/src/reader/index.js';
import { deploy, LocalChain, NETWORK } from './helpers/local-ledger.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const TOOLS = join(ROOT, 'tools', 'public-interface');
const MANAGED = join(ROOT, 'contracts', 'managed', 'PublicInterfaceProbe');

const NAME = 'mip-xxxx:public-interface[v1]';
const COIN_PUBLIC_KEY = '0'.repeat(64);
const SECRET = new Uint8Array(32).fill(0x5a);
const STRANGER = new Uint8Array(32).fill(0x6b);
const COMMIT_A = new Uint8Array(32).fill(0xa1);
const COMMIT_B = new Uint8Array(32).fill(0xb2);
// 21 + 18·14 + 17 = 290 bytes: more than the 224 one part holds, so two parts.
const LONG_URL = `http://bundles.local/${'long-path-segment/'.repeat(14)}upromi/index.json`;
const SHORT_URL = 'http://bundles.local/b/index.json';

type PrivateState = { readonly secret: Uint8Array };
type Hash = { assemblePayload(c: Uint8Array, url: string): Buffer; payloadParts(p: Uint8Array): Buffer[]; parsePayload(p: Uint8Array): { commitment: Buffer; url: string; parts: number } };
type Indexer = { fetchLatestBundlePublication(url: string, address: string): Promise<{ id: number; parts: number; partIds: number[]; segment: number; payload: Buffer; txHash: string; blockHeight: number; supersededIds: number[] } | null> };
type EventMod = { PUBLIC_INTERFACE_EVENT: string; PUBLIC_INTERFACE_EVENT_HEX: string };

let hash: Hash;
let indexer: Indexer;
let eventMod: EventMod;
let chain: LocalChain;
let address: string;

const contract = () => new probe.Contract<PrivateState>({
  emitterSecret: ({ privateState }) => [privateState, privateState.secret],
});
const bindingFor = (secret: Uint8Array): EmissionBinding<PrivateState> =>
  bindingFromContract(contract(), 'publishBundle', () => ({ secret }));
const config = { network: NETWORK, coinPublicKey: COIN_PUBLIC_KEY };
const request = (parts: readonly Uint8Array[], secret = SECRET) => ({ contract: address, name: NAME, binding: bindingFor(secret), parts });
const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');

/** `result.events` of applied transactions as the public indexer serves them (ids in emission order). */
function asIndexerEvents(applied: { result: ledger.TransactionResult; height: number; txId: number }[]) {
  let id = 0;
  return applied.flatMap(({ result, height, txId }) => result.events.flatMap((event) => {
    id += 1;
    const content = event.content;
    if (content.tag !== 'contractLog') return [];
    const [part] = partEventsFromLedgerEvents([event], { network: NETWORK }).events;
    if (part === undefined) return [];
    return [{
      __typename: 'MiscContractEvent', id, raw: hex(event.serialize()),
      name: eventMod.PUBLIC_INTERFACE_EVENT_HEX, payload: hex(splitEventValue(part.value).payload),
      transaction: { id: txId, hash: event.source.transactionHash, block: { height } },
    }];
  }));
}

function stubIndexer(events: unknown[]) {
  globalThis.fetch = vi.fn(async (_url: unknown, init?: { body?: unknown }) => {
    const body = JSON.parse(String(init?.body)) as { variables: { offset: number } };
    return { ok: true, status: 200, json: async () => ({ data: { contractEvents: body.variables.offset === 0 ? events : [] } }) };
  }) as unknown as typeof fetch;
}

beforeAll(async () => {
  if (!existsSync(join(TOOLS, 'node_modules'))) throw new Error('tools/public-interface is not installed: run `npm run tools:ci` first');
  hash = (await import('../tools/public-interface/src/hash.mjs')) as unknown as Hash;
  indexer = (await import('../tools/public-interface/src/indexer.mjs')) as unknown as Indexer;
  eventMod = (await import('../tools/public-interface/src/event.mjs')) as unknown as EventMod;

  chain = new LocalChain();
  const initial = await contract().initialState(
    createConstructorContext<PrivateState>({ secret: SECRET }, COIN_PUBLIC_KEY),
    probe.pureCircuits.emitterSecretHashOf(SECRET),
  );
  const state = initial.currentContractState;
  const operation = state.operation('publishBundle');
  if (operation === undefined) throw new Error('no publishBundle operation');
  // A deploy installs each circuit's verifier key; the committed key of the compiled probe.
  operation.verifierKey = new Uint8Array(readFileSync(join(MANAGED, 'keys', 'publishBundle.verifier')));
  state.setOperation('publishBundle', operation);
  address = deploy(chain, state);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('the probe contract', () => {
  it('stores the emitter-secret hash SHA-256(pad(32, "mip-0018:emitter:") ++ secret)', () => {
    const tag = Buffer.alloc(32); tag.write('mip-0018:emitter:', 'ascii');
    const expected = createHash('sha256').update(tag).update(SECRET).digest('hex');
    expect(hex(probe.pureCircuits.emitterSecretHashOf(SECRET))).toBe(expected);
    const onChain = chain.state.index(address)?.serialize();
    expect(onChain && Buffer.from(onChain).includes(Buffer.from(expected, 'hex'))).toBe(true);
  });

  it('its committed verifier key is the one its committed wrapper was compiled with (expectedVk)', () => {
    const key = readFileSync(join(MANAGED, 'keys', 'publishBundle.verifier'));
    const wrapper = readFileSync(join(MANAGED, 'contract', 'index.js'), 'utf8');
    expect(wrapper).toContain(`'publishBundle': '${createHash('sha256').update(key).digest('hex')}',`);
  });
});

describe('the Multi-Part Event publisher builds public-interface transactions offline', () => {
  let parts: Buffer[];
  let built: BuiltTransaction;

  beforeAll(async () => {
    parts = hash.payloadParts(hash.assemblePayload(COMMIT_A, LONG_URL));
    built = await buildPackageTransaction(chain.source(), config, request(parts));
  });

  it('a URL over 224 bytes is a 512-byte pointer in two parts, split the same way by both tools', () => {
    expect(Buffer.byteLength(LONG_URL)).toBe(290);
    expect(parts).toHaveLength(2);
    expect(splitPayload(Buffer.concat(parts)).map(hex)).toEqual(parts.map(hex));
  });

  it('one guaranteed intent holding both publishBundle calls', () => {
    const [pkg] = built.packages;
    expect(built.packages).toHaveLength(1);
    expect(pkg?.parts.map(hex)).toEqual(parts.map(hex));
    expect(pkg?.entryPoint).toBe('publishBundle');
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

  it('applied: two events in one intent, ONE package whose payload parses back to the commitment and the full URL', () => {
    const result = chain.apply(built.transaction.eraseProofs());
    expect(result.type, String(result.error)).toBe('success');
    expect(result.events.map((e) => e.source.physicalSegment)).toEqual([built.packages[0]?.segment, built.packages[0]?.segment]);
    const { events, issues } = partEventsFromLedgerEvents(result.events, { network: NETWORK });
    expect(issues).toEqual([]);
    const { packages } = readPackages(events, { optIns: [{ contract: address, name: NAME }] });
    expect(packages).toHaveLength(1);
    expect(packages[0]?.status).toBe('accepted');
    expect(packages[0]?.parts).toHaveLength(2);
    const parsed = hash.parsePayload(packages[0]?.payload ?? new Uint8Array());
    expect(hex(parsed.commitment)).toBe(hex(COMMIT_A));
    expect(parsed.url).toBe(LONG_URL);
    expect(parsed.parts).toBe(2);
  });

  it('a stranger cannot build one: the emitter check fails while executing, before any event exists', async () => {
    await expect(buildPackageTransaction(chain.source(), config, request(parts, STRANGER))).rejects.toThrow(/caller is not the emitter/);
  });
});

describe('the patched public-interface tools read these publications from real raw event bytes (UC-2)', () => {
  it('a two-part pointer: one publication, its intent decoded from raw, the full URL', async () => {
    const parts = hash.payloadParts(hash.assemblePayload(COMMIT_A, LONG_URL));
    const built = await buildPackageTransaction(chain.source(), config, request(parts));
    const height = chain.height;
    const result = chain.apply(built.transaction.eraseProofs());
    expect(result.type).toBe('success');
    stubIndexer(asIndexerEvents([{ result, height, txId: 1 }]));
    const latest = await indexer.fetchLatestBundlePublication('http://indexer.local/api/v4/graphql', address);
    expect(latest).toMatchObject({ id: 1, parts: 2, partIds: [1, 2], segment: built.packages[0]?.segment, blockHeight: height, supersededIds: [] });
    expect(latest?.txHash).toBe(result.events[0]?.source.transactionHash);
    expect(hash.parsePayload(latest?.payload ?? new Uint8Array()).url).toBe(LONG_URL);
  });

  it('two publications in two intents of one transaction: two packages, the one whose first part executes later is current', async () => {
    const a = hash.payloadParts(hash.assemblePayload(COMMIT_A, LONG_URL));
    const b = hash.payloadParts(hash.assemblePayload(COMMIT_B, SHORT_URL));
    const built = await buildPackagesTransaction(chain.source(), config, [request(a), request(b)]);
    const [pa, pb] = built.packages;
    expect(pa?.segment).not.toBe(pb?.segment);
    const height = chain.height;
    const result = chain.apply(built.transaction.eraseProofs());
    expect(result.type).toBe('success');
    const segments = result.events.map((e) => e.source.physicalSegment);
    expect(segments).toHaveLength(3);
    // The package whose first part the ledger emitted last is the newest.
    const laterSegment = segments.indexOf(pa?.segment ?? -1) > segments.indexOf(pb?.segment ?? -1) ? pa?.segment : pb?.segment;
    const events = asIndexerEvents([{ result, height, txId: 7 }]);
    stubIndexer(events);
    const latest = await indexer.fetchLatestBundlePublication('http://indexer.local/api/v4/graphql', address);
    expect(latest?.segment).toBe(laterSegment);
    expect(latest?.supersededIds).toHaveLength(1);
    const parsed = hash.parsePayload(latest?.payload ?? new Uint8Array());
    expect(parsed.url).toBe(laterSegment === pa?.segment ? LONG_URL : SHORT_URL);
    expect(latest?.parts).toBe(laterSegment === pa?.segment ? 2 : 1);
  });

  it('two publications in two blocks: the later block is current', async () => {
    const first = await buildPackageTransaction(chain.source(), config, request(hash.payloadParts(hash.assemblePayload(COMMIT_A, LONG_URL))));
    const h1 = chain.height;
    const r1 = chain.apply(first.transaction.eraseProofs());
    const second = await buildPackageTransaction(chain.source(), config, request(hash.payloadParts(hash.assemblePayload(COMMIT_B, SHORT_URL))));
    const h2 = chain.height;
    const r2 = chain.apply(second.transaction.eraseProofs());
    expect([r1.type, r2.type]).toEqual(['success', 'success']);
    expect(h2).toBeGreaterThan(h1);
    stubIndexer(asIndexerEvents([{ result: r1, height: h1, txId: 1 }, { result: r2, height: h2, txId: 2 }]));
    const latest = await indexer.fetchLatestBundlePublication('http://indexer.local/api/v4/graphql', address);
    expect(latest).toMatchObject({ id: 3, parts: 1, blockHeight: h2, supersededIds: [1] });
    expect(hash.parsePayload(latest?.payload ?? new Uint8Array()).url).toBe(SHORT_URL);
  });
});
