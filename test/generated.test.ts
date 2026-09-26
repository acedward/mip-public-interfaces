// SPDX-License-Identifier: Apache-2.0
//
// The PI contract set (spec 00024 §6.B, sub-plan 02-B1/B2): generated, not hand-written;
// FULL interfaces (impure circuits only); the emitter secret on every emitting circuit;
// `repository` the only MIP-0018 declaration; `publishBundle` emits the public-interface
// event. Runs the compiled contracts (contracts/managed/<ID>/) in the Compact simulator.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  type CompiledContract,
  deploy,
  emitterSecretHashOf,
  hex,
  pad,
  type PiPrivateState,
  piWitnesses,
  PUBLIC_INTERFACE_EVENT,
  STRANGER_EMITTER_SECRET,
  TEST_EMITTER_SECRET,
  TOKEN_METADATA_EVENT,
  unhex,
} from './helpers/simulator.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const MANAGED = join(ROOT, 'contracts', 'managed');
const GENERATED = join(ROOT, 'contracts', 'generated');

interface MatrixStep {
  kind: 'emit' | 'mint' | 'transfer' | 'publishBundle';
  circuit: string;
  declaration?: { key: string; kind: number; domain: string; domainSepHex: string; valType: number; len: number; text: string; payloadHex: string; piece: string | null };
  piece?: string | null;
  domain?: string | null;
  to?: string;
  amount?: string;
  nonce?: string | null;
  parts?: number;
  url?: string;
}
interface MatrixRow {
  id: string;
  template: string;
  name: string;
  symbol: string;
  decimals: number;
  kind: number;
  domain: string | null;
  domainSepHex: string | null;
  pieces: { piece: string; domain: string; domainSepHex: string }[] | null;
  constructorArgs: { name_: string; symbol_: string };
  repository: string;
  bundle: { url: string; urlBytes: number; parts: number; path: string };
  steps: MatrixStep[];
}

const matrix = JSON.parse(readFileSync(join(ROOT, 'deployments', 'generated-matrix.json'), 'utf8')) as { rows: MatrixRow[] };
const IDS = ['LSUNPI', 'SSTARPI', 'CNSTPI', 'UPROMPI'];

/** Every circuit each contract exports — the whole FULL interface. */
const EXPECTED_CIRCUITS: Record<string, string[]> = {
  LSUNPI: ['name', 'symbol', 'decimals', 'totalSupply', 'balanceOf', 'transfer', 'mint', 'publishRepository', 'publishBundle'],
  SSTARPI: ['name', 'symbol', 'decimals', 'domainSep', 'tokenColor', 'mint', 'publishRepository', 'publishBundle'],
  CNSTPI: ['name', 'symbol', 'decimals', 'tokenColor', 'mintPiece', 'publishOrionRepository', 'publishLyraRepository', 'publishCygnusRepository', 'publishVegaRepository', 'publishAltairRepository', 'publishBundle'],
  UPROMPI: ['name', 'symbol', 'decimals', 'domainSep', 'tokenColor', 'mints', 'mint', 'publishRepository', 'publishBundle'],
};

const rowOf = (id: string): MatrixRow => {
  const row = matrix.rows.find((r) => r.id === id);
  if (!row) throw new Error(`no matrix row ${id}`);
  return row;
};
const info = (id: string) => JSON.parse(readFileSync(join(MANAGED, id, 'compiler', 'contract-info.json'), 'utf8')) as {
  'compiler-version': string;
  circuits: { name: string; pure: boolean; proof: boolean }[];
  witnesses: { name: string }[];
};

describe('the generator (scripts/generate-pi-contracts.ts)', () => {
  let out: string;
  beforeAll(() => {
    out = mkdtempSync(join(tmpdir(), 'pi-gen-'));
    execFileSync(process.execPath, ['--import', 'tsx', join(ROOT, 'scripts', 'generate-pi-contracts.ts'), '--out', out], { cwd: ROOT, stdio: 'pipe' });
  });
  afterAll(() => rmSync(out, { recursive: true, force: true }));

  it('writes exactly the four PI contracts', () => {
    expect(readdirSync(join(out, 'contracts', 'generated')).sort()).toEqual(IDS.map((id) => `${id}.compact`).sort());
    expect(readdirSync(GENERATED).sort()).toEqual(IDS.map((id) => `${id}.compact`).sort());
  });

  it.each(IDS)('%s.compact is exactly what the generator writes (never edited by hand)', (id) => {
    expect(readFileSync(join(GENERATED, `${id}.compact`), 'utf8')).toBe(readFileSync(join(out, 'contracts', 'generated', `${id}.compact`), 'utf8'));
  });

  it('deployments/generated-matrix.json is exactly what the generator writes', () => {
    expect(readFileSync(join(ROOT, 'deployments', 'generated-matrix.json'), 'utf8')).toBe(readFileSync(join(out, 'deployments', 'generated-matrix.json'), 'utf8'));
  });
});

describe('the deployment plan (deployments/generated-matrix.json)', () => {
  it('holds the four PI rows of spec §6.B, each on its base', () => {
    expect(matrix.rows.map((r) => [r.id, r.template])).toEqual([
      ['LSUNPI', 'FungibleToken'],
      ['SSTARPI', 'NativeShieldedToken'],
      ['CNSTPI', 'NativeShieldedTokenFamily'],
      ['UPROMPI', 'NativeUnshieldedToken'],
    ]);
  });

  it.each(IDS)('%s declares only `repository` under MIP-0018 — one declaration per circuit — the URL of its own source on main', (id) => {
    const row = rowOf(id);
    const emits = row.steps.filter((s) => s.kind === 'emit');
    expect(emits.length).toBe(row.pieces ? row.pieces.length : 1);
    for (const step of emits) {
      expect(step.declaration?.key).toBe('repository');
      expect(step.declaration?.valType).toBe(4);
      expect(step.declaration?.text).toBe(`https://github.com/acedward/mip-public-interfaces/blob/main/contracts/generated/${id}.compact`);
      expect(row.repository).toBe(step.declaration?.text);
      expect(unhex(step.declaration?.payloadHex ?? '')).toHaveLength(256);
    }
    expect(new Set(emits.map((s) => s.circuit)).size).toBe(emits.length);
  });

  it.each(IDS)('%s publishes its interface last, as many publishBundle parts as its URL needs', (id) => {
    const row = rowOf(id);
    const last = row.steps[row.steps.length - 1];
    expect(last?.kind).toBe('publishBundle');
    expect(row.steps.filter((s) => s.kind === 'publishBundle')).toHaveLength(1);
    expect(row.bundle.url).toBe(`http://bundles/${row.bundle.path}index.json`);
    expect(row.bundle.urlBytes).toBe(Buffer.byteLength(row.bundle.url));
    expect(row.bundle.parts).toBe(Math.max(1, Math.ceil((32 + row.bundle.urlBytes) / 256)));
    expect(last?.parts).toBe(row.bundle.parts);
  });

  it('UPROMPI is the multi-part row: its index.json URL is longer than 224 bytes, so 2 parts (spec §6.B, 02-B3)', () => {
    const multi = matrix.rows.filter((r) => r.bundle.parts > 1).map((r) => r.id);
    expect(multi).toEqual(['UPROMPI']);
    expect(rowOf('UPROMPI').bundle.urlBytes).toBeGreaterThan(224);
    expect(rowOf('UPROMPI').bundle.parts).toBe(2);
  });
});

describe('the compiled contracts (contracts/managed/<ID>/, compactc 0.34.0)', () => {
  it.each(IDS)('%s exports every expected circuit and no pure circuit (a FULL interface can publish it whole — spec Q9)', (id) => {
    const i = info(id);
    expect(i['compiler-version']).toBe('0.34.0');
    expect(i.circuits.map((c) => c.name).sort()).toEqual([...(EXPECTED_CIRCUITS[id] ?? [])].sort());
    expect(i.circuits.filter((c) => c.pure).map((c) => c.name)).toEqual([]);
    expect(i.circuits.every((c) => c.proof)).toBe(true);
    expect(i.witnesses.map((w) => w.name)).toContain('emitterSecret');
  });

  it.each(IDS)('%s has a committed verifier key per circuit, equal to its wrapper\'s expectedVk', (id) => {
    const wrapper = readFileSync(join(MANAGED, id, 'contract', 'index.js'), 'utf8');
    for (const name of EXPECTED_CIRCUITS[id] ?? []) {
      const key = readFileSync(join(MANAGED, id, 'keys', `${name}.verifier`));
      expect(wrapper).toContain(`'${name}': '${createHash('sha256').update(key).digest('hex')}',`);
    }
  });
});

type Loaded = { Contract: new (witnesses: unknown) => CompiledContract<PiPrivateState> };
const load = async (id: string): Promise<Loaded> => (await import(pathToFileURL(join(MANAGED, id, 'contract', 'index.js')).href)) as Loaded;
const PRIVATE: PiPrivateState = { emitterSecret: TEST_EMITTER_SECRET, fungibleSk: new Uint8Array(32).fill(0x11) };
const STRANGER: PiPrivateState = { emitterSecret: STRANGER_EMITTER_SECRET, fungibleSk: new Uint8Array(32).fill(0x11) };
/** The witnesses a contract declares, from its contract-info.json (the runtime wants exactly those). */
const witnessesFor = (id: string) => Object.fromEntries(info(id).witnesses.map((w) => [w.name, piWitnesses[w.name as keyof typeof piWitnesses]]));

async function deployed(id: string, privateState = PRIVATE) {
  const { Contract } = await load(id);
  const row = rowOf(id);
  return deploy(new Contract(witnessesFor(id)), privateState, [emitterSecretHashOf(TEST_EMITTER_SECRET), row.constructorArgs.name_, row.constructorArgs.symbol_]);
}

describe('in the simulator: the emitter secret, the repository declaration, publishBundle', () => {
  it.each(IDS)('%s: every repository circuit emits exactly its planned 256-byte package', async (id) => {
    const c = await deployed(id);
    for (const step of rowOf(id).steps.filter((s) => s.kind === 'emit')) {
      const call = await c.call(step.circuit);
      expect(call.events).toHaveLength(1);
      expect(call.events[0]?.eventName).toBe(TOKEN_METADATA_EVENT);
      expect(call.events[0]?.nameHex).toBe(hex(pad(32, TOKEN_METADATA_EVENT)));
      expect(hex(call.events[0]?.payload ?? new Uint8Array())).toBe(step.declaration?.payloadHex);
    }
  });

  it.each(IDS)('%s: publishBundle(part) emits one public-interface event carrying the part', async (id) => {
    const c = await deployed(id);
    const part = new Uint8Array(256).map((_, i) => (i * 7 + 3) & 0xff);
    const call = await c.call('publishBundle', part);
    expect(call.events).toHaveLength(1);
    expect(call.events[0]?.eventName).toBe(PUBLIC_INTERFACE_EVENT);
    expect(hex(call.events[0]?.payload ?? new Uint8Array())).toBe(hex(part));
  });

  it.each(IDS)('%s: a stranger (wrong secret) cannot emit — repository or publishBundle', async (id) => {
    const c = await deployed(id, STRANGER);
    for (const step of rowOf(id).steps.filter((s) => s.kind === 'emit')) {
      await expect(c.call(step.circuit)).rejects.toThrow(/caller is not the emitter/);
    }
    await expect(c.call('publishBundle', new Uint8Array(256))).rejects.toThrow(/caller is not the emitter/);
  });
});

describe('in the simulator: the token reads and writes', () => {
  it.each(IDS)('%s: name, symbol and decimals read back from ledger state', async (id) => {
    const c = await deployed(id);
    const row = rowOf(id);
    expect((await c.call('name')).result).toBe(row.constructorArgs.name_);
    expect((await c.call('symbol')).result).toBe(row.constructorArgs.symbol_);
    expect((await c.call('decimals')).result).toBe(BigInt(row.decimals));
  });

  it('SSTARPI and UPROMPI: domainSep() reads the domain the repository declaration uses', async () => {
    for (const id of ['SSTARPI', 'UPROMPI']) {
      const c = await deployed(id);
      expect(hex((await c.call('domainSep')).result as Uint8Array)).toBe(rowOf(id).domainSepHex);
      expect(rowOf(id).steps.find((s) => s.kind === 'emit')?.declaration?.domainSepHex).toBe(rowOf(id).domainSepHex);
    }
  });

  it('LSUNPI: mint credits an account; transfer moves from the caller\'s (witness-derived) account', async () => {
    const c = await deployed('LSUNPI');
    // OpenZeppelin Utils.computeAccountId: persistentHash<Vector<1, Bytes<32>>>([sk]) = SHA-256(sk).
    const owner = Uint8Array.from(createHash('sha256').update(PRIVATE.fungibleSk).digest());
    const holder = pad(32, 'holder:lsun-1');
    const left = (b: Uint8Array) => ({ is_left: true, left: b, right: { bytes: new Uint8Array(32) } });
    await c.call('mint', left(owner), 1_000_000n);
    expect((await c.call('totalSupply')).result).toBe(1_000_000n);
    expect((await c.call('transfer', left(holder), 250_000n)).result).toBe(true);
    expect((await c.call('balanceOf', left(owner))).result).toBe(750_000n);
    expect((await c.call('balanceOf', left(holder))).result).toBe(250_000n);
  });

  it('SSTARPI: mint is a shielded mint of its colour; CNSTPI: mintPiece mints one unit of a piece', async () => {
    const s = await deployed('SSTARPI');
    const recipient = { bytes: new Uint8Array(32).fill(0x33) };
    const minted = await s.call('mint', recipient, 5_000_000n, pad(32, 'sstar:1'));
    expect(hex((minted.result as { color: Uint8Array }).color)).toBe(hex((await s.call('tokenColor')).result as Uint8Array));
    expect((minted.result as { value: bigint }).value).toBe(5_000_000n);

    const f = await deployed('CNSTPI');
    const orion = unhex(rowOf('CNSTPI').pieces?.[0]?.domainSepHex ?? '');
    const piece = await f.call('mintPiece', orion, recipient, pad(32, 'cnst:orion:1'));
    expect(hex((piece.result as { color: Uint8Array }).color)).toBe(hex((await f.call('tokenColor', orion)).result as Uint8Array));
    expect((piece.result as { value: bigint }).value).toBe(1n);
  });

  it('UPROMPI: described, never minted — mints() is 0 after deploy', async () => {
    const c = await deployed('UPROMPI');
    expect((await c.call('mints')).result).toBe(0n);
  });
});
