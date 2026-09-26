// SPDX-License-Identifier: Apache-2.0
// A circuit that takes a witness has a private input, so it is not a read. The
// consumer cannot supply the input, and running it with a stub would answer a
// different question than the chain did, so the consumer tool never executes it.
// It is still an operation of the deployed contract with its own verifier key, so
// it can be VERIFIED: deploy-check accepts it and marks it verify-only, and
// Levels 1-3 pass on its bundle. (Patch UC-3 of project 00024: upstream refused
// such an interface at deploy-check.)
//
// The fixture exposes `transferFrom`, which derives the caller's account id from
// `wit_NonFungibleTokenSK` — so the compiled interface declares a witness.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assembleBundle } from '../src/bundle.mjs';
import { deployCheck, verifyOnlyCircuits } from '../src/deployer.mjs';
import { executeCircuit } from '../src/execute.mjs';
import { verify } from '../src/verify.mjs';
import { simulate } from '../scripts/simulate-deploy.mjs';
import { BUILD_HINT, COMPACT_HINT, compile, fullOut, hasCompact, openZeppelinTree, isBuilt, runSrc, scratch, userKeyArg } from './helpers.mjs';

const URL = 'https://example.invalid/nft/';
const WITNESS = /declares witness\(es\) wit_NonFungibleTokenSK[\s\S]*not reads and cannot be executed off chain/;

const source = (circuits) => [
  'pragma language_version >= 0.23.0;',
  'import CompactStandardLibrary;',
  'import "./NonFungibleTokenReadable" prefix M_;',
  'export { ContractAddress, Either, Maybe };',
  ...circuits,
  '',
].join('\n');

// `transferFrom` is a write and reaches the account-secret-key witness; it is here
// only so the suite has an interface that is NOT a read.
const TRANSFER_FROM = [
  'export circuit transferFrom(',
  '  fromAddress: Either<Bytes<32>, ContractAddress>,',
  '  to: Either<Bytes<32>, ContractAddress>,',
  '  tokenId: Uint<128>',
  '): [] {',
  '  return M_transferFrom(fromAddress, to, tokenId);',
  '}',
];
const OWNER_OF = [
  'export circuit ownerOf(tokenId: Uint<128>): Either<Bytes<32>, ContractAddress> {',
  '  return M_ownerOf(tokenId);',
  '}',
];

describe.skipIf(!hasCompact() || !isBuilt())(`circuits with witnesses are verify-only (${hasCompact() && isBuilt() ? 'ok' : `${COMPACT_HINT} / ${BUILD_HINT}`})`, () => {
  let s, src, out, mixedSrc, mixedOut;

  beforeAll(() => {
    s = scratch('witness');
    const c = openZeppelinTree(join(s.dir, 'tree'));
    src = join(c, 'Transferable.Interface.compact');
    writeFileSync(src, source(TRANSFER_FROM));
    out = compile(src, join(s.dir, 'out'));
    // A read and a write side by side: only the write takes the witness.
    mixedSrc = join(c, 'Mixed.Interface.compact');
    writeFileSync(mixedSrc, source([...OWNER_OF, ...TRANSFER_FROM]));
    mixedOut = compile(mixedSrc, join(s.dir, 'mixed-out'));
  });
  afterAll(() => s?.cleanup());

  it('the compiled interface declares the witness', () => {
    const info = JSON.parse(readFileSync(join(out, 'compiler', 'contract-info.json'), 'utf8'));
    expect(info.witnesses.map((w) => w.name)).toContain('wit_NonFungibleTokenSK');
    expect(info.circuits.map((c) => c.name)).toEqual(['transferFrom']);
  });

  it('deploy-check accepts it and marks the circuit that takes the witness verify-only', () => {
    const r = deployCheck({ interfaceSrc: src, interfaceOut: out, fullOut: fullOut('nft'), outDir: join(s.dir, 'bundle'), url: URL });
    expect(r.witnesses).toEqual(['wit_NonFungibleTokenSK']);
    expect(r.verifyOnly).toEqual(['transferFrom']);
    expect(r.rows).toEqual([{ circuit: 'transferFrom', status: 'IDENTICAL', reason: undefined }]);
    expect(r.payload).toHaveLength(256);
  });

  it('in a mixed interface only the circuit that reads the witness is verify-only (from its ZKIR)', () => {
    const r = deployCheck({ interfaceSrc: mixedSrc, interfaceOut: mixedOut, fullOut: fullOut('nft'), outDir: join(s.dir, 'mixed'), url: URL });
    expect(r.circuits.sort()).toEqual(['ownerOf', 'transferFrom']);
    expect(r.witnesses).toEqual(['wit_NonFungibleTokenSK']);
    expect(r.verifyOnly).toEqual(['transferFrom']);
    expect(r.rows.every((row) => row.status === 'IDENTICAL')).toBe(true);
    // Without declared witnesses nothing is verify-only; an unreadable ZKIR counts as verify-only.
    expect(verifyOnlyCircuits(mixedOut, ['ownerOf', 'transferFrom'], [])).toEqual([]);
    expect(verifyOnlyCircuits(join(s.dir, 'no-such-build'), ['ownerOf'], ['wit_NonFungibleTokenSK'])).toEqual(['ownerOf']);
  });

  it('the CLI reports the verify-only circuit', async () => {
    const r = await runSrc('deployer.mjs', ['--interface-src', src, '--interface', out, '--full', fullOut('nft'), '--out', join(s.dir, 'cli-bundle'), '--url', URL]);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/^verify-only : transferFrom — takes a witness \(wit_NonFungibleTokenSK\): verified at Levels 1-3, not executable by a consumer$/m);
    const j = await runSrc('deployer.mjs', ['--interface-src', src, '--interface', out, '--full', fullOut('nft'), '--out', join(s.dir, 'cli-json'), '--url', URL, '--json']);
    expect(j.code).toBe(0);
    expect(JSON.parse(j.stdout)).toMatchObject({ witnesses: ['wit_NonFungibleTokenSK'], verifyOnly: ['transferFrom'] });
  });

  it('its bundle passes Levels 1, 2 and 3 against the deployed contract', async () => {
    const r = deployCheck({ interfaceSrc: src, interfaceOut: out, fullOut: fullOut('nft'), outDir: join(s.dir, 'levels'), url: URL });
    const sim = await simulate('nft', { bundleDir: r.outDir, url: URL });
    expect(sim.payload.equals(r.payload)).toBe(true);
    const v = await verify({ bundleDir: r.outDir, eventPayload: sim.payload, stateBytes: sim.state, level: 3 });
    expect(v.checks.level1.ok).toBe(true);
    expect(v.checks.level2.ok).toBe(true);
    expect(v.checks.level2.rows).toEqual([{ circuit: 'transferFrom', status: 'OK', reason: undefined }]);
    expect(v.checks.level2.wrapper.ok).toBe(true);
    expect(v.checks.level3.ok).toBe(true);
    expect(v.level).toBe(3);
    expect(v.witnesses).toEqual(['wit_NonFungibleTokenSK']);
    expect(v.execution).toBeUndefined();
  });

  it('--circuit execution refuses it: the CLI exits 1 after the levels pass, and nothing runs', async () => {
    const r = deployCheck({ interfaceSrc: src, interfaceOut: out, fullOut: fullOut('nft'), outDir: join(s.dir, 'exec'), url: URL });
    const sim = await simulate('nft', { bundleDir: r.outDir, url: URL });
    const stateFile = join(s.dir, 'exec.state.hex');
    writeFileSync(stateFile, sim.state.toString('hex'));
    const cli = await runSrc('verify.mjs', [
      '--bundle', r.outDir, '--event-payload', sim.payload.toString('hex'), '--state', stateFile,
      '--circuit', 'transferFrom', '--args', userKeyArg('alice'), userKeyArg('bob'), '1',
    ]);
    expect(cli.code).toBe(1);
    expect(cli.stdout).toMatch(/^L2 OK   vk transferFrom$/m);
    expect(cli.stdout).toMatch(/^witnesses   : wit_NonFungibleTokenSK/m);
    expect(cli.stdout).toMatch(/^transferFrom\(.*\) was not executed: this bundle declares witness\(es\) wit_NonFungibleTokenSK/m);
    expect(cli.stdout).toMatch(/verified up to level 2/);

    const v = await verify({ bundleDir: r.outDir, eventPayload: sim.payload, stateBytes: sim.state, circuit: 'transferFrom', args: [userKeyArg('alice'), userKeyArg('bob'), '1'] });
    expect(v.level).toBe(2);
    expect(v.execution).toMatchObject({ circuit: 'transferFrom', ok: false, assertion: false, inputError: false });
    expect(v.execution.message).toMatch(WITNESS);
  });

  it('executeCircuit refuses such a bundle too, when called directly', async () => {
    const bundle = assembleBundle({ interfaceSrc: src, interfaceOut: out, outDir: join(s.dir, 'forced'), url: URL });
    expect(existsSync(join(bundle.outDir, 'out', 'keys', 'transferFrom.verifier'))).toBe(true);
    const sim = await simulate('nft', { bundleDir: bundle.outDir, url: URL });

    await expect(executeCircuit({
      bundleDir: bundle.outDir, stateBytes: sim.state, circuitName: 'transferFrom',
      args: ['alice', 'bob', '1'],
    })).rejects.toThrow(WITNESS);
  });

  it('the key it compiles to is still the deployed one — the refusal is about the input, not the code', () => {
    expect(readFileSync(join(out, 'keys', 'transferFrom.verifier'))
      .equals(readFileSync(join(fullOut('nft'), 'keys', 'transferFrom.verifier')))).toBe(true);
  });
});
