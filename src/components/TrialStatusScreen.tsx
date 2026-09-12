import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPricingConfig } from '../lib/pricingConfig';
import { daysUntil } from '../lib/trialDays';

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

function SparkleIcon(size: number) {
  return (
    <svg {...iconProps(size)}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
    </svg>
  );
}

function HourglassIcon(size: number) {
  return (
    <svg {...iconProps(size)}>
      <path d="M6 3h12M6 21h12M7 3c0 4.5 3 6 5 7.2M17 3c0 4.5-3 6-5 7.2M7 21c0-4.5 3-6 5-7.2M17 21c0-4.5-3-6-5-7.2" />
    </svg>
  );
}

function BookIcon(size: number) {
  return (
    <svg {...iconProps(size)}>
      <path d="M4 5.5A2.5 2.5 0 016.5 3H20v16H6.5A2.5 2.5 0 004 21V5.5z" />
      <path d="M4 18.5A2.5 2.5 0 016.5 16H20" />
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

/**
 * Vollflaechiger Hinweis zur Testphase direkt nach dem Login - im Unterschied
 * zu BlockScreen/PaymentDueScreen (rein informativ, kein harter Zugangsstop:
 * es gibt aktuell keine automatisierte Zahlungsabwicklung, die einen
 * Ablauf-Block rechtfertigen wuerde - das Sperren bleibt bewusst bei
 * "is_blocked", das Andrin weiterhin von Hand setzt). Zeigt zwei Varianten:
 * Testphase noch aktiv (Restzeit) oder bereits abgelaufen (Kontaktaufruf).
 */
export function TrialStatusScreen({ trialEndsAt, onDismiss }: { trialEndsAt: string; onDismiss: () => void }) {
  const navigate = useNavigate();
  const daysLeft = daysUntil(trialEndsAt, new Date());
  const isExpired = daysLeft < 0;
  const formattedDate = new Date(`${trialEndsAt}T23:59:59`).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const [accessFee, setAccessFee] = useState<number | null>(null);

  useEffect(() => {
    if (!isExpired) return;
    let cancelled = false;
    getPricingConfig().then((pricing) => {
      if (!cancelled) setAccessFee(pricing.accessFee);
    });
    return () => {
      cancelled = true;
    };
  }, [isExpired]);

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24 }}>
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
            background: isExpired
              ? 'color-mix(in srgb, var(--color-bordeaux) 16%, transparent)'
              : 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
            color: isExpired ? 'var(--color-bordeaux)' : 'var(--color-accent)',
          }}
        >
          {isExpired ? HourglassIcon(26) : SparkleIcon(26)}
        </div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 21, margin: 0 }}>
          {isExpired ? 'Testphase abgelaufen' : 'Willkommen bei Grapino'}
        </h1>
        {!isExpired && (
          <div
            style={{
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-divider)',
              background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
              padding: '12px 18px',
            }}
          >
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, color: 'var(--color-bordeaux)', lineHeight: 1 }}>
              {daysLeft === 0 ? 'Letzter Tag' : `Noch ${daysLeft} Tag${daysLeft === 1 ? '' : 'e'}`}
            </div>
          </div>
        )}
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
          {isExpired ? (
            <>Deine kostenlose Testphase ist am {formattedDate} abgelaufen.</>
          ) : (
            <>Du hast eine kostenlose Testphase bis zum {formattedDate}.</>
          )}
        </div>
        {isExpired ? (
          <>
            {accessFee !== null && (
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
                <div style={{ textAlign: 'left' }}>
                  <div className="card-kicker" style={{ color: 'var(--color-bordeaux)' }}>Zugangsgebühr</div>
                  <div
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 26,
                      fontWeight: 700,
                      color: 'var(--color-bordeaux)',
                      lineHeight: 1,
                    }}
                  >
                    {accessFee.toFixed(2)} <span style={{ fontSize: 15, fontWeight: 600 }}>CHF</span>
                  </div>
                </div>
                <CopyButton value={accessFee.toFixed(2)} label="Betrag kopieren" />
              </div>
            )}
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              Um weiterzumachen, bitte die Zugangsgebühr per TWINT an{' '}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
                <strong>{TWINT_NUMBER}</strong>
                <CopyButton value={TWINT_NUMBER} label="TWINT-Nummer kopieren" size={20} iconSize={11} />
              </span>{' '}
              (Andrin, Betreiber von Grapino) überweisen. Kein Beleg nötig - sobald die Zahlung bei Andrin eingeht,
              wird sie hier vermerkt und dieser Hinweis verschwindet von selbst.
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.6, opacity: 0.65 }}>
              Fragen oder unsicher, ob das seine Richtigkeit hat? Im{' '}
              <a href="/impressum" style={{ color: 'inherit' }}>
                Impressum
              </a>{' '}
              steht mehr zum Betrieb dieser App, oder direkt über die Chat-Blase unten links melden.
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12.5, lineHeight: 1.6, opacity: 0.65 }}>
            Bei Fragen jederzeit über die Chat-Blase unten links melden.
          </div>
        )}
        {!isExpired && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              onDismiss();
              navigate('/settings', { state: { openPdf: { key: 'onboarding', title: 'Erste Schritte' } } });
            }}
          >
            {BookIcon(16)} Erste Schritte ansehen
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={onDismiss} style={{ marginTop: 4 }}>
          Verstanden, weiter zur App
        </button>
      </div>
    </div>
  );
}
