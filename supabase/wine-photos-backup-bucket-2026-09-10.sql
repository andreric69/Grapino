-- Legt einen zweiten, privaten Storage-Bucket fuer eine unabhaengige
-- woechentliche Sicherung der Weinfotos an ("wine-photos-backup"). Bisher
-- gab es fuer Fotos in "wine-photos" gar keine eigene Sicherung - nur die
-- Datenbankzeilen werden taeglich gesichert (siehe grapino-admin-Cronjob),
-- die Fotos selbst waren bei einem Storage-Problem unwiederbringlich weg.
--
-- Keine RLS-Policies noetig: dieser Bucket wird ausschliesslich vom
-- grapino-admin-Backup-Cronjob mit dem service_role-Schluessel befuellt
-- (der RLS ohnehin umgeht) - weder "authenticated" noch "anon" sollen
-- direkten Zugriff bekommen.
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank ausfuehren.

insert into storage.buckets (id, name, public)
values ('wine-photos-backup', 'wine-photos-backup', false)
on conflict (id) do nothing;
