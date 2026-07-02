import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig(() => ({
  root: path.dirname(fileURLToPath(import.meta.url)),
  cacheDir: '../../node_modules/.vite/packages/zod-mongo',
  plugins: [nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  test: {
    name: 'zod-mongo',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    testTimeout: 30_000,
    hookTimeout: 90_000,
    coverage: {
      reportsDirectory: '../../coverage/packages/zod-mongo',
      provider: 'v8' as const,
      reporter: ['text', 'json-summary', 'json'],
      // Calibrated against actual coverage (statements 96.88 / branches 94.55 / funcs 98.03 / lines 96.88),
      // not aspirational — headroom absorbs incidental drift, branches stays tightest since it's what motivated this gate.
      thresholds: {
        statements: 92,
        branches: 90,
        functions: 94,
        lines: 92,
      },
    },
  },
}));
