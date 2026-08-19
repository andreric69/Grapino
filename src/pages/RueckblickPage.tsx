import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listConsumptionLog } from '../lib/wineRepository';
import type { ConsumptionLogEntry } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
];

function groupCount(entries: ConsumptionLogEntry[], pick: (e: ConsumptionLogEntry) => string | null) {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const key = pick(e);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function RueckblickPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ConsumptionLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setEntries(await listConsumptionLog());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const last12MonthsEntries = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 12);
    return entries.filter((e) => new Date(e.consumed_at) >= cutoff);
  }, [entries]);

  const byMonth = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABELS[d.getMonth()], count: 0 });
    }
    const byKey = new Map(months.map((m) => [m.key, m]));
    for (const e of last12MonthsEntries) {
      const d = new Date(e.consumed_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = byKey.get(key);
      if (m) m.count++;
    }
    return months;
  }, [last12MonthsEntries]);

  const byRegion = useMemo(() => groupCount(last12MonthsEntries, (e) => e.region), [last12MonthsEntries]);
  const byGrape = useMemo(() => groupCount(last12MonthsEntries, (e) => e.grape_variety), [last12MonthsEntries]);
  const maxMonth = Math.max(1, ...byMonth.map((m) => m.count));

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
        <h1 style={{ fontSize: 25, marginBottom: 4 }}>Rueckblick</h1>
        <div style={{ fontSize: 12.5, opacity: 0.6, marginBottom: 20 }}>Dein Trinkverlauf der letzten 12 Monate</div>

        {loading && <LoadingSpinner label="Rueckblick wird geladen ..." />}
        {error && <ErrorBanner message={error} onRetry={load} />}

        {!loading && !error && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
              <div className="card" style={{ flex: '1 1 120px', alignItems: 'center', textAlign: 'center', gap: 2, padding: '14px 10px' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 26 }}>
                  {last12MonthsEntries.length}
                </div>
                <div style={{ fontSize: 11.5, opacity: 0.65 }}>Flaschen (12 Monate)</div>
              </div>
              <div className="card" style={{ flex: '1 1 120px', alignItems: 'center', textAlign: 'center', gap: 2, padding: '14px 10px' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 26 }}>{entries.length}</div>
                <div style={{ fontSize: 11.5, opacity: 0.65 }}>Insgesamt getrunken</div>
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <div className="card-kicker" style={{ marginBottom: 10 }}>
                Pro Monat
              </div>
              {last12MonthsEntries.length === 0 ? (
                <div style={{ fontSize: 13, opacity: 0.55 }}>Noch keine Weine in den letzten 12 Monaten getrunken.</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 90 }}>
                  {byMonth.map((m) => (
                    <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div
                        title={`${m.count}`}
                        style={{
                          width: '100%',
                          height: Math.max(3, (m.count / maxMonth) * 64),
                          background: 'var(--color-accent)',
                          borderRadius: 3,
                        }}
                      />
                      <div style={{ fontSize: 9, opacity: 0.55 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {byRegion.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div className="card-kicker" style={{ marginBottom: 8 }}>
                  Meistgetrunkene Region
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18 }}>
                  {byRegion[0].label} <span style={{ opacity: 0.5, fontWeight: 400, fontSize: 13 }}>({byRegion[0].count}x)</span>
                </div>
              </div>
            )}

            {byGrape.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div className="card-kicker" style={{ marginBottom: 8 }}>
                  Meistgetrunkene Rebsorte
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18 }}>
                  {byGrape[0].label} <span style={{ opacity: 0.5, fontWeight: 400, fontSize: 13 }}>({byGrape[0].count}x)</span>
                </div>
              </div>
            )}

            <div className="card-kicker" style={{ marginBottom: 10 }}>
              Zuletzt getrunken
            </div>
            {entries.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.55 }}>Noch nichts getrunken.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {entries.slice(0, 30).map((e) => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid var(--color-divider)', paddingBottom: 8 }}>
                    <span>{e.wine_name}</span>
                    <span style={{ opacity: 0.55 }}>
                      {new Date(e.consumed_at).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
