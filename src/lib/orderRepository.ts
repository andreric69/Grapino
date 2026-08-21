import { supabase } from '../supabaseClient';
import { computeOrderPrice, getPricingConfig } from './pricingConfig';
import type { EnrichmentOrder, OrderCategory } from '../types';

/** Nur Beschriftung/Beschreibung - die eigentlichen Preise kommen aus pricing_config (siehe pricingConfig.ts), vom Betreiber jederzeit in der Admin-App aenderbar. */
export const ORDER_CATEGORY_INFO: Record<OrderCategory, { label: string; description: string }> = {
  trinkfenster: {
    label: 'Nur Trinkfenster',
    description: 'Recherchiert und ergaenzt ausschliesslich das Trinkfenster (von/bis Jahr).',
  },
  name: {
    label: 'Nur Name',
    description: 'Prueft und korrigiert ausschliesslich Name/Bezeichnung des Weins.',
  },
  refresh: {
    label: 'Refresh (alles aktualisieren)',
    description: 'Aktualisiert alle recherchierbaren Angaben (Region, Rebsorte, Trinkfenster, Kritiker-Punkte etc.).',
  },
  neue_weine: {
    label: 'Für neue Weine',
    description: 'Basis-Ergaenzung fuer frisch importierte Weine ohne weitere Angaben.',
  },
  ultra: {
    label: 'Ultra Import Paket',
    description: 'Rundum-sorglos: Fotos, Regionen, Rebsorten, Trinkfenster, Kritiker-Punkte - alles.',
  },
};

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
