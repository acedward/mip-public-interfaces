/**
 * Publish further public-interface pointers on PI contracts — a new bundle version on an
 * already deployed contract, or a pointer on a fresh INSTANCE of a PI contract — with the
 * Multi-Part Event reference publisher (all `publishBundle` parts of one pointer in ONE
 * guaranteed intent), in one wallet session.
 *
 *   MN_* as for deploy-and-publish.ts, then
 *     node --import tsx scripts/publish-pointer.ts <plan.json>
 *
 * `plan.json`:
 *   { "pointers": [
 *       { "key": "LSUNPI", "commitment": "<64 hex>", "url": "http://…/index.json" },
 *       { "key": "FX_VALID", "deploy": "LSUNPI", "commitment": "…", "url": "…" },
 *       { "key": "X", "partsHex": ["<512 hex>", …] }
 *   ] }
 *
 * - `key` names the record entry (`MN_DEPLOYMENT_FILE`). Without `deploy` it must already be
 *   deployed (a matrix row from deploy-and-publish.ts, or an earlier instance).
 * - `deploy: <ROW>` deploys a new instance of that matrix row's compiled contract with the
 *   row's constructor arguments and the same secrets, recorded under `key` (`instance: true`);
 *   none of the row's plan steps run. An entry that already has an address is not redeployed.
 * - The pointer is `commitment ++ utf8(url)` zero padded to 256·k bytes (UC-2), or the given
 *   `partsHex`. The URL is NOT part of the commitment, so the same bundle bytes may be pointed
 *   at from several URLs.
 * - `"skipIfPublished": true` skips an entry whose record already holds a publication of the
 *   same payload (a resumed run).
 *
 * The record gets each publication (segment, parts, intent hash, transaction, block).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chainLedgerParameters } from './staged-deploy.js';
import { compiledContractOf, contractModuleOf, errorText, log, openWallet, providersOf, publishPointer, syncedBalances } from './chain.js';
import { deployOrFind, openRecord, readAllRows, type ContractProviders, type RowRecord } from './deploy-lib.js';
import {
  accountIdOf,
  bytesOfHex,
  emitterSecret,
  emitterSecretHashOf,
  enterPrivateStateDirectory,
  fungibleSecret,
  hexOf,
  networkProfile,
  pointerParts,
  REPOSITORY_ROOT,
  sha256Hex,
  walletSeed,
} from './profile.js';

interface PointerRequest {
  key: string;
  deploy?: string;
  commitment?: string;
  url?: string;
  partsHex?: string[];
  skipIfPublished?: boolean;
}

const OUT_FILE = path.resolve(process.env.MN_DEPLOYMENT_FILE?.trim() || path.join(REPOSITORY_ROOT, 'out', 'deployment.json'));
const planFile = process.argv[2];
if (!planFile) throw new Error('usage: publish-pointer.ts <plan.json>');
const plan = JSON.parse(readFileSync(planFile, 'utf8')) as { pointers: PointerRequest[] };
if (!Array.isArray(plan.pointers) || plan.pointers.length === 0) throw new Error(`${planFile}: no pointers`);
for (const p of plan.pointers) {
  if (!/^[A-Za-z0-9_-]+$/.test(p.key)) throw new Error(`bad key ${JSON.stringify(p.key)}`);
  if (!p.partsHex && !(p.commitment && p.url)) throw new Error(`${p.key}: give commitment + url, or partsHex`);
}

async function main(): Promise<void> {
  const profile = networkProfile();
  const { deployment, save } = openRecord(OUT_FILE, profile);
  const allRows = readAllRows();
  const seed = await walletSeed();
  const secret = emitterSecret();
  const fungibleSk = fungibleSecret();
  const secretHash = emitterSecretHashOf(secret);
  const privateState = { emitterSecret: secret, fungibleSk };
  enterPrivateStateDirectory();
  const { walletProvider, environment } = await openWallet(profile, seed);
  let failures = 0;
  try {
    const balances = await syncedBalances(walletProvider);
    log('wallet.synced', { dust: balances.dust.toString() });
    if (balances.dust <= 0n) throw new Error('the wallet has no DUST');
    const { height: parametersHeight, params } = await chainLedgerParameters(profile.indexer);
    for (const request of plan.pointers) {
      try {
        let record: RowRecord | undefined = deployment.rows[request.key];
        if (request.deploy) {
          const row = allRows.find((r) => r.id === request.deploy);
          if (!row) throw new Error(`${request.key}: unknown matrix row ${request.deploy}`);
          if (record && record.row !== row.id) throw new Error(`${request.key} is already an instance of ${record.row}`);
          record ??= { id: request.key, row: row.id, contract: row.contract, instance: true, steps: [], publications: [] };
          deployment.rows[request.key] = record;
          if (record.emitterSecretHash && record.emitterSecretHash !== hexOf(secretHash)) throw new Error(`${request.key} was deployed with another emitter secret`);
          record.emitterSecretHash = hexOf(secretHash);
          if (row.template === 'FungibleToken') record.fungibleAccount = hexOf(accountIdOf(fungibleSk));
        }
        if (!record) throw new Error(`${request.key} is not in ${OUT_FILE}; give "deploy": <ROW> to deploy an instance`);
        record.publications ??= [];
        const row = allRows.find((r) => r.id === record!.row);
        if (!row) throw new Error(`${request.key}: its row ${record.row} is not in the matrix`);
        const parts = request.partsHex ? request.partsHex.map(bytesOfHex) : pointerParts(request.commitment!, request.url!);
        const payloadSha256 = sha256Hex(Buffer.concat(parts.map((p) => Buffer.from(p))));
        if (request.skipIfPublished && record.publications.some((p) => p.payloadSha256 === payloadSha256)) {
          log('pointer.skipped', { key: request.key, payloadSha256, reason: 'already published' });
          continue;
        }
        const module = await contractModuleOf(record.contract);
        const providers = providersOf(walletProvider, environment, `umbra-00024-02-${request.key.toLowerCase()}`, record.contract);
        if (!record.address) {
          await deployOrFind({
            record,
            providers: providers as unknown as ContractProviders,
            compiled: compiledContractOf(request.key, record.contract, module),
            args: [secretHash, row.constructorArgs.name_, row.constructorArgs.symbol_],
            privateState,
            callOrder: ['publishBundle'],
            params,
            parametersHeight,
            save,
          });
        }
        const started = Date.now();
        const publication = await publishPointer({
          profile,
          walletProvider,
          providers,
          contract: record.contract,
          address: record.address!,
          privateState,
          parts,
          ...(request.url ? { url: request.url } : {}),
        });
        record.publications.push(publication);
        save();
        log('pointer.published', { key: request.key, address: record.address, txHash: publication.txHash, blockHeight: publication.blockHeight, segment: publication.segment, parts: publication.parts, commitment: publication.commitment, url: request.url, ms: Date.now() - started });
      } catch (error) {
        failures += 1;
        log('pointer.failed', { key: request.key, error: errorText(error) });
        save();
      }
    }
  } finally {
    await walletProvider.stop().catch(() => undefined);
    save();
  }
  log('summary', { pointers: plan.pointers.length, failures });
  if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('[publish-pointer] failed:', error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
