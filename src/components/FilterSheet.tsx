interface FilterSheetProps {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export function FilterSheet({ title, options, selected, onToggle, onClear, onClose }: FilterSheetProps) {
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">{title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '50vh', overflowY: 'auto' }}>
          <button
            type="button"
            className="btn"
            style={{ justifyContent: 'flex-start', color: selected.length === 0 ? 'var(--color-accent)' : 'var(--color-text)' }}
            onClick={onClear}
          >
            Alle
          </button>
          {options.length === 0 && (
            <div style={{ fontSize: 13, opacity: 0.6, padding: 'var(--space-2) var(--space-3)' }}>
              Keine Angaben vorhanden.
            </div>
          )}
          {options.map((opt) => {
            const active = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                className="btn"
                style={{
                  justifyContent: 'flex-start',
                  gap: 10,
                  color: active ? 'var(--color-accent)' : 'var(--color-text)',
                }}
                onClick={() => onToggle(opt)}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 17,
                    height: 17,
                    borderRadius: 4,
                    border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-divider)'}`,
                    background: active ? 'var(--color-accent)' : 'transparent',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {active && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>
            Fertig{selected.length > 0 ? ` (${selected.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
