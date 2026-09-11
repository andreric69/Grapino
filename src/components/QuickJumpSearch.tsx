import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { listWines } from '../lib/wineRepository';
import { QUICK_JUMP_DESTINATIONS } from '../lib/quickJumpDestinations';
import type { Wine } from '../types';

interface QuickJumpSearchProps {
  open: boolean;
  onClose: () => void;
}

const MAX_WINE_RESULTS = 8;

/**
 * Vollflaechiges "Tippen und Springen"-Overlay ("Schnellzugriff"): filtert
 * live sowohl die statischen App-Seiten (QUICK_JUMP_DESTINATIONS) als auch
 * die eigenen Weine (Name/Produzent) und springt per Tap direkt dorthin.
 * Rein kontrollierte Komponente - der Ausloeser (Trigger-Button) wird an
 * anderer Stelle gebaut, hier zaehlt nur open/onClose.
 */
export function QuickJumpSearch({ open, onClose }: QuickJumpSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [wines, setWines] = useState<Wine[]>([]);

  // Weine nur laden, waehrend das Overlay offen ist - kein unnoetiger
  // Request, solange niemand den Schnellzugriff geoeffnet hat.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listWines()
      .then((data) => {
        if (!cancelled) setWines(data);
      })
      .catch(() => {
        // Leichtgewichtiges Feature - klappt die Weinsuche nicht, bleibt die
        // Seitensuche trotzdem nutzbar. Keine Fehlermeldung noetig.
        if (!cancelled) setWines([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Eingabe zuruecksetzen, wenn das Overlay (erneut) geoeffnet wird.
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const trimmed = query.trim().toLowerCase();
  const matches = (text: string | null | undefined) => !!text && text.toLowerCase().includes(trimmed);

  const filteredDestinations =
    trimmed === ''
      ? QUICK_JUMP_DESTINATIONS
      : QUICK_JUMP_DESTINATIONS.filter(
          (d) => matches(d.label) || (d.keywords ?? []).some((k) => matches(k))
        );

  const filteredWines =
    trimmed === ''
      ? []
      : wines.filter((w) => matches(w.name) || matches(w.producer)).slice(0, MAX_WINE_RESULTS);

  const hasAnyResults = filteredDestinations.length > 0 || filteredWines.length > 0;

  function goTo(path: string) {
    navigate(path);
    onClose();
  }

  return (
    <div className="dialog-backdrop" style={{ alignItems: 'flex-start' }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(560px, 100%)',
          height: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 40px)',
          marginTop: 'calc(env(safe-area-inset-top) + 20px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-surface)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 'var(--space-4) var(--space-4) var(--space-3)',
          }}
        >
          <div className="search-box" style={{ flex: 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Wein oder Seite suchen ..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              aria-label="Schnellzugriff durchsuchen"
            />
          </div>
          <button type="button" className="icon-btn" aria-label="Schliessen" title="Schliessen" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 var(--space-4) var(--space-4)' }}>
          {filteredDestinations.length > 0 && (
            <div style={{ marginBottom: filteredWines.length > 0 ? 'var(--space-3)' : 0 }}>
              <div className="card-kicker" style={{ padding: '6px 8px' }}>
                Seiten
              </div>
              {filteredDestinations.map((d) => (
                <button key={d.id} type="button" onClick={() => goTo(d.path)} style={resultRowStyle}>
                  {d.label}
                </button>
              ))}
            </div>
          )}

          {filteredWines.length > 0 && (
            <div>
              <div className="card-kicker" style={{ padding: '6px 8px' }}>
                Weine
              </div>
              {filteredWines.map((w) => (
                <button key={w.id} type="button" onClick={() => goTo(`/wine/${w.id}`)} style={resultRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                    {w.producer && (
                      <div
                        style={{
                          fontSize: 11.5,
                          opacity: 0.6,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {w.producer}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {trimmed !== '' && !hasAnyResults && (
            <div style={{ padding: '20px 8px', textAlign: 'center', opacity: 0.6, fontSize: 13.5 }}>Keine Treffer.</div>
          )}
        </div>
      </div>
    </div>
  );
}

const resultRowStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  border: 'none',
  background: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  padding: '10px 8px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 14,
  color: 'var(--color-text)',
};
