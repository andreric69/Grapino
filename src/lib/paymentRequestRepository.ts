import { supabase } from '../supabaseClient';
import type { PaymentRequest } from '../types';

export async function listMyPaymentRequests(): Promise<PaymentRequest[]> {
  const { data, error } = await supabase
    .from('payment_requests')
    .select('id, created_at, amount, reason, status, paid_at')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Zahlungsanfrage-Fehler:', error);
    return [];
  }
  return data as PaymentRequest[];
}
