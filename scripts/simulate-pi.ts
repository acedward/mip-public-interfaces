/**
 * Run a PI contract's deployment plan (deployments/generated-matrix.json) — or a DU contract's
 * (deployments/dual-matrix.json, project 00024-03) — in the Compact
 * simulator (@midnight-ntwrk/compact-runtime 0.19.0): the constructor, the verifier keys a
 * deploy installs, then every step — `repository` declarations, mints and transfers, and
 * the `publishBundle` parts of deployments/bundles.json. Returns every event and the final
 * serialized `ContractState`, which is exactly the state input public-interface-verify's
 * Level 2 takes (`--state`), with the keys the chain would hold.
 *
 * Used by the tests, by `scripts/verify-bundles.sh` (Level 3 offline) and by the fixture
 * exporter. Everything is deterministic: the address is a stand-in, sha256("umbra:00024:<ID>"),
 * and the emitter secret is a public TEST value (32 × 0x42), never a real one.
 *
 *   node --import tsx scripts/simulate-pi.ts [ID…]   # writes out/sim/<ID>/{state.hex,event-payload.hex}
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as rt from '@midnight-ntwrk/compact-runtime';

const ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..');
const COIN_PK = '0'.repeat(64);

/** Public TEST values of the corpus (never real secrets). */
export const TEST_EMITTER_SECRET = new Uint8Array(32).fill(0x42);
/** OpenZeppelin FungibleToken account secret of the "owner" in the plan (LSUNPI). */
export const TEST_OWNER_SK = new Uint8Array(32).fill(0x11);

const sha256 = (...parts: Uint8Array[]): Uint8Array => {
  const h = createHash('sha256');
  for (const p of parts) h.update(p);
  return Uint8Array.from(h.digest());
};
const utf8 = (t: string): Uint8Array => new TextEncoder().encode(t);
export const pad = (n: number, text: string): Uint8Array => {
  const b = utf8(text);
  if (b.length > n) throw new Error(`"${text}" does not fit ${n} bytes`);
  const out = new Uint8Array(n);
  out.set(b);
  return out;
};
const hex = (b: Uint8Array): string => Buffer.from(b).toString('hex');
const unhex = (t: string): Uint8Array => Uint8Array.from(Buffer.from(t, 'hex'));

/** `TM_emitterSecretHashOf(secret)`: SHA-256(pad(32, "mip-0018:emitter:") ++ secret). */
export const emitterSecretHashOf = (secret: Uint8Array): Uint8Array => sha256(pad(32, 'mip-0018:emitter:'), secret);
/** OpenZeppelin `Utils.computeAccountId(sk)` = persistentHash<Vector<1, Bytes<32>>>([sk]) = SHA-256(sk). */
export const accountIdOf = (sk: Uint8Array): Uint8Array => sha256(sk);
/** A plan's `holder:<label>` as 32 public bytes (an account id, or a coin public key). */
export const holderBytes = (label: string): Uint8Array => sha256(utf8(`umbra:00024:${label}`));
/** The deterministic stand-in address of a row. */
export const addressOf = (id: string): string => hex(sha256(utf8(`umbra:00024:${id}`)));

interface Step {
  kind: 'emit' | 'mint' | 'transfer' | 'publishBundle';
  circuit: string;
  token?: 'ledger' | 'shielded' | 'unshielded';
  domain?: string | null;
  piece?: string | null;
  to?: string;
  amount?: string;
  nonce?: string | null;
  declaration?: { payloadHex: string };
}
export interface MatrixRow {
  id: string;
  constructorArgs: { name_: string; symbol_: string };
  pieces: { piece: string; domain: string; domainSepHex: string }[] | null;
  steps: Step[];
}
export interface BundleRecord { id: string; url: string; parts: number; commitment: string; payloadHex: string; partsHex: string[]; path: string }

/** The PI set's plan (deployments/generated-matrix.json). */
export const readMatrix = (): { rows: MatrixRow[] } => JSON.parse(readFileSync(path.join(ROOT, 'deployments', 'generated-matrix.json'), 'utf8'));
/** The DU set's plan (deployments/dual-matrix.json, scripts/generate-du-contracts.ts). */
export const readDualMatrix = (): { rows: MatrixRow[] } => JSON.parse(readFileSync(path.join(ROOT, 'deployments', 'dual-matrix.json'), 'utf8'));
/** Every row of both plans: the PI set, then the DU set. */
export const readAllRows = (): MatrixRow[] => [...readMatrix().rows, ...readDualMatrix().rows];
export const readBundles = (): { bundles: BundleRecord[] } => JSON.parse(readFileSync(path.join(ROOT, 'deployments', 'bundles.json'), 'utf8'));

export interface SimEvent {
  step: number;
  circuit: string;
  /** 1-based position among the events of this step (a publishBundle step has one per part). */
  part: number;
  parts: number;
  eventName: string;
  nameHex: string;
  payloadHex: string;
}

type PS = { emitterSecret: Uint8Array; fungibleSk: Uint8Array };
const WITNESSES = {
  emitterSecret: ({ privateState }: { privateState: PS }): [PS, Uint8Array] => [privateState, privateState.emitterSecret],
  wit_FungibleTokenSK: ({ privateState }: { privateState: PS }): [PS, Uint8Array] => [privateState, privateState.fungibleSk],
};

const either = (left: Uint8Array) => ({ is_left: true, left, right: { bytes: new Uint8Array(32) } });

/** The circuit arguments of one plan step. */
export function argsFor(row: MatrixRow, step: Step, bundle: BundleRecord | undefined, part: number): unknown[] {
  switch (step.kind) {
    case 'emit':
      return [];
    case 'publishBundle': {
      const hexPart = bundle?.partsHex[part];
      if (!hexPart) throw new Error(`${row.id}: no part ${part + 1} in deployments/bundles.json`);
      return [unhex(hexPart)];
    }
    case 'transfer':
      return [either(holderBytes(step.to ?? '')), BigInt(step.amount ?? '0')];
    case 'mint': {
      // An unshielded mint (the DU set's UMETDU `mint`, DAURDU `mintUnshielded`): recipient
      // `Either<ContractAddress, UserAddress>`, the plan's label as a user address.
      if (step.token === 'unshielded') return [{ is_left: false, left: { bytes: new Uint8Array(32) }, right: { bytes: holderBytes(step.to ?? '') } }, BigInt(step.amount ?? '0')];
      const recipient = step.to === 'owner' ? accountIdOf(TEST_OWNER_SK) : holderBytes(step.to ?? '');
      if (step.token === 'ledger') return [either(recipient), BigInt(step.amount ?? '0')];
      const nonce = pad(32, step.nonce ?? '');
      if (step.circuit === 'mintPiece') {
        const domainSep = row.pieces?.find((p) => p.piece === step.piece)?.domainSepHex;
        if (!domainSep) throw new Error(`${row.id}: unknown piece ${step.piece}`);
        return [unhex(domainSep), { bytes: recipient }, nonce];
      }
      if (step.token === 'shielded') return [{ bytes: recipient }, BigInt(step.amount ?? '0'), nonce];
      throw new Error(`${row.id}: unknown mint step`);
    }
    default:
      throw new Error(`${row.id}: unknown step kind`);
  }
}

/** One `misc` log event as name + 256-byte payload (the runtime trims trailing NULs). */
function misc(event: unknown): { eventName: string; nameHex: string; payloadHex: string } {
  const e = event as { eventType: string; data: { tag: string; content: { value: Uint8Array[] } } };
  if (e.eventType !== 'misc' || e.data.tag !== 'cell' || e.data.content.value.length !== 1) throw new Error('unexpected log event');
  const bytes = new Uint8Array(288);
  bytes.set(e.data.content.value[0] ?? new Uint8Array());
  const name = bytes.subarray(0, 32);
  let end = 32;
  while (end > 0 && name[end - 1] === 0) end -= 1;
  return { eventName: new TextDecoder().decode(name.subarray(0, end)), nameHex: hex(name), payloadHex: hex(bytes.subarray(32)) };
}

export interface Simulation {
  id: string;
  address: string;
  events: SimEvent[];
  /** The serialized ContractState after every step, verifier keys installed. */
  state: Buffer;
  /** The serialized ContractState right after deployment (keys installed, nothing called). */
  deployedState: Buffer;
  operations: string[];
}

/**
 * Run `id`'s plan. `withBundle: false` stops before the publishBundle step (for a caller
 * that has no deployments/bundles.json yet); `secret` changes the private state's emitter
 * secret (the constructor always stores the TEST secret's hash).
 */
export async function simulatePi(id: string, { withBundle = true, secret = TEST_EMITTER_SECRET } = {}): Promise<Simulation> {
  const row = readAllRows().find((r) => r.id === id);
  if (!row) throw new Error(`no matrix row ${id}`);
  const managed = path.join(ROOT, 'contracts', 'managed', id);
  const info = JSON.parse(readFileSync(path.join(managed, 'compiler', 'contract-info.json'), 'utf8')) as { witnesses: { name: string }[] };
  const { Contract } = (await import(pathToFileURL(path.join(managed, 'contract', 'index.js')).href)) as {
    Contract: new (w: unknown) => {
      initialState(ctx: unknown, ...args: unknown[]): Promise<{ currentContractState: rt.ContractState; currentPrivateState: PS }>;
      impureCircuits: Record<string, (ctx: unknown, ...args: unknown[]) => Promise<{ context: any; result: unknown }>>;
    };
  };
  const witnesses = Object.fromEntries(info.witnesses.map((w) => [w.name, WITNESSES[w.name as keyof typeof WITNESSES]]));
  const contract = new Contract(witnesses);
  let privateState: PS = { emitterSecret: secret, fungibleSk: TEST_OWNER_SK };
  const init = await contract.initialState(
    rt.createConstructorContext(privateState, COIN_PK),
    emitterSecretHashOf(TEST_EMITTER_SECRET),
    row.constructorArgs.name_,
    row.constructorArgs.symbol_,
  );
  const state = init.currentContractState;
  privateState = init.currentPrivateState;
  // A real deploy installs one verifier key per circuit; a locally built state has none.
  for (const f of readdirSync(path.join(managed, 'keys')).filter((f) => f.endsWith('.verifier')).sort()) {
    const op = new rt.ContractOperation();
    op.verifierKey = new Uint8Array(readFileSync(path.join(managed, 'keys', f)));
    state.setOperation(f.slice(0, -'.verifier'.length), op);
  }
  const deployedState = Buffer.from(state.serialize());
  const address = addressOf(id);
  const bundle = withBundle ? readBundles().bundles.find((b) => b.id === id) : undefined;
  if (withBundle && !bundle) throw new Error(`${id} has no entry in deployments/bundles.json: run scripts/bundle.ts`);

  const events: SimEvent[] = [];
  for (const [index, step] of row.steps.entries()) {
    if (step.kind === 'publishBundle' && !withBundle) break;
    const calls = step.kind === 'publishBundle' ? (bundle?.parts ?? 0) : 1;
    // Every event of one step (a publishBundle step's calls, or ONE declaration call that emits
    // all the parts of a long value) is one part of the step's package, numbered in emission order.
    const stepEvents: ReturnType<typeof misc>[] = [];
    for (let part = 0; part < calls; part += 1) {
      const ctx = rt.createCircuitContext(step.circuit, address, COIN_PK, state.data, privateState);
      const circuit = contract.impureCircuits[step.circuit];
      if (!circuit) throw new Error(`${id}: no impure circuit ${step.circuit}`);
      const r = await circuit(ctx, ...argsFor(row, step, bundle, part));
      state.data = r.context.callContext.currentQueryContext.state;
      privateState = r.context.callContext.currentPrivateState ?? privateState;
      for (const e of r.context.events as unknown[]) stepEvents.push(misc(e));
    }
    stepEvents.forEach((e, i) => events.push({ step: index, circuit: step.circuit, part: i + 1, parts: stepEvents.length, ...e }));
  }
  return { id, address, events, state: Buffer.from(state.serialize()), deployedState, operations: state.operations().map((o) => (typeof o === 'string' ? o : hex(o))) };
}

async function main(): Promise<void> {
  const ids = process.argv.slice(2);
  const rows = readAllRows().filter((r) => ids.length === 0 || ids.includes(r.id));
  for (const row of rows) {
    const s = await simulatePi(row.id);
    const bundle = readBundles().bundles.find((b) => b.id === row.id);
    const emitted = s.events.filter((e) => e.circuit === 'publishBundle').map((e) => e.payloadHex).join('');
    if (emitted !== bundle?.payloadHex) throw new Error(`${row.id}: the emitted publishBundle parts are not the recorded payload`);
    const out = path.join(ROOT, 'out', 'sim', row.id);
    mkdirSync(out, { recursive: true });
    writeFileSync(path.join(out, 'state.hex'), s.state.toString('hex'));
    writeFileSync(path.join(out, 'event-payload.hex'), emitted);
    console.log(`${row.id.padEnd(8)} ${s.events.length} events; state ${s.state.length} B, ${s.operations.length} entry points with keys -> ${path.relative(ROOT, out)}/`);
  }
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? '')).href) {
  await main();
}
