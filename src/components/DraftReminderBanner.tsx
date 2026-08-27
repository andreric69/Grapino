export function DraftReminderBanner({
  onContinue,
  onDiscard,
}: {
  onContinue: () => void;
  onDiscard: () => void;
}) {
  return (
    <div
      style={{
        margin: '0 20px 14px',
        padding: '14px 16px',
        border: '1px solid var(--color-bordeaux)',
        borderRadius: 'var(--radius-md)',
        background: 'color-mix(in srgb, var(--color-bordeaux) 12%, transparent)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
        Du hast einen unfertigen Wein-Eintrag. Er wurde noch nicht gespeichert, ist aber als Entwurf erhalten
        geblieben.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-primary" onClick={onContinue}>
          Weiter bearbeiten
        </button>
        <button type="button" className="btn btn-secondary" onClick={onDiscard}>
          Verwerfen
        </button>
      </div>
    </div>
  );
}
