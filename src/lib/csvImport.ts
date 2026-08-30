import type { WineInput, WineType } from '../types';

export type MappableField =
  | 'ignore'
  | 'name'
  | 'producer'
  | 'vintage'
  | 'grape_variety'
  | 'region'
  | 'subregion'
  | 'country'
  | 'wine_type'
  | 'bottle_size'
  | 'rating'
  | 'community_rating'
  | 'critic_scores'
  | 'food_pairing'
  | 'quantity'
  | 'price'
  | 'notes';

export const FIELD_LABELS: Record<MappableField, string> = {
  ignore: '- ignorieren -',
  name: 'Name',
  producer: 'Produzent',
  vintage: 'Jahrgang',
  grape_variety: 'Rebsorte(n)',
  region: 'Region',
  subregion: 'Subregion',
  country: 'Herkunftsland',
  wine_type: 'Typ (Rot/Weiss/...)',
  bottle_size: 'Flaschengroesse',
  rating: 'Eigene Bewertung',
  community_rating: 'Durchschnittsbewertung',
  critic_scores: 'Auszeichnungen / Score',
  food_pairing: 'Passt zu',
  quantity: 'Anzahl Flaschen',
  price: 'Preis',
  notes: 'Notizen',
};

export const MAPPABLE_FIELDS: MappableField[] = [
  'ignore',
  'name',
  'producer',
  'vintage',
  'grape_variety',
  'region',
  'subregion',
  'country',
  'wine_type',
  'bottle_size',
  'rating',
  'community_rating',
  'critic_scores',
  'food_pairing',
  'quantity',
  'price',
  'notes',
];

// Reihenfolge zaehlt: spezifischere Muster (z. B. "community rating") muessen
// vor den allgemeineren (z. B. "rating") geprueft werden.
const AUTO_GUESS: Array<{ field: MappableField; pattern: RegExp }> = [
  { field: 'name', pattern: /\bwine\b|\bname\b|^wein$|bezeichnung|\btitle\b/i },
  { field: 'producer', pattern: /(winery|producer|produzent|weingut|hersteller|domaine|chateau)/i },
  { field: 'vintage', pattern: /(vintage|year|jahrgang|jahr)/i },
  { field: 'grape_variety', pattern: /(grape|variety|varietal|rebsorte|traube)/i },
  { field: 'subregion', pattern: /(subregion|sub-region|appellation)/i },
  { field: 'country', pattern: /(country|land|herkunftsland)/i },
  { field: 'region', pattern: /(region|herkunft)/i },
  { field: 'wine_type', pattern: /(^type$|wine\s*type|colou?r|farbe|^typ$)/i },
  { field: 'bottle_size', pattern: /(bottle\s*size|flaschengr|format)/i },
  { field: 'community_rating', pattern: /(community|average|durchschnitt|community\s*rating)/i },
  { field: 'critic_scores', pattern: /(critic|parker|suckling|falstaff|decanter|auszeichnung|score)/i },
  { field: 'food_pairing', pattern: /(pairing|passt\s*zu|food)/i },
  { field: 'rating', pattern: /(rating|bewertung|sterne|stars)/i },
  { field: 'quantity', pattern: /(quantity|bottles|anzahl|menge|flaschen)/i },
  { field: 'price', pattern: /(price|preis|kosten|cost)/i },
  { field: 'notes', pattern: /(note|comment|notiz|kommentar|bemerkung|review)/i },
];

export function guessField(header: string): MappableField {
  const h = header.trim();
  for (const { field, pattern } of AUTO_GUESS) {
    if (pattern.test(h)) return field;
  }
  return 'ignore';
}

// Bewusst NICHT auf den gesamten Zellinhalt verankert (kein ^...$) - Vivino-
// Exporte schreiben hier z. B. "Red Wine" statt nur "Red", ein exakter
// Volltreffer haette das nie erkannt und JEDE importierte Flasche waere ohne
// Typ geblieben. \b sorgt trotzdem dafuer, dass z. B. "rose" nicht in einem
// unverwandten laengeren Wort anschlaegt.
const WINE_TYPE_VALUE_MAP: Array<{ type: WineType; pattern: RegExp }> = [
  { type: 'schaumwein', pattern: /(sparkl|schaum|champagne|champagner|prosecco|cava|\bsekt\b)/i },
  { type: 'dessert', pattern: /(dessert|\bsweet\b|s[uü]ss|\bport\b|portwein)/i },
  { type: 'rose', pattern: /\bros[eé]\b/i },
  { type: 'rot', pattern: /\b(red|rot|rouge|rosso|tinto)\b/i },
  { type: 'weiss', pattern: /\b(white|weiss|weiß|blanc|bianco|blanco)\b/i },
];

function mapWineTypeValue(raw: string): WineType | null {
  const v = raw.trim();
  if (!v) return null;
  for (const { type, pattern } of WINE_TYPE_VALUE_MAP) {
    if (pattern.test(v)) return type;
  }
  return null;
}

/** Einfacher, robuster CSV-Parser: erkennt Trennzeichen automatisch (, oder ;), versteht Anfuehrungszeichen. */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^﻿/, '');
  const firstLine = s.split('\n', 1)[0] ?? '';
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < s.length) {
    const char = s[i];
    if (inQuotes) {
      if (char === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === delimiter) {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += char;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export function rowsToWineInputs(mapping: MappableField[], dataRows: string[][]): WineInput[] {
  const idxFor = (field: MappableField) => mapping.findIndex((m) => m === field);
  const nameIdx = idxFor('name');
  if (nameIdx === -1) return [];

  const producerIdx = idxFor('producer');
  const vintageIdx = idxFor('vintage');
  const grapeIdx = idxFor('grape_variety');
  const regionIdx = idxFor('region');
  const subregionIdx = idxFor('subregion');
  const countryIdx = idxFor('country');
  const wineTypeIdx = idxFor('wine_type');
  const bottleSizeIdx = idxFor('bottle_size');
  const ratingIdx = idxFor('rating');
  const communityRatingIdx = idxFor('community_rating');
  const criticScoresIdx = idxFor('critic_scores');
  const foodPairingIdx = idxFor('food_pairing');
  const quantityIdx = idxFor('quantity');
  const priceIdx = idxFor('price');
  const notesIdx = idxFor('notes');

  const wines: WineInput[] = [];
  for (const row of dataRows) {
    const name = (row[nameIdx] ?? '').trim();
    if (!name) continue;

    const vintageRaw = vintageIdx >= 0 ? (row[vintageIdx] ?? '') : '';
    const vintageMatch = vintageRaw.match(/(19|20)\d{2}/);
    const vintage = vintageMatch ? Number(vintageMatch[0]) : null;

    const ratingRaw = ratingIdx >= 0 ? (row[ratingIdx] ?? '').replace(',', '.').trim() : '';
    const ratingNum = ratingRaw ? Number(ratingRaw) : NaN;
    // Vivino nutzt 0 fuer "nie bewertet" - das darf nicht zu einer erfundenen
    // 1-Sterne-Bewertung hochgerundet werden, sondern bleibt unbewertet (null).
    const rating = Number.isFinite(ratingNum) && ratingNum > 0 ? Math.min(5, Math.max(1, Math.round(ratingNum))) : null;

    const communityRatingRaw = communityRatingIdx >= 0 ? (row[communityRatingIdx] ?? '').replace(',', '.').trim() : '';
    const communityRatingNum = communityRatingRaw ? Number(communityRatingRaw) : NaN;
    const community_rating = Number.isFinite(communityRatingNum)
      ? Math.min(5, Math.max(0, communityRatingNum))
      : null;

    const quantityRaw = quantityIdx >= 0 ? (row[quantityIdx] ?? '').replace(',', '.').trim() : '';
    const quantityNum = quantityRaw ? Number(quantityRaw) : NaN;
    const quantity = Number.isFinite(quantityNum) && quantityNum > 0 ? Math.round(quantityNum) : 1;

    const priceRaw = priceIdx >= 0 ? (row[priceIdx] ?? '').replace(/[^\d.,]/g, '').replace(',', '.').trim() : '';
    const priceNum = priceRaw ? Number(priceRaw) : NaN;
    const price = Number.isFinite(priceNum) && priceNum >= 0 ? priceNum : null;

    const wine_type = wineTypeIdx >= 0 ? mapWineTypeValue(row[wineTypeIdx] ?? '') : null;

    wines.push({
      name,
      producer: producerIdx >= 0 ? (row[producerIdx]?.trim() || null) : null,
      vintage,
      grape_variety: grapeIdx >= 0 ? (row[grapeIdx]?.trim() || null) : null,
      region: regionIdx >= 0 ? (row[regionIdx]?.trim() || null) : null,
      subregion: subregionIdx >= 0 ? (row[subregionIdx]?.trim() || null) : null,
      country: countryIdx >= 0 ? (row[countryIdx]?.trim() || null) : null,
      wine_type,
      bottle_size: bottleSizeIdx >= 0 ? (row[bottleSizeIdx]?.trim() || null) : null,
      alcohol_content: null,
      critic_scores: criticScoresIdx >= 0 ? (row[criticScoresIdx]?.trim() || null) : null,
      food_pairing: foodPairingIdx >= 0 ? (row[foodPairingIdx]?.trim() || null) : null,
      community_rating,
      notes: notesIdx >= 0 ? (row[notesIdx]?.trim() || null) : null,
      rating,
      photo_url: null,
      photo_urls: [],
      quantity,
      is_favorite: false,
      is_consumed: false,
      quantity_before_consumed: null,
      price,
      drink_from: null,
      drink_to: null,
      storage_location: null,
      tasting_tannin: null,
      tasting_acidity: null,
      tasting_sweetness: null,
      tasting_body: null,
      ean_code: null,
    });
  }
  return wines;
}
