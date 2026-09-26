import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // The compactc-generated modules and the ledger load WASM. This repository is
    // developed on a memory-tight shared host, so tests run in one forked process
    // at a time.
    pool: 'forks',
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
