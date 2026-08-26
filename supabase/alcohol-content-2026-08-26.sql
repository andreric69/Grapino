-- Neues Feld fuer den Alkoholgehalt (% vol), z. B. 14.5 - wurde bisher beim
-- Import aus Excel-Tabellen (z. B. Cave Perdrizat) nicht uebernommen, da es
-- kein Feld dafuer gab.
alter table public.wines add column alcohol_content numeric;
