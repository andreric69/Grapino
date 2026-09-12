import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { AccessStatus } from '../lib/accessControl';

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

function PauseIcon(size: number) {
  return (
    <svg {...iconProps(size)}>
      <rect x="6" y="4.5" width="4" height="15" rx="1" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" />
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

/** Vollflaechige Sperre nach dem Login, wenn der Zugang blockiert wurde (siehe accessControl.ts) - zeigt Grund und Betrag, statt die App einfach zu verweigern. */
export function BlockScreen({ status }: { status: AccessStatus }) {
  const { signOut } = useAuth();

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
      <div className="card elev-lg grapino-access-card" style={{ maxWidth: 380, textAlign: 'center', gap: 16, padding: 30 }}>
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
          {PauseIcon(26)}
        </div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 21, margin: 0 }}>Zugang pausiert</h1>
        <div style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.85 }}>
          {status.blockReason ?? 'Der Zugang zu dieser App wurde vorübergehend pausiert.'}
        </div>
        {status.blockAmount !== null && (
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
                fontSize: 26,
                fontWeight: 700,
                color: 'var(--color-bordeaux)',
                lineHeight: 1,
              }}
            >
              {status.blockAmount.toFixed(2)} <span style={{ fontSize: 15, fontWeight: 600 }}>CHF</span>
            </div>
            <CopyButton value={status.blockAmount.toFixed(2)} label="Betrag kopieren" />
          </div>
        )}
        <div style={{ fontSize: 12.5, lineHeight: 1.6, opacity: 0.65 }}>
          Bitte den offenen Betrag wie besprochen begleichen - der Zugang wird danach wieder freigeschaltet.
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => signOut()} style={{ marginTop: 6 }}>
          Abmelden
        </button>
      </div>
    </div>
  );
}
