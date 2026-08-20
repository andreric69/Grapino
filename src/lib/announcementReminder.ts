const LAST_SEEN_KEY = 'weinsammlung-last-seen-announcement';

export function getLastSeenAnnouncementId(): string | null {
  return localStorage.getItem(LAST_SEEN_KEY);
}

export function markAnnouncementSeen(id: string) {
  localStorage.setItem(LAST_SEEN_KEY, id);
}
