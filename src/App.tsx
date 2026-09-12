import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RouteLoadingFallback } from './components/RouteLoadingFallback';

// Code-Splitting: die Login-Seite bleibt eager (das ist der allererste
// Bildschirm, den jede Nutzerin sieht), alle anderen Seiten werden erst
// geladen, wenn tatsaechlich zu ihnen navigiert wird - das haelt den
// initialen Haupt-Chunk klein. Gleiches Muster wie bereits beim
// BarcodeScanner in WineFormPage.tsx.
const CollectionPage = lazy(() => import('./pages/CollectionPage').then((m) => ({ default: m.CollectionPage })));
const WineDetailPage = lazy(() => import('./pages/WineDetailPage').then((m) => ({ default: m.WineDetailPage })));
const WineFormPage = lazy(() => import('./pages/WineFormPage').then((m) => ({ default: m.WineFormPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const WineLexiconPage = lazy(() => import('./pages/WineLexiconPage').then((m) => ({ default: m.WineLexiconPage })));
const StatsPage = lazy(() => import('./pages/StatsPage').then((m) => ({ default: m.StatsPage })));
const RueckblickPage = lazy(() => import('./pages/RueckblickPage').then((m) => ({ default: m.RueckblickPage })));
const PrintPage = lazy(() => import('./pages/PrintPage').then((m) => ({ default: m.PrintPage })));
const ImpressumPage = lazy(() => import('./pages/ImpressumPage').then((m) => ({ default: m.ImpressumPage })));
const CellarMapPage = lazy(() => import('./pages/CellarMapPage').then((m) => ({ default: m.CellarMapPage })));
const YearRecapPage = lazy(() => import('./pages/YearRecapPage').then((m) => ({ default: m.YearRecapPage })));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage').then((m) => ({ default: m.DiscoverPage })));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Bewusst OHNE ProtectedRoute erreichbar - ein Interessent soll das
              Impressum/die Kosten-Info schon vor der Registrierung lesen
              koennen, nicht erst nach dem Einloggen. ImpressumPage faengt
              fehlende Login-Daten bereits ueberall ab (Fallback-Werte). */}
          <Route path="/impressum" element={<ImpressumPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <CollectionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wine/new"
            element={
              <ProtectedRoute>
                <WineFormPage mode="create" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wine/:id"
            element={
              <ProtectedRoute>
                <WineDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wine/:id/edit"
            element={
              <ProtectedRoute>
                <WineFormPage mode="edit" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lexikon"
            element={
              <ProtectedRoute>
                <WineLexiconPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/statistik"
            element={
              <ProtectedRoute>
                <StatsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rueckblick"
            element={
              <ProtectedRoute>
                <RueckblickPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/drucken"
            element={
              <ProtectedRoute>
                <PrintPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lagerplan"
            element={
              <ProtectedRoute>
                <CellarMapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/weinjahr"
            element={
              <ProtectedRoute>
                <YearRecapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/entdecken"
            element={
              <ProtectedRoute>
                <DiscoverPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
