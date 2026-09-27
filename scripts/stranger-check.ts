/**
 * A caller without the emitter secret cannot emit (spec 00024 Q12, FR-019b) — checked on the
 * chain the deployment record names, for the PI set and the DU set (every MIP-0018 declaration
 * circuit of a DU contract — a long value's ONE call included — and its `publishBundle`).
 *
 *   MN_* as for deploy-and-publish.ts (no secret files needed), then
 *     node --import tsx scripts/stranger-check.ts [LSUNPI …]
 *
 * For every EMITTING circuit of every deployed matrix row — its declaration circuits (a PI
 * row's `publish*Repository`, a DU row's twin declarations incl. the Null `clear…`) and
 * `publishBundle` (with the row's recorded first pointer part) — the contract
 * is found again with a fresh random 32-byte emitter secret (and a fresh FungibleToken secret)
 * as its private state, the "stranger", and the circuit is called through midnight-js. Each
 * call must fail with `TokenMetadata: caller is not the emitter` while executing, before any
 * proof or transaction exists. A pointer of more than one part is ALSO tried through the
 * Multi-Part Event publisher (both parts in one intent), which must refuse the same way. The
 * contract's latest action at the indexer must be the same before and after.
 *
 * Exit 0 only if every call was refused that way; one JSON line per call.
 */
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { compiledContractOf, contractModuleOf, errorText, log, openWallet, providersOf, publishPointer, syncedBalances } from './chain.js';
import { openRecord, readAllRows, readBundles, type CallableContract } from './deploy-lib.js';
import { bytesOfHex, enterPrivateStateDirectory, networkProfile, REPOSITORY_ROOT, walletSeed } from './profile.js';

const OUT_FILE = path.resolve(process.env.MN_DEPLOYMENT_FILE?.trim() || path.join(REPOSITORY_ROOT, 'out', 'deployment.json'));
const REFUSED = /TokenMetadata: caller is not the emitter/;

async function main(): Promise<void> {
  const profile = networkProfile();
  const { deployment } = openRecord(OUT_FILE, profile);
  const allRows = readAllRows();
  const bundles = readBundles();
  const requested = process.argv.slice(2).map((s) => s.toUpperCase());
  const rows = allRows.filter((row) => deployment.rows[row.id]?.address && (requested.length === 0 || requested.includes(row.id)));
  if (rows.length === 0) throw new Error(`no deployed row to check in ${OUT_FILE}`);

  const latestAction = async (address: string): Promise<string | null> => {
    const response = await fetch(profile.indexer, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'query ($a: HexEncoded!) { contractAction(address: $a) { transaction { hash } } }', variables: { a: address } }),
    });
    const body = (await response.json()) as { data?: { contractAction?: { transaction?: { hash: string } } | null }; errors?: unknown };
    if (body.errors) throw new Error(`indexer error for ${address}: ${JSON.stringify(body.errors)}`);
    return body.data?.contractAction?.transaction?.hash ?? null;
  };

  const seed = await walletSeed();
  enterPrivateStateDirectory();
  const { walletProvider, environment } = await openWallet(profile, seed);
  let refused = 0;
  let failures = 0;
  try {
    await syncedBalances(walletProvider);
    for (const row of rows) {
      const record = deployment.rows[row.id]!;
      const address = record.address!;
      const before = await latestAction(address);
      const module = await contractModuleOf(row.contract);
      const providers = providersOf(walletProvider, environment, `umbra-00024-02-stranger-${row.id.toLowerCase()}`, row.contract);
      const stranger = { emitterSecret: new Uint8Array(randomBytes(32)), fungibleSk: new Uint8Array(randomBytes(32)) };
      const contract = (await findDeployedContract(providers as never, {
        compiledContract: compiledContractOf(row.id, row.contract, module),
        contractAddress: address,
        privateStateId: `stranger-${row.id}`,
        initialPrivateState: stranger,
      } as never)) as never as CallableContract;
      const bundle = bundles.bundles.find((b) => b.id === row.id);
      const parts = (bundle?.partsHex ?? []).map(bytesOfHex);
      const calls: { circuit: string; via: string; run: () => Promise<unknown> }[] = [
        ...row.steps.filter((s) => s.kind === 'emit').map((s) => ({ circuit: s.circuit, via: 'midnight-js', run: () => contract.callTx[s.circuit]!() })),
        ...(parts[0] ? [{ circuit: 'publishBundle', via: 'midnight-js', run: () => contract.callTx.publishBundle!(parts[0]) }] : []),
        ...(parts.length > 1
          ? [{ circuit: 'publishBundle', via: `multi-part publisher (${parts.length} parts, one intent)`, run: () => publishPointer({ profile, walletProvider, providers, contract: row.contract, address, privateState: stranger, parts }) }]
          : []),
      ];
      for (const call of calls) {
        try {
          const result = (await call.run()) as { public?: { txHash: string }; txHash?: string };
          failures += 1;
          log('stranger.EMITTED', { row: row.id, circuit: call.circuit, via: call.via, txHash: result?.public?.txHash ?? result?.txHash });
        } catch (error) {
          const message = errorText(error);
          if (REFUSED.test(message)) {
            refused += 1;
            log('stranger.refused', { row: row.id, circuit: call.circuit, via: call.via, error: (message.match(/[^<]*caller is not the emitter[^<]*/)?.[0] ?? message).trim().slice(0, 200) });
          } else {
            failures += 1;
            log('stranger.unexpected-error', { row: row.id, circuit: call.circuit, via: call.via, error: message.slice(0, 400) });
          }
        }
      }
      const after = await latestAction(address);
      if (after !== before) failures += 1;
      log('row.checked', { row: row.id, address, latestActionBefore: before, latestActionAfter: after, unchanged: after === before });
    }
  } finally {
    await walletProvider.stop().catch(() => undefined);
  }
  log('summary', { rows: rows.length, refused, failures });
  if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('[stranger-check] failed:', error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
