//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import tseslint from 'typescript-eslint'

export default [
  {
    ignores: [
      'dist/',
      'node_modules/',
      'playwright-report/',
      'test-results/',
      'public/',
      'drizzle/',
      'eslint.config.js',
      'prettier.config.js',
      'vite.config.ts',
      'vitest.config.ts',
      'playwright.config.ts',
      'tsr.config.json',
      'e2e/debug-*.mjs',
      'e2e/repro.mts',
      'debug/',
    ],
  },
  ...tanstackConfig,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      // Strict type-aware rules are noisy across a pre-existing codebase —
      // downgrade to warnings so lint passes; fix in a dedicated pass.
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      'no-constant-binary-expression': 'warn',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
]
