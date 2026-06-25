import baseConfig from '../../eslint.config.mjs';

export default [
  {
    ignores: ['**/README.md', '**/dist/**', 'tsdown.config.ts'],
  },
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'unicorn/prevent-abbreviations': [
        'error',
        {
          allowList: {
            Props: true,
            // Public API type names — stable exports re-exported from @ioni/zod-mongo
            DbError: true,
            DbErrorKind: true,
            toDbError: true,
            isOk: true,
            isErr: true,
            Doc: true,
            CollectionDef: true,
            IndexDef: true,
            Err: true,
            err: true,
            ok: true,
            db: true,
            Db: true,
          },
        },
      ],
    },
  },
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/vitest.config.{js,ts,mjs,mts}',
          ],
          ignoredDependencies: ['vitest', '@nx/vite', '@nx/rollup', '@testcontainers/mongodb', '@nestjs/testing', 'tsdown'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];
