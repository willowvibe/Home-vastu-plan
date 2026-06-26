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
      // S-12: no-explicit-any is now 'error'. The existing 67 sites (3rd-party
      // type defs in `sw-types.d.ts`, test mocks in `test/setup.ts` and
      // `useCanvasDrag.test.ts`, the `Room.tsx:54` B-13 cast, the shared
      // `PlanUpdateEvent.data` type, etc.) have all been cleaned up in this
      // PR — every `any` is now either a precise type or an `as unknown as T`
      // cast through `unknown`. Any NEW `any` now fails CI. (Q-9 remains
      // the proper long-term fix for the `PlanUpdateEvent.data` shape.)
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  }
);
