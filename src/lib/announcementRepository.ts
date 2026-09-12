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

// Postgres-Fehlermeldung, wenn die Spalte "is_takeover" noch nicht per
// Migration (supabase/announcements-takeover-2026-09-11.sql) angelegt wurde -
// gleiches Muster wie fuer "deleted_at" in grapino-admin/api/backup.ts.
const IS_TAKEOVER_COLUMN_MISSING = /column .*is_takeover.* does not exist/i;

/**
 * Laedt alle Ankuendigungen + Dismissals gemeinsam - Basis fuer
 * getDueAnnouncements() und getDueTakeoverAnnouncement(). Faengt das Fehlen
 * der Spalte "is_takeover" ab (siehe IS_TAKEOVER_COLUMN_MISSING oben): dann
 * wird ohne diese Spalte erneut geladen und jede Ankuendigung gilt bis zur
 * manuellen Migration als Nicht-Takeover - so bleibt die bestehende
 * Banner-Anzeige unveraendert funktionsfaehig, statt durch die neue Spalte
 * in der Query fuer alle Nutzer kaputtzugehen.
 */
async function fetchAnnouncementsWithDismissals(): Promise<{ announcements: Announcement[]; dismissals: Dismissal[] } | null> {
  const [announcementsRes, dismissalsRes] = await Promise.all([
    supabase
      .from('announcements')
      .select('id, created_at, title, body, type, repeat_every_days, is_takeover')
      .order('created_at', { ascending: false }),
    supabase.from('announcement_dismissals').select('announcement_id, dismissed_at'),
  ]);

  let announcements = announcementsRes.data as Announcement[] | null;
  let announcementsError = announcementsRes.error;
  if (announcementsError && IS_TAKEOVER_COLUMN_MISSING.test(announcementsError.message)) {
    const fallback = await supabase
      .from('announcements')
      .select('id, created_at, title, body, type, repeat_every_days')
      .order('created_at', { ascending: false });
    announcements = (fallback.data ?? []).map((a) => ({ ...a, is_takeover: false }) as Announcement);
    announcementsError = fallback.error;
  }

  if (announcementsError || dismissalsRes.error) {
    console.error('Ankuendigungen-Fehler:', announcementsError ?? dismissalsRes.error);
    return null;
  }

  return { announcements: announcements ?? [], dismissals: (dismissalsRes.data ?? []) as Dismissal[] };
}

/**
 * Liefert ALLE aktuell faelligen NICHT-Takeover-Ankuendigungen (neueste
 * zuerst) - also jede, die noch nie weggeklickt wurde, oder deren
 * Wiederholungsintervall abgelaufen ist. Vorher wurde nur die einzelne
 * neueste geliefert - bei mehreren gleichzeitig faelligen Ankuendigungen sah
 * der Nutzer dadurch nie die aelteren. RLS filtert bereits auf aktive und
 * (an alle oder gezielt an mich gerichtete) Ankuendigungen.
 *
 * Takeover-Ankuendigungen sind ausgeschlossen - die laufen ueber
 * getDueTakeoverAnnouncement() und das AnnouncementTakeover-Overlay, damit
 * sie nicht zusaetzlich als kleine Banner-Karte doppelt erscheinen.
 */
export async function getDueAnnouncements(): Promise<Announcement[]> {
  const result = await fetchAnnouncementsWithDismissals();
  if (!result) return [];

  const dismissedAtById = new Map(result.dismissals.map((d) => [d.announcement_id, d.dismissed_at]));
  return result.announcements.filter((a) => !a.is_takeover).filter((a) => isDue(a, dismissedAtById.get(a.id)));
}

/**
 * Liefert die AELTESTE aktuell faellige Vollbild-Ankuendigung (oder null,
 * falls keine faellig ist) - Singular bewusst, damit pro Sitzung immer nur
 * EIN Takeover-Overlay erscheint statt mehrerer hintereinander. Nutzt
 * dieselbe Faellig-Logik (Wiederholung/Dismissal) wie getDueAnnouncements().
 *
 * Solange die Spalte "is_takeover" noch nicht migriert ist, liefert
 * fetchAnnouncementsWithDismissals() jede Ankuendigung als Nicht-Takeover -
 * hier kommt dann also immer null zurueck, ganz ohne Fehler oder Log-Eintrag.
 */
export async function getDueTakeoverAnnouncement(): Promise<Announcement | null> {
  const result = await fetchAnnouncementsWithDismissals();
  if (!result) return null;

  const dismissedAtById = new Map(result.dismissals.map((d) => [d.announcement_id, d.dismissed_at]));
  const due = result.announcements
    .filter((a) => a.is_takeover)
    .filter((a) => isDue(a, dismissedAtById.get(a.id)))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return due[0] ?? null;
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
