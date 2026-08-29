import { describe, expect, it } from 'vitest';
import { daysUntil } from './trialDays';

describe('daysUntil', () => {
  it('liefert eine positive Zahl, wenn das Enddatum noch bevorsteht', () => {
    expect(daysUntil('2026-09-05', new Date('2026-08-29T10:00:00'))).toBe(7);
  });

  it('liefert 0 am letzten Tag der Testphase, unabhaengig von der Uhrzeit', () => {
    expect(daysUntil('2026-08-29', new Date('2026-08-29T00:00:01'))).toBe(0);
    expect(daysUntil('2026-08-29', new Date('2026-08-29T23:59:00'))).toBe(0);
  });

  it('liefert eine negative Zahl, wenn die Testphase bereits abgelaufen ist', () => {
    expect(daysUntil('2026-08-20', new Date('2026-08-29T10:00:00'))).toBe(-9);
  });
});
