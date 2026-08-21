import { supabase } from '../supabaseClient';
import type { OrderCategory } from '../types';

export type PricingConfig = Record<OrderCategory, number> & { minimum: number };

// Rueckfallwerte, falls die Preise (noch) nicht aus der DB geladen werden
// konnten (z. B. offline) - identisch zu den Standardwerten der
// Datenbank-Migration, damit ein Auftrag notfalls trotzdem sinnvoll bepreist wird.
const FALLBACK_PRICING: PricingConfig = {
  trinkfenster: 0.4,
  name: 0.2,
  refresh: 1.5,
  neue_weine: 1,
  ultra: 2.5,
  minimum: 3,
};

let cached: Promise<PricingConfig> | null = null;

async function fetchPricingConfig(): Promise<PricingConfig> {
  const { data, error } = await supabase
    .from('pricing_config')
    .select('trinkfenster_price, name_price, refresh_price, neue_weine_price, ultra_price, minimum_price')
    .eq('id', 1)
    .single();
  if (error || !data) return FALLBACK_PRICING;
  return {
    trinkfenster: data.trinkfenster_price,
    name: data.name_price,
    refresh: data.refresh_price,
    neue_weine: data.neue_weine_price,
    ultra: data.ultra_price,
    minimum: data.minimum_price,
  };
}

/** Startet das Laden der Preise im Hintergrund, bevor die Chat-Blase ueberhaupt geoeffnet wird. */
export function preloadPricingConfig() {
  if (!cached) cached = fetchPricingConfig();
}

export function getPricingConfig(): Promise<PricingConfig> {
  if (!cached) cached = fetchPricingConfig();
  return cached;
}

/**
 * Reine Rechenfunktion ohne DB-Zugriff - fuer die Live-Vorschau im Formular,
 * sobald die Preise einmal geladen sind. Skaliert progressiv statt linear
 * (Quadratwurzel der Flaschenzahl): bei einer sehr grossen Sammlung (z. B.
 * 1500 Flaschen) waere eine reine Linear-Rechnung masslos teuer, obwohl der
 * tatsaechliche Aufwand pro Flasche bei grossen Stapeln sinkt. Bei 1 Flasche
 * entspricht das genau dem Grundpreis, bei 100 Flaschen nur dem 10-fachen
 * (statt dem 100-fachen), bei 1500 nur dem ~39-fachen.
 */
export function computeOrderPrice(pricing: PricingConfig, category: OrderCategory, wineCount: number): number {
  const raw = pricing[category] * Math.sqrt(wineCount);
  return Math.max(pricing.minimum, Math.round(raw * 20) / 20); // auf 5 Rappen runden
}
