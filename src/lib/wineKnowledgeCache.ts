import { supabase } from '../supabaseClient';
import type { WineType } from '../types';

export interface WineKnowledgeEntry {
  producer: string | null;
  grapeVariety: string | null;
  region: string | null;
  subregion: string | null;
  country: string | null;
  wineType: WineType | null;
  drinkFrom: number | null;
  drinkTo: number | null;
  criticScores: string | null;
  foodPairing: string | null;
  /**
   * true, wenn der Treffer nicht ueber eine exakte Name+Produzent+Jahrgang-
   * Identitaet gefunden wurde (siehe Stufen unten) - der Nutzer sollte die
   * uebernommenen Angaben dann noch bestaetigen, statt sie blind zu
   * uebernehmen. false bei einer sicheren Identitaet.
   */
  uncertain: boolean;
}

const SELECT_FIELDS =
  'producer, grape_variety, region, subregion, country, wine_type, drink_from, drink_to, critic_scores, food_pairing';

interface Row {
  producer: string | null;
  grape_variety: string | null;
  region: string | null;
  subregion: string | null;
  country: string | null;
  wine_type: WineType | null;
  drink_from: number | null;
  drink_to: number | null;
  critic_scores: string | null;
  food_pairing: string | null;
}

function rowToEntry(row: Row, uncertain: boolean): WineKnowledgeEntry {
  return {
    producer: row.producer,
    grapeVariety: row.grape_variety,
    region: row.region,
    subregion: row.subregion,
    country: row.country,
    wineType: row.wine_type,
    drinkFrom: row.drink_from,
    drinkTo: row.drink_to,
    criticScores: row.critic_scores,
    foodPairing: row.food_pairing,
    uncertain,
  };
}

/**
 * Liefert den Wert eines Felds nur, wenn sich ALLE uebergebenen Zeilen einig
 * sind (Vergleich ohne Gross-/Kleinschreibung, leere/null Werte werden
 * ignoriert) - sonst null. Ein einzelner widerspruechlicher Eintrag reicht,
 * um das Feld zu verwerfen, statt zu raten.
 */
function agree<K extends keyof Row>(rows: Row[], key: K): Row[K] | null {
  let result: Row[K] | null = null;
  for (const row of rows) {
    const value = row[key];
    if (value === null || value === '') continue;
    if (result === null) {
      result = value;
    } else if (String(result).trim().toLowerCase() !== String(value).trim().toLowerCase()) {
      return null;
    }
  }
  return result;
}

/**
 * Fasst mehrere Cache-Zeilen desselben Weinnamens (ueber Jahrgaenge und ggf.
 * auch Produzenten hinweg) zu den Feldern zusammen, die sich bei einem
 * bestimmten Wein praktisch nie aendern (Rebsorte/Region/Land/Typ, ggf.
 * Produzent) - Trinkfenster/Kritiker-Punkte/Food-Pairing sind bewusst NIE
 * dabei, da die jahrgangsabhaengig sind. Widerspricht sich auch nur ein Feld
 * zwischen den Zeilen, wird es nicht uebernommen (siehe agree()).
 */
function mergeInvariantFields(rows: Row[], opts: { dropProducer: boolean; uncertain: boolean }): WineKnowledgeEntry | null {
  const grapeVariety = agree(rows, 'grape_variety');
  const region = agree(rows, 'region');
  const subregion = agree(rows, 'subregion');
  const country = agree(rows, 'country');
  const wineType = agree(rows, 'wine_type');
  const producer = opts.dropProducer ? null : agree(rows, 'producer');

  if (!grapeVariety && !region && !subregion && !country && !wineType && !producer) return null;

  return {
    producer,
    grapeVariety,
    region,
    subregion,
    country,
    wineType,
    drinkFrom: null,
    drinkTo: null,
    criticScores: null,
    foodPairing: null,
    uncertain: opts.uncertain,
  };
}

/**
 * Schlaegt einen Wein im geteilten Wissens-Cache nach - liefert nur einen
 * Treffer, wenn irgendjemand (Admin-Recherche) diesen Wein schon einmal
 * untersucht hat. Kein Treffer ist der Normalfall und kein Fehler - bleibt
 * dann einfach leer, wie bisher.
 *
 * Vier Stufen, von der sichersten zur unsichersten - jede folgende Stufe
 * greift nur, wenn die vorherige nichts gefunden hat:
 *
 * 1. Name + Produzent + Jahrgang exakt - sichere Identitaet, alle Felder
 *    inkl. Trinkfenster/Kritiker-Punkte.
 * 2. Name + Produzent stimmen, nur der Jahrgang weicht ab oder fehlt im
 *    Cache - Rebsorte/Region/Land/Typ aendern sich bei ein und demselben
 *    Wein so gut wie nie von Jahrgang zu Jahrgang, deshalb sicher genug zum
 *    Uebernehmen. Trinkfenster/Kritiker-Punkte/Food-Pairing bleiben leer
 *    (die sind echt jahrgangsabhaengig).
 * 3. Kein Produzent auf dem Etikett erkannt: Name + Jahrgang ohne
 *    Produzent-Einschraenkung - aber nur, wenn das GENAU EINEN Wein ergibt.
 * 4. Auch das ergab nichts (oder kein Jahrgang bekannt): nur der Name ist
 *    sicher - riskanteste Stufe, deshalb strengster Schutz: nur wenn sich
 *    ALLE Cache-Eintraege mit diesem Namen (ueber jeden Produzenten und
 *    Jahrgang hinweg) bei Rebsorte/Region/Land/Typ einig sind. Ein
 *    generischer Name wie "Reserve", der bei mehreren unabhaengigen
 *    Produzenten mit unterschiedlicher Herkunft vorkommt, faellt dadurch
 *    automatisch raus. Der Produzent wird auf dieser Stufe NIE uebernommen -
 *    das waere genau die Name/Produzent-Verwechslung, die hier vermieden
 *    werden soll.
 */
export async function lookupWineKnowledge(
  name: string,
  producer: string | null,
  vintage: number | null,
): Promise<WineKnowledgeEntry | null> {
  const nameKey = name.trim().toLowerCase();
  if (!nameKey) return null;
  const producerKey = (producer ?? '').trim().toLowerCase();

  if (producerKey) {
    let exactQuery = supabase.from('wine_knowledge_cache').select(SELECT_FIELDS).eq('name_key', nameKey).eq('producer_key', producerKey);
    exactQuery = vintage === null ? exactQuery.is('vintage', null) : exactQuery.eq('vintage', vintage);
    const { data: exact, error: exactError } = await exactQuery.maybeSingle();
    if (!exactError && exact) return rowToEntry(exact as Row, false);

    const { data: sameProducerRows, error: sameProducerError } = await supabase
      .from('wine_knowledge_cache')
      .select(SELECT_FIELDS)
      .eq('name_key', nameKey)
      .eq('producer_key', producerKey)
      .limit(20);
    if (!sameProducerError && sameProducerRows && sameProducerRows.length > 0) {
      const merged = mergeInvariantFields(sameProducerRows as Row[], { dropProducer: false, uncertain: false });
      if (merged) return merged;
    }
    return null;
  }

  // Kein Produzent auf dem Etikett erkannt.
  if (vintage !== null) {
    const { data, error } = await supabase
      .from('wine_knowledge_cache')
      .select(SELECT_FIELDS)
      .eq('name_key', nameKey)
      .eq('vintage', vintage)
      .limit(2);
    if (!error && data && data.length === 1) return rowToEntry(data[0] as Row, true);
  }

  const { data: nameOnlyRows, error: nameOnlyError } = await supabase
    .from('wine_knowledge_cache')
    .select(SELECT_FIELDS)
    .eq('name_key', nameKey)
    .limit(50);
  if (!nameOnlyError && nameOnlyRows && nameOnlyRows.length > 0) {
    return mergeInvariantFields(nameOnlyRows as Row[], { dropProducer: true, uncertain: true });
  }

  return null;
}
