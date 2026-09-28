/**
 * Generate the DU (dual) contract set of spec 00024 §6.B (project 00024-03): one Compact
 * contract per row of `deployments/dual-set.json`, taken from the same row of
 * `deployments/reference-set.json` (a pinned copy of acedward/mip-0018-midnight-contracts'
 * reference set, see deployments/README.md), in its `DU` variant — `SNEBDU`, `LMOONDU`,
 * `UMETDU`, `DAURDU`.
 *
 * A DU contract is BOTH:
 *   - a MIP-0018 emitter with the FULL metadata of its MIP-18 twin (`SNEB18`, `LMOON18`,
 *     `UMET18`, `DAUR18` of acedward/mip-0018-midnight-contracts), step for step: every
 *     declaration of the reference row in order, ONE declaration per circuit (one call,
 *     one intent, one package — UC-1), every byte a compile-time literal, and a value
 *     longer than 188 bytes emitted as ALL of its parts by that one call (`emitHead` then
 *     `emitPart`s, one intent, guaranteed — [Y] §5). The planning — keys, val-types, the
 *     little-endian integers, the Null, the circuit names (`publishName2`,
 *     `clearDescription`, `publishUnshieldedSymbol` …) — is ported from that repository's
 *     `scripts/generate-literal-contracts.ts` @ cb6c675 (scripts/SOURCE.md), so a DU
 *     declaration is its twin's with the variant's name, symbol, domain separator and
 *     `repository` URL;
 *   - a Public Interfaces publisher: `publishBundle(payload: Bytes<256>)` behind the emitter
 *     secret, published LAST (the bundle's commitment exists only once the contract is
 *     compiled). Its interface is HIDDEN — see `contracts/interfaces/` (sub-plan 03-A2).
 *
 * Every generated contract has the EMITTER SECRET (spec 00024 Q12, FR-019b): the constructor
 * stores `TM_emitterSecretHashOf(secret)` (TokenMetadata's sealed `emitterSecretHash`), and
 * every emitting circuit — each declaration and `publishBundle` — calls `TM_assertEmitter()`
 * first. The token itself is built on OpenZeppelin Compact Contracts v0.4.0-alpha.3 where a
 * module exists (`FungibleToken`, `NativeShieldedToken`, vendored under
 * contracts/vendor/openzeppelin/), otherwise on this repository's own native unshielded
 * template (the PI set's UPROMPI shape; OpenZeppelin has no native unshielded module); the
 * token surfaces are the PI set's (scripts/generate-pi-contracts.ts), so the two sets read
 * alike. DAURDU is two tokens in one contract: OpenZeppelin `NativeShieldedToken` for the
 * shielded half and own code for the unshielded half, one domain separator, one colour.
 *
 * PURE circuits: each DU contract exports ONE constant getter — `kind()` (DAURDU: `kinds()`),
 * as its twin does. It is pure (no verifier key on chain), so the HIDDEN interface does not
 * publish it (spec Q9: every impure circuit, no pure circuit) and the bundle is genuinely
 * partial. Every other circuit is impure; the tests assert both on the compiled output.
 *
 * Usage:
 *   node --import tsx scripts/generate-du-contracts.ts               # every DU row
 *   node --import tsx scripts/generate-du-contracts.ts SNEB LMOONDU  # selected rows (base or variant id)
 *   node --import tsx scripts/generate-du-contracts.ts --out <dir>   # write elsewhere (the tests
 *                                                                    # regenerate into a temp dir)
 *
 * Writes `contracts/generated/<ID>.compact`, its HIDDEN interface
 * `contracts/interfaces/<ID>.Interface.compact` (scripts/du-interfaces.ts, sub-plan 03-A2) and
 * `deployments/dual-matrix.json` (the step-by-step plan the deployment and the simulator corpus
 * execute).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { interfaceSource } from './du-interfaces.js';

const ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..');
const REFERENCE_SET = path.join(ROOT, 'deployments', 'reference-set.json');
const DUAL_SET = path.join(ROOT, 'deployments', 'dual-set.json');

const KEY_SIZE = 32;
const DOMAIN_SIZE = 32;
/** UC-1: one event's payload is one part of a package. */
const PART_SIZE = 256;
/** UC-1: domainSep 32 + kind 1 + key 32 + val-type 1 + val-len 2 (little-endian). */
const HEADER_SIZE = 68;
/** UC-1: one event (a one-part package) holds 188 value bytes after the 68-byte header. */
const VALUE_SIZE = PART_SIZE - HEADER_SIZE;
/** UC-1: `val-len` is a `Uint<16>`. */
const MAX_VAL_LEN = 0xffff;
/** [B]: the bytes of a URL one `publishBundle` event holds after the 32-byte commitment. */
const MAX_URL_BYTES_ONE_PART = PART_SIZE - 32;
/** MIP Appendix A: `symbol` is at most 32 bytes. */
const MAX_SYMBOL_LEN = 32;

/** UC-1: the parts a value of `len` bytes needs, `ceil((68 + len) / 256)`, at least 1. */
const partsFor = (len: number): number => Math.max(1, Math.ceil((HEADER_SIZE + len) / PART_SIZE));

// MIP section 2.1 — the `val-type` byte (project 01's generator, unchanged).
const VAL_TYPE_OPAQUE = 0;
const VAL_TYPE_STRING = 1;
const VAL_TYPE_INTEGER = 2;
const VAL_TYPE_JSON = 3;
const VAL_TYPE_URI = 4;
const VAL_TYPE_NULL = 5;
const VAL_TYPE_RESERVED_FROM = 6;
const MIN_INTEGER_LEN = 1;
const MAX_INTEGER_LEN = 31;
/** MIP Appendix A's recommended emitter default for val-type 2: `Uint<128>`. */
const INTEGER_LEN = 16;
const METADATA_POINTER_PREFIX = '/metadata/';
const WELL_KNOWN_VAL_TYPE: Record<string, number> = {
  name: VAL_TYPE_STRING,
  symbol: VAL_TYPE_STRING,
  decimals: VAL_TYPE_INTEGER,
  metadata: VAL_TYPE_JSON,
  tokenUri: VAL_TYPE_URI,
  description: VAL_TYPE_STRING,
  magnitude: VAL_TYPE_STRING,
  hemisphere: VAL_TYPE_STRING,
};
const VAL_TYPE_NAME: Record<number, string> = { 0: 'opaque', 1: 'string', 2: 'integer', 3: 'JSON', 4: 'URI', 5: 'Null' };

// ---------------------------------------------------------------------------
// inputs
// ---------------------------------------------------------------------------

interface Step {
  op: string;
  key?: string;
  valType?: number;
  value?: string;
  to?: string;
  amount?: string;
  nonce?: string;
  piece?: string;
  pieceName?: string;
  /** `publishRepository` on a dual token: which kind byte the declaration is for. */
  kind?: number;
}

interface ReferenceRow {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  kind: number;
  template: string;
  domain?: string;
  pieces?: string[];
  steps: Step[];
}

export type Template = 'FungibleToken' | 'NativeShieldedToken' | 'NativeUnshieldedToken' | 'NativeDualToken';

interface DuRow {
  base: string;
  twin: string;
  template: Template;
  module: string | null;
  interface: 'HIDDEN';
  covers: string;
  bundlePath: string;
  /** A second valid bundle of the same interface at another location (LMOONDU: the P2 pair). */
  secondBundle?: { path: string; purpose: string };
}

interface DualSet {
  variant: { suffix: string; label: string };
  repositoryBlob: string;
  interfaceDir: string;
  bundleBase: string;
  rows: DuRow[];
}

const referenceSet = JSON.parse(readFileSync(REFERENCE_SET, 'utf8')) as { rows: ReferenceRow[] };
const dualSet = JSON.parse(readFileSync(DUAL_SET, 'utf8')) as DualSet;
const { suffix: SUFFIX, label: LABEL } = dualSet.variant;

// ---------------------------------------------------------------------------
// bytes and MIP-0018 rules (ported from project 01's generate-literal-contracts.ts)
// ---------------------------------------------------------------------------

const utf8 = (text: string): Uint8Array => new Uint8Array(Buffer.from(text, 'utf8'));
const hex = (bytes: Uint8Array): string => Buffer.from(bytes).toString('hex');

const padTo = (bytes: Uint8Array, size: number): Uint8Array => {
  if (bytes.length > size) throw new Error(`value of ${bytes.length} bytes does not fit in ${size}`);
  const out = new Uint8Array(size);
  out.set(bytes);
  return out;
};

function valTypeFor(key: string, declared: number | undefined): number {
  if (declared !== undefined) return declared;
  return WELL_KNOWN_VAL_TYPE[key] ?? VAL_TYPE_STRING;
}

/** RFC 6901, as MIP section 5.1 requires of a `/metadata/` key. */
function isJsonPointer(text: string): boolean {
  if (text.length === 0) return true;
  if (!text.startsWith('/')) return false;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== '~') continue;
    const next = text[i + 1];
    if (next !== '0' && next !== '1') return false;
    i += 1;
  }
  return true;
}

function assertKeyIsValid(where: string, key: string): void {
  if (key.length === 0) throw new Error(`${where}: an empty key is rejected (MIP section 2.2)`);
  if (key.startsWith(METADATA_POINTER_PREFIX) && !isJsonPointer(key)) {
    throw new Error(`${where}: "${key}" is not a valid RFC 6901 pointer (MIP section 5.1)`);
  }
}

/** MIP section 2.1 from the emitter's side: the generator refuses to write a value every consumer must reject. */
function assertValueMatchesType(where: string, valType: number, value: Uint8Array): void {
  if (valType < VAL_TYPE_OPAQUE || valType >= VAL_TYPE_RESERVED_FROM) throw new Error(`${where}: val-type ${valType} is reserved (MIP section 2.1)`);
  const text = Buffer.from(value).toString('utf8');
  const roundTrips = Buffer.from(text, 'utf8').equals(Buffer.from(value));
  if ((valType === VAL_TYPE_STRING || valType === VAL_TYPE_JSON || valType === VAL_TYPE_URI) && !roundTrips) {
    throw new Error(`${where}: val-type ${valType} requires valid UTF-8`);
  }
  if (valType === VAL_TYPE_INTEGER && (value.length < MIN_INTEGER_LEN || value.length > MAX_INTEGER_LEN)) {
    throw new Error(`${where}: val-type 2 requires ${MIN_INTEGER_LEN} <= val-len <= ${MAX_INTEGER_LEN}, got ${value.length}`);
  }
  if (valType === VAL_TYPE_JSON) {
    if (value.length === 0) throw new Error(`${where}: val-type 3 cannot be empty`);
    try {
      JSON.parse(text);
    } catch (error) {
      throw new Error(`${where}: val-type 3 requires ONE complete JSON value — ${String(error)}`);
    }
  }
  if (valType === VAL_TYPE_URI) {
    let absolute = false;
    try {
      absolute = new URL(text).protocol.length > 1;
    } catch {
      absolute = false;
    }
    if (!absolute) throw new Error(`${where}: val-type 4 requires an absolute URI, got "${text}"`);
  }
  if (valType === VAL_TYPE_NULL && value.length !== 0) throw new Error(`${where}: val-type 5 (Null) requires val-len 0, got ${value.length}`);
}

/** MIP section 2.1, val-type 2: the canonical Compact serialization of `Uint<8*len>` — little-endian. */
function integerBytes(value: number, length = INTEGER_LEN): Uint8Array {
  if (!Number.isInteger(value) || value < 0) throw new Error(`val-type 2 is an unsigned integer: ${value}`);
  const out = new Uint8Array(length);
  let rest = BigInt(value);
  for (let i = 0; i < length; i += 1) {
    out[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  if (rest !== 0n) throw new Error(`${value} does not fit in ${length} bytes`);
  return out;
}

/**
 * A Compact literal for `size` bytes whose meaningful prefix is `bytes` — `pad(size, "…")` for
 * plain printable ASCII the lexer need not escape, an explicit `Bytes[…]` (12 per line)
 * otherwise, so the emitted bytes never depend on how the compiler reads a string literal.
 */
export const byteLiteral = (bytes: Uint8Array, size: number, indent = '  '): string => {
  padTo(bytes, size);
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end -= 1;
  const meaningful = bytes.subarray(0, end);
  if (meaningful.every((b) => b >= 0x20 && b <= 0x7e && b !== 0x22 && b !== 0x5c)) {
    return `pad(${size}, "${Buffer.from(meaningful).toString('latin1')}")`;
  }
  const items = [...meaningful].map((b) => `0x${b.toString(16).padStart(2, '0')}`);
  if (meaningful.length < size) items.push(`...pad(${size - meaningful.length}, "")`);
  if (items.length <= 12) return `Bytes[${items.join(', ')}]`;
  const lines: string[] = [];
  for (let i = 0; i < items.length; i += 12) lines.push(`${indent}  ${items.slice(i, i + 12).join(', ')}`);
  return `Bytes[\n${lines.join(',\n')}\n${indent}]`;
};

// ---------------------------------------------------------------------------
// the DU variant of a reference row
// ---------------------------------------------------------------------------

export interface Declaration {
  /** the circuit that emits it */
  circuit: string;
  piece: null;
  domain: string;
  domainSepHex: string;
  kind: number;
  key: string;
  valType: number;
  len: number;
  /** UC-1: how many events (parts) the declaration's package takes */
  parts: number;
  /** printable form (null for a Null declaration) */
  text: string | null;
  /** the exact package the circuit emits, 256·parts bytes */
  payloadHex: string;
}

export type PlannedStep =
  | { kind: 'emit'; circuit: string; declaration: Declaration; sourceOp: string }
  | {
      kind: 'mint';
      circuit: 'mint' | 'mintShielded' | 'mintUnshielded';
      token: 'shielded' | 'unshielded' | 'ledger';
      piece: null;
      domain: string | null;
      to: string;
      amount: string;
      nonce: string | null;
      sourceOp: string;
    }
  | { kind: 'publishBundle'; circuit: 'publishBundle'; parts: number; url: string };

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** A key as part of a circuit name: `/metadata/description` → `MetadataDescription`. */
const keyIdent = (key: string): string =>
  key
    .split(/[^A-Za-z0-9]+/)
    .filter((part) => part.length > 0)
    .map(capitalize)
    .join('') || 'Key';

export interface Variant {
  du: DuRow;
  ref: ReferenceRow;
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  kind: number;
  domain: string;
  repositoryUrl: string;
  bundleUrl: string;
  bundleParts: number;
  interfaceSource: string;
  /** the reference row's steps with the variant's name in every `name` value (a rename keeps it) */
  steps: Step[];
}

const variantOf = (du: DuRow): Variant => {
  const ref = referenceSet.rows.find((row) => row.id === du.base);
  if (!ref) throw new Error(`dual-set row "${du.base}" is not a row of reference-set.json`);
  if (ref.pieces) throw new Error(`${du.base}: a collection has no DU form here`);
  const id = `${ref.id}${SUFFIX}`;
  if (du.twin !== `${ref.id}18`) throw new Error(`${id}: its MIP-18 twin is ${ref.id}18, not ${du.twin}`);
  const symbol = `${ref.symbol}${SUFFIX}`;
  if (Buffer.byteLength(symbol, 'utf8') > MAX_SYMBOL_LEN) throw new Error(`${id}: symbol "${symbol}" is longer than ${MAX_SYMBOL_LEN} bytes`);
  if ((du.template === 'NativeDualToken') !== (ref.template === 'NativeDualToken')) throw new Error(`${id}: template ${du.template} does not match the reference row's ${ref.template}`);
  const domain = ref.domain ? `${ref.domain}${SUFFIX.toLowerCase()}` : `umbra:${symbol.toLowerCase()}`;
  if (Buffer.byteLength(domain, 'utf8') > DOMAIN_SIZE) throw new Error(`${id}: domain "${domain}" is longer than ${DOMAIN_SIZE} bytes`);
  const name = `${ref.name} · ${LABEL}`;
  const bundleUrl = `${dualSet.bundleBase}${du.bundlePath}index.json`;
  return {
    du,
    ref,
    id,
    name,
    symbol,
    decimals: ref.decimals,
    kind: ref.kind,
    domain,
    repositoryUrl: `${dualSet.repositoryBlob}/${id}.compact`,
    bundleUrl,
    bundleParts: Math.max(1, Math.ceil((32 + Buffer.byteLength(bundleUrl, 'utf8')) / PART_SIZE)),
    interfaceSource: `${dualSet.interfaceDir}/${id}.Interface.compact`,
    // As project 01's variant: a rename keeps the variant ("Ledger Moon · DU (renamed)").
    steps: ref.steps.map((step) => (step.key === 'name' && step.value?.startsWith(ref.name) ? { ...step, value: step.value.replace(ref.name, name) } : step)),
  };
};

/** One declaration as the literal package its circuit emits (UC-1). */
const declaration = (v: Variant, circuit: string, kind: number, key: string, valType: number, value: Uint8Array, text: string | null): Declaration => {
  if (value.length > MAX_VAL_LEN) throw new Error(`${v.id}: value for "${key}" is ${value.length} bytes (UC-1 val-len max ${MAX_VAL_LEN})`);
  assertKeyIsValid(`${v.id}/${key}`, key);
  assertValueMatchesType(`${v.id}/${key}`, valType, value);
  const domainSep = padTo(utf8(v.domain), DOMAIN_SIZE);
  const parts = partsFor(value.length);
  const payload = new Uint8Array(parts * PART_SIZE);
  payload.set(domainSep, 0);
  payload[32] = kind;
  payload.set(padTo(utf8(key), KEY_SIZE), 33);
  payload[65] = valType;
  payload[66] = value.length & 0xff; // val-len, little-endian (UC-1)
  payload[67] = value.length >> 8;
  payload.set(value, HEADER_SIZE);
  return { circuit, piece: null, domain: v.domain, domainSepHex: hex(domainSep), kind, key, valType, len: value.length, parts, text, payloadHex: hex(payload) };
};

/**
 * The reference row's steps as this variant runs them — project 01's planning, step for
 * step: `publishMetadata` (and a dual token's `publishUnshielded` / `publishShielded`) is
 * name, symbol and decimals as three circuits; `publishRepository` the contract's own source
 * URL; `setMetadata` one declaration (a Null is `clear…`); a key declared again gets an
 * ordinal. Mints keep their place; `publishBundle` comes last.
 */
export function planSteps(v: Variant): PlannedStep[] {
  const planned: PlannedStep[] = [];
  const used = new Map<string, number>();
  const nameFor = (base: string): string => {
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    return n === 1 ? base : `${base}${n}`;
  };
  const dual = v.du.template === 'NativeDualToken';
  const declare = (kind: number, key: string, valType: number, value: Uint8Array, text: string | null, op: string): void => {
    const kindLabel = dual ? (kind === 0 ? 'Unshielded' : 'Shielded') : '';
    const verb = valType === VAL_TYPE_NULL ? 'clear' : 'publish';
    const circuit = nameFor(`${verb}${kindLabel}${keyIdent(key)}`);
    planned.push({ kind: 'emit', circuit, declaration: declaration(v, circuit, kind, key, valType, value, text), sourceOp: op });
  };
  const standard = (kind: number, op: string): void => {
    declare(kind, 'name', VAL_TYPE_STRING, utf8(v.name), v.name, op);
    declare(kind, 'symbol', VAL_TYPE_STRING, utf8(v.symbol), v.symbol, op);
    declare(kind, 'decimals', VAL_TYPE_INTEGER, integerBytes(v.decimals), String(v.decimals), op);
  };
  for (const step of v.steps) {
    switch (step.op) {
      case 'publishMetadata':
        standard(v.kind, step.op);
        break;
      case 'publishUnshielded':
        standard(0, step.op);
        break;
      case 'publishShielded':
        standard(1, step.op);
        break;
      case 'publishRepository':
        declare(step.kind ?? v.kind, 'repository', VAL_TYPE_URI, utf8(v.repositoryUrl), v.repositoryUrl, step.op);
        break;
      case 'setMetadata': {
        const valType = valTypeFor(step.key!, step.valType);
        if (valType === VAL_TYPE_NULL) {
          if (step.value !== undefined) throw new Error(`${v.id}: a val-type 5 (Null) step carries no value`);
          declare(v.kind, step.key!, valType, new Uint8Array(0), null, step.op);
        } else if (valType === VAL_TYPE_INTEGER) {
          declare(v.kind, step.key!, valType, integerBytes(Number(step.value)), step.value!, step.op);
        } else {
          declare(v.kind, step.key!, valType, utf8(step.value!), step.value!, step.op);
        }
        break;
      }
      case 'ledgerMint':
        if (v.du.template !== 'FungibleToken') throw new Error(`${v.id}: ${step.op} needs a ledger token`);
        planned.push({ kind: 'mint', circuit: 'mint', token: 'ledger', piece: null, domain: null, to: step.to ?? 'owner', amount: step.amount ?? '0', nonce: null, sourceOp: step.op });
        break;
      case 'mint': {
        if (v.du.template !== 'NativeShieldedToken' && v.du.template !== 'NativeUnshieldedToken') throw new Error(`${v.id}: ${step.op} needs a native token`);
        const shielded = v.du.template === 'NativeShieldedToken';
        planned.push({
          kind: 'mint', circuit: 'mint', token: shielded ? 'shielded' : 'unshielded', piece: null, domain: v.domain,
          to: step.to ?? 'owner', amount: step.amount ?? '1', nonce: shielded ? (step.nonce ?? null) : null, sourceOp: step.op,
        });
        break;
      }
      case 'mintShielded':
      case 'mintUnshielded': {
        if (!dual) throw new Error(`${v.id}: ${step.op} needs a dual token`);
        const shielded = step.op === 'mintShielded';
        planned.push({
          kind: 'mint', circuit: step.op, token: shielded ? 'shielded' : 'unshielded', piece: null, domain: v.domain,
          to: step.to ?? 'owner', amount: step.amount ?? '1', nonce: shielded ? (step.nonce ?? null) : null, sourceOp: step.op,
        });
        break;
      }
      default:
        throw new Error(`${v.id}: step op "${step.op}" has no DU form`);
    }
  }
  planned.push({ kind: 'publishBundle', circuit: 'publishBundle', parts: v.bundleParts, url: v.bundleUrl });
  return planned;
}

// ---------------------------------------------------------------------------
// Compact source
// ---------------------------------------------------------------------------

/**
 * The body of one declaration: `emitTokenMetadata` for one part; `emitHead` + `emitPart`s
 * for a long value — ONE call emits every part, in order, in one intent. `prefix` is the
 * contract's module prefix (`TM_`); the HIDDEN interface calls its own copies (A2).
 */
export const declarationBody = (d: Declaration, prefix: string): string => {
  const domain = byteLiteral(utf8(d.domain), DOMAIN_SIZE);
  const key = byteLiteral(utf8(d.key), KEY_SIZE);
  const full = d.valType === VAL_TYPE_NULL ? 'Null — the current value is cleared, the history is not' : JSON.stringify(d.text);
  const shown = full.length > 120 ? `${full.slice(0, 117)}…` : full;
  const comment = `  // ${d.key} = ${shown} (val-type ${d.valType} ${VAL_TYPE_NAME[d.valType]}, val-len ${d.len}${d.parts > 1 ? `, ${d.parts} parts` : ''})`;
  const value = Buffer.from(d.payloadHex, 'hex').subarray(HEADER_SIZE, HEADER_SIZE + d.len);
  if (d.parts === 1) {
    return `${comment}\n  ${prefix}emitTokenMetadata(${domain}, ${d.kind}, ${key}, ${d.valType}, ${d.len}, ${byteLiteral(value, VALUE_SIZE)});`;
  }
  const lines = [comment, `  ${prefix}emitHead(${domain}, ${d.kind}, ${key}, ${d.valType}, ${d.len}, ${byteLiteral(value.subarray(0, VALUE_SIZE), VALUE_SIZE)});`];
  for (let offset = VALUE_SIZE, part = 2; offset < value.length; offset += PART_SIZE, part += 1) {
    lines.push(`  // part ${part} of ${d.parts}`);
    lines.push(`  ${prefix}emitPart(${byteLiteral(value.subarray(offset, offset + PART_SIZE), PART_SIZE)});`);
  }
  return lines.join('\n');
};

export const declarationDoc = (d: Declaration, sourceOp: string): string =>
  `/**
 * @description MIP-0018 (${sourceOp}): ONE declaration, ${d.parts === 1 ? 'one TokenMetadata event' : `${d.parts} TokenMetadata events (${d.parts} parts, one intent)`}, every byte a
 * compile-time literal. Emitter only.
 */`;

const emitCircuit = (step: Extract<PlannedStep, { kind: 'emit' }>): string => `${declarationDoc(step.declaration, step.sourceOp)}
export circuit ${step.circuit}(): [] {
  TM_assertEmitter();
${declarationBody(step.declaration, 'TM_')}
}`;

const PUBLISH_BUNDLE = `/**
 * @description Public Interfaces: emits ONE part of this contract's interface pointer —
 * the \`Misc\` event \`mip-xxxx:public-interface[v1]\` whose payload is a 256-byte part of
 * \`commitment ++ utf8(index.json URL)\`, zero padded to 256·k bytes. A pointer of k > 1
 * parts is k calls in ONE guaranteed intent, in order (the Multi-Part Event rule). The
 * circuit writes no ledger state, so every part runs from the same state. Emitter only.
 * @param {Bytes<256>} payload - One 256-byte part of the pointer.
 */
export circuit publishBundle(payload: Bytes<256>): [] {
  TM_assertEmitter();
  OCI_publishBundle(payload);
}`;

/** `text` as `// ` comment lines of at most 92 columns. */
const comment = (text: string): string => {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && line.length + 1 + word.length > 89) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.map((l) => `// ${l}`).join('\n');
};

const stepLine = (s: PlannedStep): string => {
  if (s.kind === 'publishBundle') return `//   ${s.circuit} (${s.parts} part${s.parts === 1 ? '' : 's'}, one guaranteed intent)`;
  if (s.kind === 'emit') return `//   ${s.circuit} (${s.declaration.key}, ${s.declaration.parts} event${s.declaration.parts === 1 ? '' : 's'})`;
  return `//   ${s.circuit}`;
};

const HEADER = (v: Variant, planned: PlannedStep[]): string => `// SPDX-License-Identifier: Apache-2.0
//
// GENERATED FILE — do not edit. Produced by scripts/generate-du-contracts.ts from
// deployments/reference-set.json row "${v.ref.id}" and deployments/dual-set.json,
// ${LABEL} (dual) variant: ${v.id} (${v.name}). Source of truth for its \`repository\` declaration:
// ${v.repositoryUrl}
//
${comment(`${v.name} (${v.symbol}), ${v.decimals} decimals, kind byte ${v.du.template === 'NativeDualToken' ? '0 and 1 (one domain separator, one colour)' : v.kind}; ${v.du.module ? `built on OpenZeppelin Compact Contracts v0.4.0-alpha.3 \`${v.du.module.split('/').pop()}\` (vendored, contracts/vendor/openzeppelin/)${v.du.template === 'NativeDualToken' ? ' for the shielded half and own code for the unshielded half' : ''}` : "this repository's own native unshielded template (OpenZeppelin has no native unshielded module)"}.`)}
${comment(`Covers: ${v.du.covers}.`)}
//
// DUAL. MIP-0018: the full metadata of its MIP-18 twin ${v.du.twin} (acedward/mip-0018-midnight-contracts),
// step for step — one declaration per circuit call (one intent, one package), every byte a
// compile-time literal, a value longer than 188 bytes emitted as all of its parts by one call.
// PUBLIC INTERFACE: HIDDEN — the published interface is ${v.interfaceSource}
// (the Public Interfaces draft's private form: this contract's ledger declared slot by slot
// under hidden names, no module imported, the code of every impure circuit). The pure
// constant getter below is not published (a pure circuit has no verifier key on chain).
//
// Who may emit: only the holder of the secret whose hash the constructor stores (spec 00024
// Q12) — every declaration circuit and publishBundle check it first.
//
// Constructor arguments: \`emitterSecretHash\` (\`TM_emitterSecretHashOf(secret)\`, computed off chain), \`name_\`, \`symbol_\`.
// Circuits the deployment calls, in order:
${planned.map(stepLine).join('\n')}

pragma language_version >= 0.26.0;

import CompactStandardLibrary;
import "../TokenMetadata" prefix TM_;
import "../OffChainInterface" prefix OCI_;
`;

const CONSTRUCTOR_DOC = `/**
 * @param {Bytes<32>} emitterSecretHash - \`TM_emitterSecretHashOf(secret)\`, computed off chain;
 *   every emitting circuit proves knowledge of \`secret\` through the \`emitterSecret\` witness.
 * @param {Opaque<"string">} name_ - The token's name (a Compact string literal is not an Opaque<"string">).
 * @param {Opaque<"string">} symbol_ - The token's symbol.
 */`;

const kindGetter = (kind: number): string => `/**
 * The kind byte this contract declares (MIP section 3). PURE: a constant, no verifier key on
 * chain — so the HIDDEN interface does not publish it (spec Q9).
 */
export circuit kind(): Uint<8> {
  return ${kind};
}`;

const tail = (planned: PlannedStep[]): string =>
  [...planned.flatMap((s) => (s.kind === 'emit' ? [emitCircuit(s)] : [])), PUBLISH_BUNDLE].join('\n\n');

function generateFungible(v: Variant, planned: PlannedStep[]): string {
  return `${HEADER(v, planned)}import "../vendor/openzeppelin/token/FungibleToken" prefix Token_;

export { ContractAddress, Either, Maybe, TM_emitterSecretHash };

${CONSTRUCTOR_DOC}
constructor(emitterSecretHash: Bytes<32>, name_: Opaque<"string">, symbol_: Opaque<"string">) {
  TM_initializeEmitter(emitterSecretHash);
  Token_initialize(name_, symbol_, ${v.decimals});
}

export circuit name(): Opaque<"string"> {
  return Token_name();
}

export circuit symbol(): Opaque<"string"> {
  return Token_symbol();
}

export circuit decimals(): Uint<8> {
  return Token_decimals();
}

${kindGetter(v.kind)}

export circuit totalSupply(): Uint<128> {
  return Token_totalSupply();
}

export circuit balanceOf(account: Either<Bytes<32>, ContractAddress>): Uint<128> {
  return Token_balanceOf(account);
}

/**
 * @description Moves \`value\` from the caller's account (derived from the
 * \`wit_FungibleTokenSK\` witness) to \`to\`. Takes a witness, so a consumer verifies it
 * but cannot execute it.
 */
export circuit transfer(to: Either<Bytes<32>, ContractAddress>, value: Uint<128>): Boolean {
  return Token_transfer(disclose(to), disclose(value));
}

/**
 * @description Credits \`value\` to \`account\` in contract state (a ledger token: no protocol
 * mint, no colour). Deliberately open: a reference test token.
 */
export circuit mint(account: Either<Bytes<32>, ContractAddress>, value: Uint<128>): [] {
  Token__mint(disclose(account), disclose(value));
}

${tail(planned)}
`;
}

function generateShielded(v: Variant, planned: PlannedStep[]): string {
  const domain = byteLiteral(utf8(v.domain), DOMAIN_SIZE);
  return `${HEADER(v, planned)}import "../vendor/openzeppelin/token/NativeShieldedToken" prefix Token_;

export { ContractAddress, Either, Maybe, ShieldedCoinInfo, ZswapCoinPublicKey, TM_emitterSecretHash };

${CONSTRUCTOR_DOC}
constructor(emitterSecretHash: Bytes<32>, name_: Opaque<"string">, symbol_: Opaque<"string">) {
  TM_initializeEmitter(emitterSecretHash);
  Token_initialize(${domain}, name_, symbol_, ${v.decimals});
}

export circuit name(): Opaque<"string"> {
  return Token_name();
}

export circuit symbol(): Opaque<"string"> {
  return Token_symbol();
}

export circuit decimals(): Uint<8> {
  return Token_decimals();
}

${kindGetter(v.kind)}

/** The domain separator this contract mints and describes under (read from its ledger). */
export circuit domainSep(): Bytes<32> {
  return Token__domain;
}

/** The token's colour: \`tokenType(domainSep, this contract)\`. */
export circuit tokenColor(): Bytes<32> {
  return Token_tokenColor();
}

/**
 * @description Mints \`amount\` to \`recipient\`, a Zswap coin public key (OpenZeppelin
 * 0.4.0-alpha.3, #833). Deliberately open: a reference test token.
 * @param {Bytes<32>} nonce - Caller-supplied and unique per mint.
 */
export circuit mint(recipient: ZswapCoinPublicKey, amount: Uint<64>, nonce: Bytes<32>): ShieldedCoinInfo {
  return Token__mint(disclose(recipient), disclose(amount), disclose(nonce));
}

${tail(planned)}
`;
}

function generateUnshielded(v: Variant, planned: PlannedStep[]): string {
  const domain = byteLiteral(utf8(v.domain), DOMAIN_SIZE);
  return `${HEADER(v, planned)}
export { ContractAddress, Either, Maybe, UserAddress, TM_emitterSecretHash };

// The same ledger shape as OpenZeppelin's token modules (name, symbol and decimals sealed
// at construction), so every DU contract answers the same reads.
export sealed ledger _name: Opaque<"string">;
export sealed ledger _symbol: Opaque<"string">;
export sealed ledger _decimals: Uint<8>;
/** Domain separator fixed at construction; with the address it is the colour. */
export sealed ledger _domain: Bytes<32>;
/** How many mints this contract has made. */
export ledger _mints: Counter;

${CONSTRUCTOR_DOC}
constructor(emitterSecretHash: Bytes<32>, name_: Opaque<"string">, symbol_: Opaque<"string">) {
  TM_initializeEmitter(emitterSecretHash);
  _name = disclose(name_);
  _symbol = disclose(symbol_);
  _decimals = ${v.decimals};
  _domain = ${domain};
}

export circuit name(): Opaque<"string"> {
  return _name;
}

export circuit symbol(): Opaque<"string"> {
  return _symbol;
}

export circuit decimals(): Uint<8> {
  return _decimals;
}

${kindGetter(v.kind)}

/** The domain separator this contract mints and describes under (read from its ledger). */
export circuit domainSep(): Bytes<32> {
  return _domain;
}

/** The token's colour: \`tokenType(domainSep, this contract)\`. */
export circuit tokenColor(): Bytes<32> {
  return tokenType(_domain, kernel.self());
}

export circuit mints(): Uint<64> {
  return _mints.read() as Uint<64>;
}

/**
 * @description Mints \`amount\` of this token to \`recipient\` as an unshielded UTxO.
 * Deliberately open: a reference test token.
 * @return {Bytes<32>} - The colour actually minted.
 */
export circuit mint(recipient: Either<ContractAddress, UserAddress>, amount: Uint<64>): Bytes<32> {
  assert(amount > 0, "amount must be positive");
  _mints.increment(1);
  return mintUnshieldedToken(_domain, disclose(amount), disclose(recipient));
}

${tail(planned)}
`;
}

function generateDual(v: Variant, planned: PlannedStep[]): string {
  const domain = byteLiteral(utf8(v.domain), DOMAIN_SIZE);
  return `${HEADER(v, planned)}import "../vendor/openzeppelin/token/NativeShieldedToken" prefix Token_;

export { ContractAddress, Either, Maybe, ShieldedCoinInfo, UserAddress, ZswapCoinPublicKey, TM_emitterSecretHash };

${CONSTRUCTOR_DOC}
constructor(emitterSecretHash: Bytes<32>, name_: Opaque<"string">, symbol_: Opaque<"string">) {
  TM_initializeEmitter(emitterSecretHash);
  Token_initialize(${domain}, name_, symbol_, ${v.decimals});
}

export circuit name(): Opaque<"string"> {
  return Token_name();
}

export circuit symbol(): Opaque<"string"> {
  return Token_symbol();
}

export circuit decimals(): Uint<8> {
  return Token_decimals();
}

/**
 * The two kind bytes this contract declares under its one domain separator (MIP section 3):
 * 0 (unshielded) and 1 (shielded). PURE: a constant, no verifier key on chain — so the
 * HIDDEN interface does not publish it (spec Q9).
 */
export circuit kinds(): Vector<2, Uint<8>> {
  return [0, 1];
}

/** The one domain separator both kinds of this token share (read from its ledger). */
export circuit domainSep(): Bytes<32> {
  return Token__domain;
}

/** The colour both kinds share: \`tokenType(domainSep, this contract)\`. */
export circuit tokenColor(): Bytes<32> {
  return Token_tokenColor();
}

/**
 * @description Mints the shielded half of this token (kind byte 1) to \`recipient\`, a Zswap
 * coin public key — OpenZeppelin NativeShieldedToken \`_mint\`. Deliberately open.
 * @param {Bytes<32>} nonce - Caller-supplied and unique per mint.
 */
export circuit mintShielded(recipient: ZswapCoinPublicKey, amount: Uint<64>, nonce: Bytes<32>): ShieldedCoinInfo {
  return Token__mint(disclose(recipient), disclose(amount), disclose(nonce));
}

/**
 * @description Mints the unshielded half of this token (kind byte 0), same domain separator,
 * same colour, as an unshielded UTxO (own code: OpenZeppelin has no native unshielded module).
 * Deliberately open.
 * @return {Bytes<32>} - The colour actually minted.
 */
export circuit mintUnshielded(recipient: Either<ContractAddress, UserAddress>, amount: Uint<64>): Bytes<32> {
  assert(amount > 0, "amount must be positive");
  return mintUnshieldedToken(Token__domain, disclose(amount), disclose(recipient));
}

${tail(planned)}
`;
}

const GENERATORS: Record<Template, (v: Variant, planned: PlannedStep[]) => string> = {
  FungibleToken: generateFungible,
  NativeShieldedToken: generateShielded,
  NativeUnshieldedToken: generateUnshielded,
  NativeDualToken: generateDual,
};

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

export const variants = (): Variant[] => dualSet.rows.map(variantOf);

/** The second bundle location of a row (P2): URL, size, parts; never inside the first bundle's directory. */
const secondBundleOf = (v: Variant) => {
  const second = v.du.secondBundle!;
  if (second.path.startsWith(v.du.bundlePath) || v.du.bundlePath.startsWith(second.path)) throw new Error(`${v.id}: a second bundle must not nest with the first`);
  const url = `${dualSet.bundleBase}${second.path}index.json`;
  const urlBytes = Buffer.byteLength(url, 'utf8');
  return { id: `${v.id}-v2`, url, urlBytes, parts: Math.max(1, Math.ceil((32 + urlBytes) / PART_SIZE)), path: second.path, purpose: second.purpose };
};

function main(): void {
  const argv = process.argv.slice(2);
  let outRoot = ROOT;
  const selected: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') outRoot = path.resolve(argv[++i] ?? '');
    else selected.push(argv[i] ?? '');
  }
  const OUT_CONTRACTS = path.join(outRoot, 'contracts', 'generated');
  const OUT_MATRIX = path.join(outRoot, 'deployments', 'dual-matrix.json');
  const OUT_INTERFACES = path.join(outRoot, ...dualSet.interfaceDir.split('/'));

  const all = variants();
  const rows = all.filter((v) => selected.length === 0 || selected.includes(v.id) || selected.includes(v.ref.id));
  if (selected.length > 0 && rows.length !== selected.length) throw new Error(`unknown row id(s) among: ${selected.join(', ')}`);
  for (const v of all) {
    const urlBytes = Buffer.byteLength(v.bundleUrl, 'utf8');
    if ((urlBytes > MAX_URL_BYTES_ONE_PART) !== (v.bundleParts > 1)) throw new Error(`${v.id}: part count ${v.bundleParts} disagrees with a ${urlBytes}-byte URL`);
  }

  mkdirSync(OUT_CONTRACTS, { recursive: true });
  mkdirSync(OUT_INTERFACES, { recursive: true });
  mkdirSync(path.dirname(OUT_MATRIX), { recursive: true });

  const matrixRows: unknown[] = [];
  for (const v of all) {
    const planned = planSteps(v);
    if (rows.includes(v)) {
      writeFileSync(path.join(OUT_CONTRACTS, `${v.id}.compact`), GENERATORS[v.du.template](v, planned), 'utf8');
      writeFileSync(path.join(OUT_INTERFACES, `${v.id}.Interface.compact`), interfaceSource(v, planned), 'utf8');
      const events = planned.reduce((n, s) => n + (s.kind === 'emit' ? s.declaration.parts : 0), 0);
      console.log(`${v.id.padEnd(8)} ${v.du.template.padEnd(22)} ${String(planned.length).padStart(2)} steps, ${String(events).padStart(2)} MIP-0018 events; bundle ${v.bundleParts} part(s) -> contracts/generated/${v.id}.compact + ${v.interfaceSource}`);
    }
    matrixRows.push({
      id: v.id,
      contract: v.id,
      base: v.ref.id,
      twin: v.du.twin,
      template: v.du.template,
      openZeppelinModule: v.du.module,
      interface: v.du.interface,
      interfaceSource: v.interfaceSource,
      name: v.name,
      symbol: v.symbol,
      decimals: v.decimals,
      kind: v.kind,
      domain: v.domain,
      domainSepHex: hex(padTo(utf8(v.domain), DOMAIN_SIZE)),
      pieces: null,
      // The constructor's arguments after `emitterSecretHash` (which the deployment supplies).
      constructorArgs: { name_: v.name, symbol_: v.symbol },
      repository: v.repositoryUrl,
      bundle: { url: v.bundleUrl, urlBytes: Buffer.byteLength(v.bundleUrl, 'utf8'), parts: v.bundleParts, path: v.du.bundlePath },
      ...(v.du.secondBundle ? { secondBundle: secondBundleOf(v) } : {}),
      steps: planned,
    });
  }

  writeFileSync(
    OUT_MATRIX,
    `${JSON.stringify(
      {
        $comment:
          "GENERATED by scripts/generate-du-contracts.ts from deployments/reference-set.json and deployments/dual-set.json. The ordered on-chain plan for the DU (dual) variant of each row (spec 00024 §6.B: SNEBDU, LMOONDU, UMETDU, DAURDU): the contract, its constructor arguments after the emitter-secret hash, and each step — an `emit` step is ONE MIP-0018 declaration of the row's MIP-18 twin (one circuit call, one intent, one package of `parts` events; `payloadHex` is its exact 256·parts bytes); `mint` steps call the token; the last step publishes the contract's interface pointer, `parts` publishBundle calls in ONE guaranteed intent (the commitment comes from deployments/bundles.json, written by the bundle step).",
        rows: matrixRows,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(`\nwrote ${path.relative(ROOT, OUT_MATRIX) || OUT_MATRIX} (${matrixRows.length} rows)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main();
