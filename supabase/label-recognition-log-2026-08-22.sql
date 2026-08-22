-- Tageslimit-Zaehler fuer die KI-gestuetzte Etikett-Erkennung (siehe
-- api/recognize-label.ts) - reines Sicherheitsnetz gegen einen Bug/eine
-- Endlosschleife, nicht wegen der Kosten selbst (die sind pro Scan
-- vernachlaessigbar). Jede erfolgreiche Erkennung schreibt eine Zeile; die
-- Funktion prueft vorher, wie viele Zeilen der Nutzer in den letzten 24h
-- hat.
--
-- Absichtlich OHNE Service-Role-Key geschrieben - die Funktion nutzt den
-- Access-Token des aufrufenden Nutzers selbst, RLS sorgt dafuer, dass er
-- automatisch nur seine eigenen Zeilen sieht/schreibt (wie bei "wines").
-- Die Weinapp braucht dadurch weiterhin keinen Service-Role-Key.
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank ausfuehren.

create table public.label_recognition_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade
);

create index label_recognition_log_user_created_idx on public.label_recognition_log (user_id, created_at);

alter table public.label_recognition_log enable row level security;
create policy "eigene Eintraege verwalten" on public.label_recognition_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert on public.label_recognition_log to authenticated;
