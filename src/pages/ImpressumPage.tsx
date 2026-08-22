import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPricingConfig } from '../lib/pricingConfig';

export function ImpressumPage() {
  const navigate = useNavigate();
  const [accessFee, setAccessFee] = useState<number | null>(null);

  useEffect(() => {
    getPricingConfig().then((p) => setAccessFee(p.accessFee));
  }, []);

  return (
    <div className="app-screen">
      <div className="top-bar">
        <button type="button" className="icon-btn" aria-label="Zurueck" onClick={() => navigate(-1)}>
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 1L2 9l8 8" />
          </svg>
        </button>
      </div>
      <div style={{ padding: '0 20px 40px', fontSize: 14, lineHeight: 1.6 }}>
        <h1 style={{ fontSize: 22, marginBottom: 16 }}>Impressum &amp; Hinweise</h1>

        <div className="card-kicker" style={{ marginBottom: 6 }}>Betrieb</div>
        <p style={{ marginTop: 0, marginBottom: 20 }}>
          Diese App wird privat von Andrin betrieben und weiterentwickelt. Fragen, Feedback oder Auftraege bitte ueber
          die Kontakt-Chatblase.
        </p>

        <div className="card-kicker" style={{ marginBottom: 6 }}>Kosten</div>
        <p style={{ marginTop: 0, marginBottom: 20 }}>
          Der Zugang zur App wird einmalig verrechnet
          {accessFee !== null && (
            <>
              {' '}
              (<strong>{accessFee.toFixed(2)} CHF</strong>)
            </>
          )}
          . Aktualisierungs-Auftraege (Recherche einzelner Angaben) werden nach Aufwand berechnet - die aktuellen
          Preise stehen in den Einstellungen.
        </p>
        <p style={{ marginTop: 0, marginBottom: 20 }}>
          Sollten fuer den Betrieb der App laufende Kosten anfallen (z. B. eine monatliche Gebuehr fuer benutzte
          API-/Rechendienste, die ueber das kostenlose Grundkontingent hinausgehen), koennen diese Kosten anteilig
          spaeter bei den Nutzerinnen und Nutzern eingefordert werden. Das erfolgt nie automatisch oder
          ueberraschend, sondern immer mit vorheriger Ankuendigung und klar ausgewiesenem Betrag (siehe
          Zahlungsanfragen in den Einstellungen).
        </p>

        <div className="card-kicker" style={{ marginBottom: 6 }}>Daten</div>
        <p style={{ marginTop: 0, marginBottom: 0 }}>
          Alle Angaben zur eigenen Sammlung sind nur fuer den jeweiligen Account sichtbar (technisch abgesichert ueber
          Datenbank-Zugriffsregeln). Fotos werden nicht oeffentlich geteilt.
        </p>
      </div>
    </div>
  );
}
