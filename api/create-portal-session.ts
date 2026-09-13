import type { VercelRequest, VercelResponse } from './_types.js';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

/**
 * Leitet zum Stripe-Kundenportal weiter - dort kann ein Nutzer selbststaendig
 * die Abo-Stufe wechseln, kuendigen oder die Zahlungsmethode aktualisieren,
 * ohne dass Andrin das von Hand nachpflegen muss (siehe
 * Skalierungs-Strategie: "Selbstbedienung statt manueller Verwaltung").
 * Setzt voraus, dass der Nutzer bereits einen Checkout durchlaufen hat
 * (stripe_customer_id gesetzt) - vorher gibt es noch kein Abo zu verwalten.
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
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
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
  const { data: accessRow } = await supabaseAdmin
    .from('user_access')
    .select('stripe_customer_id')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (!accessRow?.stripe_customer_id) {
    res.status(400).json({ error: 'Noch kein Abo abgeschlossen - dafuer gibt es hier noch nichts zu verwalten.' });
    return;
  }

  const stripe = new Stripe(stripeSecretKey);
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: accessRow.stripe_customer_id,
      return_url: `${appUrl}/settings`,
    });
    res.status(200).json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Kundenportal konnte nicht geoeffnet werden.' });
  }
}
