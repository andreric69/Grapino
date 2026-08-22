-- Geteilter Wissens-Cache: Trinkfenster/Kritiker-Punkte/Food-Pairing, die
-- fuer einen Wein (Name+Produzent+Jahrgang) schon einmal recherchiert
-- wurden, stehen sofort JEDEM Nutzer zur Verfuegung, der denselben Wein
-- scannt - ohne pro Scan erneut zu recherchieren und ohne laufend
-- kostenpflichtige KI-Anbindung. Wird als Nebeneffekt befuellt, wenn ein
-- Aktualisierungsauftrag (enrichment_order) im Admin-Tool als "erledigt"
-- markiert wird (siehe api/commerce.ts, syncWineKnowledgeCache).
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank ausfuehren.

create table public.wine_knowledge_cache (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Normalisiert (trim + lowercase) - gleiche Normalisierung wie identityKey()
  -- in src/lib/importMerge.ts, damit derselbe Wein immer denselben
  -- Schluessel ergibt, unabhaengig von Gross-/Kleinschreibung.
  name_key text not null,
  producer_key text not null default '',
  vintage integer,
  grape_variety text,
  region text,
  subregion text,
  country text,
  wine_type text,
  drink_from integer,
  drink_to integer,
  critic_scores text,
  food_pairing text,
  source text not null default 'admin_research'
);

create unique index wine_knowledge_cache_key_idx on public.wine_knowledge_cache (name_key, producer_key, vintage);

alter table public.wine_knowledge_cache enable row level security;
create policy "Wissens-Cache lesen" on public.wine_knowledge_cache for select using (auth.role() = 'authenticated');
grant select on public.wine_knowledge_cache to authenticated;
-- Kein insert/update/delete fuer "authenticated" - nur die Admin-App (service_role) darf den Cache befuellen.
