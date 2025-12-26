const { withNx } = require('@nx/rollup/with-nx');

module.exports = withNx(
  {
    main: './src/index.ts',
    outputPath: '../../dist/packages/nest-ts-valid-mongodb',
    tsConfig: './tsconfig.lib.json',
    compiler: 'tsc',
    format: ['cjs', 'esm'],
    assets: [
      { input: './packages/nest-ts-valid-mongodb', output: '.', glob: '*.md' },
      { input: './packages/nest-ts-valid-mongodb', output: '.', glob: 'LICENSE' },
      { input: './packages/nest-ts-valid-mongodb', output: '.', glob: 'package.json' },
    ],
  },
  {
    output: { sourcemap: true },
  },
);
