import { pipeline, type ImageFeatureExtractionPipeline } from '@huggingface/transformers';

/**
 * Berechnet einen visuellen "Fingerabdruck" (Embedding-Vektor) eines
 * Etikettfotos, komplett im Browser (WebAssembly, keine API-Kosten) - damit
 * ein spaeter erneut fotografiertes, bereits bekanntes Etikett per
 * Bildaehnlichkeit wiedererkannt werden kann (siehe recognitionRefs.ts),
 * statt jedes Mal neu per Texterkennung geraten zu werden. Laedt beim ersten
 * Aufruf ein kleines Bild-Modell von Hugging Face nach (einmaliger Download,
 * danach vom Browser gecacht) - schlaegt der Download/das Laden fehl (z. B.
 * keine Internetverbindung beim allerersten Einsatz), wird das Feature still
 * uebersprungen statt die Foto-Erkennung insgesamt zu blockieren.
 */
let extractorPromise: Promise<ImageFeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<ImageFeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32').catch((e) => {
      extractorPromise = null; // beim naechsten Versuch neu probieren, nicht dauerhaft haengen bleiben
      throw e;
    });
  }
  return extractorPromise;
}

/** Startet das Laden des Embedding-Modells im Hintergrund, bevor ueberhaupt ein Foto gewaehlt wurde. */
export function preloadLabelEmbeddingModel() {
  void getExtractor().catch(() => {
    /* nur Vorab-Laden - ein Fehlschlag hier ist kein Problem, computeLabelEmbedding versucht es bei Bedarf erneut */
  });
}

/** Liefert null bei jedem Fehler (kein Netz beim ersten Laden, Modell nicht verfuegbar ...) statt zu werfen - die Wiedererkennung ist immer nur eine Zusatzfunktion, nie Voraussetzung fuers Speichern. */
export async function computeLabelEmbedding(image: Blob): Promise<number[] | null> {
  try {
    const extractor = await getExtractor();
    const url = URL.createObjectURL(image);
    try {
      const output = await extractor(url);
      return normalizeVector(Array.from(output.data as ArrayLike<number>));
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (e) {
    console.error('Bild-Embedding fehlgeschlagen:', e);
    return null;
  }
}

// Die Bild-Pipeline liefert den gepoolten Vektor nicht normalisiert - selbst
// auf Einheitslaenge bringen, damit cosineSimilarity unten mit einem reinen
// Skalarprodukt auskommt.
function normalizeVector(v: number[]): number[] {
  let sumSquares = 0;
  for (const x of v) sumSquares += x * x;
  const norm = Math.sqrt(sumSquares) || 1;
  return v.map((x) => x / norm);
}

/** Kosinus-Aehnlichkeit zweier gleich langer Vektoren - bei bereits normalisierten Vektoren (siehe normalize oben) reicht das reine Skalarprodukt. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}
