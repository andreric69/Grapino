-- Produkt-Analytics: welche Features/Seiten werden tatsaechlich genutzt, um
-- Weiterentwicklung/Support darauf auszurichten - bewusst NICHT zur
-- Ueberwachung einzelner Personen. Es wird ausschliesslich der Name des
-- benutzten Features erfasst, NIE Inhalte (keine Sucheingaben, Weinnamen,
-- Notizen, Mengen o.ae.), keine IP-Adresse, kein Geraete-Fingerprint. Die
-- erlaubten Ereignisnamen sind serverseitig per CHECK-Constraint auf eine
-- feste Liste beschraenkt (kein Freitext moeglich), damit hier nie versehentlich
-- oder durch einen Bug beliebiger Text landet.
--
-- Absichtlich OHNE Service-Role-Key geschrieben - wie bei "label_recognition_log":
-- die Weinapp nutzt den Access-Token des aufrufenden Nutzers selbst, RLS sorgt
-- dafuer, dass er nur eigene Zeilen schreiben kann und keine fremden lesen darf.
-- Nur der Admin-Dienst (Service-Role, siehe grapino-admin) liest aggregiert.
--
-- Aufbewahrung: taeglicher Cron in grapino-admin (api/backup.ts, neuer
-- ?job=purge-usage-log Zweig) loescht Zeilen aelter als 120 Tage automatisch.
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank ausfuehren.

create table public.feature_usage_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_name text not null check (event_name in (
    'page_view_lagerplan',
    'page_view_weinjahr_rueckblick',
    'page_view_lexikon',
    'page_view_entdecken',
    'page_view_statistik',
    'page_view_drucken',
    'share_geklickt',
    'textgroesse_geaendert',
    'export_ausgeloest',
    'chatbubble_geoeffnet',
    'papierkorb_geoeffnet',
    'papierkorb_wiederhergestellt'
  ))
);

create index feature_usage_log_created_at_idx on public.feature_usage_log (created_at desc);
create index feature_usage_log_event_name_idx on public.feature_usage_log (event_name);

alter table public.feature_usage_log enable row level security;
-- Nur Einfuegen, kein "for all"/select fuer Nutzer selbst - eine Nutzerin soll
-- nicht ihr eigenes Protokoll auslesen koennen (dafuer gibt es keinen Zweck in
-- der Kunden-App), nur schreiben. Lesen bleibt dem Service-Role-Key
-- (Admin-App) vorbehalten, der RLS ohnehin umgeht.
create policy "eigene Ereignisse eintragen" on public.feature_usage_log
  for insert with check (auth.uid() = user_id);
grant insert on public.feature_usage_log to authenticated;
