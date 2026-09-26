// SPDX-License-Identifier: Apache-2.0
//
// The fixtures the token indexer consumes (sub-plan 02-B5): fixtures/simulator/ (the PI
// set's events as Multi-Part Event packages, each contract's interface and state) and
// fixtures/bundles/ (verification cases). They are exactly what scripts/export-fixtures.ts
// writes, and each bundle case is what cases.json says it is — checked with the patched
// reference public-interface-verify, including over HTTP (a loopback server started here)
// to see which files a failed Level 1 requested.
//
// Needs the patched tools installed: `npm run tools:ci`.
import { execFileSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const FIX = join(ROOT, 'fixtures');

type Case = {
  case: string; bundle: string; url: string; urlBytes: number; commitment: string; indexHash: string; eventPayloadHex: string; partsHex: string[];
  bundleBytes: number; files: number; state: string; limits?: { maxBundleBytes: number };
  expected: { status: string; level1: string; level2: string; level3: string; reason: string | null };
};
type Result = { level: number; checks: { level1: { ok: boolean; reason?: string; error?: string }; level2?: { ok: boolean } } };
type Verify = { verify(o: Record<string, unknown>): Promise<Result> };
type Hash = { readIndexFile(dir: string): { hash: string; compiler: { version: string }; files: { path: string }[] }; indexCommitment(i: unknown): Buffer; parsePayload(p: Uint8Array): { commitment: Buffer; url: string; parts: number } };

const cases = (JSON.parse(readFileSync(join(FIX, 'bundles', 'cases.json'), 'utf8')) as { cases: Case[] }).cases;
const caseOf = (name: string): Case => {
  const c = cases.find((x) => x.case === name);
  if (!c) throw new Error(`no case ${name}`);
  return c;
};
const state = Buffer.from(readFileSync(join(FIX, 'bundles', 'LSUNPI.state.hex'), 'utf8'), 'hex');
const payloadOf = (c: Case) => Buffer.from(c.eventPayloadHex, 'hex');
const dirOf = (c: Case) => join(FIX, 'bundles', c.bundle);

const tree = (dir: string): string[] => {
  const out: string[] = [];
  const visit = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) visit(p);
      else out.push(relative(dir, p).split(sep).join('/'));
    }
  };
  visit(dir);
  return out.sort();
};

let verifier: Verify;
let hash: Hash;
let regenerated: string;

beforeAll(async () => {
  verifier = (await import('../tools/public-interface/src/verify.mjs')) as unknown as Verify;
  hash = (await import('../tools/public-interface/src/hash.mjs')) as unknown as Hash;
  regenerated = mkdtempSync(join(tmpdir(), 'pi-fixtures-'));
  execFileSync(process.execPath, ['--import', 'tsx', join(ROOT, 'scripts', 'export-fixtures.ts'), '--out', regenerated], { cwd: ROOT, stdio: 'pipe' });
});
afterAll(() => rmSync(regenerated, { recursive: true, force: true }));

describe('fixtures/ is exactly what scripts/export-fixtures.ts writes (deterministic)', () => {
  it.each(['simulator', 'bundles'])('fixtures/%s: every file byte-identical to a fresh export', (sub) => {
    const committed = join(FIX, sub);
    const fresh = join(regenerated, 'fixtures', sub);
    expect(tree(committed)).toEqual(tree(fresh));
    for (const f of tree(committed)) expect(readFileSync(join(committed, f)).equals(readFileSync(join(fresh, f))), f).toBe(true);
  });
});

describe('fixtures/simulator', () => {
  const corpus = JSON.parse(readFileSync(join(FIX, 'simulator', 'events.json'), 'utf8')) as {
    events: { eventId: number; packageId: number; row: string; eventName: string; payloadHex: string; part: number; parts: number }[];
    packages: { packageId: number; row: string; eventName: string; parts: number; eventIds: number[]; payloadHex: string; publicInterface?: { url: string; commitment: string } ; metadata?: { key: string; value: string } }[];
  };
  const interfaces = (JSON.parse(readFileSync(join(FIX, 'simulator', 'interfaces.json'), 'utf8')) as { interfaces: { row: string; bundle: { url: string; parts: number; commitment: string; payloadHex: string }; stateHex: string }[] }).interfaces;

  it('every package is its events\' payloads merged in emission order, all 256 bytes of every part kept', () => {
    for (const p of corpus.packages) {
      const parts = corpus.events.filter((e) => e.packageId === p.packageId);
      expect(parts.map((e) => e.eventId)).toEqual(p.eventIds);
      expect(parts.map((e) => e.payloadHex).join('')).toBe(p.payloadHex);
      expect(Buffer.from(p.payloadHex, 'hex')).toHaveLength(256 * p.parts);
    }
  });

  it('only the two opted-in names; MIP-0018 declares only `repository`; one pointer per contract, UPROMPI\'s in 2 parts', () => {
    expect([...new Set(corpus.events.map((e) => e.eventName))].sort()).toEqual(['mip-0018:token-metadata[v1]', 'mip-xxxx:public-interface[v1]']);
    for (const p of corpus.packages.filter((x) => x.eventName === 'mip-0018:token-metadata[v1]')) expect(p.metadata?.key).toBe('repository');
    const pointers = corpus.packages.filter((x) => x.eventName === 'mip-xxxx:public-interface[v1]');
    expect(pointers.map((p) => [p.row, p.parts])).toEqual([['LSUNPI', 1], ['SSTARPI', 1], ['CNSTPI', 1], ['UPROMPI', 2]]);
    for (const p of pointers) {
      const i = interfaces.find((x) => x.row === p.row);
      expect(p.payloadHex).toBe(i?.bundle.payloadHex);
      expect(p.publicInterface?.url).toBe(i?.bundle.url);
      expect(p.publicInterface?.commitment).toBe(i?.bundle.commitment);
    }
  });

  it.each(['LSUNPI', 'SSTARPI', 'CNSTPI', 'UPROMPI'])('%s: its committed bundle passes Levels 1-2 against the state in interfaces.json', async (row) => {
    const i = interfaces.find((x) => x.row === row);
    const record = (JSON.parse(readFileSync(join(ROOT, 'deployments', 'bundles.json'), 'utf8')) as { bundles: { id: string; path: string }[] }).bundles.find((b) => b.id === row);
    const r = await verifier.verify({
      bundleDir: join(ROOT, 'bundles', ...(record?.path ?? '').split('/').filter(Boolean)),
      eventPayload: Buffer.from(i?.bundle.payloadHex ?? '', 'hex'),
      stateBytes: Buffer.from(i?.stateHex ?? '', 'hex'),
      level: 2,
    });
    expect(r.level).toBe(2);
  });
});

describe('fixtures/bundles: each case is what cases.json says (reference public-interface-verify, Levels 1-2)', () => {
  it('six cases, all built from LSUNPI, all one-part pointers', () => {
    expect(cases.map((c) => c.case)).toEqual(['valid', 'tampered-file', 'wrong-hash', 'over-size-cap', 'loopback-host', 'compiler-not-installed']);
    for (const c of cases) {
      expect(c.partsHex).toHaveLength(1);
      expect(hash.parsePayload(payloadOf(c))).toMatchObject({ url: c.url, parts: 1 });
      expect(hash.parsePayload(payloadOf(c)).commitment.toString('hex')).toBe(c.commitment);
      expect(readFileSync(join(dirOf(c), 'src', 'generated', 'LSUNPI.compact'), 'utf8')).toContain('LSUNPI');
    }
  });

  it('valid: verified at Level 2 (Level 3 is the same source as bundles/LSUNPI — scripts/verify-bundles.sh)', async () => {
    const c = caseOf('valid');
    expect(c.indexHash).toBe(c.commitment);
    const r = await verifier.verify({ bundleDir: dirOf(c), eventPayload: payloadOf(c), stateBytes: state, level: 2 });
    expect(r.level).toBe(2);
  });

  it('tampered-file: index.json agrees with the event, the listed file does not — failed at Level 1', async () => {
    const c = caseOf('tampered-file');
    expect(c.indexHash).toBe(c.commitment);
    const r = await verifier.verify({ bundleDir: dirOf(c), eventPayload: payloadOf(c), stateBytes: state, level: 2 });
    expect(r.level).toBe(0);
    expect(r.checks.level1.ok).toBe(false);
    expect(JSON.stringify(r.checks.level1)).toContain('src/generated/LSUNPI.compact');
  });

  it('over-size-cap: larger than its cap — stopped at Level 1 by the cap; verifies without it', async () => {
    const c = caseOf('over-size-cap');
    const cap = c.limits?.maxBundleBytes ?? 0;
    expect(cap).toBe(1024 * 1024);
    expect(c.bundleBytes).toBeGreaterThan(cap);
    const capped = await verifier.verify({ bundleDir: dirOf(c), eventPayload: payloadOf(c), stateBytes: state, level: 2, maxBytes: cap });
    expect(capped.checks.level1.ok).toBe(false);
    expect(JSON.stringify(capped.checks.level1)).toMatch(/cap/);
    const uncapped = await verifier.verify({ bundleDir: dirOf(c), eventPayload: payloadOf(c), stateBytes: state, level: 2 });
    expect(uncapped.level).toBe(2);
    for (const other of cases.filter((x) => x.case !== 'over-size-cap')) expect(other.bundleBytes).toBeLessThan(cap);
  });

  it('loopback-host: a consistent bundle whose URL names 127.0.0.1 (the refusal is the indexer\'s policy; the reference tool fetches it)', async () => {
    const c = caseOf('loopback-host');
    expect(new URL(c.url).hostname).toBe('127.0.0.1');
    const r = await verifier.verify({ bundleDir: dirOf(c), eventPayload: payloadOf(c), stateBytes: state, level: 2 });
    expect(r.level).toBe(2);
  });

  it('compiler-not-installed: names compactc 0.33.0 consistently, keys real — Levels 1-2 pass', async () => {
    const c = caseOf('compiler-not-installed');
    const index = hash.readIndexFile(dirOf(c));
    expect(index.compiler.version).toBe('0.33.0');
    expect((JSON.parse(readFileSync(join(dirOf(c), 'package.json'), 'utf8')) as { compact: { compiler: string } }).compact.compiler).toBe('0.33.0');
    const r = await verifier.verify({ bundleDir: dirOf(c), eventPayload: payloadOf(c), stateBytes: state, level: 2 });
    expect(r.level).toBe(2);
  });

  describe('over HTTP (a loopback static server started by the test)', () => {
    let server: Server;
    let base: string;
    const requested: string[] = [];
    beforeAll(async () => {
      server = createServer((req, res) => {
        const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
        requested.push(path);
        try {
          const body = readFileSync(join(FIX, 'bundles', ...path.split('/').filter(Boolean)));
          res.writeHead(200, { 'content-length': body.length });
          res.end(body);
        } catch {
          res.writeHead(404);
          res.end();
        }
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });
    afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

    it('wrong-hash: index.json\'s hash is not the event\'s commitment — failed at Level 1 after ONE request (index.json only)', async () => {
      const c = caseOf('wrong-hash');
      expect(c.indexHash).not.toBe(c.commitment);
      expect(hash.indexCommitment(hash.readIndexFile(dirOf(c))).toString('hex')).toBe(c.commitment);
      requested.length = 0;
      const r = await verifier.verify({ bundleUrl: `${base}/${c.bundle}/index.json`, eventPayload: payloadOf(c), stateBytes: state, level: 2 });
      expect(r.level).toBe(0);
      expect(r.checks.level1.ok).toBe(false);
      expect(requested).toEqual([`/${c.bundle}/index.json`]);
    });

    it('valid, fetched: every listed file requested once, verified at Level 2', async () => {
      const c = caseOf('valid');
      requested.length = 0;
      const r = await verifier.verify({ bundleUrl: `${base}/${c.bundle}/index.json`, eventPayload: payloadOf(c), stateBytes: state, level: 2 });
      expect(r.level).toBe(2);
      expect(requested).toHaveLength(c.files);
    });
  });
});
