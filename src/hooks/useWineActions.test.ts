import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Wine } from '../types';

const setFavoriteMock = vi.fn();
const drinkBottlesMock = vi.fn();
const restoreToStockMock = vi.fn();

vi.mock('../lib/wineRepository', () => ({
  setFavorite: (...args: unknown[]) => setFavoriteMock(...args),
  drinkBottles: (...args: unknown[]) => drinkBottlesMock(...args),
  restoreToStock: (...args: unknown[]) => restoreToStockMock(...args),
}));

const { useWineActions } = await import('./useWineActions');

function makeWine(overrides: Partial<Wine> = {}): Wine {
  return {
    id: 'w1',
    created_at: '2026-01-01T00:00:00Z',
    user_id: 'u1',
    name: 'Testwein',
    producer: null,
    vintage: 2020,
    grape_variety: null,
    region: null,
    notes: null,
    rating: null,
    photo_url: null,
    quantity: 2,
    is_favorite: false,
    is_consumed: false,
    price: null,
    wine_type: null,
    country: null,
    subregion: null,
    bottle_size: null,
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

// Simuliert, wie CollectionPage/WineDetailPage die Callbacks verdrahten -
// haelt den "aktuellen" Wein in einer einfachen Variable statt in React-State.
function makeHarness(initial: Wine) {
  let current = initial;
  const errors: string[] = [];
  const toasts: string[] = [];
  const actions = useWineActions({
    applyUpdate: (id, updater) => {
      if (current.id === id) current = updater(current);
    },
    rollback: (id, previous) => {
      if (current.id === id) current = previous;
    },
    showToast: (msg) => toasts.push(msg),
    onError: (msg) => errors.push(msg),
  });
  return { actions, get current() { return current; }, errors, toasts };
}

describe('useWineActions.toggleFavorite', () => {
  beforeEach(() => {
    setFavoriteMock.mockReset();
    drinkBottlesMock.mockReset();
    restoreToStockMock.mockReset();
  });

  it('setzt is_favorite optimistisch und ruft das Repository auf', async () => {
    setFavoriteMock.mockResolvedValue(undefined);
    const h = makeHarness(makeWine({ is_favorite: false }));
    await h.actions.toggleFavorite(h.current);
    expect(h.current.is_favorite).toBe(true);
    expect(setFavoriteMock).toHaveBeenCalledWith('w1', true);
  });

  it('macht das optimistische Update rueckgaengig, wenn das Speichern fehlschlaegt', async () => {
    setFavoriteMock.mockRejectedValue(new Error('Netzwerkfehler'));
    const h = makeHarness(makeWine({ is_favorite: false }));
    await h.actions.toggleFavorite(h.current);
    expect(h.current.is_favorite).toBe(false);
  });
});

describe('useWineActions.toggleConsumed', () => {
  beforeEach(() => {
    setFavoriteMock.mockReset();
    drinkBottlesMock.mockReset();
    restoreToStockMock.mockReset();
  });

  it('verringert bei mehreren Flaschen nur die Menge, Wein bleibt im Vorrat', async () => {
    drinkBottlesMock.mockResolvedValue(undefined);
    const h = makeHarness(makeWine({ quantity: 3, is_consumed: false }));
    await h.actions.toggleConsumed(h.current);
    expect(h.current.quantity).toBe(2);
    expect(h.current.is_consumed).toBe(false);
    expect(h.toasts[0]).toContain('Eine Flasche "Testwein" gebucht');
  });

  it('verringert um die angegebene Anzahl Flaschen (count-Parameter)', async () => {
    drinkBottlesMock.mockResolvedValue(undefined);
    const h = makeHarness(makeWine({ quantity: 5, is_consumed: false }));
    await h.actions.toggleConsumed(h.current, 3);
    expect(h.current.quantity).toBe(2);
    expect(h.current.is_consumed).toBe(false);
    expect(drinkBottlesMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1' }), 3);
    expect(h.toasts[0]).toContain('3 Flaschen "Testwein" gebucht');
  });

  it('kappt count auf den vorhandenen Bestand', async () => {
    drinkBottlesMock.mockResolvedValue(undefined);
    const h = makeHarness(makeWine({ quantity: 2, is_consumed: false }));
    await h.actions.toggleConsumed(h.current, 10);
    expect(h.current.quantity).toBe(0);
    expect(h.current.is_consumed).toBe(true);
  });

  it('markiert als komplett getrunken, wenn die letzte Flasche weggeht', async () => {
    drinkBottlesMock.mockResolvedValue(undefined);
    const h = makeHarness(makeWine({ quantity: 1, is_consumed: false }));
    await h.actions.toggleConsumed(h.current);
    expect(h.current.quantity).toBe(0);
    expect(h.current.is_consumed).toBe(true);
    expect(h.toasts[0]).toContain('komplett getrunken');
  });

  it('holt einen getrunkenen Wein wieder in den Vorrat zurueck (mind. 1 Flasche, falls unbekannt)', async () => {
    restoreToStockMock.mockResolvedValue(undefined);
    const h = makeHarness(makeWine({ quantity: 0, is_consumed: true }));
    await h.actions.toggleConsumed(h.current);
    expect(h.current.is_consumed).toBe(false);
    expect(h.current.quantity).toBe(1);
    expect(h.toasts[0]).toContain('wieder im Vorrat');
  });

  it('stellt bei mehreren auf einmal getrunkenen Flaschen die volle Anzahl wieder her, nicht nur 1', async () => {
    restoreToStockMock.mockResolvedValue(undefined);
    const h = makeHarness(makeWine({ quantity: 0, is_consumed: true, quantity_before_consumed: 6 }));
    await h.actions.toggleConsumed(h.current);
    expect(h.current.is_consumed).toBe(false);
    expect(h.current.quantity).toBe(6);
    expect(h.current.quantity_before_consumed).toBe(null);
    expect(h.toasts[0]).toContain('6 Flaschen');
  });

  it('macht das Update rueckgaengig und meldet den Fehler, wenn drinkOneBottle fehlschlaegt', async () => {
    drinkBottlesMock.mockRejectedValue(new Error('Server nicht erreichbar'));
    const h = makeHarness(makeWine({ quantity: 1, is_consumed: false }));
    await h.actions.toggleConsumed(h.current);
    expect(h.current.quantity).toBe(1);
    expect(h.current.is_consumed).toBe(false);
    expect(h.errors).toEqual(['Server nicht erreichbar']);
  });

  it('macht das Update rueckgaengig und meldet den Fehler, wenn restoreToStock fehlschlaegt', async () => {
    restoreToStockMock.mockRejectedValue(new Error('Server nicht erreichbar'));
    const h = makeHarness(makeWine({ quantity: 0, is_consumed: true }));
    await h.actions.toggleConsumed(h.current);
    expect(h.current.is_consumed).toBe(true);
    expect(h.current.quantity).toBe(0);
    expect(h.errors).toEqual(['Server nicht erreichbar']);
  });
});
