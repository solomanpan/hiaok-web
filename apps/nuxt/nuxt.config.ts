// SPA build (`ssr: false`) so `nuxt generate` yields plain static files that the Tauri webview (desktop / Android / iOS) can load.
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  css: ['~/assets/styles.css'],
  app: {
    baseURL: './',
    buildAssetsDir: 'assets/',
    head: {
      title: 'hiaok',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }],
    },
  },
  router: { options: { hashMode: true } },
  // dev: leave "Server URL" empty and the API is reached through this proxy (no CORS needed)
  nitro: {
    devProxy: { '/v1': { target: process.env.NUXT_API_PROXY ?? 'http://localhost:8000', changeOrigin: true } },
  } as Record<string, unknown>,
  typescript: { strict: true },
});
