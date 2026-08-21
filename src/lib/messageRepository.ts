import { supabase } from '../supabaseClient';
import type { UserMessage } from '../types';

export async function sendMessage(category: 'allgemein' | 'vorschlag', message: string): Promise<void> {
  const { error } = await supabase.from('user_messages').insert({ category, message });
  if (error) {
    console.error('Nachricht-Fehler:', error);
    throw new Error('Nachricht konnte nicht gesendet werden. Bitte Internetverbindung pruefen.');
  }
}

export async function listMyMessages(): Promise<UserMessage[]> {
  const { data, error } = await supabase
    .from('user_messages')
    .select('id, created_at, category, message')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Nachricht-Fehler:', error);
    return [];
  }
  return data as UserMessage[];
}
