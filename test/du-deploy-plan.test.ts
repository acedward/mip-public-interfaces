// SPDX-License-Identifier: Apache-2.0
//
// Sub-plan 03-A4a, offline: does each DU contract's deploy fit one block, or is it staged (spec
// 00024 Q20 (a), scripts/staged-deploy.ts — the source repository's file, unchanged)? The deploy
// transaction is built exactly as midnight-js builds it (`createUnprovenDeployTxFromVerifierKeys`
// with the committed verifier keys and the plan's constructor arguments) and measured against
// `LedgerParameters.initialParameters()` — the parameters the local dev chain runs. A deploy that
// needs more than the budget (0.6 of a block: the node admits a transaction only below ≈ 0.64 —
// project 01, 01-A6b) is planned in stages: the longest prefix of the circuits in call order that
// fits, then one maintenance `VerifierKeyInsert` per remaining key. scripts/deploy-lib.ts takes
// the same decision on the chain's own parameters at deploy time (task 03-A4b).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { sampleSigningKey } from '@midnight-ntwrk/compact-runtime';
import { createUnprovenDeployTxFromVerifierKeys } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { ZKConfigProvider, type ProverKey, type VerifierKey, type ZKIR } from '@midnight-ntwrk/midnight-js-types';
import { ContractState, LedgerParameters } from '@midnightntwrk/ledger-v9';
import { describe, expect, it } from 'vitest';

import { provableCircuits, readDualMatrix, readMatrix, type MatrixRow } from '../scripts/deploy-lib.js';
import { emitterSecretHashOf, witnessesFor } from '../scripts/profile.js';
import { STAGED_DEPLOY_BLOCK_BUDGET, blockShare, planStagedDeploy, stagedDeployTx, stagingOrder, withinBudget } from '../scripts/staged-deploy.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

/** The committed verifier keys, as midnight-js's node provider would read them (no prover key is needed to build a deploy). */
class ManagedVerifierKeys extends ZKConfigProvider<string> {
  constructor(private readonly directory: string) {
    super();
  }
  getZKIR(): Promise<ZKIR> {
    return Promise.reject(new Error('not needed to build a deploy'));
  }
  getProverKey(): Promise<ProverKey> {
    return Promise.reject(new Error('not needed to build a deploy'));
  }
  getVerifierKey(circuit: string): Promise<VerifierKey> {
    return Promise.resolve(new Uint8Array(readFileSync(join(this.directory, 'keys', `${circuit}.verifier`))) as VerifierKey);
  }
}

type Deploy = {
  public: { initialContractState: { serialize(): Uint8Array } };
  private: { unprovenTx: { cost(p: LedgerParameters): never; guaranteedOffer?: never; fallibleOffer?: unknown } };
};

/** midnight-js's deploy of `row`, measured; staged when it does not fit the budget. */
async function deployPlan(row: MatrixRow) {
  setNetworkId('undeployed');
  const params = LedgerParameters.initialParameters();
  const directory = join(ROOT, 'contracts', 'managed', row.contract);
  const { Contract } = (await import(`../contracts/managed/${row.contract}/contract/index.js`)) as { Contract: never };
  const compiled = CompiledContract.make(row.id, Contract).pipe(
    CompiledContract.withWitnesses(witnessesFor(row.contract) as never),
    CompiledContract.withCompiledFileAssets(directory),
  );
  const secret = new Uint8Array(32).fill(0x42);
  const deploy = (await createUnprovenDeployTxFromVerifierKeys(
    new ManagedVerifierKeys(directory) as never,
    '11'.repeat(32) as never,
    {
      compiledContract: compiled,
      args: [emitterSecretHashOf(secret), row.constructorArgs.name_, row.constructorArgs.symbol_],
      signingKey: sampleSigningKey(),
      privateStateId: row.id,
      initialPrivateState: { emitterSecret: secret, fungibleSk: new Uint8Array(32).fill(0x11) },
    } as never,
    '22'.repeat(32) as never,
  )) as never as Deploy;
  const full = ContractState.deserialize(deploy.public.initialContractState.serialize());
  const fullShare = blockShare(deploy.private.unprovenTx as never, params);
  const order = stagingOrder(provableCircuits(row.contract), row.steps.map((s) => s.circuit));
  const fits = withinBudget(fullShare.share);
  const plan = fits ? undefined : planStagedDeploy(full, order, params, deploy.private.unprovenTx.guaranteedOffer);
  return { full, fullShare, order, fits, plan, params, offer: deploy.private.unprovenTx.guaranteedOffer };
}

/**
 * The outcome measured with the committed keys (evidence note §03-A4a; bytes written is the
 * binding dimension): SNEBDU 13 keys 0.596 of a block — one deploy, at the edge of the budget;
 * UMETDU 12 keys 0.545 — one deploy; LMOONDU 16 keys 0.713 and DAURDU 16 keys 0.764 — staged:
 * 12 keys deployed (0.577 / 0.598), 4 inserted. (Calibration: LSUNPI 0.363 here, ≤ 0.36 on chain
 * in 02-B4.)
 */
const EXPECTED: Record<string, { keys: number; fits: boolean; deployed?: number }> = {
  SNEBDU: { keys: 13, fits: true },
  LMOONDU: { keys: 16, fits: false, deployed: 12 },
  UMETDU: { keys: 12, fits: true },
  DAURDU: { keys: 16, fits: false, deployed: 12 },
};

describe('the DU set\'s deploys against the local chain\'s ledger parameters (budget 0.6 of a block)', () => {
  it('the budget is the source repository\'s 0.6 (the node admits a transaction only below ≈ 0.64)', () => {
    expect(STAGED_DEPLOY_BLOCK_BUDGET).toBe(0.6);
  });

  it('calibration: every PI contract (8-11 keys) fits one deploy, as 02-B4 deployed them on chain', async () => {
    for (const row of readMatrix().rows) {
      const { fits, fullShare } = await deployPlan(row);
      expect(fits, `${row.id} ${JSON.stringify(fullShare.share)}`).toBe(true);
    }
  });

  it.each(readDualMatrix().rows.map((r) => [r.id, r] as const))('%s: one deploy or staged, as recorded; a staged plan deploys a fitting prefix in call order and inserts every other key', async (id, row) => {
    const { full, fullShare, order, fits, plan, params, offer } = await deployPlan(row);
    const circuits = full.operations().map(String);
    expect(circuits).toHaveLength(EXPECTED[id]!.keys);
    expect(new Set(order)).toEqual(new Set(circuits));
    expect(fits, `${id} full deploy ${JSON.stringify(fullShare.share)} (bytes written ${String(fullShare.cost.bytesWritten)})`).toBe(EXPECTED[id]!.fits);
    if (plan) {
      expect(withinBudget(plan.share)).toBe(true);
      expect([...plan.deployed, ...plan.inserted]).toEqual(order);
      expect([plan.deployed.length, plan.inserted.length]).toEqual([EXPECTED[id]!.deployed, EXPECTED[id]!.keys - EXPECTED[id]!.deployed!]);
      // the circuits the plan calls first are deployed with the contract
      expect(plan.deployed[0]).toBe(row.steps[0]!.circuit);
      const oneMore = stagedDeployTx(full, order.slice(0, plan.deployed.length + 1), offer);
      expect(withinBudget(blockShare(oneMore.tx, params).share)).toBe(false);
    }
  });
});
