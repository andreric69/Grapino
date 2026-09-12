import { useState } from 'react';
import type { PaymentRequest } from '../types';

// Kein Zahlungsanbieter (Stripe o. ae.) - bewusst einfach gehalten wie der
// Rest der Zahlungsabwicklung in der App: TWINT/Ueberweisung von Hand an
// Andrin, der die Zahlung danach in der Admin-App als "bezahlt" vermerkt.
const TWINT_NUMBER = '077 456 31 23';

/* ---- kleine Linien-Icons, gleiche Machart wie in DiscoverPage.tsx -------- */
function iconProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

function BanknoteIcon(size: number) {
  return (
    <svg {...iconProps(size)}>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 9h.01M18 15h.01" />
    </svg>
  );
}

function CopyIcon(size: number) {
  return (
    <svg {...iconProps(size)}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M5.5 15.5h-1a2 2 0 01-2-2v-9a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon(size: number) {
  return (
    <svg {...iconProps(size)}>
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

/** Kleiner Kopieren-Button (Betrag/Nummer): navigator.clipboard + kurze visuelle Bestaetigung (Icon wechselt zu Haken), kein Toast noetig. */
function CopyButton({
  value,
  label,
  size = 26,
  iconSize = 13,
}: {
  value: string;
  label: string;
  size?: number;
  iconSize?: number;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard-API evtl. nicht verfuegbar - dann bleibt nur manuelles Abtippen, kein Fehler noetig.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flex: '0 0 auto',
        borderRadius: '50%',
        border: '1px solid var(--color-divider)',
        background: copied ? 'color-mix(in srgb, var(--color-accent) 22%, transparent)' : 'transparent',
        color: copied ? 'var(--color-accent)' : 'var(--color-text)',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease, color 0.15s ease',
      }}
    >
      {copied ? CheckIcon(iconSize) : CopyIcon(iconSize)}
    </button>
  );
}

/** Vollflaechige, dominante Anzeige offener Zahlungsanfragen direkt nach dem Login - im Unterschied zu BlockScreen aber nur ein Hinweis, kein harter Zugangsstop (der Nutzer kann weiter in die App). */
export function PaymentDueScreen({ requests, onDismiss }: { requests: PaymentRequest[]; onDismiss: () => void }) {
  const total = requests.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="full-screen" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
      <style>{`
        @keyframes grapino-access-in {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
        }
        .grapino-access-card { animation: grapino-access-in 200ms cubic-bezier(0.2, 0.8, 0.3, 1); }
        @media (prefers-reduced-motion: reduce) {
          .grapino-access-card { animation: none; }
        }
      `}</style>
      <div className="card elev-lg grapino-access-card" style={{ maxWidth: 400, textAlign: 'center', gap: 16, padding: 30 }}>
        <div
          style={{
            width: 56,
            height: 56,
            margin: '0 auto',
            flex: '0 0 auto',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'color-mix(in srgb, var(--color-bordeaux) 16%, transparent)',
            color: 'var(--color-bordeaux)',
          }}
        >
          {BanknoteIcon(26)}
        </div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 21, margin: 0 }}>
          Offene Zahlung{requests.length > 1 ? 'en' : ''}
        </h1>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-bordeaux)',
            background: 'color-mix(in srgb, var(--color-bordeaux) 10%, transparent)',
            padding: '14px 18px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--color-bordeaux)',
              lineHeight: 1,
            }}
          >
            {total.toFixed(2)} <span style={{ fontSize: 15, fontWeight: 600 }}>CHF</span>
          </div>
          <CopyButton value={total.toFixed(2)} label="Betrag kopieren" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
          {requests.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                fontSize: 13.5,
                lineHeight: 1.4,
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'color-mix(in srgb, var(--color-bordeaux) 8%, transparent)',
              }}
            >
              <span>{r.reason}</span>
              <strong>{r.amount.toFixed(2)} CHF</strong>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, opacity: 0.65 }}>
          Bitte per TWINT an{' '}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
            <strong>{TWINT_NUMBER}</strong>
            <CopyButton value={TWINT_NUMBER} label="TWINT-Nummer kopieren" size={20} iconSize={11} />
          </span>{' '}
          (Andrin, Betreiber von Grapino) begleichen - kein Beleg nötig, verschwindet automatisch sobald vermerkt. Der
          Betrag steht auch jederzeit unter Einstellungen, mehr zum Betrieb dieser App im{' '}
          <a href="/impressum" style={{ color: 'inherit' }}>
            Impressum
          </a>
          .
        </div>
        <button type="button" className="btn btn-primary" onClick={onDismiss} style={{ marginTop: 4 }}>
          Verstanden, weiter zur App
        </button>
      </div>
    </div>
  );
}
