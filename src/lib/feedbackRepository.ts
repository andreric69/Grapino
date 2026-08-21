import { supabase } from '../supabaseClient';
import type { FeedbackInput, MyFeedback } from '../types';

export async function submitFeedback(input: FeedbackInput): Promise<void> {
  const { error } = await supabase.from('app_feedback').insert(input);
  if (error) {
    console.error('Feedback-Fehler:', error);
    throw new Error('Feedback konnte nicht gesendet werden. Bitte Internetverbindung pruefen.');
  }
}

/**
 * Wurde jemals Feedback gesendet? Serverseitig geprueft (nicht nur lokal im
 * Browser) - sonst fragt die App auf einem neuen Geraet oder nach Loeschen
 * der Browserdaten faelschlich erneut, obwohl schon laengst Feedback vorliegt.
 */
export async function hasSubmittedFeedbackEver(): Promise<boolean> {
  const { data, error } = await supabase.from('app_feedback').select('id').limit(1);
  if (error) {
    console.error('Feedback-Fehler:', error);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** Offene, vom Betreiber aktiv angefragte Feedback-Anfrage (falls vorhanden). */
export async function getUnfulfilledFeedbackRequest(): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('feedback_requests')
    .select('id')
    .is('fulfilled_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('Feedback-Anfrage-Fehler:', error);
    return null;
  }
  return data;
}

export async function markFeedbackRequestFulfilled(id: string): Promise<void> {
  const { error } = await supabase
    .from('feedback_requests')
    .update({ fulfilled_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('Feedback-Anfrage-Fehler:', error);
}

/** Eigene bisher gesendete Rueckmeldungen inkl. einer moeglichen Antwort des Betreibers. */
export async function listMyFeedback(): Promise<MyFeedback[]> {
  const { data, error } = await supabase
    .from('app_feedback')
    .select('id, created_at, rating, message, tip_amount, feedback_replies(reply, created_at)')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Feedback-Fehler:', error);
    return [];
  }
  return (data as unknown as Array<{
    id: string;
    created_at: string;
    rating: number;
    message: string | null;
    tip_amount: number | null;
    feedback_replies: { reply: string; created_at: string } | { reply: string; created_at: string }[] | null;
  }>).map((row) => {
    const replyRow = Array.isArray(row.feedback_replies) ? row.feedback_replies[0] : row.feedback_replies;
    return {
      id: row.id,
      created_at: row.created_at,
      rating: row.rating,
      message: row.message,
      tip_amount: row.tip_amount,
      reply: replyRow?.reply ?? null,
      reply_created_at: replyRow?.created_at ?? null,
    };
  });
}
