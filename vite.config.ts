import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg'],
      manifest: {
        name: 'Grapani',
        short_name: 'Grapani',
        description: 'Private Weinsammlung',
        theme_color: '#7c2d3a',
        background_color: '#f3f2f2',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // Das Weinlexikon (~400KB) ist ein optionales Nachschlage-Feature,
        // kein Kernbestandteil - wird nur bei Bedarf geladen (normaler
        // Browser-Cache), damit die eigentliche App-Installation klein bleibt.
        globIgnores: ['data/wine-lexicon.json'],
      },
    }),
  ],
});
