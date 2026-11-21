import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// One place for every test of the repository. The React suite runs in jsdom (set per file).
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../apps/react/src', import.meta.url)) } },
  plugins: [react()],
  test: { include: ['**/*.test.{ts,tsx}'], environment: 'node', globals: false },
});
