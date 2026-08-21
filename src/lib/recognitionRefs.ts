import { supabase } from '../supabaseClient';
import { cosineSimilarity } from './labelEmbedding';
import type { WineType } from '../types';

export interface RecognitionRefFields {
  name: string;
  producer: string | null;
  vintage: number | null;
  grapeVariety: string | null;
  region: string | null;
  subregion: string | null;
  country: string | null;
  wineType: WineType | null;
}

export interface RecognitionRef extends RecognitionRefFields {
  wineId: string;
  ocrText: string | null;
  embedding: number[] | null;
}

interface RecognitionRefRow {
  wine_id: string;
  ocr_text: string | null;
  embedding: string | number[] | null;
  name: string;
  producer: string | null;
  vintage: number | null;
  grape_variety: string | null;
  region: string | null;
  subregion: string | null;
  country: string | null;
  wine_type: WineType | null;
}

// pgvector liefert die "vector"-Spalte ueber PostgREST als Text ("[0.1,0.2,...]"),
// nicht als JSON-Array - muss deshalb selbst geparst werden.
function parseEmbedding(value: string | number[] | null): number[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function rowToRef(row: RecognitionRefRow): RecognitionRef {
  return {
    wineId: row.wine_id,
    ocrText: row.ocr_text,
    embedding: parseEmbedding(row.embedding),
    name: row.name,
    producer: row.producer,
    vintage: row.vintage,
    grapeVariety: row.grape_variety,
    region: row.region,
    subregion: row.subregion,
    country: row.country,
    wineType: row.wine_type,
  };
}

/**
 * Laedt alle eigenen, bisher bestaetigten Wein-Referenzen (RLS beschraenkt
 * das ohnehin auf den eigenen Account) - bei einer privaten Sammlung
 * realistisch nur ein paar hundert Zeilen, deshalb bewusst alles auf einmal
 * geladen und der Abgleich (Text- und Bildaehnlichkeit) im Browser gerechnet,
 * statt dafuer eine eigene Datenbank-Funktion zu brauchen.
 */
export async function listRecognitionRefs(): Promise<RecognitionRef[]> {
  const { data, error } = await supabase
    .from('wine_recognition_refs')
    .select('wine_id, ocr_text, embedding, name, producer, vintage, grape_variety, region, subregion, country, wine_type');
  if (error) {
    console.error('Referenzen konnten nicht geladen werden:', error);
    return [];
  }
  return (data as RecognitionRefRow[]).map(rowToRef);
}

/** Schreibt/aktualisiert die Referenz fuer einen Wein (ein Eintrag pro Wein, ueberschrieben bei jeder erneuten Bestaetigung/Korrektur). */
export async function upsertRecognitionRef(ref: RecognitionRef): Promise<void> {
  const { error } = await supabase.from('wine_recognition_refs').upsert(
    {
      wine_id: ref.wineId,
      ocr_text: ref.ocrText,
      embedding: ref.embedding,
      name: ref.name,
      producer: ref.producer,
      vintage: ref.vintage,
      grape_variety: ref.grapeVariety,
      region: ref.region,
      subregion: ref.subregion,
      country: ref.country,
      wine_type: ref.wineType,
    },
    { onConflict: 'wine_id' },
  );
  if (error) console.error('Referenz konnte nicht gespeichert werden:', error);
}

const EMBEDDING_MATCH_THRESHOLD = 0.9;

/** Bester Bildaehnlichkeits-Treffer ueber dem Schwellwert, oder null. */
export function bestEmbeddingMatch(refs: RecognitionRef[], embedding: number[]): RecognitionRef | null {
  let best: RecognitionRef | null = null;
  let bestScore = EMBEDDING_MATCH_THRESHOLD;
  for (const ref of refs) {
    if (!ref.embedding) continue;
    const score = cosineSimilarity(embedding, ref.embedding);
    if (score > bestScore) {
      best = ref;
      bestScore = score;
    }
  }
  return best;
}

const COMBINING_MARKS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g');
function normalize(s: string): string {
  return s.normalize('NFD').replace(COMBINING_MARKS_REGEX, '').toLowerCase();
}

const MIN_TOKEN_LENGTH = 4;
function significantTokens(text: string): Set<string> {
  return new Set(normalize(text).split(/[^\p{L}0-9]+/u).filter((t) => t.length >= MIN_TOKEN_LENGTH));
}

// Zwei Fotos desselben Etiketts liefern nie exakt denselben OCR-Text
// (anderer Winkel/Ausschnitt/Beleuchtung aendert Wortreihenfolge und
// erzeugt neues Rauschen) - ein Wortmengen-Abgleich (wie viele der
// nennenswerten Woerter im jeweils anderen Text wieder auftauchen) ist
// robuster als ein reiner Zeichen-Abstand (Levenshtein) auf dem gesamten Text.
function tokenOverlapScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / Math.min(a.size, b.size);
}

const TEXT_MATCH_THRESHOLD = 0.6;

/** Bester Text-Aehnlichkeits-Treffer ueber dem Schwellwert, oder null. */
export function bestTextMatch(refs: RecognitionRef[], ocrFullText: string): RecognitionRef | null {
  const queryTokens = significantTokens(ocrFullText);
  if (queryTokens.size === 0) return null;
  let best: RecognitionRef | null = null;
  let bestScore = TEXT_MATCH_THRESHOLD;
  for (const ref of refs) {
    if (!ref.ocrText) continue;
    const score = tokenOverlapScore(queryTokens, significantTokens(ref.ocrText));
    if (score > bestScore) {
      best = ref;
      bestScore = score;
    }
  }
  return best;
}
