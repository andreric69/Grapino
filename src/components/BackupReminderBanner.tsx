export function BackupReminderBanner({
  onOpenSettings,
  onDismiss,
}: {
  onOpenSettings: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      style={{
        margin: '0 20px 14px',
        padding: '14px 16px',
        border: '1px solid var(--color-accent)',
        borderRadius: 'var(--radius-md)',
        background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
        Es ist eine Weile her, seit die Sammlung zuletzt gesichert wurde. Eine Sicherung speichert alle Angaben als
        Datei auf dem Geraet - zusaetzlich zur Datenbank.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-primary" onClick={onOpenSettings}>
          Jetzt sichern
        </button>
        <button type="button" className="btn btn-secondary" onClick={onDismiss}>
          Spaeter erinnern
        </button>
      </div>
    </div>
  );
}
