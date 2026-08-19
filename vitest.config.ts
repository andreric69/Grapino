import { defineConfig } from 'vitest/config';

// Bewusst eine eigene Konfigurationsdatei statt vite.config.ts zu erweitern -
// so bleibt der Produktions-Build (PWA-Manifest, Workbox-Precache) komplett
// unberuehrt von der Test-Einrichtung.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
});
