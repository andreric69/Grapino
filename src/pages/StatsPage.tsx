import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listWines } from '../lib/wineRepository';
import { WINE_TYPE_LABELS, splitCommaList, type Wine } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';

type CountMode = 'bottles' | 'wines';

interface Row {
  label: string;
  count: number;
}

/** Zaehlgewicht eines Weins je nach Modus - 1 pro Wein-Eintrag oder die Flaschenzahl. */
function weightFor(mode: CountMode, w: Wine): number {
  return mode === 'bottles' ? w.quantity : 1;
}

function groupBy(wines: Wine[], pick: (w: Wine) => string | null, mode: CountMode): Row[] {
  const counts = new Map<string, number>();
  for (const w of wines) {
    const key = pick(w);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + weightFor(mode, w));
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/** Wie groupBy, aber fuer kommagetrennte Mehrfachwerte (z. B. mehrere Rebsorten pro Wein). */
function groupByMulti(wines: Wine[], pick: (w: Wine) => string | null, mode: CountMode): Row[] {
  const counts = new Map<string, number>();
  for (const w of wines) {
    for (const value of splitCommaList(pick(w))) {
      counts.set(value, (counts.get(value) ?? 0) + weightFor(mode, w));
    }
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

interface DrinkBuckets {
  ready: number;
  wait: number;
  past: number;
  unknown: number;
}

function drinkBuckets(wines: Wine[], mode: CountMode, currentYear: number): DrinkBuckets {
  const buckets: DrinkBuckets = { ready: 0, wait: 0, past: 0, unknown: 0 };
  for (const w of wines) {
    const weight = weightFor(mode, w);
    if (w.drink_from == null && w.drink_to == null) {
      buckets.unknown += weight;
      continue;
    }
    const from = w.drink_from ?? -Infinity;
    const to = w.drink_to ?? Infinity;
    if (currentYear < from) buckets.wait += weight;
    else if (currentYear > to) buckets.past += weight;
    else buckets.ready += weight;
  }
  return buckets;
}

export function StatsPage() {
  const navigate = useNavigate();
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<CountMode>('bottles');

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
  const consumedCount = useMemo(() => wines.filter((w) => w.is_consumed).length, [wines]);
  const totalBottles = useMemo(() => activeWines.reduce((sum, w) => sum + w.quantity, 0), [activeWines]);
  const favoriteCount = useMemo(() => activeWines.filter((w) => w.is_favorite).length, [activeWines]);

  const byType = useMemo(() => groupBy(activeWines, (w) => (w.wine_type ? WINE_TYPE_LABELS[w.wine_type] : null), mode), [activeWines, mode]);
  const byRegion = useMemo(() => groupBy(activeWines, (w) => w.region, mode), [activeWines, mode]);
  const byCountry = useMemo(() => groupBy(activeWines, (w) => w.country, mode), [activeWines, mode]);
  const byGrape = useMemo(() => groupByMulti(activeWines, (w) => w.grape_variety, mode), [activeWines, mode]);
  const byProducer = useMemo(() => groupBy(activeWines, (w) => w.producer, mode), [activeWines, mode]);
  const byVintage = useMemo(
    () => groupBy(activeWines, (w) => (w.vintage ? String(w.vintage) : null), mode).sort((a, b) => Number(b.label) - Number(a.label)),
    [activeWines, mode],
  );

  const currentYear = new Date().getFullYear();
  const drink = useMemo(() => drinkBuckets(activeWines, mode, currentYear), [activeWines, mode, currentYear]);
  const drinkTotal = drink.ready + drink.wait + drink.past + drink.unknown;

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
  const pricedBottles = totalBottles - bottlesWithoutPrice;
  const avgPricePerBottle = pricedBottles > 0 ? totalValue / pricedBottles : null;

  const producerCount = useMemo(() => new Set(activeWines.map((w) => w.producer).filter(Boolean)).size, [activeWines]);
  const vintageRange = useMemo(() => {
    const vintages = activeWines.map((w) => w.vintage).filter((v): v is number => v != null);
    if (vintages.length === 0) return null;
    const min = Math.min(...vintages);
    const max = Math.max(...vintages);
    return min === max ? String(min) : `${min}–${max}`;
  }, [activeWines]);

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
        <button type="button" className="icon-btn" aria-label="Zurück" onClick={() => navigate(-1)}>
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 1L2 9l8 8" />
          </svg>
        </button>
      </div>

      <div style={{ padding: '0 20px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontSize: 25, margin: 0 }}>Statistik</h1>
          <button type="button" className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={() => navigate('/rueckblick')}>
            Rückblick
          </button>
        </div>

        {loading && <LoadingSpinner label="Statistik wird geladen ..." />}
        {error && <ErrorBanner message={error} onRetry={load} />}

        {!loading && !error && wines.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 34, marginBottom: 10, opacity: 0.7 }}>📊</div>
            <div style={{ opacity: 0.6, fontSize: 14, marginBottom: 18 }}>
              Noch keine Statistik - die füllt sich, sobald du deine ersten Weine erfasst hast.
            </div>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/wine/new')}>
              Ersten Wein hinzufügen
            </button>
          </div>
        )}

        {!loading && !error && wines.length > 0 && (
          <>
            {topWine && topWine.quantity > 1 && (
              <div
                className="card"
                style={{
                  marginBottom: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  border: '1px solid var(--color-accent)',
                  background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    flex: '0 0 auto',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
                    color: 'var(--color-accent)',
                  }}
                >
                  <BottleIcon size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="card-kicker">Am meisten im Vorrat</div>
                  <div className="card-title" style={{ fontSize: 18, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {topWine.name}
                  </div>
                  {topWine.producer && <div style={{ fontSize: 12.5, opacity: 0.7 }}>{topWine.producer}</div>}
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20, color: 'var(--color-accent)', textAlign: 'right', flex: '0 0 auto' }}>
                  {topWine.quantity}
                  <div style={{ fontSize: 10.5, fontFamily: 'var(--font-body)', fontWeight: 400, opacity: 0.7 }}>Flaschen</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <StatTile icon={<GlassIcon />} value={activeWines.length} label={activeWines.length === 1 ? 'Wein im Vorrat' : 'Weine im Vorrat'} />
              <StatTile icon={<BottleIcon />} value={totalBottles} label={totalBottles === 1 ? 'Flasche' : 'Flaschen'} />
              <StatTile icon={<HeartIcon />} value={favoriteCount} label="Favoriten" />
              <StatTile icon={<CheckIcon />} value={consumedCount} label="Getrunken" />
              <StatTile icon={<BuildingIcon />} value={producerCount} label={producerCount === 1 ? 'Produzent' : 'Produzenten'} />
              <StatTile icon={<TagIcon />} value={totalValue.toFixed(2)} label="Gesamtwert" small />
              <StatTile icon={<TagIcon />} value={avgPricePerBottle !== null ? avgPricePerBottle.toFixed(2) : '–'} label="Ø Preis / Flasche" small />
              {vintageRange && <StatTile icon={<CalendarIcon />} value={vintageRange} label="Jahrgangsspanne" small />}
            </div>
            {bottlesWithoutPrice > 0 && (
              <div style={{ fontSize: 12, opacity: 0.55, marginBottom: 24 }}>
                {bottlesWithoutPrice} {bottlesWithoutPrice === 1 ? 'Flasche' : 'Flaschen'} ohne angegebenen Preis - im
                Gesamtwert nicht mitgerechnet.
              </div>
            )}
            {bottlesWithoutPrice === 0 && <div style={{ marginBottom: 24 }} />}

            {drinkTotal > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div className="card-kicker" style={{ marginBottom: 10 }}>
                  Trinkfenster
                </div>
                <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', background: 'var(--color-divider)' }}>
                  {drink.ready > 0 && <div style={{ width: `${(drink.ready / drinkTotal) * 100}%`, background: 'var(--color-accent)' }} />}
                  {drink.wait > 0 && <div style={{ width: `${(drink.wait / drinkTotal) * 100}%`, background: 'var(--color-neutral-500)' }} />}
                  {drink.past > 0 && <div style={{ width: `${(drink.past / drinkTotal) * 100}%`, background: 'var(--color-bordeaux)' }} />}
                  {drink.unknown > 0 && <div style={{ width: `${(drink.unknown / drinkTotal) * 100}%`, background: 'var(--color-divider)' }} />}
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontSize: 12 }}>
                  <DrinkLegend color="var(--color-accent)" label="Trinkreif" value={drink.ready} />
                  <DrinkLegend color="var(--color-neutral-500)" label="Noch warten" value={drink.wait} />
                  <DrinkLegend color="var(--color-bordeaux)" label="Trinkfenster vorbei" value={drink.past} />
                  <DrinkLegend color="var(--color-neutral-300)" label="Kein Trinkfenster" value={drink.unknown} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 16px' }}>
              <div className="card-kicker" style={{ margin: 0 }}>
                Aufschlüsselung
              </div>
              <ModeToggle mode={mode} onChange={setMode} />
            </div>

            <StatList title="Nach Typ" rows={byType} emptyText="Noch keine Weintypen erfasst." />
            <StatList title="Nach Region" rows={byRegion} emptyText="Noch keine Regionen erfasst." limit={8} />
            <StatList title="Nach Land" rows={byCountry} emptyText="Noch keine Länder erfasst." limit={8} />
            <StatList title="Nach Rebsorte" rows={byGrape} emptyText="Noch keine Rebsorten erfasst." limit={8} />
            <StatList title="Nach Produzent" rows={byProducer} emptyText="Noch keine Produzenten erfasst." limit={8} />
            <StatList title="Nach Jahrgang" rows={byVintage} emptyText="Noch keine Jahrgänge erfasst." />
          </>
        )}
      </div>
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: CountMode; onChange: (m: CountMode) => void }) {
  const options: { value: CountMode; label: string }[] = [
    { value: 'bottles', label: 'Flaschen' },
    { value: 'wines', label: 'Weine' },
  ];
  return (
    <div style={{ display: 'flex', gap: 3, padding: 3, background: 'var(--color-surface)', borderRadius: 999 }}>
      {options.map((opt) => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              fontSize: 12,
              padding: '6px 14px',
              borderRadius: 999,
              transition: 'background-color 0.15s ease, color 0.15s ease',
              background: active ? 'var(--color-accent)' : 'transparent',
              color: active ? 'var(--color-bg)' : 'var(--color-text)',
              opacity: active ? 1 : 0.6,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function DrinkLegend({ color, label, value }: { color: string; label: string; value: number }) {
  if (value <= 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.75 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flex: '0 0 auto' }} />
      <span>
        {label} · {value}
      </span>
    </div>
  );
}

function StatTile({ icon, value, label, small }: { icon: React.ReactNode; value: number | string; label: string; small?: boolean }) {
  return (
    <div
      className="card"
      style={{ flex: '1 1 120px', alignItems: 'center', textAlign: 'center', gap: 4, padding: '14px 10px' }}
    >
      <div style={{ color: 'var(--color-accent)', opacity: 0.8 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: small ? 18 : 26 }}>{value}</div>
      <div style={{ fontSize: 11.5, opacity: 0.65 }}>{label}</div>
    </div>
  );
}

function StatList({ title, rows, emptyText, limit }: { title: string; rows: Row[]; emptyText: string; limit?: number }) {
  const [expanded, setExpanded] = useState(false);
  const max = rows[0]?.count ?? 1;
  const shown = limit && !expanded ? rows.slice(0, limit) : rows;
  const remaining = rows.length - shown.length;
  return (
    <div style={{ marginBottom: 26 }}>
      <div className="card-kicker" style={{ marginBottom: 10 }}>
        {title}
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 13, opacity: 0.55 }}>{emptyText}</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {shown.map((row) => (
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
          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              style={{ fontSize: 12, opacity: 0.65, marginTop: 8, background: 'none', border: 'none', padding: 0, color: 'var(--color-accent)', cursor: 'pointer' }}
            >
              + {remaining} weitere
            </button>
          )}
          {expanded && limit && rows.length > limit && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              style={{ fontSize: 12, opacity: 0.65, marginTop: 8, background: 'none', border: 'none', padding: 0, color: 'var(--color-accent)', cursor: 'pointer' }}
            >
              Weniger anzeigen
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ---- kleine Linien-Icons, einheitlich mit dem Zurueck-Pfeil im Header ------ */
function iconProps(size: number) {
  return { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
}
function GlassIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M7 3h10l-1.2 8.2a3.8 3.8 0 01-3.8 3.3 3.8 3.8 0 01-3.8-3.3L7 3z" />
      <path d="M12 14.5V21M8.5 21h7" />
    </svg>
  );
}
function BottleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M10 2h4v3.2l1.7 2.6c.2.3.3.7.3 1.1V20a2 2 0 01-2 2h-4a2 2 0 01-2-2V8.9c0-.4.1-.8.3-1.1L10 5.2V2z" />
      <path d="M9 12h6" />
    </svg>
  );
}
function HeartIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M12 20.5S3.5 15.6 3.5 9.6C3.5 6.5 5.8 4.5 8.4 4.5c1.7 0 3.1.9 3.6 2.3.5-1.4 1.9-2.3 3.6-2.3 2.6 0 4.9 2 4.9 5.1 0 6-8.5 10.9-8.5 10.9z" />
    </svg>
  );
}
function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.3l2.6 2.6L16 9.5" />
    </svg>
  );
}
function BuildingIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M4 21V6.6L12 3l8 3.6V21" />
      <path d="M9.5 21v-5.5h5V21" />
      <path d="M9 9h.01M9 12.5h.01M15 9h.01M15 12.5h.01" />
    </svg>
  );
}
function TagIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M20 12.6L11.4 21 3 12.6V4h8.6L20 12.6z" />
      <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
function CalendarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}
