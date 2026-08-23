-- Manuelle Einnahmen-Eintraege (z.B. Bar-/Twint-Zahlung ausserhalb der
-- payment_requests-Anfragen) - ergaenzt in der Admin-App die automatisch aus
-- bezahlten payment_requests berechneten Einnahmen fuer die
-- Gewinn/Verlust-Uebersicht. Gleiches Muster wie admin_costs.
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank ausfuehren.
-- Betrifft nur die Admin-App (service_role) - kein Zugriff durch die Weinapp.

create table public.admin_income (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  label text not null,
  amount numeric(10, 2) not null,
  note text
);

alter table public.admin_income enable row level security;
-- Bewusst keine Policies fuer "authenticated" - nur service_role (Admin-App)
-- kommt ueberhaupt an diese Tabelle heran.
