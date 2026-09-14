-- KRITISCHER SICHERHEITSFIX (Nr. 1 im Multi-Agenten-Verkaufsreife-Audit vom
-- 2026-09-14): bisher war die Bezahlpflicht AUSSCHLIESSLICH clientseitig
-- durchgesetzt (ProtectedRoute.tsx / accessControl.ts / planLimits.ts). Die
-- RLS-Policies auf "wines"/Storage/"wine_consumption_log" pruefen seit
-- schema.sql nur "gehoert die Zeile mir" (auth.uid() = user_id) - NIE, ob der
-- Nutzer ueberhaupt noch bezahlten/aktiven Zugang hat.
--
-- Live gegen die echte Datenbank verifiziert (Wegwerf-Testkonto mit
-- abgelaufener Testphase, stripe_subscription_id = null,
-- paid_outside_stripe = false): dieser Nutzer konnte trotzdem uneingeschraenkt
-- Weine anlegen/lesen/aendern (POST/GET/PATCH auf /rest/v1/wines, je HTTP
-- 200/201) und Fotos hochladen (POST auf /storage/v1/object/wine-photos/...,
-- HTTP 200) - einfach indem die App-UI umgangen und der oeffentlich im
-- Browser-Bundle enthaltene anon-Key direkt mit dem eigenen (abgelaufenen)
-- Sitzungs-Token angesprochen wurde. ProtectedRoute.tsx ist nur eine
-- UI-Weiche, keine Sicherheitsgrenze.
--
-- Diese Migration ergaenzt eine zentrale, serverseitige Zugangspruefung
-- (has_active_access) und wendet sie auf alle SCHREIBENDEN Aktionen an
-- (Wein anlegen/aendern/loeschen, Foto hochladen/ersetzen, Flasche als
-- getrunken vermerken). LESEN (SELECT) bleibt bewusst uneingeschraenkt -
-- ein Nutzer soll seine eigenen Daten auch bei abgelaufenem Zugang jederzeit
-- ansehen/exportieren koennen (siehe Impressum-Zusagen zu Kuendigung/Export,
-- Legal-Audit vom selben Tag) - nur NEUE Aenderungen/Zusatzverbrauch sind ab
-- jetzt gesperrt.
--
-- has_active_access() spiegelt exakt die needsPlan-Formel aus
-- src/lib/accessControl.ts: kein Zugang, wenn is_blocked=true, ODER die
-- Testphase abgelaufen ist UND weder ein Stripe-Abo noch "ausserhalb Stripe
-- bezahlt" vorliegt. Existiert (wie bei manchen Alt-/Direkt-von-Andrin-
-- angelegten Konten) gar keine user_access-Zeile, gilt weiterhin "erlaubt"
-- (Bestandsschutz/"default allow", identisch zu DEFAULT_STATUS in
-- accessControl.ts).
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank AUSFUEHREN,
-- MOEGLICHST SOFORT - das ist aktiv ausnutzbar. Passend dazu wurde
-- api/recognize-label.ts um denselben Check ergaenzt (die KI-Etiketterkennung
-- laeuft ueber eine eigene Serverless Function, nicht ueber direkte
-- Datenbank-Schreibzugriffe, und war deshalb von dieser RLS-Aenderung allein
-- nicht abgedeckt).

create or replace function public.has_active_access(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select not (
        is_blocked
        or (
          trial_ends_at is not null
          and trial_ends_at < current_date
          and stripe_subscription_id is null
          and not paid_outside_stripe
        )
      )
      from public.user_access
      where user_id = uid
    ),
    true
  );
$$;

grant execute on function public.has_active_access(uuid) to authenticated;

-- --- wines: Lesen bleibt frei, Schreiben braucht aktiven Zugang -------------

drop policy if exists "owner full access" on public.wines;

create policy "owner read access" on public.wines
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "owner insert access (aktiver Zugang erforderlich)" on public.wines
  for insert
  to authenticated
  with check (auth.uid() = user_id and public.has_active_access(auth.uid()));

create policy "owner update access (aktiver Zugang erforderlich)" on public.wines
  for update
  to authenticated
  using (auth.uid() = user_id and public.has_active_access(auth.uid()))
  with check (auth.uid() = user_id and public.has_active_access(auth.uid()));

create policy "owner delete access (aktiver Zugang erforderlich)" on public.wines
  for delete
  to authenticated
  using (auth.uid() = user_id and public.has_active_access(auth.uid()));

-- --- Serverseitige Wein-Obergrenze je Abo-Stufe -----------------------------
-- Basis 100 / Pro 400 / Ultra unbegrenzt - bisher nur clientseitig in
-- planLimits.ts durchgesetzt (getMaxWines), per direktem API-Call beliebig
-- ueberschreitbar. Zaehlt wie die App selbst nur nicht-geloeschte Weine
-- (deleted_at is null, siehe wines-soft-delete-2026-09-10.sql).

create or replace function public.enforce_wine_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_plan text;
  max_wines integer;
  current_count integer;
begin
  select plan into user_plan from public.user_access where user_id = new.user_id;
  user_plan := coalesce(user_plan, 'ultra');

  max_wines := case user_plan
    when 'basis' then 100
    when 'pro' then 400
    else null
  end;

  if max_wines is not null then
    select count(*) into current_count
    from public.wines
    where user_id = new.user_id and deleted_at is null;

    if current_count >= max_wines then
      raise exception 'Maximale Anzahl Weine fuer die Abo-Stufe "%" erreicht (% von %).', user_plan, current_count, max_wines
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists wines_enforce_plan_limit on public.wines;
create trigger wines_enforce_plan_limit
  before insert on public.wines
  for each row
  execute function public.enforce_wine_plan_limit();

-- --- wine_consumption_log: neue Eintraege (Flasche getrunken) brauchen ------
-- ebenfalls aktiven Zugang - Lesen (Rueckblick/Statistik) bleibt frei.

drop policy if exists "owner full access" on public.wine_consumption_log;

create policy "owner read access" on public.wine_consumption_log
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "owner insert access (aktiver Zugang erforderlich)" on public.wine_consumption_log
  for insert
  to authenticated
  with check (auth.uid() = user_id and public.has_active_access(auth.uid()));

create policy "owner update access" on public.wine_consumption_log
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "owner delete access" on public.wine_consumption_log
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- --- Storage (wine-photos): Hochladen/Ersetzen braucht aktiven Zugang -------
-- Ansehen/Loeschen bereits vorhandener Fotos bleibt frei (gleiche Logik wie
-- bei "wines": Lesen/Aufraeumen immer erlaubt, nur Zusatzverbrauch gesperrt).

drop policy if exists "owner upload own photos" on storage.objects;
create policy "owner upload own photos" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'wine-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.has_active_access(auth.uid())
  );

drop policy if exists "owner update own photos" on storage.objects;
create policy "owner update own photos" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'wine-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'wine-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.has_active_access(auth.uid())
  );
