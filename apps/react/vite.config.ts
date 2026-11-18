import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// `base: './'` so the same build works from a web server and inside the Tauri webview (desktop / Android / iOS).
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // dev: leave "Server URL" empty and the API is reached through this proxy (no CORS needed)
    proxy: { '/v1': process.env.VITE_API_PROXY ?? 'http://localhost:8000' },
  },
  test: { environment: 'jsdom', globals: false },
});
