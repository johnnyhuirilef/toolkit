import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/nest-ts-valid-mongodb',
  plugins: [nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  test: {
    name: 'nest-ts-valid-mongodb',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    testTimeout: 30000,
    hookTimeout: 90000,
    coverage: {
      reportsDirectory: '../../coverage/packages/nest-ts-valid-mongodb',
      provider: 'v8' as const,
      reporter: ['text', 'json-summary', 'json'], // <--- ADDED JSON for coverage-final.json
    },
  },
}));
