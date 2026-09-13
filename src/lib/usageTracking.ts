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
 *
 * Import von "../supabaseClient" bewusst dynamisch statt am Dateianfang:
 * supabaseClient.ts wirft beim Laden sofort, wenn VITE_SUPABASE_URL/
 * VITE_SUPABASE_ANON_KEY fehlen (z.B. in der CI-Testumgebung ohne .env.local).
 * Ein Modul-weiter Import wuerde JEDE Komponente, die trackEvent nur
 * importiert (auch ohne es je aufzurufen), in Tests zum Abbrechen bringen -
 * live in der CI reproduziert (TrashReminderBanner.test.ts schlug dadurch
 * fehl, obwohl es nur eine reine Funktion aus derselben Datei testet).
 */
export function trackEvent(event: UsageEvent): void {
  import('../supabaseClient')
    .then(({ supabase }) => supabase.from('feature_usage_log').insert({ event_name: event }))
    .then((result) => {
      if (result.error) console.error('Nutzungs-Protokoll-Fehler:', result.error);
    })
    .catch((e) => console.error('Nutzungs-Protokoll-Fehler:', e));
}
