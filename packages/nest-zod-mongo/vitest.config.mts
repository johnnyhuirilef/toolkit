import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig(() => ({
  root: path.dirname(fileURLToPath(import.meta.url)),
  cacheDir: '../../node_modules/.vite/packages/nest-zod-mongo',
  plugins: [nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  test: {
    name: 'nest-zod-mongo',
    watch: false,
    globals: true,
    environment: 'node',
    setupFiles: ['reflect-metadata'],
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    testTimeout: 30_000,
    hookTimeout: 90_000,
    coverage: {
      reportsDirectory: '../../coverage/packages/nest-zod-mongo',
      provider: 'v8' as const,
      reporter: ['text', 'json-summary', 'json'],
      // Calibrated against actual coverage (statements 88.46 / branches 92.18 / funcs 88.46 / lines 88.46),
      // not aspirational — headroom absorbs incidental drift, branches stays tightest since it's what motivated this gate.
      thresholds: {
        statements: 84,
        branches: 88,
        functions: 84,
        lines: 84,
      },
    },
  },
}));
