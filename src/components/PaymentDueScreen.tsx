import type { PaymentRequest } from '../types';

/** Vollflaechige, dominante Anzeige offener Zahlungsanfragen direkt nach dem Login - im Unterschied zu BlockScreen aber nur ein Hinweis, kein harter Zugangsstop (der Nutzer kann weiter in die App). */
export function PaymentDueScreen({ requests, onDismiss }: { requests: PaymentRequest[]; onDismiss: () => void }) {
  const total = requests.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24 }}>
      <div className="card elev-lg" style={{ maxWidth: 400, textAlign: 'center', gap: 14, padding: 28 }}>
        <div style={{ fontSize: 32 }}>💰</div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, margin: 0 }}>
          Offene Zahlung{requests.length > 1 ? 'en' : ''}
        </h1>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--color-bordeaux)',
          }}
        >
          {total.toFixed(2)} CHF
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
          {requests.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                fontSize: 13.5,
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                background: 'color-mix(in srgb, var(--color-bordeaux) 8%, transparent)',
              }}
            >
              <span>{r.reason}</span>
              <strong>{r.amount.toFixed(2)} CHF</strong>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12.5, opacity: 0.65 }}>
          Bitte wie besprochen begleichen (Überweisung/TWINT an Andrin). Der Betrag steht auch jederzeit unter
          Einstellungen.
        </div>
        <button type="button" className="btn btn-primary" onClick={onDismiss} style={{ marginTop: 4 }}>
          Verstanden, weiter zur App
        </button>
      </div>
    </div>
  );
}
