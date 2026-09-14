import { Component, type ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

// Bleibt fuer die Dauer des Browser-Tabs bestehen (sessionStorage, nicht
// localStorage) - verhindert eine Neulade-Endlosschleife, wenn das Problem
// NICHT an einem veralteten Chunk liegt (z. B. echt offline): nur EIN
// automatischer Versuch pro Tab-Sitzung, danach der manuelle Button.
const RELOAD_FLAG_KEY = 'grapino-chunk-reload-attempted';

// Deckt die unterschiedlichen Fehlertexte ab, die Browser werfen, wenn ein
// per import() nachgeladener Seiten-Chunk (siehe App.tsx) nicht mehr existiert
// - typischerweise, weil die App schon offen war (Hintergrund-Tab,
// installierte PWA) und Andrin zwischenzeitlich neu deployt hat: der alte
// Datei-Hash gibt es auf dem Server dann nicht mehr (404).
const CHUNK_ERROR_PATTERN =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|failed to fetch a lazy component|dynamically imported module/i;

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return CHUNK_ERROR_PATTERN.test(message);
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

/**
 * Faengt Render-Fehler der gesamten App ab - vor allem gedacht fuer
 * fehlgeschlagene lazy-Chunk-Ladevorgaenge (siehe CHUNK_ERROR_PATTERN oben).
 * Ohne diesen Error Boundary wuerde React bei so einem Fehler die komplette
 * App unmounten: ein leerer, weisser Bildschirm ohne jede Erklaerung oder
 * Selbsthilfe-Moeglichkeit ("die App laedt einfach nicht mehr").
 *
 * Bei einem erkannten Chunk-Fehler wird EINMALIG automatisch neu geladen -
 * danach liefert der Server die aktuelle Version aus, das Problem ist damit
 * in aller Regel sofort behoben, ohne dass der Nutzer etwas tun muss. Bleibt
 * der Fehler bestehen (oder ist es gar kein Chunk-Fehler, sondern ein echter
 * Programmfehler), erscheint statt einer Neulade-Schleife ein manueller
 * "Neu laden"-Button.
 */
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, isChunkError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch() {
    if (this.state.isChunkError && !sessionStorage.getItem(RELOAD_FLAG_KEY)) {
      sessionStorage.setItem(RELOAD_FLAG_KEY, '1');
      window.location.reload();
    }
  }

  componentDidMount() {
    // War der letzte automatische Reload-Versuch erfolgreich (die App laeuft
    // jetzt seit ein paar Sekunden fehlerfrei), gilt die Sitzung wieder als
    // "gesund" - ein spaeterer, unabhaengiger Chunk-Fehler (z. B. nach dem
    // naechsten Deploy Stunden spaeter) soll erneut automatisch behoben
    // werden koennen statt fuer den Rest des Tabs stumm zu bleiben.
    window.setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG_KEY), 5000);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.state.isChunkError && sessionStorage.getItem(RELOAD_FLAG_KEY) === '1') {
      return (
        <div className="full-screen" style={{ display: 'grid', placeItems: 'center' }}>
          <LoadingSpinner label="Neue Version wird geladen ..." />
        </div>
      );
    }

    return (
      <div className="full-screen" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
        <div className="card elev-lg" style={{ maxWidth: 380, textAlign: 'center', gap: 16, padding: 30 }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 21, margin: 0 }}>Etwas ist schiefgelaufen</h1>
          <div style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.85 }}>
            Die Seite konnte nicht geladen werden. Ein Neuladen hilft meistens.
          </div>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Neu laden
          </button>
        </div>
      </div>
    );
  }
}
