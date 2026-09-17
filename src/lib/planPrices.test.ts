import { describe, expect, it } from 'vitest';
import { formatMonthlyEquivalentHint, formatPlanPrice, formatTaxHint, type PlanPriceInfo } from './planPrices';

const yearlyPrice: PlanPriceInfo = {
  amount: 19,
  currency: 'chf',
  taxBehavior: 'inclusive',
  interval: 'year',
  intervalCount: 1,
};

describe('formatPlanPrice', () => {
  it('zeigt Betrag und Intervall', () => {
    expect(formatPlanPrice(yearlyPrice)).toBe('CHF 19.00 / Jahr');
  });

  it('faellt ohne bekanntes Intervall auf den reinen Betrag zurueck (veraltet gecachte Antwort)', () => {
    expect(formatPlanPrice({ ...yearlyPrice, interval: '' as PlanPriceInfo['interval'] })).toBe('CHF 19.00');
  });
});

describe('formatTaxHint', () => {
  it('ignoriert Stripes taxBehavior-Feld, da automatic_tax nie aktiviert wird (keine echte MWST-Berechnung)', () => {
    expect(formatTaxHint()).toBe('Gesamtpreis, keine MWST');
  });
});

describe('formatMonthlyEquivalentHint', () => {
  it('rechnet den Jahrespreis auf ein ungefaehres Monatsaequivalent um', () => {
    expect(formatMonthlyEquivalentHint(yearlyPrice)).toBe('entspricht ca. CHF 1.58/Monat');
  });

  it('sagt immer "entspricht ca." statt eine monatliche Abrechnung zu suggerieren (UWG)', () => {
    expect(formatMonthlyEquivalentHint(yearlyPrice)).toContain('entspricht ca.');
  });

  it('liefert null bei jedem Intervall ausser "year"', () => {
    expect(formatMonthlyEquivalentHint({ ...yearlyPrice, interval: 'month' })).toBeNull();
    expect(formatMonthlyEquivalentHint({ ...yearlyPrice, interval: 'week' })).toBeNull();
    expect(formatMonthlyEquivalentHint({ ...yearlyPrice, interval: 'day' })).toBeNull();
  });

  it('beruecksichtigt intervalCount > 1 (z. B. alle 2 Jahre)', () => {
    expect(formatMonthlyEquivalentHint({ ...yearlyPrice, amount: 38, intervalCount: 2 })).toBe('entspricht ca. CHF 1.58/Monat');
  });
});
