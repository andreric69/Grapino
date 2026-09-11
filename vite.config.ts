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
        name: 'Grapino',
        short_name: 'Grapino',
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
        // Schnellzugriffe beim langen Druecken/Rechtsklick auf das Home-
        // Bildschirm-Icon (Android/Desktop-PWA - iOS ignoriert das bislang,
        // schadet dort aber nicht). Bewusst nur die 3 haeufigsten Einstiege,
        // nicht jede Seite - sonst verliert das Menue seinen Schnellzugriffs-
        // Charakter.
        shortcuts: [
          {
            name: 'Neuen Wein hinzufügen',
            short_name: 'Neuer Wein',
            url: '/wine/new',
          },
          {
            name: 'Sammlung öffnen',
            short_name: 'Sammlung',
            url: '/',
          },
          {
            name: 'Statistik anzeigen',
            short_name: 'Statistik',
            url: '/statistik',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // Das Weinlexikon (~400KB) ist ein optionales Nachschlage-Feature,
        // kein Kernbestandteil - wird nur bei Bedarf geladen (normaler
        // Browser-Cache), damit die eigentliche App-Installation klein bleibt.
        globIgnores: ['data/wine-lexicon.json'],
        // Ohne das faengt der Service Worker JEDE Navigation (auch Klicks auf
        // /Grapino-Anleitung*.pdf) als SPA-Route ab und liefert statt der Datei
        // die App selbst aus ("Link geht nicht") - alles mit Dateiendung soll
        // stattdessen normal vom Netzwerk/Cache kommen.
        navigateFallbackDenylist: [/\.[a-zA-Z0-9]+$/],
      },
    }),
  ],
});
