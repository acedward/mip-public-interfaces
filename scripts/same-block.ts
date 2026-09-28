/**
 * P2 of spec 00024 §9.2 — "the newest public-interface publication" uses the canonical order of
 * P1 (block, then transaction position, then execution order). The case that exercises it is two
 * valid, distinguishable publications of ONE contract in the SAME block (sub-plan 03-C step 3):
 * which one is newest is then decided by the transactions' positions in that block, never by the
 * order they were submitted in.
 *
 * The pure pieces of scripts/publish-same-block.ts live here so test/p2-same-block.test.ts can
 * exercise them without a chain: the order two observed publications stand in, the pair's
 * verdict, and "submit both right after a block boundary".
 */

/** A publication as observed ON CHAIN: its block and its transaction's position in that block. */
export interface ObservedPublication {
  /** What was published (e.g. the bundle id `LMOONDU` or `LMOONDU-v2`). */
  readonly label: string;
  readonly txHash: string;
  readonly blockHeight: number;
  /** The transaction's index in its block, as the indexer lists the block's transactions. */
  readonly txPosition: number;
  /** When it was handed to the node (ms since the epoch). Recorded, never used for ordering. */
  readonly submittedAt: number;
}

/**
 * The later of two publications in the canonical order: block height, then transaction position.
 * Two different transactions never share both; if they do, the observation is wrong and this
 * throws rather than guess.
 */
export const laterByPosition = (a: ObservedPublication, b: ObservedPublication): ObservedPublication => {
  if (a.txHash === b.txHash) throw new Error('P2 pair: both publications are the same transaction');
  if (a.blockHeight !== b.blockHeight) return a.blockHeight > b.blockHeight ? a : b;
  if (a.txPosition === b.txPosition) {
    throw new Error(`P2 pair: two transactions observed at the same position ${a.txPosition} of block ${a.blockHeight}`);
  }
  return a.txPosition > b.txPosition ? a : b;
};

export interface PairVerdict {
  readonly sameBlock: boolean;
  /** The later publication by observed position — the one P2 makes current. */
  readonly later: ObservedPublication;
  readonly earlier: ObservedPublication;
  /** Whether the later one by position is also the later one by submission time (informational:
   *  the rule must not depend on it, so a run where the two orders differ is the stronger case). */
  readonly submissionOrderAgrees: boolean;
}

export const pairVerdict = (a: ObservedPublication, b: ObservedPublication): PairVerdict => {
  const later = laterByPosition(a, b);
  const earlier = later === a ? b : a;
  return {
    sameBlock: a.blockHeight === b.blockHeight,
    later,
    earlier,
    submissionOrderAgrees: later.submittedAt >= earlier.submittedAt,
  };
};

/**
 * Wait until the chain's best block changes (a block was just authored, so the next one is a whole
 * block interval away), then submit every transaction at once. Returns the height seen at the
 * boundary and each submission's result and time. `readHeight` is polled every `pollMs`; the wait
 * gives up after `timeoutMs`.
 */
export const submitAtBlockBoundary = async <T>(
  readHeight: () => Promise<number>,
  submissions: readonly (() => Promise<T>)[],
  options: { readonly pollMs?: number; readonly timeoutMs?: number; readonly now?: () => number; readonly sleep?: (ms: number) => Promise<void> } = {},
): Promise<{ boundaryHeight: number; results: { value: T; submittedAt: number }[] }> => {
  const pollMs = options.pollMs ?? 150;
  const timeoutMs = options.timeoutMs ?? 60_000;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const start = now();
  const first = await readHeight();
  let height = first;
  while (height === first) {
    if (now() - start > timeoutMs) throw new Error(`no new block within ${timeoutMs} ms (best block stayed ${first})`);
    await sleep(pollMs);
    height = await readHeight();
  }
  const results = await Promise.all(submissions.map(async (submit) => {
    const submittedAt = now();
    return { value: await submit(), submittedAt };
  }));
  return { boundaryHeight: height, results };
};
