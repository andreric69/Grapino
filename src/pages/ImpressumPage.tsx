import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPricingConfig } from '../lib/pricingConfig';
import { listMyPaymentRequests } from '../lib/paymentRequestRepository';
import { getAccessStatus } from '../lib/accessControl';
import { daysUntil } from '../lib/trialDays';

export function ImpressumPage() {
  const navigate = useNavigate();
  const [accessFee, setAccessFee] = useState<number | null>(null);
  const [accessFeePaid, setAccessFeePaid] = useState(false);
  const [inActiveTrial, setInActiveTrial] = useState(false);

  useEffect(() => {
    getPricingConfig().then((p) => setAccessFee(p.accessFee));
    listMyPaymentRequests().then((requests) => {
      const paid = requests.some((r) => r.status === 'paid' && r.reason.toLowerCase().includes('zugangsgeb'));
      setAccessFeePaid(paid);
    });
    // Waehrend einer laufenden Testphase ist die Formulierung "wird
    // verrechnet" irrefuehrend (klingt nach sofort faellig, obwohl der
    // Zugang gerade gratis ist) - deshalb hier gesondert geprueft.
    getAccessStatus().then((status) => {
      if (status.trialEndsAt) setInActiveTrial(daysUntil(status.trialEndsAt, new Date()) >= 0);
    });
  }, []);

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
          Diese App wird privat von Andrin betrieben und weiterentwickelt und richtet sich an erwachsene Nutzerinnen
          und Nutzer. Fragen, Feedback oder Aufträge bitte über die Kontakt-Chatblase.
        </p>

        <div className="card-kicker" style={{ marginBottom: 6 }}>Kosten</div>
        <p style={{ marginTop: 0, marginBottom: 20 }}>
          {!accessFeePaid && (
            <>
              {inActiveTrial ? 'Nach der Testphase wird der Zugang einmalig verrechnet' : 'Der Zugang zur App wird einmalig verrechnet'}
              {accessFee !== null && (
                <>
                  {' '}
                  (<strong>{accessFee.toFixed(2)} CHF</strong>)
                </>
              )}
              , per TWINT an <strong>077 456 31 23</strong> (Andrin).{' '}
            </>
          )}
          Aktualisierungs-Aufträge (Recherche einzelner Angaben) werden nach Aufwand berechnet - die aktuellen
          Preise stehen in den Einstellungen.
        </p>
        <p style={{ marginTop: 0, marginBottom: 20 }}>
          Sollten für den Betrieb der App laufende Kosten anfallen (z. B. eine monatliche Gebühr für benutzte
          API-/Rechendienste, die über das kostenlose Grundkontingent hinausgehen), können diese Kosten anteilig
          später bei den Nutzerinnen und Nutzern eingefordert werden. Das erfolgt nie automatisch oder
          überraschend, sondern immer mit vorheriger Ankündigung und klar ausgewiesenem Betrag (siehe
          Zahlungsanfragen in den Einstellungen).
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
          <strong>Wofür:</strong> ausschliesslich für den Betrieb der App selbst - deine Sammlung zu verwalten, den
          Zugang/die Zahlungen abzuwickeln und Anfragen zu bearbeiten. Keine Werbung, kein Verkauf oder Weitergabe
          deiner Daten an Dritte.
        </p>
        <p style={{ marginTop: 0, marginBottom: 14 }}>
          <strong>Wer die Daten technisch verarbeitet:</strong> Supabase (Datenbank, Fotospeicher, Login) und Vercel
          (Hosting) - beide ausschliesslich in unserem Auftrag, mit eigenen Zugriffsregeln pro Konto. Lädst du ein
          Etikett-Foto zur automatischen Texterkennung hoch, wird dieses Foto kurz an Anthropic (Claude) geschickt,
          um Angaben auszulesen - nicht dauerhaft dort gespeichert. Keine Analyse- oder Werbe-Cookies.
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
