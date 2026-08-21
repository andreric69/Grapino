import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from './LoadingSpinner';
import { BlockScreen } from './BlockScreen';
import { getAccessStatus, type AccessStatus } from '../lib/accessControl';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  // undefined = wird noch geprueft, null = geprueft und nicht blockiert.
  const [access, setAccess] = useState<AccessStatus | null | undefined>(undefined);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getAccessStatus().then((status) => {
      if (!cancelled) setAccess(status.isBlocked ? status : null);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <LoadingSpinner label="Anmeldung wird geprueft ..." />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (access === undefined) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <LoadingSpinner label="Zugang wird geprueft ..." />
      </div>
    );
  }

  if (access) {
    return <BlockScreen status={access} />;
  }

  return <>{children}</>;
}
