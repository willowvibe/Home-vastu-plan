import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['src/test/**', 'node_modules/**'],
    // Q-5: gate merges on coverage. Thresholds are intentionally set just
    // below the current measured coverage (~18% lines, 11% functions, 14%
    // branches, 17% statements) so the gate doesn't immediately fail CI.
    // Tighten as the test suite grows; see the P2 Q-5 row in
    // docs/KNOWN_ISSUES.md for the long-term target (70% lines).
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,stories}.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        lines: 17,
        functions: 10,
        branches: 12,
        statements: 16,
      },
    },
  },
});
