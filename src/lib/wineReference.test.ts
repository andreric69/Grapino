import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Kleiner, handgeschriebener Ausschnitt der echten Referenzdaten - reicht,
// um den Abgleichs-Algorithmus selbst zu testen, ohne die echten
// (mehrere hundert KB grossen) JSON-Dateien zu laden.
const FAKE_WINE_REFERENCE = {
  source: 'test',
  grapeVarieties: ['Syrah', 'Shiraz', 'Nebbiolo', 'Sangiovese'],
  wineries: ['Château Giscours', 'Château Montrose'],
  regions: ['Margaux', 'Saint-Estèphe', 'Barossa Valley', 'Burgund'],
};
const FAKE_REGION_COUNTRIES = [
  { region: 'Margaux', country: 'Frankreich' },
  { region: 'Saint-Estèphe', country: 'Frankreich' },
  { region: 'Barossa Valley', country: 'Australien' },
  { region: 'Burgund', country: 'Frankreich' },
];
const FAKE_GRAPE_COLORS = { rot: ['Syrah', 'Shiraz', 'Nebbiolo', 'Sangiovese'], weiss: [] };
const FAKE_PRODUCER_COUNTRIES = [
  { producer: 'Château Giscours', country: 'Frankreich' },
  { producer: 'Château Montrose', country: 'Frankreich' },
];
const FAKE_REGION_PARENTS: { region: string; parent: string }[] = [];

function mockFetchResponses(regionParents: { region: string; parent: string }[] = FAKE_REGION_PARENTS) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const body = url.includes('wine-reference.json')
        ? FAKE_WINE_REFERENCE
        : url.includes('region-countries.json')
          ? FAKE_REGION_COUNTRIES
          : url.includes('grape-colors.json')
            ? FAKE_GRAPE_COLORS
            : url.includes('producer-countries.json')
              ? FAKE_PRODUCER_COUNTRIES
              : url.includes('region-parents.json')
                ? regionParents
                : null;
      return { ok: true, json: async () => body } as Response;
    }),
  );
}

describe('wineReference matching', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetchResponses();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('erkennt eine Rebsorte samt Land ueber die Region', async () => {
    const mod = await import('./wineReference');
    const result = await mod.matchWineReferences('Château Giscours Margaux 2020');
    expect(result.producer).toBe('Château Giscours');
    expect(result.region).toBe('Margaux');
    expect(result.country).toBe('Frankreich');
  });

  it('erkennt Rebsorten-Synonyme wie Shiraz', async () => {
    const mod = await import('./wineReference');
    const result = await mod.matchWineReferences('Barossa Valley Shiraz 2019');
    expect(result.grapeVariety).toBe('Shiraz');
    expect(result.wineType).toBe('rot');
    expect(result.region).toBe('Barossa Valley');
    expect(result.country).toBe('Australien');
  });

  it('leitet das Land ersatzweise vom Produzenten ab, wenn keine Region erkannt wurde', async () => {
    const mod = await import('./wineReference');
    const result = await mod.matchWineReferences('Château Montrose Reserve');
    expect(result.producer).toBe('Château Montrose');
    expect(result.country).toBe('Frankreich');
  });

  it('regression: "Burgund" darf nicht als Teilstring in "Spätburgunder" anschlagen', async () => {
    const mod = await import('./wineReference');
    const result = await mod.matchWineReferences('Deutscher Spätburgunder trocken');
    expect(result.region).toBeUndefined();
    expect(result.country).toBeUndefined();
  });

  it('erkennt "Burgund" korrekt, wenn es als eigenstaendiges Wort vorkommt', async () => {
    const mod = await import('./wineReference');
    const result = await mod.matchWineReferences('Ein Wein aus dem Burgund');
    expect(result.region).toBe('Burgund');
    expect(result.country).toBe('Frankreich');
  });

  it('liefert ein leeres Ergebnis fuer Text ohne Treffer', async () => {
    const mod = await import('./wineReference');
    const result = await mod.matchWineReferences('Irgendein Text ohne Bezug');
    expect(result).toEqual({});
  });
});

describe('wineReference Region-Hierarchie (region/subregion)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetchResponses([{ region: 'Margaux', parent: 'Bordeaux' }]);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loest eine spezifische Appellation zur uebergeordneten Region auf (Margaux -> Bordeaux)', async () => {
    const mod = await import('./wineReference');
    const result = await mod.matchWineReferences('Château Giscours Margaux 2020');
    expect(result.region).toBe('Bordeaux');
    expect(result.subregion).toBe('Margaux');
    expect(result.country).toBe('Frankreich');
  });

  it('laesst Regionen ohne bekannte uebergeordnete Region unveraendert (kein Subregion-Vorschlag)', async () => {
    const mod = await import('./wineReference');
    const result = await mod.matchWineReferences('Barossa Valley Shiraz 2019');
    expect(result.region).toBe('Barossa Valley');
    expect(result.subregion).toBeUndefined();
  });

  it('lookupRegionHierarchy loest eine bekannte Appellation direkt auf', async () => {
    const mod = await import('./wineReference');
    const result = await mod.lookupRegionHierarchy('Margaux');
    expect(result).toEqual({ region: 'Bordeaux', subregion: 'Margaux' });
  });

  it('lookupRegionHierarchy laesst unbekannte Regionen unveraendert', async () => {
    const mod = await import('./wineReference');
    const result = await mod.lookupRegionHierarchy('Saint-Estèphe');
    expect(result).toEqual({ region: 'Saint-Estèphe' });
  });
});
