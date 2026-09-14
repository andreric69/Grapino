import { useNavigate } from 'react-router-dom';
import { daysUntil } from '../lib/trialDays';

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

function BookIcon(size: number) {
  return (
    <svg {...iconProps(size)}>
      <path d="M4 5.5A2.5 2.5 0 016.5 3H20v16H6.5A2.5 2.5 0 004 21V5.5z" />
      <path d="M4 18.5A2.5 2.5 0 016.5 16H20" />
    </svg>
  );
}

/**
 * Vollflaechiger Hinweis zur (noch laufenden) Testphase direkt nach dem
 * Login - rein informativ, dismissierbar. Wird von ProtectedRoute nur
 * gezeigt, waehrend die Testphase noch nicht abgelaufen ist: ist sie
 * abgelaufen, uebernimmt entweder ChoosePlanScreen (kein Abo vorhanden) oder
 * es gibt bereits ein aktives Stripe-Abo, dann ist kein Hinweis mehr noetig.
 */
export function TrialStatusScreen({ trialEndsAt, onDismiss }: { trialEndsAt: string; onDismiss: () => void }) {
  const navigate = useNavigate();
  const daysLeft = daysUntil(trialEndsAt, new Date());
  const formattedDate = new Date(`${trialEndsAt}T23:59:59`).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

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
            background: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
            color: 'var(--color-accent)',
          }}
        >
          {SparkleIcon(26)}
        </div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 21, margin: 0 }}>Willkommen bei Grapino</h1>
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
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>Du hast eine kostenlose Testphase bis zum {formattedDate}.</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, opacity: 0.65 }}>
          Danach kannst du in den Einstellungen ein Abo wählen, um weiterzumachen.
        </div>
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
        <button type="button" className="btn btn-primary" onClick={onDismiss} style={{ marginTop: 4 }}>
          Verstanden, weiter zur App
        </button>
      </div>
    </div>
  );
}
