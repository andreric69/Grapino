import { supabase } from '../supabaseClient';
import type { FeedbackInput } from '../types';

export async function submitFeedback(input: FeedbackInput): Promise<void> {
  const { error } = await supabase.from('app_feedback').insert(input);
  if (error) {
    console.error('Feedback-Fehler:', error);
    throw new Error('Feedback konnte nicht gesendet werden. Bitte Internetverbindung pruefen.');
  }
}
