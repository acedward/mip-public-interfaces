/**
 * The bundle step (sub-plan 02-B2/B3): assemble each PI contract's public-interface bundle
 * with `public-interface-deploy-check` (the patched copy in tools/public-interface/, UC-2 +
 * UC-3) and record the pointer every contract publishes.
 *
 * FULL interfaces: the interface source IS the contract source
 * (`contracts/generated/<ID>.compact`), so the interface build is the contract's own build
 * (`contracts/managed/<ID>/`) and deploy-check compares it with itself — every key
 * IDENTICAL by construction. What deploy-check still decides here: every circuit has a
 * verifier key (no pure circuit), every file path is publishable, the witness circuits are
 * reported verify-only, and the payload is split into `publishBundle` parts. The
 * independent rebuild is Level 3 (`scripts/verify-bundles.sh`).
 *
 * The bundle's bytes depend on its URL (the bundle README names it), so the URL comes from
 * deployments/generated-matrix.json (`bundleBase` + `bundlePath`, public-interface-set.json);
 * no address or indexer is recorded, so a bundle does not depend on a deployment and the
 * same bytes serve every local run.
 *
 * Usage:
 *   node --import tsx scripts/bundle.ts                       # all four, into bundles/
 *   node --import tsx scripts/bundle.ts --mirror <dir>        # also copy each bundle to <dir>/<path>
 *                                                             # (the local stack's bundles/)
 *   node --import tsx scripts/bundle.ts --out-root <dir> [ID…] # elsewhere, no record (tests)
 *
 * Writes `bundles/<path>/` (committed: the exact bytes the static server serves) and
 * `deployments/bundles.json` (commitment, URL, payload and parts per contract).
 */
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..');
const MATRIX = path.join(ROOT, 'deployments', 'generated-matrix.json');
const RECORD = path.join(ROOT, 'deployments', 'bundles.json');

interface MatrixRow {
  id: string;
  bundle: { url: string; urlBytes: number; parts: number; path: string };
}

interface DeployCheckResult {
  outDir: string;
  url: string;
  commitment: Buffer;
  payload: Buffer;
  parts: Buffer[];
  circuits: string[];
  rows: { circuit: string; status: string }[];
  files: string[];
  bytes: number;
  indexBytes: number;
  interfaceRel: string;
  witnesses: string[];
  verifyOnly: string[];
  compact: { compiler: string; language: string; runtime: string; flags?: string[] };
}
type Deployer = {
  deployCheck(o: {
    interfaceSrc: string; interfaceOut: string; fullOut: string; outDir: string; url: string;
    extraFiles?: Record<string, string | Buffer>; interfaceKind?: 'full';
  }): DeployCheckResult;
};
type BundleLib = { resolveImports(src: string): string[]; commonRoot(paths: string[]): string };

/** One pinned upstream file, as the repository's SOURCE.md tables record it. */
interface Pin { upstream: string; url: string; commit: string; path: string; sha256: string; licence: string }

const cells = (line: string): string[] => line.split('|').slice(1, -1).map((c) => c.trim());
const ticked = (cell: string): string => /`([^`]+)`/.exec(cell)?.[1] ?? '';

/** The pins of contracts/SOURCE.md (the MIP-0018 module and [B]'s module) and of
 *  contracts/vendor/openzeppelin/SOURCE.md, keyed by the path under contracts/. */
function readPins(): Map<string, Pin> {
  const pins = new Map<string, Pin>();
  for (const line of readFileSync(path.join(ROOT, 'contracts', 'SOURCE.md'), 'utf8').split('\n')) {
    if (!/^\| `[^`]+\.compact` \|/.test(line)) continue;
    const c = cells(line);
    const url = /\]\((https:[^)]+)\)/.exec(c[1] ?? '')?.[1] ?? '';
    pins.set(ticked(c[0]!), { upstream: ticked(c[1]!), url, commit: ticked(c[2]!), path: ticked(c[3]!), sha256: ticked(c[5]!), licence: 'Apache-2.0' });
  }
  const oz = readFileSync(path.join(ROOT, 'contracts', 'vendor', 'openzeppelin', 'SOURCE.md'), 'utf8').split('\n');
  const tag = oz.find((l) => l.startsWith('| Tag / commit |'));
  const commit = /`([0-9a-f]{40})`/.exec(tag ?? '')?.[1] ?? '';
  for (const line of oz) {
    if (!/^\| `[^`]+\.compact` \| `contracts\/src\//.test(line)) continue;
    const c = cells(line);
    pins.set(`vendor/openzeppelin/${ticked(c[0]!)}`, {
      upstream: 'OpenZeppelin/compact-contracts', url: 'https://github.com/OpenZeppelin/compact-contracts', commit: `v0.4.0-alpha.3 (${commit})`,
      path: ticked(c[1]!), sha256: ticked(c[3]!), licence: 'MIT',
    });
  }
  return pins;
}

const B_NOTICE = 'compact-off-chain-circuits\nCopyright 2026 the compact-off-chain-circuits authors.';
const indent = (text: string): string => text.trimEnd().split('\n').map((l) => (l === '' ? '' : `    ${l}`)).join('\n');
const sha256Hex = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

/**
 * The licence material and provenance record a PI bundle ships (audit 02 E2-C1/C2): the
 * repository's LICENSE (Apache-2.0), a NOTICE naming every third-party file with the
 * attribution its licence asks for ([B]'s NOTICE; OpenZeppelin's MIT notice in full), and a
 * SOURCE.md with the origin, commit and SHA-256 of every file under src/. A bundled copy
 * that drifts from its pin fails here.
 */
export function licenceFiles(id: string, sources: string[], srcRoot: string): Record<string, string> {
  const pins = readPins();
  const rows: string[] = [];
  const third: { oz: string[]; b: string[]; a: string[] } = { oz: [], b: [], a: [] };
  for (const abs of sources) {
    const underContracts = path.relative(path.join(ROOT, 'contracts'), abs).split(path.sep).join('/');
    const inBundle = `src/${path.relative(srcRoot, abs).split(path.sep).join('/')}`;
    const digest = sha256Hex(readFileSync(abs));
    if (underContracts === `generated/${id}.compact`) {
      rows.push(`| \`${inBundle}\` | this repository, \`contracts/generated/${id}.compact\` (GENERATED by \`scripts/generate-pi-contracts.ts\`) | — | \`${digest}\` | Apache-2.0 |`);
      continue;
    }
    const pin = pins.get(underContracts);
    if (pin === undefined) throw new Error(`${id}: ${underContracts} has no provenance pin (contracts/SOURCE.md, contracts/vendor/openzeppelin/SOURCE.md)`);
    if (pin.sha256 !== digest) throw new Error(`${id}: ${underContracts} is ${digest}, its pin says ${pin.sha256}`);
    rows.push(`| \`${inBundle}\` | [\`${pin.upstream}\`](${pin.url}) \`${pin.path}\`, unmodified | \`${pin.commit}\` | \`${digest}\` | ${pin.licence} |`);
    (pin.licence === 'MIT' ? third.oz : pin.upstream.includes('public-interfaces') ? third.b : third.a).push(inBundle);
  }
  const ozLicence = readFileSync(path.join(ROOT, 'contracts', 'vendor', 'openzeppelin', 'LICENSE'), 'utf8');
  const notice = [
    `${id} public-interface bundle — https://github.com/acedward/mip-public-interfaces`,
    'Licensed under the Apache License, Version 2.0 (LICENSE), except the files named below.',
    'Every file under src/ is listed with its origin, commit and SHA-256 in SOURCE.md.',
    ...(third.b.length === 0 ? [] : ['', `${third.b.join(', ')}: from https://github.com/acedward/public-interfaces-for-compact-contracts,`,
      'Apache License, Version 2.0, whose NOTICE reads:', '', indent(B_NOTICE)]),
    ...(third.a.length === 0 ? [] : ['', `${third.a.join(', ')}: from https://github.com/acedward/mip-0018-midnight-contracts,`,
      'Apache License, Version 2.0.']),
    ...(third.oz.length === 0 ? [] : ['', `${third.oz.join(', ')}: OpenZeppelin Compact Contracts v0.4.0-alpha.3`,
      '(https://github.com/OpenZeppelin/compact-contracts), unmodified, under the MIT License:', '', indent(ozLicence)]),
    '',
  ].join('\n');
  const source = [
    `# Provenance of the files in this bundle (${id})`, '',
    `Assembled by \`public-interface-deploy-check\` (the Public Interfaces reference tools @ \`1cf9477\`, patched: \`tools/public-interface/SOURCE.md\` of https://github.com/acedward/mip-public-interfaces) from \`contracts/generated/${id}.compact\` and its build: \`out/\` is the output of \`compact compile +0.34.0\` with keys; \`package.json\`, \`README.md\` and \`index.json\` are written by the tool; \`LICENSE\`, \`NOTICE\` and this file by \`scripts/bundle.ts\`.`, '',
    '| File | Origin | Commit | SHA-256 | Licence |', '|---|---|---|---|---|', ...rows, '',
  ].join('\n');
  return { LICENSE: readFileSync(path.join(ROOT, 'LICENSE'), 'utf8'), NOTICE: notice, 'SOURCE.md': source };
}

export interface BundleRecord {
  id: string;
  url: string;
  urlBytes: number;
  parts: number;
  commitment: string;
  payloadHex: string;
  partsHex: string[];
  path: string;
  interface: string;
  files: number;
  bytes: number;
  indexBytes: number;
  circuits: string[];
  witnesses: string[];
  verifyOnly: string[];
  compiler: string;
}

export async function buildBundles(outRoot: string, ids: string[] = []): Promise<BundleRecord[]> {
  const { deployCheck } = (await import(path.join(ROOT, 'tools', 'public-interface', 'src', 'deployer.mjs'))) as Deployer;
  const { resolveImports, commonRoot } = (await import(path.join(ROOT, 'tools', 'public-interface', 'src', 'bundle.mjs'))) as BundleLib;
  const matrix = JSON.parse(readFileSync(MATRIX, 'utf8')) as { rows: MatrixRow[] };
  const rows = matrix.rows.filter((r) => ids.length === 0 || ids.includes(r.id));
  if (ids.length > 0 && rows.length !== ids.length) throw new Error(`unknown id(s) among ${ids.join(', ')}`);
  const records: BundleRecord[] = [];
  for (const row of rows) {
    const fullOut = path.join(ROOT, 'contracts', 'managed', row.id);
    if (!existsSync(path.join(fullOut, 'keys'))) throw new Error(`${row.id} is not compiled with keys: ./scripts/compile.sh generated/${row.id}`);
    const outDir = path.join(outRoot, ...row.bundle.path.split('/').filter(Boolean));
    mkdirSync(path.dirname(outDir), { recursive: true });
    const interfaceSrc = path.join(ROOT, 'contracts', 'generated', `${row.id}.compact`);
    const sources = [...resolveImports(interfaceSrc), path.resolve(interfaceSrc)];
    const r = deployCheck({
      interfaceSrc,
      interfaceOut: fullOut, // FULL: the interface is the contract
      fullOut,
      outDir,
      url: row.bundle.url,
      interfaceKind: 'full',
      extraFiles: licenceFiles(row.id, sources, commonRoot(sources)),
    });
    const bad = r.rows.filter((x) => x.status !== 'IDENTICAL');
    if (bad.length) throw new Error(`${row.id}: deploy-check rows ${JSON.stringify(bad)}`);
    if (r.url !== row.bundle.url) throw new Error(`${row.id}: url ${r.url} is not the planned ${row.bundle.url}`);
    if (r.parts.length !== row.bundle.parts) throw new Error(`${row.id}: ${r.parts.length} parts, the plan says ${row.bundle.parts}`);
    records.push({
      id: row.id,
      url: r.url,
      urlBytes: Buffer.byteLength(r.url, 'utf8'),
      parts: r.parts.length,
      commitment: r.commitment.toString('hex'),
      payloadHex: r.payload.toString('hex'),
      partsHex: r.parts.map((p) => p.toString('hex')),
      path: row.bundle.path,
      interface: r.interfaceRel,
      files: r.files.length,
      bytes: r.bytes,
      indexBytes: r.indexBytes,
      circuits: r.circuits,
      witnesses: r.witnesses,
      verifyOnly: r.verifyOnly,
      compiler: [`compactc ${r.compact.compiler}`, ...(r.compact.flags ?? [])].join(' '),
    });
    console.log(
      `${row.id.padEnd(8)} ${String(r.files.length).padStart(2)} files ${String(r.bytes).padStart(7)} B; ${r.circuits.length} circuits (verify-only: ${r.verifyOnly.join(', ') || '—'}); url ${Buffer.byteLength(r.url)} B, ${r.parts.length} part(s); commitment ${r.commitment.toString('hex')}`,
    );
  }
  return records;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let outRoot = path.join(ROOT, 'bundles');
  let mirror: string | undefined;
  let record = true;
  const ids: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--out-root') { outRoot = path.resolve(argv[++i] ?? ''); record = false; }
    else if (a === '--mirror') mirror = path.resolve(argv[++i] ?? '');
    else ids.push(a ?? '');
  }
  const records = await buildBundles(outRoot, ids);
  if (record) {
    if (ids.length > 0) throw new Error('the record covers every bundle: run without ids (or with --out-root)');
    writeFileSync(
      RECORD,
      `${JSON.stringify(
        {
          $comment:
            'GENERATED by scripts/bundle.ts: the public-interface pointer of each PI contract, as public-interface-deploy-check (tools/public-interface, patched: UC-2 multi-part, UC-3 witness circuits verify-only) computed it from bundles/<path>/. `payloadHex` = commitment ++ utf8(url), zero padded to 256·parts bytes; `partsHex` = the publishBundle arguments, in order, all in ONE guaranteed intent.',
          bundles: records,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    console.log(`\nwrote ${path.relative(ROOT, RECORD)} (${records.length} bundles)`);
  }
  if (mirror) {
    for (const r of records) {
      const from = path.join(outRoot, ...r.path.split('/').filter(Boolean));
      const to = path.join(mirror, ...r.path.split('/').filter(Boolean));
      rmSync(to, { recursive: true, force: true });
      mkdirSync(path.dirname(to), { recursive: true });
      cpSync(from, to, { recursive: true });
      console.log(`mirrored ${r.id} -> ${to}`);
    }
  }
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? '')).href) {
  await main();
}
