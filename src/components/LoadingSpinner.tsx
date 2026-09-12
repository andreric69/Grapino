export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 24 }}>
      <div
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          // Statt eines generischen einfarbigen Rings: die fuehrende Kante in
          // Gold, die nachlaufende Kante in einem Gold-Bordeaux-Mischton -
          // wirkt dadurch bewusst wie ein Teil dieser (Bordeaux/Gold-)
          // Designsprache statt wie ein austauschbarer UI-Baustein.
          border: '3px solid color-mix(in srgb, var(--color-text) 12%, transparent)',
          borderTopColor: 'var(--color-accent)',
          borderRightColor: 'color-mix(in srgb, var(--color-bordeaux) 55%, var(--color-accent) 45%)',
          animation: 'weinsammlung-spin 0.85s linear infinite',
        }}
      />
      {label && (
        <div style={{ fontSize: 13, color: 'var(--color-text)', opacity: 0.65 }}>{label}</div>
      )}
    </div>
  );
}
