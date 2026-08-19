const LAST_BACKUP_KEY = 'weinsammlung-last-backup';
const REMINDER_INTERVAL_MS = 28 * 24 * 60 * 60 * 1000; // 4 Wochen

/** Wird aufgerufen, sobald eine Sicherung heruntergeladen wurde. */
export function recordBackupNow() {
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
}

export function getLastBackupDate(): Date | null {
  const raw = localStorage.getItem(LAST_BACKUP_KEY);
  return raw ? new Date(raw) : null;
}

/** Laenger als 4 Wochen her (oder noch nie gesichert)? */
export function isBackupOverdue(): boolean {
  const last = getLastBackupDate();
  if (!last) return true;
  return Date.now() - last.getTime() > REMINDER_INTERVAL_MS;
}
