export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 24 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '2.5px solid var(--color-divider)',
          borderTopColor: 'var(--color-accent)',
          animation: 'weinsammlung-spin 0.8s linear infinite',
        }}
      />
      {label && <div style={{ fontSize: 13, opacity: 0.65 }}>{label}</div>}
      <style>{`@keyframes weinsammlung-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
