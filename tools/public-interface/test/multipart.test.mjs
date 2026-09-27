// SPDX-License-Identifier: Apache-2.0
// Multi-part publications (patch UC-2 of project 00024, mip-public-interfaces).
// Events named `mip-xxxx:public-interface[v1]` follow the Multi-Part Event rule:
// the events of one contract in one intent of one transaction are the parts of ONE
// publication, merged in emission order into a 256·k-byte payload,
// commitment ++ utf8(url), zero padded. Upstream built and parsed exactly one
// 256-byte event and took the last individual event as the newest publication.
//
// Two different claims are tested here:
//   * the payload FORMAT extends to several parts unchanged — a 256·k payload
//     reads as commitment + a longer URL, and a one-part payload is byte for byte
//     the original layout;
//   * the TOOLS now build, discover and parse several parts: deploy-check splits a
//     long URL into parts, the indexer reader groups parts by transaction and
//     intent (the intent from each event's `raw`), and the newest publication is
//     chosen in canonical order — block, transaction position, first part.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { deployCheck } from '../src/deployer.mjs';
import { PUBLIC_INTERFACE_EVENT } from '../src/event.mjs';
import { MAX_URL_BYTES, PART_BYTES, assemblePayload, parsePayload, partCountFor, payloadParts } from '../src/hash.mjs';
import { eventSourceFromRaw, fetchBundlePublications, fetchLatestBundlePublication, groupPublications } from '../src/indexer.mjs';
import { verify } from '../src/verify.mjs';
import { simulate } from '../scripts/simulate-deploy.mjs';
import { BUILD_HINT, FIXTURES, REPO, fullOut, hasCompact, interfaceOut, interfaceSrc, isBuilt, runSrc, scratch } from './helpers.mjs';

const GRAPHQL = 'https://indexer.example/api/v4/graphql';
const ADDRESS = 'ab'.repeat(32);
const NAME_HEX = Buffer.concat([Buffer.from(PUBLIC_INTERFACE_EVENT, 'latin1'), Buffer.alloc(32)]).subarray(0, 32).toString('hex');
const OTHER_NAME_HEX = Buffer.concat([Buffer.from('example:message[v1]', 'latin1'), Buffer.alloc(32)]).subarray(0, 32).toString('hex');
const txHash = (n) => n.toString(16).padStart(64, '0');

/**
 * A stand-in for the ledger's `Event.deserialize(raw).source`: these synthetic
 * events carry `{ tx, segment }` as their `raw`. The real decoder is tested on a
 * real ledger event below.
 */
const fakeRaw = (tx, segment) => Buffer.from(JSON.stringify({ tx, segment })).toString('hex');
const sourceOf = async (rawHex) => {
  const { tx, segment } = JSON.parse(Buffer.from(rawHex, 'hex').toString('utf8'));
  return { transactionHash: tx, segment };
};

/** One indexer `MiscContractEvent` of the public-interface name: one 256-byte part. */
const part = ({ id, bytes, tx, segment, txId, height, name = NAME_HEX, raw = fakeRaw(txHash(tx), segment) }) => ({
  __typename: 'MiscContractEvent', id, raw, name, payload: Buffer.from(bytes).toString('hex'),
  transaction: { id: txId ?? tx, hash: txHash(tx), block: { height } },
});

/** The indexer's shape for `events` after the name filter, as fetchMiscEvents builds it. */
const indexed = (events) => events.map((e) => ({
  id: e.id, nameHex: e.name, raw: e.raw, payload: Buffer.from(e.payload, 'hex'),
  txId: e.transaction.id, txHash: e.transaction.hash, blockHeight: e.transaction.block.height,
}));

/** Stub `fetch`: `contractEvents` answers `events`, `contractAction` answers `stateHex`. */
function stubIndexer(events, stateHex = '00') {
  globalThis.fetch = vi.fn(async (_url, init) => {
    const body = JSON.parse(init.body);
    const data = body.query.includes('contractEvents')
      ? { contractEvents: body.variables.offset === 0 ? events : [] }
      : { contractAction: { address: ADDRESS, state: stateHex, transaction: { hash: 'ff'.repeat(32), block: { height: 9999 } } } };
    return { ok: true, status: 200, json: async () => ({ data }) };
  });
}
const COMMIT_A = Buffer.alloc(32, 0xa1);
const COMMIT_B = Buffer.alloc(32, 0xb2);
const LONG_A = `https://bundles.example/${'a'.repeat(260)}/index.json`;   // 295 bytes: two parts
const SHORT_B = 'https://bundles.example/b/index.json';

afterEach(() => { vi.unstubAllGlobals(); delete globalThis.fetch; });

describe('the payload format extends to several parts', () => {
  it('a URL of up to 224 bytes is one 256-byte part, byte for byte the original layout', () => {
    const url = `https://a.example/${'x'.repeat(MAX_URL_BYTES - 18)}`;
    expect(Buffer.byteLength(url)).toBe(224);
    const p = assemblePayload(COMMIT_A, url);
    expect(p).toHaveLength(PART_BYTES);
    const legacy = Buffer.alloc(256); COMMIT_A.copy(legacy, 0); Buffer.from(url).copy(legacy, 32);
    expect(p.equals(legacy)).toBe(true);
    expect(partCountFor(url)).toBe(1);
  });

  it('a longer URL takes ceil((32 + len) / 256) parts and round-trips through the parts', () => {
    for (const len of [225, 480, 481, 1000]) {
      const url = `https://a.example/${'y'.repeat(len - 18)}`;
      const p = assemblePayload(COMMIT_B, url);
      expect(p).toHaveLength(Math.ceil((32 + len) / 256) * 256);
      const parts = payloadParts(p);
      expect(parts).toHaveLength(partCountFor(url));
      expect(parts.every((x) => x.length === 256)).toBe(true);
      expect(Buffer.concat(parts).equals(p)).toBe(true);
      const parsed = parsePayload(Buffer.concat(parts));
      expect(parsed.commitment.equals(COMMIT_B)).toBe(true);
      expect(parsed.url).toBe(url);
      expect(parsed.parts).toBe(parts.length);
    }
  });
});

describe('publications are Multi-Part Event packages, newest in canonical order', () => {
  it('two publications in two intents of one transaction are two packages; the one whose first part executes later is current', async () => {
    const [a1, a2] = payloadParts(assemblePayload(COMMIT_A, LONG_A));
    const [b1] = payloadParts(assemblePayload(COMMIT_B, SHORT_B));
    const events = [
      part({ id: 30, bytes: a1, tx: 7, segment: 9, height: 300 }),
      part({ id: 31, bytes: a2, tx: 7, segment: 9, height: 300 }),
      part({ id: 32, bytes: b1, tx: 7, segment: 4, height: 300 }),
    ];
    const pubs = await groupPublications(indexed(events), { sourceOf });
    expect(pubs.map((p) => [p.id, p.partIds, p.segment, p.parts])).toEqual([[30, [30, 31], 9, 2], [32, [32], 4, 1]]);
    expect(parsePayload(pubs[0].payload).url).toBe(LONG_A);
    expect(parsePayload(pubs[1].payload).url).toBe(SHORT_B);

    stubIndexer(events);
    const latest = await fetchLatestBundlePublication(GRAPHQL, ADDRESS, { sourceOf });
    expect(latest).toMatchObject({ id: 32, parts: 1, segment: 4, supersededIds: [30], txHash: txHash(7), blockHeight: 300 });
    expect(parsePayload(latest.payload).commitment.equals(COMMIT_B)).toBe(true);
  });

  it('parts of two intents that interleave: the package that BEGINS later is current (first part, not last)', async () => {
    const [a1, a2] = payloadParts(assemblePayload(COMMIT_A, LONG_A));
    const [b1, b2] = payloadParts(assemblePayload(COMMIT_B, `https://bundles.example/${'b'.repeat(260)}/`));
    const pubs = await groupPublications(indexed([
      part({ id: 60, bytes: a1, tx: 8, segment: 1, height: 310 }),
      part({ id: 61, bytes: b1, tx: 8, segment: 2, height: 310 }),
      part({ id: 62, bytes: b2, tx: 8, segment: 2, height: 310 }),
      part({ id: 63, bytes: a2, tx: 8, segment: 1, height: 310 }),
    ]), { sourceOf });
    expect(pubs.map((p) => p.partIds)).toEqual([[60, 63], [61, 62]]);
    expect(parsePayload(pubs[0].payload).url).toBe(LONG_A);
  });

  it('two publications in two blocks: the later block is current whatever the event ids; in one block the later transaction', async () => {
    const [a] = payloadParts(assemblePayload(COMMIT_A, SHORT_B));
    const [b] = payloadParts(assemblePayload(COMMIT_B, SHORT_B));
    // Indexer ids follow chain order, so ids against the block order never occur;
    // they pin the sort key: block height first, then transaction position.
    const byBlock = await groupPublications(indexed([
      part({ id: 41, bytes: a, tx: 1, segment: 3, height: 499 }),
      part({ id: 40, bytes: b, tx: 2, segment: 3, height: 500 }),
    ]), { sourceOf });
    expect(byBlock.map((p) => [p.blockHeight, p.id])).toEqual([[499, 41], [500, 40]]);
    const byTx = await groupPublications(indexed([
      part({ id: 50, bytes: a, tx: 3, txId: 12, segment: 3, height: 600 }),
      part({ id: 45, bytes: b, tx: 4, txId: 11, segment: 3, height: 600 }),
    ]), { sourceOf });
    expect(byTx.map((p) => [p.txId, p.id])).toEqual([[11, 45], [12, 50]]);

    stubIndexer([
      part({ id: 1, bytes: a, tx: 21, segment: 5, height: 700 }),
      part({ id: 2, bytes: b, tx: 22, segment: 5, height: 701 }),
    ]);
    const latest = await fetchLatestBundlePublication(GRAPHQL, ADDRESS, { sourceOf });
    expect(latest).toMatchObject({ id: 2, blockHeight: 701, supersededIds: [1] });
  });

  it('a pointer split over two intents is two one-part packages, each judged alone', async () => {
    const [p1, p2] = payloadParts(assemblePayload(COMMIT_A, LONG_A));
    const pubs = await groupPublications(indexed([
      part({ id: 80, bytes: p1, tx: 9, segment: 1, height: 800 }),
      part({ id: 81, bytes: p2, tx: 9, segment: 2, height: 800 }),
    ]), { sourceOf });
    expect(pubs.map((p) => p.parts)).toEqual([1, 1]);
    // The newest is the lone continuation: its first 32 bytes are URL text, not the commitment.
    const lone = parsePayload(pubs[1].payload);
    expect(lone.commitment.equals(COMMIT_A)).toBe(false);
    expect(lone.url).not.toBe(LONG_A);
  });

  it('only the public-interface name is grouped; the same intent\'s other events are ignored', async () => {
    const [a] = payloadParts(assemblePayload(COMMIT_A, SHORT_B));
    stubIndexer([
      part({ id: 90, bytes: a, tx: 5, segment: 6, height: 900 }),
      part({ id: 91, bytes: Buffer.alloc(256, 0x55), tx: 5, segment: 6, height: 900, name: OTHER_NAME_HEX }),
    ]);
    const pubs = await fetchBundlePublications(GRAPHQL, ADDRESS, { sourceOf });
    expect(pubs.map((p) => p.partIds)).toEqual([[90]]);
    expect(pubs[0].payload.equals(a)).toBe(true);
  });

  it('asks the indexer for raw bytes and the transaction position', async () => {
    stubIndexer([]);
    await fetchBundlePublications(GRAPHQL, ADDRESS, { sourceOf });
    const { query } = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(query).toMatch(/\braw\b/);
    expect(query).toContain('transaction { id hash block { height } }');
  });

  it('an event without raw bytes, or whose raw does not decode, is an error, never a guess', async () => {
    const [a] = payloadParts(assemblePayload(COMMIT_A, SHORT_B));
    const noRaw = { ...part({ id: 3, bytes: a, tx: 1, segment: 1, height: 1 }), raw: null };
    stubIndexer([noRaw]);
    await expect(fetchBundlePublications(GRAPHQL, ADDRESS, { sourceOf })).rejects.toThrow(/event 3: no raw bytes/);
    stubIndexer([part({ id: 4, bytes: a, tx: 1, segment: 1, height: 1, raw: '00ff' })]);
    await expect(fetchBundlePublications(GRAPHQL, ADDRESS)).rejects.toThrow(/event 4: raw bytes do not decode as a ledger event/);
  });

  it('raw bytes that name another transaction than the indexer does are an error', async () => {
    const [a] = payloadParts(assemblePayload(COMMIT_A, SHORT_B));
    stubIndexer([part({ id: 5, bytes: a, tx: 1, segment: 1, height: 1, raw: fakeRaw(txHash(2), 1) })]);
    await expect(fetchBundlePublications(GRAPHQL, ADDRESS, { sourceOf })).rejects.toThrow(/event 5: raw bytes name transaction/);
  });

  it('a typed payload trimmed of trailing zeros is restored to 256 bytes; one over 256 is refused', async () => {
    const [a] = payloadParts(assemblePayload(COMMIT_A, SHORT_B));
    const trimmed = a.subarray(0, 32 + Buffer.byteLength(SHORT_B));
    const [pub] = await groupPublications(indexed([part({ id: 6, bytes: trimmed, tx: 1, segment: 1, height: 1 })]), { sourceOf });
    expect(pub.payload.equals(a)).toBe(true);
    await expect(groupPublications(indexed([part({ id: 7, bytes: Buffer.alloc(257), tx: 1, segment: 1, height: 1 })]), { sourceOf }))
      .rejects.toThrow(/event 7: payload is 257 bytes/);
  });
});

describe('the default raw decoder, on a real ledger event (the live Stagenet publication)', () => {
  // test/fixtures/live-event.json: the one publishBundle event of the live example
  // contract, read from the public Stagenet indexer; deploy-tools/deployment.json
  // records the same publication.
  const live = JSON.parse(readFileSync(join(FIXTURES, 'live-event.json'), 'utf8'));
  const record = JSON.parse(readFileSync(join(REPO, 'deploy-tools', 'deployment.json'), 'utf8'));

  it('reads the transaction and the intent from Event.deserialize(raw).source', async () => {
    const source = await eventSourceFromRaw(live.event.raw);
    expect(source.transactionHash).toBe(record.publish.txHash);
    expect(Number.isInteger(source.segment) && source.segment > 0).toBe(true);
  });

  it('the live publication is a one-part package whose payload is the recorded one', async () => {
    stubIndexer([live.event]);
    const latest = await fetchLatestBundlePublication(GRAPHQL, live.address);
    expect(latest).toMatchObject({ id: live.event.id, parts: 1, partIds: [live.event.id], txHash: record.publish.txHash, blockHeight: record.publish.blockHeight, supersededIds: [] });
    expect(latest.segment).toBe((await eventSourceFromRaw(live.event.raw)).segment);
    expect(latest.payload.toString('hex')).toBe(record.bundle.payload);
    expect(parsePayload(latest.payload).url).toBe(record.bundle.url);
  });
});

describe.skipIf(!isBuilt())(`a two-part URL end to end (${isBuilt() ? 'built' : BUILD_HINT})`, () => {
  let s, bundle, sim;
  const URL = `https://example.invalid/${'long-path-segment/'.repeat(14)}multi/`;   // 292 bytes with index.json

  beforeAll(async () => {
    s = scratch('multipart');
    bundle = deployCheck({ interfaceSrc: interfaceSrc('multi'), interfaceOut: interfaceOut('multi'), fullOut: fullOut('multi'), outDir: join(s.dir, 'bundle'), url: URL });
    sim = await simulate('multi', { bundleDir: bundle.outDir, url: URL });
  });
  afterAll(() => s?.cleanup());

  it('deploy-check splits the pointer into two 256-byte parts instead of refusing the URL', () => {
    expect(Buffer.byteLength(bundle.url)).toBeGreaterThan(MAX_URL_BYTES);
    expect(bundle.payload).toHaveLength(512);
    expect(bundle.parts).toHaveLength(2);
    expect(Buffer.concat(bundle.parts).equals(bundle.payload)).toBe(true);
  });

  it('the contract emits one publishBundle event per part, and the parts merge back to the payload', () => {
    expect(sim.parts).toBe(2);
    expect(sim.eventPayload.equals(bundle.payload)).toBe(true);
  });

  it(`verify reaches Level ${hasCompact() ? 3 : 2} from the merged payload and reads the full URL`, async () => {
    const v = await verify({ bundleDir: bundle.outDir, eventPayload: sim.eventPayload, stateBytes: sim.state, level: hasCompact() ? 3 : 2 });
    expect(v.event).toEqual({ url: bundle.url, commitment: bundle.commitment.toString('hex'), parts: 2 });
    expect(v.level).toBe(hasCompact() ? 3 : 2);
  });

  it('through the indexer: the two part events of one intent are one publication, verified', async () => {
    stubIndexer([
      part({ id: 100, bytes: bundle.parts[0], tx: 42, segment: 17, height: 1000 }),
      part({ id: 101, bytes: bundle.parts[1], tx: 42, segment: 17, height: 1000 }),
    ], sim.state.toString('hex'));
    const v = await verify({ indexerUrl: GRAPHQL, address: ADDRESS, bundleDir: bundle.outDir, sourceOf });
    expect(v.source).toMatchObject({ from: 'indexer', eventId: 100, partIds: [100, 101], parts: 2, segment: 17, eventBlockHeight: 1000, supersededIds: [] });
    expect(v.event.url).toBe(bundle.url);
    expect(v.level).toBe(2);
  });

  it('split over two intents, the newest package is a lone part and fails Level 1', async () => {
    stubIndexer([
      part({ id: 110, bytes: bundle.parts[0], tx: 43, segment: 1, height: 1001 }),
      part({ id: 111, bytes: bundle.parts[1], tx: 43, segment: 2, height: 1001 }),
    ], sim.state.toString('hex'));
    const v = await verify({ indexerUrl: GRAPHQL, address: ADDRESS, bundleDir: bundle.outDir, sourceOf });
    expect(v.source).toMatchObject({ eventId: 111, parts: 1, supersededIds: [110] });
    expect(v.level).toBe(0);
    expect(v.checks.level1).toMatchObject({ ok: false, hashOk: false });
  });

  it('the CLIs: deploy-check prints both parts; verify takes the 512-byte payload', async () => {
    const out = await runSrc('deployer.mjs', ['--example', 'multi', '--url', URL, '--out', join(s.dir, 'cli')]);
    expect(out.code).toBe(0);
    expect(out.stdout).toContain(`(${Buffer.byteLength(bundle.url)} bytes; 2 parts, 224 bytes fit one)`);
    expect(out.stdout).toMatch(/^ {2}part 1\/2: publishBundle\(0x[0-9a-f]{512}\)$/m);
    expect(out.stdout).toMatch(/^ {2}part 2\/2: publishBundle\(0x[0-9a-f]{512}\)$/m);
    const json = JSON.parse((await runSrc('deployer.mjs', ['--example', 'multi', '--url', URL, '--out', join(s.dir, 'cli-json'), '--json'])).stdout);
    expect(json.parts).toHaveLength(2);
    expect(json.parts.join('')).toBe(json.payload);

    const stateFile = join(s.dir, 'state.hex');
    writeFileSync(stateFile, sim.state.toString('hex'));
    const cli = await runSrc('verify.mjs', ['--bundle', bundle.outDir, '--event-payload', sim.eventPayload.toString('hex'), '--state', stateFile]);
    expect(cli.code).toBe(0);
    expect(cli.stdout).toMatch(/^event url {3}: https:\/\/example\.invalid\/.*\/multi\/index\.json \(2-part payload\)$/m);
    expect(cli.stdout).toMatch(/verified up to level 2/);
  });
});
