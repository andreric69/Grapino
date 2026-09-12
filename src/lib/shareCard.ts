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

/** Ein einzelnes, laenglich-ovales Weinblatt (gefuellter Canvas-Pfad), lokal um (0,0) gedreht. */
function drawLeafShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.68, -size * 0.55, 0, -size);
  ctx.quadraticCurveTo(-size * 0.68, -size * 0.55, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Wasserzeichen-artige Ranken-Illustration (reiner Canvas-Pfad, kein Bild-
 * Asset) fuer eine Karten-Ecke - sehr geringe Deckkraft, rein dekorative
 * Textur passend zur Bordeaux/Gold-Weinsammlung-Aesthetik der App.
 */
function drawVineMotif(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  scale: number,
  color: string,
  alpha: number,
  mirrorX: boolean,
): void {
  ctx.save();
  ctx.translate(anchorX, anchorY);
  ctx.scale(mirrorX ? -scale : scale, -scale);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  // Geschwungener Rankenstiel.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(28, 42, 8, 92, 54, 122);
  ctx.bezierCurveTo(88, 146, 78, 178, 38, 196);
  ctx.stroke();

  drawLeafShape(ctx, 18, 58, 36, 0.55);
  drawLeafShape(ctx, 58, 142, 32, -0.35);

  // Kleine Traubenbeeren am oberen Rankenende.
  const berries: Array<[number, number]> = [
    [42, 112],
    [56, 128],
    [30, 132],
    [46, 148],
  ];
  for (const [bx, by] of berries) {
    ctx.beginPath();
    ctx.arc(bx, by, 7.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Kleines Trauben-Symbol (Beeren + Blatt) als wiederkehrende Marke neben dem "Grapino"-Schriftzug. */
function drawGrapeMark(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  size: number,
  color: string,
): void {
  ctx.save();
  ctx.fillStyle = color;
  const r = size * 0.11;
  const dots: Array<[number, number]> = [
    [-0.32, -0.78],
    [0.32, -0.78],
    [-0.64, -0.5],
    [0, -0.5],
    [0.64, -0.5],
    [-0.32, -0.2],
    [0.32, -0.2],
  ];
  for (const [fx, fy] of dots) {
    ctx.beginPath();
    ctx.arc(cx + fx * size, baseY + fy * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Kleines Blatt oberhalb der Traube.
  ctx.beginPath();
  ctx.moveTo(cx, baseY - size * 0.78);
  ctx.quadraticCurveTo(cx + size * 0.5, baseY - size * 1.05, cx + size * 0.06, baseY - size * 1.3);
  ctx.quadraticCurveTo(cx - size * 0.42, baseY - size * 1.02, cx, baseY - size * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Fusszeile mit duenner Trennlinie, kleinem Trauben-Symbol und dem
 * "Grapino"-Schriftzug - gemeinsames wiederkehrendes Familien-Element mit
 * yearRecapCard.ts, damit beide Karten erkennbar zusammengehoeren. Erwartet,
 * dass `ctx.font`/`ctx.fillStyle` fuer den Schriftzug bereits gesetzt sind.
 */
function drawFooterMark(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  baselineY: number,
  color: string,
  dividerAlpha: number,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = dividerAlpha;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 54, baselineY - 34);
  ctx.lineTo(centerX + 54, baselineY - 34);
  ctx.stroke();
  ctx.restore();

  const textWidth = ctx.measureText(text).width;
  const glyphSize = 24;
  const gap = 14;
  const totalWidth = glyphSize * 0.9 + gap + textWidth;
  const startX = Math.round(centerX - totalWidth / 2);

  drawGrapeMark(ctx, startX + glyphSize * 0.45, baselineY - 7, glyphSize, color);

  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  ctx.fillText(text, Math.round(startX + glyphSize * 0.9 + gap), baselineY);
  ctx.textAlign = prevAlign;
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

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = accentColor;
  ctx.fillRect(x, y, width, height);

  const cx = x + width / 2;
  const cy = y + height / 2;

  // Weicher Lichthof hinter dem Glas fuer mehr Tiefe.
  ctx.globalAlpha = 0.12;
  ctx.beginPath();
  ctx.arc(cx, cy - height * 0.02, Math.min(width, height) * 0.36, 0, Math.PI * 2);
  ctx.fill();

  const bowlWidth = Math.min(width, height) * 0.32;
  const bowlHeight = bowlWidth * 1.15;
  const stemWidth = bowlWidth * 0.09;
  const stemHeight = bowlHeight * 0.85;
  const baseWidth = bowlWidth * 0.55;
  const baseHeight = stemHeight * 0.1;
  const bowlCy = cy - bowlHeight * 0.3;

  ctx.globalAlpha = 0.5;
  ctx.fillStyle = accentColor;

  // Kelch (Ellipse).
  ctx.beginPath();
  ctx.ellipse(cx, bowlCy, bowlWidth / 2, bowlHeight / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stiel.
  const stemTop = bowlCy + bowlHeight / 2 - 4;
  ctx.fillRect(cx - stemWidth / 2, stemTop, stemWidth, stemHeight);

  // Fuss.
  roundedRectPath(ctx, cx - baseWidth / 2, stemTop + stemHeight, baseWidth, baseHeight, baseHeight / 2);
  ctx.fill();

  // Feine Umriss-Linie am Kelch fuer mehr Praezision/Politur.
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(cx, bowlCy, bowlWidth / 2, bowlHeight / 2, 0, 0, Math.PI * 2);
  ctx.stroke();

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

  let chipX = Math.round(centerX - totalWidth / 2);
  for (let i = 0; i < labels.length; i++) {
    const chipWidth = Math.round(chipWidths[i]);

    ctx.save();
    roundedRectPath(ctx, chipX, y, chipWidth, chipHeight, chipHeight / 2);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = accentColor;
    ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
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

  // Wasserzeichen-artige Ranken-Illustration in den unteren Ecken, sehr
  // dezent - reine Textur, liegt hinter Foto und Text.
  drawVineMotif(ctx, 8, CARD_HEIGHT - 8, 0.85, colorBordeaux, 0.07, false);
  drawVineMotif(ctx, CARD_WIDTH - 8, CARD_HEIGHT - 8, 0.85, colorBordeaux, 0.07, true);

  // Foto (oder Platzhalter) im oberen Bereich der Karte.
  const margin = 48;
  const photoX = margin;
  const photoY = margin;
  const photoWidth = CARD_WIDTH - margin * 2;
  const photoHeight = Math.round(CARD_HEIGHT * 0.56);
  const photoRadius = 32;

  // Sanfter Schlagschatten unter dem Foto/Platzhalter, damit die Karte wie
  // eine leicht schwebende, hochwertige Fotokarte wirkt statt flach zu sein.
  ctx.save();
  ctx.shadowColor = 'rgba(20, 14, 10, 0.28)';
  ctx.shadowBlur = 44;
  ctx.shadowOffsetY = 20;
  roundedRectPath(ctx, photoX, photoY, photoWidth, photoHeight, photoRadius);
  ctx.fillStyle = colorSurface;
  ctx.fill();
  ctx.restore();

  let photoDrawn = false;
  if (photoUrl) {
    try {
      const img = await loadImage(photoUrl);
      ctx.save();
      roundedRectPath(ctx, photoX, photoY, photoWidth, photoHeight, photoRadius);
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

  // Feiner innerer Verlauf am oberen Fotorand (Tiefe/"Glanz") sowie ein
  // heller Innenring und eine zarte Akzent-Umrandung fuer mehr Politur.
  ctx.save();
  roundedRectPath(ctx, photoX, photoY, photoWidth, photoHeight, photoRadius);
  ctx.clip();
  const innerShade = ctx.createLinearGradient(0, photoY, 0, photoY + photoHeight * 0.3);
  innerShade.addColorStop(0, 'rgba(0, 0, 0, 0.22)');
  innerShade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = innerShade;
  ctx.fillRect(photoX, photoY, photoWidth, photoHeight * 0.3);
  ctx.restore();

  ctx.save();
  roundedRectPath(ctx, photoX + 1.5, photoY + 1.5, photoWidth - 3, photoHeight - 3, photoRadius - 1.5);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  roundedRectPath(ctx, photoX, photoY, photoWidth, photoHeight, photoRadius);
  ctx.strokeStyle = colorAccent;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  let cursorY = photoY + photoHeight + 84;
  const centerX = CARD_WIDTH / 2;
  const textMaxWidth = CARD_WIDTH - margin * 2;

  // Name (bis zu 2 Zeilen).
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = colorText;
  ctx.font = "700 64px 'Cormorant Garamond', serif";
  const nameLines = wrapText(ctx, wine.name, textMaxWidth, 2);
  const nameLineHeight = 76;
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
    const subtitleLines = wrapText(ctx, subtitleParts.join(' · '), textMaxWidth, 1);
    ctx.fillText(subtitleLines[0], centerX, cursorY + 6);
    cursorY += 64;
  } else {
    cursorY += 20;
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

  // Footer: duenne Trennlinie, kleines Trauben-Symbol und "Grapino"-
  // Schriftzug - gemeinsames Familien-Element mit der Weinjahr-Karte.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = "600 30px 'Cormorant Garamond', serif";
  ctx.fillStyle = colorAccent;
  drawFooterMark(ctx, 'Grapino', centerX, CARD_HEIGHT - 44, colorAccent, 0.35);

  // Sehr dezente Vignette am Rand fuer mehr Bildtiefe (unabhaengig vom
  // Theme bewusst neutral dunkel, wie ein klassischer Foto-Vignette-Effekt).
  ctx.save();
  const vignette = ctx.createRadialGradient(
    centerX,
    CARD_HEIGHT / 2,
    CARD_HEIGHT * 0.32,
    centerX,
    CARD_HEIGHT / 2,
    CARD_HEIGHT * 0.74,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.restore();

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
