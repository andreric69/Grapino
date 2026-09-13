-- Stripe-Anbindung fuer das Basis/Pro/Ultra-Abomodell (siehe planLimits.ts).
-- stripe_customer_id verknuepft einen Nutzer mit seinem Stripe-Kunden (fuer
-- den Checkout und das Kundenportal), stripe_subscription_id mit dem
-- aktuellen Abo (damit der Webhook bei einer Statusaenderung weiss, welche
-- Zeile zu aktualisieren ist). Beide bleiben leer, bis der Nutzer den ersten
-- Checkout durchlaeuft - reine Ergaenzung, kein bestehendes Verhalten
-- aendert sich dadurch.
--
-- Bewusst OHNE eigene RLS-Policy fuer Nutzer: geschrieben wird ausschliesslich
-- server-seitig durch api/create-checkout-session.ts und api/stripe-webhook.ts
-- (beide mit dem Service-Role-Key, siehe README-Hinweis dort) - ein Nutzer
-- soll diese Felder nicht selbst per REST-API veraendern koennen, da sie
-- direkt steuern, welches Abo/welche Rechnungsadresse bei Stripe verwendet
-- wird. Die bestehende "eigenen Zugangsstatus lesen"-Policy deckt weiterhin
-- das Lesen der eigenen Zeile ab (relevant z. B. fuer eine kuenftige
-- "aktuelles Abo"-Anzeige in den Einstellungen).
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank ausfuehren.

alter table public.user_access add column if not exists stripe_customer_id text unique;
alter table public.user_access add column if not exists stripe_subscription_id text;
