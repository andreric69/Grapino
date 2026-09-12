import type { Announcement } from '../types';

/** Megafon-Icon im gleichen Linien-Stil wie die kleinen SVG-Icons in StatsPage.tsx (viewBox 0 0 24 24, strokeWidth 1.7). */
function MegaphoneIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 11v2a2 2 0 002 2h1l3.4 4.5c.4.5 1.2.2 1.2-.4V6.9c0-.6-.8-.9-1.2-.4L6 11H5a2 2 0 00-2 0z" />
      <path d="M14 9.5a3.5 3.5 0 010 5" />
      <path d="M17 6.5a7.5 7.5 0 010 11" />
    </svg>
  );
}

/**
 * Vollflaechiges Overlay fuer wirklich wichtige Ankuendigungen (z. B. grosse
 * App-Updates, geplante Wartung), die als "Vollbild-Popup" markiert wurden -
 * im Unterschied zur kleinen, leicht uebersehbaren AnnouncementBanner-Karte
 * auf der Sammlungs-Seite. Optisch an TrialStatusScreen/BlockScreen
 * angelehnt: zentrierte Karte, ein Bestaetigen-Button, bevor der Nutzer
 * weitermachen kann. In ProtectedRoute eingehaengt, deckt also jede Seite ab.
 */
export function AnnouncementTakeover({
  announcement,
  onDismiss,
}: {
  announcement: Announcement;
  onDismiss: () => void;
}) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24 }}>
      <div className="card elev-lg" style={{ maxWidth: 400, textAlign: 'center', gap: 14, padding: 28 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'color-mix(in srgb, var(--color-bordeaux) 14%, transparent)',
            color: 'var(--color-bordeaux)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto',
          }}
        >
          <MegaphoneIcon />
        </div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, margin: 0 }}>{announcement.title}</h1>
        <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', textAlign: 'left' }}>
          {announcement.body}
        </div>
        <button type="button" className="btn btn-primary" onClick={onDismiss} style={{ marginTop: 4 }}>
          Verstanden
        </button>
      </div>
    </div>
  );
}
