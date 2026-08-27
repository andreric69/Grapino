import { supabase } from '../supabaseClient';
import type { OrderCategory } from '../types';

export type PricingConfig = Record<OrderCategory, number> & {
  standardMin: number;
  standardMax: number;
  ultraMin: number;
  ultraMax: number;
  accessFee: number;
};

// Rueckfallwerte, falls die Preise (noch) nicht aus der DB geladen werden
// konnten (z. B. offline) - identisch zu den Standardwerten der
// Datenbank-Migration, damit ein Auftrag notfalls trotzdem sinnvoll bepreist wird.
const FALLBACK_PRICING: PricingConfig = {
  refresh: 1.3,
  neue_weine: 1.0,
  ultra: 2.2,
  standardMin: 5,
  standardMax: 30,
  ultraMin: 10,
  ultraMax: 50,
  accessFee: 45,
};

// Kurzes Cache-Zeitfenster statt eines dauerhaften Caches - eine unbegrenzte
// Zwischenspeicherung fuehrte dazu, dass ein in der Admin-App geaendeter
// Preis in einem schon offenen Weinapp-Tab nie ankam, bevor die Seite komplett
// neu geladen wurde (wirkte wie "Preisaenderung funktioniert nicht"). 60s sind
// kurz genug fuer zeitnahe Aenderungen, aber immer noch effizient genug, um
// nicht bei jedem Render/Mount neu zu laden.
const CACHE_TTL_MS = 60_000;
let cached: Promise<PricingConfig> | null = null;
let cachedAt = 0;

async function fetchPricingConfig(): Promise<PricingConfig> {
  const { data, error } = await supabase
    .from('pricing_config')
    .select('refresh_price, neue_weine_price, ultra_price, standard_min_price, standard_max_price, ultra_min_price, ultra_max_price, access_fee')
    .eq('id', 1)
    .single();
  if (error || !data) return FALLBACK_PRICING;
  return {
    refresh: data.refresh_price,
    neue_weine: data.neue_weine_price,
    ultra: data.ultra_price,
    standardMin: data.standard_min_price,
    standardMax: data.standard_max_price,
    ultraMin: data.ultra_min_price,
    ultraMax: data.ultra_max_price,
    accessFee: data.access_fee,
  };
}

function ensureFresh(): Promise<PricingConfig> {
  if (!cached || Date.now() - cachedAt > CACHE_TTL_MS) {
    cached = fetchPricingConfig();
    cachedAt = Date.now();
  }
  return cached;
}

/** Startet das Laden der Preise im Hintergrund, bevor die Chat-Blase ueberhaupt geoeffnet wird. */
export function preloadPricingConfig() {
  ensureFresh();
}

export function getPricingConfig(): Promise<PricingConfig> {
  return ensureFresh();
}

/**
 * Reine Rechenfunktion ohne DB-Zugriff - fuer die Live-Vorschau im Formular,
 * sobald die Preise einmal geladen sind. "wineCount" ist die Anzahl
 * UNTERSCHIEDLICHER Weine im Auftrag (mehrere Flaschen desselben Weins
 * zaehlen als 1 - siehe wine_count in orderRepository.ts). Skaliert
 * progressiv statt linear (Quadratwurzel der Weinzahl): bei sehr vielen
 * unterschiedlichen Weinen waere eine reine Linear-Rechnung masslos teuer,
 * obwohl der tatsaechliche Aufwand pro Wein bei grossen Stapeln sinkt. Bei
 * 1 Wein entspricht das genau dem Grundpreis, bei 100 Weinen nur dem
 * 10-fachen (statt dem 100-fachen).
 */
export function computeOrderPrice(pricing: PricingConfig, category: OrderCategory, wineCount: number): number {
  const isUltra = category === 'ultra';
  const min = isUltra ? pricing.ultraMin : pricing.standardMin;
  const max = isUltra ? pricing.ultraMax : pricing.standardMax;
  const raw = pricing[category] * Math.sqrt(wineCount);
  return Math.round(Math.min(max, Math.max(min, raw)) * 20) / 20; // auf 5 Rappen runden
}

/** Referenz-Mengen fuer die Preistabelle, die bei jeder Angebots-Auswahl angezeigt wird - gibt eine Groessenordnung, bevor jemand die genaue Flaschenzahl kennt. */
export const PRICE_TABLE_COUNTS = [10, 50, 100, 200, 500, 1000] as const;

export function buildPriceTable(pricing: PricingConfig, category: OrderCategory): { count: number; price: number }[] {
  return PRICE_TABLE_COUNTS.map((count) => ({ count, price: computeOrderPrice(pricing, category, count) }));
}
