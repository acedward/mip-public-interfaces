/**
 * P4 on a chain (spec 00024 §9.2; sub-plan 03-A3 built it offline, 03-A4b runs it on the local
 * stack): ONE transaction whose ONE guaranteed intent holds a MIP-0018 package AND a
 * public-interface package of the same deployed dual contract — by default UMETDU's
 * `publishRepository` declaration and its interface pointer (the row's record in
 * deployments/bundles.json). Built by scripts/dual-intent.ts against one pinned block and
 * state (the Multi-Part Event publisher's `addGuaranteedIntent` with both calls), then proved
 * on the stack's proof server, balanced and submitted through the publisher's generic
 * `finalizeTransaction` / `submitSavedTransaction`, with the P4 intent check
 * (`assertDualIntent`) before proving, after proving, after balancing, after a serialization
 * round trip and before submission; awaited at the indexer; recorded.
 *
 *   MN_* as for deploy-and-publish.ts (the row must be deployed and its plan run), then
 *     node --import tsx scripts/publish-dual-intent.ts [ROW] [DECLARATION-CIRCUIT]
 *   (defaults: UMETDU publishRepository — a one-part declaration; its value re-declares the
 *   row's own `repository`, so the key's current value does not change, and the pointer
 *   re-publishes the row's own bundle, so the current interface stays the same bundle)
 *
 * The record (`MN_DEPLOYMENT_FILE`) gets `dualIntent` entries on the row (the P4 evidence: tx,
 * block, segment, both packages' SHA-256) and the pointer in `publications`. The wallet pays;
 * the emitter secret reaches the proof server only as a private input (run your own).
 */
import path from 'node:path';
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import * as ledger from '@midnightntwrk/ledger-v9';

import { blockFullnessCheck, finalizeTransaction, submitSavedTransaction } from '../vendor/compact-multi-part-event/src/publisher/index.js';
import { contractModuleOf, errorText, indexerStateSource, log, openWallet, providersOf, syncedBalances } from './chain.js';
import { openRecord, readAllRows, readBundles } from './deploy-lib.js';
import { assertDualIntent, buildDualIntentTransaction, type DualIntentCall } from './dual-intent.js';
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
  TOKEN_METADATA_EVENT,
  walletSeed,
  witnessesFor,
} from './profile.js';

const OUT_FILE = path.resolve(process.env.MN_DEPLOYMENT_FILE?.trim() || path.join(REPOSITORY_ROOT, 'out', 'deployment.json'));
const ROW = (process.argv[2] ?? 'UMETDU').toUpperCase();
const DECLARATION = process.argv[3] ?? 'publishRepository';

/** What the row's record keeps of one P4 transaction. */
export interface DualIntentRecord {
  circuits: string[];
  names: string[];
  declarationKey: string;
  declarationPayloadSha256: string;
  pointerPayloadSha256: string;
  commitment: string;
  url: string;
  segment: number;
  intentHash: string;
  txId: string;
  txHash: string;
  blockHeight: number;
  blockHash?: string;
  status: string;
  builtOnBlock: number;
  blockShare?: Record<string, number>;
  at: string;
}

async function main(): Promise<void> {
  const profile = networkProfile();
  const { deployment, save } = openRecord(OUT_FILE, profile);
  const row = readAllRows().find((r) => r.id === ROW);
  if (!row) throw new Error(`unknown row ${ROW}`);
  const record = deployment.rows[ROW] as (typeof deployment.rows)[string] & { dualIntent?: DualIntentRecord[] };
  if (!record?.address) throw new Error(`${ROW} is not deployed in ${OUT_FILE}: run deploy-and-publish.ts first`);
  const step = row.steps.find((s) => s.kind === 'emit' && s.circuit === DECLARATION);
  if (!step?.declaration) throw new Error(`${ROW} has no declaration circuit ${DECLARATION}`);
  const bundle = readBundles().bundles.find((b) => b.id === ROW);
  if (!bundle) throw new Error(`${ROW} has no pointer in deployments/bundles.json`);
  if (bundle.parts !== 1) throw new Error(`${ROW}'s pointer has ${bundle.parts} parts; this P4 script publishes a one-part pointer`);
  const declarationParts = Array.from({ length: step.declaration.parts }, (_, i) => bytesOfHex(step.declaration!.payloadHex).subarray(i * 256, (i + 1) * 256));
  const part = bytesOfHex(bundle.partsHex[0]!);
  const calls: DualIntentCall[] = [
    { circuit: DECLARATION, args: [], name: TOKEN_METADATA_EVENT, payloads: declarationParts },
    { circuit: 'publishBundle', args: [part], name: PUBLIC_INTERFACE_EVENT, payloads: [part] },
  ];

  const seed = await walletSeed();
  const secret = emitterSecret();
  if (record.emitterSecretHash && record.emitterSecretHash !== hexOf(emitterSecretHashOf(secret))) throw new Error(`${ROW} was deployed with another emitter secret`);
  const privateState = { emitterSecret: secret, fungibleSk: fungibleSecret() };
  enterPrivateStateDirectory();
  const { walletProvider, environment } = await openWallet(profile, seed);
  try {
    const balances = await syncedBalances(walletProvider);
    if (balances.dust <= 0n) throw new Error('the wallet has no DUST');
    const module = await contractModuleOf(row.contract);
    const providers = providersOf(walletProvider, environment, `umbra-00024-03-p4-${ROW.toLowerCase()}`, row.contract);
    const built = await buildDualIntentTransaction(
      indexerStateSource(profile.indexer),
      { network: profile.networkId, coinPublicKey: walletProvider.getCoinPublicKey() as string },
      { address: record.address, contract: new module.Contract(witnessesFor(row.contract)) as never, createPrivateState: () => privateState, calls },
    );
    log('p4.built', { row: ROW, address: record.address, segment: built.expected.segment, calls: calls.map((c) => c.circuit), onBlock: built.block.height });
    const check = (tx: Parameters<typeof assertDualIntent>[0], stage: string) => assertDualIntent(tx, built.expected, stage);
    const finalized = await finalizeTransaction(
      {
        prover: { proveTx: (tx, config) => providers.proofProvider.proveTx(tx, { timeout: config?.timeout }) as never },
        balancer: { balanceTx: (tx, ttl) => walletProvider.balanceTx(tx as never, ttl) as never },
      },
      built.transaction,
      {
        network: profile.networkId,
        purpose: `P4: ${DECLARATION} + publishBundle of ${ROW} in one guaranteed intent`,
        proofTimeoutMs: 600_000,
        ttl: built.ttl,
        ledgerParameters: built.ledgerParameters,
        block: built.block,
        check,
        // The node admits a transaction only below about 0.64 of the ledger's block (staged-deploy.ts).
        costCheck: blockFullnessCheck(0.6),
      },
    );
    const txId = await submitSavedTransaction({ submitTx: (tx) => walletProvider.submitTx(tx as never) as Promise<string> }, finalized, check);
    const data = await providers.publicDataProvider.watchForTxData(txId);
    if (data.status !== SucceedEntirely) throw new Error(`P4 transaction ${data.txHash} ended ${String(data.status)}`);
    const tx = ledger.Transaction.deserialize('signature', 'proof', 'binding', bytesOfHex(finalized.transactionHex));
    let blockShare: Record<string, number> | undefined;
    try {
      blockShare = { ...built.ledgerParameters.normalizeFullness(tx.cost(built.ledgerParameters, true)) };
    } catch {
      blockShare = undefined;
    }
    const entry: DualIntentRecord = {
      circuits: calls.map((c) => c.circuit),
      names: calls.map((c) => c.name),
      declarationKey: step.declaration.key,
      declarationPayloadSha256: sha256Hex(bytesOfHex(step.declaration.payloadHex)),
      pointerPayloadSha256: sha256Hex(part),
      commitment: bundle.commitment,
      url: bundle.url,
      segment: built.expected.segment,
      intentHash: tx.intents!.get(built.expected.segment)!.intentHash(built.expected.segment),
      txId: data.txId,
      txHash: data.txHash,
      blockHeight: Number(data.blockHeight),
      ...(data.blockHash ? { blockHash: data.blockHash } : {}),
      status: String(data.status),
      builtOnBlock: built.block.height,
      ...(blockShare ? { blockShare } : {}),
      at: new Date().toISOString(),
    };
    record.dualIntent = [...(record.dualIntent ?? []), entry];
    record.publications.push({
      url: bundle.url, commitment: bundle.commitment, parts: 1, partsSha256: [sha256Hex(part)], payloadSha256: sha256Hex(part),
      segment: entry.segment, intentHash: entry.intentHash, txId: entry.txId, txHash: entry.txHash, blockHeight: entry.blockHeight,
      ...(entry.blockHash ? { blockHash: entry.blockHash } : {}), status: entry.status, builtOnBlock: entry.builtOnBlock,
      ...(blockShare ? { blockShare } : {}), at: entry.at,
    });
    save();
    log('p4.done', { row: ROW, txHash: entry.txHash, blockHeight: entry.blockHeight, segment: entry.segment, circuits: entry.circuits });
  } catch (error) {
    log('p4.failed', { row: ROW, error: errorText(error).slice(0, 600) });
    process.exitCode = 1;
  } finally {
    await walletProvider.stop().catch(() => undefined);
    save();
  }
}

main().catch((error) => {
  console.error('[publish-dual-intent] failed:', error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
