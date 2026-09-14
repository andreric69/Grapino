import type { VercelRequest, VercelResponse } from './_types.js';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Gegenstueck zu create-checkout-session.ts: Preis-ID -> Abo-Stufe (fuer den
// Ruecksschluss, welche Stufe ein Nutzer nach dem Checkout/einer Aenderung
// tatsaechlich hat).
const PLAN_BY_PRICE_ID: Record<string, 'basis' | 'pro' | 'ultra'> = {
  price_1UFKjwCA1Lpg114OukUSXThO: 'basis',
  price_1UFKjwCA1Lpg114ORHMZ5qJJ: 'pro',
  price_1UFKjxCA1Lpg114OBMZ6aObX: 'ultra',
};

// Block-Gruende, die DIESER Webhook selbst setzt (siehe unten) - im
// Unterschied zu einem manuell in der Admin-App gesetzten Block (z. B. wegen
// Missbrauch). Ohne diese Unterscheidung wuerde ein spaeteres Stripe-Ereignis
// (z. B. eine erfolgreiche Abo-Verlaengerung) einen ganz anderen, manuell
// gesetzten Block versehentlich wieder aufheben - der Webhook darf einen
// Block nur dann automatisch loesen, wenn er ihn selbst (oder gar keinen)
// gesetzt hat, nie einen von Andrin gesetzten.
const STRIPE_BLOCK_REASONS = new Set([
  'Zahlung ausstehend - bitte Zahlungsmethode aktualisieren.',
  'Abo beendet.',
  'Die letzte Zahlung ist fehlgeschlagen - bitte Zahlungsmethode pruefen.',
]);

function isStripeManagedBlock(currentBlockReason: string | null): boolean {
  return currentBlockReason === null || STRIPE_BLOCK_REASONS.has(currentBlockReason);
}

// Vercel liefert den Body standardmaessig schon als geparstes JSON - fuer die
// Stripe-Signaturpruefung wird aber der ROHE, unveraenderte Byte-Body
// gebraucht (jede Abweichung, auch nur eine andere Formatierung, macht die
// Signatur ungueltig). Deshalb hier der Stream selbst eingesammelt, bevor
// Vercel/irgendein Body-Parser ihn anfasst.
function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'Server-Konfiguration fehlt.' });
    return;
  }

  // Siehe create-checkout-session.ts: Stripes Standard-HTTP-Client scheitert
  // in dieser Serverless-Umgebung, der Fetch-basierte Client behebt das.
  const stripe = new Stripe(stripeSecretKey, { httpClient: Stripe.createFetchHttpClient() });
  const signature = req.headers['stripe-signature'];
  const rawBody = await readRawBody(req);

  let event: Stripe.Event;
  try {
    if (typeof signature !== 'string') throw new Error('Fehlende Signatur.');
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (e) {
    // Absichtlich 400 statt 500 - eine ungueltige Signatur ist kein
    // Server-Fehler, sondern entweder eine falsch konfigurierte
    // Webhook-Secret oder ein Faelschungsversuch. Kein Retry durch Stripe
    // sinnvoll, wenn es an der Signatur selbst liegt.
    res.status(400).json({ error: `Webhook-Signatur ungueltig: ${e instanceof Error ? e.message : e}` });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    switch (event.type) {
      // Checkout abgeschlossen - Abo-Stufe direkt aus der Session uebernehmen,
      // damit der Nutzer nicht auf den (meist wenige Sekunden spaeter
      // eintreffenden) customer.subscription.created-Event warten muss.
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        if (userId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price.id;
          const plan = priceId ? PLAN_BY_PRICE_ID[priceId] : undefined;
          if (plan) {
            // Aktuellen Block-Grund vor dem Update lesen: ein manuell in der
            // Admin-App gesetzter Block (z. B. Missbrauch) darf durch einen
            // erfolgreichen Checkout nicht stillschweigend aufgehoben werden -
            // siehe isStripeManagedBlock() oben.
            const { data: current } = await supabase
              .from('user_access')
              .select('block_reason')
              .eq('user_id', userId)
              .maybeSingle();
            const update: Record<string, unknown> = { plan, stripe_subscription_id: subscriptionId };
            if (isStripeManagedBlock(current?.block_reason ?? null)) {
              update.is_blocked = false;
              update.block_reason = null;
            }
            await supabase.from('user_access').update(update).eq('user_id', userId);
          }
        }
        break;
      }

      // Abo geaendert (Up-/Downgrade ueber das Kundenportal, oder Stripe
      // selbst nach einer fehlgeschlagenen Zahlung "past_due"/"unpaid") -
      // haelt die Abo-Stufe unabhaengig vom Auslöser synchron.
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId ? PLAN_BY_PRICE_ID[priceId] : undefined;
        const { data: row } = await supabase
          .from('user_access')
          .select('user_id, block_reason')
          .eq('stripe_customer_id', subscription.customer as string)
          .maybeSingle();
        if (row && plan) {
          const stillActive = subscription.status === 'active' || subscription.status === 'trialing';
          const update: Record<string, unknown> = { plan };
          // Genau wie bei checkout.session.completed: nur automatisch
          // entsperren, wenn der aktuelle Block von diesem Webhook selbst
          // stammt - ein manueller Block bleibt unangetastet, bis Andrin ihn
          // selbst aufhebt. In Richtung "sperren" (stillActive=false) ist das
          // dagegen immer sicher, da es niemanden freigibt.
          if (!stillActive || isStripeManagedBlock(row.block_reason)) {
            update.is_blocked = !stillActive;
            update.block_reason = stillActive ? null : 'Zahlung ausstehend - bitte Zahlungsmethode aktualisieren.';
          }
          await supabase.from('user_access').update(update).eq('user_id', row.user_id);
        }
        break;
      }

      // Abo gekuendigt/beendet - Zugang sperren, aber NICHT die Daten
      // loeschen (Papierkorb-Prinzip gilt sinngemaess auch hier: der Nutzer
      // kann jederzeit ueber die Kontakt-Chatblase reaktivieren).
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await supabase
          .from('user_access')
          .update({ is_blocked: true, block_reason: 'Abo beendet.' })
          .eq('stripe_customer_id', subscription.customer as string);
        break;
      }

      // Zahlung fehlgeschlagen - eigener, klarerer Hinweistext als der
      // generische aus "subscription.updated" (der Status wechselt oft erst
      // nach mehreren Versuchen auf past_due, dieser Hinweis erscheint sofort).
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          await supabase
            .from('user_access')
            .update({ block_reason: 'Die letzte Zahlung ist fehlgeschlagen - bitte Zahlungsmethode pruefen.' })
            .eq('stripe_customer_id', customerId);
        }
        break;
      }

      default:
        // Andere Ereignisse (z. B. invoice.paid) bewusst ignoriert - fuer die
        // aktuelle Zugriffssteuerung reichen die obigen vier.
        break;
    }
    res.status(200).json({ received: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Webhook-Verarbeitung fehlgeschlagen.' });
  }
}
