import type { VercelRequest, VercelResponse } from './_types.js';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Ein Stripe-Preis pro Abo-Stufe (siehe planLimits.ts) - eigenes Produkt pro
// Stufe angelegt (nicht mehrere Preise auf einem Produkt), damit Checkout/
// Rechnung fuer jede Stufe den richtigen Namen zeigen. IDs stammen aus dem
// einmaligen Setup im Stripe-Test-Modus, siehe Commit-Beschreibung.
const PRICE_IDS: Record<'basis' | 'pro' | 'ultra', string> = {
  basis: 'price_1UFKjwCA1Lpg114OukUSXThO',
  pro: 'price_1UFKjwCA1Lpg114ORHMZ5qJJ',
  ultra: 'price_1UFKjxCA1Lpg114OBMZ6aObX',
};

function isValidPlan(value: unknown): value is keyof typeof PRICE_IDS {
  return value === 'basis' || value === 'pro' || value === 'ultra';
}

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

  const { plan } = (req.body ?? {}) as { plan?: unknown };
  if (!isValidPlan(plan)) {
    res.status(400).json({ error: 'Ungueltige Abo-Stufe.' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.VITE_APP_URL ?? 'https://weinsammlung-two.vercel.app';
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecretKey) {
    res.status(500).json({ error: 'Server-Konfiguration fehlt.' });
    return;
  }

  // Client mit dem Access-Token DES AUFRUFERS (nicht Service-Role) - stellt
  // sicher, dass wirklich nur ein eingeloggter Nutzer einen Checkout fuer
  // sich selbst ausloesen kann, gleiches Muster wie in recognize-label.ts.
  const supabaseAsUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await supabaseAsUser.auth.getUser();
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Ungueltige Sitzung.' });
    return;
  }
  const user = userData.user;

  // Ab hier Service-Role noetig: user_access hat bislang keine UPDATE-Policy
  // fuer den eigenen Nutzer (nur eine eng gefasste einmalige INSERT-Policy
  // fuer die Selbst-Registrierungs-Testphase, siehe
  // self-registration-trial-lockdown-2026-08-30.sql) - das ist bewusst so,
  // damit ein Nutzer sich nicht selbst per REST-API eine andere Abo-Stufe
  // eintragen kann. Der Checkout-Session-Aufruf selbst bleibt trotzdem an die
  // oben verifizierte Nutzer-Identitaet gebunden.
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Live auf Vercel gefunden: Stripes Standard-HTTP-Client (Node "https"-
  // Modul) schlaegt in dieser Serverless-Umgebung zuverlaessig fehl ("An
  // error occurred with our connection to Stripe"), obwohl lokal alles
  // funktioniert. Stripes eigener Fetch-basierter Client (nutzt die globale
  // fetch()-Funktion, in Vercels Node-Runtime vorhanden) behebt das.
  const stripe = new Stripe(stripeSecretKey, { httpClient: Stripe.createFetchHttpClient() });

  const { data: accessRow, error: selectError } = await supabaseAdmin
    .from('user_access')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (selectError) {
    // Absichtlich KEIN "default allow" wie in accessControl.ts: dort schadet
    // ein Fehler niemandem (Zugang bleibt offen), hier wuerde er dagegen eine
    // Stripe-Kundschaft anlegen, die nie in user_access ankommt - lieber
    // klar fehlschlagen (z.B. Migration stripe-billing-2026-09-13.sql noch
    // nicht angewendet), als eine verwaiste Stripe-Kundschaft zu erzeugen.
    res.status(500).json({ error: `user_access nicht lesbar: ${selectError.message}` });
    return;
  }

  // Alles ab hier faengt echte Stripe-API-Aufrufe ein - OHNE dieses try/catch
  // wuerde ein Fehler (z.B. von stripe.customers.create) die ganze Funktion
  // unbehandelt abstuerzen lassen (Vercel zeigt dann nur "FUNCTION_INVOCATION_
  // FAILED" ohne jede Fehlermeldung) statt eine auswertbare JSON-Antwort zu
  // liefern - live so vorgefunden und behoben.
  try {
    let customerId = accessRow?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      // Upsert statt update: falls fuer diesen Nutzer noch gar keine
      // user_access-Zeile existiert (z. B. nie eine Testphase durchlaufen),
      // legt das die Zeile jetzt an, statt fehlzuschlagen.
      const { error: upsertError } = await supabaseAdmin
        .from('user_access')
        .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: 'user_id' });
      if (upsertError) {
        // Der eben erstellte Stripe-Kunde ist jetzt verwaist (keine
        // user_access-Zeile kennt ihn) - aufraeumen, statt ihn
        // stillschweigend liegen zu lassen, und den Fehler klar melden statt
        // einen Checkout zu erlauben, den der Webhook spaeter niemandem
        // zuordnen kann.
        await stripe.customers.del(customerId);
        res.status(500).json({ error: `user_access nicht beschreibbar: ${upsertError.message}` });
        return;
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      // Kein "payment_method_types" - Stripe waehlt selbst anhand der
      // Dashboard-Einstellungen, siehe Stripe-Best-Practice.
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      client_reference_id: user.id,
      success_url: `${appUrl}/settings?checkout=erfolgreich`,
      cancel_url: `${appUrl}/settings`,
    });
    res.status(200).json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Checkout konnte nicht gestartet werden.' });
  }
}
