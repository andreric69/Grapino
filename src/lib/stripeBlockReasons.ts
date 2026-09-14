/**
 * Block-Gruende, die der Stripe-Webhook SELBST automatisch setzt (siehe
 * api/stripe-webhook.ts) - im Unterschied zu einem manuell in der Admin-App
 * gesetzten Block (z. B. wegen Missbrauch). Gemeinsame Datei fuer Client UND
 * Server:
 *  - Server (api/stripe-webhook.ts): darf einen Block nur dann automatisch
 *    wieder aufheben, wenn er ihn selbst (oder gar keinen) gesetzt hat, nie
 *    einen von Andrin manuell gesetzten.
 *  - Client (src/components/BlockScreen.tsx): zeigt bei einem Stripe-
 *    verursachten Block zusaetzliche Selbsthilfe-Optionen (Kundenportal-
 *    Link) - bei einem manuellen Block waere das falsch/verwirrend.
 *
 * Frueher an zwei Stellen dupliziert gepflegt - siehe die Lektion in
 * NOTFALL/README.md zu Spalten/Werten, die an mehreren Stellen beachtet
 * werden muessen: eine einzige Quelle verhindert, dass die beiden Listen
 * auseinanderlaufen.
 */
export const STRIPE_BLOCK_REASONS = new Set([
  'Zahlung ausstehend - bitte Zahlungsmethode aktualisieren.',
  'Abo beendet.',
  'Die letzte Zahlung ist fehlgeschlagen - bitte Zahlungsmethode pruefen.',
]);

export function isStripeManagedBlock(currentBlockReason: string | null): boolean {
  return currentBlockReason === null || STRIPE_BLOCK_REASONS.has(currentBlockReason);
}
