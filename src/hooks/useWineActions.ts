import { addBottles, drinkBottles, restoreToStock, setFavorite } from '../lib/wineRepository';
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

  // Bei mehreren Flaschen geht nur "count" weg (Bestand -count, per
  // Bestaetigungsdialog waehlbar, Standard 1), der Wein bleibt im Vorrat.
  // Erst wenn der Bestand 0 erreicht, wandert er in den "Getrunken"-Bereich.
  // Von dort aus antippen holt ihn wieder zurueck (mind. 1 Flasche).
  async function toggleConsumed(wine: Wine, count = 1) {
    const previous = wine;
    if (wine.is_consumed) {
      // Stellt die tatsaechlich vor dem Trinken vorhandene Menge wieder her
      // (siehe quantity_before_consumed in wineRepository.restoreToStock) -
      // nicht immer nur 1 Flasche, auch wenn mehrere auf einmal getrunken
      // wurden.
      const restoredCount = wine.quantity_before_consumed ?? 1;
      applyUpdate(wine.id, (w) => ({ ...w, is_consumed: false, quantity: restoredCount, quantity_before_consumed: null }));
      showToast?.(
        `"${wine.name}" wieder im Vorrat (${restoredCount === 1 ? '1 Flasche' : `${restoredCount} Flaschen`}).`,
      );
      try {
        await restoreToStock(wine);
      } catch (e) {
        rollback(wine.id, previous);
        onError?.(e instanceof Error ? e.message : 'Konnte nicht zurueckgeholt werden.');
      }
      return;
    }

    const clampedCount = Math.min(Math.max(1, count), wine.quantity);
    const nextQuantity = Math.max(0, wine.quantity - clampedCount);
    applyUpdate(wine.id, (w) => ({
      ...w,
      quantity: nextQuantity,
      is_consumed: nextQuantity === 0,
      // Muss dieselbe Regel wie drinkBottles() in wineRepository.ts spiegeln
      // (dort serverseitig gesetzt) - sonst haette der lokale Zustand hier
      // weiterhin den alten (meist null) Wert, und ein sofortiges
      // "zurueckholen" ohne Neuladen wuerde faelschlich nur 1 Flasche statt
      // aller wiederherstellen.
      quantity_before_consumed: nextQuantity === 0 ? wine.quantity : null,
    }));
    showToast?.(
      nextQuantity === 0
        ? `"${wine.name}" komplett getrunken - jetzt im Bereich "Getrunken".`
        : `${clampedCount === 1 ? 'Eine Flasche' : `${clampedCount} Flaschen`} "${wine.name}" im Rückblick vermerkt - noch ${nextQuantity} im Vorrat.`,
    );
    try {
      await drinkBottles(wine, clampedCount);
    } catch (e) {
      rollback(wine.id, previous);
      onError?.(e instanceof Error ? e.message : 'Konnte nicht gespeichert werden.');
    }
  }

  // Gegenstueck zu toggleConsumed: eine oder mehrere Flaschen hinzufuegen,
  // ebenfalls optimistisch mit Rollback bei Fehler - geteilt zwischen
  // CollectionPage (Stepper auf der Karte) und WineDetailPage.
  async function addToStock(wine: Wine, count = 1) {
    const previous = wine;
    const clampedCount = Math.max(1, count);
    const nextQuantity = wine.quantity + clampedCount;
    applyUpdate(wine.id, (w) => ({ ...w, quantity: nextQuantity, is_consumed: false }));
    showToast?.(
      `${clampedCount === 1 ? '1 Flasche' : `${clampedCount} Flaschen`} "${wine.name}" hinzugefügt.`,
    );
    try {
      await addBottles(wine, clampedCount);
    } catch (e) {
      rollback(wine.id, previous);
      onError?.(e instanceof Error ? e.message : 'Konnte nicht gespeichert werden.');
    }
  }

  return { toggleFavorite, toggleConsumed, addToStock };
}
