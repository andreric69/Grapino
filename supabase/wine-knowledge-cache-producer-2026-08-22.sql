-- wine_knowledge_cache hatte bisher nur "producer_key" (klein geschrieben,
-- nur zum Abgleichen) - fuer den neuen Name+Jahrgang-Fallback (siehe
-- wineKnowledgeCache.ts), der den Produzenten selbst als Vorschlag
-- uebernimmt, wenn das Etikett keinen zeigt, braucht es auch die richtig
-- geschriebene Form.
--
-- Im Supabase Dashboard -> SQL Editor der Weinapp-Datenbank ausfuehren.

alter table public.wine_knowledge_cache
  add column if not exists producer text;
