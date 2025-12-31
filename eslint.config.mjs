import nx from '@nx/eslint-plugin';
// eslint-disable-next-line import/default
import cspellConfigs from '@cspell/eslint-plugin/configs';
import js from '@eslint/js';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import importPlugin from 'eslint-plugin-import';
import eslintPluginJsonc from 'eslint-plugin-jsonc';
import markdownPlugin from 'eslint-plugin-markdown';
import pluginN from 'eslint-plugin-n';
import pluginPromise from 'eslint-plugin-promise';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// --- 1. CORE & IGNORANCE CONFIGURATIONS ---
const createIgnoreRules = () => ({
  ignores: [
    '**/dist/**',
    '**/node_modules/**',
    '.github/instructions/**',
    '**/*.timestamp*',
    '**/jest.config.ts',
    '**/vite.config.ts',
    '**/vitest.workspace.ts',
    '**/rollup.config.cjs',
  ],
});

const createGlobalConfiguration = () => ({
  languageOptions: {
    globals: { ...globals.browser, ...globals.node },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});

// --- 2. MONOREPO ARCHITECTURE (NX) ---
const createNxConfiguration = () => [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [String.raw`^.*/eslint(\.base)?\.config\.[cm]?[jt]s$`],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
];

// --- 3. TYPESCRIPT & JAVASCRIPT CORE ---
const createBaseJavaScriptRules = () => js.configs.recommended;

const createTypeScriptRules = () =>
  [
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
  ].map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['**/*.config.{js,ts,mts,cts,mjs,cjs}', '**/vitest.workspace.ts', '**/jest.preset.js'],
  }));

const createTypeScriptProjectConfiguration = () => ({
  files: ['**/*.ts', '**/*.tsx'],
  languageOptions: {
    parserOptions: {
      projectService: true,
    },
  },
  rules: {
    '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    '@typescript-eslint/require-await': ['warn'],
    '@typescript-eslint/no-extraneous-class': 'off',
    '@cspell/spellchecker': ['warn'],
  },
});

const createTypeScriptDisableForNonTSFiles = () => ({
  files: [
    '*.{cjs,js,mjs}',
    '**/*.{cjs,js,mjs}',
    '*.json',
    '**/*.json',
    '**/*.md',
    '**/*.md/*.{ts,tsx,js,jsx}',
  ],
  ...tseslint.configs.disableTypeChecked,
});

const createJavaScriptFileConfiguration = () => ({
  files: ['**/*.js', '**/*.jsx'],
  rules: {
    '@cspell/spellchecker': ['warn'],
  },
});

// --- 4. IMPORTS & ECOSYSTEM COMPATIBILITY ---
const createImportRules = () => [
  importPlugin.flatConfigs.typescript,
  importPlugin.flatConfigs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'import/default': ['off'],
      'import/order': [
        'error',
        {
          'alphabetize': { caseInsensitive: true, order: 'asc' },
          'groups': ['builtin', 'external', 'internal', ['sibling', 'parent'], 'index', 'unknown'],
          'newlines-between': 'always',
        },
      ],
    },
  },
];

const createImportResolverConfiguration = () => ({
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: [
          './tsconfig.base.json',
          'packages/*/tsconfig.json',
          'packages/*/tsconfig.lib.json',
          'packages/*/tsconfig.spec.json',
        ],
      },
      node: true,
    },
  },
});

const createNodeRules = () => ({
  ...pluginN.configs['flat/recommended'],
  rules: {
    ...pluginN.configs['flat/recommended'].rules,
    'n/no-missing-import': 'off',
  },
});

// --- 5. QUALITY OF LIFE ---
const createPromiseRules = () => pluginPromise.configs['flat/recommended'];

const createUnicornRules = () => ({
  ...eslintPluginUnicorn.configs.recommended,
  rules: {
    ...eslintPluginUnicorn.configs.recommended.rules,
    'unicorn/prevent-abbreviations': ['error', { allowList: { Props: true } }],
    'unicorn/text-encoding-identifier-case': 'off',
    'unicorn/filename-case': 'off',
    'unicorn/no-null': 'off',
    'unicorn/no-array-reduce': 'off',
  },
});

const createCommentsRules = () => comments.recommended;

// --- 6. SPECIFIC FILE TYPES ---
const createJsonRules = () => [...eslintPluginJsonc.configs['flat/recommended-with-jsonc']];

const createJsonConfiguration = () => ({
  files: ['**/*.json'],
  rules: {
    '@cspell/spellchecker': ['warn'],
    '@typescript-eslint/no-unused-expressions': 'off',
  },
});

const createMarkdownConfiguration = () => [
  {
    files: ['**/*.md'],
    plugins: { markdown: markdownPlugin },
    processor: 'markdown/markdown',
    rules: { 'unicorn/filename-case': 'off' },
  },
  {
    files: ['**/*.md/*.{ts,tsx,js,jsx}'],
    languageOptions: { parserOptions: { project: false } },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-undef': 'off',
      'no-console': 'off',
      'import/no-unresolved': 'off',
      'import/no-duplicates': 'off',
      'import/order': 'off',
      'n/no-missing-import': 'off',
      'n/no-unsupported-features/node-builtins': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/numeric-separators-style': 'off',
      'unicorn/prefer-top-level-await': 'off',
      '@cspell/spellchecker': 'off',
      '@nx/enforce-module-boundaries': 'off',
    },
  },
];

const createConfigurationFilesRules = () => ({
  files: ['**/tsconfig*.json', '**/*.config.{js,ts,mjs,cjs}'],
  rules: {
    'unicorn/prevent-abbreviations': 'off',
    'n/no-unpublished-import': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    'import/no-named-as-default-member': 'off',
  },
});

const createZodSchemasConfiguration = () => ({
  files: ['**/lib/schemas/**/*.ts', '**/lib/config/**/*.ts'],
  rules: {
    '@typescript-eslint/no-deprecated': 'off',
  },
});

const createTestingConfiguration = () => [
  {
    files: ['**/jest.config.{js,ts,mjs}', '**/jest.preset.{js,ts,mjs}'],
    rules: {
      '@eslint-community/eslint-comments/no-unlimited-disable': 'off',
      'unicorn/no-abusive-eslint-disable': 'off',
      'unicorn/prefer-module': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/tests/**/*.ts', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
];

// --- 7. FINAL POLISH ---
const createPrettierRules = () => eslintConfigPrettier;
const createSpellCheckRules = () => cspellConfigs.recommended;

// --- COMPOSITION ROOT ---
export default [
  createIgnoreRules(),
  createGlobalConfiguration(),

  // Architecture & Base
  ...createNxConfiguration(),
  createBaseJavaScriptRules(),

  // TypeScript Strictness
  ...createTypeScriptRules(),
  createTypeScriptProjectConfiguration(),
  createTypeScriptDisableForNonTSFiles(),

  // Imports & Node
  ...createImportRules(),
  createImportResolverConfiguration(),
  createNodeRules(),

  // Quality Assurance
  createPromiseRules(),
  createUnicornRules(),
  createCommentsRules(),
  createSpellCheckRules(),

  // Specific File Handlers
  ...createJsonRules(),
  createJsonConfiguration(),
  ...createMarkdownConfiguration(),
  createJavaScriptFileConfiguration(),
  createConfigurationFilesRules(),
  createZodSchemasConfiguration(),
  ...createTestingConfiguration(),

  // Formatting (Must be last)
  createPrettierRules(),
];
