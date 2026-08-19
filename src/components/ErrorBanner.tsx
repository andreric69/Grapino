export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'flex-start',
        margin: '12px 20px',
        padding: '14px 16px',
        border: '1px solid var(--color-bordeaux)',
        borderRadius: 'var(--radius-md)',
        background: 'color-mix(in srgb, var(--color-bordeaux) 10%, transparent)',
        color: 'var(--color-text)',
        fontSize: 13.5,
      }}
    >
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
