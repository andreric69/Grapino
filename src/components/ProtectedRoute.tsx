import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from './LoadingSpinner';
import { BlockScreen } from './BlockScreen';
import { PaymentDueScreen } from './PaymentDueScreen';
import { getAccessStatus, type AccessStatus } from '../lib/accessControl';
import { listMyPaymentRequests } from '../lib/paymentRequestRepository';
import type { PaymentRequest } from '../types';

// Nur fuer diese Sitzung gemerkt (nicht dauerhaft) - taucht bei einem neuen
// Login oder einer neuen offenen Zahlungsanfrage automatisch wieder auf.
const PAYMENT_DUE_DISMISS_KEY = 'grapino-payment-due-dismissed-ids';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  // undefined = wird noch geprueft, null = geprueft und nicht blockiert.
  const [access, setAccess] = useState<AccessStatus | null | undefined>(undefined);
  const [openPayments, setOpenPayments] = useState<PaymentRequest[] | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string>(
    () => sessionStorage.getItem(PAYMENT_DUE_DISMISS_KEY) ?? '',
  );

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

  useEffect(() => {
    if (!session || access === undefined || access) return; // erst nach bestandener Blockade-Prüfung
    let cancelled = false;
    listMyPaymentRequests().then((list) => {
      if (!cancelled) setOpenPayments(list.filter((p) => p.status === 'open'));
    });
    return () => {
      cancelled = true;
    };
  }, [session, access]);

  function handleDismissPayments() {
    const key = openKey;
    sessionStorage.setItem(PAYMENT_DUE_DISMISS_KEY, key);
    setDismissedKey(key);
  }

  const openKey = (openPayments ?? []).map((p) => p.id).sort().join(',');
  const showPaymentDue = !!openPayments && openPayments.length > 0 && openKey !== dismissedKey;

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <LoadingSpinner label="Anmeldung wird geprüft ..." />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (access === undefined) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <LoadingSpinner label="Zugang wird geprüft ..." />
      </div>
    );
  }

  if (access) {
    return <BlockScreen status={access} />;
  }

  if (showPaymentDue && openPayments) {
    return <PaymentDueScreen requests={openPayments} onDismiss={handleDismissPayments} />;
  }

  return <>{children}</>;
}
