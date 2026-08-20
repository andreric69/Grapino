import { supabase } from '../supabaseClient';
import type { FeedbackInput, MyFeedback } from '../types';

export async function submitFeedback(input: FeedbackInput): Promise<void> {
  const { error } = await supabase.from('app_feedback').insert(input);
  if (error) {
    console.error('Feedback-Fehler:', error);
    throw new Error('Feedback konnte nicht gesendet werden. Bitte Internetverbindung pruefen.');
  }
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
