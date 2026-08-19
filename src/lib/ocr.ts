import { createWorker, PSM, type Worker } from 'tesseract.js';
import { matchWineReferences, lookupCountryForRegion } from './wineReference';
import type { WineType } from '../types';

// Weinetiketten sind ueberwiegend Deutsch/Englisch, Franzoesisch, Italienisch
// oder Spanisch (Bordeaux, Barolo, Rioja ...) - vorher nur deu+eng erkannt,
// was bei diesen sehr haeufigen Etiketten Genauigkeit gekostet hat. Fuenf
// Sprachpakete brauchen aber laenger zum Laden als zwei - der Worker wird
// deshalb einmal vorab im Hintergrund erstellt (preloadOcrWorker, direkt beim
// Oeffnen des Formulars) und danach fuer jedes Foto wiederverwendet, statt bei
// jedem Foto neu zu laden. So bleibt das 20s-Zeitlimit fuers eigentliche
// Erkennen realistisch, auch mit mehr Sprachen.
let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('deu+eng+fra+ita+spa')
      .then(async (worker) => {
        // Etiketten haben keinen durchgehenden Fliesstext, sondern verstreute
        // Textbloecke an unterschiedlichen Stellen (Name oben, Rebsorte/Region
        // klein am Rand, Prozentzahl unten ...). Der Standardmodus (AUTO)
        // erwartet dagegen ein einzelnes zusammenhaengendes Layout und
        // uebersieht dabei oft kleinere, abseits stehende Textblöcke. SPARSE_TEXT
        // ist fuer genau dieses Muster gedacht - sucht gezielt nach einzelnen
        // Textinseln irgendwo im Bild.
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
        return worker;
      })
      .catch((e) => {
        workerPromise = null; // beim naechsten Versuch neu probieren, nicht dauerhaft haengen bleiben
        throw e;
      });
  }
  return workerPromise;
}

/** Startet das Laden des OCR-Modells im Hintergrund, bevor ueberhaupt ein Foto gewaehlt wurde. */
export function preloadOcrWorker() {
  void getWorker();
}

const COMBINING_MARKS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g');
function normalize(s: string): string {
  return s.normalize('NFD').replace(COMBINING_MARKS_REGEX, '').toLowerCase().trim();
}

export interface OcrSuggestions {
  name?: string;
  producer?: string;
  vintage?: number;
  grapeVariety?: string;
  region?: string;
  /** Aus der erkannten Region abgeleitet (z. B. Pauillac -> Frankreich). */
  country?: string;
  /** Aus der erkannten Rebsorte abgeleitet (z. B. Nebbiolo -> Rot) - nur ein Vorschlag. */
  wineType?: WineType;
  /** Alle brauchbar erkannten Textfragmente - fuers manuelle Zuordnen per Ziehen auf ein Feld. */
  chips: string[];
}

const MAX_CHIPS = 14;

const MIN_VINTAGE = 1900;
const MAX_VINTAGE = 2026; // wie in den Anforderungen spezifiziert (4-stellige Zahl 1900-2026)

// Woerter, die auf Etiketten haeufig vorkommen, aber Stilangaben und keine
// Namen sind - sollen nie als Wein-/Produzentenname vorgeschlagen werden.
const STOPWORDS = new Set(
  [
    'trocken',
    'halbtrocken',
    'lieblich',
    'suess',
    'süß',
    'dry',
    'sec',
    'demi-sec',
    'blanco',
    'tinto',
    'rosado',
    'rose',
    'rosé',
    'brut',
    'sekt',
    'classic',
    'reserva',
    'gran reserva',
    'crianza',
    'appellation',
    'mis en bouteille',
    'product of',
    'produce of',
    'estate bottled',
    'vino',
    'wine',
    'wein',
    'qualitaetswein',
    'qualitätswein',
    'denominacion',
    'denominación',
    'denominazione',
    'indicazione',
    'geografica',
    'tipica',
    'controllata',
    'garantita',
    'controlee',
    'contrôlée',
    'geschuetzte',
    'geschützte',
    'ursprungsbezeichnung',
    'origine',
    'origin',
    'protegida',
    'reserve',
    'superiore',
    'riserva',
    'selectionne',
    'sélectionné',
    'propriete',
    'propriété',
    'grandvin',
    'grand vin',
    'chateau',
    'bottled',
    'imported',
    'produced',
    'contains',
    'sulfites',
    'sulfite',
    'alcohol',
    'volume',
    // Zusaetzliche franz./ital./span. Stil- und Verwaltungsbegriffe, seit die
    // Texterkennung auch diese Sprachen liest (siehe createWorker unten) -
    // ohne diese wuerden sie faelschlich als Name/Produzent vorgeschlagen.
    'récolte',
    'recolte',
    'vendange',
    'cuvée',
    'cuvee',
    'grand cru',
    'premier cru',
    'vin de pays',
    'indication géographique',
    'indication geographique',
    'protégée',
    'protegee',
    'annata',
    'imbottigliato',
    'prodotto',
    'azienda',
    'tenuta',
    'cosecha',
    'embotellado',
    'elaborado',
  ].map((w) => w.toLowerCase()),
);

// EU-Weinrecht schreibt fuer geschuetzte Herkunftsbezeichnungen eine
// standardisierte Formulierung auf dem Etikett vor - "Appellation <Region>
// Controlee" (Frankreich), "Denominazione di Origine (Controllata) <Region>"
// (Italien), "Denominacion de Origen <Region>" (Spanien). Das direkt vom
// Etikett abzulesen ist zuverlaessiger als jeder Datenbank-Abgleich, weil es
// die Region nicht erraten, sondern wortwoertlich vom Etikett selbst uebernimmt
// - funktioniert auch fuer kleine Lagen/Unterregionen, die in keiner Liste stehen
// (z. B. "Pomerol"), und macht sie zusaetzlich fuer die Name-Heuristik unten
// "geclaimed", damit ein grosser, gut lesbarer Regionsname nicht faelschlich
// als Wein-Name vorgeschlagen wird.
const APPELLATION_PATTERNS = [
  /appellation\s+([\p{L}][\p{L}\s'’-]{2,38}?)\s+(?:controlee|contr[oô]l[eé]e|protegee|prot[eé]g[eé]e)/iu,
  /denominazione\s+di\s+origine\s+(?:controllata\s+e\s+garantita|controllata)\s*[:\-]?\s*([\p{L}][\p{L}\s'’-]{2,38})/iu,
  /denominaci[oó]n\s+de\s+origen\s+(?:calificada\s+)?([\p{L}][\p{L}\s'’-]{2,38})/iu,
];

function extractLabeledRegion(text: string): string | undefined {
  for (const pattern of APPELLATION_PATTERNS) {
    const match = text.match(pattern);
    const candidate = match?.[1]?.trim().replace(/\s{2,}/g, ' ');
    if (candidate && candidate.length >= 3) return candidate;
  }
  return undefined;
}

const MIN_WORD_CONFIDENCE = 55;
// Bewusst hoch angesetzt: ein falscher Vorschlag (z. B. ein OCR-Fragment wie
// "Sing" statt "Riesling") ist schlimmer als gar keiner, weil ihn jemand auf
// den ersten Blick fuer richtig halten koennte. Lieber leer lassen und der
// Nutzer traegt es manuell ein, als selbstbewusst falsch raten.
const MIN_CANDIDATE_LETTERS = 5;

/**
 * Liest den Text vom fotografierten Etikett (Tesseract.js, laeuft komplett im
 * Browser - keine API-Kosten) und leitet Vorschlaege fuer Name, Produzent,
 * Jahrgang, Rebsorte und Region ab. Liefert bestenfalls unvollstaendige/leere
 * Ergebnisse zurueck, wirft aber nur bei einem echten technischen Fehler.
 */
export async function recognizeWineLabel(image: Blob): Promise<OcrSuggestions> {
  const worker = await getWorker();
  const { data } = await worker.recognize(image);
  return await parseRecognitionResult(data.words ?? []);
}

export interface RecognizedWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface PhraseCandidate {
  text: string;
}

// Grosszuegiger Abstand (relativ zur Wortgroesse), innerhalb dessen zwei
// Woerter noch als Teil derselben Phrase gelten - Etikett-Schriftarten haben
// oft ungewoehnliche Laufweiten, deshalb bewusst nicht zu eng.
const MAX_PHRASE_GAP_FACTOR = 1.4;
// Wie stark sich die vertikale Mitte zweier Woerter unterscheiden darf, um
// noch als "gleiche Zeile" zu gelten.
const MAX_LINE_OFFSET_FACTOR = 0.6;

function wordHeight(w: RecognizedWord): number {
  return Math.max(1, w.bbox.y1 - w.bbox.y0);
}

function sameLine(a: RecognizedWord, b: RecognizedWord): boolean {
  const centerA = (a.bbox.y0 + a.bbox.y1) / 2;
  const centerB = (b.bbox.y0 + b.bbox.y1) / 2;
  return Math.abs(centerA - centerB) <= MAX_LINE_OFFSET_FACTOR * Math.max(wordHeight(a), wordHeight(b));
}

function closeEnough(a: RecognizedWord, b: RecognizedWord): boolean {
  const gap = b.bbox.x0 - a.bbox.x1;
  // gap > -Hoehe verhindert, dass stark ueberlappende (z. B. doppelt
  // erkannte) Woerter faelschlich verschmolzen werden.
  return gap <= MAX_PHRASE_GAP_FACTOR * Math.max(wordHeight(a), wordHeight(b)) && gap > -wordHeight(a);
}

/**
 * Fasst geometrisch benachbarte Woerter auf derselben Zeile zu einer Phrase
 * zusammen (z. B. "Domaine" + "de" + "Chevalier" -> "Domaine de Chevalier"),
 * statt jedes Wort einzeln als moeglichen Namen zu werten. Ausgeschlossene
 * Woerter (Stopwoerter, Jahrgang, bereits als Region/Produzent erkannte
 * Woerter - siehe Aufruf unten) wurden vorher schon herausgefiltert - eine
 * Luecke an ihrer Stelle beendet die Phrase automatisch, ohne dass sie extra
 * behandelt werden muss.
 */
export function buildPhrases(orderedWords: RecognizedWord[]): PhraseCandidate[] {
  const phrases: PhraseCandidate[] = [];
  let current: RecognizedWord[] = [];
  for (const word of orderedWords) {
    const prev = current[current.length - 1];
    if (prev && sameLine(prev, word) && closeEnough(prev, word)) {
      current.push(word);
    } else {
      if (current.length) phrases.push({ text: current.map((w) => w.text.trim()).join(' ') });
      current = [word];
    }
  }
  if (current.length) phrases.push({ text: current.map((w) => w.text.trim()).join(' ') });
  return phrases;
}

async function parseRecognitionResult(words: RecognizedWord[]): Promise<OcrSuggestions> {
  const fullText = words.map((w) => w.text).join(' ');
  const vintage = extractVintage(fullText);

  // Region direkt vom Etikett ablesen (siehe Kommentar oben), bevor der
  // Datenbank-Abgleich laeuft - hat Vorrang, weil vom Etikett selbst.
  const labeledRegion = extractLabeledRegion(fullText);

  // Abgleich gegen echte Rebsorten/Weingueter/Regionen (Wikidata) - das
  // Ergebnis wird gleich benutzt, um genau diese Woerter von der
  // Name/Produzent-Heuristik auszuschliessen (siehe claimedNormalized unten).
  const referenceMatches = await matchWineReferences(fullText);
  const region = labeledRegion ?? referenceMatches.region;

  // Land aus der TATSAECHLICH verwendeten Region ableiten (nicht blind aus
  // referenceMatches.country uebernehmen) - falls "region" von der
  // Etikett-Regel (labeledRegion) statt vom Datenbank-Abgleich stammt, muss
  // das Land trotzdem zu genau diesem Regionsnamen passen.
  const country = region ? await lookupCountryForRegion(region) : null;

  // Was schon als Region/Weingut erkannt wurde, darf nicht NOCHMAL als
  // Wein-Name vorgeschlagen werden - genau das war der gemeldete Bug: eine
  // lang und sicher erkannte Region (z. B. "Pomerol") schlug bisher rein
  // nach Textlaenge den eigentlichen Namen und wurde faelschlich als Name
  // vorgeschlagen. Die Rebsorte wird bewusst NICHT ausgeschlossen - viele
  // einfache Weine heissen tatsaechlich genau wie ihre Rebsorte (z. B. ein
  // schlichter "Riesling").
  const claimedNormalized = [region, referenceMatches.producer].filter((v): v is string => !!v).map(normalize);

  // Erst einzelne Woerter aussieben (Vertrauen/Jahrgang/Stopwoerter/bereits
  // erkannte Region-Produzent-Woerter) - danach werden die UEBRIGGEBLIEBENEN
  // Woerter zu Phrasen zusammengefasst (siehe buildPhrases oben), damit
  // mehrwortige Namen wie "Domaine de Chevalier" nicht nur als einzelnes
  // Wort ("Chevalier") erkannt werden. Kurze Bindewoerter ("de", "of", "von")
  // duerfen hier durchrutschen, damit sie eine Phrase nicht abreissen lassen
  // - die Mindestlaenge wird stattdessen auf die ganze Phrase angewendet.
  const filteredWords = words
    .filter((w) => w.confidence >= MIN_WORD_CONFIDENCE)
    .filter((w) => w.text.replace(/[^\p{L}]/gu, '').length >= 1)
    .filter((w) => !/\b(19|20)\d{2}\b/.test(w.text))
    .filter((w) => !STOPWORDS.has(w.text.trim().toLowerCase()))
    .filter((w) => !claimedNormalized.some((claimed) => claimed.includes(normalize(w.text))));

  const candidates = buildPhrases(filteredWords)
    .filter((p) => p.text.replace(/[^\p{L}]/gu, '').length >= MIN_CANDIDATE_LETTERS)
    .sort((a, b) => b.text.length - a.text.length);

  const name = candidates[0]?.text.trim();
  let producer = candidates.find((c) => c.text.trim() !== name)?.text.trim();
  if (referenceMatches.producer) producer = referenceMatches.producer;

  // Alles, was fuer ein Feld in Frage kaeme, steht zusaetzlich als Vorschlag
  // ("Chip") zur Verfuegung - so faellt nichts weg, nur weil die Heuristik
  // es dem "falschen" Feld zugeordnet (oder gar keinem) haette. Der Nutzer
  // zieht es im Formular selbst auf das passende Feld.
  const chipSet = new Set<string>();
  if (vintage) chipSet.add(String(vintage));
  if (region) chipSet.add(region);
  if (referenceMatches.grapeVariety) chipSet.add(referenceMatches.grapeVariety);
  if (referenceMatches.producer) chipSet.add(referenceMatches.producer);
  for (const c of candidates) chipSet.add(c.text.trim());
  const chips = Array.from(chipSet).slice(0, MAX_CHIPS);

  return {
    name,
    producer,
    vintage,
    grapeVariety: referenceMatches.grapeVariety,
    region,
    country: country ?? undefined,
    wineType: referenceMatches.wineType,
    chips,
  };
}

function extractVintage(text: string): number | undefined {
  const matches = text.match(/\b(19|20)\d{2}\b/g);
  if (!matches) return undefined;
  const inRange = matches.map(Number).filter((y) => y >= MIN_VINTAGE && y <= MAX_VINTAGE);
  return inRange[0];
}
