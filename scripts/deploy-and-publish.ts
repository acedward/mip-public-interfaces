/**
 * Deploy the PI set (deployments/generated-matrix.json: LSUNPI, SSTARPI, CNSTPI, UPROMPI) and/or
 * the DU set (deployments/dual-matrix.json: SNEBDU, LMOONDU, UMETDU, DAURDU — project 00024-03)
 * on a local chain and run each row's plan in order: ONE circuit call per transaction for every
 * MIP-0018 declaration (each its own intent and package, UC-1 — a DU declaration of a long
 * value is ONE call emitting all of its parts), the mints (ledger, shielded, unshielded) and the
 * transfer, then the public-interface pointer of deployments/bundles.json — published with the
 * Multi-Part Event reference publisher, every `publishBundle(part)` call of the pointer in ONE
 * guaranteed intent (UPROMPI's 235-byte URL is a 2-part package; spec FR-019).
 *
 *   MN_NETWORK_ID=undeployed MN_INDEXER_URL=… MN_INDEXER_WS_URL=… MN_NODE_URL=… \
 *   MN_NODE_WS_URL=… MN_PROOF_SERVER_URL=… MN_MNEMONIC_FILE=<mode-600 mnemonic> \
 *   MN_EMITTER_SECRET_FILE=<mode-600 hex> MN_FUNGIBLE_SK_FILE=<mode-600 hex> \
 *   MN_PRIVATE_STATE_DIR=<dir> MN_MAINTENANCE_KEY_DIR=<mode-700 dir> \
 *   MN_DEPLOYMENT_FILE=out/local-deployment.json \
 *     node --import tsx scripts/deploy-and-publish.ts [LSUNPI SSTARPI …]
 *
 * With no arguments every row of both plans is run, in file order — the PI set, then the DU
 * set (`ROWS=a,b` works too; e.g. `SNEBDU LMOONDU UMETDU DAURDU` for the DU set alone).
 *
 * Secrets (spec 00024 Q12): the constructor stores `emitterSecretHashOf(secret)`; every
 * emitting circuit (`publish*Repository`, `publishBundle`) proves knowledge of the secret
 * through the `emitterSecret` witness. LSUNPI's `transfer` also reads OpenZeppelin's account
 * secret (`wit_FungibleTokenSK`). Both are read from mode-600 files, never logged, and reach
 * only the proof server as private inputs — run your own.
 *
 * A contract whose deploy does not fit the block budget is deployed in stages (spec 00024
 * Q20 (a), scripts/staged-deploy.ts). The four PI contracts have 8-11 circuits and fit; the DU
 * set's 12-16 keys may not (test/du-deploy-plan.test.ts estimates each deploy offline).
 *
 * Resumable per row and per step through the record (`MN_DEPLOYMENT_FILE`, default
 * `out/deployment.json`, not committed); a failed step stops its row and the next row runs.
 * It starts nothing: the proof server and the chain are the operator's.
 */
import { createHash } from 'node:crypto';
import path from 'node:path';
import { CompactTypeBytes, CompactTypeVector, persistentCommit } from '@midnight-ntwrk/compact-runtime';
import { chainLedgerParameters } from './staged-deploy.js';
import {
  compiledContractOf,
  contractModuleOf,
  errorText,
  log,
  openWallet,
  providersOf,
  publishPointer,
  syncedBalances,
} from './chain.js';
import {
  deployOrFind,
  openRecord,
  readAllRows,
  readBundles,
  stepArgs,
  type CallableContract,
  type ContractProviders,
  type MatrixRow,
  type RowRecord,
} from './deploy-lib.js';
import {
  accountIdOf,
  bytesOfHex,
  emitterSecret,
  emitterSecretHashOf,
  enterPrivateStateDirectory,
  fungibleSecret,
  hexOf,
  networkProfile,
  pad,
  REPOSITORY_ROOT,
  walletSeed,
} from './profile.js';

const OUT_FILE = path.resolve(process.env.MN_DEPLOYMENT_FILE?.trim() || path.join(REPOSITORY_ROOT, 'out', 'deployment.json'));

const allRows = readAllRows();
const bundles = readBundles();
const requested = (process.argv.slice(2).length > 0
  ? process.argv.slice(2)
  : (process.env.ROWS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
).map((s) => s.toUpperCase());
const rows: MatrixRow[] = requested.length > 0
  ? requested.map((id) => {
      const row = allRows.find((r) => r.id === id);
      if (!row) throw new Error(`unknown row "${id}"`);
      return row;
    })
  : allRows;

const BYTES32 = new CompactTypeBytes(32);
const VECTOR2 = new CompactTypeVector(2, BYTES32);
/** The protocol's token colour: `persistentCommit([domainSep, address], pad(32, "midnight:derive_token"))`. */
const deriveColor = (domainSep: Uint8Array, addressHex: string): string =>
  hexOf(persistentCommit(VECTOR2, [domainSep, bytesOfHex(addressHex)], pad(32, 'midnight:derive_token')));

async function main(): Promise<void> {
  const profile = networkProfile();
  const { deployment, save } = openRecord(OUT_FILE, profile);
  const seed = await walletSeed();
  const secret = emitterSecret();
  const fungibleSk = fungibleSecret();
  const secretHash = emitterSecretHashOf(secret);
  const privateState = { emitterSecret: secret, fungibleSk };
  const privateStateDirectory = enterPrivateStateDirectory();
  log('wallet.start', { network: profile.networkId, indexer: profile.indexer, proofServer: profile.proofServer, emitterSecretHash: hexOf(secretHash), privateStateDirectory });
  const { walletProvider, environment } = await openWallet(profile, seed);
  try {
    const balances = await syncedBalances(walletProvider);
    log('wallet.synced', { dust: balances.dust.toString(), night: balances.night });
    if (balances.dust <= 0n) throw new Error('the deployment wallet has no DUST — register it for DUST first (the local stack: fund.sh)');
    const coinPublicKey = walletProvider.getCoinPublicKey() as string;
    const zswapRecipient = { bytes: bytesOfHex(coinPublicKey) };
    const { height: parametersHeight, params } = await chainLedgerParameters(profile.indexer);
    log('ledger.parameters', { height: parametersHeight });

    for (const row of rows) {
      const record: RowRecord = deployment.rows[row.id] ?? { id: row.id, row: row.id, contract: row.id, steps: [], publications: [] };
      record.publications ??= [];
      deployment.rows[row.id] = record;
      if (record.emitterSecretHash && record.emitterSecretHash !== hexOf(secretHash)) {
        throw new Error(`${row.id} was deployed with another emitter secret; use its secret or a new record`);
      }
      record.emitterSecretHash = hexOf(secretHash);
      if (row.template === 'FungibleToken') record.fungibleAccount = hexOf(accountIdOf(fungibleSk));
      const module = await contractModuleOf(row.contract);
      const compiled = compiledContractOf(row.id, row.contract, module);
      const providers = providersOf(walletProvider, environment, `umbra-00024-02-${row.id.toLowerCase()}`, row.contract);
      let contract: CallableContract;
      try {
        contract = await deployOrFind({
          record,
          providers: providers as unknown as ContractProviders,
          compiled,
          args: [secretHash, row.constructorArgs.name_, row.constructorArgs.symbol_],
          privateState,
          callOrder: row.steps.map((s) => s.circuit),
          params,
          parametersHeight,
          save,
        });
      } catch (error) {
        log('row.deploy.failed', { row: row.id, error: errorText(error) });
        save();
        continue;
      }

      let rowFailed = false;
      for (const [index, step] of row.steps.entries()) {
        if (record.steps.some((s) => s.index === index && s.txHash)) continue;
        if (rowFailed) break;
        const started = Date.now();
        try {
          log('step.call', { row: row.id, index, circuit: step.circuit, kind: step.kind });
          if (step.kind === 'publishBundle') {
            const bundle = bundles.bundles.find((b) => b.id === row.id);
            if (!bundle) throw new Error(`${row.id}: no pointer in deployments/bundles.json`);
            if (bundle.parts !== step.parts || bundle.url !== step.url) throw new Error(`${row.id}: bundles.json and the matrix disagree on the pointer`);
            const publication = await publishPointer({
              profile,
              walletProvider,
              providers,
              contract: row.contract,
              address: record.address!,
              privateState,
              parts: bundle.partsHex.map(bytesOfHex),
              url: bundle.url,
            });
            if (publication.commitment !== bundle.commitment) throw new Error(`${row.id}: published commitment differs from bundles.json`);
            record.publications.push(publication);
            record.steps = record.steps.filter((s) => s.index !== index);
            record.steps.push({
              index, circuit: step.circuit, kind: step.kind, parts: publication.parts, payloadSha256: publication.payloadSha256, publication,
              txId: publication.txId, txHash: publication.txHash, blockHeight: publication.blockHeight, status: publication.status, at: publication.at,
            });
            save();
            log('step.done', { row: row.id, index, circuit: step.circuit, txHash: publication.txHash, blockHeight: publication.blockHeight, parts: publication.parts, segment: publication.segment, ms: Date.now() - started });
            continue;
          }
          const { args, recipient } = stepArgs(row, step, index, { fungibleSk, zswapRecipient });
          const result = await contract.callTx[step.circuit]!(...args);
          const p = result.public;
          record.steps = record.steps.filter((s) => s.index !== index);
          record.steps.push({
            index,
            circuit: step.circuit,
            kind: step.kind,
            ...(step.kind === 'emit' && step.declaration
              ? { key: step.declaration.key, parts: step.declaration.parts, payloadSha256: createHash('sha256').update(Buffer.from(step.declaration.payloadHex, 'hex')).digest('hex') }
              : {}),
            ...(recipient ? { recipient } : {}),
            txId: p.txId,
            txHash: p.txHash,
            blockHeight: Number(p.blockHeight),
            status: String(p.status),
            at: new Date().toISOString(),
          });
          save();
          log('step.done', { row: row.id, index, circuit: step.circuit, txHash: p.txHash, blockHeight: Number(p.blockHeight), ms: Date.now() - started });
        } catch (error) {
          const message = errorText(error);
          record.steps = record.steps.filter((s) => s.index !== index);
          record.steps.push({ index, circuit: step.circuit, kind: step.kind, at: new Date().toISOString(), error: message });
          save();
          log('step.failed', { row: row.id, index, circuit: step.circuit, error: message.split('\n')[0] });
          rowFailed = true;
        }
      }

      // The colour, derived off chain with the protocol's formula (as the source repository does).
      if (row.pieces) {
        record.tokenColor = Object.fromEntries(row.pieces.map((p) => [p.piece, deriveColor(pad(32, p.domain), record.address!)]));
      } else if (row.domain && row.kind !== 2) {
        record.tokenColor = deriveColor(pad(32, row.domain), record.address!);
      }
      save();
      log('row.done', { row: row.id, address: record.address, steps: record.steps.filter((s) => s.txHash).length, failed: rowFailed });
    }
  } finally {
    await walletProvider.stop().catch(() => undefined);
    save();
  }
  log('summary', {
    rows: Object.values(deployment.rows).map((r) => ({
      id: r.id,
      address: r.address,
      steps: r.steps.filter((s) => s.txHash).length,
      failed: r.steps.filter((s) => s.error).length,
      publications: r.publications.length,
    })),
  });
}

main().catch((error) => {
  console.error('[deploy] failed:', error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
