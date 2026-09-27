// SPDX-License-Identifier: Apache-2.0
//
// The DU (dual) contract set (spec 00024 §6.B, sub-plan 03-A1): generated, not hand-written;
// the FULL MIP-0018 metadata of each MIP-18 twin, step for step (one declaration per circuit,
// long values as ONE call emitting all their parts); the emitter secret on every emitting
// circuit (declarations and `publishBundle`); one PURE constant getter the HIDDEN interface
// will not publish. Runs the compiled contracts (contracts/managed/<ID>/) in the Compact
// simulator.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CompactTypeBytes, CompactTypeVector, persistentCommit } from '@midnight-ntwrk/compact-runtime';
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

interface Declaration { circuit: string; domain: string; domainSepHex: string; kind: number; key: string; valType: number; len: number; parts: number; text: string | null; payloadHex: string }
interface Step {
  kind: 'emit' | 'mint' | 'publishBundle';
  circuit: string;
  declaration?: Declaration;
  token?: 'shielded' | 'unshielded' | 'ledger';
  to?: string;
  amount?: string;
  nonce?: string | null;
  parts?: number;
  url?: string;
}
interface Row {
  id: string;
  base: string;
  twin: string;
  template: string;
  interface: string;
  interfaceSource: string;
  name: string;
  symbol: string;
  decimals: number;
  kind: number;
  domain: string;
  domainSepHex: string;
  constructorArgs: { name_: string; symbol_: string };
  repository: string;
  bundle: { url: string; urlBytes: number; parts: number; path: string };
  steps: Step[];
}

const matrix = JSON.parse(readFileSync(join(ROOT, 'deployments', 'dual-matrix.json'), 'utf8')) as { rows: Row[] };
const IDS = ['SNEBDU', 'LMOONDU', 'UMETDU', 'DAURDU'];
const PI_IDS = ['LSUNPI', 'SSTARPI', 'CNSTPI', 'UPROMPI'];
const rowOf = (id: string): Row => {
  const row = matrix.rows.find((r) => r.id === id);
  if (!row) throw new Error(`no dual-matrix row ${id}`);
  return row;
};

/**
 * The twins' circuit calls, in order (acedward/mip-0018-midnight-contracts
 * deployments/generated-matrix.json @ cb6c675: SNEB18, LMOON18, UMET18, DAUR18), then the
 * pointer. The only renaming: LMOON18's `ledgerMint` (that repository's own ledger template)
 * is OpenZeppelin FungibleToken's `mint` here (as LSUNPI's).
 */
const TWIN_CALLS: Record<string, string[]> = {
  SNEBDU: ['publishName', 'publishSymbol', 'publishDecimals', 'publishRepository', 'publishMetadata', 'publishMetadataDescription', 'mint', 'mint', 'publishBundle'],
  LMOONDU: ['publishName', 'publishSymbol', 'publishDecimals', 'publishRepository', 'mint', 'publishName2', 'publishDescription', 'clearDescription', 'publishDescription2', 'publishBundle'],
  UMETDU: ['mint', 'mint', 'mint', 'publishName', 'publishSymbol', 'publishDecimals', 'publishRepository', 'publishBundle'],
  DAURDU: [
    'publishUnshieldedName', 'publishUnshieldedSymbol', 'publishUnshieldedDecimals', 'publishUnshieldedRepository',
    'publishShieldedName', 'publishShieldedSymbol', 'publishShieldedDecimals', 'publishShieldedRepository',
    'mintShielded', 'mintUnshielded', 'publishBundle',
  ],
};

/** Every circuit each contract exports: the token surface of the PI templates, the declarations, publishBundle, and ONE pure getter. */
const EXPECTED_CIRCUITS: Record<string, { impure: string[]; pure: string[] }> = {
  SNEBDU: { impure: ['name', 'symbol', 'decimals', 'domainSep', 'tokenColor', 'mint', 'publishName', 'publishSymbol', 'publishDecimals', 'publishRepository', 'publishMetadata', 'publishMetadataDescription', 'publishBundle'], pure: ['kind'] },
  LMOONDU: { impure: ['name', 'symbol', 'decimals', 'totalSupply', 'balanceOf', 'transfer', 'mint', 'publishName', 'publishSymbol', 'publishDecimals', 'publishRepository', 'publishName2', 'publishDescription', 'clearDescription', 'publishDescription2', 'publishBundle'], pure: ['kind'] },
  UMETDU: { impure: ['name', 'symbol', 'decimals', 'domainSep', 'tokenColor', 'mints', 'mint', 'publishName', 'publishSymbol', 'publishDecimals', 'publishRepository', 'publishBundle'], pure: ['kind'] },
  DAURDU: {
    impure: ['name', 'symbol', 'decimals', 'domainSep', 'tokenColor', 'mintShielded', 'mintUnshielded', 'publishUnshieldedName', 'publishUnshieldedSymbol', 'publishUnshieldedDecimals', 'publishUnshieldedRepository', 'publishShieldedName', 'publishShieldedSymbol', 'publishShieldedDecimals', 'publishShieldedRepository', 'publishBundle'],
    pure: ['kinds'],
  },
};

const info = (id: string) => JSON.parse(readFileSync(join(MANAGED, id, 'compiler', 'contract-info.json'), 'utf8')) as {
  'compiler-version': string;
  circuits: { name: string; pure: boolean; proof: boolean }[];
  witnesses: { name: string }[];
};
const emits = (row: Row) => row.steps.filter((s) => s.kind === 'emit').map((s) => s.declaration as Declaration);

describe('the generator (scripts/generate-du-contracts.ts)', () => {
  let out: string;
  beforeAll(() => {
    out = mkdtempSync(join(tmpdir(), 'du-gen-'));
    execFileSync(process.execPath, ['--import', 'tsx', join(ROOT, 'scripts', 'generate-du-contracts.ts'), '--out', out], { cwd: ROOT, stdio: 'pipe' });
  });
  afterAll(() => rmSync(out, { recursive: true, force: true }));

  it('writes exactly the four DU contracts; contracts/generated/ holds the PI and the DU sets', () => {
    expect(readdirSync(join(out, 'contracts', 'generated')).sort()).toEqual(IDS.map((id) => `${id}.compact`).sort());
    expect(readdirSync(GENERATED).sort()).toEqual([...PI_IDS, ...IDS].map((id) => `${id}.compact`).sort());
  });

  it.each(IDS)('%s.compact is exactly what the generator writes (never edited by hand)', (id) => {
    expect(readFileSync(join(GENERATED, `${id}.compact`), 'utf8')).toBe(readFileSync(join(out, 'contracts', 'generated', `${id}.compact`), 'utf8'));
  });

  it('deployments/dual-matrix.json is exactly what the generator writes', () => {
    expect(readFileSync(join(ROOT, 'deployments', 'dual-matrix.json'), 'utf8')).toBe(readFileSync(join(out, 'deployments', 'dual-matrix.json'), 'utf8'));
  });
});

describe('the deployment plan (deployments/dual-matrix.json): the twins\' metadata, step for step', () => {
  it('holds the four DU rows of spec §6.B, each on its base, each with its MIP-18 twin and a HIDDEN interface', () => {
    expect(matrix.rows.map((r) => [r.id, r.template, r.twin, r.interface, r.interfaceSource])).toEqual([
      ['SNEBDU', 'NativeShieldedToken', 'SNEB18', 'HIDDEN', 'contracts/interfaces/SNEBDU.Interface.compact'],
      ['LMOONDU', 'FungibleToken', 'LMOON18', 'HIDDEN', 'contracts/interfaces/LMOONDU.Interface.compact'],
      ['UMETDU', 'NativeUnshieldedToken', 'UMET18', 'HIDDEN', 'contracts/interfaces/UMETDU.Interface.compact'],
      ['DAURDU', 'NativeDualToken', 'DAUR18', 'HIDDEN', 'contracts/interfaces/DAURDU.Interface.compact'],
    ]);
  });

  it.each(IDS)('%s calls its twin\'s circuits in its twin\'s order, then publishes its pointer (1 part) last', (id) => {
    const row = rowOf(id);
    expect(row.steps.map((s) => s.circuit)).toEqual(TWIN_CALLS[id]);
    const last = row.steps[row.steps.length - 1];
    expect(last?.kind).toBe('publishBundle');
    expect(last?.parts).toBe(1);
    expect(row.bundle).toEqual({ url: `http://bundles/${id}/index.json`, urlBytes: Buffer.byteLength(`http://bundles/${id}/index.json`), parts: 1, path: `${id}/` });
    expect(last?.url).toBe(row.bundle.url);
  });

  it.each(IDS)('%s: every declaration is ONE package on the UC-1 layout — header, 2-byte little-endian val-len, value, zero padding; 256·parts bytes', (id) => {
    const row = rowOf(id);
    const circuits = emits(row).map((d) => d.circuit);
    expect(new Set(circuits).size).toBe(circuits.length);
    for (const d of emits(row)) {
      const p = unhex(d.payloadHex);
      expect(d.parts).toBe(Math.max(1, Math.ceil((68 + d.len) / 256)));
      expect(p).toHaveLength(256 * d.parts);
      expect(hex(p.subarray(0, 32))).toBe(row.domainSepHex);
      expect(d.domain).toBe(row.domain);
      expect(p[32]).toBe(d.kind);
      expect(hex(p.subarray(33, 65))).toBe(hex(pad(32, d.key)));
      expect(p[65]).toBe(d.valType);
      expect(p[66]! | (p[67]! << 8)).toBe(d.len);
      expect(p.subarray(68 + d.len).every((b) => b === 0)).toBe(true);
      if (d.valType === 1 || d.valType === 3 || d.valType === 4) expect(Buffer.from(p.subarray(68, 68 + d.len)).toString('utf8')).toBe(d.text);
      if (d.valType === 3) expect(() => JSON.parse(d.text ?? '')).not.toThrow();
      if (d.valType === 5) expect([d.len, d.text]).toEqual([0, null]);
    }
  });

  it.each(IDS)('%s: the variant\'s name, symbol, decimals and repository (its own source on main)', (id) => {
    const row = rowOf(id);
    const byKey = (key: string) => emits(row).filter((d) => d.key === key);
    const kinds = id === 'DAURDU' ? [0, 1] : [row.kind];
    expect(byKey('name')[0]?.text).toBe(row.name);
    expect(row.name).toBe(`${{ SNEBDU: 'Shielded Nebula', LMOONDU: 'Ledger Moon', UMETDU: 'Unshielded Meteor', DAURDU: 'Dual Aurora' }[id]} · DU`);
    expect(row.constructorArgs).toEqual({ name_: row.name, symbol_: id });
    expect(byKey('symbol').map((d) => d.text)).toEqual(kinds.map(() => id));
    expect(byKey('decimals').map((d) => [d.len, hex(unhex(d.payloadHex).subarray(68, 84))])).toEqual(kinds.map(() => [16, hex(Uint8Array.from([row.decimals, ...new Array(15).fill(0)]))]));
    expect(row.repository).toBe(`https://github.com/acedward/mip-public-interfaces/blob/main/contracts/generated/${id}.compact`);
    expect(byKey('repository').map((d) => [d.kind, d.valType, d.text])).toEqual(kinds.map((k) => [k, 4, row.repository]));
    expect(row.domain).toBe(`umbra:${id.toLowerCase()}`);
  });

  it('SNEBDU: `metadata` is ONE complete JSON value of 677 bytes in 3 parts, from one circuit call (spec §6.B)', () => {
    const metadata = emits(rowOf('SNEBDU')).find((d) => d.key === 'metadata');
    expect([metadata?.circuit, metadata?.valType, metadata?.len, metadata?.parts]).toEqual(['publishMetadata', 3, 677, 3]);
  });

  it('LMOONDU: renamed, a description, the Null that clears it, then a 377-byte description in 2 parts (P1)', () => {
    const row = rowOf('LMOONDU');
    const tail = emits(row).slice(4).map((d) => [d.circuit, d.key, d.valType, d.len, d.parts]);
    expect(tail).toEqual([
      ['publishName2', 'name', 1, Buffer.byteLength('Ledger Moon · DU (renamed)'), 1],
      ['publishDescription', 'description', 1, 52, 1],
      ['clearDescription', 'description', 5, 0, 1],
      ['publishDescription2', 'description', 1, 377, 2],
    ]);
    expect(emits(row)[4]?.text).toBe('Ledger Moon · DU (renamed)');
  });

  it('UMETDU mints three times BEFORE it describes itself; DAURDU declares kind 0, then kind 1, then mints both', () => {
    expect(rowOf('UMETDU').steps.slice(0, 3).map((s) => [s.circuit, s.token, s.to, s.amount])).toEqual([
      ['mint', 'unshielded', 'user:umet-0', '100'], ['mint', 'unshielded', 'user:umet-1', '200'], ['mint', 'unshielded', 'user:umet-2', '300'],
    ]);
    expect(emits(rowOf('DAURDU')).map((d) => d.kind)).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
    expect(rowOf('DAURDU').steps.filter((s) => s.kind === 'mint').map((s) => [s.circuit, s.token])).toEqual([['mintShielded', 'shielded'], ['mintUnshielded', 'unshielded']]);
  });
});

describe('the compiled contracts (contracts/managed/<ID>/, compactc 0.34.0)', () => {
  it.each(IDS)('%s exports the expected circuits; exactly one is pure (the constant getter)', (id) => {
    const i = info(id);
    expect(i['compiler-version']).toBe('0.34.0');
    const exp = EXPECTED_CIRCUITS[id]!;
    expect(i.circuits.map((c) => c.name).sort()).toEqual([...exp.impure, ...exp.pure].sort());
    expect(i.circuits.filter((c) => c.pure).map((c) => c.name)).toEqual(exp.pure);
    expect(i.circuits.filter((c) => c.proof).map((c) => c.name).sort()).toEqual([...exp.impure].sort());
    expect(i.witnesses.map((w) => w.name)).toEqual(id === 'LMOONDU' ? ['emitterSecret', 'wit_FungibleTokenSK'] : ['emitterSecret']);
  });

  it.each(IDS)('%s has a committed verifier key per impure circuit (none for the pure one), equal to its wrapper\'s expectedVk', (id) => {
    const wrapper = readFileSync(join(MANAGED, id, 'contract', 'index.js'), 'utf8');
    const exp = EXPECTED_CIRCUITS[id]!;
    expect(readdirSync(join(MANAGED, id, 'keys')).filter((f) => f.endsWith('.verifier')).sort()).toEqual(exp.impure.map((c) => `${c}.verifier`).sort());
    for (const name of exp.impure) {
      const key = readFileSync(join(MANAGED, id, 'keys', `${name}.verifier`));
      expect(wrapper).toContain(`'${name}': '${createHash('sha256').update(key).digest('hex')}',`);
    }
    for (const name of exp.pure) expect(existsSync(join(MANAGED, id, 'keys', `${name}.verifier`))).toBe(false);
  });
});

type Loaded = { Contract: new (witnesses: unknown) => CompiledContract<PiPrivateState>; pureCircuits: Record<string, () => unknown> };
const load = async (id: string): Promise<Loaded> => (await import(pathToFileURL(join(MANAGED, id, 'contract', 'index.js')).href)) as Loaded;
const OWNER_SK = new Uint8Array(32).fill(0x11);
const PRIVATE: PiPrivateState = { emitterSecret: TEST_EMITTER_SECRET, fungibleSk: OWNER_SK };
const STRANGER: PiPrivateState = { emitterSecret: STRANGER_EMITTER_SECRET, fungibleSk: OWNER_SK };
const witnessesFor = (id: string) => Object.fromEntries(info(id).witnesses.map((w) => [w.name, piWitnesses[w.name as keyof typeof piWitnesses]]));

async function deployed(id: string, privateState = PRIVATE) {
  const { Contract } = await load(id);
  const row = rowOf(id);
  return deploy(new Contract(witnessesFor(id)), privateState, [emitterSecretHashOf(TEST_EMITTER_SECRET), row.constructorArgs.name_, row.constructorArgs.symbol_]);
}

const BYTES32 = new CompactTypeBytes(32);
const VECTOR2 = new CompactTypeVector(2, BYTES32);
/** The protocol's token colour: `persistentCommit([domainSep, address], pad(32, "midnight:derive_token"))`. */
const deriveColor = (domainSep: Uint8Array, address: string): string => hex(persistentCommit(VECTOR2, [domainSep, unhex(address)], pad(32, 'midnight:derive_token')));
const userRecipient = (label: string) => ({ is_left: false, left: { bytes: new Uint8Array(32) }, right: { bytes: pad(32, label) } });
const mintValues = (effects: any, which: 'shieldedMints' | 'unshieldedMints'): bigint[] => [...(effects[which]?.values() ?? [])] as bigint[];

describe('in the simulator: every declaration, publishBundle, the emitter secret', () => {
  it.each(IDS)('%s: every declaration circuit emits exactly its planned package — `parts` events of one call, merged in order', async (id) => {
    const c = await deployed(id);
    for (const d of emits(rowOf(id))) {
      const call = await c.call(d.circuit);
      expect(call.events, d.circuit).toHaveLength(d.parts);
      for (const e of call.events) {
        expect(e.eventName).toBe(TOKEN_METADATA_EVENT);
        expect(e.nameHex).toBe(hex(pad(32, TOKEN_METADATA_EVENT)));
      }
      expect(call.events.map((e) => hex(e.payload)).join(''), d.circuit).toBe(d.payloadHex);
    }
  });

  it.each(IDS)('%s: publishBundle(part) emits one public-interface event carrying the part', async (id) => {
    const c = await deployed(id);
    const part = new Uint8Array(256).map((_, i) => (i * 5 + 1) & 0xff);
    const call = await c.call('publishBundle', part);
    expect(call.events).toHaveLength(1);
    expect(call.events[0]?.eventName).toBe(PUBLIC_INTERFACE_EVENT);
    expect(hex(call.events[0]?.payload ?? new Uint8Array())).toBe(hex(part));
  });

  it.each(IDS)('%s: a stranger (wrong secret) cannot emit — no declaration, no publishBundle', async (id) => {
    const c = await deployed(id, STRANGER);
    for (const d of emits(rowOf(id))) await expect(c.call(d.circuit), d.circuit).rejects.toThrow(/caller is not the emitter/);
    await expect(c.call('publishBundle', new Uint8Array(256))).rejects.toThrow(/caller is not the emitter/);
  });
});

describe('in the simulator: the token reads and mints', () => {
  it.each(IDS)('%s: name, symbol, decimals read back from ledger state; the pure getter is the declared kind', async (id) => {
    const c = await deployed(id);
    const row = rowOf(id);
    expect((await c.call('name')).result).toBe(row.constructorArgs.name_);
    expect((await c.call('symbol')).result).toBe(row.constructorArgs.symbol_);
    expect((await c.call('decimals')).result).toBe(BigInt(row.decimals));
    const { pureCircuits } = await load(id);
    if (id === 'DAURDU') expect(pureCircuits.kinds!()).toEqual([0n, 1n]);
    else expect(pureCircuits.kind!()).toBe(BigInt(row.kind));
  });

  it('SNEBDU, UMETDU, DAURDU: domainSep() reads the domain every declaration uses', async () => {
    for (const id of ['SNEBDU', 'UMETDU', 'DAURDU']) {
      const c = await deployed(id);
      expect(hex((await c.call('domainSep')).result as Uint8Array)).toBe(rowOf(id).domainSepHex);
    }
  });

  it('SNEBDU: mint is a shielded mint of its colour (OpenZeppelin NativeShieldedToken)', async () => {
    const c = await deployed('SNEBDU');
    const color = deriveColor(unhex(rowOf('SNEBDU').domainSepHex), c.address);
    expect(hex((await c.call('tokenColor')).result as Uint8Array)).toBe(color);
    const minted = await c.call('mint', { bytes: pad(32, 'holder:sneb-1') }, 1n, pad(32, 'sneb:1'));
    expect(hex((minted.result as { color: Uint8Array }).color)).toBe(color);
    expect(mintValues(minted.effects, 'shieldedMints')).toEqual([1n]);
  });

  it('LMOONDU: mint credits an account in contract state; transfer moves from the caller\'s (witness-derived) account', async () => {
    const c = await deployed('LMOONDU');
    const owner = Uint8Array.from(createHash('sha256').update(OWNER_SK).digest());
    const holder = pad(32, 'holder:lmoon-1');
    const left = (b: Uint8Array) => ({ is_left: true, left: b, right: { bytes: new Uint8Array(32) } });
    await c.call('mint', left(owner), 5_000_000n);
    expect((await c.call('totalSupply')).result).toBe(5_000_000n);
    expect((await c.call('transfer', left(holder), 1_000n)).result).toBe(true);
    expect((await c.call('balanceOf', left(owner))).result).toBe(4_999_000n);
    expect((await c.call('balanceOf', left(holder))).result).toBe(1_000n);
  });

  it('UMETDU: three unshielded mints of its colour, counted by mints()', async () => {
    const c = await deployed('UMETDU');
    const color = deriveColor(unhex(rowOf('UMETDU').domainSepHex), c.address);
    for (const [label, amount] of [['user:umet-0', 100n], ['user:umet-1', 200n], ['user:umet-2', 300n]] as const) {
      const minted = await c.call('mint', userRecipient(label), amount);
      expect(hex(minted.result as Uint8Array)).toBe(color);
      expect(mintValues(minted.effects, 'unshieldedMints')).toEqual([amount]);
    }
    expect((await c.call('mints')).result).toBe(3n);
    await expect(c.call('mint', userRecipient('user:umet-3'), 0n)).rejects.toThrow(/amount must be positive/);
  });

  it('DAURDU: one colour in two value domains — a shielded mint (OpenZeppelin) and an unshielded mint (own code)', async () => {
    const c = await deployed('DAURDU');
    const color = deriveColor(unhex(rowOf('DAURDU').domainSepHex), c.address);
    expect(hex((await c.call('tokenColor')).result as Uint8Array)).toBe(color);
    const shielded = await c.call('mintShielded', { bytes: pad(32, 'holder:daur-1') }, 1000n, pad(32, 'daur:1'));
    expect(hex((shielded.result as { color: Uint8Array }).color)).toBe(color);
    expect(mintValues(shielded.effects, 'shieldedMints')).toEqual([1000n]);
    const unshielded = await c.call('mintUnshielded', userRecipient('user:daur-2'), 2000n);
    expect(hex(unshielded.result as Uint8Array)).toBe(color);
    expect(mintValues(unshielded.effects, 'unshieldedMints')).toEqual([2000n]);
  });
});
