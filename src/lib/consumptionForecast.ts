import type { ConsumptionLogEntry, Wine } from '../types';

/**
 * Vorrats-Prognose: kombiniert den aktuellen Bestand mit dem bisherigen
 * Trinktempo, um grob abzuschaetzen, wie lange der Vorrat noch reicht. Das
 * ist bewusst eine einfache, ehrliche Schaetzung (keine Regression, kein
 * Trend) - im Zweifel lieber gar keine Prognose (null) als eine
 * ueberpraezise wirkende, aber irrefuehrende Zahl.
 */
export interface ConsumptionForecast {
  /** Durchschnittliche Flaschen pro Monat, ueber den betrachteten Zeitraum. */
  bottlesPerMonth: number;
  /** Aktueller Gesamtbestand (Summe quantity ueber alle aktiven Weine). */
  currentStock: number;
  /** Grobe Schaetzung, wie viele Monate der aktuelle Bestand bei diesem Tempo noch reicht - null, wenn keine verlaessliche Rate ermittelbar ist (z. B. zu wenig Verlaufsdaten). */
  monthsRemaining: number | null;
}

// 6 Monate Rueckblick: lang genug, um einzelne "Ausreisser-Wochen" (z. B. ein
// Fest mit vielen geoeffneten Flaschen) auszugleichen, aber kurz genug, dass
// die Prognose das AKTUELLE Trinktempo widerspiegelt statt ein Verhalten von
// vor Jahren, das sich laengst geaendert haben kann.
const FORECAST_WINDOW_MONTHS = 6;

// Unterhalb dieser Anzahl Log-Eintraege im Betrachtungszeitraum ist die
// Datenbasis zu duenn fuer eine sinnvolle Hochrechnung (z. B. wuerde eine
// einzelne vor zwei Monaten getrunkene Flasche sonst eine wild falsche Rate
// suggerieren) - dann lieber gar keine Prognose zeigen.
const MIN_LOG_ENTRIES = 3;

export function computeConsumptionForecast(
  activeWines: Wine[],
  consumptionLog: ConsumptionLogEntry[],
): ConsumptionForecast {
  const currentStock = activeWines.reduce((sum, w) => sum + w.quantity, 0);

  const windowStart = new Date();
  windowStart.setMonth(windowStart.getMonth() - FORECAST_WINDOW_MONTHS);

  const entriesInWindow = consumptionLog.filter((entry) => new Date(entry.consumed_at) >= windowStart);

  if (entriesInWindow.length < MIN_LOG_ENTRIES) {
    return { bottlesPerMonth: 0, currentStock, monthsRemaining: null };
  }

  const bottlesPerMonth = entriesInWindow.length / FORECAST_WINDOW_MONTHS;
  const roundedRate = Math.round(bottlesPerMonth * 10) / 10;

  if (Math.round(bottlesPerMonth) === 0) {
    return { bottlesPerMonth: roundedRate, currentStock, monthsRemaining: null };
  }

  const monthsRemaining = currentStock / bottlesPerMonth;

  return { bottlesPerMonth: roundedRate, currentStock, monthsRemaining };
}
