-- Fuehrt einen "Papierkorb" fuer Weine ein: Loeschen entfernt eine Flasche nicht
-- mehr sofort und unwiderruflich, sondern markiert sie nur als geloescht
-- (deleted_at gesetzt). So kann ein versehentliches Loeschen 30 Tage lang in
-- den Einstellungen rueckgaengig gemacht werden, bevor die Zeile (und ihre
-- Fotos) endgueltig entfernt werden - manuell oder durch einen separaten,
-- automatischen 30-Tage-Aufraeum-Job.
--
-- Keine Aenderung an der RLS Policy noetig: "for all using (auth.uid() =
-- user_id) with check (auth.uid() = user_id)" erlaubt dem Besitzer weiterhin
-- uneingeschraenkt select/update/delete, unabhaengig vom Wert dieser Spalte.
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank ausfuehren.

alter table public.wines add column if not exists deleted_at timestamptz;
create index if not exists wines_deleted_at_idx on public.wines (deleted_at) where deleted_at is not null;
