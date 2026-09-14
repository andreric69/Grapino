import type { Plan } from './planLimits';

type TaxBehavior = 'inclusive' | 'exclusive' | 'unspecified';

type Interval = 'day' | 'week' | 'month' | 'year';

export interface PlanPriceInfo {
  amount: number;
  currency: string;
  taxBehavior: TaxBehavior;
  interval: Interval;
  intervalCount: number;
}

export type PlanPrices = Record<Plan, PlanPriceInfo>;

// Kurzes Cache-Zeitfenster (identisch zum "Cache-Control"-Header von
// api/plan-prices.ts) - Abo-Preise aendern sich praktisch nie, ein erneuter
// Abruf bei jedem Seitenwechsel waere unnoetig. Bewusst nicht laenger: eine
// zu lange Cache-Zeit liess live eine veraltete Antwort (noch ohne
// "interval"-Feld) bis zu eine Stunde lang haengen ("undefined" in der
// Anzeige, siehe formatPlanPrice) - 10 Minuten sind fuer Preise, die sich
// praktisch nie aendern, immer noch mehr als genug Entlastung.
const CACHE_TTL_MS = 10 * 60 * 1000;
let cached: Promise<PlanPrices | null> | null = null;
let cachedAt = 0;

async function fetchPlanPrices(): Promise<PlanPrices | null> {
  try {
    const res = await fetch('/api/plan-prices');
    if (!res.ok) return null;
    return (await res.json()) as PlanPrices;
  } catch {
    return null;
  }
}

/**
 * Live-Preise der drei Abo-Stufen aus Stripe (siehe api/plan-prices.ts) -
 * rein informativ fuer die Anzeige VOR dem Checkout-Klick (ChoosePlanScreen/
 * SettingsPage). Liefert bei jedem Fehler `null` statt zu werfen: die
 * Preisanzeige ist ein Nice-to-have, der Checkout selbst darf nie daran
 * scheitern, dass die Preise nicht geladen werden konnten.
 */
export function getPlanPrices(): Promise<PlanPrices | null> {
  if (!cached || Date.now() - cachedAt > CACHE_TTL_MS) {
    cached = fetchPlanPrices().then((result) => {
      // Einen Fehlversuch nicht fuer die volle Stunde vormerken - beim
      // naechsten Aufruf (z. B. neu geladene Seite) einfach erneut versuchen.
      if (result === null) cached = null;
      return result;
    });
    cachedAt = Date.now();
  }
  return cached;
}

const INTERVAL_LABELS_SINGULAR: Record<Interval, string> = { day: 'Tag', week: 'Woche', month: 'Monat', year: 'Jahr' };
const INTERVAL_LABELS_PLURAL: Record<Interval, string> = { day: 'Tage', week: 'Wochen', month: 'Monate', year: 'Jahre' };

/**
 * "CHF 10.00 / Jahr" - Intervall wird IMMER aus den echten Stripe-Preisdaten
 * uebernommen, nie angenommen (alle drei Abo-Stufen laufen tatsaechlich
 * jaehrlich, nicht monatlich - siehe api/plan-prices.ts). Ohne Steuerhinweis,
 * der wird separat angezeigt (siehe formatTaxHint).
 */
export function formatPlanPrice(price: PlanPriceInfo): string {
  const base = `${price.currency.toUpperCase()} ${price.amount.toFixed(2)}`;
  // Verteidigt gegen eine veraltet zwischengespeicherte Antwort (Browser-
  // HTTP-Cache oder dieser Modul-Cache), die noch aus der Zeit VOR dem
  // "interval"-Feld stammt (siehe api/plan-prices.ts) - "undefined" wurde
  // live beobachtet, statt still "/ Jahr" wegzulassen war das schlechter als
  // gar kein Intervall-Zusatz.
  const label = INTERVAL_LABELS_SINGULAR[price.interval];
  if (!label) return base;
  const intervalLabel = price.intervalCount > 1 ? `${price.intervalCount} ${INTERVAL_LABELS_PLURAL[price.interval]}` : label;
  return `${base} / ${intervalLabel}`;
}

/** Neutraler Hinweistext zur Mehrwertsteuer - keine Steuerberatung, nur Weitergabe dessen, was bei Stripe hinterlegt ist. */
export function formatTaxHint(price: PlanPriceInfo): string {
  if (price.taxBehavior === 'inclusive') return 'inkl. MWST';
  if (price.taxBehavior === 'exclusive') return 'zzgl. MWST';
  return 'zzgl. allfälliger Steuern';
}
