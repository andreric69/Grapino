import type { Wine, WineInput, WineType } from '../types';

const VALID_WINE_TYPES: WineType[] = ['rot', 'weiss', 'rose', 'dessert', 'schaumwein'];
import { recordBackupNow } from './backupReminder';

/**
 * Laedt eine JSON-Sicherung aller Wein-Angaben herunter (ohne Fotos - die
 * liegen bereits dauerhaft im Supabase-Storage). Rein clientseitig, keine
 * zusaetzlichen Kosten. Gedacht als zusaetzliche, unabhaengige Kopie der
 * eigenen Daten.
 */
export function downloadWinesBackup(wines: Wine[]) {
  const payload = {
    exportedAt: new Date().toISOString(),
    count: wines.length,
    wines,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `weinsammlung-sicherung-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  recordBackupNow();
}

/**
 * Liest eine zuvor exportierte Sicherungsdatei (oder eine kompatible JSON-
 * Liste von Weinen) und liefert saubere WineInput-Objekte zum Importieren.
 * Wirft eine verstaendliche Fehlermeldung, wenn die Datei nicht passt.
 */
export async function parseWinesBackupFile(file: File): Promise<WineInput[]> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error('Diese Datei ist keine gueltige Sicherungsdatei (kein lesbares JSON).');
  }

  const list: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { wines?: unknown[] })?.wines)
      ? (raw as { wines: unknown[] }).wines
      : [];

  if (list.length === 0) {
    throw new Error('In dieser Datei wurden keine Weine gefunden.');
  }

  const wines: WineInput[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const name = typeof e.name === 'string' ? e.name.trim() : '';
    if (!name) continue;

    wines.push({
      name,
      producer: typeof e.producer === 'string' ? e.producer : null,
      vintage: typeof e.vintage === 'number' ? e.vintage : null,
      grape_variety: typeof e.grape_variety === 'string' ? e.grape_variety : null,
      region: typeof e.region === 'string' ? e.region : null,
      notes: typeof e.notes === 'string' ? e.notes : null,
      rating: typeof e.rating === 'number' ? e.rating : null,
      photo_url: typeof e.photo_url === 'string' ? e.photo_url : null,
      quantity: typeof e.quantity === 'number' && e.quantity >= 0 ? Math.round(e.quantity) : 1,
      is_favorite: typeof e.is_favorite === 'boolean' ? e.is_favorite : false,
      is_consumed: typeof e.is_consumed === 'boolean' ? e.is_consumed : false,
      price: typeof e.price === 'number' && e.price >= 0 ? e.price : null,
      wine_type:
        typeof e.wine_type === 'string' && VALID_WINE_TYPES.includes(e.wine_type as WineType)
          ? (e.wine_type as WineType)
          : null,
      country: typeof e.country === 'string' ? e.country : null,
      subregion: typeof e.subregion === 'string' ? e.subregion : null,
      bottle_size: typeof e.bottle_size === 'string' ? e.bottle_size : null,
      alcohol_content: typeof e.alcohol_content === 'number' ? e.alcohol_content : null,
      community_rating:
        typeof e.community_rating === 'number' && e.community_rating >= 0 && e.community_rating <= 5
          ? e.community_rating
          : null,
      critic_scores: typeof e.critic_scores === 'string' ? e.critic_scores : null,
      food_pairing: typeof e.food_pairing === 'string' ? e.food_pairing : null,
      drink_from: typeof e.drink_from === 'number' ? e.drink_from : null,
      drink_to: typeof e.drink_to === 'number' ? e.drink_to : null,
      is_wishlist: typeof e.is_wishlist === 'boolean' ? e.is_wishlist : false,
      storage_location: typeof e.storage_location === 'string' ? e.storage_location : null,
      tasting_tannin: typeof e.tasting_tannin === 'number' ? e.tasting_tannin : null,
      tasting_acidity: typeof e.tasting_acidity === 'number' ? e.tasting_acidity : null,
      tasting_sweetness: typeof e.tasting_sweetness === 'number' ? e.tasting_sweetness : null,
      tasting_body: typeof e.tasting_body === 'number' ? e.tasting_body : null,
      ean_code: typeof e.ean_code === 'string' ? e.ean_code : null,
      photo_urls: Array.isArray(e.photo_urls) ? e.photo_urls.filter((p): p is string => typeof p === 'string') : [],
      quantity_before_consumed: typeof e.quantity_before_consumed === 'number' ? e.quantity_before_consumed : null,
    });
  }

  if (wines.length === 0) {
    throw new Error('Keiner der Eintraege in dieser Datei hatte einen Namen - nichts zu importieren.');
  }

  return wines;
}
