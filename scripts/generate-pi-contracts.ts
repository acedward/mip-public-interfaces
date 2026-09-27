/**
 * Generate the PI contract set of spec 00024 §6.B (project 00024-02): one Compact contract
 * per row of `deployments/public-interface-set.json`, taken from the same row of
 * `deployments/reference-set.json` (a pinned copy of acedward/mip-0018-midnight-contracts'
 * reference set, see deployments/README.md), in its `PI` variant — `LSUNPI`, `SSTARPI`,
 * `CNSTPI`, `UPROMPI`.
 *
 * Every generated contract has:
 *   - the EMITTER SECRET (spec 00024 Q12, FR-019b): the constructor stores
 *     `TM_emitterSecretHashOf(secret)` (TokenMetadata's sealed `emitterSecretHash`), and
 *     every emitting circuit calls `TM_assertEmitter()` first;
 *   - `publishBundle(payload: Bytes<256>)` — the Public Interfaces module's event circuit
 *     behind the emitter secret. A pointer longer than one event (a URL over 224 bytes) is
 *     several `publishBundle(part)` calls in ONE guaranteed intent (the Multi-Part Event
 *     rule, UC-2 of project 00024);
 *   - ONE kind of MIP-0018 declaration only: `repository` (val-type 4, the URL of the
 *     contract's own source on `main`), one per token — a collection declares it once per
 *     piece. Each declaration is its own circuit (one declaration per call and intent,
 *     UC-1), every byte of its payload a compile-time literal;
 *   - the token itself on OpenZeppelin Compact Contracts v0.4.0-alpha.3 where a module
 *     exists (`FungibleToken`, `NativeShieldedToken`, `NativeShieldedTokenFamily`, vendored
 *     under contracts/vendor/openzeppelin/), otherwise this repository's own native
 *     unshielded template (OpenZeppelin has none).
 *
 * FULL interfaces (spec §6.B; the public-interface open form): the WHOLE contract source is
 * the published interface. So a generated contract exports impure circuits only — every
 * ledger read, every mint and transfer, every emitting circuit — and no pure circuit (spec
 * Q9: a pure circuit has no verifier key on chain and cannot be verified). Constant facts
 * a pure circuit would return (domain separator, decimals) are read from ledger state
 * instead. The tests assert it on the compiled output (`contract-info.json`: no circuit
 * with `pure: true`).
 *
 * Token names and symbols live in OpenZeppelin's `Opaque<"string">` ledger fields (a
 * Compact string literal is a `Bytes<n>`, not an `Opaque<"string">`), so they are
 * constructor arguments; the matrix records the values the deployment passes.
 *
 * Usage:
 *   npx tsx scripts/generate-pi-contracts.ts               # every PI row
 *   npx tsx scripts/generate-pi-contracts.ts LSUN UPROMPI  # selected rows (base or variant id)
 *   npx tsx scripts/generate-pi-contracts.ts --out <dir>   # write elsewhere (the tests
 *                                                          # regenerate into a temp dir)
 *
 * Writes `contracts/generated/<ID>.compact` and `deployments/generated-matrix.json` (the
 * step-by-step plan the deployment and the simulator corpus execute).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..');
const REFERENCE_SET = path.join(ROOT, 'deployments', 'reference-set.json');
const PI_SET = path.join(ROOT, 'deployments', 'public-interface-set.json');

const KEY_SIZE = 32;
const DOMAIN_SIZE = 32;
/** UC-1: one event's payload is one part of a package. */
const PART_SIZE = 256;
/** UC-1: domainSep 32 + kind 1 + key 32 + val-type 1 + val-len 2 (little-endian). */
const HEADER_SIZE = 68;
/** UC-1: one event (a one-part package) holds 188 value bytes after the 68-byte header. */
const VALUE_SIZE = PART_SIZE - HEADER_SIZE;
/** MIP section 2.1: val-type 4 — valid UTF-8 that parses as an absolute URI. */
const VAL_TYPE_URI = 4;
/** [B]: the bytes of a URL one `publishBundle` event holds after the 32-byte commitment. */
const MAX_URL_BYTES_ONE_PART = PART_SIZE - 32;
/** MIP Appendix A: `symbol` is at most 32 bytes. */
const MAX_SYMBOL_LEN = 32;

// ---------------------------------------------------------------------------
// inputs
// ---------------------------------------------------------------------------

interface Step {
  op: string;
  key?: string;
  value?: string;
  to?: string;
  amount?: string;
  nonce?: string;
  piece?: string;
  pieceName?: string;
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

type Template = 'FungibleToken' | 'NativeShieldedToken' | 'NativeShieldedTokenFamily' | 'NativeUnshieldedToken';

interface PiRow {
  base: string;
  template: Template;
  module: string | null;
  interface: 'FULL';
  covers: string;
  bundlePath: string;
}

interface PiSet {
  variant: { suffix: string; label: string };
  repositoryBlob: string;
  bundleBase: string;
  rows: PiRow[];
}

const referenceSet = JSON.parse(readFileSync(REFERENCE_SET, 'utf8')) as { rows: ReferenceRow[] };
const piSet = JSON.parse(readFileSync(PI_SET, 'utf8')) as PiSet;
const { suffix: SUFFIX, label: LABEL } = piSet.variant;

// ---------------------------------------------------------------------------
// bytes
// ---------------------------------------------------------------------------

const utf8 = (text: string): Uint8Array => new Uint8Array(Buffer.from(text, 'utf8'));
const hex = (bytes: Uint8Array): string => Buffer.from(bytes).toString('hex');

const padTo = (bytes: Uint8Array, size: number): Uint8Array => {
  if (bytes.length > size) throw new Error(`value of ${bytes.length} bytes does not fit in ${size}`);
  const out = new Uint8Array(size);
  out.set(bytes);
  return out;
};

/**
 * A Compact literal for `size` bytes whose meaningful prefix is `bytes` — `pad(size, "…")`
 * for plain printable ASCII the lexer need not escape, an explicit `Bytes[…]` otherwise
 * (the same rule as acedward/mip-0018-midnight-contracts' generator), so the emitted bytes
 * never depend on how the compiler reads a string literal.
 */
const byteLiteral = (bytes: Uint8Array, size: number): string => {
  padTo(bytes, size);
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end -= 1;
  const meaningful = bytes.subarray(0, end);
  if (meaningful.every((b) => b >= 0x20 && b <= 0x7e && b !== 0x22 && b !== 0x5c)) {
    return `pad(${size}, "${Buffer.from(meaningful).toString('latin1')}")`;
  }
  const items = [...meaningful].map((b) => `0x${b.toString(16).padStart(2, '0')}`);
  if (meaningful.length < size) items.push(`...pad(${size - meaningful.length}, "")`);
  return `Bytes[${items.join(', ')}]`;
};

// ---------------------------------------------------------------------------
// the PI variant of a reference row
// ---------------------------------------------------------------------------

interface Declaration {
  /** the circuit that emits it */
  circuit: string;
  piece: string | null;
  domain: string;
  domainSepHex: string;
  kind: number;
  key: 'repository';
  valType: number;
  len: number;
  parts: 1;
  text: string;
  /** the exact 256-byte package the circuit emits */
  payloadHex: string;
}

type PlannedStep =
  | { kind: 'emit'; circuit: string; declaration: Declaration; sourceOp: string }
  | { kind: 'mint'; circuit: 'mint' | 'mintPiece'; token: 'shielded' | 'unshielded' | 'ledger'; piece: string | null; domain: string | null; to: string; amount: string; nonce: string | null; sourceOp: string }
  | { kind: 'transfer'; circuit: 'transfer'; to: string; amount: string; sourceOp: string }
  | { kind: 'publishBundle'; circuit: 'publishBundle'; parts: number; url: string };

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

interface Variant {
  pi: PiRow;
  ref: ReferenceRow;
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  kind: number;
  /** the single token's domain separator (null for a collection) */
  domain: string | null;
  pieces: { piece: string; domain: string }[] | null;
  repositoryUrl: string;
  bundleUrl: string;
  bundleParts: number;
}

const variantOf = (pi: PiRow): Variant => {
  const ref = referenceSet.rows.find((row) => row.id === pi.base);
  if (!ref) throw new Error(`public-interface-set row "${pi.base}" is not a row of reference-set.json`);
  const id = `${ref.id}${SUFFIX}`;
  const symbol = `${ref.symbol}${SUFFIX}`;
  if (Buffer.byteLength(symbol, 'utf8') > MAX_SYMBOL_LEN) throw new Error(`${id}: symbol "${symbol}" is longer than ${MAX_SYMBOL_LEN} bytes`);
  const collection = pi.template === 'NativeShieldedTokenFamily';
  if (collection !== Boolean(ref.pieces)) throw new Error(`${id}: template ${pi.template} does not match the reference row's shape`);
  const domain = collection ? null : ref.domain ? `${ref.domain}${SUFFIX.toLowerCase()}` : `umbra:${symbol.toLowerCase()}`;
  const pieces = collection ? (ref.pieces ?? []).map((piece) => ({ piece, domain: `${symbol.toLowerCase()}:${piece}` })) : null;
  for (const d of [domain, ...(pieces ?? []).map((p) => p.domain)]) {
    if (d !== null && Buffer.byteLength(d, 'utf8') > DOMAIN_SIZE) throw new Error(`${id}: domain "${d}" is longer than ${DOMAIN_SIZE} bytes`);
  }
  const bundleUrl = `${piSet.bundleBase}${pi.bundlePath}index.json`;
  const urlBytes = Buffer.byteLength(bundleUrl, 'utf8');
  return {
    pi,
    ref,
    id,
    name: `${ref.name} · ${LABEL}`,
    symbol,
    decimals: ref.decimals,
    kind: ref.kind,
    domain,
    pieces,
    repositoryUrl: `${piSet.repositoryBlob}/${id}.compact`,
    bundleUrl,
    bundleParts: Math.max(1, Math.ceil((32 + urlBytes) / PART_SIZE)),
  };
};

/** The `repository` declaration of one token (or piece), as the literal package it is. */
const repositoryDeclaration = (v: Variant, circuit: string, domain: string, piece: string | null): Declaration => {
  const value = utf8(v.repositoryUrl);
  if (value.length > VALUE_SIZE) throw new Error(`${v.id}: repository URL is ${value.length} bytes, more than one part holds`);
  try {
    if (!(new URL(v.repositoryUrl).protocol.length > 1)) throw new Error('not absolute');
  } catch {
    throw new Error(`${v.id}: val-type 4 requires an absolute URI, got "${v.repositoryUrl}"`);
  }
  const domainSep = padTo(utf8(domain), DOMAIN_SIZE);
  const payload = new Uint8Array(PART_SIZE);
  payload.set(domainSep, 0);
  payload[32] = v.kind;
  payload.set(padTo(utf8('repository'), KEY_SIZE), 33);
  payload[65] = VAL_TYPE_URI;
  payload[66] = value.length & 0xff; // val-len, little-endian (UC-1)
  payload[67] = value.length >> 8;
  payload.set(value, HEADER_SIZE);
  return {
    circuit,
    piece,
    domain,
    domainSepHex: hex(domainSep),
    kind: v.kind,
    key: 'repository',
    valType: VAL_TYPE_URI,
    len: value.length,
    parts: 1,
    text: v.repositoryUrl,
    payloadHex: hex(payload),
  };
};

/**
 * The reference row's steps as this variant runs them. A PI contract declares ONLY
 * `repository` under MIP-0018, so the reference set's `publishMetadata` / `publishPiece` /
 * `setMetadata` / `setPieceTrait` steps are not part of it; its mints and transfers are;
 * `publishBundle` comes last (the bundle's commitment exists only once the contract is
 * compiled; the deployment publishes it after the other steps).
 */
function planSteps(v: Variant): PlannedStep[] {
  const planned: PlannedStep[] = [];
  const declared = new Set<string>();
  for (const step of v.ref.steps) {
    switch (step.op) {
      case 'publishRepository': {
        const piece = step.piece ?? null;
        const domain = piece ? v.pieces?.find((p) => p.piece === piece)?.domain : v.domain;
        if (!domain) throw new Error(`${v.id}: publishRepository for unknown piece "${piece}"`);
        const circuit = piece ? `publish${capitalize(piece)}Repository` : 'publishRepository';
        if (declared.has(circuit)) throw new Error(`${v.id}: ${circuit} declared twice`);
        declared.add(circuit);
        planned.push({ kind: 'emit', circuit, declaration: repositoryDeclaration(v, circuit, domain, piece), sourceOp: step.op });
        break;
      }
      case 'publishMetadata':
      case 'publishUnshielded':
      case 'publishShielded':
      case 'publishPiece':
      case 'setMetadata':
      case 'setPieceTrait':
        break; // PI: `repository` is the only MIP-0018 declaration (spec §6.B)
      case 'ledgerMint':
        if (v.pi.template !== 'FungibleToken') throw new Error(`${v.id}: ${step.op} needs a ledger token`);
        planned.push({ kind: 'mint', circuit: 'mint', token: 'ledger', piece: null, domain: null, to: step.to ?? 'owner', amount: step.amount ?? '0', nonce: null, sourceOp: step.op });
        break;
      case 'transfer':
        if (v.pi.template !== 'FungibleToken') throw new Error(`${v.id}: ${step.op} needs a ledger token`);
        planned.push({ kind: 'transfer', circuit: 'transfer', to: step.to ?? 'owner', amount: step.amount ?? '0', sourceOp: step.op });
        break;
      case 'mint':
        if (v.pi.template !== 'NativeShieldedToken' && v.pi.template !== 'NativeUnshieldedToken') throw new Error(`${v.id}: ${step.op} needs a native token`);
        planned.push({
          kind: 'mint', circuit: 'mint', token: v.pi.template === 'NativeShieldedToken' ? 'shielded' : 'unshielded',
          piece: null, domain: v.domain, to: step.to ?? 'owner', amount: step.amount ?? '1', nonce: step.nonce ?? null, sourceOp: step.op,
        });
        break;
      case 'mintPiece': {
        const piece = step.piece ?? '';
        const domain = v.pieces?.find((p) => p.piece === piece)?.domain;
        if (!domain) throw new Error(`${v.id}: mintPiece for unknown piece "${piece}"`);
        planned.push({ kind: 'mint', circuit: 'mintPiece', token: 'shielded', piece, domain, to: step.to ?? 'owner', amount: '1', nonce: step.nonce ?? null, sourceOp: step.op });
        break;
      }
      default:
        throw new Error(`${v.id}: step op "${step.op}" has no PI form`);
    }
  }
  planned.push({ kind: 'publishBundle', circuit: 'publishBundle', parts: v.bundleParts, url: v.bundleUrl });
  return planned;
}

// ---------------------------------------------------------------------------
// Compact source
// ---------------------------------------------------------------------------

const emitCircuit = (d: Declaration): string => {
  const domain = byteLiteral(utf8(d.domain), DOMAIN_SIZE);
  return `/**
 * @description MIP-0018: declares \`repository\`${d.piece ? ` of the ${d.piece} piece` : ''} — the URL of this contract's
 * own source on \`main\` (val-type 4 URI). One declaration, one TokenMetadata event, every
 * byte a compile-time literal. Emitter only.
 */
export circuit ${d.circuit}(): [] {
  TM_assertEmitter();
  // repository = "${d.text}" (val-type 4 URI, val-len ${d.len})
  TM_emitTokenMetadata(${domain}, ${d.kind}, pad(32, "repository"), ${d.valType}, ${d.len}, ${byteLiteral(utf8(d.text), VALUE_SIZE)});
}`;
};

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
    if (line && line.length + 1 + word.length > 89) { lines.push(line); line = word; } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.map((l) => `// ${l}`).join('\n');
};

const HEADER = (v: Variant, planned: PlannedStep[], constructorArgs: string): string => `// SPDX-License-Identifier: Apache-2.0
//
// GENERATED FILE — do not edit. Produced by scripts/generate-pi-contracts.ts from
// deployments/reference-set.json row "${v.ref.id}" and deployments/public-interface-set.json,
// ${LABEL} variant: ${v.id} (${v.name}). Source of truth for its \`repository\` declaration:
// ${v.repositoryUrl}
//
${comment(`${v.name} (${v.symbol}), ${v.decimals} decimals, kind byte ${v.kind}; ${v.pi.module ? `built on OpenZeppelin Compact Contracts v0.4.0-alpha.3 \`${v.pi.template}\` (vendored, contracts/vendor/openzeppelin/)` : `this repository's own native unshielded template (OpenZeppelin has no native unshielded module)`}.`)}
${comment(`Covers: ${v.pi.covers}.`)}
//
// PUBLIC INTERFACE: FULL. This whole file, with the modules it imports, IS the contract's
// published interface (the Public Interfaces draft's open form): every circuit below is
// impure — a ledger read, a mint or transfer, or an emitting circuit — and each has a
// verifier key on chain that Level 2 compares; there is no pure circuit (it could not be
// verified). The emitting circuits take the emitter secret (a witness), so a consumer
// verifies them at Levels 1-3 but cannot execute them.
//
// Who may emit: only the holder of the secret whose hash the constructor stores (spec 00024
// Q12). MIP-0018: \`repository\` is the only key this contract declares.
//
// Constructor arguments: ${constructorArgs}.
// Circuits the deployment calls, in order:
${planned.map((s) => `//   ${s.circuit}${s.kind === 'publishBundle' ? ` (${s.parts} part${s.parts === 1 ? '' : 's'}, one guaranteed intent)` : s.kind === 'mint' && s.piece ? ` (${s.piece})` : ''}`).join('\n')}

pragma language_version >= 0.26.0;

import CompactStandardLibrary;
import "../TokenMetadata" prefix TM_;
import "../OffChainInterface" prefix OCI_;
`;

const OZ_CONSTRUCTOR_ARGS = '`emitterSecretHash` (`TM_emitterSecretHashOf(secret)`, computed off chain), `name_`, `symbol_`';
const emitsOf = (planned: PlannedStep[]): Declaration[] =>
  planned.flatMap((s) => (s.kind === 'emit' ? [s.declaration] : []));
const CONSTRUCTOR_DOC = `/**
 * @param {Bytes<32>} emitterSecretHash - \`TM_emitterSecretHashOf(secret)\`, computed off chain;
 *   every emitting circuit proves knowledge of \`secret\` through the \`emitterSecret\` witness.
 * @param {Opaque<"string">} name_ - The token's name (a Compact string literal is not an Opaque<"string">).
 * @param {Opaque<"string">} symbol_ - The token's symbol.
 */`;

function generateFungible(v: Variant, planned: PlannedStep[]): string {
  return `${HEADER(v, planned, OZ_CONSTRUCTOR_ARGS)}import "../vendor/openzeppelin/token/FungibleToken" prefix Token_;

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

${[...emitsOf(planned).map(emitCircuit), PUBLISH_BUNDLE].join('\n\n')}
`;
}

function generateShielded(v: Variant, planned: PlannedStep[]): string {
  const domain = byteLiteral(utf8(v.domain ?? ''), DOMAIN_SIZE);
  return `${HEADER(v, planned, OZ_CONSTRUCTOR_ARGS)}import "../vendor/openzeppelin/token/NativeShieldedToken" prefix Token_;

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

${[...emitsOf(planned).map(emitCircuit), PUBLISH_BUNDLE].join('\n\n')}
`;
}

function generateFamily(v: Variant, planned: PlannedStep[]): string {
  return `${HEADER(v, planned, OZ_CONSTRUCTOR_ARGS)}import "../vendor/openzeppelin/token/NativeShieldedTokenFamily" prefix Token_;

export { ContractAddress, Either, Maybe, ShieldedCoinInfo, ZswapCoinPublicKey, TM_emitterSecretHash };

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

/**
 * @description The colour of one piece: \`tokenType(pieceDomain, this contract)\`. The
 * domain is a call argument — one address, many tokens (the ERC-1155 / EIP-7496 shape).
 */
export circuit tokenColor(pieceDomain: Bytes<32>): Bytes<32> {
  return Token_tokenColor(pieceDomain);
}

/**
 * @description Mints one unit of the piece identified by \`pieceDomain\` to \`recipient\`, a
 * Zswap coin public key (OpenZeppelin 0.4.0-alpha.3, #833). Deliberately open: a
 * reference test collection. Pieces: ${(v.pieces ?? []).map((p) => `\`${p.domain}\``).join(', ')}.
 * @param {Bytes<32>} nonce - Caller-supplied, unique per (piece, mint).
 */
export circuit mintPiece(pieceDomain: Bytes<32>, recipient: ZswapCoinPublicKey, nonce: Bytes<32>): ShieldedCoinInfo {
  return Token__mint(disclose(pieceDomain), disclose(recipient), 1, disclose(nonce));
}

${[...emitsOf(planned).map(emitCircuit), PUBLISH_BUNDLE].join('\n\n')}
`;
}

function generateUnshielded(v: Variant, planned: PlannedStep[]): string {
  const domain = byteLiteral(utf8(v.domain ?? ''), DOMAIN_SIZE);
  return `${HEADER(v, planned, OZ_CONSTRUCTOR_ARGS)}
export { ContractAddress, Either, Maybe, UserAddress, TM_emitterSecretHash };

// The same ledger shape as OpenZeppelin's token modules (name, symbol and decimals sealed
// at construction), so every PI contract answers the same reads.
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
 * Deliberately open: a reference test token. (The reference deployment never calls it:
 * the row is "described, never minted".)
 * @return {Bytes<32>} - The colour actually minted.
 */
export circuit mint(recipient: Either<ContractAddress, UserAddress>, amount: Uint<64>): Bytes<32> {
  assert(amount > 0, "amount must be positive");
  _mints.increment(1);
  return mintUnshieldedToken(_domain, disclose(amount), disclose(recipient));
}

${[...emitsOf(planned).map(emitCircuit), PUBLISH_BUNDLE].join('\n\n')}
`;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
let outRoot = ROOT;
const selected: string[] = [];
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === '--out') outRoot = path.resolve(argv[++i] ?? '');
  else selected.push(argv[i] ?? '');
}
const OUT_CONTRACTS = path.join(outRoot, 'contracts', 'generated');
const OUT_MATRIX = path.join(outRoot, 'deployments', 'generated-matrix.json');

const variants = piSet.rows.map(variantOf);
const rows = variants.filter((v) => selected.length === 0 || selected.includes(v.id) || selected.includes(v.ref.id));
if (selected.length > 0 && rows.length !== selected.length) throw new Error(`unknown row id(s) among: ${selected.join(', ')}`);

// UC-2 / B3: exactly the rows whose URL exceeds one event are multi-part.
for (const v of variants) {
  const urlBytes = Buffer.byteLength(v.bundleUrl, 'utf8');
  if ((urlBytes > MAX_URL_BYTES_ONE_PART) !== (v.bundleParts > 1)) throw new Error(`${v.id}: part count ${v.bundleParts} disagrees with a ${urlBytes}-byte URL`);
}

mkdirSync(OUT_CONTRACTS, { recursive: true });
mkdirSync(path.dirname(OUT_MATRIX), { recursive: true });

const matrixRows: unknown[] = [];
for (const v of variants) {
  const planned = planSteps(v);
  if (rows.includes(v)) {
    const source = {
      FungibleToken: generateFungible,
      NativeShieldedToken: generateShielded,
      NativeShieldedTokenFamily: generateFamily,
      NativeUnshieldedToken: generateUnshielded,
    }[v.pi.template](v, planned);
    writeFileSync(path.join(OUT_CONTRACTS, `${v.id}.compact`), source, 'utf8');
    console.log(`${v.id.padEnd(8)} ${v.pi.template.padEnd(26)} ${String(planned.length).padStart(2)} steps; bundle ${v.bundleParts} part(s), url ${Buffer.byteLength(v.bundleUrl, 'utf8')} B -> contracts/generated/${v.id}.compact`);
  }
  matrixRows.push({
    id: v.id,
    contract: v.id,
    base: v.ref.id,
    template: v.pi.template,
    openZeppelinModule: v.pi.module,
    interface: v.pi.interface,
    name: v.name,
    symbol: v.symbol,
    decimals: v.decimals,
    kind: v.kind,
    domain: v.domain,
    domainSepHex: v.domain === null ? null : hex(padTo(utf8(v.domain), DOMAIN_SIZE)),
    pieces: v.pieces?.map((p) => ({ ...p, domainSepHex: hex(padTo(utf8(p.domain), DOMAIN_SIZE)) })) ?? null,
    // The constructor's arguments after `emitterSecretHash` (which the deployment supplies).
    constructorArgs: { name_: v.name, symbol_: v.symbol },
    repository: v.repositoryUrl,
    bundle: { url: v.bundleUrl, urlBytes: Buffer.byteLength(v.bundleUrl, 'utf8'), parts: v.bundleParts, path: v.pi.bundlePath },
    steps: planned,
  });
}

writeFileSync(
  OUT_MATRIX,
  `${JSON.stringify(
    {
      $comment:
        'GENERATED by scripts/generate-pi-contracts.ts from deployments/reference-set.json and deployments/public-interface-set.json. The ordered on-chain plan for the PI variant of each row (spec 00024 §6.B: LSUNPI, SSTARPI, CNSTPI, UPROMPI): the contract, its constructor arguments after the emitter-secret hash, and each step — an `emit` step is ONE MIP-0018 `repository` declaration (one circuit call, one intent, one 256-byte package; `payloadHex` exact); `mint`/`transfer` steps call the token; the last step publishes the contract\'s interface pointer, `parts` publishBundle calls in ONE guaranteed intent (the commitment comes from deployments/bundles.json, written by the bundle step).',
      rows: matrixRows,
    },
    null,
    2,
  )}\n`,
  'utf8',
);
console.log(`\nwrote ${path.relative(ROOT, OUT_MATRIX) || OUT_MATRIX} (${matrixRows.length} rows)`);
