import { useState } from 'react';
import type { Wine } from '../types';

/**
 * Bestaetigungsdialog fuers Hinzufuegen - Bruder von ConsumeDialog, gleiches
 * Muster (Mengen-Stepper Standard 1, Bestaetigen/Abbrechen), damit man z. B.
 * eine ganze Kiste auf einmal bestaetigen kann statt 12x einzeln antippen zu
 * muessen. Gemeinsam genutzt von CollectionPage und WineDetailPage.
 */
export function AddBottleDialog({
  wine,
  onCancel,
  onConfirm,
}: {
  wine: Wine;
  onCancel: () => void;
  onConfirm: (count: number) => void;
}) {
  const [count, setCount] = useState(1);
  const max = 24;

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">Flasche hinzufügen?</div>
        <div className="dialog-body">
          {count === 1
            ? `Eine Flasche "${wine.name}" wird zum Bestand hinzugefügt.`
            : `${count} Flaschen "${wine.name}" werden zum Bestand hinzugefügt.`}
        </div>

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
