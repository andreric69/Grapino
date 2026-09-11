import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * "Entdecken" - zentrale Übersicht über alle sekundären Bereiche der App
 * (Auswertungen, Nachschlagewerke, Export), die sonst nur einzeln über die
 * Einstellungen erreichbar wären.
 */

interface DiscoverTile {
  path: string;
  title: string;
  description: string;
  icon: (size: number) => ReactNode;
}

interface DiscoverGroup {
  label: string;
  tiles: DiscoverTile[];
}

export function DiscoverPage() {
  const navigate = useNavigate();

  const groups: DiscoverGroup[] = [
    {
      label: 'Meine Zahlen',
      tiles: [
        {
          path: '/statistik',
          title: 'Statistik',
          description: 'Deine Sammlung in Zahlen - Bestand, Wert und Trinktempo.',
          icon: BarChartIcon,
        },
        {
          path: '/rueckblick',
          title: 'Rückblick',
          description: 'Dein Trinkverlauf der letzten 12 Monate.',
          icon: HistoryIcon,
        },
        {
          path: '/weinjahr',
          title: 'Weinjahr',
          description: 'Dein Jahr in Wein, als kleiner Rückblick.',
          icon: CalendarStarIcon,
        },
      ],
    },
    {
      label: 'Nachschlagen',
      tiles: [
        {
          path: '/lagerplan',
          title: 'Lagerplan',
          description: 'Deine Weine nach Lagerort gruppiert.',
          icon: MapIcon,
        },
        {
          path: '/lexikon',
          title: 'Weinlexikon',
          description: 'Rebsorten und Weinregionen kurz erklärt, aus Wikipedia.',
          icon: BookIcon,
        },
      ],
    },
    {
      label: 'Drucken',
      tiles: [
        {
          path: '/drucken',
          title: 'Drucken',
          description: 'Druckoptimierte Liste - auch als PDF speicherbar.',
          icon: PrinterIcon,
        },
      ],
    },
  ];

  return (
    <div className="app-screen">
      <div className="top-bar">
        <button type="button" className="icon-btn" aria-label="Zurück" onClick={() => navigate(-1)}>
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 1L2 9l8 8" />
          </svg>
        </button>
      </div>

      <div style={{ padding: '0 20px 40px' }}>
        <h1 style={{ fontSize: 25, marginBottom: 4 }}>Entdecken</h1>
        <div style={{ fontSize: 12.5, opacity: 0.6, marginBottom: 16, lineHeight: 1.5 }}>
          Alles rund um deine Sammlung, an einem Ort.
        </div>

        {groups.map((group) => (
          <div key={group.label} style={{ marginBottom: 28 }}>
            <div className="card-kicker" style={{ marginBottom: 10 }}>
              {group.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {group.tiles.map((tile) => (
                <DiscoverTileButton key={tile.path} tile={tile} onSelect={() => navigate(tile.path)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiscoverTileButton({ tile, onSelect }: { tile: DiscoverTile; onSelect: () => void }) {
  return (
    <button
      type="button"
      className="card"
      onClick={onSelect}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        border: '1px solid var(--color-divider)',
        background: 'none',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          flex: '0 0 auto',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
          color: 'var(--color-accent)',
        }}
      >
        {tile.icon(18)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="card-title" style={{ fontSize: 15 }}>
          {tile.title}
        </div>
        <div style={{ fontSize: 12, opacity: 0.65, lineHeight: 1.4 }}>{tile.description}</div>
      </div>
      <svg
        width="8"
        height="14"
        viewBox="0 0 8 14"
        fill="none"
        stroke="var(--color-text)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flex: '0 0 auto', opacity: 0.4 }}
      >
        <path d="M1 1l6 6-6 6" />
      </svg>
    </button>
  );
}

/* ---- kleine Linien-Icons, einheitlich mit dem Zurueck-Pfeil im Header ------ */
function iconProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

function BarChartIcon(size: number) {
  return (
    <svg {...iconProps(size)}>
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </svg>
  );
}

function HistoryIcon(size: number) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2" />
      <path d="M9 2h6" />
    </svg>
  );
}

function CalendarStarIcon(size: number) {
  return (
    <svg {...iconProps(size)}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
      <path d="M12 12.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3z" />
    </svg>
  );
}

function MapIcon(size: number) {
  return (
    <svg {...iconProps(size)}>
      <path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

function BookIcon(size: number) {
  return (
    <svg {...iconProps(size)}>
      <path d="M4 5.5A2.5 2.5 0 016.5 3H20v16H6.5A2.5 2.5 0 004 21V5.5z" />
      <path d="M4 18.5A2.5 2.5 0 016.5 16H20" />
    </svg>
  );
}

function PrinterIcon(size: number) {
  return (
    <svg {...iconProps(size)}>
      <path d="M6 9V3h12v6" />
      <rect x="3.5" y="9" width="17" height="8" rx="1.5" />
      <path d="M6 14.5h12V21H6v-6.5z" />
    </svg>
  );
}
