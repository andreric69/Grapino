import { useEffect, useState } from 'react';
import { getPricingConfig } from '../lib/pricingConfig';
import { daysUntil } from '../lib/trialDays';

// Kein Zahlungsanbieter (Stripe o. ae.) - bewusst einfach gehalten wie der
// Rest der Zahlungsabwicklung in der App: TWINT/Ueberweisung von Hand an
// Andrin, der die Zahlung danach in der Admin-App als "bezahlt" vermerkt.
const TWINT_NUMBER = '077 456 31 23';

/**
 * Vollflaechiger Hinweis zur Testphase direkt nach dem Login - im Unterschied
 * zu BlockScreen/PaymentDueScreen (rein informativ, kein harter Zugangsstop:
 * es gibt aktuell keine automatisierte Zahlungsabwicklung, die einen
 * Ablauf-Block rechtfertigen wuerde - das Sperren bleibt bewusst bei
 * "is_blocked", das Andrin weiterhin von Hand setzt). Zeigt zwei Varianten:
 * Testphase noch aktiv (Restzeit) oder bereits abgelaufen (Kontaktaufruf).
 */
export function TrialStatusScreen({ trialEndsAt, onDismiss }: { trialEndsAt: string; onDismiss: () => void }) {
  const daysLeft = daysUntil(trialEndsAt, new Date());
  const isExpired = daysLeft < 0;
  const formattedDate = new Date(`${trialEndsAt}T23:59:59`).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const [accessFee, setAccessFee] = useState<number | null>(null);

  useEffect(() => {
    if (!isExpired) return;
    let cancelled = false;
    getPricingConfig().then((pricing) => {
      if (!cancelled) setAccessFee(pricing.accessFee);
    });
    return () => {
      cancelled = true;
    };
  }, [isExpired]);

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24 }}>
      <div className="card elev-lg" style={{ maxWidth: 400, textAlign: 'center', gap: 14, padding: 28 }}>
        <div style={{ fontSize: 32 }}>{isExpired ? '⏳' : '🎉'}</div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, margin: 0 }}>
          {isExpired ? 'Testphase abgelaufen' : 'Willkommen bei Grapino'}
        </h1>
        {!isExpired && (
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-bordeaux)' }}>
            {daysLeft === 0 ? 'Letzter Tag' : `Noch ${daysLeft} Tag${daysLeft === 1 ? '' : 'e'}`}
          </div>
        )}
        <div style={{ fontSize: 14, lineHeight: 1.5 }}>
          {isExpired ? (
            <>Deine kostenlose Testphase ist am {formattedDate} abgelaufen.</>
          ) : (
            <>Du hast eine kostenlose Testphase bis zum {formattedDate}.</>
          )}
        </div>
        {isExpired ? (
          <>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
              Um weiterzumachen, bitte die Zugangsgebühr
              {accessFee !== null && (
                <>
                  {' '}
                  (<strong>{accessFee.toFixed(2)} CHF</strong>)
                </>
              )}{' '}
              per TWINT an <strong>{TWINT_NUMBER}</strong> (Andrin) überweisen.
            </div>
            <div style={{ fontSize: 12.5, opacity: 0.65 }}>
              Fragen? Über die Chat-Blase unten links oder direkt bei Andrin melden.
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12.5, opacity: 0.65 }}>Bei Fragen jederzeit über die Chat-Blase unten links melden.</div>
        )}
        <button type="button" className="btn btn-primary" onClick={onDismiss} style={{ marginTop: 4 }}>
          Verstanden, weiter zur App
        </button>
      </div>
    </div>
  );
}
