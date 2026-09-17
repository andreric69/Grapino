/**
 * Liest die beiden Stripe-Zugangsdaten robust aus mehreren moeglichen
 * Vercel-Umgebungsvariablen-Namen aus.
 *
 * Hintergrund (2026-09-17): beim Umstieg von Stripe Test- auf Live-Modus
 * wurden in Vercel aus Versehen zusaetzliche Variablen mit einem
 * "_Original"/"_Orignial"/"_Origninal"-Namenszusatz angelegt (Tippfehler
 * inklusive) - die eigentlich korrekt benannten Variablen (STRIPE_SECRET_KEY,
 * STRIPE_WEBHOOK_SECRET, ohne Zusatz) blieben dabei unveraendert und zeigen
 * weiterhin auf die alten Test-Werte. Ein Umbenennen in Vercel war nicht
 * ohne Weiteres moeglich (Namenskonflikt mit der bereits existierenden
 * Variable ohne Zusatz). Statt das in Vercel manuell nachzuziehen
 * (fehleranfaellig, siehe Chat-Verlauf), probiert der Code hier mehrere
 * plausible Namen durch:
 *
 * - Secret Key: nimmt bevorzugt den Kandidaten, dessen Wert "_live_"
 *   enthaelt (funktioniert unabhaengig vom Namen, weil Stripes eigene
 *   Schluessel selbst live/test kennzeichnen - sk_live_.../rk_live_... vs.
 *   sk_test_.../rk_test_...).
 * - Webhook Secret: hat KEINE erkennbare live/test-Kennzeichnung im Wert
 *   selbst (nur "whsec_" + Zufallsstring) - hier werden die "_Original"-
 *   Varianten bevorzugt, weil dort nach Chat-Bestaetigung der neue
 *   Live-Wert tatsaechlich eingetragen wurde.
 *
 * Sobald die Vercel-Variablen irgendwann sauber aufgeraeumt/umbenannt
 * werden (nur noch STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET ohne Zusatz),
 * funktioniert dieser Code unveraendert weiter - die Kandidatenliste deckt
 * den "sauberen" Namen immer mit ab.
 */

const SECRET_KEY_CANDIDATES = ['STRIPE_SECRET_KEY', 'STRIPE_SECRET_KEY_Original', 'STRIPE_SECRET_KEY_Orignial', 'STRIPE_SECRET_KEY_Origninal'];

const WEBHOOK_SECRET_CANDIDATES = [
  'STRIPE_WEBHOOK_SECRET_Original',
  'STRIPE_WEBHOOK_SECRET_Orignial',
  'STRIPE_WEBHOOK_SECRET_Origninal',
  'STRIPE_WEBHOOK_SECRET',
];

function definedValues(names: string[]): string[] {
  return names.map((name) => process.env[name]).filter((v): v is string => Boolean(v));
}

/** Secret Key (sk_.../rk_...) - bevorzugt einen Live-Wert, egal unter welchem Variablennamen er steht. */
export function getStripeSecretKey(): string | undefined {
  const values = definedValues(SECRET_KEY_CANDIDATES);
  return values.find((v) => v.includes('_live_')) ?? values[0];
}

/** Ob der aktuell aktive Secret Key ein Live-Schluessel ist (fuer die Test-/Live-Preis-Auswahl). */
export function isStripeLiveMode(): boolean {
  return getStripeSecretKey()?.includes('_live_') ?? false;
}

/** Webhook Signing Secret (whsec_...) - bevorzugt die "_Original"-Varianten, siehe Kommentar oben. */
export function getStripeWebhookSecret(): string | undefined {
  return definedValues(WEBHOOK_SECRET_CANDIDATES)[0];
}
