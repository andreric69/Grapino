import { splitCommaList, WINE_TYPE_LABELS, type ConsumptionLogEntry, type Wine, type WineType } from '../types';

/**
 * Meilensteine ("Meilensteine"-Seite): ein ruhiger, unaufdringlicher
 * Fortschritts-Rueckblick ueber die GESAMTE jemals erfasste Sammlung - nicht
 * nur den aktuellen Bestand. Da keine historischen Bestandsdaten vorliegen
 * (z. B. kein "hoechster jemals erreichter Bestand"), basiert jeder
 * Meilenstein bewusst nur auf Werten, die ueber die Zeit ausschliesslich
 * wachsen koennen (Lifetime-Zaehler) - nie auf einer Momentaufnahme.
 */
export type MilestoneCategory = 'sammlung' | 'getrunken' | 'vielfalt' | 'besonderes';

export interface Milestone {
  id: string;
  category: MilestoneCategory;
  title: string;
  description: string;
  achieved: boolean;
  /** Nur bei tiered/numerischen Meilensteinen gesetzt - fuer eine Fortschrittsanzeige zum naechsten Schritt. */
  progress?: { current: number; target: number };
}

interface TierDef {
  target: number;
  title: string;
  description: string;
}

/** Baut aus einer Tier-Liste + aktuellem Zaehlerstand Milestone-Objekte - jeweils eines pro Stufe. */
function buildTiers(idPrefix: string, category: MilestoneCategory, current: number, tiers: TierDef[]): Milestone[] {
  return tiers.map((tier) => ({
    id: `${idPrefix}-${tier.target}`,
    category,
    title: tier.title,
    description: tier.description,
    achieved: current >= tier.target,
    progress: { current: Math.min(current, tier.target), target: tier.target },
  }));
}

function oneOff(id: string, category: MilestoneCategory, title: string, description: string, achieved: boolean): Milestone {
  return { id, category, title, description, achieved };
}

export function computeMilestones(wines: Wine[], consumptionLog: ConsumptionLogEntry[]): Milestone[] {
  const totalWinesEver = wines.length;
  const totalBottlesDrunk = consumptionLog.length;

  const countries = new Set<string>();
  const grapeVarieties = new Set<string>();
  const wineTypesTried = new Set<WineType>();
  let hasFavorite = false;
  let hasFiveStar = false;
  let oldestVintage: number | null = null;
  let earliestCreatedAt: string | null = null;

  for (const w of wines) {
    if (w.country) countries.add(w.country);
    for (const grape of splitCommaList(w.grape_variety)) grapeVarieties.add(grape);
    if (w.wine_type) wineTypesTried.add(w.wine_type);
    if (w.is_favorite) hasFavorite = true;
    if (w.rating === 5) hasFiveStar = true;
    if (w.vintage != null && (oldestVintage === null || w.vintage < oldestVintage)) oldestVintage = w.vintage;
    if (w.created_at && (earliestCreatedAt === null || w.created_at < earliestCreatedAt)) earliestCreatedAt = w.created_at;
  }

  const milestones: Milestone[] = [];

  // --- Sammlung: Weine insgesamt erfasst ---------------------------------
  milestones.push(
    ...buildTiers('sammlung-weine', 'sammlung', totalWinesEver, [
      { target: 10, title: 'Die ersten 10', description: '10 Weine in deiner Sammlung erfasst.' },
      { target: 25, title: 'Wachsende Sammlung', description: '25 Weine in deiner Sammlung erfasst.' },
      { target: 50, title: 'Solides Fundament', description: '50 Weine in deiner Sammlung erfasst.' },
      { target: 100, title: 'Stattlicher Keller', description: '100 Weine in deiner Sammlung erfasst.' },
    ]),
  );

  // --- Getrunken: Flaschen insgesamt geleert ------------------------------
  milestones.push(
    ...buildTiers('getrunken-flaschen', 'getrunken', totalBottlesDrunk, [
      { target: 10, title: 'Erste Kostproben', description: '10 Flaschen genossen.' },
      { target: 25, title: 'Guter Zug', description: '25 Flaschen genossen.' },
      { target: 50, title: 'Erfahrener Geniesser', description: '50 Flaschen genossen.' },
      { target: 100, title: 'Hundert Flaschen', description: '100 Flaschen genossen.' },
    ]),
  );

  // --- Vielfalt: Laender ---------------------------------------------------
  milestones.push(
    ...buildTiers('vielfalt-laender', 'vielfalt', countries.size, [
      { target: 5, title: 'Kleine Weltreise', description: 'Weine aus 5 verschiedenen Ländern probiert.' },
      { target: 10, title: 'Weltenbummler', description: 'Weine aus 10 verschiedenen Ländern probiert.' },
      { target: 20, title: 'Rund um den Globus', description: 'Weine aus 20 verschiedenen Ländern probiert.' },
    ]),
  );

  // --- Vielfalt: Rebsorten ---------------------------------------------------
  milestones.push(
    ...buildTiers('vielfalt-rebsorten', 'vielfalt', grapeVarieties.size, [
      { target: 10, title: 'Erste Rebsorten', description: '10 verschiedene Rebsorten probiert.' },
      { target: 25, title: 'Kenner-Niveau', description: '25 verschiedene Rebsorten probiert.' },
      { target: 50, title: 'Rebsorten-Experte', description: '50 verschiedene Rebsorten probiert.' },
    ]),
  );

  // --- Besonderes: alle Weintypen probiert ---------------------------------
  const wineTypeCount = Object.keys(WINE_TYPE_LABELS).length;
  milestones.push(
    oneOff(
      'besonderes-alle-typen',
      'besonderes',
      'Alle Facetten',
      `Alle ${wineTypeCount} Weintypen probiert - Rot, Weiss, Rosé, Dessert und Schaumwein.`,
      wineTypesTried.size >= wineTypeCount,
    ),
  );

  // --- Besonderes: erste Favoriten- und Bewertungs-Meilensteine ---------------
  milestones.push(
    oneOff('besonderes-favorit', 'besonderes', 'Ein Favorit', 'Den ersten Wein als Favorit markiert.', hasFavorite),
  );
  milestones.push(
    oneOff('besonderes-fuenf-sterne', 'besonderes', 'Volle Punktzahl', 'Einem Wein 5 von 5 Sternen gegeben.', hasFiveStar),
  );

  // --- Besonderes: alter Jahrgang ------------------------------------------
  milestones.push(
    oneOff(
      'besonderes-jahrgang-2000',
      'besonderes',
      'Etwas Geschichte',
      'Einen Wein mit Jahrgang vor 2000 in der Sammlung.',
      oldestVintage !== null && oldestVintage < 2000,
    ),
  );

  // --- Besonderes: Sammler-Tenure seit dem ersten Eintrag --------------------
  const years = earliestCreatedAt !== null ? yearsSince(earliestCreatedAt) : 0;
  milestones.push(
    ...buildTiers('besonderes-dabei-seit', 'besonderes', years, [
      { target: 1, title: 'Dabei seit 1 Jahr', description: 'Seit einem Jahr sammelst du mit Grapino.' },
      { target: 2, title: 'Dabei seit 2 Jahren', description: 'Seit zwei Jahren sammelst du mit Grapino.' },
    ]),
  );

  return sortMilestones(milestones);
}

/** Anzahl ganzer Jahre seit einem ISO-Zeitstempel, abgerundet (0, wenn juenger als 1 Jahr). */
function yearsSince(isoTimestamp: string): number {
  const then = new Date(isoTimestamp).getTime();
  if (Number.isNaN(then)) return 0;
  const now = Date.now();
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((now - then) / msPerYear));
}

const CATEGORY_ORDER: MilestoneCategory[] = ['sammlung', 'getrunken', 'vielfalt', 'besonderes'];

/**
 * Sortierung: zuerst nach Kategorie (in fester Reihenfolge), dann innerhalb
 * jeder Kategorie erreichte Meilensteine (hoechste Stufe zuerst) vor
 * unerreichten (naechste Stufe zuerst) - so stehen "was du geschafft hast"
 * oben und "was als naechstes ansteht" direkt danach als sanfte Motivation.
 */
function sortMilestones(milestones: Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) => {
    const catDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    if (catDiff !== 0) return catDiff;
    if (a.achieved !== b.achieved) return a.achieved ? -1 : 1;
    const aTarget = a.progress?.target ?? 0;
    const bTarget = b.progress?.target ?? 0;
    return a.achieved ? bTarget - aTarget : aTarget - bTarget;
  });
}
