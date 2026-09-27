/**
 * Staged deployment (spec 00024 Q20 (a)): a contract whose deploy does not fit one block is
 * deployed with the verifier keys that fit, and every other key is added afterwards by the
 * contract's maintenance authority, one `VerifierKeyInsert` maintenance transaction per key.
 *
 * Why it is needed: a deploy writes the whole initial contract state, including one verifier
 * key (~2.1 KB at k=13) per impure circuit, and a block of the ledger's default parameters
 * allows 50 000 bytes written. The MIP-18 set keeps ONE literal circuit per declaration
 * (UC-1), so the collection CNST18 has 39 impure circuits — a 95 148-byte deploy.
 *
 * How (midnight-js 5.0.0-beta.7 / compact-js 2.5.5-rc.8): compact-js attaches a key to EVERY
 * circuit at initialization (`ContractExecutable.initialize`), so the deploy midnight-js
 * builds always carries all of them. `stagedDeployTx` takes that deploy's initial state and
 * builds a fresh ledger `ContractState` with the same data, maintenance authority and balance
 * but only the chosen operations, then a `ContractDeploy` of it — the same construction as
 * midnight-js's own `createUnprovenLedgerDeployTx`. The keys are added afterwards with
 * midnight-js's `submitInsertVerifierKeyTx` (compact-js `addOrReplaceContractOperation`: a
 * `MaintenanceUpdate` signed by the maintenance key), as the Public Interfaces live example
 * does on Stagenet for `transfer` / `approve` / `transferFrom`.
 *
 * The maintenance key is generated here (`sampleSigningKey()`, what midnight-js would sample)
 * and kept in a mode-600 file, because it is the only thing that can add the remaining keys.
 */
import { existsSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { sampleSigningKey, type SigningKey } from '@midnight-ntwrk/compact-runtime';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  ContractDeploy,
  ContractState,
  Intent,
  LedgerParameters,
  Transaction,
  type NormalizedCost,
  type SyntheticCost,
  type UnprovenOffer,
  type UnprovenTransaction,
} from '@midnightntwrk/ledger-v9';
import { readSecretFile } from './profile.js';

/**
 * The share of the ledger's block limits a staged deploy may use in every cost dimension,
 * before the wallet balances it.
 *
 * Not 1.0: the node weighs a Midnight transaction as its LARGEST normalized ledger cost times
 * the block's maximum weight, plus a fixed 1 % (midnight-node 2.0.0-rc.4
 * `ledger/src/versions/common/mod.rs` `get_transaction_cost` / `scale_normalized_cost`,
 * `pallets/midnight/src/lib.rs` `get_tx_weight`), and one normal extrinsic may weigh at most
 * 75 % of a block (`runtime/src/lib.rs` `NORMAL_DISPATCH_RATIO`) minus the 10 % FRAME reserves
 * for block initialization (`frame_system::limits::BlockWeights::with_sensible_defaults`,
 * polkadot-sdk `polkadot-stable2603`) minus the base extrinsic weight. So a transaction above
 * about 0.64 of the ledger's block limits is refused with `1010: Invalid Transaction:
 * Transaction would exhaust the block limits` (measured on the local chain: CNST18 deploys at
 * 0.899 and 0.695 refused; DAUR18's deploy at 0.583 included). 0.6 leaves room for the DUST
 * spend balancing adds (~220 bytes written). `MN_STAGED_DEPLOY_BUDGET` overrides it.
 */
export const STAGED_DEPLOY_BLOCK_BUDGET = Number(process.env.MN_STAGED_DEPLOY_BUDGET?.trim() || 0.6);
if (!(STAGED_DEPLOY_BLOCK_BUDGET > 0 && STAGED_DEPLOY_BLOCK_BUDGET <= 1)) {
  throw new Error(`MN_STAGED_DEPLOY_BUDGET must be in (0, 1], got ${process.env.MN_STAGED_DEPLOY_BUDGET}`);
}

/** How much of a block a transaction takes, per dimension; `undefined` when it exceeds one. */
export function blockShare(tx: { cost(params: LedgerParameters): SyntheticCost }, params: LedgerParameters): {
  cost: SyntheticCost;
  share: NormalizedCost | undefined;
} {
  const cost = tx.cost(params);
  try {
    return { cost, share: params.normalizeFullness(cost) };
  } catch {
    // The ledger refuses to normalize a cost beyond the block limits ("exceeded block limits").
    return { cost, share: undefined };
  }
}

/** True when every dimension of `share` is at most `budget` of a block. */
export const withinBudget = (share: NormalizedCost | undefined, budget = STAGED_DEPLOY_BLOCK_BUDGET): boolean =>
  share !== undefined && Object.values(share).every((fraction) => fraction <= budget);

/**
 * The order in which a staged deploy takes circuits: the ones the deployment calls, in the
 * order it first calls them, then every other provable circuit in the given order. Unknown
 * names in `callOrder` (a mint of another contract, say) are ignored.
 */
export function stagingOrder(provable: readonly string[], callOrder: readonly string[]): string[] {
  const known = new Set(provable);
  const order: string[] = [];
  for (const circuit of [...callOrder, ...provable]) {
    if (known.has(circuit) && !order.includes(circuit)) order.push(circuit);
  }
  return order;
}

/**
 * The longest prefix of `order` that `fits` (cost grows with every operation added, so the
 * first prefix that does not fit ends the search). At least one operation must fit.
 */
export function longestFittingPrefix(
  order: readonly string[],
  fits: (subset: readonly string[]) => boolean,
): { deployed: string[]; inserted: string[] } {
  let n = 0;
  while (n < order.length && fits(order.slice(0, n + 1))) n += 1;
  if (n === 0) throw new Error(`not even one circuit (${order[0] ?? 'none'}) fits a staged deploy`);
  return { deployed: order.slice(0, n), inserted: order.slice(n) };
}

/** A ledger `ContractState` equal to `full` but holding only the operations in `keep`. */
export function subsetContractState(full: ContractState, keep: readonly string[]): ContractState {
  const subset = new ContractState();
  subset.data = full.data;
  subset.maintenanceAuthority = full.maintenanceAuthority;
  subset.balance = full.balance;
  for (const circuit of keep) {
    const operation = full.operation(circuit);
    if (!operation) throw new Error(`circuit "${circuit}" is not an operation of the contract`);
    subset.setOperation(circuit, operation);
  }
  return subset;
}

/**
 * The deploy transaction of `full` (a ledger `ContractState` built by compact-js) with only
 * the operations in `keep`, and the guaranteed Zswap offer of midnight-js's own deploy
 * transaction (the constructor's coins, if any; midnight-js's deploy has no fallible offer).
 * Returns the new contract's address with it (the deploy is randomised, as midnight-js's is).
 */
export function stagedDeployTx(
  full: ContractState,
  keep: readonly string[],
  guaranteedOffer?: UnprovenOffer,
): { address: string; initialState: ContractState; tx: UnprovenTransaction } {
  const deploy = new ContractDeploy(subsetContractState(full, keep));
  // One hour to live, as midnight-js's deploy (`ttlOneHour`).
  const tx = Transaction.fromParts(getNetworkId(), guaranteedOffer, undefined, Intent.new(new Date(Date.now() + 60 * 60 * 1000)).addDeploy(deploy));
  return { address: deploy.address, initialState: deploy.initialState, tx };
}

/**
 * Plans a staged deploy: the longest prefix of `order` whose deploy stays within the budget.
 * `full` is the ledger state midnight-js's deploy would write.
 */
export function planStagedDeploy(
  full: ContractState,
  order: readonly string[],
  params: LedgerParameters,
  guaranteedOffer?: UnprovenOffer,
  budget = STAGED_DEPLOY_BLOCK_BUDGET,
): { deployed: string[]; inserted: string[]; cost: SyntheticCost; share: NormalizedCost } {
  const plan = longestFittingPrefix(order, (subset) =>
    withinBudget(blockShare(stagedDeployTx(full, subset, guaranteedOffer).tx, params).share, budget),
  );
  const { cost, share } = blockShare(stagedDeployTx(full, plan.deployed, guaranteedOffer).tx, params);
  return { ...plan, cost, share: share! };
}

/** The ledger parameters of the chain's latest block, as its indexer serves them. */
export async function chainLedgerParameters(indexerUrl: string): Promise<{ height: number; params: LedgerParameters }> {
  const response = await fetch(indexerUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ block { height ledgerParameters } }' }),
  });
  const body = (await response.json()) as { data?: { block?: { height: number; ledgerParameters: string } }; errors?: unknown };
  if (body.errors || !body.data?.block) throw new Error(`indexer: no ledger parameters (${JSON.stringify(body.errors ?? body)})`);
  const { height, ledgerParameters } = body.data.block;
  return { height, params: LedgerParameters.deserialize(new Uint8Array(Buffer.from(ledgerParameters.replace(/^0x/i, ''), 'hex'))) };
}

/**
 * The maintenance key of a staged row: `<dir>/<row>.maintenance-key.json`, mode 600, created
 * (never overwritten) on the first deploy and read back on every later run. `dir` must not be
 * readable by group or others. The key is never logged.
 */
export function loadOrCreateMaintenanceKey(directory: string, row: string): { file: string; key: SigningKey; created: boolean } {
  if ((statSync(directory).mode & 0o077) !== 0) throw new Error(`${directory} must be mode 700 or stricter`);
  const file = path.join(directory, `${row}.maintenance-key.json`);
  let created = false;
  if (!existsSync(file)) {
    writeFileSync(file, `${JSON.stringify(sampleSigningKey())}\n`, { mode: 0o600, flag: 'wx' });
    created = true;
  }
  const key = JSON.parse(readSecretFile('maintenance key', file)) as SigningKey;
  if (typeof key?.tag !== 'string' || typeof key?.value !== 'string') throw new Error(`${file} does not hold a signing key`);
  return { file, key, created };
}
