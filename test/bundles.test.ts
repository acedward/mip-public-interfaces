// SPDX-License-Identifier: Apache-2.0
//
// The PI contracts' public-interface bundles (sub-plan 02-B2/B3): what
// public-interface-deploy-check (the patched copy, tools/public-interface) wrote under
// bundles/<path>/ and recorded in deployments/bundles.json. A FULL interface bundle ships
// the whole contract source with every module it imports, one verifier key per circuit,
// the generated wrapper and the contract description. Levels 1 and 2 are checked here,
// offline, against the state the contract's deployment plan leaves in the Compact
// simulator (scripts/simulate-pi.ts); Level 3 (a rebuild, minutes per contract) is
// scripts/verify-bundles.sh.
//
// Needs the patched tools installed: `npm run tools:ci`.
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type BundleRecord, buildBundles } from '../scripts/bundle.js';
import { simulatePi } from '../scripts/simulate-pi.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const TOOLS = join(ROOT, 'tools', 'public-interface');
const record = JSON.parse(readFileSync(join(ROOT, 'deployments', 'bundles.json'), 'utf8')) as { bundles: BundleRecord[] };
const IDS = ['LSUNPI', 'SSTARPI', 'CNSTPI', 'UPROMPI'];
const dirOf = (root: string, b: BundleRecord) => join(root, ...b.path.split('/').filter(Boolean));
const byId = (id: string): BundleRecord => {
  const b = record.bundles.find((x) => x.id === id);
  if (!b) throw new Error(`no bundle record ${id}`);
  return b;
};

type Hash = {
  readIndexFile(dir: string): { hash: string; files: { path: string; sha256: string; size: number }[]; compiler: { name: string; version: string } };
  indexCommitment(index: unknown): Buffer;
  assemblePayload(c: Uint8Array, url: string): Buffer;
  payloadParts(p: Uint8Array): Buffer[];
  parsePayload(p: Uint8Array): { commitment: Buffer; url: string; parts: number };
  pathProblem(p: string): string | null;
};
type Verify = {
  verify(o: { bundleDir: string; eventPayload: Uint8Array; stateBytes: Uint8Array; level: number }): Promise<{
    level: number;
    witnesses?: string[];
    checks: { level1: { ok: boolean; reason?: string }; level2?: { ok: boolean; rows: { circuit: string; status: string }[]; wrapper: { ok: boolean } } };
  }>;
};
let hash: Hash;
let verifier: Verify;

/** Every file under `dir`, relative POSIX paths, sorted. */
const tree = (dir: string): string[] => {
  const out: string[] = [];
  const visit = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) visit(p);
      else out.push(relative(dir, p).split(sep).join('/'));
    }
  };
  visit(dir);
  return out.sort();
};

let rebuilt: string;
let rebuiltRecords: BundleRecord[];

beforeAll(async () => {
  if (!existsSync(join(TOOLS, 'node_modules'))) throw new Error('tools/public-interface is not installed: run `npm run tools:ci` first');
  hash = (await import('../tools/public-interface/src/hash.mjs')) as unknown as Hash;
  verifier = (await import('../tools/public-interface/src/verify.mjs')) as unknown as Verify;
  rebuilt = mkdtempSync(join(tmpdir(), 'pi-bundles-'));
  rebuiltRecords = await buildBundles(rebuilt);
});
afterAll(() => rmSync(rebuilt, { recursive: true, force: true }));

describe('bundles/ and deployments/bundles.json are exactly what the bundle step writes', () => {
  it('four FULL bundles, one per PI contract (the DU set\'s HIDDEN bundles follow them: test/dual-interfaces.test.ts)', () => {
    expect(record.bundles.filter((b) => b.form === 'FULL').map((b) => b.id)).toEqual(IDS);
    expect(record.bundles.slice(0, IDS.length).map((b) => b.id)).toEqual(IDS);
  });

  it.each(IDS)('%s: the committed bundle is byte-identical to a fresh deploy-check of the committed sources and keys', (id) => {
    const b = byId(id);
    const committed = dirOf(join(ROOT, 'bundles'), b);
    const fresh = dirOf(rebuilt, b);
    expect(tree(committed)).toEqual(tree(fresh));
    for (const f of tree(committed)) expect(readFileSync(join(committed, f)).equals(readFileSync(join(fresh, f))), f).toBe(true);
    expect(rebuiltRecords.find((r) => r.id === id)).toEqual(b);
  });
});

describe('each bundle is a FULL interface of its contract', () => {
  it.each(IDS)('%s: index.json commits to its files; its hash is the recorded commitment; the payload is commitment ++ URL', (id) => {
    const b = byId(id);
    const dir = dirOf(join(ROOT, 'bundles'), b);
    const index = hash.readIndexFile(dir);
    expect(index.hash).toBe(b.commitment);
    expect(hash.indexCommitment(index).toString('hex')).toBe(b.commitment);
    expect(index.compiler).toEqual({ name: 'compactc', version: '0.34.0' });
    expect(index.files.map((f) => f.path).sort()).toEqual(tree(dir).filter((f) => f !== 'index.json'));
    for (const f of index.files) {
      expect(hash.pathProblem(f.path)).toBeNull();
      expect(createHash('sha256').update(readFileSync(join(dir, f.path))).digest('hex')).toBe(f.sha256);
    }
    const payload = hash.assemblePayload(Buffer.from(b.commitment, 'hex'), b.url);
    expect(payload.toString('hex')).toBe(b.payloadHex);
    expect(hash.payloadParts(payload).map((p) => p.toString('hex'))).toEqual(b.partsHex);
    expect(hash.parsePayload(payload)).toMatchObject({ url: b.url, parts: b.parts });
  });

  it.each(IDS)('%s: ships the whole contract source and every module it imports, and one verifier key per circuit', (id) => {
    const b = byId(id);
    const dir = dirOf(join(ROOT, 'bundles'), b);
    expect(b.interface).toBe(`src/generated/${id}.compact`);
    expect(readFileSync(join(dir, b.interface)).equals(readFileSync(join(ROOT, 'contracts', 'generated', `${id}.compact`)))).toBe(true);
    for (const m of ['TokenMetadata.compact', 'OffChainInterface.compact']) {
      expect(readFileSync(join(dir, 'src', m)).equals(readFileSync(join(ROOT, 'contracts', m))), m).toBe(true);
    }
    const info = JSON.parse(readFileSync(join(ROOT, 'contracts', 'managed', id, 'compiler', 'contract-info.json'), 'utf8')) as { circuits: { name: string }[] };
    const all = info.circuits.map((c) => c.name).sort();
    expect([...b.circuits].sort()).toEqual(all);
    expect(readdirSync(join(dir, 'out', 'keys')).sort()).toEqual(all.map((c) => `${c}.verifier`).sort());
    for (const c of all) {
      expect(readFileSync(join(dir, 'out', 'keys', `${c}.verifier`)).equals(readFileSync(join(ROOT, 'contracts', 'managed', id, 'keys', `${c}.verifier`)))).toBe(true);
    }
    expect(tree(dir).some((f) => f.endsWith('.prover') || f.includes('zkir'))).toBe(false);
  });

  it('the vendored OpenZeppelin modules travel with the bundles that import them', () => {
    const files = (id: string) => tree(dirOf(join(ROOT, 'bundles'), byId(id))).filter((f) => f.startsWith('src/vendor/'));
    expect(files('LSUNPI')).toEqual(['src/vendor/openzeppelin/token/FungibleToken.compact', 'src/vendor/openzeppelin/utils/Utils.compact']);
    expect(files('SSTARPI')).toEqual(['src/vendor/openzeppelin/token/NativeShieldedToken.compact', 'src/vendor/openzeppelin/token/NativeShieldedTokenCore.compact', 'src/vendor/openzeppelin/utils/Utils.compact']);
    expect(files('CNSTPI')).toEqual(['src/vendor/openzeppelin/token/NativeShieldedTokenCore.compact', 'src/vendor/openzeppelin/token/NativeShieldedTokenFamily.compact', 'src/vendor/openzeppelin/utils/Utils.compact']);
    expect(files('UPROMPI')).toEqual([]);
  });

  it.each(IDS)('%s: the circuits that take a witness are reported verify-only (UC-3); the others are plain reads/writes', (id) => {
    const b = byId(id);
    expect(b.witnesses).toContain('emitterSecret');
    const emitting = b.circuits.filter((c) => c === 'publishBundle' || /^publish.*Repository$/.test(c));
    const expected = id === 'LSUNPI' ? [...emitting, 'transfer'] : emitting;
    expect([...b.verifyOnly].sort()).toEqual(expected.sort());
  });

  it.each(IDS)('%s: ships its licences and provenance — LICENSE, NOTICE, SOURCE.md, committed like every file (audit 02 E2-C1/C2)', (id) => {
    const b = byId(id);
    const dir = dirOf(join(ROOT, 'bundles'), b);
    const listed = hash.readIndexFile(dir).files.map((f) => f.path);
    for (const f of ['LICENSE', 'NOTICE', 'SOURCE.md']) expect(listed, f).toContain(f);
    expect(readFileSync(join(dir, 'LICENSE')).equals(readFileSync(join(ROOT, 'LICENSE')))).toBe(true);
    const notice = readFileSync(join(dir, 'NOTICE'), 'utf8');
    // [B]'s NOTICE (Apache-2.0 §4(d)) for its module; OpenZeppelin's MIT notice IN FULL iff the bundle carries OZ code.
    expect(notice).toContain('compact-off-chain-circuits\n    Copyright 2026 the compact-off-chain-circuits authors.');
    const oz = listed.filter((f) => f.startsWith('src/vendor/openzeppelin/'));
    const mit = readFileSync(join(ROOT, 'contracts', 'vendor', 'openzeppelin', 'LICENSE'), 'utf8').trimEnd().split('\n').map((l) => (l === '' ? '' : `    ${l}`)).join('\n');
    expect(notice.includes(mit)).toBe(oz.length > 0);
    for (const f of oz) expect(notice).toContain(f);
    // SOURCE.md: every src/ file with its SHA-256 as shipped, and nothing else.
    const rows = readFileSync(join(dir, 'SOURCE.md'), 'utf8').split('\n').filter((l) => /^\| `src\//.test(l));
    const recorded = rows.map((l) => [/^\| `([^`]+)`/.exec(l)![1]!, /`([0-9a-f]{64})`/.exec(l)![1]!] as const);
    expect(recorded.map(([f]) => f).sort()).toEqual(listed.filter((f) => f.startsWith('src/')).sort());
    for (const [f, digest] of recorded) expect(createHash('sha256').update(readFileSync(join(dir, f))).digest('hex'), f).toBe(digest);
  });

  it.each(IDS)('%s: the bundle README says what the bundle is — a FULL interface, verified at Levels 1-3, never executed (it declares witnesses) (audit 02 E2-C3)', (id) => {
    const readme = readFileSync(join(dirOf(join(ROOT, 'bundles'), byId(id)), 'README.md'), 'utf8');
    expect(readme).toContain('a FULL interface, every circuit of the\ncontract is published');
    expect(readme).not.toContain('deliberately\npartial');
    expect(readme).toContain('This interface declares witnesses (`emitterSecret`');
    expect(readme).not.toMatch(/--circuit /);
    expect(readme).toMatch(/--level 3/);
    expect(readme).toContain('`LICENSE`, `NOTICE`, `SOURCE.md` state the licences');
    // …and names a verifier that can read it: the patched tools (UPROMPI's pointer has 2 parts; the
    // upstream parser takes exactly 256 bytes — 02-E contracts review).
    expect(readme.match(/node <mip-public-interfaces>\/tools\/public-interface\/src\/verify\.mjs/g)).toHaveLength(2);
    expect(readme).not.toContain('node <compact-off-chain-circuits>');
  });

  it('UPROMPI: the only multi-part pointer — a URL over 224 bytes, 2 parts (02-B3)', () => {
    expect(record.bundles.filter((b) => b.parts > 1).map((b) => b.id)).toEqual(['UPROMPI']);
    const u = byId('UPROMPI');
    expect(u.urlBytes).toBeGreaterThan(224);
    expect(u.parts).toBe(2);
    expect(u.partsHex).toHaveLength(2);
    expect(Buffer.from(u.payloadHex, 'hex')).toHaveLength(512);
  });
});

describe('public-interface-verify (patched) Levels 1 and 2, offline, against the simulated deployment', () => {
  it.each(IDS)('%s: Level 2 — every shipped key is the key the deployed state holds under that name', async (id) => {
    const b = byId(id);
    const sim = await simulatePi(id);
    // The deployment plan's publishBundle parts, as the contract emitted them, merged in order.
    const emitted = sim.events.filter((e) => e.circuit === 'publishBundle').map((e) => e.payloadHex).join('');
    expect(emitted).toBe(b.payloadHex);
    const r = await verifier.verify({ bundleDir: dirOf(join(ROOT, 'bundles'), b), eventPayload: Buffer.from(emitted, 'hex'), stateBytes: sim.state, level: 2 });
    expect(r.checks.level1.ok, r.checks.level1.reason).toBe(true);
    expect(r.checks.level2?.ok).toBe(true);
    expect(r.checks.level2?.wrapper.ok).toBe(true);
    expect(r.level).toBe(2);
    expect(r.checks.level2?.rows.map((x) => x.status)).toEqual(b.circuits.map(() => 'OK'));
    expect(r.witnesses).toContain('emitterSecret');
  });

  it('negative control: a state holding another contract\'s keys fails Level 2', async () => {
    const lsun = byId('LSUNPI');
    const other = await simulatePi('SSTARPI');
    const r = await verifier.verify({ bundleDir: dirOf(join(ROOT, 'bundles'), lsun), eventPayload: Buffer.from(lsun.payloadHex, 'hex'), stateBytes: other.state, level: 2 });
    expect(r.checks.level1.ok).toBe(true);
    expect(r.checks.level2?.ok).toBe(false);
    expect(r.level).toBe(1);
  });
});
