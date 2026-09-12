export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        margin: '12px 20px',
        padding: '14px 16px',
        border: '1px solid var(--color-bordeaux)',
        borderRadius: 'var(--radius-md)',
        background: 'color-mix(in srgb, var(--color-bordeaux) 8%, transparent)',
        color: 'var(--color-text)',
        fontSize: 13.5,
      }}
    >
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-bordeaux)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: 1 }}
      >
        <path d="M12 4 L21 19.5 H3 Z" />
        <path d="M12 9.5 V14" />
        <path d="M12 17.3 H12.01" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 0 }}>
        <span style={{ lineHeight: 1.5 }}>{message}</span>
        {onRetry && (
          <button type="button" className="btn btn-secondary" onClick={onRetry} style={{ alignSelf: 'flex-start' }}>
            Erneut versuchen
          </button>
        )}
      </div>
    </div>
  );
}
