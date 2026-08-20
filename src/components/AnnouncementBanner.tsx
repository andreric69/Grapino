import type { Announcement } from '../types';

export function AnnouncementBanner({
  announcement,
  onDismiss,
}: {
  announcement: Announcement;
  onDismiss: () => void;
}) {
  return (
    <div
      style={{
        margin: '0 20px 14px',
        padding: '14px 16px',
        border: '1px solid var(--color-bordeaux)',
        borderRadius: 'var(--radius-md)',
        background: 'color-mix(in srgb, var(--color-bordeaux) 10%, transparent)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12 }}>{announcement.type === 'update' ? '🔄' : '📢'}</span>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14.5 }}>{announcement.title}</div>
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{announcement.body}</div>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ alignSelf: 'flex-start' }}
        onClick={onDismiss}
      >
        Gelesen
      </button>
    </div>
  );
}
