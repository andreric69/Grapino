export type WineType = 'rot' | 'weiss' | 'rose' | 'dessert' | 'schaumwein';

export const WINE_TYPE_LABELS: Record<WineType, string> = {
  rot: 'Rot',
  weiss: 'Weiss',
  rose: 'Rose',
  dessert: 'Dessert',
  schaumwein: 'Schaumwein',
};

export interface Wine {
  id: string;
  created_at: string;
  user_id: string;
  name: string;
  producer: string | null;
  vintage: number | null;
  /** Eine oder mehrere Rebsorten, kommagetrennt (z. B. "Cabernet Sauvignon, Merlot"). */
  grape_variety: string | null;
  region: string | null;
  notes: string | null;
  /** Eigene Bewertung, 1-5 Sterne. */
  rating: number | null;
  /** Storage-Pfad (nicht die fertige URL) - z. B. "{user_id}/{wine_id}.jpg" */
  photo_url: string | null;
  /** Anzahl Flaschen dieses Weins - mehrere Flaschen desselben Weins sind ein Eintrag. */
  quantity: number;
  is_favorite: boolean;
  /** Als getrunken markiert - bleibt erhalten, erscheint aber im "Getrunken"-Bereich statt im Vorrat. */
  is_consumed: boolean;
  /** Preis pro Flasche - optional, ohne Waehrungsangabe (interpretiert der Nutzer selbst). */
  price: number | null;
  wine_type: WineType | null;
  /** Herkunftsland, z. B. "Frankreich". */
  country: string | null;
  /** Subregion, z. B. "Pauillac". */
  subregion: string | null;
  /** Flaschengroesse, z. B. "75cl" oder "1.5l". */
  bottle_size: string | null;
  /** Alkoholgehalt in % vol, z. B. 14.5. */
  alcohol_content: number | null;
  /** Externe Durchschnittsbewertung (z. B. Vivino-Community), 0-5, getrennt von der eigenen Bewertung. */
  community_rating: number | null;
  /** Freitext fuer Kritiker-Punkte, z. B. "Parker 94, James Suckling 96". */
  critic_scores: string | null;
  /** Passt zu ... - kommagetrennte Vorschlaege, z. B. "Rind, Lamm, Wild". */
  food_pairing: string | null;
  /** Trinkfenster von Jahr .. */
  drink_from: number | null;
  /** .. bis Jahr. */
  drink_to: number | null;
  /** Wunschliste statt eigener Bestand - zaehlt nicht in Statistik/Bestand. */
  is_wishlist: boolean;
  /** Lagerort, z. B. "Keller Regal 3". */
  storage_location: string | null;
  tasting_tannin: number | null;
  tasting_acidity: number | null;
  tasting_sweetness: number | null;
  tasting_body: number | null;
  /** EAN/Barcode, optional per Scan erfasst. */
  ean_code: string | null;
  /** Mehrere Fotos (Storage-Pfade). "photo_url" bleibt fuer Altdaten erhalten. */
  photo_urls: string[];
  /**
   * Bestand unmittelbar VOR dem Trink-Vorgang, der quantity auf 0 gebracht
   * hat (nur waehrend is_consumed relevant, sonst null) - damit "Zurueck in
   * den Vorrat" die tatsaechliche Anzahl (z. B. 6 auf einmal getrunkene
   * Flaschen) wiederherstellen kann statt immer nur 1 Flasche.
   */
  quantity_before_consumed: number | null;
}

export type WineInput = Omit<Wine, 'id' | 'created_at' | 'user_id'>;

export type SortOption = 'newest' | 'vintage' | 'name' | 'price' | 'rating' | 'drinkwindow';
export type SortDirection = 'asc' | 'desc';

/** Zerlegt ein kommagetrenntes Feld (Rebsorten, Passt-zu) in einzelne, getrimmte Werte. */
export function splitCommaList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export interface FeedbackInput {
  rating: number;
  message: string | null;
  tip_amount: number | null;
}

export interface ConsumptionLogEntry {
  id: string;
  consumed_at: string;
  wine_id: string | null;
  wine_name: string;
  region: string | null;
  grape_variety: string | null;
  wine_type: WineType | null;
}

export interface DeletionRequest {
  id: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Announcement {
  id: string;
  created_at: string;
  title: string;
  body: string;
  type: 'news' | 'update';
  /** Alle N Tage nach dem letzten Wegklicken erneut anzeigen - leer = nur einmalig. */
  repeat_every_days: number | null;
}

export interface MyFeedback {
  id: string;
  created_at: string;
  rating: number;
  message: string | null;
  tip_amount: number | null;
  reply: string | null;
  reply_created_at: string | null;
}

export type OrderCategory = 'refresh' | 'neue_weine' | 'ultra';

export interface EnrichmentOrder {
  id: string;
  created_at: string;
  category: OrderCategory;
  wine_ids: string[];
  wine_count: number;
  estimated_price: number;
  status: 'pending' | 'in_progress' | 'done' | 'cancelled';
  note: string | null;
}

export interface PaymentRequest {
  id: string;
  created_at: string;
  amount: number;
  reason: string;
  status: 'open' | 'paid' | 'cancelled';
  paid_at: string | null;
}

export interface UserMessage {
  id: string;
  created_at: string;
  category: 'allgemein' | 'vorschlag';
  message: string;
}
