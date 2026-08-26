import { describe, expect, it } from 'vitest';
import { buildExistingActiveIndex, findExistingMatch, mergeDuplicatesWithinBatch } from './importMerge';
import type { Wine, WineInput } from '../types';

function makeInput(overrides: Partial<WineInput> = {}): WineInput {
  return {
    name: 'Château Giscours',
    producer: 'Château Giscours',
    vintage: 2020,
    grape_variety: null,
    region: null,
    notes: null,
    rating: null,
    photo_url: null,
    quantity: 1,
    is_favorite: false,
    is_consumed: false,
    price: null,
    wine_type: null,
    country: null,
    subregion: null,
    bottle_size: null,
    alcohol_content: null,
    community_rating: null,
    critic_scores: null,
    food_pairing: null,
    drink_from: null,
    drink_to: null,
    is_wishlist: false,
    storage_location: null,
    tasting_tannin: null,
    tasting_acidity: null,
    tasting_sweetness: null,
    tasting_body: null,
    ean_code: null,
    photo_urls: [],
    quantity_before_consumed: null,
    ...overrides,
  };
}

function makeWine(overrides: Partial<Wine> = {}): Wine {
  return {
    id: 'wine-1',
    created_at: '2026-01-01T00:00:00Z',
    user_id: 'user-1',
    ...makeInput(overrides),
    ...overrides,
  };
}

describe('mergeDuplicatesWithinBatch', () => {
  it('fasst exakt gleiche Weine (Name+Produzent+Jahrgang) zusammen und addiert die Menge', () => {
    const wines = [makeInput({ quantity: 1 }), makeInput({ quantity: 2 }), makeInput({ quantity: 3 })];
    const merged = mergeDuplicatesWithinBatch(wines);
    expect(merged).toHaveLength(1);
    expect(merged[0].quantity).toBe(6);
  });

  it('behandelt unterschiedliche Jahrgaenge als eigene Weine', () => {
    const wines = [makeInput({ vintage: 2019 }), makeInput({ vintage: 2020 })];
    const merged = mergeDuplicatesWithinBatch(wines);
    expect(merged).toHaveLength(2);
  });

  it('ist bei Name/Produzent nicht gross-/kleinschreibungsempfindlich', () => {
    const wines = [makeInput({ name: 'Château Giscours' }), makeInput({ name: 'château giscours' })];
    const merged = mergeDuplicatesWithinBatch(wines);
    expect(merged).toHaveLength(1);
    expect(merged[0].quantity).toBe(2);
  });

  it('behandelt fehlenden Produzenten konsistent (null vs. leerer String)', () => {
    const wines = [makeInput({ producer: null }), makeInput({ producer: '' })];
    const merged = mergeDuplicatesWithinBatch(wines);
    expect(merged).toHaveLength(1);
  });
});

describe('buildExistingActiveIndex + findExistingMatch', () => {
  it('findet einen bestehenden aktiven Wein anhand Name+Produzent+Jahrgang', () => {
    const existing = makeWine({ id: 'w1' });
    const index = buildExistingActiveIndex([existing]);
    const match = findExistingMatch(makeInput(), index);
    expect(match?.id).toBe('w1');
  });

  it('ignoriert bereits getrunkene Weine beim Abgleich', () => {
    const consumed = makeWine({ id: 'w1', is_consumed: true });
    const index = buildExistingActiveIndex([consumed]);
    const match = findExistingMatch(makeInput(), index);
    expect(match).toBeUndefined();
  });

  it('ignoriert Wunschlisten-Eintraege beim Abgleich gegen den Bestand', () => {
    const wishlist = makeWine({ id: 'w1', is_wishlist: true });
    const index = buildExistingActiveIndex([wishlist]);
    const match = findExistingMatch(makeInput(), index);
    expect(match).toBeUndefined();
  });

  it('mischt Wunschlisten-Importe nie mit dem Bestand, selbst bei exaktem Namenstreffer', () => {
    const activeWine = makeWine({ id: 'w1' });
    const index = buildExistingActiveIndex([activeWine]);
    const wishlistImport = makeInput({ is_wishlist: true });
    const match = findExistingMatch(wishlistImport, index);
    expect(match).toBeUndefined();
  });

  it('liefert kein Match bei abweichendem Jahrgang', () => {
    const existing = makeWine({ id: 'w1', vintage: 2019 });
    const index = buildExistingActiveIndex([existing]);
    const match = findExistingMatch(makeInput({ vintage: 2020 }), index);
    expect(match).toBeUndefined();
  });
});
