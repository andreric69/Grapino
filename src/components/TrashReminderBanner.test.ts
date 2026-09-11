import { describe, expect, it } from 'vitest';
import { daysRemaining } from './TrashReminderBanner';

describe('daysRemaining', () => {
  it('liefert 30, wenn der Wein gerade eben geloescht wurde', () => {
    const now = new Date('2026-09-11T12:00:00');
    expect(daysRemaining('2026-09-11T12:00:00', now)).toBe(30);
  });

  it('rechnet die verbleibenden Tage ab deleted_at herunter', () => {
    const now = new Date('2026-09-11T12:00:00');
    // Aug 15 -> Sep 11 = 27 vergangene Tage, also 30 - 27 = 3 verbleibend.
    expect(daysRemaining('2026-08-15T12:00:00', now)).toBe(3);
  });

  it('rundet ab statt kaufmaennisch, damit der letzte Tag nicht zu frueh als sicher gilt', () => {
    const now = new Date('2026-09-11T18:00:00');
    // Aug 16 12:00 -> Sep 11 18:00 = 26.25 vergangene Tage, also 3.75 Tage Rest
    // -> muss auf 3 abgerundet werden, nicht auf 4.
    expect(daysRemaining('2026-08-16T12:00:00', now)).toBe(3);
  });

  it('wird nie negativ, auch lange nach Ablauf der 30 Tage', () => {
    const now = new Date('2026-09-11T12:00:00');
    expect(daysRemaining('2026-07-01T12:00:00', now)).toBe(0);
  });

  it('liefert 0, sobald die 30 Tage voll sind (31 Tage seit deleted_at)', () => {
    const now = new Date('2026-09-11T12:00:00');
    expect(daysRemaining('2026-08-11T12:00:00', now)).toBe(0);
  });
});
