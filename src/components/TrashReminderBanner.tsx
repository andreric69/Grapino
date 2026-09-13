import { useNavigate } from 'react-router-dom';
import type { Wine } from '../types';
import { trackEvent } from '../lib/usageTracking';

/**
 * Schwelle, ab der proaktiv gewarnt wird: bei genau 30 Tagen Aufbewahrung
 * waere eine Erinnerung fuer JEDEN frisch geloeschten Wein reine Dauer-Beschallung.
 * 10 Tage Restfrist sind knapp genug, um noch handeln zu koennen, aber selten
 * genug, um nicht bei jedem App-Start aufzupoppen.
 */
const WARNING_THRESHOLD_DAYS = 10;
const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Reine Berechnung ohne weitere Abhaengigkeiten (analog zu trialDays.ts),
 * damit sie unabhaengig von der Banner-Komponente getestet werden kann.
 * `now` ist optional und dient nur Tests - im normalen Betrieb wird immer
 * die aktuelle Zeit verwendet, `daysRemaining(deletedAt)` reicht also.
 *
 * Rechnet in ganzen Tagen, ABGERUNDET (nicht gerundet) und nie negativ: ein
 * Wein, der noch 0.9 Tage uebrig hat, soll als "0 Tage verbleibend" gelten,
 * nicht faelschlich als "1 Tag" - sonst waere die Warnung am eigentlichen
 * letzten Tag bereits verschwunden bzw. ungenau.
 */
export function daysRemaining(deletedAt: string, now: Date = new Date()): number {
  const deletedTime = new Date(deletedAt).getTime();
  const elapsedMs = now.getTime() - deletedTime;
  const remainingMs = RETENTION_DAYS * DAY_MS - elapsedMs;
  return Math.max(0, Math.floor(remainingMs / DAY_MS));
}

function formatSingleDeadline(days: number): string {
  if (days <= 0) return 'heute';
  if (days === 1) return 'in 1 Tag';
  return `in ${days} Tagen`;
}

function dayWord(days: number): string {
  return days === 1 ? 'Tag' : 'Tage';
}

interface TrashReminderBannerProps {
  deletedWines: Wine[];
  onDismiss?: () => void;
}

export function TrashReminderBanner({ deletedWines, onDismiss }: TrashReminderBannerProps) {
  const navigate = useNavigate();

  const soonExpiring = deletedWines
    .filter((wine): wine is Wine & { deleted_at: string } => Boolean(wine.deleted_at))
    .map((wine) => daysRemaining(wine.deleted_at))
    .filter((days) => days <= WARNING_THRESHOLD_DAYS)
    .sort((a, b) => a - b);

  if (soonExpiring.length === 0) {
    return null;
  }

  const shortestDeadline = soonExpiring[0];
  const message =
    soonExpiring.length === 1
      ? `1 Wein im Papierkorb läuft ${formatSingleDeadline(shortestDeadline)} endgültig ab.`
      : `${soonExpiring.length} Weine im Papierkorb laufen bald endgültig ab (kürzeste Frist: ${shortestDeadline} ${dayWord(
          shortestDeadline
        )}).`;

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
      <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{message}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            trackEvent('papierkorb_geoeffnet');
            navigate('/settings');
          }}
        >
          Papierkorb ansehen
        </button>
        {onDismiss && (
          <button type="button" className="btn btn-secondary" onClick={onDismiss}>
            Später
          </button>
        )}
      </div>
    </div>
  );
}
