import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listWines } from '../lib/wineRepository';
import { splitCommaList, type Wine } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';

/**
 * Druckoptimierte Listenansicht - ueber den Browser-Druckdialog ("Als PDF
 * speichern") lassen sich so kostenlos PDF-Exporte der Sammlung erzeugen,
 * ganz ohne PDF-Bibliothek.
 */
export function PrintPage() {
  const navigate = useNavigate();
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listWines();
      setWines(data.filter((w) => !w.is_consumed && !w.is_wishlist));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totalBottles = wines.reduce((sum, w) => sum + w.quantity, 0);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: 'var(--font-body)', color: '#1a1a1a', background: '#fff' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
          Zurück
        </button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()} disabled={loading || wines.length === 0}>
          Drucken / als PDF speichern
        </button>
      </div>

      {loading && <LoadingSpinner label="Sammlung wird geladen ..." />}
      {error && <ErrorBanner message={error} onRetry={load} />}

      {!loading && !error && (
        <>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, marginBottom: 4 }}>Meine Weinsammlung</h1>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 20 }}>
            {wines.length} {wines.length === 1 ? 'Wein' : 'Weine'} &middot; {totalBottles}{' '}
            {totalBottles === 1 ? 'Flasche' : 'Flaschen'} &middot; Stand {new Date().toLocaleDateString('de-CH')}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px 6px 0' }}>Name</th>
                <th style={{ padding: '6px 8px' }}>Produzent</th>
                <th style={{ padding: '6px 8px' }}>Jahrgang</th>
                <th style={{ padding: '6px 8px' }}>Region</th>
                <th style={{ padding: '6px 8px' }}>Rebsorte(n)</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Menge</th>
                <th style={{ padding: '6px 0 6px 8px', textAlign: 'right' }}>Preis</th>
              </tr>
            </thead>
            <tbody>
              {wines.map((w) => (
                <tr key={w.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '6px 8px 6px 0' }}>{w.name}</td>
                  <td style={{ padding: '6px 8px' }}>{w.producer ?? ''}</td>
                  <td style={{ padding: '6px 8px' }}>{w.vintage ?? ''}</td>
                  <td style={{ padding: '6px 8px' }}>{[w.subregion, w.region, w.country].filter(Boolean).join(', ')}</td>
                  <td style={{ padding: '6px 8px' }}>{splitCommaList(w.grape_variety).join(', ')}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{w.quantity}</td>
                  <td style={{ padding: '6px 0 6px 8px', textAlign: 'right' }}>
                    {w.price !== null ? w.price.toFixed(2) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
        }
      `}</style>
    </div>
  );
}
