import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { startCheckout } from '../lib/billing';
import { getMaxWines, PLAN_LABELS, type Plan } from '../lib/planLimits';

/* ---- kleine Linien-Icons, gleiche Machart wie in BlockScreen.tsx --------- */
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

const PLAN_ORDER: Plan[] = ['basis', 'pro', 'ultra'];

const PLAN_DESCRIPTIONS: Record<Plan, string> = {
  basis: 'Weine von Hand erfassen',
  pro: 'Foto-Scan, Weinjahr-Rückblick, Teilen',
  ultra: 'Unbegrenzte Sammlung, alle Funktionen',
};

/**
 * Ersetzt die frueher rein manuelle Zahlungsanfrage ("Zugangsgebuehr per
 * TWINT") nach Ablauf der Testphase: statt eines dismissierbaren Hinweises
 * (siehe TrialStatusScreen.tsx, nur waehrend laufender Testphase) ist dies
 * ein echter Zugangsstop wie BlockScreen - kein "Weiter zur App" ohne Abo.
 * Wird von ProtectedRoute gerendert, wenn accessControl.getAccessStatus()
 * needsPlan=true liefert (Testphase abgelaufen, keine Stripe-Subscription).
 */
export function ChoosePlanScreen() {
  const { signOut } = useAuth();
  const [busyPlan, setBusyPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChoose(plan: Plan) {
    setBusyPlan(plan);
    setError(null);
    try {
      await startCheckout(plan);
      // Bei Erfolg leitet startCheckout selbst weiter (window.location.href) -
      // busyPlan bleibt bewusst gesetzt, bis die Seite tatsaechlich wechselt.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout konnte nicht gestartet werden.');
      setBusyPlan(null);
    }
  }

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
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 21, margin: 0 }}>Testphase abgelaufen</h1>
        <div style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.85 }}>
          Wähle ein Abo, um mit Grapino weiterzumachen. Jederzeit über die Einstellungen wechselbar oder kündbar.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PLAN_ORDER.map((plan) => (
            <button
              key={plan}
              type="button"
              className="btn btn-primary"
              disabled={busyPlan !== null}
              onClick={() => handleChoose(plan)}
              style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 16px' }}
            >
              <span>{busyPlan === plan ? 'Wird geöffnet ...' : `${PLAN_LABELS[plan]} wählen`}</span>
              <span style={{ fontSize: 11.5, fontWeight: 400, opacity: 0.85 }}>
                {PLAN_DESCRIPTIONS[plan]}
                {getMaxWines(plan) !== null ? ` · bis ${getMaxWines(plan)} Weine` : ' · unbegrenzt'}
              </span>
            </button>
          ))}
        </div>
        {error && <div style={{ fontSize: 12.5, color: 'var(--color-bordeaux)' }}>{error}</div>}
        <div style={{ fontSize: 12.5, lineHeight: 1.6, opacity: 0.65 }}>
          Fragen? Im{' '}
          <a href="/impressum" style={{ color: 'inherit' }}>
            Impressum
          </a>{' '}
          steht mehr zum Betrieb dieser App.
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => signOut()} style={{ marginTop: 4 }}>
          Abmelden
        </button>
      </div>
    </div>
  );
}
