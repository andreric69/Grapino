/**
 * Klassische Rebsorte-zu-Speise-Kombinationen - allgemein bekannte, etablierte
 * Fachkenntnis (kein erfundenes/geratenes Wissen), analog zum Prinzip in
 * wineReference.ts. Deckt die ~30 gaengigsten Rebsorten ab, die auch
 * Wein-Einsteiger kennen - fuer alles andere lieber gar keinen Vorschlag
 * machen als eine unsichere Vermutung.
 *
 * Rein clientseitig, keine externen Daten, kein API-Call.
 */

import { splitCommaList } from '../types';

const COMBINING_MARKS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g');

function normalize(s: string): string {
  return s.normalize('NFD').replace(COMBINING_MARKS_REGEX, '').toLowerCase().trim();
}

// Werte bewusst kurz und allgemein gehalten, im Stil der bereits im Formular
// verwendeten Platzhalter/Beispielwerte (siehe WineFormPage.tsx, types.ts).
// Schluessel duerfen Umlaute/Akzente enthalten (lesbarer) - der Abgleich
// erfolgt weiter unten ausschliesslich ueber die normalisierte Form, siehe
// NORMALIZED_PAIRINGS.
const GRAPE_FOOD_PAIRINGS: Record<string, string> = {
  // Rotweinrebsorten
  'cabernet sauvignon': 'Rind, Lamm, gereifter Käse',
  merlot: 'Rind, Geflügel, Pasta mit Tomatensauce',
  'pinot noir': 'Geflügel, Lachs, Pilzgerichte',
  spätburgunder: 'Geflügel, Lachs, Pilzgerichte',
  syrah: 'Wild, Grillfleisch, würzige Schmorgerichte',
  shiraz: 'Wild, Grillfleisch, würzige Schmorgerichte',
  sangiovese: 'Pasta mit Tomatensauce, Pizza, Salami',
  tempranillo: 'Schinken, Lamm, gereifter Käse',
  nebbiolo: 'Trüffel, Schmorbraten, Risotto',
  malbec: 'Rind vom Grill, Steak, Chorizo',
  zinfandel: 'BBQ, Spareribs, würzige Wurst',
  grenache: 'Lamm, mediterrane Gerichte, Schmorgerichte',
  garnacha: 'Lamm, mediterrane Gerichte, Schmorgerichte',
  'cabernet franc': 'Geflügel, Lamm, Kräutergerichte',
  primitivo: 'BBQ, Spareribs, würzige Wurst',
  barbera: 'Pasta, Pizza, Antipasti',
  carmenere: 'Rind, gegrilltes Gemüse, würzige Gerichte',
  mourvedre: 'Wild, Schmorgerichte, Lamm',
  gamay: 'Charcuterie, leichte Fleischgerichte, Geflügel',
  'petit verdot': 'Rind, Wild, würzige Schmorgerichte',
  'touriga nacional': 'Lamm, Wild, gereifter Käse',
  aglianico: 'Schmorbraten, Wild, gereifter Käse',

  // Weissweinrebsorten
  riesling: 'Fisch, asiatische Küche, leicht scharfe Gerichte',
  chardonnay: 'Geflügel, Fisch in Sauce, Meeresfrüchte',
  'sauvignon blanc': 'Ziegenkäse, Meeresfrüchte, Salate',
  'pinot grigio': 'Fisch, leichte Vorspeisen, Meeresfrüchte',
  'pinot gris': 'Geflügel, Schweinefleisch, cremige Saucen',
  grauburgunder: 'Geflügel, Schweinefleisch, cremige Saucen',
  gewürztraminer: 'Asiatische Küche, Käse, würzige Gerichte',
  'chenin blanc': 'Geflügel, Fisch, leicht scharfe Gerichte',
  viognier: 'Geflügel, cremige Saucen, milde Gewürze',
  moscato: 'Obstdesserts, leichte Süssspeisen, Gebäck',
  muscat: 'Obstdesserts, leichte Süssspeisen, Gebäck',
  albariño: 'Meeresfrüchte, Fisch, leichte Vorspeisen',
  'grüner veltliner': 'Spargel, Salate, leichte Vorspeisen',
  sémillon: 'Meeresfrüchte, Geflügel, milde Käsesorten',
  verdejo: 'Meeresfrüchte, Fisch, leichte Vorspeisen',
  vermentino: 'Meeresfrüchte, Fisch, mediterrane Gerichte',
  silvaner: 'Spargel, Fisch, leichte Vorspeisen',
  'müller-thurgau': 'Leichte Vorspeisen, Fisch, Salate',
};

// Normalisierter Index (siehe normalize()) - so treffen z. B. sowohl
// "Spätburgunder" als auch "Spatburgunder" (Umlaut durch OCR/Tastatur
// verloren) denselben Eintrag, ohne jede Schreibweise einzeln pflegen zu
// muessen.
const NORMALIZED_PAIRINGS: Record<string, string> = Object.fromEntries(
  Object.entries(GRAPE_FOOD_PAIRINGS).map(([grape, pairing]) => [normalize(grape), pairing]),
);

const MAX_PAIRINGS = 4;

/**
 * Schlaegt eine klassische Speisenbegleitung anhand der Rebsorte(n) vor.
 * `grapeVarietyText` kann wie `grape_variety` eine kommagetrennte Liste
 * mehrerer Rebsorten sein (siehe splitCommaList) - die Vorschlaege der
 * erkannten Rebsorten werden dedupliziert kombiniert, auf hoechstens
 * MAX_PAIRINGS begrenzt. Liefert null, wenn keine der Rebsorten in der
 * kuratierten Liste bekannt ist - dann lieber gar kein Vorschlag als eine
 * unsichere Vermutung.
 */
export function lookupFoodPairingForGrape(grapeVarietyText: string): string | null {
  const grapes = splitCommaList(grapeVarietyText);
  if (grapes.length === 0) return null;

  const foods: string[] = [];
  for (const grape of grapes) {
    const pairing = NORMALIZED_PAIRINGS[normalize(grape)];
    if (!pairing) continue;
    for (const food of pairing.split(',').map((f) => f.trim())) {
      if (food && !foods.includes(food)) foods.push(food);
    }
  }

  if (foods.length === 0) return null;
  return foods.slice(0, MAX_PAIRINGS).join(', ');
}
