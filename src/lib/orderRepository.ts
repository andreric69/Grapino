import { supabase } from '../supabaseClient';
import { computeOrderPrice, getPricingConfig } from './pricingConfig';
import type { EnrichmentOrder, OrderCategory } from '../types';

/**
 * Nur Beschriftung/Beschreibung - die eigentlichen Preise kommen aus
 * pricing_config (siehe pricingConfig.ts), vom Betreiber jederzeit in der
 * Admin-App aenderbar. "neue_weine" ist absichtlich nicht mehr in
 * SELECTABLE_ORDER_CATEGORIES (ChatBubble) - bleibt hier nur erhalten, damit
 * alte, bereits erledigte Auftraege mit dieser Kategorie noch korrekt
 * angezeigt werden.
 */
export const ORDER_CATEGORY_INFO: Record<OrderCategory, { label: string; description: string }> = {
  refresh: {
    label: 'Weine aktualisieren',
    description: 'Aktualisiert alle recherchierbaren Angaben (Region, Rebsorte, Trinkfenster, Kritiker-Punkte etc.) fuer die ausgewaehlten Weine.',
  },
  neue_weine: {
    label: 'Neue Weine (ohne Foto)',
    description: 'Fuer Weine, die du per Foto hinzugefuegt hast - Etikett ist schon da, ergaenzt nur Trinkfenster, Region, Rebsorte etc.',
  },
  ultra: {
    label: 'Import',
    description: 'Fuer importierte Weine ohne bisherige Angaben: alles wird neu recherchiert (Region, Rebsorte, Trinkfenster, Kritiker-Punkte) - deshalb aufwendiger. Ohne Foto: Fotos fuegen wir nur noch hinzu, wenn du selbst eins von der Flasche machst.',
  },
};

/** Einzige waehlbaren Kategorien beim NEUEN Auftrag - "neue_weine" bewusst ausgeblendet (siehe oben). */
export const SELECTABLE_ORDER_CATEGORIES: OrderCategory[] = ['refresh', 'ultra'];

export async function estimateOrderPrice(category: OrderCategory, wineCount: number): Promise<number> {
  const pricing = await getPricingConfig();
  return computeOrderPrice(pricing, category, wineCount);
}

export async function submitOrder(input: {
  category: OrderCategory;
  wineIds: string[];
  note: string | null;
}): Promise<void> {
  const estimated_price = await estimateOrderPrice(input.category, input.wineIds.length);
  const { error } = await supabase.from('enrichment_orders').insert({
    category: input.category,
    wine_ids: input.wineIds,
    wine_count: input.wineIds.length,
    estimated_price,
    note: input.note,
  });
  if (error) {
    console.error('Auftrag-Fehler:', error);
    throw new Error('Auftrag konnte nicht gesendet werden. Bitte Internetverbindung pruefen.');
  }
}

export async function listMyOrders(): Promise<EnrichmentOrder[]> {
  const { data, error } = await supabase
    .from('enrichment_orders')
    .select('id, created_at, category, wine_ids, wine_count, estimated_price, status, note')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Auftrag-Fehler:', error);
    return [];
  }
  return data as EnrichmentOrder[];
}
