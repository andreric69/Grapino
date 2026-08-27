import { useState } from 'react';
import type { Wine } from '../types';

/**
 * Bestaetigungsdialog fuers "Als getrunken markieren" - mit Mengen-Stepper
 * (Standard 1, max. Bestand), damit man z.B. nach einem Fest mehrere
 * Flaschen auf einmal buchen kann statt einzeln antippen zu muessen.
 * Gemeinsam genutzt von CollectionPage (Listen-/Rasteransicht) und
 * WineDetailPage (Detailansicht), statt zwei fast identischer Dialoge.
 */
export function ConsumeDialog({
  wine,
  onCancel,
  onConfirm,
}: {
  wine: Wine;
  onCancel: () => void;
  onConfirm: (count: number) => void;
}) {
  const [count, setCount] = useState(1);
  const max = Math.max(1, wine.quantity);

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">Als getrunken markieren?</div>
        <div className="dialog-body">
          {max > 1 ? (
            <>
              {count === max
                ? `Der komplette Bestand von "${wine.name}" (${max} Flaschen) wird als getrunken vermerkt.`
                : `${count} von ${max} Flaschen "${wine.name}" werden vom Vorrat abgebucht.`}
            </>
          ) : (
            `"${wine.name}" wandert in den Bereich "Getrunken" und wird im Rückblick vermerkt.`
          )}
        </div>

        {max > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <button
              type="button"
              className="btn btn-icon btn-secondary"
              aria-label="Weniger Flaschen"
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              disabled={count <= 1}
            >
              &minus;
            </button>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18, minWidth: 24, textAlign: 'center' }}>
              {count}
            </span>
            <button
              type="button"
              className="btn btn-icon btn-secondary"
              aria-label="Mehr Flaschen"
              onClick={() => setCount((c) => Math.min(max, c + 1))}
              disabled={count >= max}
            >
              +
            </button>
            <span style={{ fontSize: 12.5, opacity: 0.6 }}>{count === 1 ? 'Flasche' : 'Flaschen'}</span>
          </div>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onConfirm(count)}>
            Bestätigen
          </button>
        </div>
      </div>
    </div>
  );
}
