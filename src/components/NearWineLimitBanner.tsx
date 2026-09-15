import { getMaxWines } from '../lib/planLimits';

/**
 * Sanfter, NICHT blockierender Hinweis fuer Basis-Nutzer kurz vor ihrem
 * Weinlimit (siehe getMaxWines() in planLimits.ts) - reine Information, kein
 * Feature wird dadurch gesperrt (die harte Sperre beim tatsaechlichen
 * Erreichen des Limits bleibt PlanLimitScreen in WineFormPage.tsx). Gleiche
 * Optik/Wegklick-Logik wie BackupReminderBanner.tsx.
 */
export function NearWineLimitBanner({
  count,
  maxWines,
  onUpgrade,
  onDismiss,
}: {
  count: number;
  maxWines: number;
  onUpgrade: () => void;
  onDismiss: () => void;
}) {
  const proMaxWines = getMaxWines('pro');
  return (
    <div
      style={{
        margin: '0 20px 14px',
        padding: '14px 16px',
        border: '1px solid var(--color-accent)',
        borderRadius: 'var(--radius-md)',
        background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
        Du hast {count} von {maxWines} Weinen in der Basis-Stufe erfasst
        {proMaxWines !== null ? ` - mit Pro sind es bis zu ${proMaxWines} Weine.` : '.'}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-primary" onClick={onUpgrade}>
          Abo ansehen
        </button>
        <button type="button" className="btn btn-secondary" onClick={onDismiss}>
          Nicht jetzt
        </button>
      </div>
    </div>
  );
}
