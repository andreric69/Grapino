-- ============================================================================
-- Weinsammlung - Supabase Setup
-- Im Supabase Dashboard unter "SQL Editor" komplett ausfuehren (einmalig).
-- ============================================================================

-- --- Tabelle -----------------------------------------------------------------

create table if not exists public.wines (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  producer text,
  vintage integer,
  grape_variety text,
  region text,
  notes text,
  rating integer check (rating between 1 and 5),
  photo_url text,
  quantity integer not null default 1 check (quantity >= 0),
  is_favorite boolean not null default false,
  is_consumed boolean not null default false,
  price numeric(10, 2) check (price >= 0),
  wine_type text check (wine_type in ('rot', 'weiss', 'rose', 'dessert', 'schaumwein')),
  country text,
  subregion text,
  bottle_size text,
  community_rating numeric(2, 1) check (community_rating between 0 and 5),
  critic_scores text,
  food_pairing text,
  drink_from integer,
  drink_to integer,
  is_wishlist boolean not null default false,
  storage_location text,
  tasting_tannin smallint check (tasting_tannin between 1 and 5),
  tasting_acidity smallint check (tasting_acidity between 1 and 5),
  tasting_sweetness smallint check (tasting_sweetness between 1 and 5),
  tasting_body smallint check (tasting_body between 1 and 5),
  ean_code text,
  photo_urls text[] not null default '{}'
);

-- Falls die Tabelle schon vor diesen Spalten angelegt wurde (bestehende
-- Installation) - fuegt sie nachtraeglich hinzu, ohne etwas zu beschaedigen.
alter table public.wines add column if not exists quantity integer not null default 1 check (quantity >= 0);
alter table public.wines add column if not exists is_favorite boolean not null default false;
alter table public.wines add column if not exists is_consumed boolean not null default false;
alter table public.wines add column if not exists price numeric(10, 2) check (price >= 0);
-- Wein-Typ (Rot/Weiss/Rose/Dessert/Schaumwein), Herkunftsland, Subregion
-- (z.B. Pauillac), Flaschengroesse, externe Durchschnittsbewertung (z.B.
-- Vivino-Community 4.5/5, getrennt von der eigenen 1-5 Sterne-Bewertung),
-- Kritiker-Punkte (Parker/Suckling/Falstaff/Decanter frei als Text) und
-- Essensempfehlung - auf Wunsch eines zweiten Nutzers ergaenzt.
alter table public.wines add column if not exists wine_type text check (wine_type in ('rot', 'weiss', 'rose', 'dessert', 'schaumwein'));
alter table public.wines add column if not exists country text;
alter table public.wines add column if not exists subregion text;
alter table public.wines add column if not exists bottle_size text;
alter table public.wines add column if not exists community_rating numeric(2, 1) check (community_rating between 0 and 5);
alter table public.wines add column if not exists critic_scores text;
alter table public.wines add column if not exists food_pairing text;
-- Trinkfenster (von-bis Jahr), Wunschliste (zaehlt nicht als Bestand/Statistik),
-- Lagerort (z.B. "Keller Regal 3"), strukturierte Verkostungsnotizen (1-5),
-- EAN/Barcode als zusaetzliche Kennung, mehrere Fotos pro Wein (Pfade als
-- Array - "photo_url" bleibt fuer bestehende Eintraege als erstes/Titelfoto
-- erhalten, neue Fotos kommen zusaetzlich in "photo_urls").
alter table public.wines add column if not exists drink_from integer;
alter table public.wines add column if not exists drink_to integer;
alter table public.wines add column if not exists is_wishlist boolean not null default false;
alter table public.wines add column if not exists storage_location text;
alter table public.wines add column if not exists tasting_tannin smallint check (tasting_tannin between 1 and 5);
alter table public.wines add column if not exists tasting_acidity smallint check (tasting_acidity between 1 and 5);
alter table public.wines add column if not exists tasting_sweetness smallint check (tasting_sweetness between 1 and 5);
alter table public.wines add column if not exists tasting_body smallint check (tasting_body between 1 and 5);
alter table public.wines add column if not exists ean_code text;
alter table public.wines add column if not exists photo_urls text[] not null default '{}';

create index if not exists wines_user_id_idx on public.wines (user_id);

-- --- Row Level Security: jeder Nutzer sieht/aendert ausschliesslich eigene Zeilen ---

alter table public.wines enable row level security;

drop policy if exists "owner full access" on public.wines;
create policy "owner full access" on public.wines
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS allein reicht nicht: Postgres prueft zuerst die Tabellen-Grundrechte,
-- erst danach die RLS-Policy. Ohne dieses GRANT bekommt auch ein eingeloggter
-- Nutzer ("authenticated") "permission denied", bevor RLS ueberhaupt greift.
-- "anon" (nicht eingeloggt) bekommt bewusst KEIN Recht.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.wines to authenticated;

-- --- Storage: privater Bucket fuer Etikett-/Flaschenfotos --------------------
-- public = false -> keine oeffentliche URL, Zugriff nur ueber Signed URLs
-- und nur fuer den authentifizierten Besitzer (Pfad "{user_id}/...").

insert into storage.buckets (id, name, public)
values ('wine-photos', 'wine-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "owner read own photos" on storage.objects;
create policy "owner read own photos" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'wine-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "owner upload own photos" on storage.objects;
create policy "owner upload own photos" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'wine-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "owner update own photos" on storage.objects;
create policy "owner update own photos" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'wine-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "owner delete own photos" on storage.objects;
create policy "owner delete own photos" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'wine-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- --- App-Feedback (Sterne + Text + "Trinkgeld"-Wunschbetrag) -----------------
-- Rein informativ - keine echte Zahlung, nur ein Weg fuer den Nutzer, seine
-- Wertschaetzung auszudruecken. Erscheint einmalig als Popup in der App.

create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  message text,
  tip_amount numeric(10, 2) check (tip_amount >= 0)
);

alter table public.app_feedback enable row level security;

drop policy if exists "owner full access" on public.app_feedback;
create policy "owner full access" on public.app_feedback
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.app_feedback to authenticated;

-- --- Trinkverlauf (fuer Rueckblick/Timeline) ---------------------------------
-- Ein Eintrag pro tatsaechlich getrunkener Flasche (nicht pro Wein) - so laesst
-- sich "wie viele Flaschen in den letzten 12 Monaten" korrekt auswerten, auch
-- wenn ein Wein mehrere Flaschen hatte und nur einzelne davon getrunken
-- wurden. Angaben sind ein Schnappschuss zum Zeitpunkt des Trinkens, damit die
-- Auswertung stimmt, selbst wenn der Wein spaeter bearbeitet/geloescht wird.
create table if not exists public.wine_consumption_log (
  id uuid primary key default gen_random_uuid(),
  consumed_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  wine_id uuid references public.wines(id) on delete set null,
  wine_name text not null,
  region text,
  grape_variety text,
  wine_type text
);

create index if not exists wine_consumption_log_user_id_idx on public.wine_consumption_log (user_id);

alter table public.wine_consumption_log enable row level security;

drop policy if exists "owner full access" on public.wine_consumption_log;
create policy "owner full access" on public.wine_consumption_log
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.wine_consumption_log to authenticated;

-- ============================================================================
-- Manuelle Dashboard-Schritte (nicht per SQL, siehe README.md):
--   1. Authentication -> Providers -> Email -> "Allow new users to sign up"
--      AUSSCHALTEN (Self-Signup deaktivieren).
--   2. Authentication -> Users -> "Add user" -> E-Mail + Passwort fuer jeden
--      Nutzer manuell anlegen (Auto Confirm User aktivieren). Jeder Account
--      sieht dank RLS automatisch nur seine eigenen Weine - keine weitere
--      Konfiguration noetig, um einen zusaetzlichen Nutzer hinzuzufuegen.
-- ============================================================================
