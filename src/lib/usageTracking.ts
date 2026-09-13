import { supabase } from '../supabaseClient';

/**
 * Feste, geschlossene Liste erlaubter Ereignisnamen - deckt sich exakt mit dem
 * CHECK-Constraint in supabase/feature-usage-log-2026-09-13.sql. Bewusst kein
 * Freitext/keine Parameter: es wird nur ERFASST DASS ein Feature benutzt
 * wurde, nie WIE oder WOMIT (siehe Migrations-Kommentar zur Begruendung).
 */
export type UsageEvent =
  | 'page_view_lagerplan'
  | 'page_view_weinjahr_rueckblick'
  | 'page_view_lexikon'
  | 'page_view_entdecken'
  | 'page_view_statistik'
  | 'page_view_drucken'
  | 'share_geklickt'
  | 'textgroesse_geaendert'
  | 'export_ausgeloest'
  | 'chatbubble_geoeffnet'
  | 'papierkorb_geoeffnet'
  | 'papierkorb_wiederhergestellt';

/**
 * Schreibt ein Nutzungs-Ereignis - "fire and forget", darf den eigentlichen
 * Vorgang (Seite anzeigen, Button-Aktion) nie verzoegern oder bei einem Fehler
 * unterbrechen. Ohne "await" aufrufen, Fehler landen nur in der Konsole.
 * Solange die Migration noch nicht angewendet ist, schlaegt der Insert mit
 * "relation does not exist" fehl - das wird hier abgefangen und einmalig
 * geloggt, bricht aber nichts in der App.
 */
export function trackEvent(event: UsageEvent): void {
  supabase
    .from('feature_usage_log')
    .insert({ event_name: event })
    .then(({ error }) => {
      if (error) console.error('Nutzungs-Protokoll-Fehler:', error);
    });
}
