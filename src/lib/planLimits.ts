/**
 * Reine Hilfsfunktionen fuer das 3-Stufen-Abomodell (Basis/Pro/Ultra), siehe
 * supabase/user-plan-2026-09-13.sql fuer die zugehoerige Migration und
 * src/lib/accessControl.ts fuer den Abruf der aktuellen Stufe eines Nutzers.
 */
export type Plan = 'basis' | 'pro' | 'ultra';

export const PLAN_LABELS: Record<Plan, string> = { basis: 'Basis', pro: 'Pro', ultra: 'Ultra' };

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
