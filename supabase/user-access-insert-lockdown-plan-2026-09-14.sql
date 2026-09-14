-- KRITISCHER SICHERHEITSFIX (Nr. 2 im Multi-Agenten-Verkaufsreife-Audit vom
-- 2026-09-14): dieselbe Fehlerklasse wie in
-- user-access-insert-lockdown-stripe-2026-09-14.sql, diesmal bei zwei ANDEREN
-- Spalten. Die dortige Policy wurde repariert, als die Stripe-Spalten
-- (stripe-billing-2026-09-13.sql) dazukamen - aber "plan" (user-plan-
-- 2026-09-13.sql) und "paid_outside_stripe" (user-access-paid-outside-
-- stripe-2026-09-14.sql) kamen zeitlich PARALLEL/DANACH dazu und wurden bei
-- dieser Policy schlicht vergessen nachzuziehen.
--
-- Da eine RLS-WITH-CHECK-Klausel jede nicht erwaehnte Spalte auf JEDEN Wert
-- zulaesst, konnte ein Nutzer beim Sign-up direkt {"plan":"ultra",
-- "paid_outside_stripe":true} mit einschmuggeln - ein einziger manipulierter
-- API-Call genuegt fuer DAUERHAFTEN, kostenlosen "Ultra + ausserhalb Stripe
-- bezahlt"-Status, ganz ohne die Stripe-Spalten ueberhaupt anzufassen. Live
-- gegen die echte Datenbank verifiziert (mit einem Wegwerf-Testkonto, sofort
-- wieder geloescht) - siehe Agenten-Bericht.
--
-- Diese Migration verlangt zusaetzlich, dass ein selbst-registrierender
-- Nutzer nur mit plan='basis' und paid_outside_stripe=false anlegen darf -
-- beides wird ohnehin serverseitig (Admin-App bzw. Stripe-Webhook, beide mit
-- dem Service-Role-Key) spaeter gesetzt, nie vom Client selbst.
--
-- WICHTIG: passend dazu wurde src/hooks/useAuth.tsx (insertTrialRow) so
-- angepasst, dass "plan" und "paid_outside_stripe" beim Sign-up explizit
-- mitgeschickt werden - ohne diesen Code-Deploy wuerde diese Policy jede
-- normale Neuregistrierung ablehnen (der Datenbank-Spaltendefault fuer
-- "plan" ist aus Altnutzer-Bestandsschutz-Gruenden 'ultra', nicht 'basis' -
-- siehe user-plan-2026-09-13.sql).
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank AUSFUEHREN,
-- MOEGLICHST SOFORT - das ist aktiv ausnutzbar. Danach in diesem Repo den
-- neuesten Stand deployen (insertTrialRow-Aenderung), SONST SCHLAEGT JEDE
-- NEUE REGISTRIERUNG FEHL.

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
    and plan = 'basis'
    and paid_outside_stripe = false
    and trial_ends_at is not null
    and trial_ends_at between current_date and (current_date + 8)
  );
