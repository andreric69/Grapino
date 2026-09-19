import { describe, expect, it } from 'vitest';
import { canUseAdvancedAiFeatures, canUseAiScan, canUseProFeatures, getMaxWines, PLAN_LABELS } from './planLimits';

describe('getMaxWines', () => {
  it('begrenzt Basis auf 100 Weine', () => {
    expect(getMaxWines('basis')).toBe(100);
  });

  it('begrenzt Pro auf 400 Weine', () => {
    expect(getMaxWines('pro')).toBe(400);
  });

  it('laesst Ultra unbegrenzt (null)', () => {
    expect(getMaxWines('ultra')).toBeNull();
  });
});

describe('canUseAiScan', () => {
  it('sperrt den KI-Scan fuer Basis', () => {
    expect(canUseAiScan('basis')).toBe(false);
  });

  it('erlaubt den KI-Scan fuer Pro und Ultra', () => {
    expect(canUseAiScan('pro')).toBe(true);
    expect(canUseAiScan('ultra')).toBe(true);
  });
});

describe('canUseProFeatures', () => {
  it('sperrt die Pro-Funktionen fuer Basis', () => {
    expect(canUseProFeatures('basis')).toBe(false);
  });

  it('erlaubt die Pro-Funktionen fuer Pro und Ultra', () => {
    expect(canUseProFeatures('pro')).toBe(true);
    expect(canUseProFeatures('ultra')).toBe(true);
  });
});

describe('canUseAdvancedAiFeatures', () => {
  it('sperrt die schlaueren KI-Faehigkeiten (Runde 3) fuer Basis und Pro', () => {
    expect(canUseAdvancedAiFeatures('basis')).toBe(false);
    expect(canUseAdvancedAiFeatures('pro')).toBe(false);
  });

  it('erlaubt sie nur fuer Ultra', () => {
    expect(canUseAdvancedAiFeatures('ultra')).toBe(true);
  });
});

describe('PLAN_LABELS', () => {
  it('enthaelt lesbare deutsche Bezeichnungen fuer alle drei Stufen', () => {
    expect(PLAN_LABELS).toEqual({ basis: 'Light', pro: 'Pro', ultra: 'Ultra' });
  });
});
