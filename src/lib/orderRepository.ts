import { supabase } from '../supabaseClient';
import type { EnrichmentOrder, OrderCategory } from '../types';

/** CHF pro Wein, je nach Auftragsart - Ausgangspunkt, vom Betreiber jederzeit anpassbar. */
export const ORDER_PRICING: Record<OrderCategory, { label: string; description: string; pricePerWine: number }> = {
  trinkfenster: {
    label: 'Nur Trinkfenster',
    description: 'Recherchiert und ergaenzt ausschliesslich das Trinkfenster (von/bis Jahr).',
    pricePerWine: 0.6,
  },
  name: {
    label: 'Nur Name',
    description: 'Prueft und korrigiert ausschliesslich Name/Bezeichnung des Weins.',
    pricePerWine: 0.4,
  },
  refresh: {
    label: 'Refresh (alles aktualisieren)',
    description: 'Aktualisiert alle recherchierbaren Angaben (Region, Rebsorte, Trinkfenster, Kritiker-Punkte etc.).',
    pricePerWine: 2.5,
  },
  neue_weine: {
    label: 'Für neue Weine',
    description: 'Basis-Ergaenzung fuer frisch importierte Weine ohne weitere Angaben.',
    pricePerWine: 1.5,
  },
  ultra: {
    label: 'Ultra Import Paket',
    description: 'Rundum-sorglos: Fotos, Regionen, Rebsorten, Trinkfenster, Kritiker-Punkte - alles.',
    pricePerWine: 4,
  },
};

export const ORDER_MINIMUM_PRICE = 5;

export function estimateOrderPrice(category: OrderCategory, wineCount: number): number {
  const raw = ORDER_PRICING[category].pricePerWine * wineCount;
  return Math.max(ORDER_MINIMUM_PRICE, Math.round(raw * 20) / 20); // auf 5 Rappen runden
}

export async function submitOrder(input: {
  category: OrderCategory;
  wineIds: string[];
  note: string | null;
}): Promise<void> {
  const estimated_price = estimateOrderPrice(input.category, input.wineIds.length);
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
