/**
 * Abgleich von OCR-Text gegen eine echte Referenzliste aus Wikidata (CC0):
 * ca. 2100 Rebsorten, 1600 Weingueter/Produzenten und 780 Weinregionen/AVAs.
 * Zusaetzlich zwei verknuepfende Nachschlagelisten (ebenfalls echte, oeffentlich
 * bekannte Daten): welches Land zu welcher Region gehoert (aus Wikidata,
 * mehrsprachig) und welche Farbe eine Rebsorte typischerweise hat (allgemein
 * bekannte Fachkenntnis). Damit kann aus einer erkannten Region automatisch
 * das Land und aus einer erkannten Rebsorte automatisch der Wein-Typ
 * vorgeschlagen werden - der Abgleich wird dadurch "verbundener".
 * Rein clientseitig (statische JSON-Dateien, kein API-Call, keine Kosten).
 *
 * Bewusst KEINE erfundenen Daten - nur echte, oeffentlich bekannte Fakten.
 */

import type { WineType } from '../types';
import { findClosestFuzzyMatch } from './fuzzyMatch';

interface WineReferenceData {
  source: string;
  grapeVarieties: string[];
  wineries: string[];
  regions: string[];
}

interface RegionCountryEntry {
  region: string;
  country: string;
}

interface RegionParentEntry {
  region: string;
  parent: string;
}

interface ProducerCountryEntry {
  producer: string;
  country: string;
}

interface GrapeColorData {
  rot: string[];
  weiss: string[];
}

interface IndexEntry {
  normalized: string;
  original: string;
  /** Vorkompilierter Regex mit Wortgrenzen - verhindert Treffer, bei denen der Eintrag nur zufaellig als Teilstring in einem laengeren Wort steckt (z. B. "Burgund" in "Spätburgunder"). */
  regex: RegExp;
}

interface LookupIndex<T> {
  normalized: string;
  value: T;
  regex: RegExp;
}

interface ReferenceIndex {
  grapeVarieties: IndexEntry[];
  wineries: IndexEntry[];
  regions: IndexEntry[];
  regionCountries: LookupIndex<string>[];
  grapeColors: LookupIndex<WineType>[];
  producerCountries: LookupIndex<string>[];
  /** Appellation/Gemeinde -> uebergeordnete, bekannte Weinregion (z. B. "Margaux" -> "Bordeaux"). */
  regionParents: LookupIndex<string>[];
}

const MIN_MATCH_LENGTH = 4;

const COMBINING_MARKS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g');

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(COMBINING_MARKS_REGEX, '') // diakritische Zeichen (Akzente) entfernen
    .toLowerCase()
    .trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** \b-Wortgrenzen um den ganzen (moeglicherweise mehrwortigen) Eintrag - nicht nur um jedes einzelne Wort darin. */
function toBoundaryRegex(normalized: string): RegExp {
  return new RegExp(`\\b${escapeRegExp(normalized)}\\b`);
}

function buildIndex(entries: string[]): IndexEntry[] {
  return entries
    .map((original) => ({ original, normalized: normalize(original) }))
    .filter((e) => e.normalized.length >= MIN_MATCH_LENGTH)
    .map((e) => ({ ...e, regex: toBoundaryRegex(e.normalized) }))
    // Laengste zuerst - bei ueberlappenden Treffern gewinnt der spezifischere.
    .sort((a, b) => b.normalized.length - a.normalized.length);
}

function buildLookupIndex<T>(entries: [string, T][]): LookupIndex<T>[] {
  return entries
    .map(([original, value]) => ({ normalized: normalize(original), value }))
    .filter((e) => e.normalized.length >= MIN_MATCH_LENGTH)
    .map((e) => ({ ...e, regex: toBoundaryRegex(e.normalized) }))
    .sort((a, b) => b.normalized.length - a.normalized.length);
}

let indexPromise: Promise<ReferenceIndex> | null = null;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} nicht erreichbar`);
  return res.json() as Promise<T>;
}

function loadIndex(): Promise<ReferenceIndex> {
  if (!indexPromise) {
    indexPromise = Promise.all([
      fetchJson<WineReferenceData>('/data/wine-reference.json'),
      fetchJson<RegionCountryEntry[]>('/data/region-countries.json'),
      fetchJson<GrapeColorData>('/data/grape-colors.json'),
      fetchJson<ProducerCountryEntry[]>('/data/producer-countries.json'),
      fetchJson<RegionParentEntry[]>('/data/region-parents.json'),
    ])
      .then(([reference, regionCountries, grapeColors, producerCountries, regionParents]) => ({
        grapeVarieties: buildIndex(reference.grapeVarieties),
        wineries: buildIndex(reference.wineries),
        regions: buildIndex(reference.regions),
        regionCountries: buildLookupIndex(regionCountries.map((e) => [e.region, e.country])),
        grapeColors: buildLookupIndex([
          ...grapeColors.rot.map((g): [string, WineType] => [g, 'rot']),
          ...grapeColors.weiss.map((g): [string, WineType] => [g, 'weiss']),
        ]),
        producerCountries: buildLookupIndex(producerCountries.map((e) => [e.producer, e.country])),
        regionParents: buildLookupIndex(regionParents.map((e) => [e.region, e.parent])),
      }))
      .catch((e) => {
        console.error('Wein-Referenzdaten konnten nicht geladen werden:', e);
        indexPromise = null;
        return {
          grapeVarieties: [],
          wineries: [],
          regions: [],
          regionCountries: [],
          grapeColors: [],
          producerCountries: [],
          regionParents: [],
        };
      });
  }
  return indexPromise;
}

function findBestMatch(normalizedText: string, index: IndexEntry[]): string | null {
  for (const entry of index) {
    if (entry.regex.test(normalizedText)) {
      return entry.original;
    }
  }
  return null;
}

function findBestLookup<T>(normalizedText: string, index: LookupIndex<T>[]): T | null {
  for (const entry of index) {
    if (entry.regex.test(normalizedText)) {
      return entry.value;
    }
  }
  return null;
}

/**
 * Manche erkannten Regionen sind spezifische Appellationen/Gemeinden
 * innerhalb einer bekannteren, uebergeordneten Weinregion (z. B. "Margaux"
 * innerhalb "Bordeaux") - in dem Fall wird die uebergeordnete Region als
 * Region gefuehrt und die erkannte Appellation als Subregion, statt die
 * Appellation faelschlich als "die Region" zu behandeln. Ist keine
 * uebergeordnete Region bekannt (z. B. "Rioja", "Ribera del Duero" - selbst
 * schon die uebliche oberste Bezeichnung), bleibt die erkannte Region
 * unveraendert.
 */
function resolveRegionHierarchy(region: string, index: ReferenceIndex): { region: string; subregion?: string } {
  const parent = findBestLookup(normalize(region), index.regionParents);
  return parent ? { region: parent, subregion: region } : { region };
}

export interface WineReferenceMatches {
  producer?: string;
  grapeVariety?: string;
  region?: string;
  /** Nur gesetzt, wenn die erkannte Region eine bekannte, spezifischere Appellation innerhalb einer uebergeordneten Weinregion ist (z. B. "Margaux" -> Region "Bordeaux", Subregion "Margaux"). */
  subregion?: string;
  /** Aus der erkannten Region abgeleitetes Herkunftsland (z. B. Pauillac -> Frankreich). */
  country?: string;
  /** Aus der erkannten Rebsorte abgeleiteter Wein-Typ (z. B. Nebbiolo -> Rot). Nur ein Vorschlag. */
  wineType?: WineType;
}

/** Sucht im erkannten Etikett-Text nach bekannten Rebsorten/Produzenten/Regionen. */
export async function matchWineReferences(ocrText: string): Promise<WineReferenceMatches> {
  const index = await loadIndex();
  const normalizedText = normalize(ocrText);
  if (!normalizedText) return {};

  const matches: WineReferenceMatches = {};
  const grape = findBestMatch(normalizedText, index.grapeVarieties);
  if (grape) {
    matches.grapeVariety = grape;
    const wineType = findBestLookup(normalize(grape), index.grapeColors);
    if (wineType) matches.wineType = wineType;
  }

  const winery = findBestMatch(normalizedText, index.wineries);
  if (winery) matches.producer = winery;

  const region = findBestMatch(normalizedText, index.regions);
  if (region) {
    const { region: resolvedRegion, subregion } = resolveRegionHierarchy(region, index);
    matches.region = resolvedRegion;
    if (subregion) matches.subregion = subregion;
    const country = findBestLookup(normalize(region), index.regionCountries);
    if (country) matches.country = country;
  }

  // Falls die Region im Text nicht erkannt wurde (oder kein Land dazu bekannt
  // ist), das Land ersatzweise aus dem erkannten Produzenten/Weingut ableiten
  // - viele Etiketten nennen das Chateau deutlich lesbar, die Region aber nur
  // klein oder gar nicht.
  if (!matches.country && winery) {
    const producerCountry = findBestLookup(normalize(winery), index.producerCountries);
    if (producerCountry) matches.country = producerCountry;
  }

  return matches;
}

export interface FuzzyReferenceMatches {
  producer?: string;
  grapeVariety?: string;
  region?: string;
}

/**
 * Fallback fuer matchWineReferences: der exakte Abgleich verlangt eine
 * wortgenaue Uebereinstimmung - ein OCR-Verhaspler wie "Chateu Margaus"
 * findet "Château Margaux" dort nicht. Hier werden stattdessen einzelne
 * Textkandidaten (z.B. aus buildPhrases in ocr.ts) per Tippfehler-Distanz
 * gegen dieselben Referenzlisten geprueft - nur fuer Felder aufgerufen, die
 * der exakte Abgleich nicht gefunden hat (siehe ocr.ts).
 */
export async function fuzzyMatchWineReferences(candidatePhrases: string[]): Promise<FuzzyReferenceMatches> {
  const index = await loadIndex();
  const normalizedCandidates = candidatePhrases.map((p) => normalize(p)).filter((p) => p.length >= MIN_MATCH_LENGTH);
  if (normalizedCandidates.length === 0) return {};

  const grapeEntries = index.grapeVarieties.map((e) => ({ normalized: e.normalized, value: e.original }));
  const wineryEntries = index.wineries.map((e) => ({ normalized: e.normalized, value: e.original }));
  const regionEntries = index.regions.map((e) => ({ normalized: e.normalized, value: e.original }));

  const matches: FuzzyReferenceMatches = {};
  for (const text of normalizedCandidates) {
    if (!matches.grapeVariety) {
      const m = findClosestFuzzyMatch(text, grapeEntries);
      if (m) matches.grapeVariety = m.value;
    }
    if (!matches.producer) {
      const m = findClosestFuzzyMatch(text, wineryEntries);
      if (m) matches.producer = m.value;
    }
    if (!matches.region) {
      const m = findClosestFuzzyMatch(text, regionEntries);
      if (m) matches.region = m.value;
    }
  }
  return matches;
}

/** Leitet Land/Typ direkt aus manuell eingegebenem Text ab (Region bzw. Rebsorte), fuer die Live-Vorschlaege im Formular. */
export async function lookupCountryForRegion(regionText: string): Promise<string | null> {
  const index = await loadIndex();
  const normalized = normalize(regionText);
  if (!normalized) return null;
  return findBestLookup(normalized, index.regionCountries);
}

/**
 * Loest eine bereits bekannte Regionsangabe (z. B. direkt vom Etikett
 * abgelesen, nicht ueber den Datenbank-Abgleich gefunden) gegen die
 * Region-Hierarchie auf - siehe resolveRegionHierarchy oben.
 */
export async function lookupRegionHierarchy(regionText: string): Promise<{ region: string; subregion?: string }> {
  const index = await loadIndex();
  return resolveRegionHierarchy(regionText, index);
}

export async function lookupTypeForGrape(grapeText: string): Promise<WineType | null> {
  const index = await loadIndex();
  const normalized = normalize(grapeText);
  if (!normalized) return null;
  return findBestLookup(normalized, index.grapeColors);
}

/** Leitet das Land direkt aus einem eingegebenen Produzenten/Weingut ab (Ergaenzung zu lookupCountryForRegion). */
export async function lookupCountryForProducer(producerText: string): Promise<string | null> {
  const index = await loadIndex();
  const normalized = normalize(producerText);
  if (!normalized) return null;
  return findBestLookup(normalized, index.producerCountries);
}

/** Startet das Laden der Referenzdaten schon vorab (z. B. beim Oeffnen des Formulars). */
export function preloadWineReference() {
  void loadIndex();
}
