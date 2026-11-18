import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// `base: './'` so the same build works from a web server and inside the Tauri webview (desktop / Android / iOS).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    // dev: leave "Server URL" empty and the API is reached through this proxy (no CORS needed)
    proxy: { '/v1': process.env.VITE_API_PROXY ?? 'http://localhost:8000' },
  },
  test: { environment: 'jsdom', globals: false },
});
