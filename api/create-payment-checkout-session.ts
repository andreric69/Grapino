import type { VercelRequest, VercelResponse } from './_types.js';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { logError } from './_errorLog.js';
import { getStripeSecretKey } from './_stripeEnv.js';

/**
 * Bezahlt ALLE offenen Zahlungsanfragen des Nutzers (Aktualisierungs-
 * Auftraege, siehe payment_requests) auf einmal per Stripe statt TWINT/
 * Ueberweisung - TWINT bleibt als Alternative bestehen (siehe
 * PaymentDueScreen.tsx/SettingsPage.tsx), das hier ist ein zusaetzlicher Weg.
 * Anders als bei den Abo-Preisen (feste Stripe-Price-IDs) sind Auftrags-
 * Betraege individuell (siehe pricingConfig.ts) - deshalb price_data statt
 * einer festen Price-ID, ein Line-Item pro offener Anfrage.
 *
 * Liest die offenen Anfragen serverseitig ueber die eigene user_id, statt
 * IDs vom Client zu uebernehmen - so kann niemand eine fremde oder bereits
 * bezahlte/stornierte Anfrage unterschieben.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Nicht angemeldet.' });
    return;
  }
  const accessToken = authHeader.slice('Bearer '.length);

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeSecretKey = getStripeSecretKey();
  const appUrl = process.env.VITE_APP_URL ?? 'https://weinsammlung-two.vercel.app';
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecretKey) {
    res.status(500).json({ error: 'Server-Konfiguration fehlt.' });
    return;
  }

  const supabaseAsUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await supabaseAsUser.auth.getUser();
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Ungueltige Sitzung.' });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: openRequests, error: fetchError } = await supabaseAdmin
    .from('payment_requests')
    .select('id, amount, reason')
    .eq('user_id', userData.user.id)
    .eq('status', 'open');
  if (fetchError) {
    res.status(500).json({ error: `Zahlungsanfragen nicht lesbar: ${fetchError.message}` });
    return;
  }
  if (!openRequests || openRequests.length === 0) {
    res.status(400).json({ error: 'Keine offenen Zahlungsanfragen.' });
    return;
  }

  const stripe = new Stripe(stripeSecretKey, { httpClient: Stripe.createFetchHttpClient() });
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: openRequests.map((r) => ({
        price_data: {
          currency: 'chf',
          unit_amount: Math.round(r.amount * 100),
          product_data: { name: r.reason },
        },
        quantity: 1,
      })),
      // Verknuepfung zurueck zu den bezahlten Zeilen - siehe stripe-webhook.ts
      // (checkout.session.completed, mode 'payment').
      metadata: { payment_request_ids: openRequests.map((r) => r.id).join(',') },
      success_url: `${appUrl}/settings?zahlung=erfolgreich`,
      cancel_url: `${appUrl}/settings`,
    });
    res.status(200).json({ url: session.url });
  } catch (e) {
    // Echter, unerwarteter Fehler beim Anlegen der Stripe-Checkout-Session
    // (z. B. Stripe-API-Fehler) - nicht die weiter oben behandelten
    // erwarteten Faelle (keine offenen Zahlungsanfragen, fehlende Sitzung).
    await logError('create-payment-checkout-session', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Zahlung konnte nicht gestartet werden.' });
  }
}
