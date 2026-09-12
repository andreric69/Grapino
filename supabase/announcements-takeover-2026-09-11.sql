-- Fuehrt eine Eskalationsstufe fuer Ankuendigungen ein: normalerweise
-- erscheint eine Ankuendigung nur als kleine, dezente Banner-Karte oben auf
-- der Sammlungs-Seite (leicht uebersehbar). Fuer wirklich wichtige
-- Mitteilungen (z. B. grosse App-Updates, geplante Wartung) kann der Admin
-- eine Ankuendigung stattdessen als "Vollbild-Popup" markieren - sie wird
-- dann beim naechsten App-Start als ganze App einnehmendes Overlay gezeigt,
-- bevor der Nutzer weitermachen kann (analog zu BlockScreen/
-- TrialStatusScreen), mit genau einem Bestaetigen-Button.
--
-- Keine Aenderung an bestehenden Zeilen noetig: der Default "false" sorgt
-- dafuer, dass alle bisherigen Ankuendigungen weiterhin normal als
-- Banner-Karte erscheinen.
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank ausfuehren.

alter table public.announcements add column if not exists is_takeover boolean not null default false;
