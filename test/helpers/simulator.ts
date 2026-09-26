// SPDX-License-Identifier: Apache-2.0
//
// The Compact simulator harness this repository's contract tests share: deploy a compiled
// contract in memory (compact-runtime 0.19.0), call its circuits one at a time with the
// state threaded forward as a chain would, and read every `misc` log event back as its
// 32-byte name and 256-byte payload. Adapted from acedward/mip-0018-midnight-contracts
// `test/token-metadata.ts` @ cb6c675 (Apache-2.0), the harness of the MIP-18 set.
import { createHash } from 'node:crypto';
import { createCircuitContext, createConstructorContext, sampleContractAddress } from '@midnight-ntwrk/compact-runtime';

/** `Misc { name: Bytes<32>, payload: Bytes<256> }` — 288 bytes serialized. */
export const MISC_EVENT_SIZE = 288;
export const PART_SIZE = 256;
export const TOKEN_METADATA_EVENT = 'mip-0018:token-metadata[v1]';
export const PUBLIC_INTERFACE_EVENT = 'mip-xxxx:public-interface[v1]';
export const ZERO_COIN_PK = '0'.repeat(64);

/** Compact's `pad(n, "text")`: UTF-8 bytes, NUL-padded on the right. */
export function pad(n: number, text: string): Uint8Array {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > n) throw new Error(`"${text}" does not fit in ${n} bytes`);
  const out = new Uint8Array(n);
  out.set(bytes);
  return out;
}

export const hex = (bytes: Uint8Array): string => Buffer.from(bytes).toString('hex');
export const unhex = (text: string): Uint8Array => Uint8Array.from(Buffer.from(text, 'hex'));

/** Drops trailing NULs and decodes as UTF-8. */
export function unpad(bytes: Uint8Array): string {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end -= 1;
  return new TextDecoder().decode(bytes.subarray(0, end));
}

/**
 * `TM_emitterSecretHashOf(secret)` off chain: `persistentHash<Vector<2, Bytes<32>>>(
 * [pad(32, "mip-0018:emitter:"), secret])` — SHA-256 over the 64 concatenated bytes. The
 * constructor argument of every contract here (none exports the pure circuit: a FULL
 * interface publishes impure circuits only).
 */
export function emitterSecretHashOf(secret: Uint8Array): Uint8Array {
  if (secret.length !== 32) throw new Error('the emitter secret is 32 bytes');
  return Uint8Array.from(createHash('sha256').update(pad(32, 'mip-0018:emitter:')).update(secret).digest());
}

/** Fixed PUBLIC TEST secrets (never real ones): the emitter's and a stranger's. */
export const TEST_EMITTER_SECRET = new Uint8Array(32).fill(0x42);
export const STRANGER_EMITTER_SECRET = new Uint8Array(32).fill(0x24);

/** Private state answering every witness the PI contracts declare. */
export interface PiPrivateState {
  emitterSecret: Uint8Array;
  /** OpenZeppelin FungibleToken's account secret key (LSUNPI only). */
  fungibleSk: Uint8Array;
}

export const piWitnesses = {
  emitterSecret: ({ privateState }: { privateState: PiPrivateState }): [PiPrivateState, Uint8Array] => [privateState, privateState.emitterSecret],
  wit_FungibleTokenSK: ({ privateState }: { privateState: PiPrivateState }): [PiPrivateState, Uint8Array] => [privateState, privateState.fungibleSk],
};

type RawLogEvent = {
  eventType: string;
  address: string;
  data: { tag: string; content: { value: Uint8Array[] } };
};

/** One `misc` log event's name and 256-byte payload (the runtime trims trailing NULs; zero-extend). */
export function miscParts(event: unknown): { eventName: string; nameHex: string; payload: Uint8Array } {
  const e = event as RawLogEvent;
  if (e.eventType !== 'misc') throw new Error(`not a misc event: ${e.eventType}`);
  if (e.data.tag !== 'cell' || e.data.content.value.length !== 1) throw new Error('unexpected misc log value');
  const trimmed = e.data.content.value[0] ?? new Uint8Array();
  if (trimmed.length > MISC_EVENT_SIZE) throw new Error(`misc event is ${trimmed.length} bytes`);
  const bytes = new Uint8Array(MISC_EVENT_SIZE);
  bytes.set(trimmed);
  return { eventName: unpad(bytes.subarray(0, 32)), nameHex: hex(bytes.subarray(0, 32)), payload: bytes.slice(32) };
}

export interface Call {
  result: unknown;
  events: { eventName: string; nameHex: string; payload: Uint8Array }[];
  effects: any;
}

export interface CompiledContract<PS> {
  initialState(context: unknown, ...args: unknown[]): Promise<{ currentContractState: { data: unknown }; currentPrivateState: PS }> | { currentContractState: { data: unknown }; currentPrivateState: PS };
  impureCircuits: Record<string, (context: any, ...args: unknown[]) => Promise<any> | any>;
}

/** Deploy in memory; `call` runs one circuit and commits its state, like a block would. */
export async function deploy<PS>(
  contract: CompiledContract<PS>,
  privateState: PS,
  constructorArgs: unknown[],
  options: { coinPublicKey?: string; address?: string } = {},
) {
  const coinPublicKey = options.coinPublicKey ?? ZERO_COIN_PK;
  const address = options.address ?? sampleContractAddress();
  const init = await contract.initialState(createConstructorContext(privateState, coinPublicKey), ...constructorArgs);
  let state: unknown = init.currentContractState.data;
  let currentPrivateState: PS = init.currentPrivateState;
  return {
    address,
    get state() { return state; },
    async call(circuitId: string, ...args: unknown[]): Promise<Call> {
      const circuit = contract.impureCircuits[circuitId];
      if (!circuit) throw new Error(`no such impure circuit: ${circuitId}`);
      const context = createCircuitContext(circuitId, address, coinPublicKey, state as never, currentPrivateState);
      const results = await circuit(context, ...args);
      state = results.context.callContext.currentQueryContext.state;
      currentPrivateState = results.context.callContext.currentPrivateState ?? currentPrivateState;
      return {
        result: results.result,
        events: (results.context.events as unknown[]).map(miscParts),
        effects: results.context.callContext.currentQueryContext.effects,
      };
    },
  };
}
