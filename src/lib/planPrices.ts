import type { Plan } from './planLimits';

type TaxBehavior = 'inclusive' | 'exclusive' | 'unspecified';

export interface PlanPriceInfo {
  amount: number;
  currency: string;
  taxBehavior: TaxBehavior;
}

export type PlanPrices = Record<Plan, PlanPriceInfo>;

// Kurzes Cache-Zeitfenster (identisch zum "Cache-Control"-Header von
// api/plan-prices.ts) - Abo-Preise aendern sich praktisch nie, ein erneuter
// Abruf bei jedem Seitenwechsel waere unnoetig.
const CACHE_TTL_MS = 60 * 60 * 1000;
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

/** "CHF 4.90 / Monat" - ohne Steuerhinweis, der wird separat angezeigt (siehe formatTaxHint). */
export function formatPlanPrice(price: PlanPriceInfo): string {
  return `${price.currency.toUpperCase()} ${price.amount.toFixed(2)} / Monat`;
}

/** Neutraler Hinweistext zur Mehrwertsteuer - keine Steuerberatung, nur Weitergabe dessen, was bei Stripe hinterlegt ist. */
export function formatTaxHint(price: PlanPriceInfo): string {
  if (price.taxBehavior === 'inclusive') return 'inkl. MWST';
  if (price.taxBehavior === 'exclusive') return 'zzgl. MWST';
  return 'zzgl. allfälliger Steuern';
}
