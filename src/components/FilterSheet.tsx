interface FilterSheetProps {
  title: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  onClose: () => void;
}

export function FilterSheet({ title, options, selected, onSelect, onClose }: FilterSheetProps) {
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">{title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '50vh', overflowY: 'auto' }}>
          <button
            type="button"
            className="btn"
            style={{ justifyContent: 'flex-start', color: !selected ? 'var(--color-accent)' : 'var(--color-text)' }}
            onClick={() => {
              onSelect(null);
              onClose();
            }}
          >
            Alle
          </button>
          {options.length === 0 && (
            <div style={{ fontSize: 13, opacity: 0.6, padding: 'var(--space-2) var(--space-3)' }}>
              Keine Angaben vorhanden.
            </div>
          )}
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              className="btn"
              style={{
                justifyContent: 'flex-start',
                color: selected === opt ? 'var(--color-accent)' : 'var(--color-text)',
              }}
              onClick={() => {
                onSelect(opt);
                onClose();
              }}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Schliessen
          </button>
        </div>
      </div>
    </div>
  );
}
