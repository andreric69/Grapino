import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from './LoadingSpinner';
import { BlockScreen } from './BlockScreen';
import { ChoosePlanScreen } from './ChoosePlanScreen';
import { PaymentDueScreen } from './PaymentDueScreen';
import { TrialStatusScreen } from './TrialStatusScreen';
import { AnnouncementTakeover } from './AnnouncementTakeover';
import { getAccessStatus, type AccessStatus } from '../lib/accessControl';
import { listMyPaymentRequests } from '../lib/paymentRequestRepository';
import { getDueTakeoverAnnouncement, dismissAnnouncement } from '../lib/announcementRepository';
import { daysUntil } from '../lib/trialDays';
import type { Announcement, PaymentRequest } from '../types';

// Nur fuer diese Sitzung gemerkt (nicht dauerhaft) - taucht bei einem neuen
// Login oder einer neuen offenen Zahlungsanfrage automatisch wieder auf.
const PAYMENT_DUE_DISMISS_KEY = 'grapino-payment-due-dismissed-ids';
// Gemerkt pro genauem Testphase-Enddatum (nicht nur "schon mal gesehen") -
// aendert Andrin das Datum in der Admin-App (z. B. eine neue Testphase
// gestartet), taucht der Hinweis automatisch wieder auf, statt dauerhaft
// unterdrueckt zu bleiben.
const TRIAL_DISMISS_KEY = 'grapino-trial-dismissed-date';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, needsPasswordReset } = useAuth();
  const location = useLocation();
  // undefined = wird noch geprueft, null = geprueft und nicht blockiert.
  const [access, setAccess] = useState<AccessStatus | null | undefined>(undefined);
  // Testphase-Datum getrennt gemerkt (nicht nur wenn blockiert, im
  // Unterschied zu "access" oben) - der Hinweis soll ja gerade bei NICHT
  // blockierten Nutzern erscheinen.
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [openPayments, setOpenPayments] = useState<PaymentRequest[] | null>(null);
  // undefined = wird noch geprueft, null = geprueft und keine faellig.
  const [takeoverAnnouncement, setTakeoverAnnouncement] = useState<Announcement | null | undefined>(undefined);
  // Sobald irgendeine Zahlung je bezahlt wurde, ist der Nutzer erkennbar kein
  // reiner Testphase-Interessent mehr - der Testphase-Hinweis soll dann nicht
  // mehr weiter erscheinen, auch wenn Andrin das Testabo-Datum nicht extra
  // von Hand entfernt.
  const [hasPaidBefore, setHasPaidBefore] = useState(false);
  const [dismissedKey, setDismissedKey] = useState<string>(
    () => sessionStorage.getItem(PAYMENT_DUE_DISMISS_KEY) ?? '',
  );
  const [dismissedTrialDate, setDismissedTrialDate] = useState<string>(
    () => sessionStorage.getItem(TRIAL_DISMISS_KEY) ?? '',
  );

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getAccessStatus().then((status) => {
      if (cancelled) return;
      setAccess(status.isBlocked || status.needsPlan ? status : null);
      setTrialEndsAt(status.trialEndsAt);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!session || access === undefined || access) return; // erst nach bestandener Blockade-Prüfung
    let cancelled = false;
    listMyPaymentRequests().then((list) => {
      if (cancelled) return;
      setOpenPayments(list.filter((p) => p.status === 'open'));
      setHasPaidBefore(list.some((p) => p.status === 'paid'));
    });
    return () => {
      cancelled = true;
    };
  }, [session, access]);

  useEffect(() => {
    if (!session || access === undefined || access) return; // erst nach bestandener Blockade-Pruefung
    let cancelled = false;
    getDueTakeoverAnnouncement().then((a) => {
      if (cancelled) return;
      setTakeoverAnnouncement(a);
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

  function handleDismissTakeover() {
    if (!takeoverAnnouncement) return;
    dismissAnnouncement(takeoverAnnouncement.id);
    setTakeoverAnnouncement(null);
  }

  function handleDismissTrial() {
    if (!trialEndsAt) return;
    sessionStorage.setItem(TRIAL_DISMISS_KEY, trialEndsAt);
    setDismissedTrialDate(trialEndsAt);
  }

  const openKey = (openPayments ?? []).map((p) => p.id).sort().join(',');
  const showPaymentDue = !!openPayments && openPayments.length > 0 && openKey !== dismissedKey;
  // Wartet auf die Zahlungs-Abfrage (openPayments !== null), bevor der
  // Testphase-Hinweis ueberhaupt in Erwaegung gezogen wird - sonst wuerde er
  // bei einem bereits zahlenden Nutzer kurz aufblitzen, bevor "hasPaidBefore"
  // eintrifft und ihn wieder verschwinden laesst.
  // Nur waehrend einer NOCH LAUFENDEN Testphase relevant - ist sie bereits
  // abgelaufen, hat getAccessStatus() entweder schon vorher ueber
  // "needsPlan" ein Abo eingefordert (ChoosePlanScreen), oder der Nutzer hat
  // laengst ein aktives Stripe-Abo (dann ist ein "Testphase abgelaufen"-
  // Hinweis nur verwirrend, siehe TrialStatusScreen.tsx).
  const showTrialStatus =
    openPayments !== null &&
    takeoverAnnouncement !== undefined &&
    !takeoverAnnouncement &&
    !!trialEndsAt &&
    daysUntil(trialEndsAt, new Date()) >= 0 &&
    trialEndsAt !== dismissedTrialDate &&
    !hasPaidBefore;

  if (loading) {
    return (
      <div className="full-screen" style={{ display: 'grid', placeItems: 'center' }}>
        <LoadingSpinner label="Anmeldung wird geprüft ..." />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Nach einem "Passwort vergessen"-Link direkt zu den Einstellungen leiten,
  // bis ein neues Passwort gesetzt wurde - unabhaengig von Blockade/
  // Zahlungs-/Testphase-Status (das Passwort setzen soll immer moeglich
  // sein). Ausnahme: auf /settings selbst nicht umleiten, sonst Endlosschleife.
  if (needsPasswordReset && location.pathname !== '/settings') {
    return <Navigate to="/settings" replace />;
  }

  if (access === undefined) {
    return (
      <div className="full-screen" style={{ display: 'grid', placeItems: 'center' }}>
        <LoadingSpinner label="Zugang wird geprüft ..." />
      </div>
    );
  }

  if (access?.isBlocked) {
    return <BlockScreen status={access} />;
  }

  if (access?.needsPlan) {
    return <ChoosePlanScreen />;
  }

  if (showPaymentDue && openPayments) {
    return <PaymentDueScreen requests={openPayments} onDismiss={handleDismissPayments} />;
  }

  if (takeoverAnnouncement) {
    return <AnnouncementTakeover announcement={takeoverAnnouncement} onDismiss={handleDismissTakeover} />;
  }

  if (showTrialStatus && trialEndsAt) {
    return <TrialStatusScreen trialEndsAt={trialEndsAt} onDismiss={handleDismissTrial} />;
  }

  return <>{children}</>;
}
