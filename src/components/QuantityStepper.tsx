import type { CSSProperties } from 'react';

interface QuantityStepperProps {
  quantity: number;
  onRequestAdd: () => void;
  onRequestRemove: () => void;
  /** Kompaktere Groesse fuer die Listenansicht. */
  size?: 'sm' | 'md';
}

/**
 * Ersetzt die frueheren Favorit-/Getrunken-Icons auf der Karte: nur noch
 * Mengen anpassen, keine eigene Bestaetigungslogik - die Eltern-Komponente
 * (CollectionPage/WineDetailPage) entscheidet, welcher Dialog dafuer aufgeht.
 */
export function QuantityStepper({ quantity, onRequestAdd, onRequestRemove, size = 'md' }: QuantityStepperProps) {
  const dim = size === 'sm' ? 26 : 30;
  const baseStyle: CSSProperties = {
    width: dim,
    height: dim,
    borderRadius: '50%',
    background: 'var(--color-surface)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontFamily: 'var(--font-heading)',
    fontWeight: 700,
    fontSize: size === 'sm' ? 14 : 16,
    lineHeight: 1,
    flexShrink: 0,
  };

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: size === 'sm' ? 6 : 8 }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Flasche entfernen"
        style={{ ...baseStyle, border: '1px solid var(--color-bordeaux)', color: 'var(--color-bordeaux)' }}
        onClick={onRequestRemove}
      >
        &minus;
      </button>
      <span
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 600,
          fontSize: size === 'sm' ? 13 : 15,
          minWidth: 18,
          textAlign: 'center',
        }}
      >
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Flasche hinzufügen"
        style={{ ...baseStyle, border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
        onClick={onRequestAdd}
      >
        +
      </button>
    </div>
  );
}
