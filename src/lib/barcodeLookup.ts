import { matchWineReferences, lookupCountryForRegion } from './wineReference';
import type { WineType } from '../types';

export interface BarcodeProductInfo {
  name?: string;
  producer?: string;
  bottleSize?: string;
  region?: string;
  country?: string;
  grapeVariety?: string;
  wineType?: WineType;
  /** Produktfoto von Open Food Facts, falls vorhanden - nur ein Vorschlag, wird nie automatisch uebernommen. */
  imageUrl?: string;
}

const CATEGORY_TYPE_MAP: Array<{ type: WineType; pattern: RegExp }> = [
  { type: 'rot', pattern: /red wine/i },
  { type: 'weiss', pattern: /white wine/i },
  { type: 'rose', pattern: /ros[eé] wine/i },
  { type: 'schaumwein', pattern: /(sparkling wine|champagne|prosecco|cava)/i },
  { type: 'dessert', pattern: /(dessert wine|port wine|sweet wine)/i },
];

/**
 * Fragt Open Food Facts ab (kostenlose, offene Produktdatenbank, kein API-Key
 * noetig) - liefert bestenfalls Name/Produzent/Flaschengroesse und, ueber den
 * bereits vorhandenen Referenzdaten-Abgleich, Region/Land/Rebsorte/Typ.
 * Abdeckung ist bei Wein sehr unterschiedlich: gut bei gaengigen
 * Supermarkt-Weinen (v.a. franzoesisch), oft leer bei Boutique-/Sammlerweinen
 * - genau wie bei der Foto-Erkennung faellt das dann sauber auf manuelle
 * Eingabe zurueck, es wird nichts erfunden.
 */
export async function lookupBarcodeProduct(ean: string): Promise<BarcodeProductInfo | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(ean)}.json?fields=product_name,brands,quantity,categories,origins,image_url,image_front_url`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product as {
      product_name?: string;
      brands?: string;
      quantity?: string;
      categories?: string;
      origins?: string;
      image_url?: string;
      image_front_url?: string;
    };

    const result: BarcodeProductInfo = {};
    if (p.product_name) result.name = p.product_name;
    if (p.brands) result.producer = p.brands.split(',')[0].trim();
    if (p.quantity) result.bottleSize = p.quantity;
    if (p.image_front_url || p.image_url) result.imageUrl = p.image_front_url ?? p.image_url;

    if (p.categories) {
      for (const { type, pattern } of CATEGORY_TYPE_MAP) {
        if (pattern.test(p.categories)) {
          result.wineType = type;
          break;
        }
      }
    }

    // Kombinierten Text durch denselben Wikidata-Referenzabgleich schicken,
    // der auch fuer die Foto-Erkennung genutzt wird - findet echte
    // Rebsorten/Regionen im Text, statt nur Rohtext zu uebernehmen.
    const combinedText = [p.categories, p.origins, p.product_name].filter(Boolean).join(' ');
    if (combinedText) {
      const refMatches = await matchWineReferences(combinedText);
      if (refMatches.region) result.region = refMatches.region;
      if (refMatches.grapeVariety) result.grapeVariety = refMatches.grapeVariety;
      if (!result.wineType && refMatches.wineType) result.wineType = refMatches.wineType;
      if (refMatches.region) {
        const country = await lookupCountryForRegion(refMatches.region);
        if (country) result.country = country;
      }
    }

    return result;
  } catch (e) {
    console.error('Barcode-Nachschlagen fehlgeschlagen:', e);
    return null;
  }
}
