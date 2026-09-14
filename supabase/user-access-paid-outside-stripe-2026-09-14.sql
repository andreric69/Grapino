-- Manche Nutzer (z. B. Familie/Bekannte von vor der Stripe-Einfuehrung) haben
-- Andrin direkt bar/per TWINT bezahlt statt ueber ein Stripe-Abo - fuer sie
-- zeigte die Admin-App bisher "kein Stripe-Abo", obwohl sie tatsaechlich
-- bezahlt haben (siehe planBadge() in grapino-admin/src/pages/UsersPage.tsx).
-- Dieses Feld laesst Andrin das manuell bestaetigen, damit die Anzeige
-- stimmt - Kontext/Betrag/Datum gehoeren in eine normale Admin-Notiz
-- (admin_user_notes), kein eigenes Feld dafuer noetig.
--
-- Wirkt auch auf den Zugangsstop nach Ablauf der Testphase (needsPlan in
-- accessControl.ts): wer hier bestaetigt ist, muss kein Stripe-Abo waehlen,
-- genau wie bei einem echten stripe_subscription_id.
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank ausfuehren.

alter table public.user_access add column if not exists paid_outside_stripe boolean not null default false;
