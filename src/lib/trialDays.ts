/**
 * Reine Berechnung, bewusst in einer eigenen Datei OHNE jede weitere
 * Abhaengigkeit - TrialStatusScreen.tsx importiert daneben auch
 * pricingConfig.ts (fuer die Zugangsgebuehr-Anzeige), was transitiv den
 * Supabase-Client laedt. Der wirft aber schon beim Modul-Laden einen Fehler,
 * wenn VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY fehlen (siehe
 * supabaseClient.ts) - in der CI-Umgebung (kein .env.local, im Gegensatz zu
 * lokal, wo Vite die Datei direkt vom Dateisystem liest) ist das immer der
 * Fall. Ein Test, der nur diese Tage-Berechnung pruefen will, darf diese
 * Kette darum nicht mit hineinziehen - deshalb eigene Datei statt Export aus
 * der Komponente.
 *
 * Rechnet in ganzen KALENDERTAGEN (beide Daten auf Mitternacht normalisiert),
 * nicht in exakten Millisekunden - sonst zeigt "Letzter Tag" (0) praktisch
 * nie an, weil eine Uhrzeit-genaue Differenz nur in der seltenen Millisekunde
 * exakt 0 waere, fast immer aber noch einen Bruchteil des Tages uebrig laesst
 * und dadurch aufgerundet wird.
 */
export function daysUntil(isoDate: string, now: Date): number {
  const end = new Date(`${isoDate}T00:00:00`);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((end.getTime() - todayMidnight.getTime()) / (24 * 60 * 60 * 1000));
}
