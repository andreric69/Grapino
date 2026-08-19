-- Namenskorrektur Teil 2: 7 weitere Weine mit demselben Fehlermuster
-- (Region redundant im Namensfeld) - beim ersten Durchgang nur bei
-- Bordeaux-Weinen gesucht, hier zusaetzlich bei Spanien/Italien gefunden.
-- Erzeugt 2026-08-19. Alle 5 Faelle recherchiert und mit hoher Konfidenz
-- ueber offizielle Winzer-Websites bestaetigt (siehe Chat-Verlauf).
--
-- Im Supabase Dashboard -> SQL Editor einfuegen und ausfuehren.

UPDATE public.wines SET name = 'Gran Reserva (Finca Ygay)' WHERE id = 'd6ec1d0b-e0d4-4848-9072-1a8cfb9ccce9'; -- war: Gran Reserva Rioja (Finca Ygay)
UPDATE public.wines SET name = 'Gran Reserva (Finca Ygay)' WHERE id = 'cc328949-5e64-4e9e-8765-90532855ae90'; -- war: Gran Reserva Rioja (Finca Ygay)
UPDATE public.wines SET name = 'Reserva' WHERE id = '18417078-b5be-417f-9c2a-c7eafe55e6e6'; -- war: Reserva Ribera del Duero (Arzuaga)
UPDATE public.wines SET name = 'Reserva' WHERE id = 'f06713fd-3bd3-4ad4-b7a4-03a61d14ba92'; -- war: Reserva Ribera del Duero (Arzuaga)
UPDATE public.wines SET name = 'TSM' WHERE id = 'aefd7133-b97d-4052-8d9b-cbe910749324'; -- war: Ribera del Duero TSM (Carmelo Rodero)
UPDATE public.wines SET name = 'Sor Ugo' WHERE id = '90c3e2ab-fab9-451b-8b02-7c94b05b97bc'; -- war: Sor Ugo Bolgheri Superiore (Aia Vecchia)
UPDATE public.wines SET name = 'Oreno' WHERE id = '2a4c1a5d-c6b5-4c3e-a370-232cb38272d7'; -- war: Oreno Toscana (Tenuta Sette Ponti)
