import baseConfig from '../../eslint.config.mjs';

export default [
  {
    ignores: ['**/README.md', 'examples/**'],
  },
  ...baseConfig,
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
          ignoredDependencies: ['vitest', '@nx/vite', '@nestjs/testing'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    files: ['**/README.md/**'],
    rules: {
      // Markdown code blocks can have syntax that confuses parsers - disable all parsing
      'no-undef': 'off',
      'no-irregular-whitespace': 'off',
    },
  },
  {
    files: ['**/jest-e2e.json', '**/test/**/*.json'],
    rules: {
      // jest-e2e.json is a standard NestJS convention
      'unicorn/prevent-abbreviations': 'off',
    },
  },
];
