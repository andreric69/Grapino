import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { CollectionPage } from './pages/CollectionPage';
import { WineDetailPage } from './pages/WineDetailPage';
import { WineFormPage } from './pages/WineFormPage';
import { SettingsPage } from './pages/SettingsPage';
import { WineLexiconPage } from './pages/WineLexiconPage';
import { StatsPage } from './pages/StatsPage';
import { RueckblickPage } from './pages/RueckblickPage';
import { PrintPage } from './pages/PrintPage';
import { ImpressumPage } from './pages/ImpressumPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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
            path="/impressum"
            element={
              <ProtectedRoute>
                <ImpressumPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
