import { supabase } from '../supabaseClient';
import type { Announcement } from '../types';

/** Liefert alle aktiven Ankuendigungen, neueste zuerst. */
export async function listActiveAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, created_at, title, body')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Ankuendigungen-Fehler:', error);
    return [];
  }
  return data as Announcement[];
}
