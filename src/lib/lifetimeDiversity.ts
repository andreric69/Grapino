import { splitCommaList, type Wine } from '../types';

/**
 * Lebenslange Vielfalt: anders als die uebrigen Aufschluesselungen auf der
 * Statistik-Seite (die nur den AKTUELLEN Bestand betrachten) zaehlt das hier
 * ueber die GESAMTE jemals erfasste Sammlung - konsumiert oder nicht. Zeigt
 * "wie viel habe ich schon entdeckt" statt "was habe ich gerade im Keller".
 */
export interface LifetimeDiversity {
  countries: number;
  regions: number;
  grapeVarieties: number;
  producers: number;
  totalWinesEver: number;
}

export function computeLifetimeDiversity(allWines: Wine[]): LifetimeDiversity {
  const countries = new Set<string>();
  const regions = new Set<string>();
  const grapeVarieties = new Set<string>();
  const producers = new Set<string>();

  for (const w of allWines) {
    if (w.country) countries.add(w.country);
    if (w.region) regions.add(w.region);
    if (w.producer) producers.add(w.producer);
    for (const grape of splitCommaList(w.grape_variety)) {
      grapeVarieties.add(grape);
    }
  }

  return {
    countries: countries.size,
    regions: regions.size,
    grapeVarieties: grapeVarieties.size,
    producers: producers.size,
    totalWinesEver: allWines.length,
  };
}
