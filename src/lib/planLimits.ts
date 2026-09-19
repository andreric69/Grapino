/**
 * Reine Hilfsfunktionen fuer das 3-Stufen-Abomodell (Basis/Pro/Ultra), siehe
 * supabase/user-plan-2026-09-13.sql fuer die zugehoerige Migration und
 * src/lib/accessControl.ts fuer den Abruf der aktuellen Stufe eines Nutzers.
 */
export type Plan = 'basis' | 'pro' | 'ultra';

// Anzeige-Name "Light" statt "Basis" (2026-09-19) - passt jetzt zum Namen des
// Stripe-Produkts ("Grapino Light", siehe api/create-checkout-session.ts) -
// der interne Schluessel bleibt bewusst "basis" (DB-Wert/Code unveraendert),
// nur der angezeigte Text aendert sich.
export const PLAN_LABELS: Record<Plan, string> = { basis: 'Light', pro: 'Pro', ultra: 'Ultra' };

/**
 * Die Stufe, die als "Beliebteste Wahl"/"Empfohlen" hervorgehoben wird
 * (Kompromiss-/Decoy-Effekt: die mittlere Stufe zwischen der knappen Basis-
 * und der teuersten Ultra-Stufe wirkt als ausgewogener Mittelweg). Eine
 * einzige Quelle fuer ChoosePlanScreen.tsx und SettingsPage.tsx, damit beide
 * Stellen immer dieselbe Stufe markieren, falls sich das je aendert.
 */
export const POPULAR_PLAN: Plan = 'pro';
export const POPULAR_PLAN_BADGE_LABEL = 'Beliebteste Wahl';

/**
 * Kurze, fuer nicht-technische Kundschaft (45+, siehe Projektvorgabe)
 * verstaendliche Beschreibung je Stufe - ohne Fachbegriffe wie "OCR". Wird
 * sowohl in ChoosePlanScreen.tsx (Stufenauswahl nach Ablauf der Testphase)
 * als auch in SettingsPage.tsx (Abo-Karte) genutzt, damit beide Stellen
 * immer denselben Text zeigen. Die Wein-Obergrenze wird bewusst NICHT hier
 * eingebaut, sondern von den Aufrufern separat ueber getMaxWines() angehaengt.
 */
export const PLAN_DESCRIPTIONS: Record<Plan, string> = {
  basis: 'Weine von Hand erfassen (Foto ohne Bilderkennung)',
  pro: 'KI-Etikett-Scan (Name, Produzent, Jahrgang, Region ...)',
  ultra: 'Smarter KI-Scan inkl. Alkoholgehalt, Passt-zu-Vorschlag & Jahrgangs-Einschätzung',
};

/**
 * Maximale Anzahl Weine in der Sammlung je Stufe: Basis 100, Pro 400,
 * Ultra unbegrenzt (null = keine Obergrenze).
 */
export function getMaxWines(plan: Plan): number | null {
  if (plan === 'basis') return 100;
  if (plan === 'pro') return 400;
  return null;
}

/**
 * Ob die KI-Etikett-Erkennung (Foto-Scan) genutzt werden darf. Nur in der
 * Basis-Stufe gesperrt, ab Pro erlaubt.
 */
export function canUseAiScan(plan: Plan): boolean {
  return plan !== 'basis';
}

/**
 * Ob die "Pro"-Zusatzfunktionen genutzt werden duerfen (Weinjahr-Rueckblick,
 * Teilen, CSV-Import). Wie beim KI-Scan nur in der Basis-Stufe gesperrt, ab
 * Pro erlaubt.
 */
export function canUseProFeatures(plan: Plan): boolean {
  return plan !== 'basis';
}

/**
 * Ob die "schlaueren" KI-Erkennungsfaehigkeiten aus KI-Erkennung-Runde 3
 * (Commit 16d9f2c, 2026-09-10) genutzt werden duerfen - nur in der
 * Ultra-Stufe, waehrend Pro weiterhin die normale KI-Etikett-Erkennung
 * (Name/Produzent/Jahrgang/Rebsorte/Region/Subregion/Land/Weintyp) hat:
 * 1. Alkoholgehalt-Erkennung vom Etikett (KI-Vision-Pfad + Tesseract-Fallback)
 * 2. Automatischer "Passt zu"-Vorschlag aus der Rebsorte
 * 3. Jahrgangs-Einschaetzung (Jahrgangs-Chart)
 * 4. EAN-Laenderfallback beim Barcode-Scan
 * Unabhaengig von der separaten, zusaetzlich bezahlten Aktualisierungs-
 * Auftrag/Web-Recherche-Funktion (Andrins manuelle Online-Recherche via
 * payment_requests) - die bleibt fuer alle Abo-Stufen unveraendert verfuegbar.
 */
export function canUseAdvancedAiFeatures(plan: Plan): boolean {
  return plan === 'ultra';
}
