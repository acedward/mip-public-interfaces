/**
 * P2 on a chain (spec 00024 §9.2; sub-plan 03-C step 3): two valid, DISTINGUISHABLE
 * public-interface publications of ONE contract in the SAME block — by default LMOONDU's own
 * bundle (`LMOONDU`) and its second bundle (`LMOONDU-v2`: same interface and keys, one more listed
 * file, so a different commitment). The indexer must make current the one that is LATER BY
 * OBSERVED TRANSACTION POSITION in that block — never the one submitted later.
 *
 *   MN_* as for publish-pointer.ts, plus MN_MNEMONIC_FILE_B = a SECOND funded wallet (mode 600),
 *   so the two fees never compete for one DUST output (the emitter secret is not tied to a wallet):
 *     node --import tsx scripts/publish-same-block.ts [ROW] [BUNDLE-A] [BUNDLE-B] [MAX-PAIRS]
 *   (defaults: LMOONDU LMOONDU LMOONDU-v2 5)
 *
 * Per attempt: both pointer transactions are BUILT (each with the Multi-Part Event publisher, one
 * guaranteed intent, against the latest block), PROVED on the proof server and BALANCED (A by the
 * first wallet, B by the second) before either is submitted; then, right after the node's best
 * block changes (scripts/same-block.ts `submitAtBlockBoundary`), both are submitted at once, so
 * both are in the pool a whole block interval (≈ 6 s on the dev chain) before the next block.
 * Each is awaited at the indexer, and its block and position are read from the indexer
 * (`block(offset: {height}) { transactions { id hash } }` — the block's transactions in order).
 * A pair in one block ends the loop; a pair in two blocks is recorded and the next pair tried, up
 * to MAX-PAIRS (the last same-block pair decides).
 *
 * The record (`MN_DEPLOYMENT_FILE`) gets every publication in the row's `publications` (with
 * `bundleId`, `p2Attempt`, `submittedAt`, `txPosition`, `indexerTxId`) and one `p2Pairs` entry per
 * attempt ({attempt, sameBlock, a, b, later, earlier, submissionOrderAgrees}).
 * Exit 0: a same-block pair was produced; 3: none in MAX-PAIRS; 1: an error.
 */
import path from 'node:path';
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import * as ledger from '@midnightntwrk/ledger-v9';
import {
  bindingFromContract,
  blockFullnessCheck,
  buildPackageTransaction,
  finalizeTransactionPackages,
  submitRecord,
  type FinalizedRecord,
} from '../vendor/compact-multi-part-event/src/publisher/index.js';
import {
  contractModuleOf,
  errorText,
  indexerStateSource,
  log,
  openWallet,
  providersOf,
  syncedBalances,
  type PointerPublication,
  type Profile,
  type Providers,
} from './chain.js';
import { openRecord, readAllRows, readBundles, type RowRecord } from './deploy-lib.js';
import { pairVerdict, submitAtBlockBoundary, type ObservedPublication } from './same-block.js';
import {
  bytesOfHex,
  emitterSecret,
  emitterSecretHashOf,
  enterPrivateStateDirectory,
  fungibleSecret,
  hexOf,
  networkProfile,
  PUBLIC_INTERFACE_EVENT,
  REPOSITORY_ROOT,
  sha256Hex,
  walletSeed,
  witnessesFor,
  type PiPrivateState,
} from './profile.js';

const OUT_FILE = path.resolve(process.env.MN_DEPLOYMENT_FILE?.trim() || path.join(REPOSITORY_ROOT, 'out', 'deployment.json'));
const ROW = (process.argv[2] ?? 'LMOONDU').toUpperCase();
const BUNDLE_A = process.argv[3] ?? 'LMOONDU';
const BUNDLE_B = process.argv[4] ?? 'LMOONDU-v2';
const MAX_PAIRS = Number(process.argv[5] ?? '5');
if (!Number.isSafeInteger(MAX_PAIRS) || MAX_PAIRS < 1 || MAX_PAIRS > 5) throw new Error('MAX-PAIRS must be 1-5 (sub-plan 03-C: at most 5 pairs)');

type Wallet = Awaited<ReturnType<typeof openWallet>>['walletProvider'];

/** What the record keeps of one observed publication of a pair. */
interface P2Side extends ObservedPublication {
  readonly bundleId: string;
  readonly commitment: string;
  readonly segment: number;
  readonly indexerTxId: number;
  readonly wallet: 'A' | 'B';
}
interface P2PairRecord {
  attempt: number;
  sameBlock: boolean;
  a: P2Side;
  b: P2Side;
  later: string;
  earlier: string;
  submissionOrderAgrees: boolean;
  boundaryHeight: number;
  at: string;
}

const clean = (h: string): string => h.replace(/^0x/i, '').toLowerCase();

/** The seed of the SECOND wallet: `walletSeed()` reading MN_MNEMONIC_FILE_B. */
async function secondWalletSeed(): Promise<string> {
  const file = process.env.MN_MNEMONIC_FILE_B?.trim();
  if (!file) throw new Error('MN_MNEMONIC_FILE_B is required (a second funded wallet, mode 600)');
  if (process.env.MN_SEED?.trim()) throw new Error('unset MN_SEED: the two wallets are read from mnemonic files');
  const first = process.env.MN_MNEMONIC_FILE;
  process.env.MN_MNEMONIC_FILE = file;
  try {
    return await walletSeed();
  } finally {
    process.env.MN_MNEMONIC_FILE = first;
  }
}

/** The node's best block (JSON-RPC over HTTP; the Midnight indexer follows finalized blocks). */
async function bestHeight(profile: Profile): Promise<number> {
  const response = await fetch(profile.node.replace(/^ws/i, 'http'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'chain_getHeader', params: [] }),
  });
  const body = (await response.json()) as { result?: { number: string } };
  if (!body.result) throw new Error('node: chain_getHeader returned no header');
  return Number.parseInt(body.result.number, 16);
}

/** The block's transactions in order, from the indexer: position = index in that list. */
async function positionOf(profile: Profile, blockHeight: number, txHash: string): Promise<{ txPosition: number; indexerTxId: number; blockTxs: number }> {
  const response = await fetch(profile.indexer, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: 'query ($h: Int!) { block(offset: { height: $h }) { height transactions { id hash } } }',
      variables: { h: blockHeight },
    }),
  });
  const body = (await response.json()) as { data?: { block: { transactions: { id: number; hash: string }[] } | null }; errors?: { message: string }[] };
  if (body.errors?.length) throw new Error(`indexer: ${body.errors.map((e) => e.message).join('; ')}`);
  const txs = body.data?.block?.transactions ?? [];
  const ids = txs.map((t) => t.id);
  if (ids.some((id, i) => i > 0 && id <= ids[i - 1]!)) throw new Error(`indexer: block ${blockHeight}'s transactions are not in id order`);
  const index = txs.findIndex((t) => clean(t.hash) === clean(txHash));
  if (index < 0) throw new Error(`indexer: ${txHash} is not in block ${blockHeight}`);
  return { txPosition: index, indexerTxId: txs[index]!.id, blockTxs: txs.length };
}

/** Build, prove and balance one pointer transaction — everything but the submission. */
async function preparePointer(input: {
  profile: Profile;
  wallet: Wallet;
  providers: Providers;
  contract: string;
  address: string;
  privateState: PiPrivateState;
  parts: readonly Uint8Array[];
}): Promise<{ finalized: FinalizedRecord; builtOnBlock: number; blockShare?: Record<string, number> }> {
  const module = await contractModuleOf(input.contract);
  const instance = new module.Contract(witnessesFor(input.contract));
  const binding = bindingFromContract(instance as never, 'publishBundle', () => input.privateState);
  const built = await buildPackageTransaction(
    indexerStateSource(input.profile.indexer),
    { network: input.profile.networkId, coinPublicKey: input.wallet.getCoinPublicKey() as string, maxParts: 8 },
    { contract: input.address, name: PUBLIC_INTERFACE_EVENT, binding, parts: input.parts },
  );
  const finalized = await finalizeTransactionPackages(
    {
      prover: { proveTx: (tx, config) => input.providers.proofProvider.proveTx(tx, { timeout: config?.timeout }) as never },
      balancer: { balanceTx: (tx, ttl) => input.wallet.balanceTx(tx as never, ttl) as never },
    },
    built,
    { proofTimeoutMs: 600_000, costCheck: blockFullnessCheck(0.6) },
  );
  let blockShare: Record<string, number> | undefined;
  try {
    const tx = ledger.Transaction.deserialize('signature', 'proof', 'binding', bytesOfHex(finalized.transactionHex));
    blockShare = { ...built.ledgerParameters.normalizeFullness(tx.cost(built.ledgerParameters, true)) };
  } catch {
    blockShare = undefined;
  }
  return { finalized, builtOnBlock: built.block.height, ...(blockShare ? { blockShare } : {}) };
}

async function main(): Promise<void> {
  const profile = networkProfile();
  const { deployment, save } = openRecord(OUT_FILE, profile);
  const row = readAllRows().find((r) => r.id === ROW);
  if (!row) throw new Error(`unknown row ${ROW}`);
  const record = deployment.rows[ROW] as RowRecord & { p2Pairs?: P2PairRecord[] };
  if (!record?.address) throw new Error(`${ROW} is not deployed in ${OUT_FILE}: run deploy-and-publish.ts first`);
  const bundles = readBundles().bundles as (ReturnType<typeof readBundles>['bundles'][number] & { contract?: string })[];
  const pick = (id: string) => {
    const b = bundles.find((x) => x.id === id);
    if (!b) throw new Error(`no bundle ${id} in deployments/bundles.json`);
    if ((b.contract ?? b.id) !== ROW) throw new Error(`bundle ${id} belongs to ${b.contract ?? b.id}, not ${ROW}`);
    return b;
  };
  const bundleA = pick(BUNDLE_A);
  const bundleB = pick(BUNDLE_B);
  if (bundleA.commitment === bundleB.commitment) throw new Error(`${BUNDLE_A} and ${BUNDLE_B} have the same commitment: not distinguishable`);

  const seedA = await walletSeed();
  const seedB = await secondWalletSeed();
  if (seedA === seedB) throw new Error('MN_MNEMONIC_FILE and MN_MNEMONIC_FILE_B are the same wallet');
  const secret = emitterSecret();
  if (record.emitterSecretHash && record.emitterSecretHash !== hexOf(emitterSecretHashOf(secret))) throw new Error(`${ROW} was deployed with another emitter secret`);
  const privateState = { emitterSecret: secret, fungibleSk: fungibleSecret() };
  enterPrivateStateDirectory();
  const a = await openWallet(profile, seedA);
  let b: Awaited<ReturnType<typeof openWallet>> | undefined;
  let produced = false;
  try {
    b = await openWallet(profile, seedB);
    const providers = providersOf(a.walletProvider, a.environment, `umbra-00024-03-p2-${ROW.toLowerCase()}`, row.contract);
    record.p2Pairs ??= [];
    for (let attempt = 1; attempt <= MAX_PAIRS && !produced; attempt += 1) {
      const [balA, balB] = [await syncedBalances(a.walletProvider), await syncedBalances(b.walletProvider)];
      log('p2.wallets', { attempt, dustA: balA.dust.toString(), dustB: balB.dust.toString() });
      if (balA.dust <= 0n || balB.dust <= 0n) throw new Error('a wallet has no DUST');
      const sides = [
        { wallet: 'A' as const, walletProvider: a.walletProvider, bundle: bundleA },
        { wallet: 'B' as const, walletProvider: b.walletProvider, bundle: bundleB },
      ];
      const prepared = [];
      for (const side of sides) {
        const parts = side.bundle.partsHex.map(bytesOfHex);
        const started = Date.now();
        const p = await preparePointer({ profile, wallet: side.walletProvider, providers, contract: row.contract, address: record.address, privateState, parts });
        log('p2.prepared', { attempt, wallet: side.wallet, bundle: side.bundle.id, onBlock: p.builtOnBlock, segment: p.finalized.packages[0]?.segment, ms: Date.now() - started });
        prepared.push({ ...side, ...p, parts });
      }
      // Both are proved and balanced: submit them together right after a block boundary.
      const { boundaryHeight, results } = await submitAtBlockBoundary(
        () => bestHeight(profile),
        prepared.map((p) => () => submitRecord({ submitTx: (tx) => p.walletProvider.submitTx(tx as never) as Promise<string> }, p.finalized)),
      );
      log('p2.submitted', { attempt, boundaryHeight, submittedAt: results.map((r) => new Date(r.submittedAt).toISOString()) });
      const observed = await Promise.all(prepared.map(async (p, i) => {
        const data = await providers.publicDataProvider.watchForTxData(results[i]!.value);
        if (data.status !== SucceedEntirely) throw new Error(`P2 ${p.bundle.id} transaction ${data.txHash} ended ${String(data.status)}`);
        return { p, data, submittedAt: results[i]!.submittedAt };
      }));
      const sidesSeen: P2Side[] = [];
      for (const { p, data, submittedAt } of observed) {
        const blockHeight = Number(data.blockHeight);
        const pos = await positionOf(profile, blockHeight, data.txHash);
        const recorded = p.finalized.packages[0]!;
        const payload = Buffer.concat(p.parts.map((x) => Buffer.from(x)));
        const publication: PointerPublication & Record<string, unknown> = {
          url: p.bundle.url,
          commitment: p.bundle.commitment,
          parts: p.parts.length,
          partsSha256: p.parts.map((x) => sha256Hex(x)),
          payloadSha256: sha256Hex(payload),
          segment: recorded.segment,
          intentHash: recorded.intentHash,
          txId: data.txId,
          txHash: clean(data.txHash),
          blockHeight,
          ...(data.blockHash ? { blockHash: data.blockHash } : {}),
          status: String(data.status),
          builtOnBlock: p.builtOnBlock,
          ...(p.blockShare ? { blockShare: p.blockShare } : {}),
          at: new Date().toISOString(),
          bundleId: p.bundle.id,
          p2Attempt: attempt,
          p2Wallet: p.wallet,
          submittedAt: new Date(submittedAt).toISOString(),
          txPosition: pos.txPosition,
          indexerTxId: pos.indexerTxId,
          blockTransactions: pos.blockTxs,
        };
        record.publications.push(publication);
        sidesSeen.push({
          label: p.bundle.id, bundleId: p.bundle.id, commitment: p.bundle.commitment, txHash: clean(data.txHash), blockHeight,
          txPosition: pos.txPosition, indexerTxId: pos.indexerTxId, segment: recorded.segment, submittedAt, wallet: p.wallet,
        });
      }
      // The record's publication order must be the chain's (P2's order), not the order they were awaited in.
      record.publications.sort((x, y) => x.blockHeight - y.blockHeight
        || (((x as unknown as { txPosition?: number }).txPosition ?? 0) - ((y as unknown as { txPosition?: number }).txPosition ?? 0)));
      const verdict = pairVerdict(sidesSeen[0]!, sidesSeen[1]!);
      record.p2Pairs.push({
        attempt, sameBlock: verdict.sameBlock, a: sidesSeen[0]!, b: sidesSeen[1]!, later: verdict.later.txHash, earlier: verdict.earlier.txHash,
        submissionOrderAgrees: verdict.submissionOrderAgrees, boundaryHeight, at: new Date().toISOString(),
      });
      save();
      log('p2.pair', {
        attempt, sameBlock: verdict.sameBlock,
        a: { bundle: sidesSeen[0]!.bundleId, tx: sidesSeen[0]!.txHash, block: sidesSeen[0]!.blockHeight, position: sidesSeen[0]!.txPosition },
        b: { bundle: sidesSeen[1]!.bundleId, tx: sidesSeen[1]!.txHash, block: sidesSeen[1]!.blockHeight, position: sidesSeen[1]!.txPosition },
        later: verdict.later.label, submissionOrderAgrees: verdict.submissionOrderAgrees,
      });
      produced = verdict.sameBlock;
    }
    log('summary', { row: ROW, pairs: record.p2Pairs.length, sameBlock: produced });
    if (!produced) process.exitCode = 3;
  } catch (error) {
    log('p2.failed', { row: ROW, error: errorText(error).slice(0, 800) });
    process.exitCode = 1;
  } finally {
    await a.walletProvider.stop().catch(() => undefined);
    await b?.walletProvider.stop().catch(() => undefined);
    save();
  }
}

main().catch((error) => {
  console.error('[publish-same-block] failed:', error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
