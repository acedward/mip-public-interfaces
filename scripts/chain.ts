/**
 * The on-chain session the scripts share: the wallet (testkit-js), the per-contract
 * midnight-js providers, and the Multi-Part Event publisher (vendor/compact-multi-part-event)
 * wired to them — the publisher builds a pointer's `publishBundle` calls into ONE guaranteed
 * intent against one pinned state, and these adapters prove it on the stack's proof server,
 * balance and submit it with the wallet, and wait for it at the indexer.
 *
 * Nothing here starts a service. The proof server receives witness values (the emitter
 * secret), so it must be one you run.
 */
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import { MidnightWalletProvider, initializeMidnightProviders, syncWallet } from '@midnight-ntwrk/testkit-js';
import {
  bindingFromContract,
  blockFullnessCheck,
  buildPackageTransaction,
  finalizeTransactionPackages,
  submitRecord,
  type PublicationStateSource,
} from '../vendor/compact-multi-part-event/src/publisher/index.js';
import * as ledger from '@midnightntwrk/ledger-v9';
import {
  createWalletLogger,
  managedDirectory,
  networkProfile,
  PUBLIC_INTERFACE_EVENT,
  sha256Hex,
  witnessesFor,
  type PiPrivateState,
} from './profile.js';

export const log = (event: string, fields: Record<string, unknown> = {}): void =>
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }));

export type Profile = ReturnType<typeof networkProfile>;

/** A wallet synced on the profile's chain, and the environment testkit-js expects. */
export async function openWallet(profile: Profile, seed: string): Promise<{
  walletProvider: MidnightWalletProvider;
  environment: Record<string, unknown>;
}> {
  setNetworkId(profile.networkId);
  const { NetworkId } = await import('@midnightntwrk/wallet-sdk');
  const environment = {
    ...profile,
    walletNetworkId: profile.networkId === 'undeployed' ? NetworkId.NetworkId.Undeployed : NetworkId.NetworkId.StageNet,
  };
  const walletProvider = await MidnightWalletProvider.build(createWalletLogger(), environment as never, seed);
  await walletProvider.start(false);
  return { walletProvider, environment };
}

export async function syncedBalances(walletProvider: MidnightWalletProvider): Promise<{ dust: bigint; night: Record<string, string> }> {
  const state = await syncWallet(walletProvider.wallet as never, 2_000, 600_000);
  const dust = (state as { dust: { balance(at: Date): bigint } }).dust.balance(new Date());
  const night = (state as { unshielded: { balances: Record<string, bigint> } }).unshielded.balances;
  return { dust, night: Object.fromEntries(Object.entries(night).map(([k, v]) => [k, String(v)])) };
}

/** The generated module of `contracts/managed/<contract>/contract/index.js`. */
export type ContractModule = {
  Contract: new (witnesses: unknown) => { impureCircuits: Record<string, (...args: unknown[]) => Promise<unknown>> };
};

export async function contractModuleOf(contract: string): Promise<ContractModule> {
  return (await import(`../contracts/managed/${contract}/contract/index.js`)) as ContractModule;
}

/** compact-js's view of a compiled PI contract, with the witnesses it declares. */
export function compiledContractOf(id: string, contract: string, module: ContractModule): unknown {
  return CompiledContract.make(id, module.Contract as never).pipe(
    CompiledContract.withWitnesses(witnessesFor(contract) as never),
    CompiledContract.withCompiledFileAssets(managedDirectory(contract)),
  );
}

/** midnight-js providers for one contract (the private-state store is per row). */
export function providersOf(walletProvider: MidnightWalletProvider, environment: Record<string, unknown>, storeName: string, contract: string) {
  return initializeMidnightProviders(walletProvider, environment as never, {
    privateStateStoreName: storeName,
    zkConfigPath: managedDirectory(contract),
  }) as unknown as Providers;
}

export type Providers = {
  proofProvider: { proveTx(tx: ledger.UnprovenTransaction, config?: { timeout?: number }): Promise<unknown> };
  publicDataProvider: {
    watchForTxData(txId: string): Promise<{ txId: string; txHash: string; blockHeight: number; blockHash?: string; status: unknown; tx?: unknown }>;
  };
};

// ---------------------------------------------------------------------------
// the Multi-Part Event publisher on this chain
// ---------------------------------------------------------------------------

/**
 * The publisher's state source over the indexer: the latest block (time in seconds), then the
 * contract's state as of that block and that block's ledger parameters (the chain's, never
 * the defaults) — the queries of the Multi-Part Event reference (`src/indexer`
 * `indexerStateSource`, not vendored), written out here.
 */
export function indexerStateSource(indexerUrl: string): PublicationStateSource {
  const query = async <T>(q: string, variables: Record<string, unknown> = {}): Promise<T> => {
    for (let attempt = 1; ; attempt += 1) {
      try {
        const response = await fetch(indexerUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query: q, variables }),
        });
        const body = (await response.json()) as { data?: T; errors?: { message: string }[] };
        if (body.errors?.length) throw new Error(`indexer: ${body.errors.map((e) => e.message).join('; ')}`);
        if (!body.data) throw new Error('indexer returned no data');
        return body.data;
      } catch (error) {
        if (attempt >= 5) throw error;
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  };
  const FIELDS = 'hash height timestamp ledgerParameters';
  return {
    latestBlock: async () => {
      const { block } = await query<{ block: { hash: string; height: number; timestamp: number } | null }>(`query { block { ${FIELDS} } }`);
      if (!block) throw new Error('indexer: no latest block');
      return { hash: block.hash.replace(/^0x/i, ''), height: block.height, timestampSeconds: Math.floor(block.timestamp / 1000) };
    },
    contractStateAt: async (address: string, blockHash: string) => {
      const data = await query<{ contract: { state: string } | null; block: { ledgerParameters: string } | null }>(
        `query ($address: HexEncoded!, $hash: HexEncoded!) {
          contract(address: $address, offset: { hash: $hash }) { state }
          block(offset: { hash: $hash }) { ${FIELDS} }
        }`,
        { address, hash: blockHash },
      );
      if (!data.contract) throw new Error(`indexer: no contract ${address} at block ${blockHash}`);
      if (!data.block) throw new Error(`indexer: no block ${blockHash}`);
      const bytes = new Uint8Array(Buffer.from(data.contract.state.replace(/^0x/i, ''), 'hex'));
      return {
        contractState: { serialize: () => bytes },
        ledgerParameters: ledger.LedgerParameters.deserialize(new Uint8Array(Buffer.from(data.block.ledgerParameters.replace(/^0x/i, ''), 'hex'))),
      };
    },
  };
}

/** What one pointer publication did on chain. */
export interface PointerPublication {
  url?: string;
  commitment: string;
  parts: number;
  partsSha256: string[];
  payloadSha256: string;
  segment: number;
  intentHash: string;
  txId: string;
  txHash: string;
  blockHeight: number;
  blockHash?: string;
  status: string;
  /** The block whose state the publisher pinned. */
  builtOnBlock: number;
  /** The finalized transaction's share of a block, per dimension. */
  blockShare?: Record<string, number>;
  at: string;
}

/**
 * Publish one public-interface pointer with the Multi-Part Event reference publisher: every
 * `publishBundle(part)` call of it in ONE guaranteed intent (one package), executed locally
 * against one pinned state with the private state's secret, proved on the proof server,
 * balanced and submitted by the wallet, then awaited at the indexer.
 *
 * A private state without the emitter's secret fails while executing ("caller is not the
 * emitter"), before anything is proved or submitted.
 */
export async function publishPointer(input: {
  profile: Profile;
  walletProvider: MidnightWalletProvider;
  providers: Providers;
  contract: string;
  address: string;
  privateState: PiPrivateState;
  parts: readonly Uint8Array[];
  url?: string;
}): Promise<PointerPublication> {
  const module = await contractModuleOf(input.contract);
  const instance = new module.Contract(witnessesFor(input.contract));
  const binding = bindingFromContract(instance as never, 'publishBundle', () => input.privateState);
  const built = await buildPackageTransaction(
    indexerStateSource(input.profile.indexer),
    { network: input.profile.networkId, coinPublicKey: input.walletProvider.getCoinPublicKey() as string, maxParts: 8 },
    { contract: input.address, name: PUBLIC_INTERFACE_EVENT, binding, parts: input.parts },
  );
  const [pkg] = built.packages;
  log('pointer.built', { contract: input.contract, address: input.address, parts: input.parts.length, segment: pkg?.segment, onBlock: built.block.height });
  const finalized = await finalizeTransactionPackages(
    {
      prover: { proveTx: (tx, config) => input.providers.proofProvider.proveTx(tx, { timeout: config?.timeout }) as never },
      balancer: { balanceTx: (tx, ttl) => input.walletProvider.balanceTx(tx as never, ttl) as never },
    },
    built,
    // The node admits a transaction only below about 0.64 of the ledger's block (staged-deploy.ts).
    { proofTimeoutMs: 600_000, costCheck: blockFullnessCheck(0.6) },
  );
  const txId = await submitRecord({ submitTx: (tx) => input.walletProvider.submitTx(tx as never) }, finalized);
  const data = await input.providers.publicDataProvider.watchForTxData(txId);
  if (data.status !== SucceedEntirely) throw new Error(`pointer ${data.txHash} ended ${String(data.status)}`);
  const recorded = finalized.packages[0]!;
  const payload = Buffer.concat(input.parts.map((p) => Buffer.from(p)));
  let blockShare: Record<string, number> | undefined;
  try {
    const tx = ledger.Transaction.deserialize('signature', 'proof', 'binding', new Uint8Array(Buffer.from(finalized.transactionHex, 'hex')));
    blockShare = { ...built.ledgerParameters.normalizeFullness(tx.cost(built.ledgerParameters, true)) };
  } catch {
    blockShare = undefined;
  }
  return {
    ...(input.url === undefined ? {} : { url: input.url }),
    commitment: Buffer.from(input.parts[0]!.subarray(0, 32)).toString('hex'),
    parts: input.parts.length,
    partsSha256: input.parts.map((p) => sha256Hex(p)),
    payloadSha256: sha256Hex(payload),
    segment: recorded.segment,
    intentHash: recorded.intentHash,
    txId: data.txId,
    txHash: data.txHash,
    blockHeight: Number(data.blockHeight),
    ...(data.blockHash ? { blockHash: data.blockHash } : {}),
    status: String(data.status),
    builtOnBlock: built.block.height,
    ...(blockShare ? { blockShare } : {}),
    at: new Date().toISOString(),
  };
}

/**
 * An error with its `cause` chain on one line (the wallet SDK wraps the node's reason for a
 * refused transaction as the cause of "Transaction submission error"). From the source
 * repository's deploy script.
 */
export const errorText = (error: unknown): string => {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current !== undefined && current !== null && depth < 12; depth += 1) {
    const fiberCause = typeof current !== 'object' ? undefined : Object.getOwnPropertySymbols(current).find((symbol) => String(symbol.description).includes('FiberFailure/Cause'));
    if (fiberCause) {
      parts.push(String((current as Error).name ?? 'FiberFailure'));
      current = (current as Record<symbol, unknown>)[fiberCause];
      continue;
    }
    const tagged = current as { _tag?: string; error?: unknown; defect?: unknown };
    if ((tagged._tag === 'Fail' && 'error' in tagged) || (tagged._tag === 'Die' && 'defect' in tagged)) {
      current = tagged._tag === 'Fail' ? tagged.error : tagged.defect;
      continue;
    }
    if (current instanceof Error) {
      parts.push(`${(current as { _tag?: string })._tag ?? current.name}: ${current.message}`);
    } else {
      let text: string;
      try {
        text = JSON.stringify(current, (_key, value: unknown) => (typeof value === 'bigint' ? value.toString() : value)) ?? String(current);
      } catch {
        text = String(current);
      }
      parts.push(text.slice(0, 600));
    }
    current = (current as { cause?: unknown }).cause;
  }
  return parts.join(' <- ');
};
