import { drinkOneBottle, restoreToStock, setFavorite } from '../lib/wineRepository';
import type { Wine } from '../types';

interface UseWineActionsOptions {
  /** Wendet ein optimistisches Update auf genau einen Wein an (per id). */
  applyUpdate: (wineId: string, updater: (wine: Wine) => Wine) => void;
  /** Setzt einen einzelnen Wein bei einem fehlgeschlagenen Speichern auf seinen vorherigen Zustand zurueck. */
  rollback: (wineId: string, previous: Wine) => void;
  showToast?: (message: string) => void;
  /** Wird nur bei einem echten Fehler aufgerufen (nach dem Rollback) - optional, je nachdem ob die Seite Fehler anzeigt. */
  onError?: (message: string) => void;
}

/**
 * Teilt die Favorit/Getrunken-Umschalt-Logik zwischen CollectionPage (Liste
 * von Weinen) und WineDetailPage (ein einzelner Wein) - beide hatten vorher
 * fast identischen, aber getrennt gepflegten Code fuer optimistisches Update
 * + Rollback bei Fehler. `applyUpdate`/`rollback` abstrahieren darueber, ob
 * der Aufrufer eine Liste oder ein einzelnes Objekt verwaltet.
 */
export function useWineActions({ applyUpdate, rollback, showToast, onError }: UseWineActionsOptions) {
  async function toggleFavorite(wine: Wine) {
    const nextValue = !wine.is_favorite;
    applyUpdate(wine.id, (w) => ({ ...w, is_favorite: nextValue }));
    try {
      await setFavorite(wine.id, nextValue);
    } catch {
      rollback(wine.id, wine);
    }
  }

  // Bei mehreren Flaschen geht nur eine weg (Bestand -1), der Wein bleibt im
  // Vorrat. Erst bei der letzten Flasche wandert er in den
  // "Getrunken"-Bereich. Von dort aus antippen holt ihn wieder zurueck
  // (mind. 1 Flasche).
  async function toggleConsumed(wine: Wine) {
    const previous = wine;
    if (wine.is_consumed) {
      applyUpdate(wine.id, (w) => ({ ...w, is_consumed: false, quantity: Math.max(1, w.quantity) }));
      showToast?.(`"${wine.name}" wieder im Vorrat.`);
      try {
        await restoreToStock(wine);
      } catch (e) {
        rollback(wine.id, previous);
        onError?.(e instanceof Error ? e.message : 'Konnte nicht zurueckgeholt werden.');
      }
      return;
    }

    const nextQuantity = Math.max(0, wine.quantity - 1);
    applyUpdate(wine.id, (w) => ({ ...w, quantity: nextQuantity, is_consumed: nextQuantity === 0 }));
    showToast?.(
      nextQuantity === 0
        ? `"${wine.name}" komplett getrunken - jetzt im Bereich "Getrunken".`
        : `Eine Flasche "${wine.name}" gebucht - noch ${nextQuantity} im Vorrat.`,
    );
    try {
      await drinkOneBottle(wine);
    } catch (e) {
      rollback(wine.id, previous);
      onError?.(e instanceof Error ? e.message : 'Konnte nicht gespeichert werden.');
    }
  }

  return { toggleFavorite, toggleConsumed };
}
