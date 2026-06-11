import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'server',
      'coverage',
      'vite.config.ts',
      'playwright.config.ts',
      'vitest.config.ts',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // S-12: the no-explicit-any rule is now ON (was off) so any new
      // `catch (error: any)` or stray `: any` fails the lint step. It is
      // still 'warn' (not 'error') for now because there are 30+ existing
      // uses in 3rd-party type defs (`sw-types.d.ts`), test mocks
      // (`test/setup.ts`, `useCanvasDrag.test.ts`), the `Room.tsx:54` B-13
      // cast, and the shared `PlanUpdateEvent.data` type (Q-9 is the
      // proper fix). Promoting to 'error' is a follow-up: fix the existing
      // 30+ sites in a separate PR, then flip this to 'error'.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  }
);
