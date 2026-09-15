import { useNavigate } from 'react-router-dom';

export function ImpressumPage() {
  const navigate = useNavigate();

  return (
    <div className="app-screen">
      <div className="top-bar">
        <button type="button" className="icon-btn" aria-label="Zurück" onClick={() => navigate(-1)}>
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 1L2 9l8 8" />
          </svg>
        </button>
      </div>
      <div style={{ padding: '0 20px 40px', fontSize: 14, lineHeight: 1.6 }}>
        <h1 style={{ fontSize: 22, marginBottom: 16 }}>Impressum &amp; Hinweise</h1>

        <div className="card-kicker" style={{ marginBottom: 6 }}>Betrieb</div>
        <p style={{ marginTop: 0, marginBottom: 20 }}>
          Diese App wird privat betrieben und weiterentwickelt von:
          <br />
          <strong>Andrin Meier</strong>
          <br />
          E-Mail: <a href="mailto:andrin2009@icloud.com">andrin2009@icloud.com</a>
        </p>
        <p style={{ marginTop: 0, marginBottom: 20 }}>
          Fragen, Feedback oder Aufträge gerne über die Kontakt-Chatblase in der App oder direkt per E-Mail. Dieses
          Angebot richtet sich ausschliesslich an Kundinnen und Kunden mit Wohnsitz in der Schweiz sowie an
          erwachsene Nutzerinnen und Nutzer.
        </p>
        <p style={{ marginTop: 0, marginBottom: 20 }}>
          Die Zahlungsabwicklung für Abos (Stripe) läuft über das Konto der Mutter von Andrin, da Andrin
          minderjährig ist und dafür noch kein eigenes Konto eröffnen kann. Am Betrieb und an der Verantwortung für
          die App ändert das nichts.
        </p>

        <div className="card-kicker" style={{ marginBottom: 6 }}>Kosten</div>
        <p style={{ marginTop: 0, marginBottom: 20 }}>
          Grapino gibt es kostenlos zum Testen. Danach kann in den Einstellungen ein Abo (Basis/Pro/Ultra) gewählt
          werden - Abrechnung und Kündigung laufen automatisch über Stripe, unser Zahlungsdienstleister.
          Aktualisierungs-Aufträge (Recherche einzelner Angaben) werden separat nach Aufwand berechnet - die
          aktuellen Preise stehen in den Einstellungen.
        </p>
        <p style={{ marginTop: 0, marginBottom: 20 }}>
          Sollten für den Betrieb der App laufende Kosten anfallen (z. B. eine monatliche Gebühr für benutzte
          API-/Rechendienste, die über das kostenlose Grundkontingent hinausgehen), können diese Kosten anteilig
          später bei den Nutzerinnen und Nutzern eingefordert werden. Das erfolgt nie automatisch oder
          überraschend, sondern immer mit vorheriger Ankündigung und klar ausgewiesenem Betrag (siehe
          Zahlungsanfragen in den Einstellungen).
        </p>

        <div className="card-kicker" style={{ marginBottom: 6 }}>Verfügbarkeit &amp; Haftung</div>
        <p style={{ marginTop: 0, marginBottom: 14 }}>
          Grapino wird als Einzelprojekt privat betrieben - es besteht kein Anspruch auf ununterbrochene
          Verfügbarkeit oder eine bestimmte Reaktionszeit bei Störungen. Wir bemühen uns nach bestem Wissen um einen
          zuverlässigen Betrieb (tägliche Datensicherung, wöchentliche Foto-Sicherung, siehe unten), können einen
          vorübergehenden Ausfall (z. B. durch einen Fehler bei Supabase oder Vercel, unseren technischen
          Dienstleistern) aber nicht ausschliessen.
        </p>
        <p style={{ marginTop: 0, marginBottom: 20 }}>
          Für Schäden aus leichter Fahrlässigkeit (z. B. ein vorübergehender Ausfall) wird keine Haftung
          übernommen; die Haftung für grobe Fahrlässigkeit oder Vorsatz bleibt davon unberührt. Diese
          Haftungsbeschränkung gilt nicht für Personenschäden.
        </p>

        <div className="card-kicker" style={{ marginBottom: 6 }}>Preisänderungen</div>
        <p style={{ marginTop: 0, marginBottom: 20 }}>
          Preise können für zukünftige Abrechnungszeiträume angepasst werden - eine bereits bezahlte Laufzeit
          bleibt dabei immer zum bezahlten Preis gültig. Über eine Preisänderung wird mindestens 60 Tage im Voraus
          persönlich informiert (Nachricht in der App oder E-Mail). Wer die neuen Konditionen nicht möchte, kann bis
          zum Ende der laufenden, bereits bezahlten Periode kündigen, ohne dass die neuen Preise für einen gelten.
        </p>

        <div className="card-kicker" style={{ marginBottom: 6 }}>Falls der Betrieb einmal eingestellt wird</div>
        <p style={{ marginTop: 0, marginBottom: 20 }}>
          Sollte Grapino als Projekt einmal nicht mehr weitergeführt werden, wird das mindestens 60 Tage im Voraus
          persönlich angekündigt. In dieser Zeit bleibt der Export der eigenen Sammlung (siehe "Deine Rechte"
          unten) garantiert möglich, es werden keine neuen Zahlungen mehr eingefordert, und für bereits bezahlte,
          aber noch nicht genutzte Zeiträume wird der anteilige Betrag zurückerstattet.
        </p>

        <div className="card-kicker" style={{ marginBottom: 6 }}>Datenschutz</div>
        <p style={{ marginTop: 0, marginBottom: 14 }}>
          Alle Angaben zur eigenen Sammlung sind nur für den jeweiligen Account sichtbar (technisch abgesichert über
          Datenbank-Zugriffsregeln). Fotos werden nicht öffentlich geteilt.
        </p>
        <p style={{ marginTop: 0, marginBottom: 14 }}>
          <strong>Was gespeichert wird:</strong> deine E-Mail-Adresse (für den Login), die Angaben zu deinen Weinen
          (inkl. Fotos), offene und bezahlte Zahlungsanfragen, Aktualisierungs-Aufträge, Nachrichten/Feedback über die
          Kontakt-Chatblase, sowie welche Weine du wann als getrunken markiert hast.
        </p>
        <p style={{ marginTop: 0, marginBottom: 14 }}>
          <strong>Nutzungsstatistik:</strong> zusätzlich wird erfasst, welche Zusatzfunktionen genutzt werden (z. B.
          Lagerplan, Weinjahr-Rückblick, Nachschlagewerk, Teilen-Funktion, Textgrössen-Einstellung) - jeweils nur der
          Name der Funktion mit Zeitstempel, nie Inhalte wie Sucheingaben, Weinnamen oder Notizen. Zweck ist
          ausschliesslich, zu erkennen, welche Funktionen wirklich gebraucht werden und welche nicht - keine
          Überwachung einzelner Personen. Diese Einträge werden nach spätestens 120 Tagen automatisch gelöscht.
        </p>
        <p style={{ marginTop: 0, marginBottom: 14 }}>
          <strong>Wofür:</strong> ausschliesslich für den Betrieb der App selbst - deine Sammlung zu verwalten, den
          Zugang/die Zahlungen abzuwickeln und Anfragen zu bearbeiten. Keine Werbung, kein Verkauf oder Weitergabe
          deiner Daten an Dritte.
        </p>
        <p style={{ marginTop: 0, marginBottom: 14 }}>
          <strong>Wer die Daten technisch verarbeitet:</strong> Supabase (Datenbank, Fotospeicher, Login) und Vercel
          (Hosting) - beide ausschliesslich in unserem Auftrag, mit eigenen Zugriffsregeln pro Konto. Lädst du ein
          Etikett-Foto zur automatischen Texterkennung hoch, wird dieses Foto kurz an Anthropic (Claude) geschickt,
          um Angaben auszulesen - nicht dauerhaft dort gespeichert. Schliesst du ein Abo ab, verarbeitet Stripe
          (Zahlungsdienstleister) deine E-Mail-Adresse und Zahlungsdaten, um die Abrechnung abzuwickeln - deine
          Kartendaten sehen wir selbst nie. Keine Analyse- oder Werbe-Cookies.
        </p>
        <p style={{ marginTop: 0, marginBottom: 14 }}>
          <strong>Sicherungen:</strong> zusätzlich zur täglichen Datenbank-Sicherung werden deine Weinfotos einmal
          wöchentlich in einen zweiten, unabhängigen Speicherort gespiegelt - ein zusätzliches Sicherheitsnetz, falls
          mit dem Hauptspeicher einmal etwas schiefgeht. Ausserdem merkt sich die App auf deinem eigenen Gerät (nicht
          bei uns) den zuletzt geladenen Stand deiner Sammlung, damit sie auch ohne Internetverbindung noch etwas
          anzeigen kann.
        </p>
        <p style={{ marginTop: 0, marginBottom: 0 }}>
          <strong>Deine Rechte:</strong> unter Einstellungen kannst du jederzeit deine ganze Sammlung als Datei
          herunterladen, oder die vollständige Löschung deines Kontos beantragen - nach Bestätigung werden alle
          Angaben und Fotos unwiderruflich entfernt. Fragen dazu gerne über die Kontakt-Chatblase.
        </p>
      </div>
    </div>
  );
}
