import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listWines } from '../lib/wineRepository';
import { WINE_TYPE_LABELS, type Wine } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { WineBottlePlaceholder } from '../components/WineBottlePlaceholder';
import { trackEvent } from '../lib/usageTracking';

/** Ein Lagerort-Eintrag: der Anzeigename (null = "Nicht zugeordnet") plus die Weine darin. */
interface LocationGroup {
  key: string | null;
  label: string;
  wines: Wine[];
  bottleCount: number;
}

const UNASSIGNED_LABEL = 'Nicht zugeordnet';

/** Gruppiert aktive Weine nach getrimmtem storage_location, sortiert nach Flaschenzahl (Nicht-zugeordnet immer zuletzt). */
function groupByLocation(wines: Wine[]): LocationGroup[] {
  const groups = new Map<string | null, Wine[]>();
  for (const w of wines) {
    const trimmed = w.storage_location?.trim() || null;
    const list = groups.get(trimmed);
    if (list) list.push(w);
    else groups.set(trimmed, [w]);
  }

  const result: LocationGroup[] = Array.from(groups.entries()).map(([key, groupWines]) => ({
    key,
    label: key ?? UNASSIGNED_LABEL,
    wines: groupWines,
    bottleCount: groupWines.reduce((sum, w) => sum + w.quantity, 0),
  }));

  const withLocation = result.filter((g) => g.key !== null).sort((a, b) => b.bottleCount - a.bottleCount);
  const unassigned = result.filter((g) => g.key === null);
  return [...withLocation, ...unassigned];
}

export function CellarMapPage() {
  const navigate = useNavigate();
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => trackEvent('page_view_lagerplan'), []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setWines(await listWines());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activeWines = useMemo(() => wines.filter((w) => !w.is_consumed), [wines]);
  const groups = useMemo(() => groupByLocation(activeWines), [activeWines]);

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
        <h1 style={{ fontSize: 25, marginBottom: 4 }}>Lagerplan</h1>
        <div style={{ fontSize: 12.5, opacity: 0.6, marginBottom: 16, lineHeight: 1.5 }}>
          Deine Weine nach Lagerort gruppiert — antippen für die Liste.
        </div>

        {loading && <LoadingSpinner label="Lagerplan wird geladen ..." />}
        {error && <ErrorBanner message={error} onRetry={load} />}

        {!loading && !error && activeWines.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 34, marginBottom: 10, opacity: 0.7 }}>🗺️</div>
            <div style={{ opacity: 0.6, fontSize: 14, marginBottom: 18 }}>
              Noch kein Lagerplan - der füllt sich, sobald du deine ersten Weine mit einem Lagerort erfasst hast.
            </div>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/wine/new')}>
              Ersten Wein hinzufügen
            </button>
          </div>
        )}

        {!loading && !error && activeWines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groups.map((group) => (
              <LocationTile
                key={group.key ?? '__unassigned__'}
                group={group}
                isExpanded={expanded === (group.key ?? '__unassigned__')}
                onToggle={() =>
                  setExpanded((current) => (current === (group.key ?? '__unassigned__') ? null : group.key ?? '__unassigned__'))
                }
                onSelectWine={(id) => navigate(`/wine/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LocationTile({
  group,
  isExpanded,
  onToggle,
  onSelectWine,
}: {
  group: LocationGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectWine: (id: string) => void;
}) {
  const distinctWineCount = group.wines.length;
  const preview = group.wines.slice(0, 5);
  const isUnassigned = group.key === null;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          width: '100%',
          border: 'none',
          background: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          padding: '14px 16px',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {group.label}
          </div>
          <div className="card-kicker">
            {group.bottleCount} {group.bottleCount === 1 ? 'Flasche' : 'Flaschen'} · {distinctWineCount}{' '}
            {distinctWineCount === 1 ? 'Wein' : 'Weine'}
          </div>
          {isUnassigned && (
            <div style={{ fontSize: 11.5, opacity: 0.55, marginTop: 4, lineHeight: 1.4 }}>
              Kein Lagerort eingetragen — beim Bearbeiten eines Weins ergänzbar.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 3, flex: '0 0 auto' }}>
          {preview.map((w) => (
            <div key={w.id} style={{ width: 22, height: 44 }}>
              <WineBottlePlaceholder name={w.name} wineType={w.wine_type} />
            </div>
          ))}
        </div>

        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          stroke="var(--color-text)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flex: '0 0 auto',
            opacity: 0.5,
            transform: isExpanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        >
          <path d="M1 3.5L6 8.5L11 3.5" />
        </svg>
      </button>

      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--color-divider)', padding: '6px 8px' }}>
          {group.wines.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => onSelectWine(w.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                width: '100%',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                padding: '10px 8px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {w.name}
                </div>
                <div style={{ fontSize: 11.5, opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {[w.producer, w.vintage ? String(w.vintage) : null, w.wine_type ? WINE_TYPE_LABELS[w.wine_type] : null]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <span className="tag tag-outline" style={{ flex: '0 0 auto' }}>
                {w.quantity} {w.quantity === 1 ? 'Flasche' : 'Flaschen'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
