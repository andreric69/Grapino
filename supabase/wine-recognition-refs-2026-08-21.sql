-- Wachsende, private Referenzdatenbank fuer die Foto-Erkennung: jedes Mal,
-- wenn ein per Foto erfasster/korrigierter Wein gespeichert wird, landet
-- hier ein Schnappschuss (OCR-Text + Bild-Embedding + die endgueltig
-- bestaetigten Felder). Beim naechsten Foto wird zuerst hiergegen
-- abgeglichen, bevor die eigentliche Erkennung (Tesseract/Referenzliste)
-- ueberhaupt laeuft - erkennt bereits erfasste Weine schnell und
-- zuverlaessig wieder.
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank ausfuehren.

create extension if not exists vector;

create table public.wine_recognition_refs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  wine_id uuid not null references public.wines(id) on delete cascade,
  -- Normalisierter Volltext, wie ihn die Texterkennung vom Etikett gelesen
  -- hat - fuer den unscharfen Text-Abgleich beim naechsten Foto.
  ocr_text text,
  -- Bild-Embedding des zugeschnittenen Etiketts (512 Dimensionen, client-
  -- seitig berechnet) - fuer die visuelle Aehnlichkeitssuche.
  embedding vector(512),
  -- Die tatsaechlich bestaetigten/korrigierten Werte (nicht die rohe
  -- OCR-Vermutung) - das ist es, was beim Wiedererkennen vorgeschlagen wird.
  name text not null,
  producer text,
  vintage integer,
  grape_variety text,
  region text,
  subregion text,
  country text,
  wine_type text
);

-- Ein Wein hat hoechstens eine Referenz - wird bei jeder erneuten
-- Bestaetigung/Korrektur ueberschrieben (upsert), nicht angehaeuft.
create unique index wine_recognition_refs_wine_id_idx on public.wine_recognition_refs (wine_id);
create index wine_recognition_refs_user_id_idx on public.wine_recognition_refs (user_id);

alter table public.wine_recognition_refs enable row level security;

create policy "eigene Referenzen verwalten"
  on public.wine_recognition_refs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.wine_recognition_refs to authenticated;

-- Kein Index auf der Vektor-Spalte noetig - bei einer privaten Sammlung
-- (hoechstens ein paar hundert Zeilen) ist ein normaler Sequential Scan mit
-- dem <=>-Distanzoperator schnell genug, ganz ohne die Komplexitaet/
-- Mindestgroesse eines ivfflat/hnsw-Index.
