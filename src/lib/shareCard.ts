import type { Wine } from '../types';
import { WINE_TYPE_LABELS } from '../types';

/**
 * Erstellt eine teilbare Bildkarte (PNG) fuer einen einzelnen Wein - Foto,
 * Name, Bewertung usw. - passend zum aktuell aktiven Theme (hell/dunkel).
 * Folgt dem selben Canvas-Aufbau wie imageCompression.ts (Canvas -> 2D-
 * Kontext -> zeichnen -> canvas.toBlob in ein Promise verpackt).
 */

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

/** Liest einen CSS-Custom-Property-Wert vom aktuellen Theme, mit Fallback. */
function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Zeichnet einen abgerundeten Rechteck-Pfad (nicht gefuellt/gestroked). */
function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/** Bricht Text auf maximal `maxLines` Zeilen um (Wortumbruch anhand `ctx.measureText`). */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  let consumedAll = true;

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) {
        consumedAll = false;
        current = '';
        break;
      }
    } else {
      current = test;
    }
  }
  if (current) {
    if (lines.length < maxLines) {
      lines.push(current);
    } else {
      consumedAll = false;
    }
  }

  if (!consumedAll && lines.length > 0) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[lines.length - 1] = `${last}…`;
  }

  return lines;
}

/** Zeichnet einen einfachen 5-zackigen Stern (gefuellt oder als Umriss). */
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerRadius: number,
  filled: boolean,
  color: string,
): void {
  const innerRadius = outerRadius * 0.42;
  const spikes = 5;
  const step = Math.PI / spikes;
  let rotation = -Math.PI / 2;

  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(rotation) * outerRadius, cy + Math.sin(rotation) * outerRadius);
  for (let i = 0; i < spikes; i++) {
    rotation += step;
    ctx.lineTo(cx + Math.cos(rotation) * innerRadius, cy + Math.sin(rotation) * innerRadius);
    rotation += step;
    ctx.lineTo(cx + Math.cos(rotation) * outerRadius, cy + Math.sin(rotation) * outerRadius);
  }
  ctx.closePath();

  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

/** Laedt ein Bild ueber eine (ggf. fremde) URL, CORS-faehig fuer canvas.toBlob. */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Muss VOR dem Setzen von .src gesetzt werden, sonst greift es nicht.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Foto konnte nicht geladen werden.'));
    img.src = url;
  });
}

/** Zeichnet ein Bild im "cover"-Modus (fuellt das Zielrechteck, zuschneiden statt verzerren). */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const imageRatio = img.width / img.height;
  const targetRatio = width / height;

  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (imageRatio > targetRatio) {
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / targetRatio;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, width, height);
}

/** Platzhalter, falls kein Foto vorhanden ist oder das Laden fehlschlaegt: eine dezente Weinglas-Silhouette. */
function drawPhotoPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  accentColor: string,
): void {
  ctx.save();
  roundedRectPath(ctx, x, y, width, height, 32);
  ctx.clip();

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = accentColor;
  ctx.fillRect(x, y, width, height);

  const cx = x + width / 2;
  const cy = y + height / 2;
  const bowlWidth = Math.min(width, height) * 0.32;
  const bowlHeight = bowlWidth * 1.15;
  const stemWidth = bowlWidth * 0.09;
  const stemHeight = bowlHeight * 0.85;
  const baseWidth = bowlWidth * 0.55;
  const baseHeight = stemHeight * 0.1;

  ctx.globalAlpha = 0.5;
  ctx.fillStyle = accentColor;

  // Kelch (Ellipse).
  ctx.beginPath();
  ctx.ellipse(cx, cy - bowlHeight * 0.3, bowlWidth / 2, bowlHeight / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stiel.
  const stemTop = cy - bowlHeight * 0.3 + bowlHeight / 2 - 4;
  ctx.fillRect(cx - stemWidth / 2, stemTop, stemWidth, stemHeight);

  // Fuss.
  roundedRectPath(ctx, cx - baseWidth / 2, stemTop + stemHeight, baseWidth, baseHeight, baseHeight / 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Zeichnet eine kleine "Pill"-Chip-Beschriftung, mittig um `centerX`, Oberkante bei `y`. */
function drawChipsRow(
  ctx: CanvasRenderingContext2D,
  labels: string[],
  centerX: number,
  y: number,
  accentColor: string,
  textColor: string,
): number {
  if (labels.length === 0) return y;

  ctx.font = "600 28px 'Lora', system-ui, sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const paddingX = 28;
  const chipHeight = 56;
  const gap = 20;
  const chipWidths = labels.map((label) => ctx.measureText(label).width + paddingX * 2);
  const totalWidth = chipWidths.reduce((sum, w) => sum + w, 0) + gap * (labels.length - 1);

  let chipX = centerX - totalWidth / 2;
  for (let i = 0; i < labels.length; i++) {
    const chipWidth = chipWidths[i];

    ctx.save();
    roundedRectPath(ctx, chipX, y, chipWidth, chipHeight, chipHeight / 2);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = accentColor;
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = textColor;
    ctx.fillText(labels[i], chipX + chipWidth / 2, y + chipHeight / 2 + 1);

    chipX += chipWidth + gap;
  }

  ctx.textBaseline = 'alphabetic';
  return y + chipHeight;
}

/**
 * Erzeugt eine teilbare Bildkarte (PNG, Hochformat) fuer einen einzelnen
 * Wein: Foto (oder Platzhalter), Name, Produzent/Jahrgang, Bewertung und
 * Typ/Region als Chips, plus dezentem "Grapino"-Schriftzug im Footer.
 */
export async function generateWineShareCard(wine: Wine, photoUrl: string | null): Promise<Blob> {
  await document.fonts?.ready?.catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Bildbearbeitung wird von diesem Browser nicht unterstuetzt.');

  const colorBg = cssVar('--color-bg', '#f3f2f2');
  const colorSurface = cssVar('--color-surface', '#eae9e9');
  const colorText = cssVar('--color-text', '#201f1d');
  const colorAccent = cssVar('--color-accent', '#b68235');
  const colorBordeaux = cssVar('--color-bordeaux', '#7c2d3a');

  // Hintergrund: dezenter vertikaler Verlauf zwischen den Theme-Tokens.
  const backgroundGradient = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  backgroundGradient.addColorStop(0, colorBg);
  backgroundGradient.addColorStop(1, colorSurface);
  ctx.fillStyle = backgroundGradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Foto (oder Platzhalter) im oberen Bereich der Karte.
  const margin = 48;
  const photoX = margin;
  const photoY = margin;
  const photoWidth = CARD_WIDTH - margin * 2;
  const photoHeight = Math.round(CARD_HEIGHT * 0.56);

  let photoDrawn = false;
  if (photoUrl) {
    try {
      const img = await loadImage(photoUrl);
      ctx.save();
      roundedRectPath(ctx, photoX, photoY, photoWidth, photoHeight, 32);
      ctx.clip();
      drawImageCover(ctx, img, photoX, photoY, photoWidth, photoHeight);
      ctx.restore();
      photoDrawn = true;
    } catch {
      photoDrawn = false;
    }
  }
  if (!photoDrawn) {
    drawPhotoPlaceholder(ctx, photoX, photoY, photoWidth, photoHeight, colorAccent);
  }

  let cursorY = photoY + photoHeight + 84;
  const centerX = CARD_WIDTH / 2;
  const textMaxWidth = CARD_WIDTH - margin * 2;

  // Name (bis zu 2 Zeilen).
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = colorText;
  ctx.font = "700 64px 'Cormorant Garamond', serif";
  const nameLines = wrapText(ctx, wine.name, textMaxWidth, 2);
  const nameLineHeight = 72;
  for (const line of nameLines) {
    ctx.fillText(line, centerX, cursorY);
    cursorY += nameLineHeight;
  }

  // Produzent · Jahrgang.
  const subtitleParts = [wine.producer, wine.vintage != null ? String(wine.vintage) : null].filter(
    (part): part is string => Boolean(part),
  );
  if (subtitleParts.length > 0) {
    ctx.font = "400 34px 'Lora', system-ui, sans-serif";
    ctx.fillStyle = colorAccent;
    ctx.fillText(subtitleParts.join(' · '), centerX, cursorY + 4);
    cursorY += 60;
  } else {
    cursorY += 16;
  }

  // Sterne-Bewertung.
  if (wine.rating) {
    const rating = wine.rating;
    const starRadius = 22;
    const starGap = 58;
    const starsStartX = centerX - (starGap * 4) / 2;
    const starsY = cursorY + 28;
    for (let i = 0; i < 5; i++) {
      drawStar(ctx, starsStartX + i * starGap, starsY, starRadius, i < rating, colorBordeaux);
    }
    cursorY = starsY + 56;
  } else {
    cursorY += 8;
  }

  // Typ / Region als Chips.
  const chipLabels: string[] = [];
  if (wine.wine_type) chipLabels.push(WINE_TYPE_LABELS[wine.wine_type]);
  if (wine.region) chipLabels.push(wine.region);
  if (chipLabels.length > 0) {
    drawChipsRow(ctx, chipLabels, centerX, cursorY, colorAccent, colorText);
  }

  // Footer-Wortmarke.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = "600 30px 'Cormorant Garamond', serif";
  ctx.fillStyle = colorAccent;
  ctx.fillText('Grapino', centerX, CARD_HEIGHT - 44);

  try {
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Bild konnte nicht erstellt werden.'))),
        'image/png',
      );
    });
  } catch {
    throw new Error('Bild konnte nicht erstellt werden.');
  }
}

/**
 * Ergebnis von shareOrDownloadWineCard - "shared", wenn die native
 * Share-Sheet uebernommen hat (die gibt selbst eine Betriebssystem-eigene
 * Rueckmeldung), "downloaded", wenn stattdessen die Datei heruntergeladen
 * wurde (dafuer zeigt der Aufrufer eine eigene Bestaetigung, siehe
 * WineDetailPage.tsx - ohne diese Unterscheidung wirkt ein Download fuer
 * technisch ungeuebte Nutzer wie "nichts ist passiert").
 */
export type ShareResult = 'shared' | 'downloaded';

/**
 * Teilt die generierte Weinkarte ueber die native Share-Sheet (falls vom
 * Browser unterstuetzt), oder laedt sie andernfalls als PNG-Datei herunter.
 */
export async function shareOrDownloadWineCard(wine: Wine, photoUrl: string | null): Promise<ShareResult> {
  const blob = await generateWineShareCard(wine, photoUrl);
  const filename = `${wine.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-grapino.png`;
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: wine.name, text: 'Aus meiner Weinsammlung' });
      return 'shared';
    } catch (error) {
      // Nutzer hat die native Share-Sheet einfach abgebrochen - kein Fehler,
      // sondern normales Verhalten, still ignorieren.
      if (error instanceof DOMException && error.name === 'AbortError') return 'shared';
      // Jeder andere Fehler (z. B. echter Share-Fehler) wird weitergereicht,
      // statt ihn stillschweigend durch den Download-Fallback zu verdecken.
      throw error;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return 'downloaded';
}
