/**
 * The HIDDEN public interface of each DU contract (sub-plan 03-A2): the Public Interfaces
 * draft's PRIVATE form — compare its example `compact-examples/fungible-private/Interface.compact`
 * (acedward/public-interfaces-for-compact-contracts @ 1cf9477). Written by
 * scripts/generate-du-contracts.ts next to the contracts, as
 * `contracts/interfaces/<ID>.Interface.compact`.
 *
 * The interface imports no module. It declares the deployed contract's ledger itself — every
 * slot, in the deployed order, with the deployed type, under the names `hidden1` … `hiddenN`
 * — because a verifier key depends on a circuit's logic and on the positions and types of the
 * ledger slots it touches, not on any name. It publishes EVERY impure circuit of the contract
 * (spec 00024 Q9: token reads and mints, every MIP-0018 declaration and `publishBundle`) under
 * its deployed entry point name, and no pure circuit (the contract's constant getter has no
 * verifier key). The module circuits the published circuits call — the MIP-0018 module
 * (`contracts/TokenMetadata.compact`), the Public Interfaces module
 * (`contracts/OffChainInterface.compact`) and the OpenZeppelin Compact Contracts v0.4.0-alpha.3
 * modules (`contracts/vendor/openzeppelin/`, MIT) — are written out as LOCAL, non-exported
 * circuits: each body copied from its module with only the ledger names replaced, and each
 * call kept as a call, so every published circuit compiles to the same ZKIR — hence the same
 * verifier key — as the deployed contract's (`public-interface-deploy-check` refuses the
 * bundle otherwise; Level 3 of `public-interface-verify` checks it again).
 */
import { declarationBody, declarationDoc, type PlannedStep, type Template, type Variant } from './generate-du-contracts.js';

interface Slot {
  sealed: boolean;
  type: string;
  /** The file that declares the field in the deployed contract: a path under `contracts/`, or
   *  `generated` for the contract's own source (the own unshielded template). For the bundle's
   *  provenance record (scripts/bundle.ts); the field's name is in contract-info.json. */
  from: string;
}

const TM = 'TokenMetadata.compact';
const NST = 'vendor/openzeppelin/token/NativeShieldedToken.compact';
const CORE = 'vendor/openzeppelin/token/NativeShieldedTokenCore.compact';
const FT = 'vendor/openzeppelin/token/FungibleToken.compact';

/**
 * The deployed ledger of each template, slot by slot (`contracts/managed/<ID>/compiler/
 * contract-info.json` lists the same order and types; test/dual-interfaces.test.ts checks it).
 * `sealed` follows the declaring module's source.
 */
const EITHER_ACCOUNT = 'Either<Bytes<32>, ContractAddress>';
const LEDGER: Record<Template, Slot[]> = {
  // TokenMetadata.emitterSecretHash; NativeShieldedToken._domain; NativeShieldedTokenCore._isInitialized, _name, _symbol, _decimals
  NativeShieldedToken: [
    { sealed: true, type: 'Bytes<32>', from: TM },
    { sealed: true, type: 'Bytes<32>', from: NST },
    { sealed: false, type: 'Boolean', from: CORE },
    { sealed: true, type: 'Opaque<"string">', from: CORE },
    { sealed: true, type: 'Opaque<"string">', from: CORE },
    { sealed: true, type: 'Uint<8>', from: CORE },
  ],
  NativeDualToken: [
    { sealed: true, type: 'Bytes<32>', from: TM },
    { sealed: true, type: 'Bytes<32>', from: NST },
    { sealed: false, type: 'Boolean', from: CORE },
    { sealed: true, type: 'Opaque<"string">', from: CORE },
    { sealed: true, type: 'Opaque<"string">', from: CORE },
    { sealed: true, type: 'Uint<8>', from: CORE },
  ],
  // TokenMetadata.emitterSecretHash; FungibleToken._isInitialized, _balances, _allowances, _totalSupply, _name, _symbol, _decimals
  FungibleToken: [
    { sealed: true, type: 'Bytes<32>', from: TM },
    { sealed: false, type: 'Boolean', from: FT },
    { sealed: false, type: `Map<${EITHER_ACCOUNT}, Uint<128>>`, from: FT },
    { sealed: false, type: `Map<${EITHER_ACCOUNT}, Map<${EITHER_ACCOUNT}, Uint<128>>>`, from: FT },
    { sealed: false, type: 'Uint<128>', from: FT },
    { sealed: true, type: 'Opaque<"string">', from: FT },
    { sealed: true, type: 'Opaque<"string">', from: FT },
    { sealed: true, type: 'Uint<8>', from: FT },
  ],
  // TokenMetadata.emitterSecretHash; the own template's _name, _symbol, _decimals, _domain, _mints
  NativeUnshieldedToken: [
    { sealed: true, type: 'Bytes<32>', from: TM },
    { sealed: true, type: 'Opaque<"string">', from: 'generated' },
    { sealed: true, type: 'Opaque<"string">', from: 'generated' },
    { sealed: true, type: 'Uint<8>', from: 'generated' },
    { sealed: true, type: 'Bytes<32>', from: 'generated' },
    { sealed: false, type: 'Counter', from: 'generated' },
  ],
};

export const ledgerOf = (template: Template): readonly Slot[] => LEDGER[template];

const WITNESSES: Record<Template, string[]> = {
  NativeShieldedToken: ['emitterSecret'],
  NativeDualToken: ['emitterSecret'],
  FungibleToken: ['emitterSecret', 'wit_FungibleTokenSK'],
  NativeUnshieldedToken: ['emitterSecret'],
};

const EXPORTS: Record<Template, string> = {
  NativeShieldedToken: 'ContractAddress, Either, Maybe, ShieldedCoinInfo, ZswapCoinPublicKey',
  NativeDualToken: 'ContractAddress, Either, Maybe, ShieldedCoinInfo, UserAddress, ZswapCoinPublicKey',
  FungibleToken: 'ContractAddress, Either, Maybe',
  NativeUnshieldedToken: 'ContractAddress, Either, Maybe, UserAddress',
};

const OZ_MODULES: Record<Template, string[]> = {
  NativeShieldedToken: ['token/NativeShieldedToken', 'token/NativeShieldedTokenCore', 'utils/Utils'],
  NativeDualToken: ['token/NativeShieldedToken', 'token/NativeShieldedTokenCore', 'utils/Utils'],
  FungibleToken: ['token/FungibleToken', 'utils/Utils'],
  NativeUnshieldedToken: [],
};

/** Which OpenZeppelin module files a template's interface adapts code from (for its NOTICE). */
export const ozModulesOf = (template: Template): readonly string[] => OZ_MODULES[template];

/**
 * The module file each LOCAL circuit of a generated interface is written out from, by the local
 * name's prefix (the local name = prefix + the module's circuit name). scripts/bundle.ts records
 * it in each HIDDEN bundle's SOURCE.md; test/dual-interfaces.test.ts checks every local body
 * against its module's, names aside. Longest prefix first.
 */
export const LOCAL_CIRCUIT_ORIGINS: readonly { readonly prefix: string; readonly file: string }[] = [
  { prefix: 'oz_utils_', file: 'vendor/openzeppelin/utils/Utils.compact' },
  { prefix: 'oz_core_', file: CORE },
  { prefix: 'oz_nst_', file: NST },
  { prefix: 'oz_ft_', file: FT },
  { prefix: 'oci_', file: 'OffChainInterface.compact' },
  { prefix: 'tm_', file: TM },
];

/** One circuit definition of a Compact source. */
export interface CompactCircuit {
  readonly name: string;
  readonly exported: boolean;
  readonly pure: boolean;
  /** From the name to the closing brace of the body, comments removed, whitespace collapsed. */
  readonly text: string;
}

/**
 * A Compact source without its comments (`clean`), and the same text with every string literal's
 * content blanked (`mask`, index for index): circuits and braces are searched in `mask`, so a
 * string such as "one circuit call" or a JSON value's braces is never read as code.
 */
function scanSource(source: string): { clean: string; mask: string } {
  let clean = '';
  let mask = '';
  for (let i = 0; i < source.length;) {
    const c = source[i]!;
    const next = source[i + 1];
    if (c === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i += 1;
    } else if (c === '/' && next === '*') {
      const close = source.indexOf('*/', i + 2);
      i = close < 0 ? source.length : close + 2;
      clean += ' ';
      mask += ' ';
    } else if (c === '"') {
      let j = i + 1;
      while (j < source.length && source[j] !== '"') j += source[j] === '\\' ? 2 : 1;
      const literal = source.slice(i, j + 1);
      clean += literal;
      mask += `"${' '.repeat(Math.max(0, literal.length - 2))}"`;
      i = j + 1;
    } else {
      clean += c;
      mask += c;
      i += 1;
    }
  }
  return { clean, mask };
}

/** Every circuit definition of a Compact source (comments and string contents ignored; bodies by brace matching). */
export function circuitsOf(source: string): CompactCircuit[] {
  const { clean, mask } = scanSource(source);
  const out: CompactCircuit[] = [];
  for (const m of mask.matchAll(/(export\s+)?(pure\s+)?circuit\s+([A-Za-z0-9_]+)/g)) {
    const open = mask.indexOf('{', m.index! + m[0].length);
    if (open < 0) throw new Error(`circuit ${m[3]} has no body`);
    let depth = 0;
    let end = open;
    for (; end < mask.length; end += 1) {
      if (mask[end] === '{') depth += 1;
      else if (mask[end] === '}' && (depth -= 1) === 0) break;
    }
    if (depth !== 0) throw new Error(`circuit ${m[3]}: unbalanced braces`);
    const nameAt = m.index! + m[0].length - m[3]!.length;
    out.push({ name: m[3]!, exported: m[1] !== undefined, pure: m[2] !== undefined, text: clean.slice(nameAt, end + 1).split(/\s+/).join(' ') });
  }
  return out;
}

/** A local circuit of a generated interface: the module circuit it is written out from. */
export interface LocalCircuit {
  readonly local: string;
  readonly file: string;
  readonly upstream: string;
  readonly pure: boolean;
}

/** The local (non-exported) circuits of an interface source and their origins; a local circuit of unknown origin throws. */
export function localCircuitsOf(source: string): LocalCircuit[] {
  return circuitsOf(source).filter((c) => !c.exported).map((c) => {
    const origin = LOCAL_CIRCUIT_ORIGINS.find((o) => c.name.startsWith(o.prefix));
    if (origin === undefined) throw new Error(`local circuit ${c.name} has no known origin (LOCAL_CIRCUIT_ORIGINS)`);
    return { local: c.name, file: origin.file, upstream: c.name.slice(origin.prefix.length), pure: c.pure };
  });
}

// ---------------------------------------------------------------------------
// the module circuits, written out (ledger slots: 1 = TokenMetadata.emitterSecretHash)
// ---------------------------------------------------------------------------

const tokenMetadataCircuits = (multiPart: boolean): string => `// --- MIP-0018 (contracts/TokenMetadata.compact, Apache-2.0): the circuits the declarations call ---

circuit tm_EVENT_NAME(): Bytes<32> {
  return pad(32, "mip-0018:token-metadata[v1]");
}

circuit tm_ONE_PART_VALUE_SIZE(): Uint<16> {
  return 188;
}

pure circuit tm_emitterSecretHashOf(secret: Bytes<32>): Bytes<32> {
  return persistentHash<Vector<2, Bytes<32>>>([pad(32, "mip-0018:emitter:"), secret]);
}

/** Every emitting circuit calls this first: the caller must know the emitter secret (spec 00024 Q12). */
circuit tm_assertEmitter(): [] {
  assert(tm_emitterSecretHashOf(emitterSecret()) == hidden1,
         "TokenMetadata: caller is not the emitter");
}

circuit tm_emitHead(
  domainSep: Bytes<32>,
  kind: Uint<8>,
  key: Bytes<32>,
  valType: Uint<8>,
  valLen: Uint<16>,
  valueHead: Bytes<188>
): [] {
  emit(Misc {
    name: tm_EVENT_NAME(),
    payload: Bytes[...domainSep, kind, ...key, valType, ...(valLen as Bytes<2>), ...valueHead]
  });
}
${multiPart ? `
circuit tm_emitPart(part: Bytes<256>): [] {
  emit(Misc { name: tm_EVENT_NAME(), payload: part });
}
` : ''}
circuit tm_emitTokenMetadata(
  domainSep: Bytes<32>,
  kind: Uint<8>,
  key: Bytes<32>,
  valType: Uint<8>,
  valLen: Uint<16>,
  value: Bytes<188>
): [] {
  assert(valLen <= tm_ONE_PART_VALUE_SIZE(),
         "TokenMetadata: a one-part value holds at most 188 bytes");
  tm_emitHead(domainSep, kind, key, valType, valLen, value);
}

// --- Public Interfaces (contracts/OffChainInterface.compact, Apache-2.0) ---

circuit oci_publishBundle(payload: Bytes<256>): [] {
  emit(Misc { name: pad(32, "mip-xxxx:public-interface[v1]"), payload: disclose(payload) });
}`;

/** OpenZeppelin NativeShieldedTokenCore + NativeShieldedToken + Utils (MIT), slots 2 = _domain, 3 = _isInitialized, 4-6 = name, symbol, decimals. */
const NATIVE_SHIELDED_CIRCUITS = `// --- OpenZeppelin Compact Contracts v0.4.0-alpha.3 (MIT, (c) Zeppelin Group Ltd):
// token/NativeShieldedTokenCore, token/NativeShieldedToken, utils/Utils — the circuits the
// published token circuits call ---

pure circuit oz_utils_isContractAddress(
  keyOrAddress: Either<ZswapCoinPublicKey, ContractAddress>
): Boolean {
  return !keyOrAddress.is_left;
}

pure circuit oz_utils_isKeyOrAddressZero(
  keyOrAddress: Either<ZswapCoinPublicKey, ContractAddress>
): Boolean {
  return oz_utils_isContractAddress(keyOrAddress)
           ? default<ContractAddress> == keyOrAddress.right
           : default<ZswapCoinPublicKey> == keyOrAddress.left;
}

circuit oz_core_assertInitialized(): [] {
  assert(hidden3, "NativeShieldedToken: contract not initialized");
}

circuit oz_core_name(): Opaque<"string"> {
  oz_core_assertInitialized();
  return hidden4;
}

circuit oz_core_symbol(): Opaque<"string"> {
  oz_core_assertInitialized();
  return hidden5;
}

circuit oz_core_decimals(): Uint<8> {
  oz_core_assertInitialized();
  return hidden6;
}

circuit oz_core_tokenColor(domain: Bytes<32>): Bytes<32> {
  oz_core_assertInitialized();
  return tokenType(disclose(domain), kernel.self());
}

circuit oz_core__mint(
  domain: Bytes<32>,
  recipient: Either<ZswapCoinPublicKey, ContractAddress>,
  amount: Uint<64>,
  nonce: Bytes<32>
): ShieldedCoinInfo {
  oz_core_assertInitialized();
  const self = kernel.self();
  assert(!oz_utils_isKeyOrAddressZero(recipient), "NativeShieldedToken: invalid recipient");
  assert(recipient.is_left || recipient.right == self, "NativeShieldedToken: recipient contract must be self");
  const coin = mintShieldedToken(disclose(domain), disclose(amount), disclose(nonce), disclose(recipient));
  if (disclose(!recipient.is_left)) {
    receiveShielded(coin);
  }
  return coin;
}

circuit oz_nst_name(): Opaque<"string"> {
  return oz_core_name();
}

circuit oz_nst_symbol(): Opaque<"string"> {
  return oz_core_symbol();
}

circuit oz_nst_decimals(): Uint<8> {
  return oz_core_decimals();
}

circuit oz_nst_tokenColor(): Bytes<32> {
  return oz_core_tokenColor(hidden2);
}

circuit oz_nst__mint(
  recipient: ZswapCoinPublicKey,
  amount: Uint<64>,
  nonce: Bytes<32>
): ShieldedCoinInfo {
  return oz_core__mint(
    hidden2,
    left<ZswapCoinPublicKey, ContractAddress>(recipient),
    amount,
    nonce
  );
}`;

const NATIVE_SHIELDED_READS = `export circuit name(): Opaque<"string"> {
  return oz_nst_name();
}

export circuit symbol(): Opaque<"string"> {
  return oz_nst_symbol();
}

export circuit decimals(): Uint<8> {
  return oz_nst_decimals();
}

/** The domain separator this contract mints and describes under. */
export circuit domainSep(): Bytes<32> {
  return hidden2;
}

/** The token's colour: \`tokenType(domainSep, this contract)\`. */
export circuit tokenColor(): Bytes<32> {
  return oz_nst_tokenColor();
}`;

/** OpenZeppelin FungibleToken + Utils (MIT); slots 2 = _isInitialized, 3 = _balances, 4 = _allowances, 5 = _totalSupply, 6-8 = name, symbol, decimals. */
const FUNGIBLE_CIRCUITS = `// --- OpenZeppelin Compact Contracts v0.4.0-alpha.3 (MIT, (c) Zeppelin Group Ltd):
// token/FungibleToken, utils/Utils — the circuits the published token circuits call ---

pure circuit oz_utils_canonicalize<T1, T2>(
  value: Either<T1, T2>
): Either<T1, T2> {
  return value.is_left
    ? Either<T1, T2>{ is_left: true, left: value.left, right: default<T2> }
    : Either<T1, T2>{ is_left: false, left: default<T1>, right: value.right };
}

pure circuit oz_utils_zeroAccount(): Either<Bytes<32>, ContractAddress> {
  return Either<Bytes<32>, ContractAddress> {
    is_left: true, left: default<Bytes<32>>, right: default<ContractAddress>
  };
}

pure circuit oz_utils_isTargetZero(target: Either<Bytes<32>, ContractAddress>): Boolean {
  if (target.is_left) {
    return target.left == default<Bytes<32>>;
  } else {
    return target.right == default<ContractAddress>;
  }
}

pure circuit oz_utils_computeAccountId(secretKey: Bytes<32>): Bytes<32> {
  return persistentHash<Vector<1, Bytes<32>>>([secretKey]);
}

circuit oz_ft_assertInitialized(): [] {
  assert(hidden2, "FungibleToken: contract not initialized");
}

circuit oz_ft_name(): Opaque<"string"> {
  oz_ft_assertInitialized();
  return hidden6;
}

circuit oz_ft_symbol(): Opaque<"string"> {
  oz_ft_assertInitialized();
  return hidden7;
}

circuit oz_ft_decimals(): Uint<8> {
  oz_ft_assertInitialized();
  return hidden8;
}

circuit oz_ft_totalSupply(): Uint<128> {
  oz_ft_assertInitialized();
  return hidden5;
}

circuit oz_ft_balanceOf(account: Either<Bytes<32>, ContractAddress>): Uint<128> {
  oz_ft_assertInitialized();
  const canonAcct = oz_utils_canonicalize<Bytes<32>, ContractAddress>(account);
  if (!hidden3.member(disclose(canonAcct))) {
    return 0;
  }
  return hidden3.lookup(disclose(canonAcct));
}

circuit oz_ft__computeAccountId(): Bytes<32> {
  return oz_utils_computeAccountId(wit_FungibleTokenSK());
}

circuit oz_ft__update(fromAddress: Either<Bytes<32>, ContractAddress>,
                      to: Either<Bytes<32>, ContractAddress>,
                      value: Uint<128>
                      ): [] {
  oz_ft_assertInitialized();
  const canonFrom = oz_utils_canonicalize<Bytes<32>, ContractAddress>(fromAddress);
  const canonTo = oz_utils_canonicalize<Bytes<32>, ContractAddress>(to);
  if (oz_utils_isTargetZero(disclose(canonFrom))) {
    const MAX_UINT128 = 340282366920938463463374607431768211455;
    assert(MAX_UINT128 - hidden5 >= value, "FungibleToken: arithmetic overflow");
    hidden5 = disclose(hidden5 + value as Uint<128>);
  } else {
    const fromBal = oz_ft_balanceOf(canonFrom);
    assert(fromBal >= value, "FungibleToken: insufficient balance");
    hidden3.insert(disclose(canonFrom), disclose(fromBal - value as Uint<128>));
  }
  if (oz_utils_isTargetZero(disclose(canonTo))) {
    hidden5 = disclose(hidden5 - value as Uint<128>);
  } else {
    const toBal = oz_ft_balanceOf(canonTo);
    hidden3.insert(disclose(canonTo), disclose(toBal + value as Uint<128>));
  }
}

circuit oz_ft__unsafeUncheckedTransfer(
  fromAddress: Either<Bytes<32>, ContractAddress>,
  to: Either<Bytes<32>, ContractAddress>,
  value: Uint<128>
): [] {
  oz_ft_assertInitialized();
  assert(!oz_utils_isTargetZero(fromAddress), "FungibleToken: invalid sender");
  assert(!oz_utils_isTargetZero(to), "FungibleToken: invalid receiver");
  oz_ft__update(fromAddress, to, value);
}

circuit oz_ft__unsafeTransfer(
  to: Either<Bytes<32>, ContractAddress>,
  value: Uint<128>
): Boolean {
  oz_ft_assertInitialized();
  const owner = left<Bytes<32>, ContractAddress>(oz_ft__computeAccountId());
  oz_ft__unsafeUncheckedTransfer(owner, to, value);
  return true;
}

circuit oz_ft_transfer(
  to: Either<Bytes<32>, ContractAddress>,
  value: Uint<128>
): Boolean {
  oz_ft_assertInitialized();
  const isContractAddr = !to.is_left;
  assert(!isContractAddr, "FungibleToken: unsafe transfer");
  return oz_ft__unsafeTransfer(to, value);
}

circuit oz_ft__unsafeMint(
  account: Either<Bytes<32>, ContractAddress>,
  value: Uint<128>
): [] {
  oz_ft_assertInitialized();
  assert(!oz_utils_isTargetZero(account), "FungibleToken: invalid receiver");
  oz_ft__update(oz_utils_zeroAccount(), account, value);
}

circuit oz_ft__mint(account: Either<Bytes<32>, ContractAddress>, value: Uint<128>): [] {
  oz_ft_assertInitialized();
  const isContractAddr = !account.is_left;
  assert(!isContractAddr, "FungibleToken: unsafe transfer");
  oz_ft__unsafeMint(account, value);
}`;

const tokenSection = (template: Template): string => {
  switch (template) {
    case 'NativeShieldedToken':
      return `${NATIVE_SHIELDED_CIRCUITS}

// --- the published token circuits ---

${NATIVE_SHIELDED_READS}

/** Mints \`amount\` to \`recipient\`, a Zswap coin public key. */
export circuit mint(recipient: ZswapCoinPublicKey, amount: Uint<64>, nonce: Bytes<32>): ShieldedCoinInfo {
  return oz_nst__mint(disclose(recipient), disclose(amount), disclose(nonce));
}`;
    case 'NativeDualToken':
      return `${NATIVE_SHIELDED_CIRCUITS}

// --- the published token circuits ---

${NATIVE_SHIELDED_READS}

/** Mints the shielded half (kind byte 1) to \`recipient\`, a Zswap coin public key. */
export circuit mintShielded(recipient: ZswapCoinPublicKey, amount: Uint<64>, nonce: Bytes<32>): ShieldedCoinInfo {
  return oz_nst__mint(disclose(recipient), disclose(amount), disclose(nonce));
}

/** Mints the unshielded half (kind byte 0), same domain separator, same colour, as an unshielded UTxO. */
export circuit mintUnshielded(recipient: Either<ContractAddress, UserAddress>, amount: Uint<64>): Bytes<32> {
  assert(amount > 0, "amount must be positive");
  return mintUnshieldedToken(hidden2, disclose(amount), disclose(recipient));
}`;
    case 'FungibleToken':
      return `${FUNGIBLE_CIRCUITS}

// --- the published token circuits ---

export circuit name(): Opaque<"string"> {
  return oz_ft_name();
}

export circuit symbol(): Opaque<"string"> {
  return oz_ft_symbol();
}

export circuit decimals(): Uint<8> {
  return oz_ft_decimals();
}

export circuit totalSupply(): Uint<128> {
  return oz_ft_totalSupply();
}

export circuit balanceOf(account: Either<Bytes<32>, ContractAddress>): Uint<128> {
  return oz_ft_balanceOf(account);
}

/** Moves \`value\` from the caller's account (derived from the \`wit_FungibleTokenSK\` witness) to \`to\`. */
export circuit transfer(to: Either<Bytes<32>, ContractAddress>, value: Uint<128>): Boolean {
  return oz_ft_transfer(disclose(to), disclose(value));
}

/** Credits \`value\` to \`account\` in contract state. */
export circuit mint(account: Either<Bytes<32>, ContractAddress>, value: Uint<128>): [] {
  oz_ft__mint(disclose(account), disclose(value));
}`;
    case 'NativeUnshieldedToken':
      return `// --- the published token circuits (this repository's own native unshielded template) ---

export circuit name(): Opaque<"string"> {
  return hidden2;
}

export circuit symbol(): Opaque<"string"> {
  return hidden3;
}

export circuit decimals(): Uint<8> {
  return hidden4;
}

/** The domain separator this contract mints and describes under. */
export circuit domainSep(): Bytes<32> {
  return hidden5;
}

/** The token's colour: \`tokenType(domainSep, this contract)\`. */
export circuit tokenColor(): Bytes<32> {
  return tokenType(hidden5, kernel.self());
}

export circuit mints(): Uint<64> {
  return hidden6.read() as Uint<64>;
}

/** Mints \`amount\` of this token to \`recipient\` as an unshielded UTxO. */
export circuit mint(recipient: Either<ContractAddress, UserAddress>, amount: Uint<64>): Bytes<32> {
  assert(amount > 0, "amount must be positive");
  hidden6.increment(1);
  return mintUnshieldedToken(hidden5, disclose(amount), disclose(recipient));
}`;
  }
};

/** The HIDDEN interface source of one DU contract. */
export function interfaceSource(v: Variant, planned: PlannedStep[]): string {
  const template = v.du.template;
  const slots = LEDGER[template];
  const declarations = planned.flatMap((s) => (s.kind === 'emit' ? [s] : []));
  const multiPart = declarations.some((s) => s.declaration.parts > 1);
  const pure = template === 'NativeDualToken' ? '`kinds()`' : '`kind()`';
  const oz = OZ_MODULES[template];
  const witnesses = WITNESSES[template];
  const published = [...(template === 'FungibleToken'
    ? ['name', 'symbol', 'decimals', 'totalSupply', 'balanceOf', 'transfer', 'mint']
    : template === 'NativeUnshieldedToken'
      ? ['name', 'symbol', 'decimals', 'domainSep', 'tokenColor', 'mints', 'mint']
      : template === 'NativeDualToken'
        ? ['name', 'symbol', 'decimals', 'domainSep', 'tokenColor', 'mintShielded', 'mintUnshielded']
        : ['name', 'symbol', 'decimals', 'domainSep', 'tokenColor', 'mint']), ...declarations.map((s) => s.circuit), 'publishBundle'];
  return `// SPDX-License-Identifier: Apache-2.0 AND MIT
//
// GENERATED FILE — do not edit. Produced by scripts/generate-du-contracts.ts (scripts/du-interfaces.ts).
//
// The PUBLIC INTERFACE of ${v.id} (${v.name}), HIDDEN: the private form of the Public
// Interfaces draft; form and header adapted from its MIT example compact-examples/fungible-private/Interface.compact.
// The deployed contract is contracts/generated/${v.id}.compact.
//
// WHAT IS HIDDEN, AND WHAT IS NOT
//
// This file imports no module. It declares the deployed contract's ledger itself: ${slots.length}
// fields, in the deployed order and with the deployed types, named hidden1 to hidden${slots.length}. A
// verifier key depends on a circuit's logic and on the positions and types of the ledger
// slots it touches, not on any name, so the circuits below compile to the keys the
// contract deployed.
//
// Published: EVERY impure circuit of ${v.id} (spec 00024 Q9), under its deployed entry point
// name, with its code — ${published.length} circuits: ${published.join(', ')}.
// The module circuits they call are written out below as local circuits (each body as in
// its module; only the ledger names differ). The emitting circuits (every MIP-0018
// declaration and publishBundle) take the emitter secret, a witness: a consumer verifies
// them at Levels 1-3 but cannot execute them.
//
// Hidden: the contract's source as written (its module structure and imports), its
// constructor, the original ledger field names, and its pure circuit ${pure} (a constant; it
// has no verifier key, so it cannot be verified and is not published).
//
// Still visible, here or on chain: the ledger's shape (${slots.length} fields, their positions and
// types) and its values, every entry point name, every verifier key, and the witnesses the
// published circuits take (${witnesses.join(', ')}).
//
// Code adapted from: contracts/TokenMetadata.compact (the MIP-0018 module, Apache-2.0),
// contracts/OffChainInterface.compact (the Public Interfaces module, Apache-2.0)${oz.length === 0 ? '' : `, and
// OpenZeppelin Compact Contracts v0.4.0-alpha.3 (MIT, (c) Zeppelin Group Ltd):
// ${oz.map((m) => `${m}.compact`).join(', ')}`} — see the bundle's NOTICE and SOURCE.md.

pragma language_version >= 0.26.0;

import CompactStandardLibrary;

export { ${EXPORTS[template]} };

// The deployed ledger, slot by slot. Not exported: nothing reads it by name.
${slots.map((s, i) => `${s.sealed ? 'sealed ' : ''}ledger hidden${i + 1}: ${s.type};`).join('\n')}

${witnesses.map((w) => `witness ${w}(): Bytes<32>;`).join('\n')}

${tokenMetadataCircuits(multiPart)}

${tokenSection(template)}

// --- the published MIP-0018 declarations (each ONE package; every byte a literal) ---

${declarations.map((s) => `${declarationDoc(s.declaration, s.sourceOp)}
export circuit ${s.circuit}(): [] {
  tm_assertEmitter();
${declarationBody(s.declaration, 'tm_')}
}`).join('\n\n')}

// --- the published Public Interfaces circuit ---

/** Emits ONE 256-byte part of this contract's interface pointer (\`mip-xxxx:public-interface[v1]\`). Emitter only. */
export circuit publishBundle(payload: Bytes<256>): [] {
  tm_assertEmitter();
  oci_publishBundle(payload);
}
`;
}
