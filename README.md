# Grapino

Private Weinsammlungs-App als installierbare PWA (iPhone + iPad). Kostenlos im Betrieb: Supabase Free-Tier (Datenbank, Foto-Speicher, Login) + Vercel Free-Tier (Hosting) + Tesseract.js (Etikett-Texterkennung laeuft im Browser, keine bezahlte API).

## Funktionen

- Übersicht (Raster/Liste umschaltbar) mit Suche, Filter (Jahrgang/Region/Subregion/Land/Rebsorte/Typ/Flaschengrösse/Bewertung), mehreren Sortierungen, Favoriten-Filter, Tabs für Vorrat/Wunschliste/Getrunken
- Detailansicht mit Fotokarussell (Vollbildzoom), Bearbeiten, Löschen (mit Bestätigung)
- Wein hinzufügen: Live-Kamera direkt in der App, Foto aus der Galerie, mehrere Fotos pro Wein, oder komplett manuelle Eingabe ohne Foto - Platzhalter-Flasche mit dem Weinnamen, solange kein Foto vorhanden ist
- Barcode-/QR-Code-Scanner (funktioniert auch auf iOS): sucht bei einem EAN-Treffer in einer freien Produktdatenbank (Open Food Facts) nach Angaben und ggf. einem Foto-Vorschlag - alles nur als Vorschlag, nichts wird automatisch übernommen
- Etikett-Texterkennung (Tesseract.js, läuft komplett im Browser) schlägt Name/Produzent/Jahrgang/Rebsorte/Region vor - erkennt auch mehrwortige Namen (z. B. "Domaine de Chevalier") als zusammenhängende Phrase, abgeglichen gegen eine echte, mehrsprachige Referenzliste aus Wikidata (~4300 Rebsorten inkl. Synonymen wie Shiraz/Syrah, ~2900 Weingüter, ~2100 Regionen) - immer nur als editierbarer Vorschlag, nie automatisch gespeichert
- Duplikat-Erkennung beim Anlegen und beim CSV-Import (fasst exakt gleiche Weine automatisch zusammen, statt Zeilen zu verdoppeln)
- Trinkfenster, Lagerort, strukturierte Verkostungsnotizen, externe Bewertungen/Kritiker-Punkte, Essensempfehlung
- Favoriten (Herz), Anzahl Flaschen pro Wein, Wunschliste (zählt nicht zum Bestand)
- "Getrunken markieren" mit Bestätigungsabfrage, Trinkverlauf im Rückblick (Statistik der letzten 12 Monate, meistgetrunkene Region/Rebsorte)
- Statistik-Seite (Aufschlüsselung nach Typ, Land, Wert der Sammlung)
- Weinlexikon: über 1000 Rebsorten und mehrere hundert Regionen mit echter Kurzbeschreibung (Wikipedia) zum Nachschlagen
- CSV-Import (z. B. aus Vivino-Export) und PDF-/Druckexport der Sammlung
- Helles/dunkles Thema (manueller Umschalter)
- Einstellungen: Abmelden, Sammlung als Datei sichern/importieren, ganze Sammlung löschen (mit Sicherheitsabfrage)
- Backup-Erinnerung (alle 4 Wochen) und einmaliges Feedback-Popup

## 1. Voraussetzungen lokal

Auf diesem Rechner ist aktuell **kein Node.js installiert** - zum lokalen Ausfuehren/Testen wird es gebraucht (fuer das reine Deployment auf Vercel nicht zwingend, siehe Schritt 5).

- Node.js 20 LTS installieren: https://nodejs.org (Windows-Installer, "LTS"-Version)
- Danach in diesem Ordner:
  ```bash
  npm install
  ```

## 2. Supabase-Projekt einrichten

1. Auf https://supabase.com kostenloses Konto/Projekt anlegen (Free-Tier).
2. **SQL Editor** oeffnen und den kompletten Inhalt von [`supabase/schema.sql`](supabase/schema.sql) ausfuehren. Das legt an:
   - Tabelle `wines` inkl. Row-Level-Security (jeder Login sieht nur eigene Eintraege)
   - privaten Storage-Bucket `wine-photos` inkl. Zugriffsregeln (nur eingeloggt, nur eigener Ordner, kein oeffentlicher Zugriff)
3. **Authentication -> Providers -> Email**: "Allow new users to sign up" **ausschalten** (kein Self-Signup - es soll nur genau einen Account geben).
4. **Authentication -> Users -> Add user**: Account fuer deinen Vater manuell anlegen (E-Mail + Passwort, "Auto Confirm User" aktivieren, damit kein Bestaetigungs-Mail-Versand noetig ist).
5. **Project Settings -> API**: `Project URL` und `anon public` Key kopieren (den **`service_role`-Key niemals verwenden** - der gehoert nirgends in dieses Projekt).

## 3. Umgebungsvariablen

```bash
cp .env.example .env.local
```

`.env.local` mit den Werten aus Schritt 2.5 befuellen:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

`.env.local` wird nicht eingecheckt (siehe `.gitignore`).

## 4. Lokal starten

```bash
npm run dev
```

Oeffnet unter http://localhost:5173. Mit den Chrome-DevTools (Geraete-Emulation iPhone/iPad) durchklicken: Login, Sammlung, Foto hinzufuegen, Detail, Bearbeiten.

`npm run build` erzeugt den Produktions-Build (`dist/`) und prueft dabei auch die TypeScript-Typen.

## 5. Deployment auf Vercel (kostenlos)

1. Projekt in ein GitHub-Repository pushen (oder `vercel` CLI direkt aus diesem Ordner nutzen).
2. Auf https://vercel.com mit GitHub einloggen -> "Add New Project" -> Repository auswaehlen.
3. Framework Preset: **Vite** (wird automatisch erkannt).
4. Unter **Environment Variables** dieselben zwei Werte wie in `.env.local` eintragen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (auch hier: niemals den `service_role`-Key eintragen)
5. "Deploy" klicken. Nach ein paar Minuten ist die App unter einer `https://...vercel.app`-Adresse live - Vercel baut und hostet sie kostenlos.

Spaetere Aenderungen: einfach neuen Commit pushen, Vercel deployt automatisch neu.

## 6. Installation auf iPhone/iPad ("Zum Home-Bildschirm")

1. Die Vercel-URL in **Safari** auf dem iPhone/iPad oeffnen (muss Safari sein, nicht Chrome).
2. Unten das **Teilen-Symbol** antippen (Quadrat mit Pfeil nach oben).
3. **"Zum Home-Bildschirm"** waehlen, Namen bestaetigen ("Grapino").
4. Die App erscheint als eigenes Icon auf dem Home-Bildschirm und startet im Vollbild wie eine native App.
5. Login (E-Mail/Passwort aus Schritt 2.4) - danach bleibt man angemeldet, auch nach Neustart.

Beide Geraete (iPhone + iPad) mit demselben Account einloggen - die Sammlung synchronisiert sich automatisch ueber die gemeinsame Supabase-Datenbank.

## Hinweise

- **Kamera**: Der "Etikett fotografieren"-Button oeffnet die Kamera direkt in der App (kein Umweg ueber die Fotos-App). Der Browser fragt einmalig nach Kamera-Erlaubnis - das muss erlaubt werden. Funktioniert das nicht (z. B. aeltere Geraete, verweigerte Berechtigung), steht daneben immer "oder aus der Galerie waehlen" als Alternative bereit. Ein Wein kann jederzeit auch komplett ohne Foto rein manuell angelegt werden.
- **Etikett-Erkennung (OCR)**: laeuft komplett im Browser via Tesseract.js, abgeglichen gegen eine echte Referenzliste aus Wikidata (Rebsorten/Weingueter/Regionen - keine erfundenen Daten). Beim allerersten Foto-Scan laedt der Browser einmalig die Sprachdaten (Deutsch/Englisch) aus dem oeffentlichen Tesseract-CDN herunter (kostenlos, danach lokal zwischengespeichert) - dafuer ist beim ersten Mal eine Internetverbindung noetig. Erkannte Werte werden nur als Vorschlag ins Formular eingetragen und muessen aktiv bestaetigt/gespeichert werden. **Realistische Erwartung**: bei klaren, flach fotografierten Druck-Etiketten funktioniert die Erkennung gut; bei verschnoerkelten Schreibschrift-Logos, starker Perspektive oder gewoelbtem Glas kann sie auch mal gar nichts finden - dafuer gibt es den Button "Ohne Erkennung fortfahren" und alle Felder sind immer frei editierbar.
- **Fotos**: werden vor dem Hochladen im Browser auf max. 1500px Breite verkleinert, um das kostenlose 1-GB-Speicherkontingent von Supabase zu schonen.
- **Sicherheit**: RLS auf der Datenbank, privater Storage-Bucket mit zeitlich begrenzten Signed URLs, kein Self-Signup, Frontend verwendet ausschliesslich den `anon`-Key. Details siehe `supabase/schema.sql`.
- **Kosten**: Bei normaler Nutzung durch eine Person bleibt das Projekt dauerhaft innerhalb der Supabase- und Vercel-Free-Tier-Grenzen. Es werden keine kostenpflichtigen APIs verwendet.
- **Supabase-Inaktivitaets-Pause**: Kostenlose Supabase-Projekte pausieren automatisch nach ca. einer Woche ganz ohne Nutzung. Es gehen dabei keine Daten verloren, das Projekt muss im Supabase-Dashboard nur einmal manuell wieder gestartet werden ("Restore"-Button). Zusaetzliche Sicherheit bietet die Sicherungs-Funktion unter Einstellungen (Daten als Datei herunterladen).
