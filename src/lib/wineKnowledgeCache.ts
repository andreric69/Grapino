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
   * true, wenn der Treffer nur ueber Name+Jahrgang gefunden wurde (kein
   * Produzent auf dem Etikett erkannt) - der Nutzer sollte die uebernommenen
   * Angaben dann noch bestaetigen, statt sie blind zu uebernehmen. false bei
   * einem vollen Name+Produzent+Jahrgang-Treffer (sichere Identitaet).
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
 * Schlaegt einen Wein im geteilten Wissens-Cache nach - liefert nur einen
 * Treffer, wenn irgendjemand (Admin-Recherche) diesen Wein schon einmal
 * untersucht hat. Kein Treffer ist der Normalfall und kein Fehler - bleibt
 * dann einfach leer, wie bisher.
 *
 * Zwei Stufen:
 * 1. Name + Produzent + Jahrgang exakt - sichere Identitaet, hohe Konfidenz.
 * 2. Nur wenn kein Produzent erkannt wurde (Etikett zeigt z. B. nur Name +
 *    Jahrgang): Name + Jahrgang OHNE Produzent-Einschraenkung - aber nur,
 *    wenn das GENAU EINEN Wein ergibt. Mehrere Treffer (unterschiedliche
 *    Produzenten mit demselben Weinnamen im selben Jahrgang) waeren nicht
 *    mehr eindeutig zuordenbar - dann lieber gar nichts vorschlagen als zu
 *    raten.
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
    let query = supabase.from('wine_knowledge_cache').select(SELECT_FIELDS).eq('name_key', nameKey).eq('producer_key', producerKey);
    query = vintage === null ? query.is('vintage', null) : query.eq('vintage', vintage);
    const { data, error } = await query.maybeSingle();
    if (!error && data) return rowToEntry(data as Row, false);
    return null;
  }

  // Kein Produzent auf dem Etikett erkannt - nur versuchen, wenn wenigstens
  // der Jahrgang bekannt ist (Name allein waere zu unspezifisch).
  if (vintage === null) return null;

  const { data, error } = await supabase
    .from('wine_knowledge_cache')
    .select(SELECT_FIELDS)
    .eq('name_key', nameKey)
    .eq('vintage', vintage)
    .limit(2);
  if (error || !data || data.length !== 1) return null;
  return rowToEntry(data[0] as Row, true);
}
