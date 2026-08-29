-- Offene Selbst-Registrierung: bisher legte ausschliesslich die Admin-App
-- Konten an (service_role) - jetzt kann sich jeder ueber die Weinapp selbst
-- ein Konto anlegen. Damit ein frisch selbst registrierter Nutzer sich
-- automatisch eine 7-taegige Testphase setzen kann (kein Admin da, der das
-- von Hand macht), braucht es eine INSERT-Policy fuer user_access - bisher
-- durfte "authenticated" dort nur lesen, nie schreiben.
--
-- Bewusst nur INSERT, kein UPDATE/DELETE: user_id ist Primary Key, ein
-- zweiter Insert-Versuch fuer dieselbe Zeile schlaegt darum automatisch fehl
-- (Primary-Key-Konflikt) - ein Nutzer kann seine eigene Zeile also nur EINMAL
-- beim Sign-up anlegen, nie nachtraeglich ueberschreiben (z. B. um eine
-- Blockade durch die Admin-App rueckgaengig zu machen).
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank ausfuehren.

create policy "eigene Testphase beim Sign-up einmalig anlegen"
  on public.user_access
  for insert
  to authenticated
  with check (auth.uid() = user_id);

grant insert on public.user_access to authenticated;
