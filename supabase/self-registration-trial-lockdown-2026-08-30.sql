-- Schliesst eine Sicherheitsluecke aus der Selbst-Registrierungs-Migration
-- (self-registration-trial-2026-08-28.sql): die dortige INSERT-Policy prueft
-- nur, dass die neue Zeile dem eigenen Konto gehoert (auth.uid() = user_id) -
-- sie schraenkt aber NICHT ein, welche WERTE ein Nutzer sich damit selbst
-- setzen darf. Ein technisch versierter Nutzer koennte die Supabase-API
-- direkt ansprechen (an der App-Oberflaeche vorbei) und sich z. B. eine
-- Testphase bis weit in die Zukunft, eine reduzierte Zugangsgebuehr oder ein
-- hoeheres KI-Tageslimit selbst eintragen.
--
-- Diese Migration ersetzt die Policy durch eine, die zusaetzlich die
-- tatsaechlichen Werte prueft - die App legt beim Sign-up ausschliesslich
-- {user_id, trial_ends_at: heute+7 Tage} an, alles andere bleibt bei den
-- Standardwerten (false/null). Mit 8 Tagen statt 7 als Obergrenze bleibt
-- etwas Puffer fuer Zeitzonen-Rundungsfehler, ohne die eigentliche Grenze
-- (weit in der Zukunft liegende Werte) aufzuweichen.
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank ausfuehren.

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
    and trial_ends_at is not null
    and trial_ends_at between current_date and (current_date + 8)
  );
