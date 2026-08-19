import { beforeEach, describe, expect, it } from 'vitest';
import { getLastBackupDate, isBackupOverdue, recordBackupNow } from './backupReminder';

describe('backupReminder', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('gilt als ueberfaellig, wenn noch nie gesichert wurde', () => {
    expect(getLastBackupDate()).toBeNull();
    expect(isBackupOverdue()).toBe(true);
  });

  it('gilt nicht als ueberfaellig direkt nach einer Sicherung', () => {
    recordBackupNow();
    expect(isBackupOverdue()).toBe(false);
    expect(getLastBackupDate()).not.toBeNull();
  });

  it('gilt als ueberfaellig, wenn die letzte Sicherung mehr als 4 Wochen her ist', () => {
    const fiveWeeksAgo = new Date(Date.now() - 5 * 7 * 24 * 60 * 60 * 1000);
    localStorage.setItem('weinsammlung-last-backup', fiveWeeksAgo.toISOString());
    expect(isBackupOverdue()).toBe(true);
  });

  it('gilt nicht als ueberfaellig, wenn die letzte Sicherung 3 Wochen her ist', () => {
    const threeWeeksAgo = new Date(Date.now() - 3 * 7 * 24 * 60 * 60 * 1000);
    localStorage.setItem('weinsammlung-last-backup', threeWeeksAgo.toISOString());
    expect(isBackupOverdue()).toBe(false);
  });
});
