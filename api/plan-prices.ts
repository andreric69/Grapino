import type { VercelRequest, VercelResponse } from './_types.js';
import Stripe from 'stripe';
import { PRICE_IDS } from './create-checkout-session.js';

type TaxBehavior = 'inclusive' | 'exclusive' | 'unspecified';

interface PlanPriceInfo {
  amount: number;
  currency: string;
  taxBehavior: TaxBehavior;
  // Abrechnungsintervall direkt aus Stripe uebernommen (NICHT annehmen/
  // hardcoden - die drei Abos laufen tatsaechlich jaehrlich, nicht
  // monatlich, siehe price.recurring.interval bei allen drei Price-IDs).
  interval: Stripe.Price.Recurring.Interval;
  intervalCount: number;
}

type PlanPrices = Record<keyof typeof PRICE_IDS, PlanPriceInfo>;

function normalizeTaxBehavior(value: Stripe.Price.TaxBehavior | null | undefined): TaxBehavior {
  if (value === 'inclusive') return 'inclusive';
  if (value === 'exclusive') return 'exclusive';
  return 'unspecified';
}

// Modul-weiter Cache: ueberlebt nur, solange die Vercel-Funktions-Instanz
// warm bleibt (kein geteilter Cache zwischen Instanzen), spart aber
// trotzdem die meisten Stripe-Aufrufe - Abo-Preise aendern sich praktisch
// nie. Der zusaetzliche "Cache-Control"-Header unten sorgt dafuer, dass auch
// Browser/CDN wiederholte Aufrufe abfangen.
const CACHE_TTL_MS = 60 * 60 * 1000;
let cachedPrices: PlanPrices | null = null;
let cachedAt = 0;

/**
 * Oeffentlicher, unauthentifizierter GET-Endpunkt: liefert die drei Live-
 * Abo-Preise (Basis/Pro/Ultra) direkt aus Stripe, damit sie in der App VOR
 * dem Checkout-Klick angezeigt werden koennen (siehe ChoosePlanScreen.tsx/
 * SettingsPage.tsx) statt erst auf der externen Stripe-Checkout-Seite
 * sichtbar zu werden. Keine PII, keine Authentifizierung noetig - reine
 * oeffentliche Preisinformation, dieselben drei Price-IDs wie in
 * create-checkout-session.ts.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (cachedPrices && Date.now() - cachedAt < CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.status(200).json(cachedPrices);
    return;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    res.status(500).json({ error: 'Server-Konfiguration fehlt.' });
    return;
  }

  // Siehe create-checkout-session.ts: Stripes Standard-HTTP-Client scheitert
  // in dieser Serverless-Umgebung, der Fetch-basierte Client behebt das.
  const stripe = new Stripe(stripeSecretKey, { httpClient: Stripe.createFetchHttpClient() });

  try {
    const plans = Object.keys(PRICE_IDS) as (keyof typeof PRICE_IDS)[];
    const entries = await Promise.all(
      plans.map(async (plan) => {
        const price = await stripe.prices.retrieve(PRICE_IDS[plan]);
        const info: PlanPriceInfo = {
          // Stripe liefert Betraege in der kleinsten Waehrungseinheit (Rappen
          // bei CHF) - durch 100 fuer die Anzeige als Franken-Betrag.
          amount: (price.unit_amount ?? 0) / 100,
          currency: price.currency,
          taxBehavior: normalizeTaxBehavior(price.tax_behavior),
          interval: price.recurring?.interval ?? 'year',
          intervalCount: price.recurring?.interval_count ?? 1,
        };
        return [plan, info] as const;
      }),
    );
    const result = Object.fromEntries(entries) as PlanPrices;
    cachedPrices = result;
    cachedAt = Date.now();
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Preise konnten nicht geladen werden.' });
  }
}
