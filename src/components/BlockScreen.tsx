import { useAuth } from '../hooks/useAuth';
import type { AccessStatus } from '../lib/accessControl';

/** Vollflaechige Sperre nach dem Login, wenn der Zugang blockiert wurde (siehe accessControl.ts) - zeigt Grund und Betrag, statt die App einfach zu verweigern. */
export function BlockScreen({ status }: { status: AccessStatus }) {
  const { signOut } = useAuth();

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24 }}>
      <div className="card elev-lg" style={{ maxWidth: 380, textAlign: 'center', gap: 14, padding: 28 }}>
        <div style={{ fontSize: 32 }}>⏸</div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, margin: 0 }}>Zugang pausiert</h1>
        <div style={{ fontSize: 14, lineHeight: 1.5 }}>
          {status.blockReason ?? 'Der Zugang zu dieser App wurde vorübergehend pausiert.'}
        </div>
        {status.blockAmount !== null && (
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--color-bordeaux)',
              padding: '8px 0',
            }}
          >
            {status.blockAmount.toFixed(2)} CHF
          </div>
        )}
        <div style={{ fontSize: 12.5, opacity: 0.65 }}>
          Bitte den offenen Betrag wie besprochen begleichen - der Zugang wird danach wieder freigeschaltet.
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => signOut()} style={{ marginTop: 8 }}>
          Abmelden
        </button>
      </div>
    </div>
  );
}
