// SPDX-License-Identifier: Apache-2.0
//
// An in-process ledger-v9 chain for offline tests: a blank `LedgerState`, real
// `ContractDeploy` transactions, and `wellFormed` + `LedgerState.apply` with
// balancing, signatures and contract proofs relaxed (no wallet, no DUST, no proof
// server). Adapted from the Multi-Part Event reference implementation's
// `tests/helpers/ledger.ts` (acedward/compact-multi-part-event @ f2425f2, Apache-2.0);
// see vendor/compact-multi-part-event/SOURCE.md.
import type { ContractState as RuntimeContractState } from '@midnight-ntwrk/compact-runtime';
import * as ledger from '@midnightntwrk/ledger-v9';

import type { PublicationStateSource } from '../../vendor/compact-multi-part-event/src/publisher/index.js';
import type { AnyTransaction } from '../../vendor/compact-multi-part-event/src/reader/index.js';

export const NETWORK = 'mip-public-interfaces-local';

const strictness = (): ledger.WellFormedStrictness => {
  const value = new ledger.WellFormedStrictness();
  value.enforceBalancing = false;
  value.verifyNativeProofs = true;
  value.verifyContractProofs = false;
  value.enforceLimits = true;
  value.verifySignatures = false;
  return value;
};

/** One block per applied transaction, six seconds apart. */
export class LocalChain {
  state: ledger.LedgerState;
  time: Date;
  height = 1;
  parentBlockHash = 'ab'.repeat(32);

  constructor(start = new Date('2026-09-26T00:00:00Z')) {
    this.state = ledger.LedgerState.blank(NETWORK);
    this.time = new Date(Math.floor(start.getTime() / 1000) * 1000);
  }

  get seconds(): number {
    return Math.floor(this.time.getTime() / 1000);
  }

  private blockContext(): ledger.BlockContext {
    const secondsSinceEpoch = BigInt(this.seconds);
    return { secondsSinceEpoch, secondsSinceEpochErr: 0, parentBlockHash: this.parentBlockHash, lastBlockTime: secondsSinceEpoch - 6n };
  }

  /** Verify and apply one transaction in a block of its own. */
  apply(tx: AnyTransaction): ledger.TransactionResult {
    const verified = tx.wellFormed(this.state, strictness(), this.time);
    const [next, result] = this.state.apply(verified, new ledger.TransactionContext(this.state, this.blockContext()));
    this.state = next;
    this.time = new Date(this.time.getTime() + 6000);
    this.state = this.state.postBlockUpdate(this.time);
    this.height += 1;
    this.parentBlockHash = this.height.toString(16).padStart(64, '0');
    return result;
  }

  /** The public data the Multi-Part Event publisher reads: the latest block, then states at it. */
  source(): PublicationStateSource {
    return {
      latestBlock: () => Promise.resolve({ hash: this.parentBlockHash, height: this.height, timestampSeconds: this.seconds }),
      contractStateAt: (address, blockHash) => {
        if (blockHash !== this.parentBlockHash) return Promise.reject(new Error('unknown block hash'));
        const contractState = this.state.index(address);
        if (contractState === undefined) return Promise.reject(new Error(`no contract ${address}`));
        return Promise.resolve({ contractState, ledgerParameters: this.state.parameters });
      },
    };
  }
}

/** Install a contract state through a real `ContractDeploy`. Returns the address. */
export const deploy = (chain: LocalChain, runtimeState: RuntimeContractState): string => {
  const contractDeploy = new ledger.ContractDeploy(ledger.ContractState.deserialize(runtimeState.serialize()));
  const tx = ledger.Transaction.fromParts(
    NETWORK,
    undefined,
    undefined,
    ledger.Intent.new(new Date(chain.time.getTime() + 10 * 60 * 1000)).addDeploy(contractDeploy),
  );
  const result = chain.apply(tx.eraseProofs());
  if (result.type !== 'success') throw new Error(`deploy failed: ${result.type} ${String(result.error)}`);
  return contractDeploy.address;
};
