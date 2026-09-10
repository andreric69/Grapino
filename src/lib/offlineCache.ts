import type { Wine } from '../types';

// Namensgebung wie andere localStorage-Keys hier (z. B. 'weinsammlung-theme'
// in useTheme.ts) - eigener Namespace, damit nichts kollidiert.
const CACHE_KEY = 'weinsammlung-offline-cache';

export interface CachedWines {
  wines: Wine[];
  savedAt: string; // ISO timestamp
}

/**
 * Speichert die zuletzt erfolgreich geladene Sammlung lokal, damit sie beim
 * naechsten Laden ohne Verbindung trotzdem angezeigt werden kann. Rein
 * lesbare Metadaten (kein Fotos-Binaerdaten, nur Storage-Pfade) - selbst
 * einige tausend Weine passen damit locker in die ueblichen 5-10 MB, die ein
 * Browser pro Origin fuer localStorage erlaubt, ein Groessen-Check lohnt sich
 * darum nicht.
 */
export function saveWinesToCache(wines: Wine[]): void {
  try {
    const payload: CachedWines = { wines, savedAt: new Date().toISOString() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage kann voll, deaktiviert oder (privater Modus) blockiert
    // sein - der Cache ist nur eine Komfort-Funktion fuer den Offline-Fall,
    // ein Fehlschlag beim Schreiben darf die App nie stoeren.
  }
}

/**
 * Liest die zuletzt zwischengespeicherte Sammlung. Gibt null zurueck, wenn
 * nichts vorhanden, das JSON kaputt ist, oder die Form nicht mehr passt (z.
 * B. Rest von einer alten App-Version mit anderem Wine-Shape) - lieber "kein
 * Cache" melden, als der Seite fehlerhafte Daten unterzuschieben.
 */
export function loadWinesFromCache(): CachedWines | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedWines>;
    if (!Array.isArray(parsed.wines) || typeof parsed.savedAt !== 'string') return null;
    return { wines: parsed.wines, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}
