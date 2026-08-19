import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listWines } from '../lib/wineRepository';
import { WINE_TYPE_LABELS, splitCommaList, type Wine } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';

interface Row {
  label: string;
  count: number;
}

function groupBy(wines: Wine[], pick: (w: Wine) => string | null): Row[] {
  const counts = new Map<string, number>();
  for (const w of wines) {
    const key = pick(w);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/** Wie groupBy, aber fuer kommagetrennte Mehrfachwerte (z. B. mehrere Rebsorten pro Wein). */
function groupByMulti(wines: Wine[], pick: (w: Wine) => string | null): Row[] {
  const counts = new Map<string, number>();
  for (const w of wines) {
    for (const value of splitCommaList(pick(w))) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function StatsPage() {
  const navigate = useNavigate();
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Wunschlisten-Eintraege zaehlen nicht als Bestand - weder bei Flaschen noch
  // beim Gesamtwert noch in den Aufschluesselungen.
  const activeWines = useMemo(() => wines.filter((w) => !w.is_consumed && !w.is_wishlist), [wines]);
  const consumedCount = useMemo(() => wines.filter((w) => w.is_consumed && !w.is_wishlist).length, [wines]);
  const wishlistCount = useMemo(() => wines.filter((w) => w.is_wishlist).length, [wines]);
  const totalBottles = useMemo(() => activeWines.reduce((sum, w) => sum + w.quantity, 0), [activeWines]);
  const favoriteCount = useMemo(() => activeWines.filter((w) => w.is_favorite).length, [activeWines]);

  const byRegion = useMemo(() => groupBy(activeWines, (w) => w.region), [activeWines]);
  const byGrape = useMemo(() => groupByMulti(activeWines, (w) => w.grape_variety), [activeWines]);
  const byVintage = useMemo(
    () => groupBy(activeWines, (w) => (w.vintage ? String(w.vintage) : null)).sort((a, b) => Number(b.label) - Number(a.label)),
    [activeWines],
  );
  const byType = useMemo(
    () => groupBy(activeWines, (w) => (w.wine_type ? WINE_TYPE_LABELS[w.wine_type] : null)),
    [activeWines],
  );

  // Gesamtwert: nur Weine mit angegebenem Preis zaehlen mit (kein Preis wird
  // nie stillschweigend als 0 gerechnet) - dafuer wird separat gezeigt, bei
  // wie vielen Flaschen noch kein Preis eingetragen ist.
  const totalValue = useMemo(
    () => activeWines.filter((w) => w.price !== null).reduce((sum, w) => sum + w.price! * w.quantity, 0),
    [activeWines],
  );
  const bottlesWithoutPrice = useMemo(
    () => activeWines.filter((w) => w.price === null).reduce((sum, w) => sum + w.quantity, 0),
    [activeWines],
  );

  // Der Wein, von dem am meisten Flaschen im Vorrat sind.
  const topWine = useMemo(() => {
    return activeWines.reduce<Wine | null>((best, w) => {
      if (w.quantity <= 0) return best;
      if (!best || w.quantity > best.quantity) return w;
      return best;
    }, null);
  }, [activeWines]);

  return (
    <div className="app-screen">
      <div className="top-bar">
        <button type="button" className="icon-btn" aria-label="Zurueck" onClick={() => navigate(-1)}>
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 1L2 9l8 8" />
          </svg>
        </button>
      </div>

      <div style={{ padding: '0 20px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontSize: 25, margin: 0 }}>Statistik</h1>
          <button type="button" className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={() => navigate('/rueckblick')}>
            Rueckblick
          </button>
        </div>

        {loading && <LoadingSpinner label="Statistik wird geladen ..." />}
        {error && <ErrorBanner message={error} onRetry={load} />}

        {!loading && !error && (
          <>
            {topWine && topWine.quantity > 1 && (
              <div
                className="card"
                style={{
                  marginBottom: 20,
                  border: '1px solid var(--color-accent)',
                  background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
                }}
              >
                <div className="card-kicker">Am meisten im Vorrat</div>
                <div className="card-title" style={{ fontSize: 18 }}>
                  {topWine.name}
                </div>
                {topWine.producer && <div style={{ fontSize: 12.5, opacity: 0.7 }}>{topWine.producer}</div>}
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--color-accent)', marginTop: 4 }}>
                  {topWine.quantity} Flaschen
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <StatTile value={activeWines.length} label={activeWines.length === 1 ? 'Wein im Vorrat' : 'Weine im Vorrat'} />
              <StatTile value={totalBottles} label={totalBottles === 1 ? 'Flasche' : 'Flaschen'} />
              <StatTile value={favoriteCount} label="Favoriten" />
              <StatTile value={consumedCount} label="Getrunken" />
              <StatTile value={wishlistCount} label="Wunschliste" />
              <StatTile value={totalValue.toFixed(2)} label="Gesamtwert" />
            </div>
            {bottlesWithoutPrice > 0 && (
              <div style={{ fontSize: 12, opacity: 0.55, marginBottom: 24 }}>
                {bottlesWithoutPrice} {bottlesWithoutPrice === 1 ? 'Flasche' : 'Flaschen'} ohne angegebenen Preis - im
                Gesamtwert nicht mitgerechnet.
              </div>
            )}
            {bottlesWithoutPrice === 0 && <div style={{ marginBottom: 24 }} />}

            <StatList title="Nach Typ" rows={byType} emptyText="Noch keine Weintypen erfasst." />
            <StatList title="Nach Region" rows={byRegion} emptyText="Noch keine Regionen erfasst." />
            <StatList title="Nach Rebsorte" rows={byGrape} emptyText="Noch keine Rebsorten erfasst." />
            <StatList title="Nach Jahrgang" rows={byVintage} emptyText="Noch keine Jahrgaenge erfasst." />
          </>
        )}
      </div>
    </div>
  );
}

function StatTile({ value, label }: { value: number | string; label: string }) {
  return (
    <div
      className="card"
      style={{ flex: '1 1 120px', alignItems: 'center', textAlign: 'center', gap: 2, padding: '14px 10px' }}
    >
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 26 }}>{value}</div>
      <div style={{ fontSize: 11.5, opacity: 0.65 }}>{label}</div>
    </div>
  );
}

function StatList({ title, rows, emptyText }: { title: string; rows: Row[]; emptyText: string }) {
  const max = rows[0]?.count ?? 1;
  return (
    <div style={{ marginBottom: 26 }}>
      <div className="card-kicker" style={{ marginBottom: 10 }}>
        {title}
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 13, opacity: 0.55 }}>{emptyText}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((row) => (
            <div key={row.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 4 }}>
                <span>{row.label}</span>
                <span style={{ opacity: 0.6 }}>{row.count}</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: 'var(--color-divider)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.max(6, (row.count / max) * 100)}%`,
                    background: 'var(--color-accent)',
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
