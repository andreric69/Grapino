import { useEffect, useState } from 'react';

const EXIT_DURATION_MS = 200;

/** Kurze, sich selbst ausblendende Bestaetigungsmeldung (siehe useToast.ts).
 * Haelt die zuletzt angezeigte Nachricht intern noch fuer die Dauer der
 * Ausblend-Animation vor - ohne das wuerde die Toast beim Verschwinden
 * (message wird null) abrupt verschwinden statt sanft auszublenden, waehrend
 * das Einblenden bereits animiert war. Die Prop-API bleibt unveraendert
 * (message: string | null), aufrufende Seiten muessen nichts anpassen. */
export function Toast({ message }: { message: string | null }) {
  const [displayedMessage, setDisplayedMessage] = useState(message);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (message) {
      setDisplayedMessage(message);
      setIsExiting(false);
      return;
    }
    if (!displayedMessage) return;
    setIsExiting(true);
    const prefersReducedMotion =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timeout = window.setTimeout(
      () => setDisplayedMessage(null),
      prefersReducedMotion ? 0 : EXIT_DURATION_MS,
    );
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  if (!displayedMessage) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(24px + env(safe-area-inset-bottom))',
        transform: 'translateX(-50%)',
        zIndex: 400,
        background: 'var(--color-neutral-900)',
        color: '#f4ede4',
        padding: '10px 18px',
        borderRadius: 999,
        fontSize: 13.5,
        boxShadow: 'var(--shadow-lg)',
        maxWidth: '85vw',
        textAlign: 'center',
        animation: isExiting
          ? 'weinsammlung-toast-out 0.2s cubic-bezier(0.4, 0, 1, 1) forwards'
          : 'weinsammlung-toast-in 0.2s cubic-bezier(0.2, 0.8, 0.3, 1)',
      }}
    >
      {displayedMessage}
      <style>{`
        @keyframes weinsammlung-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
        }
        @keyframes weinsammlung-toast-out {
          to { opacity: 0; transform: translateX(-50%) translateY(8px); }
        }
      `}</style>
    </div>
  );
}
