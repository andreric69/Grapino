import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listWines, listConsumptionLog } from '../lib/wineRepository';
import type { ConsumptionLogEntry, Wine } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { computeMilestones, type Milestone, type MilestoneCategory } from '../lib/milestones';

const CATEGORY_LABELS: Record<MilestoneCategory, string> = {
  sammlung: 'Sammlung',
  getrunken: 'Getrunken',
  vielfalt: 'Vielfalt',
  besonderes: 'Besonderes',
};

const CATEGORY_ORDER: MilestoneCategory[] = ['sammlung', 'getrunken', 'vielfalt', 'besonderes'];

function groupByCategory(milestones: Milestone[]): { category: MilestoneCategory; items: Milestone[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: milestones.filter((m) => m.category === category),
  })).filter((group) => group.items.length > 0);
}

export function MilestonesPage() {
  const navigate = useNavigate();
  const [wines, setWines] = useState<Wine[]>([]);
  const [consumptionLog, setConsumptionLog] = useState<ConsumptionLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const milestones = useMemo(() => computeMilestones(wines, consumptionLog), [wines, consumptionLog]);
  const achievedCount = useMemo(() => milestones.filter((m) => m.achieved).length, [milestones]);
  const groups = useMemo(() => groupByCategory(milestones), [milestones]);

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
        <h1 style={{ fontSize: 25, marginBottom: 4 }}>Meilensteine</h1>
        <div style={{ fontSize: 12.5, opacity: 0.6, marginBottom: 16, lineHeight: 1.5 }}>
          Ein Rückblick auf das, was in deiner Sammlung mit der Zeit zusammengekommen ist.
        </div>

        {loading && <LoadingSpinner label="Meilensteine werden geladen ..." />}
        {error && <ErrorBanner message={error} onRetry={load} />}

        {!loading && !error && (
          <>
            <div
              className="card"
              style={{
                marginBottom: 24,
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
                <TrophyIcon size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="card-kicker">Fortschritt</div>
                <div className="card-title" style={{ fontSize: 18 }}>
                  {achievedCount} von {milestones.length} Meilensteinen erreicht
                </div>
              </div>
            </div>

            {groups.map((group) => (
              <div key={group.category} style={{ marginBottom: 28 }}>
                <div className="card-kicker" style={{ marginBottom: 10 }}>
                  {CATEGORY_LABELS[group.category]}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {group.items.map((m) => (
                    <MilestoneCard key={m.id} milestone={m} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const { title, description, achieved, progress } = milestone;
  return (
    <div
      className="card"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        border: achieved ? '1px solid var(--color-accent)' : '1px solid var(--color-divider)',
        opacity: achieved ? 1 : 0.65,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          flex: '0 0 auto',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: achieved ? 'color-mix(in srgb, var(--color-accent) 18%, transparent)' : 'var(--color-surface)',
          color: achieved ? 'var(--color-accent)' : 'var(--color-text)',
        }}
      >
        {achieved ? <CheckIcon size={16} /> : <LockIcon size={15} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="card-title" style={{ fontSize: 15 }}>
          {title}
        </div>
        <div style={{ fontSize: 12.5, opacity: 0.7, lineHeight: 1.4 }}>{description}</div>
        {!achieved && progress && (
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 6, borderRadius: 999, background: 'var(--color-divider)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(2, (progress.current / progress.target) * 100)}%`,
                  background: 'var(--color-accent)',
                  borderRadius: 999,
                }}
              />
            </div>
            <div style={{ fontSize: 11, opacity: 0.55, marginTop: 3 }}>
              {progress.current} / {progress.target}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- kleine Linien-Icons, einheitlich mit dem Zurueck-Pfeil im Header ------ */
function iconProps(size: number) {
  return { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
}
function TrophyIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M7 4h10v5a5 5 0 01-10 0V4z" />
      <path d="M7 5H4.5A2.5 2.5 0 007 9.5M17 5h2.5A2.5 2.5 0 0117 9.5" />
      <path d="M12 14v3M9 20.5h6M9.5 17.5h5l.5 3h-6l.5-3z" />
    </svg>
  );
}
function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M4.5 12.5l5 5L19.5 7" />
    </svg>
  );
}
function LockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V7a4 4 0 018 0v3.5" />
    </svg>
  );
}
