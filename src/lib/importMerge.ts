import type { Wine, WineInput } from '../types';

/** Kennzeichnet einen Wein eindeutig fuer den Duplikat-Abgleich beim Import (Name + Produzent + Jahrgang). */
function identityKey(w: { name: string; producer: string | null; vintage: number | null }): string {
  return `${w.name.trim().toLowerCase()}|${(w.producer ?? '').trim().toLowerCase()}|${w.vintage ?? ''}`;
}

/**
 * Fasst exakt gleiche Weine (Name + Produzent + Jahrgang) INNERHALB einer
 * Import-Liste zusammen, statt sie als mehrere Zeilen nebeneinander
 * anzulegen - die Mengen werden addiert. Genau das hat beim
 * Vivino-CSV-Import gefehlt: jede Flasche stand als eigene Zeile drin.
 */
export function mergeDuplicatesWithinBatch(wines: WineInput[]): WineInput[] {
  const map = new Map<string, WineInput>();
  for (const w of wines) {
    const key = identityKey(w);
    const existing = map.get(key);
    if (existing) {
      existing.quantity += w.quantity;
    } else {
      map.set(key, { ...w });
    }
  }
  return Array.from(map.values());
}

/** Baut eine Nachschlage-Map ueber die bereits vorhandenen (aktiven) Weine fuer den Abgleich gegen den Import. */
export function buildExistingActiveIndex(wines: Wine[]): Map<string, Wine> {
  const index = new Map<string, Wine>();
  for (const w of wines) {
    if (w.is_consumed || w.is_wishlist) continue;
    index.set(identityKey(w), w);
  }
  return index;
}

export function findExistingMatch(wine: WineInput, index: Map<string, Wine>): Wine | undefined {
  if (wine.is_wishlist) return undefined; // Wunschlisten-Importe nie mit Bestand vermischen
  return index.get(identityKey(wine));
}
