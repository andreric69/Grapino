interface TastingNotesValue {
  tannin: number | null;
  acidity: number | null;
  sweetness: number | null;
  body: number | null;
}

const ROWS: Array<{ key: keyof TastingNotesValue; label: string; lowLabel: string; highLabel: string }> = [
  { key: 'tannin', label: 'Tannin', lowLabel: 'weich', highLabel: 'kraeftig' },
  { key: 'acidity', label: 'Saeure', lowLabel: 'mild', highLabel: 'frisch' },
  { key: 'sweetness', label: 'Suesse', lowLabel: 'trocken', highLabel: 'suess' },
  { key: 'body', label: 'Koerper', lowLabel: 'leicht', highLabel: 'voll' },
];

export function TastingNotesInput({
  value,
  onChange,
}: {
  value: TastingNotesValue;
  onChange: (value: TastingNotesValue) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {ROWS.map((row) => {
        const current = value[row.key] ?? 0;
        return (
          <div key={row.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
              <span>{row.label}</span>
              <span style={{ opacity: 0.55 }}>{value[row.key] ? `${value[row.key]}/5` : '-'}</span>
            </div>
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={current}
              onChange={(e) => {
                const n = Number(e.target.value);
                onChange({ ...value, [row.key]: n === 0 ? null : n });
              }}
              style={{ width: '100%' }}
              aria-label={row.label}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, opacity: 0.5 }}>
              <span>{row.lowLabel}</span>
              <span>{row.highLabel}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
