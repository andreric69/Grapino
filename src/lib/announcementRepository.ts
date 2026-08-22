import { supabase } from '../supabaseClient';
import type { Announcement } from '../types';

interface Dismissal {
  announcement_id: string;
  dismissed_at: string;
}

function isDue(announcement: Announcement, dismissedAt: string | undefined): boolean {
  if (!dismissedAt) return true;
  if (!announcement.repeat_every_days) return false;
  const dueAt = new Date(dismissedAt).getTime() + announcement.repeat_every_days * 24 * 60 * 60 * 1000;
  return Date.now() >= dueAt;
}

/**
 * Liefert ALLE aktuell faelligen Ankuendigungen (neueste zuerst) - also
 * jede, die noch nie weggeklickt wurde, oder deren Wiederholungsintervall
 * abgelaufen ist. Vorher wurde nur die einzelne neueste geliefert - bei
 * mehreren gleichzeitig faelligen Ankuendigungen sah der Nutzer dadurch nie
 * die aelteren. RLS filtert bereits auf aktive und (an alle oder gezielt an
 * mich gerichtete) Ankuendigungen.
 */
export async function getDueAnnouncements(): Promise<Announcement[]> {
  const [{ data: announcements, error: announcementsError }, { data: dismissals, error: dismissalsError }] =
    await Promise.all([
      supabase
        .from('announcements')
        .select('id, created_at, title, body, type, repeat_every_days')
        .order('created_at', { ascending: false }),
      supabase.from('announcement_dismissals').select('announcement_id, dismissed_at'),
    ]);
  if (announcementsError || dismissalsError) {
    console.error('Ankuendigungen-Fehler:', announcementsError ?? dismissalsError);
    return [];
  }

  const dismissedAtById = new Map((dismissals as Dismissal[]).map((d) => [d.announcement_id, d.dismissed_at]));
  return (announcements as Announcement[]).filter((a) => isDue(a, dismissedAtById.get(a.id)));
}

/** Merkt sich, dass der Nutzer diese Ankuendigung jetzt gesehen/weggeklickt hat. */
export async function dismissAnnouncement(announcementId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('announcement_dismissals')
    .upsert(
      { announcement_id: announcementId, user_id: user.id, dismissed_at: new Date().toISOString() },
      { onConflict: 'announcement_id,user_id' },
    );
  if (error) console.error('Ankuendigung-Bestaetigen-Fehler:', error);
}
