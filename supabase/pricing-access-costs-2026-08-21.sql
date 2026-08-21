-- Admin-editierbare Preise, Zugangs-Blockade/Testabo pro Nutzer, und
-- erweiterte Kosten-Uebersicht (wiederkehrend vs. einmalig).
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank ausfuehren.
-- Betrifft beide Apps (Weinapp + Admin) - sie teilen sich dieselbe Datenbank.

-- --- 1) Preise fuer die Aktualisierungs-Auftraege (bisher im Code fest
-- verdrahtet, jetzt in der DB, admin-editierbar ueber die Admin-App) --------
create table public.pricing_config (
  id integer primary key default 1 check (id = 1), -- absichtlich nur eine einzige Zeile
  trinkfenster_price numeric(10, 2) not null default 0.40,
  name_price numeric(10, 2) not null default 0.20,
  refresh_price numeric(10, 2) not null default 1.50,
  neue_weine_price numeric(10, 2) not null default 1.00,
  ultra_price numeric(10, 2) not null default 2.50,
  minimum_price numeric(10, 2) not null default 3.00,
  updated_at timestamptz not null default now()
);
insert into public.pricing_config (id) values (1);

alter table public.pricing_config enable row level security;
create policy "Preise lesen" on public.pricing_config for select using (auth.role() = 'authenticated');
grant select on public.pricing_config to authenticated;
-- Kein insert/update/delete fuer "authenticated" - nur die Admin-App (service_role) darf Preise aendern.

-- --- 2) Zugangs-Status pro Nutzer: Blockade (mit Grund + Betrag) und
-- Testabo-Ende. Faellt eine Zeile weg oder ist is_blocked=false, ist der
-- Nutzer ganz normal drin - "default allow", nichts blockiert automatisch. --
create table public.user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_blocked boolean not null default false,
  block_reason text,
  block_amount numeric(10, 2),
  trial_ends_at date,
  updated_at timestamptz not null default now()
);

alter table public.user_access enable row level security;
create policy "eigenen Zugangsstatus lesen" on public.user_access for select using (auth.uid() = user_id);
grant select on public.user_access to authenticated;
-- Kein insert/update/delete fuer "authenticated" - nur die Admin-App setzt/aendert das.

-- --- 3) Kosten-Uebersicht: "anpassen" (Update) war bisher nicht moeglich,
-- nur hinzufuegen/loeschen - plus Unterscheidung einmalig/wiederkehrend fuers
-- Dashboard. -----------------------------------------------------------------
alter table public.admin_costs
  add column recurrence text not null default 'einmalig' check (recurrence in ('einmalig', 'monatlich'));
