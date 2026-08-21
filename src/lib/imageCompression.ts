/**
 * Skaliert ein Foto clientseitig auf maximal `maxWidth` Breite und komprimiert
 * es als JPEG - damit das kostenlose Supabase-Storage-Kontingent (1 GB)
 * moeglichst lange reicht.
 */
export async function compressImage(file: Blob, maxWidth = 1500, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Bildbearbeitung wird von diesem Browser nicht unterstuetzt.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Bildkomprimierung fehlgeschlagen.'))),
      'image/jpeg',
      quality,
    );
  });
}

/**
 * Schneidet ein Foto auf einen Ausschnitt zu (Werte 0-1, relativ zur
 * Bildgroesse - siehe LabelCropper). Arbeitet auf der vollen Original-
 * aufloesung, nicht auf einer bereits verkleinerten Vorschau, damit beim
 * Zuschneiden keine Detailschaerfe verloren geht.
 */
export async function cropImage(
  image: Blob,
  rect: { x: number; y: number; width: number; height: number },
): Promise<Blob> {
  const bitmap = await createImageBitmap(image, { imageOrientation: 'from-image' });
  const sx = Math.round(rect.x * bitmap.width);
  const sy = Math.round(rect.y * bitmap.height);
  const sw = Math.max(1, Math.round(rect.width * bitmap.width));
  const sh = Math.max(1, Math.round(rect.height * bitmap.height));

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Bildbearbeitung wird von diesem Browser nicht unterstuetzt.');
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Zuschneiden fehlgeschlagen.'))), 'image/jpeg', 0.9);
  });
}

/**
 * Bereitet eine separate Kopie des Fotos speziell fuer die Texterkennung vor
 * (Graustufen + Kontrastspreizung) - verbessert erfahrungsgemaess die
 * Lesbarkeit bei ungleichmaessig beleuchteten/spiegelnden Flaschenetiketten,
 * ohne das eigentliche, gespeicherte Farbfoto zu veraendern. Bewusst nur
 * Graustufen + lineare Kontrastspreizung (kein hartes Schwarz-Weiss-
 * Schwellwertverfahren) - das ist robuster gegenueber Lichtreflexen als eine
 * aggressive Binarisierung.
 */
export async function preprocessForOcr(image: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(image, { imageOrientation: 'from-image' });
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Bildbearbeitung wird von diesem Browser nicht unterstuetzt.');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const pixelCount = data.length / 4;
  const gray = new Uint8ClampedArray(pixelCount);

  let min = 255;
  let max = 0;
  for (let i = 0; i < pixelCount; i++) {
    const o = i * 4;
    const g = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
    gray[i] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }

  const range = Math.max(1, max - min);
  for (let i = 0; i < pixelCount; i++) {
    const o = i * 4;
    const stretched = ((gray[i] - min) / range) * 255;
    data[o] = data[o + 1] = data[o + 2] = stretched;
  }
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Bildaufbereitung fehlgeschlagen.'))), 'image/png');
  });
}
