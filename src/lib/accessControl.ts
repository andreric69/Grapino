import { supabase } from '../supabaseClient';
import type { Plan } from './planLimits';
import { daysUntil } from './trialDays';

export interface AccessStatus {
  isBlocked: boolean;
  blockReason: string | null;
  blockAmount: number | null;
  trialEndsAt: string | null;
  plan: Plan;
  // true, wenn die kostenlose Testphase abgelaufen ist und (noch) kein
  // Stripe-Abo existiert - ersetzt das frueher rein manuelle Nachhalten der
  // einmaligen Zugangsgebuehr durch Andrin. Nur fuer Selbst-Registrierungen
  // relevant (siehe useAuth.tsx/insertTrialRow): Konten ohne trial_ends_at
  // (z. B. von Andrin direkt angelegt) haben nie needsPlan=true - Bestandsschutz.
  needsPlan: boolean;
  // Manuell von Andrin bestaetigt: ausserhalb Stripe bezahlt (bar/TWINT),
  // siehe UserDetailPanel.tsx in der Admin-App. Zaehlt fuer needsPlan
  // genauso wie ein echtes Stripe-Abo.
  paidOutsideStripe: boolean;
}

const DEFAULT_STATUS: AccessStatus = {
  isBlocked: false,
  blockReason: null,
  blockAmount: null,
  trialEndsAt: null,
  // "default allow" gilt jetzt auch fuer die Abo-Stufe: fehlt die Zeile ganz
  // oder schlaegt der Request fehl, gilt 'ultra' (unbegrenzt, alle Funktionen)
  // statt versehentlich jemanden einzuschraenken.
  plan: 'ultra',
  needsPlan: false,
  paidOutsideStripe: false,
};

// Postgres-Fehlermeldung, wenn die Spalte "plan" noch nicht per Migration
// (supabase/user-plan-2026-09-13.sql) angelegt wurde - gleiches Muster wie
// fuer "is_takeover" in announcementRepository.ts bzw. "deleted_at" in
// grapino-admin/api/backup.ts.
const PLAN_COLUMN_MISSING = /column .*plan.* does not exist/i;
// Gleiches Muster fuer "paid_outside_stripe" (supabase/user-access-paid-
// outside-stripe-2026-09-14.sql) - eigene, spaetere Migration, kann
// unabhaengig von "plan" noch ausstehen.
const PAID_OUTSIDE_STRIPE_COLUMN_MISSING = /column .*paid_outside_stripe.* does not exist/i;

/**
 * Liest den eigenen Zugangsstatus (nur von der Admin-App gesetzt, siehe
 * user_access in Supabase). Fehlt die Zeile ganz (Normalfall - z. B. Vater/
 * Thomas, fuer die nie eine Blockade angelegt wurde) oder schlaegt der
 * Request fehl, gilt "nicht blockiert" - bewusst "default allow", damit ein
 * Datenbankfehler nie versehentlich den ganzen App-Zugang sperrt.
 *
 * Solange die Migration user-plan-2026-09-13.sql noch nicht angewendet ist,
 * fehlt die Spalte "plan" in der Datenbank - der erste Versuch schlaegt dann
 * mit PLAN_COLUMN_MISSING fehl und wird hier abgefangen: erneuter Versuch
 * ohne diese Spalte, Stufe gilt bis zur Migration einheitlich als 'ultra'
 * (Bestandsschutz, siehe DEFAULT_STATUS und die Migration selbst).
 */
export async function getAccessStatus(): Promise<AccessStatus> {
  let { data, error } = await supabase
    .from('user_access')
    .select('is_blocked, block_reason, block_amount, trial_ends_at, plan, stripe_subscription_id, paid_outside_stripe')
    .maybeSingle();

  if (error && PAID_OUTSIDE_STRIPE_COLUMN_MISSING.test(error.message)) {
    const fallback = await supabase
      .from('user_access')
      .select('is_blocked, block_reason, block_amount, trial_ends_at, plan, stripe_subscription_id')
      .maybeSingle();
    data = fallback.data ? { ...fallback.data, paid_outside_stripe: false } : fallback.data;
    error = fallback.error;
  }

  if (error && PLAN_COLUMN_MISSING.test(error.message)) {
    const fallback = await supabase
      .from('user_access')
      .select('is_blocked, block_reason, block_amount, trial_ends_at, stripe_subscription_id')
      .maybeSingle();
    data = fallback.data ? { ...fallback.data, plan: 'ultra', paid_outside_stripe: false } : fallback.data;
    error = fallback.error;
  }

  if (error || !data) return DEFAULT_STATUS;
  const isBlocked = data.is_blocked;
  const trialEndsAt = data.trial_ends_at;
  const paidOutsideStripe = data.paid_outside_stripe ?? false;
  const needsPlan =
    !isBlocked && trialEndsAt !== null && daysUntil(trialEndsAt, new Date()) < 0 && !data.stripe_subscription_id && !paidOutsideStripe;
  return {
    isBlocked,
    blockReason: data.block_reason,
    blockAmount: data.block_amount,
    trialEndsAt,
    plan: (data.plan ?? 'ultra') as Plan,
    needsPlan,
    paidOutsideStripe,
  };
}
