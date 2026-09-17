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

/**
 * Kleiner, dezenter Zusatztext zum Jahrespreis, der die ungefaehre
 * Monatsgroessenordnung einordnet (Preispsychologie: "CHF 1.58/Monat" wirkt
 * greifbarer als "CHF 19.00/Jahr", ohne dass am eigentlichen Preis etwas
 * geaendert wird). Liefert bewusst `null` bei jedem Intervall ausser "year":
 * ein Monatsäquivalent zu einem Wochen-/Tagespreis waere hier nie gebraucht
 * und koennte nur verwirren.
 *
 * WICHTIG (UWG-Rechtsrisiko, siehe NOTFALL/README.md): der zurueckgegebene
 * Text sagt IMMER "entspricht ca." - er behauptet nie eine monatliche
 * Abrechnung. Die tatsaechliche Abrechnung bleibt jaehrlich (ein einziger
 * Betrag pro Jahr über Stripe) - dieser Text ist rein eine Grössenordnungs-
 * Einordnung fuer die Anzeige, kein zweites Preismodell. Immer zusammen mit
 * (nicht anstelle von) formatPlanPrice() anzeigen, siehe ChoosePlanScreen.tsx/
 * SettingsPage.tsx.
 */
export function formatMonthlyEquivalentHint(price: PlanPriceInfo): string | null {
  if (price.interval !== 'year' || price.intervalCount <= 0) return null;
  const months = 12 * price.intervalCount;
  const monthly = price.amount / months;
  return `entspricht ca. ${price.currency.toUpperCase()} ${monthly.toFixed(2)}/Monat`;
}

/**
 * Hinweistext zur Mehrwertsteuer - keine Steuerberatung. Ignoriert BEWUSST
 * das "taxBehavior"-Feld des Stripe-Preises (price.taxBehavior): das
 * beschreibt nur, wie ein Betrag zu interpretieren WAERE, falls Stripe
 * automatisch Steuer berechnet - passiert bei uns aber nirgends
 * ("automatic_tax" wird in keiner Checkout-Session gesetzt, siehe
 * api/create-checkout-session.ts). Der angezeigte Preis ist deshalb IMMER
 * der tatsaechliche Endbetrag, unabhaengig davon, was Stripes eigene
 * Preis-Metadaten sagen - live beobachtet: Stripe setzte "exclusive" auf
 * den Preisen, ohne dass wir das veranlasst haben, was faelschlich
 * "zzgl. MWST" angezeigt haette (2026-09-17).
 *
 * Aktueller Stand: nicht MWST-pflichtig (siehe NOTFALL/README.md), daher
 * keine MWST im Preis enthalten. Falls sich das durch Wachstum aendert
 * (siehe README, ca. ab CHF 100'000 Jahresumsatz) UND automatic_tax aktiv
 * geschaltet wird, muss diese Funktion angepasst werden.
 */
export function formatTaxHint(): string {
  return 'Gesamtpreis, keine MWST';
}
