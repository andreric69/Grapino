import type { SortDirection, SortOption } from '../types';

export const SORT_DEFAULT_DIRECTION: Record<SortOption, SortDirection> = {
  newest: 'desc',
  vintage: 'desc',
  name: 'asc',
  price: 'desc',
  rating: 'desc',
  drinkwindow: 'asc',
};

const OPTIONS: { value: SortOption; label: string; ascLabel: string; descLabel: string }[] = [
  { value: 'newest', label: 'Hinzugefügt', ascLabel: 'älteste zuerst', descLabel: 'neueste zuerst' },
  { value: 'vintage', label: 'Jahrgang', ascLabel: 'ältester zuerst', descLabel: 'neuester zuerst' },
  { value: 'name', label: 'Name', ascLabel: 'A bis Z', descLabel: 'Z bis A' },
  { value: 'price', label: 'Preis', ascLabel: 'günstigste zuerst', descLabel: 'teuerste zuerst' },
  { value: 'rating', label: 'Eigene Bewertung', ascLabel: 'schlechteste zuerst', descLabel: 'beste zuerst' },
  { value: 'drinkwindow', label: 'Trinkfenster', ascLabel: 'bald fällig zuerst', descLabel: 'länger haltbar zuerst' },
];

export function SortMenu({
  value,
  direction,
  onChange,
  onChangeDirection,
}: {
  value: SortOption;
  direction: SortDirection;
  onChange: (v: SortOption) => void;
  onChangeDirection: (d: SortDirection) => void;
}) {
  const current = OPTIONS.find((opt) => opt.value === value) ?? OPTIONS[0];
  const directionLabel = direction === 'asc' ? current.ascLabel : current.descLabel;

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <select
        className="input"
        style={{ minHeight: 38, width: 'auto', padding: '6px 10px', fontSize: 13.5 }}
        value={value}
        onChange={(e) => {
          const next = e.target.value as SortOption;
          onChange(next);
          // Beim Wechsel des Sortierkriteriums auf dessen sinnvolle
          // Standardrichtung zurueckstellen - eine Richtung, die fuer das
          // vorherige Kriterium galt (z. B. "guenstigste zuerst"), waere fuer
          // ein neues Kriterium (z. B. Jahrgang) nicht mehr sinnvoll.
          onChangeDirection(SORT_DEFAULT_DIRECTION[next]);
        }}
        aria-label="Sortierung"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="icon-btn"
        aria-label={`Richtung umkehren (aktuell: ${directionLabel})`}
        title={directionLabel}
        onClick={() => onChangeDirection(direction === 'asc' ? 'desc' : 'asc')}
      >
        {direction === 'asc' ? '↑' : '↓'}
      </button>
    </div>
  );
}
