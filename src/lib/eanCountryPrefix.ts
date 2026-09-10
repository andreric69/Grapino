/**
 * GS1/EAN-Praefix -> Land, als unterster Rueckfall fuer die Barcode-Suche
 * (siehe barcodeLookup.ts). Jeder gueltige EAN/UPC-Barcode beginnt mit einem
 * von GS1 vergebenen, oeffentlich dokumentierten Laenderpraefix (genauer: das
 * Land der ausgebenden GS1-Mitgliedsorganisation - bei Wein in aller Regel
 * identisch mit dem Ursprungsland der Abfuellung). Das ist echtes,
 * dokumentiertes GS1-Datenmaterial, keine Vermutung.
 *
 * Diese Tabelle ist bewusst kein vollstaendiger Abgleich der gesamten
 * GS1-Praefixliste (die deckt auch etliche fuer Wein irrelevante Laender ab,
 * z.B. Japan, China, Suedkorea), sondern eine solide, gut begruendete Auswahl
 * mit Fokus auf tatsaechliche Wein-Erzeuger-/Exportlaender.
 *
 * Laendernamen bewusst auf Englisch gehalten, um konsistent mit den
 * bestehenden Referenzdaten zu bleiben (siehe z.B. "country"-Werte in
 * public/data/region-countries.json und public/data/producer-countries.json,
 * die ebenfalls englische Laendernamen verwenden, obwohl die App-Oberflaeche
 * deutschsprachig ist).
 */

export interface EanPrefixRange {
  /** Kleinster 3-stelliger Praefix dieser Spanne (inklusive). */
  min: number;
  /** Groesster 3-stelliger Praefix dieser Spanne (inklusive). */
  max: number;
  country: string;
}

// Sortiert nach `min`, keine Ueberlappungen. Quelle: oeffentlich dokumentierte
// GS1-Praefixzuteilung (GS1 General Specifications, "GS1 Company Prefix").
const EAN_COUNTRY_PREFIX_RANGES: EanPrefixRange[] = [
  { min: 0, max: 139, country: 'United States' }, // UPC-A (US/Kanada), nach Normalisierung
  { min: 300, max: 379, country: 'France' },
  { min: 380, max: 380, country: 'Bulgaria' },
  { min: 383, max: 383, country: 'Slovenia' },
  { min: 385, max: 385, country: 'Croatia' },
  { min: 387, max: 387, country: 'Bosnia and Herzegovina' },
  { min: 400, max: 440, country: 'Germany' },
  { min: 460, max: 469, country: 'Russia' },
  { min: 500, max: 509, country: 'United Kingdom' },
  { min: 520, max: 521, country: 'Greece' },
  { min: 528, max: 528, country: 'Lebanon' },
  { min: 529, max: 529, country: 'Cyprus' },
  { min: 535, max: 535, country: 'Malta' },
  { min: 540, max: 549, country: 'Belgium' },
  { min: 560, max: 560, country: 'Portugal' },
  { min: 569, max: 569, country: 'Iceland' },
  { min: 570, max: 579, country: 'Denmark' },
  { min: 590, max: 590, country: 'Poland' },
  { min: 594, max: 594, country: 'Romania' },
  { min: 599, max: 599, country: 'Hungary' },
  { min: 600, max: 601, country: 'South Africa' },
  { min: 611, max: 611, country: 'Morocco' },
  { min: 619, max: 619, country: 'Tunisia' },
  { min: 729, max: 729, country: 'Israel' },
  { min: 730, max: 739, country: 'Sweden' },
  { min: 754, max: 755, country: 'Canada' },
  { min: 760, max: 769, country: 'Switzerland' },
  { min: 770, max: 771, country: 'Colombia' },
  { min: 773, max: 773, country: 'Uruguay' },
  { min: 775, max: 775, country: 'Peru' },
  { min: 777, max: 777, country: 'Bolivia' },
  { min: 779, max: 779, country: 'Argentina' },
  { min: 780, max: 780, country: 'Chile' },
  { min: 784, max: 784, country: 'Paraguay' },
  { min: 786, max: 786, country: 'Ecuador' },
  { min: 789, max: 790, country: 'Brazil' },
  { min: 800, max: 839, country: 'Italy' },
  { min: 840, max: 849, country: 'Spain' },
  { min: 858, max: 858, country: 'Slovakia' },
  { min: 859, max: 859, country: 'Czech Republic' },
  { min: 860, max: 860, country: 'Serbia' },
  { min: 869, max: 869, country: 'Turkey' },
  { min: 870, max: 879, country: 'Netherlands' },
  { min: 900, max: 919, country: 'Austria' },
  { min: 930, max: 939, country: 'Australia' },
  { min: 940, max: 949, country: 'New Zealand' },
];

/**
 * Leitet aus den ersten Ziffern eines EAN/UPC-Barcodes ein Land ab (unterster
 * Rueckfall, siehe barcodeLookup.ts - nur genutzt, wenn Open Food Facts und
 * der Referenzdaten-Abgleich kein Land liefern konnten).
 *
 * Erwartet einen rein numerischen Code mit 6-14 Stellen (siehe EAN_LIKE in
 * useBarcodeLookup.ts). EAN-13-Codes werden direkt anhand ihrer ersten drei
 * Ziffern gegen die Praefix-Tabelle geprueft; ein 12-stelliger UPC-A-Code wird
 * zuvor durch Voranstellen einer "0" in die aequivalente EAN-13-Form
 * ueberfuehrt (Standard-Umrechnung UPC-A -> EAN-13). Fuer alle anderen
 * Laengen (z.B. EAN-8, das eine eigene, nicht kompatible Praefixvergabe
 * nutzt) wird bewusst nichts geraten, sondern `null` zurueckgegeben.
 */
export function lookupCountryFromEanPrefix(ean: string): string | null {
  if (!/^[0-9]{6,14}$/.test(ean)) return null;

  let normalized: string;
  if (ean.length === 13) {
    normalized = ean;
  } else if (ean.length === 12) {
    normalized = `0${ean}`;
  } else {
    return null;
  }

  const prefix = Number(normalized.slice(0, 3));
  if (!Number.isFinite(prefix)) return null;

  for (const range of EAN_COUNTRY_PREFIX_RANGES) {
    if (prefix >= range.min && prefix <= range.max) return range.country;
  }
  return null;
}
