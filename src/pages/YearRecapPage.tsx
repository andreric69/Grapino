import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listWines, listConsumptionLog } from '../lib/wineRepository';
import type { ConsumptionLogEntry, Wine } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { shareOrDownloadYearRecap, type YearRecapStats } from '../lib/yearRecapCard';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { trackEvent } from '../lib/usageTracking';
import { getAccessStatus } from '../lib/accessControl';
import { canUseProFeatures, type Plan } from '../lib/planLimits';

/** Gruppiert Eintraege nach einem Schluessel und zaehlt, absteigend sortiert - selbe Idee wie in RueckblickPage.tsx. */
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

/** Der meistgetrunkene Weinname im Jahr - bei durchgaengig einmalig getrunkenen Weinen stattdessen der bestbewertete. */
function findWineOfTheYear(yearEntries: ConsumptionLogEntry[], wines: Wine[]): string | null {
  if (yearEntries.length === 0) return null;

  const counts = new Map<string, number>();
  const firstSeenOrder: string[] = [];
  for (const e of yearEntries) {
    if (!counts.has(e.wine_name)) firstSeenOrder.push(e.wine_name);
    counts.set(e.wine_name, (counts.get(e.wine_name) ?? 0) + 1);
  }

  let best: { name: string; count: number } | null = null;
  for (const name of firstSeenOrder) {
    const count = counts.get(name)!;
    if (!best || count > best.count) best = { name, count };
  }
  if (best && best.count > 1) return best.name;

  // Alles wurde genau einmal getrunken (oder nur eine einzige Flasche
  // insgesamt) - stattdessen den bestbewerteten Wein zeigen, sofern sich der
  // Log-Eintrag noch einem aktuellen Wein zuordnen laesst (wine_id kann bei
  // spaeter endgueltig geloeschten Weinen fehlen - dann einfach ueberspringen).
  let bestRated: { name: string; rating: number } | null = null;
  for (const e of yearEntries) {
    if (!e.wine_id) continue;
    const w = wines.find((x) => x.id === e.wine_id);
    if (!w || w.rating == null) continue;
    if (!bestRated || w.rating > bestRated.rating) bestRated = { name: w.name, rating: w.rating };
  }
  return bestRated?.name ?? null;
}

function buildHeadline(totalBottles: number, regionCount: number, topGrape: string | null): string {
  if (totalBottles === 0) return '';
  const bottlesPart = `${totalBottles} ${totalBottles === 1 ? 'Flasche' : 'Flaschen'}`;
  const regionPart = regionCount > 0 ? `, ${regionCount} ${regionCount === 1 ? 'Region' : 'Regionen'}` : '';
  const grapePart = topGrape ? `, ${topGrape} als Lieblingsrebsorte` : '';
  return `${bottlesPart}${regionPart}${grapePart}.`;
}

export function YearRecapPage() {
  const navigate = useNavigate();
  const [wines, setWines] = useState<Wine[]>([]);
  const [consumptionLog, setConsumptionLog] = useState<ConsumptionLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearOverride, setYearOverride] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const { toastMessage, showToast } = useToast();

  useEffect(() => trackEvent('page_view_weinjahr_rueckblick'), []);

  // Weinjahr-Rueckblick ist ein Pro-Feature (siehe planLimits.ts) - erst
  // sobald die Stufe feststeht, wird zwischen normaler Ansicht und dem
  // Hinweis fuer Basis-Nutzer entschieden (kein Flackern der vollen Ansicht).
  useEffect(() => {
    let cancelled = false;
    getAccessStatus().then((status) => {
      if (!cancelled) setPlan(status.plan);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const planLoading = plan === null;
  const blocked = plan !== null && !canUseProFeatures(plan);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [wineData, logData] = await Promise.all([listWines(), listConsumptionLog()]);
      setWines(wineData);
      setConsumptionLog(logData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Reset einer manuellen Jahresauswahl, falls sie ausserhalb des nach dem
  // (Neu-)Laden verfuegbaren Bereichs liegt.
  useEffect(() => {
    setYearOverride(null);
  }, [consumptionLog.length]);

  const currentCalendarYear = new Date().getFullYear();

  const yearsWithData = useMemo(
    () =>
      Array.from(new Set(consumptionLog.map((e) => new Date(e.consumed_at).getFullYear()))).sort((a, b) => b - a),
    [consumptionLog],
  );

  const maxYear = yearsWithData[0] ?? currentCalendarYear;
  const minYear = yearsWithData[yearsWithData.length - 1] ?? currentCalendarYear;
  const hasMultipleYears = yearsWithData.length > 1;

  const selectedYear = yearOverride ?? maxYear;
  const canGoPrev = selectedYear > minYear;
  const canGoNext = selectedYear < maxYear;

  const yearEntries = useMemo(
    () => consumptionLog.filter((e) => new Date(e.consumed_at).getFullYear() === selectedYear),
    [consumptionLog, selectedYear],
  );

  const totalBottles = yearEntries.length;
  const distinctWines = useMemo(() => new Set(yearEntries.map((e) => e.wine_name)).size, [yearEntries]);
  const byRegion = useMemo(() => groupCount(yearEntries, (e) => e.region), [yearEntries]);
  const byGrape = useMemo(() => groupCount(yearEntries, (e) => e.grape_variety), [yearEntries]);
  const topRegion = byRegion[0]?.label ?? null;
  const topGrape = byGrape[0]?.label ?? null;
  const wineOfTheYear = useMemo(() => findWineOfTheYear(yearEntries, wines), [yearEntries, wines]);
  const newWinesAdded = useMemo(
    () => wines.filter((w) => new Date(w.created_at).getFullYear() === selectedYear).length,
    [wines, selectedYear],
  );
  const headline = useMemo(() => buildHeadline(totalBottles, byRegion.length, topGrape), [totalBottles, byRegion.length, topGrape]);

  async function handleShare() {
    if (blocked) return;
    trackEvent('share_geklickt');
    setSharing(true);
    setShareError(null);
    try {
      const stats: YearRecapStats = {
        year: selectedYear,
        totalBottles,
        distinctWines,
        topRegion,
        topGrape,
        wineOfTheYear,
        newWinesAdded,
      };
      const result = await shareOrDownloadYearRecap(stats);
      if (result === 'downloaded') showToast('Bild gespeichert.');
    } catch (e) {
      setShareError(e instanceof Error ? e.message : 'Teilen fehlgeschlagen.');
    } finally {
      setSharing(false);
    }
  }

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
        <h1 style={{ fontSize: 25, marginBottom: 4 }}>Weinjahr</h1>
        <div style={{ fontSize: 12.5, opacity: 0.6, marginBottom: 20 }}>Dein Jahr in Wein, als kleiner Rückblick</div>

        {(loading || planLoading) && <LoadingSpinner label="Weinjahr wird zusammengestellt ..." />}
        {error && <ErrorBanner message={error} onRetry={load} />}

        {!loading && !planLoading && !error && blocked && (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 34, marginBottom: 10, opacity: 0.7 }}>🔒</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20, marginBottom: 8 }}>
              Nur ab der Pro-Stufe
            </div>
            <div style={{ opacity: 0.6, fontSize: 14, marginBottom: 18 }}>
              Der Weinjahr-Rückblick ist ab der Pro-Stufe verfügbar.
            </div>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
              Zur Sammlung
            </button>
          </div>
        )}

        {!loading && !planLoading && !error && !blocked && (
          <>
            {hasMultipleYears && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 18 }}>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Vorheriges Jahr"
                  disabled={!canGoPrev}
                  onClick={() => setYearOverride(selectedYear - 1)}
                  style={{ opacity: canGoPrev ? 1 : 0.3 }}
                >
                  <svg width="10" height="16" viewBox="0 0 12 18" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 1L2 9l8 8" />
                  </svg>
                </button>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18, minWidth: 60, textAlign: 'center' }}>
                  {selectedYear}
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Nächstes Jahr"
                  disabled={!canGoNext}
                  onClick={() => setYearOverride(selectedYear + 1)}
                  style={{ opacity: canGoNext ? 1 : 0.3 }}
                >
                  <svg width="10" height="16" viewBox="0 0 12 18" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 1l8 8-8 8" />
                  </svg>
                </button>
              </div>
            )}

            {totalBottles === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 34, marginBottom: 10, opacity: 0.7 }}>🍷</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20, marginBottom: 8 }}>
                  Noch keine Weine in {selectedYear} getrunken
                </div>
                <div style={{ opacity: 0.6, fontSize: 14, marginBottom: 18 }}>
                  Sobald du dieses Jahr die erste Flasche genossen hast, entsteht hier dein persönliches Weinjahr.
                </div>
                <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
                  Zur Sammlung
                </button>
              </div>
            ) : (
              <>
                <div
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    padding: '40px 24px 32px',
                    marginBottom: 22,
                    textAlign: 'center',
                    color: '#f8f4f4',
                    background: 'linear-gradient(135deg, var(--color-bordeaux), var(--color-accent))',
                    boxShadow: 'var(--shadow-lg)',
                  }}
                >
                  <div style={{ fontSize: 13, letterSpacing: 3, opacity: 0.85, marginBottom: 6 }}>WEINJAHR</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 68, lineHeight: 1 }}>
                    {selectedYear}
                  </div>
                  <div style={{ fontSize: 15.5, marginTop: 16, lineHeight: 1.5, opacity: 0.95 }}>{headline}</div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <div className="card" style={{ flex: 1, alignItems: 'center', textAlign: 'center', gap: 2, padding: '18px 10px' }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 32 }}>{totalBottles}</div>
                    <div style={{ fontSize: 11.5, opacity: 0.65 }}>{totalBottles === 1 ? 'Flasche' : 'Flaschen'}</div>
                  </div>
                  <div className="card" style={{ flex: 1, alignItems: 'center', textAlign: 'center', gap: 2, padding: '18px 10px' }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 32 }}>{distinctWines}</div>
                    <div style={{ fontSize: 11.5, opacity: 0.65 }}>{distinctWines === 1 ? 'Verschiedener Wein' : 'Verschiedene Weine'}</div>
                  </div>
                </div>

                {(topRegion || topGrape) && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    {topRegion && (
                      <div className="card" style={{ flex: 1, gap: 4, padding: '14px 14px' }}>
                        <div className="card-kicker">Meiste Region</div>
                        <div className="card-title" style={{ fontSize: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {topRegion}
                        </div>
                      </div>
                    )}
                    {topGrape && (
                      <div className="card" style={{ flex: 1, gap: 4, padding: '14px 14px' }}>
                        <div className="card-kicker">Meiste Rebsorte</div>
                        <div className="card-title" style={{ fontSize: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {topGrape}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {wineOfTheYear && (
                  <div
                    className="card"
                    style={{
                      marginBottom: 16,
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: 6,
                      padding: '20px 16px',
                      border: '1px solid var(--color-accent)',
                      background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
                    }}
                  >
                    <div className="card-kicker">★ Wein des Jahres</div>
                    <div className="card-title" style={{ fontSize: 22 }}>{wineOfTheYear}</div>
                  </div>
                )}

                {newWinesAdded > 0 && (
                  <div style={{ fontSize: 13, opacity: 0.65, textAlign: 'center', marginBottom: 24 }}>
                    {newWinesAdded} {newWinesAdded === 1 ? 'neuer Wein' : 'neue Weine'} in {selectedYear} entdeckt
                  </div>
                )}

                <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={handleShare} disabled={sharing}>
                  {sharing ? 'Wird erstellt ...' : 'Teilen'}
                </button>
                {shareError && <ErrorBanner message={shareError} />}
              </>
            )}
          </>
        )}
      </div>
      <Toast message={toastMessage} />
    </div>
  );
}
