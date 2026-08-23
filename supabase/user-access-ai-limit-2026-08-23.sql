-- Zwei weitere pro-Nutzer einstellbare Werte auf user_access, admin-editierbar
-- ueber UserDetailPanel:
--
-- ai_daily_limit: ueberschreibt das globale Tageslimit fuer die KI-Etikett-
-- Erkennung (Standard 100, siehe DAILY_LIMIT in api/recognize-label.ts) fuer
-- genau diesen Nutzer - z. B. hoeher fuer jemanden mit einer riesigen
-- Sammlung, niedriger/0 bei Missbrauchsverdacht. NULL = globaler Standard.
--
-- custom_access_fee: ueberschreibt die einmalige Zugangsgebuehr
-- (pricing_config.access_fee) fuer genau diesen Nutzer - z. B. fuer Familie
-- oder besondere Vereinbarungen. NULL = normaler Preis. Rein informativ,
-- wird nirgends automatisch durchgesetzt (Zahlungsanfragen bleiben manuell).
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank ausfuehren.

alter table public.user_access
  add column if not exists ai_daily_limit integer,
  add column if not exists custom_access_fee numeric(10, 2);
