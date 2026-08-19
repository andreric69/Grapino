export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(24px + env(safe-area-inset-bottom))',
        transform: 'translateX(-50%)',
        zIndex: 400,
        background: 'var(--color-neutral-900)',
        color: '#f4ede4',
        padding: '10px 18px',
        borderRadius: 999,
        fontSize: 13.5,
        boxShadow: 'var(--shadow-lg)',
        maxWidth: '85vw',
        textAlign: 'center',
        animation: 'weinsammlung-toast-in 0.2s cubic-bezier(0.2, 0.8, 0.3, 1)',
      }}
    >
      {message}
      <style>{`
        @keyframes weinsammlung-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
        }
      `}</style>
    </div>
  );
}
