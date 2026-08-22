import { supabase } from '../supabaseClient';
import type { FieldConfidence, OcrField, OcrSuggestions } from './ocr';
import type { WineType } from '../types';

const LABEL_FIELDS: OcrField[] = [
  'name',
  'producer',
  'vintage',
  'grapeVariety',
  'region',
  'subregion',
  'country',
  'wineType',
];

interface LabelRecognitionResult {
  name: string | null;
  producer: string | null;
  vintage: number | null;
  grapeVariety: string | null;
  region: string | null;
  subregion: string | null;
  country: string | null;
  wineType: WineType | null;
  uncertainFields: OcrField[];
  fullText: string;
  chips: string[];
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // "data:image/jpeg;base64,XXXX" -> nur der Teil nach dem Komma.
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Bild konnte nicht gelesen werden.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Liest ein Weinetikett per KI-Bilderkennung (siehe api/recognize-label.ts) -
 * deutlich zuverlaessiger als die bisherige Tesseract-OCR, besonders bei
 * kunstvoller Schrift oder schwierigen Fotobedingungen. Liest AUSSCHLIESSLICH
 * das, was auf dem Etikett steht - kein Trinkfenster/Kritiker-Punkte/
 * Passt-zu (die kommen ausschliesslich aus dem geprueften
 * wine_knowledge_cache, siehe wineKnowledgeCache.ts).
 *
 * Wirft bei jedem Fehler (Netzwerk, Tageslimit, Serverfehler) - der Aufrufer
 * (processPhoto in WineFormPage.tsx) faengt das ab und faellt automatisch
 * auf die bestehende Tesseract-Erkennung zurueck.
 */
export async function recognizeLabelWithAi(image: Blob): Promise<OcrSuggestions> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Nicht angemeldet.');

  const base64 = await blobToBase64(image);

  const res = await fetch('/api/recognize-label', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ image: base64 }),
  });
  if (!res.ok) {
    throw new Error(`KI-Etikett-Erkennung fehlgeschlagen (${res.status}).`);
  }
  const data = (await res.json()) as LabelRecognitionResult;

  const confidence: Partial<Record<OcrField, FieldConfidence>> = {};
  for (const field of LABEL_FIELDS) {
    if (data[field] !== null) {
      confidence[field] = data.uncertainFields.includes(field) ? 'low' : 'high';
    }
  }

  return {
    name: data.name ?? undefined,
    producer: data.producer ?? undefined,
    vintage: data.vintage ?? undefined,
    grapeVariety: data.grapeVariety ?? undefined,
    region: data.region ?? undefined,
    subregion: data.subregion ?? undefined,
    country: data.country ?? undefined,
    wineType: data.wineType ?? undefined,
    chips: data.chips.slice(0, 20),
    fullText: data.fullText,
    confidence,
  };
}
