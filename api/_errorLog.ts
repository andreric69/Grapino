import { createClient } from '@supabase/supabase-js';

/**
 * Meldet unerwartete Fehler aus den zahlungs-/KI-relevanten Serverless
 * Functions dieser App (stripe-webhook.ts, create-checkout-session.ts,
 * create-payment-checkout-session.ts, recognize-label.ts) an die Admin-App -
 * bisher landeten solche Fehler nur in console.error, das im Vercel-Log
 * verschwindet und von Andrin faktisch erst durch eine Kundenbeschwerde
 * bemerkt wird (z. B. ein fehlgeschlagener Stripe-Webhook, der eine falsche
 * Abo-Stufe setzt oder eine Blockierung nicht aufhebt).
 *
 * Spiegelt bewusst das bestehende Muster der Admin-App (siehe
 * grapino-admin/api/_health.ts::logError) statt etwas Neues zu erfinden:
 * derselbe SUPABASE_SERVICE_ROLE_KEY, den diese App seit der Stripe-
 * Integration bereits serverseitig nutzt, schreibt in DIESELBE
 * admin_error_log-Tabelle (ein gemeinsames Supabase-Projekt fuer beide Apps,
 * siehe NOTFALL/README.md Abschnitt 4) - mit source='weinapp' und dem
 * konkreten Endpunktnamen, damit ein Eintrag in der Admin-App klar als
 * Weinapp-Fehler erkennbar ist (siehe
 * grapino-admin/supabase/admin-error-log-source-2026-09-14.sql).
 *
 * Die Push-Benachrichtigung selbst kommt bewusst NICHT von hier aus direkt
 * (kein eigenes VAPID-Schluesselpaar/web-push-Abhaengigkeit in dieser App -
 * Zero-Cost/schlanke Architektur ist ein Projektziel, siehe README), sondern
 * ueber denselben Webhook-Pfad, den die Admin-App bereits fuer
 * "neue Nachricht"-Benachrichtigungen von einem Postgres-Trigger aus nutzt
 * (api/push.ts?resource=notify-message, dort um resource=notify-error
 * ergaenzt) - authentifiziert per PUSH_WEBHOOK_SECRET, demselben Secret, das
 * die Admin-App fuer diesen Zweck bereits kennt (muss zusaetzlich in dieser
 * Apps Vercel-Projekt gesetzt werden, siehe .env.example).
 *
 * Wirft NIE - ein fehlgeschlagenes Fehler-Logging darf niemals eine echte
 * Nutzeraktion (Zahlung, KI-Erkennung) zusaetzlich zum Absturz bringen.
 */

const ADMIN_APP_URL = 'https://grapino-admin-theta.vercel.app';
const WEBHOOK_TIMEOUT_MS = 5000;

/**
 * Extrahiert eine lesbare Fehlermeldung aus einem catch(e)-Wert. Identische
 * Logik wie grapino-admin/api/_health.ts::errorMessage (siehe dort fuer den
 * Hintergrund: postgrest-js/Stripe-SDK liefern bei manchen Fehlern ein plain
 * object mit message-Property statt eine echte Error-Instanz zu werfen).
 */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return 'Unbekannter Fehler.';
}

/**
 * Schreibt einen unerwarteten Fehler in admin_error_log und stoesst darueber
 * die Push-Benachrichtigung an die Admin-App an. NUR fuer echte, unerwartete
 * Fehler gedacht (DB-Fehler, Stripe-API-Fehler, Anthropic-API-Fehler, 500er) -
 * erwartete/normale Fehler (z. B. "Tageslimit erreicht", falsches Passwort,
 * fehlende Berechtigung) sind kein Systemfehler und sollten NICHT hierueber
 * gemeldet werden (siehe die vier api/*.ts-Aufrufstellen).
 */
export async function logError(endpoint: string, e: unknown): Promise<void> {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return;

    const message = errorMessage(e);
    const detail = e instanceof Error ? (e.stack ?? null) : e ? JSON.stringify(e) : null;

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: inserted } = await supabase
      .from('admin_error_log')
      .insert({ endpoint, message, detail, source: 'weinapp' })
      .select('id')
      .single();

    if (inserted) await notifyAdmin(inserted.id, endpoint, message);
  } catch (loggingError) {
    // Logging ist ein Nebeneffekt - nie den urspruenglichen Fehler
    // ueberdecken oder den aufrufenden Request zusaetzlich zum Absturz
    // bringen. console.error als allerletzter Fallback, falls selbst das
    // Loggen fehlschlaegt (z. B. admin_error_log-Migration noch nicht
    // ausgefuehrt, Netzwerkfehler).
    console.error(`Fehler-Logging fuer ${endpoint} fehlgeschlagen:`, loggingError);
  }
}

/** Ruft die Admin-App auf, damit sie die eigentliche Push-Zustellung uebernimmt. */
async function notifyAdmin(id: string, endpoint: string, message: string): Promise<void> {
  try {
    const secret = process.env.PUSH_WEBHOOK_SECRET;
    if (!secret) return;
    await fetch(`${ADMIN_APP_URL}/api/push?resource=notify-error`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-push-webhook-secret': secret },
      body: JSON.stringify({ id, endpoint, message }),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
  } catch (notifyError) {
    console.error(`Push-Benachrichtigung fuer ${endpoint} fehlgeschlagen:`, notifyError);
  }
}
