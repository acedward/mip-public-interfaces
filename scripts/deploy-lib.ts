/**
 * The deployment record and the deploy itself (plain, or staged when a contract does not fit
 * one block — spec 00024 Q20 (a), scripts/staged-deploy.ts), shared by deploy-and-publish.ts
 * (the matrix rows and their plans) and publish-pointer.ts (extra instances and further
 * pointers). The deploy logic is the source repository's (acedward/mip-0018-midnight-contracts
 * `scripts/deploy-and-publish.ts` @ cb6c675, see scripts/SOURCE.md), unchanged in substance:
 * midnight-js's own deploy when it fits within the block budget, else a subset deploy plus one
 * maintenance `VerifierKeyInsert` transaction per remaining key, all before the first call.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { signatureVerifyingKey, type SigningKey } from '@midnight-ntwrk/compact-runtime';
import {
  createUnprovenDeployTx,
  deployContract,
  findDeployedContract,
  submitInsertVerifierKeyTx,
  submitTx,
} from '@midnight-ntwrk/midnight-js-contracts';
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import { ContractState as LedgerContractState, type LedgerParameters, type NormalizedCost } from '@midnightntwrk/ledger-v9';
import { type PointerPublication, errorText, log } from './chain.js';
import { artifactSha256, managedDirectory, REPOSITORY_ROOT, sha256Hex, type PiPrivateState } from './profile.js';
import {
  STAGED_DEPLOY_BLOCK_BUDGET,
  blockShare,
  loadOrCreateMaintenanceKey,
  planStagedDeploy,
  stagedDeployTx,
  stagingOrder,
  withinBudget,
} from './staged-deploy.js';

export const MATRIX_FILE = path.join(REPOSITORY_ROOT, 'deployments', 'generated-matrix.json');
export const BUNDLES_FILE = path.join(REPOSITORY_ROOT, 'deployments', 'bundles.json');

// ---------------------------------------------------------------------------
// the plan
// ---------------------------------------------------------------------------

export interface PlanStep {
  kind: 'emit' | 'mint' | 'transfer' | 'publishBundle';
  circuit: string;
  token?: 'ledger' | 'shielded' | 'unshielded';
  piece?: string | null;
  domain?: string | null;
  to?: string;
  amount?: string;
  nonce?: string | null;
  parts?: number;
  url?: string;
  declaration?: { key: string; parts: number; payloadHex: string; text: string | null };
}
export interface MatrixRow {
  id: string;
  contract: string;
  template: string;
  kind: number;
  constructorArgs: { name_: string; symbol_: string };
  domain?: string | null;
  pieces: { piece: string; domain: string; domainSepHex: string }[] | null;
  steps: PlanStep[];
}
export interface BundleRecord {
  id: string;
  url: string;
  parts: number;
  commitment: string;
  payloadHex: string;
  partsHex: string[];
  path: string;
  circuits: string[];
}

export const readMatrix = (): { rows: MatrixRow[] } => JSON.parse(readFileSync(MATRIX_FILE, 'utf8')) as { rows: MatrixRow[] };
export const readBundles = (): { bundles: BundleRecord[] } => JSON.parse(readFileSync(BUNDLES_FILE, 'utf8')) as { bundles: BundleRecord[] };

/** A compiled contract's provable circuits (each one verifier key on chain), in compiled order. */
export const provableCircuits = (contract: string): string[] =>
  (
    JSON.parse(readFileSync(path.join(managedDirectory(contract), 'compiler', 'contract-info.json'), 'utf8')) as {
      circuits: { name: string; proof: boolean }[];
    }
  ).circuits
    .filter((circuit) => circuit.proof)
    .map((circuit) => circuit.name);

// ---------------------------------------------------------------------------
// the record
// ---------------------------------------------------------------------------

export interface StepRecord {
  index: number;
  circuit: string;
  kind: PlanStep['kind'];
  /** Emit steps: the declared key, the package's part count and its SHA-256 (from the matrix). */
  key?: string;
  parts?: number;
  payloadSha256?: string;
  /** Mints and transfers: to whom (public bytes as hex, or "deployer"). */
  recipient?: string;
  /** publishBundle: the pointer publication (segment, parts, intent, …). */
  publication?: PointerPublication;
  txId?: string;
  txHash?: string;
  blockHeight?: number;
  status?: string;
  at: string;
  error?: string;
}
export interface InsertRecord {
  circuit: string;
  verifierKeySha256: string;
  verifierKeyBytes: number;
  txId?: string;
  txHash?: string;
  blockHeight?: number;
  status?: string;
  blockShare?: NormalizedCost;
  foundOnChain?: boolean;
  at?: string;
  error?: string;
}
export interface StagedRecord {
  budget: number;
  ledgerParametersHeight: number;
  fullDeploy: { operations: number; bytesWritten: string; blockShare: NormalizedCost | null };
  deployed: string[];
  deployCost: { bytesWritten: string; blockShare: NormalizedCost; submittedBlockShare?: NormalizedCost };
  maintenanceVerifyingKey: unknown;
  maintenanceKeyFile: string;
  inserts: InsertRecord[];
  complete?: boolean;
  maintenanceCounter?: string;
}
export interface RowRecord {
  /** The record key: a matrix row id (`LSUNPI`) or an extra instance's name (`FX_VALID`). */
  id: string;
  /** The matrix row whose compiled contract and constructor arguments this is. */
  row: string;
  contract: string;
  instance?: boolean;
  artifactSha256?: string;
  emitterSecretHash?: string;
  /** LSUNPI: the OpenZeppelin account id of the deployer's FungibleToken secret (public). */
  fungibleAccount?: string;
  address?: string;
  deploy?: { txId: string; txHash: string; blockHeight: number; at: string; deployShare?: NormalizedCost | null };
  staged?: StagedRecord;
  tokenColor?: string | Record<string, string>;
  steps: StepRecord[];
  /** Every public-interface pointer published on this contract, in order. */
  publications: PointerPublication[];
}
export interface Deployment {
  schemaVersion: 1;
  network: { name: string; networkId: string; node: string; indexer: string };
  rows: Record<string, RowRecord>;
}

export function openRecord(file: string, profile: { networkId: string; node: string; indexer: string }): {
  deployment: Deployment;
  save: () => void;
} {
  mkdirSync(path.dirname(file), { recursive: true });
  const deployment: Deployment = existsSync(file)
    ? (JSON.parse(readFileSync(file, 'utf8')) as Deployment)
    : { schemaVersion: 1, network: { name: profile.networkId, networkId: profile.networkId, node: profile.node, indexer: profile.indexer }, rows: {} };
  if (deployment.network.networkId !== profile.networkId) {
    throw new Error(`${file} records network ${deployment.network.networkId}, not ${profile.networkId}`);
  }
  const save = (): void => {
    const temporary = `${file}.tmp.${process.pid}`;
    writeFileSync(temporary, `${JSON.stringify(deployment, null, 2)}\n`, 'utf8');
    renameSync(temporary, file);
  };
  return { deployment, save };
}

// ---------------------------------------------------------------------------
// deploy (plain or staged) and find
// ---------------------------------------------------------------------------

type UnprovenDeploy = {
  public: { contractAddress: string; initialContractState: { serialize(): Uint8Array } };
  private: { unprovenTx: { guaranteedOffer?: never; fallibleOffer?: unknown } };
};
type FinalizedTx = { tx: unknown; status: unknown; txId: string; txHash: string; blockHeight: number };
export type ContractProviders = {
  privateStateProvider: {
    setContractAddress(address: string): void;
    set(id: string, state: unknown): Promise<void>;
    setSigningKey(address: string, key: SigningKey): Promise<void>;
  };
  zkConfigProvider: {
    getVerifierKey(circuit: string): Promise<Uint8Array>;
    getVerifierKeys(circuits: string[]): Promise<[string, Uint8Array][]>;
  };
  publicDataProvider: {
    queryContractState(address: string): Promise<
      { operation(circuit: string): { verifierKey: Uint8Array } | undefined; maintenanceAuthority: { counter: bigint } } | null
    >;
  };
};
export type CallResult = { public: { txId: string; txHash: string; blockHeight: number; status: string } };
export type CallableContract = { callTx: Record<string, (...args: unknown[]) => Promise<CallResult>> };

/** A staged row's maintenance key: `MN_MAINTENANCE_KEY_DIR/<key>.maintenance-key.json` (mode 600). */
const maintenanceKeyOf = (key: string): ReturnType<typeof loadOrCreateMaintenanceKey> => {
  const directory = process.env.MN_MAINTENANCE_KEY_DIR?.trim();
  if (!directory) throw new Error(`${key} needs a staged deploy: set MN_MAINTENANCE_KEY_DIR (a mode-700 directory)`);
  const result = loadOrCreateMaintenanceKey(path.resolve(directory), key);
  if (result.created) log('row.staged.maintenance-key', { row: key, file: path.basename(result.file), created: true });
  return result;
};

/**
 * Deploy `record` (if it has no address yet) — midnight-js's own deploy when it fits the block
 * budget, otherwise staged — insert any missing keys, and return the callable contract.
 * `callOrder` decides which circuits a staged deploy takes first.
 */
export async function deployOrFind(input: {
  record: RowRecord;
  providers: ContractProviders;
  compiled: unknown;
  args: unknown[];
  privateState: PiPrivateState;
  callOrder: string[];
  params: LedgerParameters;
  parametersHeight: number;
  save: () => void;
}): Promise<CallableContract> {
  const { record, providers, compiled, save, params } = input;
  const privateStateOpts = { privateStateId: record.id, initialPrivateState: input.privateState };
  record.artifactSha256 = artifactSha256(record.contract);
  let contract: CallableContract | undefined;
  if (!record.address) {
    const deployOptions = { compiledContract: compiled, args: input.args, ...privateStateOpts };
    log('row.deploy', { row: record.id, contract: record.contract });
    const started = Date.now();
    const full = (await createUnprovenDeployTx(providers as never, deployOptions as never)) as never as UnprovenDeploy;
    const fullShare = blockShare(full.private.unprovenTx as never, params);
    if (withinBudget(fullShare.share)) {
      const deployed = (await deployContract(providers as never, deployOptions as never)) as never as {
        deployTxData: { public: { contractAddress: string; txId: string; txHash: string; blockHeight: number } };
      } & CallableContract;
      const p = deployed.deployTxData.public;
      record.address = p.contractAddress;
      record.deploy = { txId: p.txId, txHash: p.txHash, blockHeight: Number(p.blockHeight), at: new Date().toISOString(), deployShare: fullShare.share ?? null };
      save();
      log('row.deployed', { row: record.id, address: p.contractAddress, txHash: p.txHash, blockHeight: Number(p.blockHeight), share: fullShare.share, ms: Date.now() - started });
      contract = deployed;
    } else {
      const { key, file } = maintenanceKeyOf(record.id);
      const keyed = (await createUnprovenDeployTx(providers as never, { ...deployOptions, signingKey: key } as never)) as never as UnprovenDeploy;
      if (keyed.private.unprovenTx.fallibleOffer !== undefined) throw new Error(`${record.id}: a deploy with a fallible offer cannot be staged`);
      const fullState = LedgerContractState.deserialize(keyed.public.initialContractState.serialize());
      const order = stagingOrder(provableCircuits(record.contract), input.callOrder);
      const plan = planStagedDeploy(fullState, order, params, keyed.private.unprovenTx.guaranteedOffer);
      const staged = stagedDeployTx(fullState, plan.deployed, keyed.private.unprovenTx.guaranteedOffer);
      log('row.staged.plan', { row: record.id, deployed: plan.deployed, toInsert: plan.inserted, deployShare: plan.share, budget: STAGED_DEPLOY_BLOCK_BUDGET });
      const finalized = (await submitTx(providers as never, { unprovenTx: staged.tx as never })) as never as FinalizedTx;
      if (finalized.status !== SucceedEntirely) throw new Error(`${record.id}: staged deploy ${finalized.txHash} ended ${String(finalized.status)}`);
      providers.privateStateProvider.setContractAddress(staged.address);
      await providers.privateStateProvider.set(record.id, input.privateState);
      await providers.privateStateProvider.setSigningKey(staged.address, key);
      const verifierKeys = new Map(await providers.zkConfigProvider.getVerifierKeys(plan.inserted));
      record.address = staged.address;
      record.deploy = { txId: finalized.txId, txHash: finalized.txHash, blockHeight: Number(finalized.blockHeight), at: new Date().toISOString() };
      record.staged = {
        budget: STAGED_DEPLOY_BLOCK_BUDGET,
        ledgerParametersHeight: input.parametersHeight,
        fullDeploy: { operations: fullState.operations().length, bytesWritten: String(fullShare.cost.bytesWritten), blockShare: fullShare.share ?? null },
        deployed: plan.deployed,
        deployCost: { bytesWritten: String(plan.cost.bytesWritten), blockShare: plan.share },
        maintenanceVerifyingKey: signatureVerifyingKey(key),
        maintenanceKeyFile: path.basename(file),
        inserts: plan.inserted.map((circuit) => {
          const vk = verifierKeys.get(circuit)!;
          return { circuit, verifierKeySha256: sha256Hex(vk), verifierKeyBytes: vk.length };
        }),
      };
      save();
      log('row.deployed', { row: record.id, address: record.address, txHash: record.deploy.txHash, staged: { deployed: plan.deployed.length, toInsert: plan.inserted.length }, ms: Date.now() - started });
    }
  }
  if (record.staged && !record.staged.complete) {
    const address = record.address!;
    const staged = record.staged;
    const { key } = maintenanceKeyOf(record.id);
    providers.privateStateProvider.setContractAddress(address);
    await providers.privateStateProvider.setSigningKey(address, key);
    for (const entry of staged.inserts) {
      if (entry.txHash || entry.foundOnChain) continue;
      const vk = await providers.zkConfigProvider.getVerifierKey(entry.circuit);
      if (sha256Hex(vk) !== entry.verifierKeySha256) throw new Error(`${record.id}.${entry.circuit}: the compiled key changed since the deploy`);
      const onChain = (await providers.publicDataProvider.queryContractState(address))?.operation(entry.circuit);
      if (onChain) {
        if (sha256Hex(onChain.verifierKey) !== entry.verifierKeySha256) throw new Error(`${record.id}.${entry.circuit}: another key is on chain`);
        entry.foundOnChain = true;
        save();
        continue;
      }
      try {
        const finalized = (await submitInsertVerifierKeyTx(providers as never, compiled as never, address, entry.circuit as never, vk as never)) as never as FinalizedTx;
        Object.assign(entry, { txId: finalized.txId, txHash: finalized.txHash, blockHeight: Number(finalized.blockHeight), status: String(finalized.status), at: new Date().toISOString() });
        delete entry.error;
        save();
        log('row.staged.inserted', { row: record.id, circuit: entry.circuit, txHash: finalized.txHash, blockHeight: Number(finalized.blockHeight) });
      } catch (error) {
        entry.error = errorText(error);
        save();
        throw error;
      }
    }
    const state = await providers.publicDataProvider.queryContractState(address);
    const circuits = provableCircuits(record.contract);
    const local = new Map(await providers.zkConfigProvider.getVerifierKeys(circuits));
    const missing = circuits.filter((c) => !state?.operation(c) || sha256Hex(state.operation(c)!.verifierKey) !== sha256Hex(local.get(c)!));
    if (missing.length > 0) throw new Error(`${record.id}: keys missing or different on chain after the inserts: ${missing.join(', ')}`);
    staged.maintenanceCounter = String(state!.maintenanceAuthority.counter);
    staged.complete = true;
    save();
    log('row.staged.complete', { row: record.id, operations: circuits.length, inserted: staged.inserts.length });
  }
  if (!contract) {
    log('row.found', { row: record.id, address: record.address });
    // findDeployedContract checks every compiled circuit's key against the chain.
    contract = (await findDeployedContract(providers as never, {
      compiledContract: compiled,
      contractAddress: record.address,
      ...privateStateOpts,
      ...(record.staged ? { signingKey: maintenanceKeyOf(record.id).key } : {}),
    } as never)) as never;
  }
  return contract!;
}
