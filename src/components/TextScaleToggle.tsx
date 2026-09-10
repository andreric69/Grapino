import { useTextScale, type TextScale } from '../hooks/useTextScale';

export function TextScaleToggle() {
  const { scale, setScale } = useTextScale();

  const options: { value: TextScale; label: string }[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'gross', label: 'Gross' },
    { value: 'sehr-gross', label: 'Sehr gross' },
  ];

  return (
    <div style={{ display: 'flex', gap: 3, padding: 3, background: 'var(--color-surface)', borderRadius: 999 }}>
      {options.map((opt) => {
        const active = scale === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setScale(opt.value)}
            aria-label={`Textgrösse: ${opt.label}`}
            aria-pressed={active}
            style={{
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              fontSize: 12,
              padding: '6px 14px',
              borderRadius: 999,
              transition: 'background-color 0.15s ease, color 0.15s ease',
              background: active ? 'var(--color-accent)' : 'transparent',
              color: active ? 'var(--color-bg)' : 'var(--color-text)',
              opacity: active ? 1 : 0.6,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
