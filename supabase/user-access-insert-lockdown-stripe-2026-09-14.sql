-- KRITISCHER SICHERHEITSFIX: schliesst eine Luecke aus der Selbst-Registrierungs-
-- Migration (self-registration-trial-lockdown-2026-08-30.sql), die VOR den
-- Stripe-Spalten (stripe-billing-2026-09-13.sql) entstand und seither nicht
-- nachgezogen wurde.
--
-- Die bisherige INSERT-Policy prueft is_blocked/block_reason/block_amount/
-- ai_daily_limit/custom_access_fee/trial_ends_at, ERWAEHNT ABER NICHT
-- stripe_customer_id/stripe_subscription_id. Da eine RLS-WITH-CHECK-Klausel
-- jede nicht erwaehnte Spalte auf JEDEN Wert zulaesst, konnte ein Nutzer beim
-- Sign-up direkt einen frei erfundenen stripe_subscription_id-Wert mit
-- einschmuggeln (z. B. {user_id, trial_ends_at, stripe_subscription_id:
-- "sub_irgendwas"}). Die Zugangspruefung (accessControl.ts, needsPlan) haelt
-- jeden Nutzer mit gesetzter stripe_subscription_id automatisch fuer einen
-- zahlenden Abonnenten - das erlaubte es, den gesamten Testphase-Ablauf/
-- Abo-Zwang OHNE JEDE ZAHLUNG dauerhaft zu umgehen. Live gegen die echte
-- Datenbank verifiziert (mit einem Wegwerf-Testkonto, sofort geloescht).
--
-- Diese Migration ersetzt die Policy durch eine, die zusaetzlich verlangt,
-- dass beide Stripe-Spalten beim Sign-up leer bleiben - sie werden ohnehin
-- ausschliesslich vom Server (create-checkout-session.ts, stripe-webhook.ts,
-- beide mit dem Service-Role-Key) gesetzt, nie vom Client.
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank AUSFUEHREN,
-- MOEGLICHST SOFORT - das ist aktiv ausnutzbar.

drop policy if exists "eigene Testphase beim Sign-up einmalig anlegen" on public.user_access;

create policy "eigene Testphase beim Sign-up einmalig anlegen"
  on public.user_access
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and is_blocked = false
    and block_reason is null
    and block_amount is null
    and ai_daily_limit is null
    and custom_access_fee is null
    and stripe_customer_id is null
    and stripe_subscription_id is null
    and trial_ends_at is not null
    and trial_ends_at between current_date and (current_date + 8)
  );
