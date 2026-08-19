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
