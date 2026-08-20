import type { SortOption } from '../types';

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Neueste zuerst' },
  { value: 'vintage', label: 'Jahrgang' },
  { value: 'name', label: 'Name' },
  { value: 'price', label: 'Preis (teuerste zuerst)' },
  { value: 'rating', label: 'Eigene Bewertung' },
  { value: 'drinkwindow', label: 'Trinkfenster (bald faellig)' },
];

export function SortMenu({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  return (
    <select
      className="input"
      style={{ minHeight: 38, width: 'auto', padding: '6px 10px', fontSize: 13.5 }}
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      aria-label="Sortierung"
    >
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
