import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';

interface LexiconEntry {
  name: string;
  description: string;
}

interface LexiconData {
  grapeVarieties: LexiconEntry[];
  regions: LexiconEntry[];
}

type Tab = 'grapes' | 'regions';

// Wie in wineReference.ts (loadIndex): einmal pro Sitzung geladen und
// gecacht, statt bei jedem Seitenbesuch die ~400KB grosse Datei erneut vom
// Netz zu holen - setzt sich bei einem Fehler zurueck, damit "Erneut
// versuchen" tatsaechlich einen neuen Versuch macht.
let lexiconPromise: Promise<LexiconData> | null = null;

function loadLexicon(): Promise<LexiconData> {
  if (!lexiconPromise) {
    lexiconPromise = fetch('/data/wine-lexicon.json')
      .then((res) => {
        if (!res.ok) throw new Error('nicht erreichbar');
        return res.json() as Promise<LexiconData>;
      })
      .catch((e) => {
        lexiconPromise = null;
        throw e;
      });
  }
  return lexiconPromise;
}

export function WineLexiconPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<LexiconData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(searchParams.get('type') === 'regionen' ? 'regions' : 'grapes');
  const [search, setSearch] = useState(searchParams.get('q') ?? '');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await loadLexicon());
    } catch {
      setError('Weinlexikon konnte nicht geladen werden. Bitte Internetverbindung pruefen und erneut versuchen.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const entries = tab === 'grapes' ? data?.grapeVarieties : data?.regions;

  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return entries
      .filter((e) => e.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const an = a.name.toLowerCase();
        const bn = b.name.toLowerCase();
        if (an === q && bn !== q) return -1;
        if (bn === q && an !== q) return 1;
        const aStarts = an.startsWith(q);
        const bStarts = bn.startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;
        return an.localeCompare(bn);
      })
      .slice(0, 60);
  }, [entries, search]);

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
        <h1 style={{ fontSize: 25, marginBottom: 4 }}>Weinlexikon</h1>
        <div style={{ fontSize: 12.5, opacity: 0.6, marginBottom: 16, lineHeight: 1.5 }}>
          Echte Rebsorten und Weinregionen mit kurzer Beschreibung, aus Wikipedia. Zum Nachschlagen, wenn du auf dem
          Etikett einen Begriff siehst, den du nicht kennst.
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button
            type="button"
            className={tab === 'grapes' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ flex: 1 }}
            onClick={() => setTab('grapes')}
          >
            Rebsorten
          </button>
          <button
            type="button"
            className={tab === 'regions' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ flex: 1 }}
            onClick={() => setTab('regions')}
          >
            Regionen
          </button>
        </div>

        <div className="search-box" style={{ marginBottom: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder={tab === 'grapes' ? 'Rebsorte suchen, z. B. Riesling' : 'Region suchen, z. B. Bordeaux'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Suche im Weinlexikon"
          />
        </div>

        {loading && <LoadingSpinner label="Weinlexikon wird geladen ..." />}
        {error && <ErrorBanner message={error} onRetry={load} />}

        {!loading && !error && (
          <>
            {!search.trim() && (
              <div style={{ textAlign: 'center', opacity: 0.55, fontSize: 13.5, padding: '30px 10px' }}>
                {entries?.length ?? 0} {tab === 'grapes' ? 'Rebsorten' : 'Regionen'} verfuegbar - tippe oben, um zu
                suchen.
              </div>
            )}

            {search.trim() && filtered.length === 0 && (
              <div style={{ textAlign: 'center', opacity: 0.55, fontSize: 13.5, padding: '30px 10px' }}>
                Keine Treffer fuer "{search}".
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((entry) => (
                <div key={entry.name} className="card">
                  <div className="card-title">{entry.name}</div>
                  <p className="card-body" style={{ margin: 0 }}>
                    {entry.description}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
