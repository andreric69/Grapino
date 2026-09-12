import { LoadingSpinner } from './LoadingSpinner';

/**
 * Fallback fuer <Suspense> waehrend eine lazy geladene Seite (siehe App.tsx)
 * nachgeladen wird - erscheint nur kurz, wenn der jeweilige Seiten-Chunk noch
 * nicht im Browser-Cache liegt, sonst gar nicht (React zeigt den Fallback
 * erst, wenn das lazy-Modul tatsaechlich noch aussteht).
 */
export function RouteLoadingFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoadingSpinner />
    </div>
  );
}
