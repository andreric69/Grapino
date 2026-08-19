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
    ])
      .then(([reference, regionCountries, grapeColors, producerCountries]) => ({
        grapeVarieties: buildIndex(reference.grapeVarieties),
        wineries: buildIndex(reference.wineries),
        regions: buildIndex(reference.regions),
        regionCountries: buildLookupIndex(regionCountries.map((e) => [e.region, e.country])),
        grapeColors: buildLookupIndex([
          ...grapeColors.rot.map((g): [string, WineType] => [g, 'rot']),
          ...grapeColors.weiss.map((g): [string, WineType] => [g, 'weiss']),
        ]),
        producerCountries: buildLookupIndex(producerCountries.map((e) => [e.producer, e.country])),
      }))
      .catch((e) => {
        console.error('Wein-Referenzdaten konnten nicht geladen werden:', e);
        indexPromise = null;
        return { grapeVarieties: [], wineries: [], regions: [], regionCountries: [], grapeColors: [], producerCountries: [] };
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

export interface WineReferenceMatches {
  producer?: string;
  grapeVariety?: string;
  region?: string;
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
    matches.region = region;
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

/** Leitet Land/Typ direkt aus manuell eingegebenem Text ab (Region bzw. Rebsorte), fuer die Live-Vorschlaege im Formular. */
export async function lookupCountryForRegion(regionText: string): Promise<string | null> {
  const index = await loadIndex();
  const normalized = normalize(regionText);
  if (!normalized) return null;
  return findBestLookup(normalized, index.regionCountries);
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
