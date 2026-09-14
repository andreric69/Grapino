import { supabase } from '../supabaseClient';
import type { Plan } from './planLimits';

async function authToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Nicht angemeldet.');
  return token;
}

/** Startet den Stripe-Checkout fuer eine Abo-Stufe (siehe api/create-checkout-session.ts) und leitet dorthin weiter. */
export async function startCheckout(plan: Plan): Promise<void> {
  const token = await authToken();
  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ plan }),
  });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? 'Checkout konnte nicht gestartet werden.');
  window.location.href = data.url;
}

/** Oeffnet das Stripe-Kundenportal (Abo wechseln/kuendigen/Zahlungsmethode aendern), siehe api/create-portal-session.ts. */
export async function openBillingPortal(): Promise<void> {
  const token = await authToken();
  const res = await fetch('/api/create-portal-session', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? 'Kundenportal konnte nicht geoeffnet werden.');
  window.location.href = data.url;
}

/**
 * Bezahlt alle offenen Zahlungsanfragen (Aktualisierungs-Auftraege) auf
 * einmal per Stripe, siehe api/create-payment-checkout-session.ts. TWINT
 * bleibt daneben als Alternative bestehen (siehe PaymentDueScreen.tsx).
 */
export async function startPaymentRequestCheckout(): Promise<void> {
  const token = await authToken();
  const res = await fetch('/api/create-payment-checkout-session', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? 'Zahlung konnte nicht gestartet werden.');
  window.location.href = data.url;
}
