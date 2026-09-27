/**
 * Export the fixtures the token indexer's public-interface tests consume (sub-plan 02-B5):
 *
 *   fixtures/simulator/   the PI set's and the DU set's deployment plans run in the Compact
 *                         simulator (project 00024-03 adds the DU set after the PI set): every
 *                         event as a Multi-Part Event part, grouped into packages; each
 *                         contract's interface (commitment, URL, parts, circuits, form) and its
 *                         final serialized state (the Level 2 input).
 *   fixtures/bundles/     interface bundles for the indexer's verification tests, all built
 *                         from LSUNPI (so its simulated state fits every one): valid, a
 *                         tampered file, a wrong `hash`, over a size cap, on a loopback host,
 *                         naming a compiler version that is not installed — plus cases.json
 *                         (the pointer each is published under and the expected outcome).
 *
 * Deterministic: two runs from the same inputs write identical bytes (SOURCE.md records
 * the SHA-256 of every input and output). No secret is involved: the corpus uses the
 * public TEST emitter secret 32 × 0x42.
 *
 *   node --import tsx scripts/export-fixtures.ts [--out <dir>]   # default: the repository
 *
 * Needs contracts/managed/<ID>/ compiled with keys, deployments/bundles.json (scripts/bundle.ts)
 * and the patched tools installed (`npm run tools:ci`).
 */
import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { licenceFiles } from './bundle.js';
import { addressOf, emitterSecretHashOf, readAllRows, readBundles, simulatePi, TEST_EMITTER_SECRET, type SimEvent } from './simulate-pi.js';

const ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..');
const TOOLS = path.join(ROOT, 'tools', 'public-interface', 'src');

const sha256 = (b: Uint8Array | string): string => createHash('sha256').update(b).digest('hex');
const utf8 = (t: string): Uint8Array => new TextEncoder().encode(t);
const json = (v: unknown): string => `${JSON.stringify(v, null, 2)}\n`;

type Hash = {
  readIndexFile(dir: string): { hash: string; compiler: unknown; files: { path: string; size: number }[] };
  indexCommitment(index: unknown): Buffer;
  writeIndex(dir: string): { commitment: Buffer };
  assemblePayload(c: Uint8Array, url: string): Buffer;
  payloadParts(p: Uint8Array): Buffer[];
  walk(dir: string): string[];
};
type BundleMod = {
  assembleBundle(o: {
    interfaceSrc: string; interfaceOut: string; outDir: string; url: string; pins?: { compiler?: string; language?: string; runtime?: string };
    extraFiles?: Record<string, string>; interfaceKind?: 'full';
  }): { commitment: Buffer; url: string };
  resolveImports(src: string): string[];
  commonRoot(paths: string[]): string;
};

const TOKEN_METADATA = 'mip-0018:token-metadata[v1]';
const PUBLIC_INTERFACE = 'mip-xxxx:public-interface[v1]';

// ---------------------------------------------------------------------------
// fixtures/simulator
// ---------------------------------------------------------------------------

interface CorpusEvent extends SimEvent {
  eventId: number;
  row: string;
  contractAddress: string;
  txStandIn: string;
  segmentStandIn: number;
  packageId: number;
}

function decodeMetadata(payload: Uint8Array) {
  const unpad = (b: Uint8Array) => {
    let e = b.length;
    while (e > 0 && b[e - 1] === 0) e -= 1;
    return new TextDecoder().decode(b.subarray(0, e));
  };
  const len = payload[66]! | (payload[67]! << 8);
  const valType = payload[65];
  const value = payload.subarray(68, 68 + len);
  // Text for the UTF-8 val-types (1 string, 3 JSON, 4 URI); a val-type 2 integer is its
  // little-endian bytes (as a decimal string); a Null (5) has no value.
  const text = valType === 1 || valType === 3 || valType === 4 ? new TextDecoder().decode(value) : undefined;
  let integer: string | undefined;
  if (valType === 2) {
    let n = 0n;
    for (let i = value.length - 1; i >= 0; i -= 1) n = (n << 8n) | BigInt(value[i]!);
    integer = n.toString();
  }
  return {
    domainSep: Buffer.from(payload.subarray(0, 32)).toString('hex'),
    domain: unpad(payload.subarray(0, 32)),
    kind: payload[32],
    key: unpad(payload.subarray(33, 65)),
    valType,
    valLen: len,
    ...(text === undefined ? {} : { value: text }),
    ...(integer === undefined ? {} : { integer }),
    ...(valType === 5 ? { null: true } : {}),
  };
}

async function exportSimulator(out: string): Promise<Record<string, string>> {
  const dir = path.join(out, 'fixtures', 'simulator');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const rows = readAllRows();
  const bundles = readBundles().bundles;
  const events: CorpusEvent[] = [];
  const packages: unknown[] = [];
  const interfaces: unknown[] = [];
  let eventId = 0;
  for (const row of rows) {
    const sim = await simulatePi(row.id);
    const address = addressOf(row.id);
    // One step = one circuit call sequence in ONE transaction and ONE intent (a publishBundle
    // step's parts share both), so the Multi-Part Event key is (address, name, step).
    const byStep = new Map<number, SimEvent[]>();
    for (const e of sim.events) byStep.set(e.step, [...(byStep.get(e.step) ?? []), e]);
    for (const [step, stepEvents] of byStep) {
      const txStandIn = sha256(utf8(`umbra:00024:sim:${row.id}:${step}`));
      for (const name of [...new Set(stepEvents.map((e) => e.eventName))]) {
        const parts = stepEvents.filter((e) => e.eventName === name);
        const packageId = packages.length;
        const ids: number[] = [];
        for (const e of parts) {
          ids.push(eventId);
          events.push({ eventId, row: row.id, contractAddress: address, txStandIn, segmentStandIn: 1, packageId, ...e });
          eventId += 1;
        }
        const payloadHex = parts.map((e) => e.payloadHex).join('');
        const payload = Uint8Array.from(Buffer.from(payloadHex, 'hex'));
        const pkg: Record<string, unknown> = {
          packageId, row: row.id, contractAddress: address, eventName: name, txStandIn, segmentStandIn: 1,
          step, circuit: parts[0]?.circuit, eventIds: ids, parts: parts.length, payloadHex, payloadSha256: sha256(payload),
        };
        if (name === TOKEN_METADATA) pkg.metadata = decodeMetadata(payload);
        if (name === PUBLIC_INTERFACE) {
          let end = payload.length;
          while (end > 32 && payload[end - 1] === 0) end -= 1;
          const url = new TextDecoder().decode(payload.subarray(32, end));
          pkg.publicInterface = { commitment: Buffer.from(payload.subarray(0, 32)).toString('hex'), url, urlBytes: end - 32 };
        }
        packages.push(pkg);
      }
    }
    const b = bundles.find((x) => x.id === row.id) as (typeof bundles)[number] & { form: string; circuits: string[]; verifyOnly: string[]; witnesses: string[] };
    interfaces.push({
      row: row.id,
      form: b.form,
      contractAddress: address,
      bundle: { path: `bundles/${b.path}`, url: b.url, urlBytes: Buffer.byteLength(b.url), parts: b.parts, commitment: b.commitment, payloadHex: b.payloadHex },
      circuits: b.circuits,
      verifyOnly: b.verifyOnly,
      witnesses: b.witnesses,
      expected: { status: 'verified', level1: 'passed', level2: 'passed', level3: 'passed (with compactc 0.34.0 installed)' },
      // The contract's serialized ContractState after its whole plan, one verifier key per
      // circuit installed as a deploy installs them — the Level 2 input.
      stateHex: sim.state.toString('hex'),
      stateSha256: sha256(sim.state),
    });
  }
  const partCounts = [...new Set(packages.map((p) => (p as { parts: number }).parts))].sort((a, b) => a - b);
  const files: Record<string, unknown> = {
    'events.json': {
      $comment: 'GENERATED by scripts/export-fixtures.ts. Every Misc event the PI set (LSUNPI, SSTARPI, CNSTPI, UPROMPI; deployments/generated-matrix.json) and then the DU set (SNEBDU, LMOONDU, UMETDU, DAURDU; deployments/dual-matrix.json — each MIP-18 twin\'s full metadata, SNEBDU\'s 3-part `metadata`, LMOONDU\'s Null and 2-part `description`) emits when its plan runs in the Compact simulator, in emission order, and the Multi-Part Event packages they form. Stand-ins (the simulator has no chain): contractAddress = sha256("umbra:00024:<row>"); one transaction per step, txStandIn = sha256("umbra:00024:sim:<row>:<step>"); segmentStandIn = 1 (one step = one intent — a publishBundle step\'s parts, or a long declaration\'s parts from its one call, are one intent). No block heights, real transaction hashes or indexer event ids.',
      names: [TOKEN_METADATA, PUBLIC_INTERFACE],
      count: events.length,
      packageCount: packages.length,
      packagesByParts: Object.fromEntries(partCounts.map((n) => [n, packages.filter((p) => (p as { parts: number }).parts === n).length])),
      events,
      packages,
    },
    'interfaces.json': {
      $comment: 'GENERATED by scripts/export-fixtures.ts. Per PI contract (form FULL) and per DU contract (form HIDDEN): its current (only) interface publication and the bundle it names (committed under bundles/), the circuits the interface publishes (FULL: all of them; HIDDEN: every impure circuit, no pure one; verifyOnly = those that take a witness), and the serialized ContractState its plan leaves (stateHex), which Level 2 compares the shipped keys with. Every one verifies at Levels 1, 2 and 3 with compactc 0.34.0 (scripts/verify-bundles.sh).',
      emitterSecretHash: Buffer.from(emitterSecretHashOf(TEST_EMITTER_SECRET)).toString('hex'),
      interfaces,
    },
  };
  const hashes: Record<string, string> = {};
  for (const [name, value] of Object.entries(files)) {
    const text = json(value);
    writeFileSync(path.join(dir, name), text);
    hashes[`fixtures/simulator/${name}`] = sha256(text);
  }
  return hashes;
}

// ---------------------------------------------------------------------------
// fixtures/bundles
// ---------------------------------------------------------------------------

/** The byte cap the over-size-cap case is built to exceed (1 MiB); every real PI bundle is far below it. */
const TEST_BYTE_CAP = 1024 * 1024;
const FIXTURE_BASE = 'http://bundles/fixtures/';

async function exportBundles(out: string): Promise<{ hashes: Record<string, string>; summary: unknown[] }> {
  const hash = (await import(path.join(TOOLS, 'hash.mjs'))) as Hash;
  const { assembleBundle, resolveImports, commonRoot } = (await import(path.join(TOOLS, 'bundle.mjs'))) as BundleMod;
  const dir = path.join(out, 'fixtures', 'bundles');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const interfaceSrc = path.join(ROOT, 'contracts', 'generated', 'LSUNPI.compact');
  const sources = [...resolveImports(interfaceSrc), path.resolve(interfaceSrc)];
  // As scripts/bundle.ts builds LSUNPI's real bundle: a FULL interface with its licences and provenance.
  const base = {
    interfaceSrc, interfaceOut: path.join(ROOT, 'contracts', 'managed', 'LSUNPI'),
    interfaceKind: 'full' as const, extraFiles: licenceFiles('LSUNPI', sources, commonRoot(sources)),
  };
  const sim = await simulatePi('LSUNPI');
  writeFileSync(path.join(dir, 'LSUNPI.state.hex'), sim.state.toString('hex'));
  const bytesOf = (d: string) => hash.walk(d).reduce((n, f) => n + statSync(path.join(d, f)).size, 0);

  interface Case {
    case: string;
    what: string;
    url: string;
    build: (d: string, url: string) => Buffer; // returns the commitment the event carries
    expected: Record<string, unknown>;
    limits?: Record<string, number>;
  }
  const cases: Case[] = [
    {
      case: 'valid',
      what: 'LSUNPI\'s FULL interface bundle, untouched',
      url: `${FIXTURE_BASE}valid/index.json`,
      build: (d, url) => assembleBundle({ ...base, outDir: d, url }).commitment,
      expected: { status: 'verified', level1: 'passed', level2: 'passed', level3: 'passed', reason: null },
    },
    {
      case: 'tampered-file',
      what: 'the valid bundle with one listed file changed after index.json was written (a line appended to src/generated/LSUNPI.compact): index.json and the event still agree, the file\'s sha256 does not',
      url: `${FIXTURE_BASE}tampered-file/index.json`,
      build: (d, url) => {
        const c = assembleBundle({ ...base, outDir: d, url }).commitment;
        appendFileSync(path.join(d, 'src', 'generated', 'LSUNPI.compact'), '// tampered after publication\n');
        return c;
      },
      expected: { status: 'failed', level1: 'failed', level2: 'not_run', level3: 'not_run', reason: 'src/generated/LSUNPI.compact: sha256 differs from index.json' },
    },
    {
      case: 'wrong-hash',
      what: 'the valid bundle whose index.json "hash" is not the event\'s commitment (it carries the commitment of the valid case instead); the event carries the true commitment of the listed files. Level 1 fails on the first request: no other file may be fetched',
      url: `${FIXTURE_BASE}wrong-hash/index.json`,
      build: (d, url) => {
        const c = assembleBundle({ ...base, outDir: d, url }).commitment;
        const indexPath = path.join(d, 'index.json');
        const index = JSON.parse(readFileSync(indexPath, 'utf8')) as { hash: string };
        const valid = hash.readIndexFile(path.join(dir, 'valid', 'bundle')).hash;
        if (valid === index.hash) throw new Error('wrong-hash: the two commitments coincide');
        writeFileSync(indexPath, JSON.stringify({ ...index, hash: valid }, null, 2) + '\n');
        return c;
      },
      expected: { status: 'failed', level1: 'failed', level2: 'not_run', level3: 'not_run', reason: 'index.json hash differs from the event commitment; nothing but index.json requested' },
    },
    {
      case: 'over-size-cap',
      what: `the valid bundle plus one more LISTED file, out/padding.bin (${TEST_BYTE_CAP + 1} zero bytes), so the bundle is larger than a ${TEST_BYTE_CAP}-byte cap; index.json re-written, consistent. With that cap: unchecked (a limit, never invalid). With no cap below its size it verifies like the valid case`,
      url: `${FIXTURE_BASE}over-size-cap/index.json`,
      build: (d, url) => {
        assembleBundle({ ...base, outDir: d, url });
        writeFileSync(path.join(d, 'out', 'padding.bin'), Buffer.alloc(TEST_BYTE_CAP + 1));
        return hash.writeIndex(d).commitment;
      },
      limits: { maxBundleBytes: TEST_BYTE_CAP },
      expected: { status: 'unchecked', level1: 'not_run', level2: 'not_run', level3: 'not_run', reason: `size cap: the bundle is larger than ${TEST_BYTE_CAP} bytes` },
    },
    {
      case: 'loopback-host',
      what: 'the valid bundle, published under a URL on a loopback address (127.0.0.1). An unattended verifier refuses the host after resolving it, before any request',
      url: 'http://127.0.0.1/fixtures/loopback-host/index.json',
      build: (d, url) => assembleBundle({ ...base, outDir: d, url }).commitment,
      expected: { status: 'unfetchable', level1: 'not_run', level2: 'not_run', level3: 'not_run', reason: 'private or loopback address (127.0.0.1)' },
    },
    {
      case: 'compiler-not-installed',
      what: 'the valid bundle, but its package.json (and so index.json "compiler") names compactc 0.33.0, a version installed nowhere here; its keys are the real ones. Levels 1 and 2 pass; Level 3 is not run (no such compiler)',
      url: `${FIXTURE_BASE}compiler-not-installed/index.json`,
      build: (d, url) => assembleBundle({ ...base, outDir: d, url, pins: { compiler: '0.33.0', language: '0.26.0', runtime: '0.19.0' } }).commitment,
      expected: { status: 'verified', level1: 'passed', level2: 'passed', level3: 'not_run', reason: 'compiler 0.33.0 unavailable' },
    },
  ];

  const summary: unknown[] = [];
  const hashes: Record<string, string> = {};
  for (const c of cases) {
    const bundleDir = path.join(dir, c.case, 'bundle');
    mkdirSync(path.dirname(bundleDir), { recursive: true });
    const commitment = c.build(bundleDir, c.url);
    const payload = hash.assemblePayload(commitment, c.url);
    const index = JSON.parse(readFileSync(path.join(bundleDir, 'index.json'), 'utf8')) as { hash: string };
    const entry = {
      case: c.case,
      what: c.what,
      contract: 'LSUNPI',
      bundle: `${c.case}/bundle`,
      url: c.url,
      urlBytes: Buffer.byteLength(c.url),
      commitment: commitment.toString('hex'),
      indexHash: index.hash,
      eventPayloadHex: payload.toString('hex'),
      partsHex: hash.payloadParts(payload).map((p) => p.toString('hex')),
      bundleBytes: bytesOf(bundleDir),
      files: hash.walk(bundleDir).length,
      state: 'LSUNPI.state.hex',
      ...(c.limits ? { limits: c.limits } : {}),
      expected: c.expected,
    };
    summary.push(entry);
    for (const f of hash.walk(bundleDir)) hashes[`fixtures/bundles/${c.case}/bundle/${f}`] = sha256(readFileSync(path.join(bundleDir, f)));
  }
  const casesText = json({
    $comment: 'GENERATED by scripts/export-fixtures.ts. Public-interface bundles for the token indexer\'s verification tests, all built from LSUNPI (contracts/generated/LSUNPI.compact, compactc 0.34.0) with public-interface-deploy-check\'s assembler (tools/public-interface, patched), each under its own URL. Serve `<case>/bundle/` at `url` (the local stack: resources/00024-local-stack/bundles/fixtures/<case>/), publish `partsHex` from an LSUNPI instance (or pass eventPayloadHex directly), and verify against LSUNPI.state.hex (LSUNPI\'s simulated state: its keys). `expected` is the outcome spec 00024 FR-010-FR-013 asks of an unattended verifier (the indexer); the reference public-interface-verify differs on policy only — it fetches loopback hosts and runs Level 3 with a mismatched compiler, reporting versionMismatch. `limits` names the cap a case is built to exceed.',
    stateSha256: sha256(sim.state),
    cases: summary,
  });
  writeFileSync(path.join(dir, 'cases.json'), casesText);
  hashes['fixtures/bundles/cases.json'] = sha256(casesText);
  hashes['fixtures/bundles/LSUNPI.state.hex'] = sha256(readFileSync(path.join(dir, 'LSUNPI.state.hex')));
  return { hashes, summary };
}

// ---------------------------------------------------------------------------
// SOURCE.md
// ---------------------------------------------------------------------------

const INPUTS = [
  'deployments/reference-set.json',
  'deployments/public-interface-set.json',
  'deployments/generated-matrix.json',
  'deployments/dual-set.json',
  'deployments/dual-matrix.json',
  'deployments/bundles.json',
  'scripts/generate-pi-contracts.ts',
  'scripts/generate-du-contracts.ts',
  'scripts/du-interfaces.ts',
  'scripts/bundle.ts',
  'scripts/simulate-pi.ts',
  'scripts/export-fixtures.ts',
  'contracts/TokenMetadata.compact',
  'contracts/OffChainInterface.compact',
  'contracts/generated/LSUNPI.compact',
  'contracts/generated/SSTARPI.compact',
  'contracts/generated/CNSTPI.compact',
  'contracts/generated/UPROMPI.compact',
  'contracts/generated/SNEBDU.compact',
  'contracts/generated/LMOONDU.compact',
  'contracts/generated/UMETDU.compact',
  'contracts/generated/DAURDU.compact',
  'contracts/interfaces/SNEBDU.Interface.compact',
  'contracts/interfaces/LMOONDU.Interface.compact',
  'contracts/interfaces/UMETDU.Interface.compact',
  'contracts/interfaces/DAURDU.Interface.compact',
];

/** One digest over every committed file of a compiled contract (sorted paths; proving keys are not committed). */
function managedDigest(id: string): string {
  const dir = path.join(ROOT, 'contracts', 'managed', id);
  const files: string[] = [];
  const visit = (d: string) => {
    for (const n of readdirSync(d).sort()) {
      const p = path.join(d, n);
      if (statSync(p).isDirectory()) visit(p);
      else if (!n.endsWith('.prover') && !n.endsWith('.bzkir')) files.push(path.relative(dir, p));
    }
  };
  visit(dir);
  const h = createHash('sha256');
  for (const f of files.sort()) h.update(`${f}\0${sha256(readFileSync(path.join(dir, f)))}\n`);
  return h.digest('hex');
}

function sourceMd(title: string, intro: string, outputs: Record<string, string>, extra = ''): string {
  const rows = (o: Record<string, string>) => Object.entries(o).map(([f, h]) => `| \`${f}\` | \`${h}\` |`).join('\n');
  const inputs = Object.fromEntries(INPUTS.map((f) => [f, sha256(readFileSync(path.join(ROOT, f)))]));
  const managed = Object.fromEntries([
    ...readAllRows().map((r) => [`contracts/managed/${r.id}/`, managedDigest(r.id)]),
    ...readAllRows().filter((r) => (r as { interface?: string }).interface === 'HIDDEN').map((r) => [`contracts/managed/${r.id}.Interface/`, managedDigest(`${r.id}.Interface`)]),
  ]);
  return `# ${title} — provenance (GENERATED by scripts/export-fixtures.ts; do not edit)

${intro}

Regenerate: \`node --import tsx scripts/export-fixtures.ts\` — deterministic: two runs from the
same inputs give identical bytes (compare with the output hashes below). \`test/fixtures.test.ts\`
regenerates into a temporary directory and compares.

## Toolchain

| Piece | Version |
| --- | --- |
| Compact compiler (\`compact compile +0.34.0\`) | \`0.34.0\` (language \`0.26.0\`, runtime \`0.19.0\`) |
| \`@midnight-ntwrk/compact-runtime\` (the simulator) | \`0.19.0\` |
| Public-interface tools | \`tools/public-interface\` — [B] PR #6 \`1cf9477\` + UC-3 + UC-2 (see its SOURCE.md) |
| Emitter secret of the corpus (a public TEST value, never a real secret) | 32 × 0x42; constructor argument \`${Buffer.from(emitterSecretHashOf(TEST_EMITTER_SECRET)).toString('hex')}\` |
${extra}
## Inputs (SHA-256)

| File | SHA-256 |
| --- | --- |
${rows(inputs)}

Compiled artefacts (every committed file of \`contracts/managed/<ID>/\`, as one digest):

| Directory | Digest |
| --- | --- |
${rows(managed)}

## Outputs (SHA-256)

| File | SHA-256 |
| --- | --- |
${rows(outputs)}
`;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const out = argv[0] === '--out' ? path.resolve(argv[1] ?? '') : ROOT;
  const simHashes = await exportSimulator(out);
  const { hashes: bundleHashes, summary } = await exportBundles(out);
  writeFileSync(
    path.join(out, 'fixtures', 'simulator', 'SOURCE.md'),
    sourceMd(
      'fixtures/simulator',
      'The offline corpus of `acedward/mip-public-interfaces`: the PI set (`LSUNPI`, `SSTARPI`, `CNSTPI`, `UPROMPI`) and the DU set (`SNEBDU`, `LMOONDU`, `UMETDU`, `DAURDU`, spec 00024 §6.B) run step by step from `deployments/generated-matrix.json` and `deployments/dual-matrix.json` in the Compact simulator, verifier keys installed as a deploy installs them. `events.json`: every `Misc` event in emission order (`mip-0018:token-metadata[v1]` declarations — the PI set\'s `repository` only, the DU set\'s full twin metadata — and `mip-xxxx:public-interface[v1]` pointer parts) and the Multi-Part Event packages they form — UPROMPI\'s pointer and LMOONDU\'s `description` are 2-part packages, SNEBDU\'s `metadata` the 3-part one. `interfaces.json`: each contract\'s interface publication (form FULL or HIDDEN), its bundle (committed under `bundles/`), its circuits (verify-only = those taking a witness) and its final serialized state (the Level 2 input). Stand-ins: contract address `sha256("umbra:00024:<row>")`, one transaction per step `sha256("umbra:00024:sim:<row>:<step>")`, segment 1.',
      simHashes,
    ),
  );
  const caseRows = (summary as { case: string; url: string; bundleBytes: number; expected: { status: string; reason: string | null } }[])
    .map((c) => `| \`${c.case}\` | \`${c.url}\` | ${c.bundleBytes} | ${c.expected.status}${c.expected.reason ? ` — ${c.expected.reason}` : ''} |`).join('\n');
  writeFileSync(
    path.join(out, 'fixtures', 'bundles', 'SOURCE.md'),
    sourceMd(
      'fixtures/bundles',
      'Public-interface bundles for the token indexer\'s verification tests (sub-plan 02-B5; spec 00024 US1 scenarios 3-6, FR-010-FR-013), all built from LSUNPI so one state fits every case: `LSUNPI.state.hex` (LSUNPI\'s serialized state after its plan in the Compact simulator — the same bytes as `fixtures/simulator/interfaces.json`). `cases.json` gives, per case, the URL it is published under, the event payload (`partsHex`), the bundle size and the expected outcome of an unattended verifier.',
      bundleHashes,
      `\n## Cases\n\n| Case | URL | Bundle bytes | Expected (indexer) |\n| --- | --- | --- | --- |\n${caseRows}\n\nThe over-size-cap case is built to exceed a **${TEST_BYTE_CAP}-byte** bundle cap (\`limits.maxBundleBytes\` in cases.json); a verifier whose cap is larger verifies it like \`valid\` (it is a consistent bundle with one more listed file). The four PI bundles under \`bundles/\` are all far below that cap.\n`,
    ),
  );
  console.log(`fixtures/simulator: ${Object.keys(simHashes).length} files; fixtures/bundles: ${summary.length} cases`);
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? '')).href) {
  await main();
}
