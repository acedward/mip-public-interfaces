// SPDX-License-Identifier: Apache-2.0
// The two indexer queries the consumer needs. Nothing else is read from the
// chain, and the tool works entirely without this file when the event payload
// and the state bytes are supplied by hand (indexer < 4.4.0, or offline).
//
// Midnight indexer 4.4.0-rc.1, GraphQL v4 (`/api/v4/graphql`):
//   contractEvents(filter: { contractAddress, types: [MISC] }, limit, offset)
//   contractAction(address) { state transaction { hash block { height } } }
// `HexEncoded` scalars are plain lowercase hex strings, without a `0x` prefix.
// Both `contractEvents` and `MiscContractEvent` are @beta and may change.
//
// Publications are Multi-Part Event packages (patch UC-2 of project 00024; upstream
// took the last individual event). Every `mip-xxxx:public-interface[v1]` event of
// the contract is one part; parts merge into one publication when they share the
// contract, the name, the transaction and the intent (the physical segment), in
// the indexer's event-id order, which follows ledger emission order. The intent is
// not a typed field of the indexer's event: it is read from the event's `raw`
// bytes, the serialized ledger `Event`, whose `source.physicalSegment` it is. So
// the query asks for `raw`, and an event whose `raw` does not decode is an error
// (its package could be incomplete), never a guess.
//
// The newest publication is the last in canonical order: block height, then the
// transaction's position in the block, then the execution position of the
// publication's FIRST part — the order MIP-0018 uses for its events, applied to
// packages by their first part (project 00024, derivations P1 and P2). The
// indexer's transaction `id` gives the position in the block and the event `id`
// the execution position; both follow chain order.
import { PUBLIC_INTERFACE_EVENT_HEX } from './event.mjs';

const stripHex = (s) => String(s).replace(/^0x/i, '');
/** Decode a 32-byte hex event name to its string, dropping the zero padding. */
export const decodeEventName = (hex) => Buffer.from(stripHex(hex), 'hex').toString('utf8').replace(/\0+$/, '');

/** Bytes of one part: a `publishBundle` payload. */
const PART_BYTES = 256;

async function gql(url, query, variables) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`indexer ${url} returned HTTP ${res.status} ${res.statusText}`);
  const body = await res.json();
  if (body.errors?.length) throw new Error(`indexer error: ${body.errors.map((e) => e.message).join('; ')}`);
  return body.data;
}

const EVENTS_QUERY = `
query BundleEvents($address: HexEncoded!, $limit: Int!, $offset: Int!) {
  contractEvents(filter: { contractAddress: $address, types: [MISC] }, limit: $limit, offset: $offset) {
    ... on MiscContractEvent {
      id
      raw
      name
      payload
      transaction { id hash block { height } }
    }
  }
}`;

/**
 * Every `Misc` event of a contract, oldest first, with its name decoded:
 * `{ id, name, nameHex, raw, payload, txId, txHash, blockHeight }`. Pages until a
 * short page comes back.
 */
async function fetchMiscEvents(graphqlUrl, address) {
  const limit = 500;
  const all = [];
  for (let offset = 0; ; offset += limit) {
    const data = await gql(graphqlUrl, EVENTS_QUERY, { address: stripHex(address), limit, offset });
    const page = data.contractEvents ?? [];
    for (const e of page) {
      if (!e.name) continue;
      all.push({
        id: e.id,
        name: decodeEventName(e.name),
        nameHex: stripHex(e.name).toLowerCase(),
        raw: e.raw === undefined || e.raw === null ? undefined : stripHex(e.raw).toLowerCase(),
        payload: Buffer.from(stripHex(e.payload ?? ''), 'hex'),
        txId: e.transaction?.id,
        txHash: e.transaction?.hash === undefined ? undefined : stripHex(e.transaction.hash).toLowerCase(),
        blockHeight: e.transaction?.block?.height,
      });
    }
    if (page.length < limit) break;
  }
  all.sort((a, b) => a.id - b.id);
  return all;
}

/**
 * Where a raw ledger event comes from: `{ transactionHash, segment }`, from
 * `Event.deserialize(raw).source` (`physicalSegment`: the intent of the
 * transaction that holds the event's call). Needs `@midnightntwrk/ledger-v9`,
 * loaded on first use. Throws when the bytes are not a ledger event.
 */
export async function eventSourceFromRaw(rawHex) {
  const ledger = await import('@midnightntwrk/ledger-v9');
  const event = ledger.Event.deserialize(Uint8Array.from(Buffer.from(stripHex(rawHex), 'hex')));
  return { transactionHash: stripHex(event.source.transactionHash).toLowerCase(), segment: event.source.physicalSegment };
}

/** One 256-byte part from a typed payload; the indexer may drop its trailing zero bytes. */
function partBytes(e) {
  if (e.payload.length > PART_BYTES) throw new Error(`indexer event ${e.id}: payload is ${e.payload.length} bytes, more than one part (${PART_BYTES})`);
  return Buffer.concat([e.payload, Buffer.alloc(PART_BYTES - e.payload.length)]);
}

/** Canonical order: block height, then transaction position, then the first part's event id. */
const canonical = (a, b) => (a.blockHeight - b.blockHeight) || (a.txId - b.txId) || (a.id - b.id);

/**
 * Group public-interface events into publications (Multi-Part Event packages),
 * oldest first in canonical order. Each publication: `{ id, partIds, parts,
 * segment, payload, txId, txHash, blockHeight }`, where `id` is its first part's
 * event id, `parts` its part count and `payload` its 256·k merged bytes (every
 * part kept whole, trailing zeros included). Events of any other name are not
 * grouped. `sourceOf(raw)` defaults to {@link eventSourceFromRaw}.
 */
export async function groupPublications(events, { sourceOf = eventSourceFromRaw } = {}) {
  const ours = events.filter((e) => e.nameHex === PUBLIC_INTERFACE_EVENT_HEX);
  const groups = new Map();
  for (const e of ours) {
    if (e.raw === undefined || e.raw === '') throw new Error(`indexer event ${e.id}: no raw bytes, so its intent (segment) is unknown and its package cannot be formed`);
    let source;
    try { source = await sourceOf(e.raw); }
    catch (err) { throw new Error(`indexer event ${e.id}: raw bytes do not decode as a ledger event (${err?.message ?? err}), so its intent is unknown`); }
    if (e.txHash !== undefined && source.transactionHash !== e.txHash) {
      throw new Error(`indexer event ${e.id}: raw bytes name transaction ${source.transactionHash}, the indexer says ${e.txHash}`);
    }
    const key = `${source.transactionHash}/${source.segment}`;
    if (!groups.has(key)) groups.set(key, { segment: source.segment, txHash: source.transactionHash, events: [] });
    groups.get(key).events.push(e);
  }
  const publications = [...groups.values()].map((g) => {
    const parts = [...g.events].sort((a, b) => a.id - b.id);
    const first = parts[0];
    return {
      id: first.id,
      partIds: parts.map((p) => p.id),
      parts: parts.length,
      segment: g.segment,
      payload: Buffer.concat(parts.map(partBytes)),
      txId: first.txId,
      txHash: g.txHash,
      blockHeight: first.blockHeight,
    };
  });
  return publications.sort(canonical);
}

/**
 * Every public-interface publication of a contract, oldest first in canonical
 * order (see {@link groupPublications}). Only an event whose 32-byte name is
 * exactly the public-interface name, zero padded, counts; every other `Misc`
 * event is ignored.
 */
export async function fetchBundlePublications(graphqlUrl, address, options = {}) {
  return groupPublications(await fetchMiscEvents(graphqlUrl, address), options);
}

/**
 * The contract's newest public-interface publication, plus the first-part ids of
 * the publications it supersedes, or null when the contract has never published
 * one. `payload` is the merged 256·k-byte payload of all its parts.
 */
export async function fetchLatestBundlePublication(graphqlUrl, address, options = {}) {
  const all = await fetchBundlePublications(graphqlUrl, address, options);
  if (all.length === 0) return null;
  const latest = all[all.length - 1];
  return { ...latest, supersededIds: all.slice(0, -1).map((p) => p.id) };
}

/** The name upstream uses: now the newest publication (a package), not the last individual event. */
export const fetchLatestBundleEvent = fetchLatestBundlePublication;

const STATE_QUERY = `
query ContractState($address: HexEncoded!) {
  contractAction(address: $address) {
    address
    state
    transaction { hash block { height } }
  }
}`;

/** Current serialized `ContractState` for a contract, with its provenance. */
export async function fetchState(graphqlUrl, address) {
  const data = await gql(graphqlUrl, STATE_QUERY, { address: stripHex(address) });
  const action = data.contractAction;
  if (!action) throw new Error(`indexer knows no contract at address ${stripHex(address)}`);
  return {
    state: Buffer.from(stripHex(action.state), 'hex'),
    txHash: action.transaction?.hash,
    blockHeight: action.transaction?.block?.height,
  };
}
