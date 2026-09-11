/**
 * Statische Liste der ueber den Schnellzugriff (QuickJumpSearch) erreichbaren
 * App-Seiten. Weine selbst sind NICHT hier drin - die werden live aus
 * listWines() durchsucht, siehe QuickJumpSearch.tsx.
 *
 * Die Routen muessen exakt zu App.tsx passen.
 */
export interface QuickJumpDestination {
  id: string;
  label: string;
  path: string;
  /** Ein paar zusaetzliche Suchbegriffe, unter denen ein Nutzer intuitiv danach suchen koennte (z. B. Synonyme). */
  keywords?: string[];
}

export const QUICK_JUMP_DESTINATIONS: QuickJumpDestination[] = [
  {
    id: 'sammlung',
    label: 'Sammlung',
    path: '/',
    keywords: ['weine', 'vorrat', 'start', 'startseite', 'home'],
  },
  {
    id: 'neuer-wein',
    label: 'Neuen Wein hinzufügen',
    path: '/wine/new',
    keywords: ['wein anlegen', 'flasche hinzufügen', 'neu', 'erfassen', 'scannen'],
  },
  {
    id: 'statistik',
    label: 'Statistik',
    path: '/statistik',
    keywords: ['auswertung', 'zahlen', 'uebersicht', 'analyse'],
  },
  {
    id: 'rueckblick',
    label: 'Rückblick',
    path: '/rueckblick',
    keywords: ['getrunken', 'trinkverlauf', 'historie', 'verlauf'],
  },
  {
    id: 'weinjahr',
    label: 'Weinjahr',
    path: '/weinjahr',
    keywords: ['jahresrückblick', 'jahresrueckblick', 'rekap', 'rueckblick jahr'],
  },
  {
    id: 'meilensteine',
    label: 'Meilensteine',
    path: '/meilensteine',
    keywords: ['erfolge', 'abzeichen', 'achievements', 'ziele'],
  },
  {
    id: 'lagerplan',
    label: 'Lagerplan',
    path: '/lagerplan',
    keywords: ['keller', 'regal', 'lagerort'],
  },
  {
    id: 'weinlexikon',
    label: 'Weinlexikon',
    path: '/lexikon',
    keywords: ['rebsorten', 'regionen', 'nachschlagen', 'lexikon'],
  },
  {
    id: 'drucken',
    label: 'Drucken',
    path: '/drucken',
    keywords: ['pdf', 'export', 'liste drucken'],
  },
  {
    id: 'entdecken',
    label: 'Entdecken',
    path: '/entdecken',
    keywords: ['uebersicht', 'mehr', 'menu'],
  },
  {
    id: 'einstellungen',
    label: 'Einstellungen',
    path: '/settings',
    keywords: ['settings', 'konto', 'profil', 'backup', 'import'],
  },
];
