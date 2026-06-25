import baseConfig from '../../eslint.config.mjs';

export default [
  {
    ignores: ['**/README.md', '**/dist/**', 'tsdown.config.ts'],
  },
  ...baseConfig,
  {
    // Public API abbreviations that are intentional and must not be renamed.
    // These are stable, exported names with broad prior art (e.g. DbError, isOk, isErr).
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'unicorn/prevent-abbreviations': [
        'error',
        {
          allowList: {
            Props: true,
            // Public API type names — stable exports, cannot be renamed
            DbError: true,
            DbErrorKind: true,
            toDbError: true,
            isOk: true,
            isErr: true,
            Doc: true,
            CollectionDef: true,
            IndexDef: true,
            Err: true,
            // Short identifiers that are intentionally terse in this domain
            err: true,
            ok: true,
            db: true,
            Db: true,
            // Test-local short names
            idx: true,
            idx1: true,
            idx2: true,
            uniqueDb: true,
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
            '{projectRoot}/rollup.config.{js,ts,mjs,mts,cjs,cts}',
            '{projectRoot}/vite.config.{js,ts,mjs,mts}',
            '{projectRoot}/vitest.config.{js,ts,mjs,mts}',
          ],
          ignoredDependencies: ['vitest', '@nx/vite', '@testcontainers/mongodb', 'tsdown'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];
