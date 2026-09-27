// SPDX-License-Identifier: Apache-2.0
//
// The DU set's HIDDEN public interfaces (sub-plan 03-A2): the Public Interfaces draft's private
// form (`contracts/interfaces/<ID>.Interface.compact`: no import, the deployed ledger slot by slot
// under hidden names, every impure circuit of the contract with the module code it calls written
// out locally, no pure circuit — spec Q9), built on its own (`contracts/managed/<ID>.Interface/`)
// and bundled by the patched public-interface-deploy-check WITHOUT `interfaceKind: 'full'`. Every
// published circuit must compile to the DEPLOYED contract's verifier key; Levels 1-2 are checked
// here offline against the state the contract's plan leaves in the Compact simulator; Level 3 (a
// rebuild with keys, minutes per contract) is scripts/verify-bundles.sh.
//
// Needs the patched tools installed: `npm run tools:ci`.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type BundleRecord, buildBundles } from '../scripts/bundle.js';
import { simulatePi } from '../scripts/simulate-pi.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const MANAGED = join(ROOT, 'contracts', 'managed');
const INTERFACES = join(ROOT, 'contracts', 'interfaces');
const IDS = ['SNEBDU', 'LMOONDU', 'UMETDU', 'DAURDU'];
const TEMPLATE: Record<string, string> = { SNEBDU: 'NativeShieldedToken', LMOONDU: 'FungibleToken', UMETDU: 'NativeUnshieldedToken', DAURDU: 'NativeDualToken' };
const OZ_ADAPTED: Record<string, string[]> = {
  SNEBDU: ['token/NativeShieldedToken', 'token/NativeShieldedTokenCore', 'utils/Utils'],
  LMOONDU: ['token/FungibleToken', 'utils/Utils'],
  UMETDU: [],
  DAURDU: ['token/NativeShieldedToken', 'token/NativeShieldedTokenCore', 'utils/Utils'],
};

type Info = {
  'compiler-version': string;
  circuits: { name: string; pure: boolean; proof: boolean; arguments: unknown[]; 'result-type': unknown }[];
  witnesses: { name: string }[];
  ledger: { name: string; index: number; storage: string; [k: string]: unknown }[];
};
const info = (dir: string): Info => JSON.parse(readFileSync(join(MANAGED, dir, 'compiler', 'contract-info.json'), 'utf8')) as Info;
const record = JSON.parse(readFileSync(join(ROOT, 'deployments', 'bundles.json'), 'utf8')) as { bundles: BundleRecord[] };
const byId = (id: string): BundleRecord => {
  const b = record.bundles.find((x) => x.id === id);
  if (!b) throw new Error(`no bundle record ${id}`);
  return b;
};
const dirOf = (root: string, b: BundleRecord) => join(root, ...b.path.split('/').filter(Boolean));
const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex');
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
/** A ledger slot without its (hidden) name: what a verifier key can depend on. */
const shape = (slot: Info['ledger'][number]) => {
  const { name: _name, exported: _exported, ...rest } = slot;
  return rest;
};

type Hash = { readIndexFile(dir: string): { hash: string; files: { path: string; sha256: string }[]; compiler: unknown }; indexCommitment(i: unknown): Buffer; assemblePayload(c: Uint8Array, url: string): Buffer; payloadParts(p: Uint8Array): Buffer[] };
type Verify = {
  verify(o: { bundleDir: string; eventPayload: Uint8Array; stateBytes: Uint8Array; level: number }): Promise<{
    level: number;
    witnesses?: string[];
    checks: { level1: { ok: boolean; reason?: string }; level2?: { ok: boolean; rows: { circuit: string; status: string }[]; wrapper: { ok: boolean } } };
  }>;
};
let hash: Hash;
let verifier: Verify;
let regenerated: string;

beforeAll(async () => {
  if (!existsSync(join(ROOT, 'tools', 'public-interface', 'node_modules'))) throw new Error('tools/public-interface is not installed: run `npm run tools:ci` first');
  hash = (await import('../tools/public-interface/src/hash.mjs')) as unknown as Hash;
  verifier = (await import('../tools/public-interface/src/verify.mjs')) as unknown as Verify;
  regenerated = mkdtempSync(join(tmpdir(), 'du-if-'));
  execFileSync(process.execPath, ['--import', 'tsx', join(ROOT, 'scripts', 'generate-du-contracts.ts'), '--out', regenerated], { cwd: ROOT, stdio: 'pipe' });
});
afterAll(() => rmSync(regenerated, { recursive: true, force: true }));

describe('the HIDDEN interface sources (contracts/interfaces/, GENERATED)', () => {
  it('exactly one interface per DU contract', () => {
    expect(readdirSync(INTERFACES).sort()).toEqual(IDS.map((id) => `${id}.Interface.compact`).sort());
  });

  it.each(IDS)('%s.Interface.compact is exactly what the generator writes', (id) => {
    expect(readFileSync(join(INTERFACES, `${id}.Interface.compact`), 'utf8')).toBe(readFileSync(join(regenerated, 'contracts', 'interfaces', `${id}.Interface.compact`), 'utf8'));
  });

  it.each(IDS)('%s: the private form — imports no module, declares the ledger under hidden names, exports none of it', (id) => {
    const src = readFileSync(join(INTERFACES, `${id}.Interface.compact`), 'utf8');
    expect(src.match(/^import .*$/gm)).toEqual(['import CompactStandardLibrary;']);
    const slots = src.match(/^(?:sealed )?ledger hidden\d+: .*;$/gm) ?? [];
    expect(slots.map((l) => /hidden(\d+)/.exec(l)![1])).toEqual(info(id).ledger.map((_, i) => String(i + 1)));
    expect(src).not.toMatch(/^export (?:sealed )?ledger/m);
    // none of the deployed contract's own names for its ledger fields, as an identifier
    for (const slot of info(id).ledger) expect(new RegExp(`(?<![A-Za-z0-9_])${slot.name}(?![A-Za-z0-9_])`).test(src), slot.name).toBe(false);
  });
});

describe('the interface builds (contracts/managed/<ID>.Interface/, compactc 0.34.0) reproduce the deployed contract', () => {
  it.each(IDS)('%s: publishes EVERY impure circuit of the contract and no pure circuit (spec Q9), with the same signatures', (id) => {
    const full = info(id);
    const intf = info(`${id}.Interface`);
    expect(intf['compiler-version']).toBe('0.34.0');
    const impure = full.circuits.filter((c) => !c.pure);
    expect(full.circuits.filter((c) => c.pure)).toHaveLength(1);
    expect(intf.circuits.map((c) => c.name).sort()).toEqual(impure.map((c) => c.name).sort());
    expect(intf.circuits.every((c) => !c.pure && c.proof)).toBe(true);
    for (const c of intf.circuits) {
      const f = full.circuits.find((x) => x.name === c.name)!;
      expect([c.arguments, c['result-type']], c.name).toEqual([f.arguments, f['result-type']]);
    }
  });

  it.each(IDS)('%s: its ledger is the deployed ledger — same slots, same order, same types — under other names; same witnesses', (id) => {
    const full = info(id);
    const intf = info(`${id}.Interface`);
    expect(intf.ledger.map(shape)).toEqual(full.ledger.map(shape));
    expect(intf.ledger.map((s) => s.name)).toEqual(full.ledger.map((_, i) => `hidden${i + 1}`));
    expect(intf.witnesses).toEqual(full.witnesses);
  });

  it.each(IDS)('%s: every published circuit\'s verifier key is byte-identical to the key the contract deploys', (id) => {
    const keys = readdirSync(join(MANAGED, `${id}.Interface`, 'keys')).filter((f) => f.endsWith('.verifier')).sort();
    expect(keys).toEqual(readdirSync(join(MANAGED, id, 'keys')).filter((f) => f.endsWith('.verifier')).sort());
    for (const k of keys) expect(readFileSync(join(MANAGED, `${id}.Interface`, 'keys', k)).equals(readFileSync(join(MANAGED, id, 'keys', k))), k).toBe(true);
  });
});

describe('the DU bundles (bundles/<ID>/, deployments/bundles.json)', () => {
  let rebuilt: string;
  let rebuiltRecords: BundleRecord[];
  beforeAll(async () => {
    rebuilt = mkdtempSync(join(tmpdir(), 'du-bundles-'));
    rebuiltRecords = await buildBundles(rebuilt, IDS);
  });
  afterAll(() => rmSync(rebuilt, { recursive: true, force: true }));

  it('four HIDDEN bundles, one per DU contract, after the four FULL PI bundles', () => {
    expect(record.bundles.map((b) => [b.id, b.form])).toEqual([
      ['LSUNPI', 'FULL'], ['SSTARPI', 'FULL'], ['CNSTPI', 'FULL'], ['UPROMPI', 'FULL'],
      ...IDS.map((id) => [id, 'HIDDEN']),
    ]);
  });

  it.each(IDS)('%s: the committed bundle is byte-identical to a fresh deploy-check of the committed interface and keys', (id) => {
    const b = byId(id);
    const committed = dirOf(join(ROOT, 'bundles'), b);
    const fresh = dirOf(rebuilt, b);
    expect(tree(committed)).toEqual(tree(fresh));
    for (const f of tree(committed)) expect(readFileSync(join(committed, f)).equals(readFileSync(join(fresh, f))), f).toBe(true);
    expect(rebuiltRecords.find((r) => r.id === id)).toEqual(b);
  });

  it.each(IDS)('%s: index.json commits to its files; its hash is the recorded commitment; a 1-part pointer to http://bundles/%s/index.json', (id) => {
    const b = byId(id);
    const dir = dirOf(join(ROOT, 'bundles'), b);
    const index = hash.readIndexFile(dir);
    expect(index.hash).toBe(b.commitment);
    expect(hash.indexCommitment(index).toString('hex')).toBe(b.commitment);
    expect(index.compiler).toEqual({ name: 'compactc', version: '0.34.0' });
    expect(index.files.map((f) => f.path).sort()).toEqual(tree(dir).filter((f) => f !== 'index.json'));
    for (const f of index.files) expect(sha256(readFileSync(join(dir, f.path)))).toBe(f.sha256);
    expect([b.url, b.parts]).toEqual([`http://bundles/${id}/index.json`, 1]);
    const payload = hash.assemblePayload(Buffer.from(b.commitment, 'hex'), b.url);
    expect(payload.toString('hex')).toBe(b.payloadHex);
    expect(hash.payloadParts(payload).map((p) => p.toString('hex'))).toEqual(b.partsHex);
  });

  it.each(IDS)('%s: ships ONLY the interface source (no module, not the contract) and one verifier key per published circuit — no prover key, no ZKIR', (id) => {
    const b = byId(id);
    const dir = dirOf(join(ROOT, 'bundles'), b);
    expect(b.interface).toBe(`src/${id}.Interface.compact`);
    expect(tree(dir).filter((f) => f.startsWith('src/'))).toEqual([`src/${id}.Interface.compact`]);
    expect(readFileSync(join(dir, b.interface)).equals(readFileSync(join(INTERFACES, `${id}.Interface.compact`)))).toBe(true);
    const published = info(`${id}.Interface`).circuits.map((c) => c.name).sort();
    expect([...b.circuits].sort()).toEqual(published);
    expect(readdirSync(join(dir, 'out', 'keys')).sort()).toEqual(published.map((c) => `${c}.verifier`).sort());
    expect(tree(dir).some((f) => f.endsWith('.prover') || f.includes('zkir'))).toBe(false);
    const all = tree(dir).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
    expect(all).not.toContain('import "../TokenMetadata"');
    expect(all).not.toContain('TM_emitterSecretHash');
  });

  it.each(IDS)('%s: every emitting circuit is verify-only (it takes the emitter secret)%s', (id) => {
    const b = byId(id);
    const emitting = b.circuits.filter((c) => c === 'publishBundle' || /^(publish|clear)[A-Z]/.test(c));
    expect(emitting.length).toBeGreaterThan(4);
    expect([...b.verifyOnly].sort()).toEqual((id === 'LMOONDU' ? [...emitting, 'transfer'] : emitting).sort());
    expect(b.witnesses).toEqual(id === 'LMOONDU' ? ['emitterSecret', 'wit_FungibleTokenSK'] : ['emitterSecret']);
  });

  it.each(IDS)('%s: the README says the interface is PARTIAL (not FULL), verified at Levels 1-3 and never executed', (id) => {
    const readme = readFileSync(join(dirOf(join(ROOT, 'bundles'), byId(id)), 'README.md'), 'utf8');
    expect(readme).toContain('It is deliberately\npartial — the contract has circuits that are not published here.');
    expect(readme).not.toContain('a FULL interface');
    expect(readme).toContain('This interface declares witnesses (`emitterSecret`');
    expect(readme).not.toMatch(/--circuit /);
    expect(readme.match(/node <mip-public-interfaces>\/tools\/public-interface\/src\/verify\.mjs/g)).toHaveLength(2);
    expect(readme).toContain('`LICENSE`, `NOTICE`, `SOURCE.md` state the licences');
  });

  it.each(IDS)('%s: LICENSE, NOTICE (every adapted origin, OpenZeppelin\'s MIT notice in full iff adapted) and SOURCE.md, listed like every file', (id) => {
    const dir = dirOf(join(ROOT, 'bundles'), byId(id));
    const listed = hash.readIndexFile(dir).files.map((f) => f.path);
    for (const f of ['LICENSE', 'NOTICE', 'SOURCE.md']) expect(listed, f).toContain(f);
    expect(readFileSync(join(dir, 'LICENSE')).equals(readFileSync(join(ROOT, 'LICENSE')))).toBe(true);
    const notice = readFileSync(join(dir, 'NOTICE'), 'utf8');
    expect(notice).toContain(`src/${id}.Interface.compact is a HIDDEN interface`);
    expect(notice).toContain('compact-off-chain-circuits\n    Copyright 2026 the compact-off-chain-circuits authors.');
    expect(notice).toContain('contracts/TokenMetadata.compact of https://github.com/acedward/mip-0018-midnight-contracts');
    const mit = readFileSync(join(ROOT, 'contracts', 'vendor', 'openzeppelin', 'LICENSE'), 'utf8').trimEnd().split('\n').map((l) => (l === '' ? '' : `    ${l}`)).join('\n');
    expect(notice.includes(mit)).toBe((OZ_ADAPTED[id] ?? []).length > 0);
    for (const m of OZ_ADAPTED[id] ?? []) expect(notice).toContain(`${m}.compact`);
    const source = readFileSync(join(dir, 'SOURCE.md'), 'utf8');
    expect(source).toContain(`| \`src/${id}.Interface.compact\` | this repository, \`contracts/interfaces/${id}.Interface.compact\``);
    expect(source).toContain(sha256(readFileSync(join(dir, 'src', `${id}.Interface.compact`))));
    for (const f of ['TokenMetadata.compact', 'OffChainInterface.compact', ...(OZ_ADAPTED[id] ?? []).map((m) => `vendor/openzeppelin/${m}.compact`)]) {
      expect(source, f).toContain(`| \`contracts/${f}\` |`);
      expect(source, f).toContain(sha256(readFileSync(join(ROOT, 'contracts', f))));
    }
    expect(TEMPLATE[id]).toBeDefined();
  });
});

describe('public-interface-verify (patched) Levels 1 and 2, offline, against the simulated deployment', () => {
  it.each(IDS)('%s: Level 2 — every shipped key is the key the deployed state holds under that name', async (id) => {
    const b = byId(id);
    const sim = await simulatePi(id);
    const emitted = sim.events.filter((e) => e.circuit === 'publishBundle').map((e) => e.payloadHex).join('');
    expect(emitted).toBe(b.payloadHex);
    const r = await verifier.verify({ bundleDir: dirOf(join(ROOT, 'bundles'), b), eventPayload: Buffer.from(emitted, 'hex'), stateBytes: sim.state, level: 2 });
    expect(r.checks.level1.ok, r.checks.level1.reason).toBe(true);
    expect(r.checks.level2?.ok).toBe(true);
    expect(r.checks.level2?.wrapper.ok).toBe(true);
    expect(r.level).toBe(2);
    expect(r.checks.level2?.rows.map((x) => x.status)).toEqual(b.circuits.map(() => 'OK'));
  });

  it('negative control: a DU bundle against another DU contract\'s state fails Level 2 (SNEBDU and DAURDU share a template, not their keys)', async () => {
    const sneb = byId('SNEBDU');
    const other = await simulatePi('DAURDU');
    const r = await verifier.verify({ bundleDir: dirOf(join(ROOT, 'bundles'), sneb), eventPayload: Buffer.from(sneb.payloadHex, 'hex'), stateBytes: other.state, level: 2 });
    expect(r.checks.level1.ok).toBe(true);
    expect(r.checks.level2?.ok).toBe(false);
    expect(r.level).toBe(1);
  });
});
