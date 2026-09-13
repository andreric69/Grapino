import type { VercelRequest, VercelResponse } from './_types.js';

/**
 * TEMPORAERER Diagnose-Endpunkt - prueft per rohem fetch() (ohne Stripe-SDK),
 * ob diese Vercel-Funktion ueberhaupt api.stripe.com erreicht. Wird nach der
 * Fehlersuche wieder geloescht.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const result: Record<string, unknown> = {
    hasKey: !!stripeSecretKey,
    keyLength: stripeSecretKey?.length,
    // Zeigt JEDES Zeichen als Code-Punkt - ein normales ASCII-Zeichen liegt
    // unter 128, ein maskiertes "•" (Bullet) liegt bei 8226. So laesst sich
    // genau sehen, WELCHE Position(en) betroffen sind, ohne den echten
    // Schluessel-Wert selbst preiszugeben (dies ist ohnehin ein Test-Key).
    charCodes: stripeSecretKey ? Array.from(stripeSecretKey).map((c) => c.charCodeAt(0)) : null,
  };

  try {
    const start = Date.now();
    const r = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${stripeSecretKey}` },
    });
    result.rawFetchMs = Date.now() - start;
    result.rawFetchStatus = r.status;
    result.rawFetchBody = await r.text();
  } catch (e) {
    result.rawFetchError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    result.rawFetchErrorCause = e instanceof Error && e.cause ? String(e.cause) : undefined;
  }

  res.status(200).json(result);
}
