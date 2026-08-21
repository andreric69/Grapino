import { describe, expect, it } from 'vitest';
import { levenshteinDistance, findClosestFuzzyMatch } from './fuzzyMatch';

describe('levenshteinDistance', () => {
  it('ist 0 fuer identische Strings', () => {
    expect(levenshteinDistance('margaux', 'margaux')).toBe(0);
  });

  it('zaehlt einfache Vertipper korrekt', () => {
    expect(levenshteinDistance('chateu margaus', 'chateau margaux')).toBe(2);
  });

  it('bricht fruehzeitig ab, wenn maxDistance ueberschritten ist', () => {
    const distance = levenshteinDistance('voellig anderer text', 'margaux', 2);
    expect(distance).toBeGreaterThan(2);
  });
});

describe('findClosestFuzzyMatch', () => {
  const candidates = [
    { normalized: 'chateau margaux', value: 'Château Margaux' },
    { normalized: 'chateau latour', value: 'Château Latour' },
    { normalized: 'domaine de chevalier', value: 'Domaine de Chevalier' },
  ];

  it('findet einen leicht falsch erkannten Namen', () => {
    const result = findClosestFuzzyMatch('chateu margaus', candidates);
    expect(result?.value).toBe('Château Margaux');
  });

  it('liefert null, wenn kein Kandidat nah genug ist', () => {
    const result = findClosestFuzzyMatch('voellig unbekannter weinname xyz', candidates);
    expect(result).toBeNull();
  });

  it('bevorzugt den naeheren von zwei aehnlichen Kandidaten', () => {
    const result = findClosestFuzzyMatch('chateau latou', candidates);
    expect(result?.value).toBe('Château Latour');
  });
});
