import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// One place for every test of the repository. The app suite renders the React Native app with react-native-web in
// jsdom (set per file); the native-only modules are replaced by stubs.
export default defineConfig({
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      { find: 'expo-secure-store', replacement: here('./react/stubs/secure-store.ts') },
      { find: 'expo-status-bar', replacement: here('./react/stubs/status-bar.tsx') },
      { find: 'react-native-safe-area-context', replacement: here('./react/stubs/safe-area.tsx') },
      { find: /^.*global\.css$/, replacement: here('./react/stubs/empty.ts') },
    ],
  },
  test: { include: ['**/*.test.{ts,tsx}'], environment: 'node', globals: false, server: { deps: { inline: ['react-native-web'] } } },
});
