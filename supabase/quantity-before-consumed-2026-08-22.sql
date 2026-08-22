-- Behebt einen Bug beim "Zurueck in den Vorrat" holen eines komplett
-- getrunkenen Weins: bisher wurde IMMER nur 1 Flasche wiederhergestellt und
-- nur 1 Trinkverlauf-Eintrag rueckgaengig gemacht, selbst wenn mehrere
-- Flaschen auf einmal getrunken wurden (z. B. 6 auf einmal) - der Rest war
-- fuer immer verloren, ohne dass der Nutzer das gemerkt haette.
--
-- quantity_before_consumed haelt den Bestand fest, der unmittelbar vor dem
-- Trink-Vorgang bestand, der die Menge auf 0 gebracht hat. Bleibt null,
-- solange der Wein nicht (komplett) getrunken ist.
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank ausfuehren.

alter table public.wines
  add column if not exists quantity_before_consumed integer;
