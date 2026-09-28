/**
 * P4 of spec 00024 §9.2 (sub-plan 03-A3): ONE transaction whose ONE guaranteed intent holds a
 * MIP-0018 package AND a public-interface package of the SAME dual contract — equal
 * transaction, address and physical segment, distinct event names. A reader groups by
 * {address, event name, block, transaction, segment} ([Y] §4), so it must read TWO packages,
 * each processed by its own protocol; a reader that forgot the name in its grouping key would
 * merge them into one.
 *
 * How: the contract's circuits run locally, one after the other, against ONE pinned block and
 * contract state (valid because neither writes ledger state: a declaration circuit and
 * `publishBundle` each read the emitter-secret commitment and emit), and all their calls go
 * into ONE intent through the Multi-Part Event reference publisher's `addGuaranteedIntent`
 * (vendor/compact-multi-part-event, `addCalls({ tag: "guaranteedOnly" }, …)`, redrawn on
 * segment 0 or a taken segment) with an arbitrary call array — the mechanism the publisher
 * uses for one package's parts (02-B3/B4), here with two circuits and two event names.
 *
 * The publisher's own package guard (`assertTransactionPackages`) allows exactly one package
 * per intent, so it cannot vouch for this transaction; `assertDualIntent` below is the P4
 * check instead — the same rules per call (a contract call to this address and entry point,
 * guaranteed transcript only, exactly the expected `Misc` events), for a MIXED call list —
 * and the on-chain path runs it at every stage through the publisher's generic
 * `finalizeTransaction` / `submitSavedTransaction` (scripts/publish-dual-intent.ts).
 */
import { type CallProofData, type CircuitContext, ContractState as RuntimeContractState, createCircuitContext } from '@midnight-ntwrk/compact-runtime';
import * as ledger from '@midnightntwrk/ledger-v9';

import {
  addGuaranteedIntent,
  canonicalKeyLocation,
  DEFAULT_MAX_ASSEMBLY_ATTEMPTS,
  DEFAULT_TTL_SECONDS,
  PackageCheckError,
  type PinnedBlock,
  prePartitionCallFor,
  type PublicationStateSource,
} from '../vendor/compact-multi-part-event/src/publisher/index.js';
import {
  type AnyTransaction,
  bytesEqual,
  decodeMiscValue,
  entryPointText,
  eventName,
  eventValue,
  loggedEvents,
  MISC_EVENT_TYPE_CODE,
} from '../vendor/compact-multi-part-event/src/reader/index.js';

/** The runtime's event type of a `Misc` log event (compact-runtime's simulated events). */
const MISC = 'misc';

/** One call of the intent and the events it must emit, in order. */
export interface DualIntentCall {
  /** The circuit (entry point) — e.g. `publishRepository`, `publishBundle`. */
  readonly circuit: string;
  /** Its arguments after the context (a declaration circuit takes none; `publishBundle` one 256-byte part). */
  readonly args: readonly unknown[];
  /** The event name every event of this call carries (32 bytes are derived from it). */
  readonly name: string;
  /** The 256-byte payload of each event the call must emit, in order. */
  readonly payloads: readonly Uint8Array[];
}

/** The generated contract instance's structural part the builder uses. */
export interface ContractWithCircuits<PS> {
  readonly impureCircuits: Record<string, (context: CircuitContext<PS>, ...args: unknown[]) => Promise<{ context: { callProofDataTrace: CallProofData[]; events: unknown[] } }>>;
}

export interface DualIntentRequest<PS> {
  /** The contract address, 64 lowercase hex characters. */
  readonly address: string;
  readonly contract: ContractWithCircuits<PS>;
  /** Fresh private state for each call (it answers the emitter-secret witness). */
  readonly createPrivateState: () => PS;
  /** The calls, in intent order. */
  readonly calls: readonly DualIntentCall[];
}

export interface DualIntentConfig {
  readonly network: string;
  readonly coinPublicKey: string;
  readonly ttlSeconds?: number;
  readonly maxAssemblyAttempts?: number;
}

/** What the P4 check expects of the intent. */
export interface ExpectedDualIntent {
  readonly contract: string;
  readonly segment: number;
  readonly calls: readonly { readonly entryPoint: string; readonly name: string; readonly payloads: readonly Uint8Array[] }[];
}

export interface BuiltDualIntent {
  readonly transaction: ledger.UnprovenTransaction;
  readonly expected: ExpectedDualIntent;
  readonly block: PinnedBlock;
  readonly ledgerParameters: ledger.LedgerParameters;
  readonly ttl: Date;
  readonly attempts: number;
}

/**
 * The P4 check: the intent at `expected.segment` holds exactly the expected calls, in order —
 * each a contract call to `expected.contract` and its entry point, with a guaranteed
 * transcript, no fallible transcript, logging exactly its expected `Misc` events (name and
 * payload) — and no unshielded offer, DUST action or fallible Zswap offer in that intent or
 * segment. Other intents (balancing) are not looked at.
 *
 * @throws {PackageCheckError} On the first violated rule, naming the stage.
 */
export const assertDualIntent = (tx: AnyTransaction, expected: ExpectedDualIntent, stage: string): void => {
  const fail = (detail: string): never => {
    throw new PackageCheckError(stage, `P4 intent: ${detail}`);
  };
  const intent = tx.intents?.get(expected.segment);
  if (intent === undefined) return fail(`no intent at segment ${expected.segment}`);
  if (intent.actions.length !== expected.calls.length) fail(`${intent.actions.length} actions, expected ${expected.calls.length}`);
  intent.actions.forEach((action, index) => {
    const call = expected.calls[index]!;
    const label = `call ${index + 1} (${call.entryPoint})`;
    if (!(action instanceof ledger.ContractCall)) return fail(`${label} is not a contract call`);
    if (action.address !== expected.contract) fail(`${label} targets another contract`);
    if (entryPointText(action.entryPoint) !== call.entryPoint) fail(`${label} uses entry point ${entryPointText(action.entryPoint)}`);
    if (action.fallibleTranscript !== undefined) fail(`${label} has a fallible transcript`);
    const guaranteed = action.guaranteedTranscript;
    if (guaranteed === undefined) return fail(`${label} has no guaranteed transcript`);
    const events = loggedEvents(guaranteed.program);
    if (events.length !== call.payloads.length) fail(`${label} logs ${events.length} events, expected ${call.payloads.length}`);
    events.forEach((event, k) => {
      if (event.typeCode !== MISC_EVENT_TYPE_CODE) fail(`${label} event ${k + 1} is not a Misc event`);
      if (!bytesEqual(decodeMiscValue(event.data), eventValue(eventName(call.name), call.payloads[k]!))) fail(`${label} event ${k + 1} is not ${call.name} with the expected payload`);
    });
  });
  if (intent.guaranteedUnshieldedOffer !== undefined || intent.fallibleUnshieldedOffer !== undefined) fail('the intent carries an unshielded offer');
  if (intent.dustActions !== undefined) fail('the intent carries DUST actions');
  if (tx.fallibleOffer?.get(expected.segment) !== undefined) fail('the segment carries a fallible Zswap offer');
};

/** The calls executed against one pinned state, ready to be put into intents. */
export interface ExecutedCalls {
  readonly block: PinnedBlock;
  readonly ledgerParameters: ledger.LedgerParameters;
  readonly ttl: Date;
  readonly ledgerState: ledger.ContractState;
  readonly traces: readonly CallProofData[];
  /** The key location of each call (the canonical `contract:<address>/<entryPoint>?vk=…`). */
  readonly locations: readonly string[];
}

/**
 * Read one latest block and the contract's state and ledger parameters at it, then run every
 * call against that pinned state (block time in seconds) and check each call's execution: one
 * trace, no cross-contract call, no Zswap, exactly its expected events.
 *
 * @throws {Error | PackageCheckError} E.g. a caller without the emitter secret fails while
 * executing ("caller is not the emitter").
 */
export async function executeCalls<PS>(
  source: PublicationStateSource,
  config: DualIntentConfig,
  request: DualIntentRequest<PS>,
): Promise<ExecutedCalls> {
  if (!/^[0-9a-f]{64}$/.test(request.address)) throw new RangeError('address must be 64 lowercase hex characters');
  const block = await source.latestBlock();
  const snapshot = await source.contractStateAt(request.address, block.hash);
  const stateBytes = snapshot.contractState.serialize();
  const runtimeState = RuntimeContractState.deserialize(stateBytes);
  const ledgerState = ledger.ContractState.deserialize(stateBytes);
  const ttl = new Date((block.timestampSeconds + (config.ttlSeconds ?? DEFAULT_TTL_SECONDS)) * 1000);

  const traces: CallProofData[] = [];
  const locations: string[] = [];
  for (const [index, call] of request.calls.entries()) {
    const label = `call ${index + 1} (${call.circuit})`;
    const circuit = request.contract.impureCircuits[call.circuit];
    if (circuit === undefined) throw new Error(`${label}: the contract has no impure circuit ${call.circuit}`);
    const verifierKey = ledgerState.operation(call.circuit)?.verifierKey;
    if (verifierKey === undefined || verifierKey.byteLength === 0) throw new Error(`${label}: the contract state has no verifier key for ${call.circuit}`);
    const context = createCircuitContext(
      call.circuit, request.address, config.coinPublicKey, runtimeState, request.createPrivateState(),
      undefined, undefined, undefined, block.timestampSeconds, block.hash,
    ) as CircuitContext<PS>;
    const result = await circuit(context, ...call.args);
    const trace = result.context.callProofDataTrace;
    if (trace.length !== 1 || trace[0] === undefined) throw new PackageCheckError('execution', `${label}: ${trace.length} call traces, expected 1`);
    if (trace[0].contractAddress !== request.address || trace[0].circuitId !== call.circuit) throw new PackageCheckError('execution', `${label}: the trace targets another contract or circuit`);
    if (trace[0].commCommData !== undefined) throw new PackageCheckError('execution', `${label}: a cross-contract call`);
    const zswap = trace[0].zswapLocalState as { inputs?: readonly unknown[]; outputs?: readonly unknown[] };
    if ((zswap.inputs?.length ?? 0) > 0 || (zswap.outputs?.length ?? 0) > 0) throw new PackageCheckError('execution', `${label}: touched shielded coins`);
    const events = result.context.events as { address: string; eventType: string; data: ledger.EncodedStateValue }[];
    if (events.length !== call.payloads.length) throw new PackageCheckError('execution', `${label}: ${events.length} events, expected ${call.payloads.length}`);
    events.forEach((event, k) => {
      if (event.address !== request.address || event.eventType !== MISC) throw new PackageCheckError('execution', `${label}: event ${k + 1} is not a Misc event of the contract`);
      if (!bytesEqual(decodeMiscValue(event.data), eventValue(eventName(call.name), call.payloads[k]!))) throw new PackageCheckError('execution', `${label}: event ${k + 1} differs from the expected ${call.name} payload`);
    });
    traces.push(trace[0]);
    locations.push(canonicalKeyLocation({ address: request.address, entryPoint: call.circuit, verifierKey }));
  }
  return { block, ledgerParameters: snapshot.ledgerParameters, ttl, ledgerState, traces, locations };
}

/**
 * Build the unproven P4 transaction: {@link executeCalls}, then put ALL the calls into ONE
 * guaranteed-only intent (`addGuaranteedIntent` with the whole call array) and run the P4
 * check. A request needs at least two calls and two event names.
 *
 * @throws {Error | PackageCheckError} Before any proof exists.
 */
export async function buildDualIntentTransaction<PS>(
  source: PublicationStateSource,
  config: DualIntentConfig,
  request: DualIntentRequest<PS>,
): Promise<BuiltDualIntent> {
  if (request.calls.length < 2) throw new RangeError('a P4 intent holds at least two calls');
  if (new Set(request.calls.map((c) => c.name)).size < 2) throw new RangeError('a P4 intent holds packages of at least two event names');
  const executed = await executeCalls(source, config, request);
  const added = addGuaranteedIntent(
    ledger.Transaction.fromPartsRandomized(config.network),
    () => executed.traces.map((trace, i) => prePartitionCallFor(trace, executed.ledgerState, executed.locations[i]!)),
    executed.ledgerParameters,
    executed.ttl,
    config.maxAssemblyAttempts ?? DEFAULT_MAX_ASSEMBLY_ATTEMPTS,
  );
  const expected: ExpectedDualIntent = {
    contract: request.address,
    segment: added.segment,
    calls: request.calls.map((c) => ({ entryPoint: c.circuit, name: c.name, payloads: c.payloads.map((p) => Uint8Array.from(p)) })),
  };
  if ([...(added.transaction.intents?.keys() ?? [])].length !== 1) throw new PackageCheckError('after assembly', 'P4 intent: the transaction has more than one intent');
  assertDualIntent(added.transaction, expected, 'after assembly');
  return { transaction: added.transaction, expected, block: executed.block, ledgerParameters: executed.ledgerParameters, ttl: executed.ttl, attempts: added.attempts };
}
