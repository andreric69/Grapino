-- Einmalige Zugangsgebuehr als eigenes Feld in der bestehenden Preis-
-- Konfiguration (statt fest im Code) - admin-editierbar wie die anderen
-- Preise, damit sie sich ohne Deploy aendern laesst und in der App (Impressum)
-- live angezeigt werden kann.
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank ausfuehren.

alter table public.pricing_config
  add column access_fee numeric(10, 2) not null default 45.00;
