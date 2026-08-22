import { supabase } from '../supabaseClient';

export interface WineKnowledgeEntry {
  drink_from: number | null;
  drink_to: number | null;
  critic_scores: string | null;
  food_pairing: string | null;
}

/**
 * Schlaegt einen Wein (Name+Produzent+Jahrgang) im geteilten Wissens-Cache
 * nach - liefert nur einen Treffer, wenn irgendjemand (Admin-Recherche)
 * diesen Wein schon einmal untersucht hat. Kein Treffer ist der Normalfall
 * und kein Fehler - bleibt dann einfach leer, wie bisher.
 */
export async function lookupWineKnowledge(
  name: string,
  producer: string | null,
  vintage: number | null,
): Promise<WineKnowledgeEntry | null> {
  const nameKey = name.trim().toLowerCase();
  if (!nameKey) return null;
  const producerKey = (producer ?? '').trim().toLowerCase();

  let query = supabase
    .from('wine_knowledge_cache')
    .select('drink_from, drink_to, critic_scores, food_pairing')
    .eq('name_key', nameKey)
    .eq('producer_key', producerKey);
  query = vintage === null ? query.is('vintage', null) : query.eq('vintage', vintage);

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data;
}
