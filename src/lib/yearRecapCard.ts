/**
 * Erstellt eine teilbare Bildkarte (PNG) fuer den jaehrlichen "Weinjahr"-
 * Rueckblick - eine kompakte, gefeierte Zusammenfassung eines Kalenderjahrs
 * (angelehnt an den Aufbau von shareCard.ts, aber bewusst eigenstaendig und
 * ohne Foto-Kompositing: nur Typografie auf einem Farbverlauf).
 */

export interface YearRecapStats {
  year: number;
  totalBottles: number;
  distinctWines: number;
  topRegion: string | null;
  topGrape: string | null;
  wineOfTheYear: string | null;
  newWinesAdded: number;
}

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
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
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
 * Textur passend zur Bordeaux/Gold-Weinsammlung-Aesthetik der App. Identisch
 * im Aufbau zur Version in shareCard.ts (bewusst dupliziert statt geteilt,
 * damit beide Dateien unabhaengig voneinander bleiben).
 */
function drawVineMotif(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  scale: number,
  color: string,
  alpha: number,
  mirrorX: boolean,
  flipY: boolean,
): void {
  ctx.save();
  ctx.translate(anchorX, anchorY);
  ctx.scale(mirrorX ? -scale : scale, flipY ? scale : -scale);
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
 * shareCard.ts, damit beide Karten erkennbar zusammengehoeren. Erwartet,
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
  ctx.moveTo(centerX - 54, baselineY - 36);
  ctx.lineTo(centerX + 54, baselineY - 36);
  ctx.stroke();
  ctx.restore();

  const textWidth = ctx.measureText(text).width;
  const glyphSize = 26;
  const gap = 14;
  const totalWidth = glyphSize * 0.9 + gap + textWidth;
  const startX = Math.round(centerX - totalWidth / 2);

  ctx.save();
  ctx.globalAlpha = 0.9;
  drawGrapeMark(ctx, startX + glyphSize * 0.45, baselineY - 8, glyphSize, color);
  ctx.restore();

  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  ctx.fillText(text, Math.round(startX + glyphSize * 0.9 + gap), baselineY);
  ctx.textAlign = prevAlign;
}

/** Ein grosses, zentriertes "Zahl + Label"-Paar (grosse Ueberschrift-Zahl, kleines Label darunter). */
function drawBigStat(
  ctx: CanvasRenderingContext2D,
  value: string,
  label: string,
  centerX: number,
  y: number,
  textColor: string,
  labelColor: string,
): number {
  ctx.textAlign = 'center';
  ctx.font = "700 76px 'Cormorant Garamond', serif";
  ctx.fillStyle = textColor;
  ctx.fillText(value, centerX, y);
  ctx.font = "600 26px 'Lora', system-ui, sans-serif";
  ctx.fillStyle = labelColor;
  ctx.fillText(label, centerX, y + 40);
  return y + 40;
}

/** Baut die eine, warm formulierte Kopfzeile aus den Jahres-Kennzahlen. */
function buildHeadline(stats: YearRecapStats): string {
  const parts: string[] = [];
  parts.push(`${stats.totalBottles} ${stats.totalBottles === 1 ? 'Flasche' : 'Flaschen'}`);
  if (stats.topRegion) parts.push(`viel ${stats.topRegion}`);
  if (stats.topGrape) parts.push(`${stats.topGrape} als Lieblingsrebsorte`);
  if (parts.length === 1) return `${parts[0]} genossen.`;
  return `${parts.join(', ')}.`;
}

/**
 * Erzeugt die "Weinjahr"-Recap-Karte (PNG, Hochformat) - Farbverlauf im
 * Bordeaux/Gold-Ton der App, grosse Jahreszahl, Kopfzeile und die
 * wichtigsten Kennzahlen als grosse Zahlen, plus "Grapino"-Fusszeile.
 */
export async function generateYearRecapCard(stats: YearRecapStats): Promise<Blob> {
  await document.fonts?.ready?.catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Bildbearbeitung wird von diesem Browser nicht unterstuetzt.');

  const colorBordeaux = cssVar('--color-bordeaux', '#7c2d3a');
  const colorAccent = cssVar('--color-accent', '#b68235');
  // Text auf dem Farbverlauf ist bewusst fest hell/creme statt Theme-abhaengig
  // (--color-text waere im dunklen Theme selbst dunkel und unlesbar auf dem
  // Bordeaux/Gold-Verlauf) - identisch zur Logik "helle Schrift auf Akzentfarbe".
  // Nutzt den (in beiden Themes identischen) Neutralton-Token statt eines
  // freistehenden Hex-Werts, bleibt aber bewusst konstant.
  const textOnGradient = cssVar('--color-neutral-100', '#f8f4f4');

  // Hintergrund: diagonaler Bordeaux-zu-Gold-Verlauf, festlicher als die
  // dezente Flaeche der einzelnen Weinkarte.
  const backgroundGradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  backgroundGradient.addColorStop(0, colorBordeaux);
  backgroundGradient.addColorStop(0.55, cssVar('--color-accent-700', '#7d5411'));
  backgroundGradient.addColorStop(1, colorAccent);
  ctx.fillStyle = backgroundGradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Ein paar dezente, halbtransparente Kreise ("Bokeh") fuer eine festliche,
  // aber ruhige Note - keine Fotos noetig, nur Formen.
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = textOnGradient;
  ctx.beginPath();
  ctx.arc(Math.round(CARD_WIDTH * 0.85), Math.round(CARD_HEIGHT * 0.1), 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(Math.round(CARD_WIDTH * 0.08), Math.round(CARD_HEIGHT * 0.92), 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Weiche Lichtaura hinter der grossen Jahreszahl, fuer mehr Feierlichkeit
  // und Bildtiefe als ein reiner Flaechen-Verlauf.
  ctx.save();
  const yearGlow = ctx.createRadialGradient(
    CARD_WIDTH / 2,
    260,
    20,
    CARD_WIDTH / 2,
    260,
    340,
  );
  yearGlow.addColorStop(0, 'rgba(255, 244, 224, 0.22)');
  yearGlow.addColorStop(1, 'rgba(255, 244, 224, 0)');
  ctx.fillStyle = yearGlow;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT * 0.4);
  ctx.restore();

  // Wasserzeichen-artige Ranken-Illustration, von den oberen Ecken haengend -
  // sehr dezent, dieselbe Formensprache wie in shareCard.ts fuer eine
  // erkennbar gemeinsame "Grapino"-Bildsprache.
  drawVineMotif(ctx, 6, 6, 0.8, textOnGradient, 0.09, false, true);
  drawVineMotif(ctx, CARD_WIDTH - 6, 6, 0.8, textOnGradient, 0.09, true, true);

  const centerX = CARD_WIDTH / 2;
  const margin = 90;
  const textMaxWidth = CARD_WIDTH - margin * 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Kicker "WEINJAHR".
  ctx.font = "600 30px 'Lora', system-ui, sans-serif";
  ctx.fillStyle = textOnGradient;
  ctx.globalAlpha = 0.85;
  ctx.fillText('W E I N J A H R', centerX, 150);
  ctx.globalAlpha = 1;

  // Grosse Jahreszahl.
  ctx.font = "700 190px 'Cormorant Garamond', serif";
  ctx.fillStyle = textOnGradient;
  ctx.fillText(String(stats.year), centerX, 340);

  // Trennlinie.
  ctx.strokeStyle = textOnGradient;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 70, 372);
  ctx.lineTo(centerX + 70, 372);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Kopfzeile (bis zu 3 Zeilen).
  let cursorY = 440;
  ctx.font = "500 40px 'Lora', system-ui, sans-serif";
  ctx.fillStyle = textOnGradient;
  const headlineLines = wrapText(ctx, buildHeadline(stats), textMaxWidth, 3);
  for (const line of headlineLines) {
    ctx.fillText(line, centerX, cursorY);
    cursorY += 52;
  }

  cursorY += 44;

  // Zwei grosse Zahlen nebeneinander: Flaschen & verschiedene Weine.
  const leftX = Math.round(centerX - CARD_WIDTH * 0.23);
  const rightX = Math.round(centerX + CARD_WIDTH * 0.23);
  drawBigStat(ctx, String(stats.totalBottles), stats.totalBottles === 1 ? 'Flasche' : 'Flaschen', leftX, cursorY, textOnGradient, textOnGradient);
  drawBigStat(
    ctx,
    String(stats.distinctWines),
    stats.distinctWines === 1 ? 'verschiedener Wein' : 'verschiedene Weine',
    rightX,
    cursorY,
    textOnGradient,
    textOnGradient,
  );
  cursorY += 96;

  // Region & Rebsorte, als kleinere Karte darunter (falls vorhanden).
  if (stats.topRegion || stats.topGrape) {
    cursorY += 30;
    const cardHeight = 140;
    ctx.save();
    roundedRectPath(ctx, margin, cursorY, textMaxWidth, cardHeight, 32);
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = textOnGradient;
    ctx.fill();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = textOnGradient;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    const colHalf = textMaxWidth / 2;
    if (stats.topRegion) {
      ctx.font = "600 22px 'Lora', system-ui, sans-serif";
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = textOnGradient;
      ctx.fillText('Meiste Region', margin + colHalf / 2, cursorY + 46);
      ctx.globalAlpha = 1;
      ctx.font = "700 40px 'Cormorant Garamond', serif";
      const [regionLine] = wrapText(ctx, stats.topRegion, colHalf - 30, 1);
      ctx.fillText(regionLine, margin + colHalf / 2, cursorY + 96);
    }
    if (stats.topGrape) {
      ctx.font = "600 22px 'Lora', system-ui, sans-serif";
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = textOnGradient;
      ctx.fillText('Meiste Rebsorte', margin + colHalf + colHalf / 2, cursorY + 46);
      ctx.globalAlpha = 1;
      ctx.font = "700 40px 'Cormorant Garamond', serif";
      const [grapeLine] = wrapText(ctx, stats.topGrape, colHalf - 30, 1);
      ctx.fillText(grapeLine, margin + colHalf + colHalf / 2, cursorY + 96);
    }
    cursorY += cardHeight;
  }

  // "Wein des Jahres"-Hervorhebung (falls vorhanden).
  if (stats.wineOfTheYear) {
    cursorY += 46;
    ctx.font = "600 24px 'Lora', system-ui, sans-serif";
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = textOnGradient;
    ctx.fillText('★ Wein des Jahres', centerX, cursorY);
    ctx.globalAlpha = 1;
    cursorY += 54;
    ctx.font = "700 52px 'Cormorant Garamond', serif";
    const wineLines = wrapText(ctx, stats.wineOfTheYear, textMaxWidth, 2);
    for (const line of wineLines) {
      ctx.fillText(line, centerX, cursorY);
      cursorY += 58;
    }
  }

  // Neue Weine in diesem Jahr, kleine Zeile.
  if (stats.newWinesAdded > 0) {
    ctx.font = "500 26px 'Lora', system-ui, sans-serif";
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = textOnGradient;
    ctx.fillText(
      `${stats.newWinesAdded} ${stats.newWinesAdded === 1 ? 'neuer Wein' : 'neue Weine'} entdeckt`,
      centerX,
      CARD_HEIGHT - 120,
    );
    ctx.globalAlpha = 1;
  }

  // Footer: duenne Trennlinie, kleines Trauben-Symbol und "Grapino"-
  // Schriftzug - gemeinsames Familien-Element mit der einzelnen Weinkarte.
  ctx.font = "600 32px 'Cormorant Garamond', serif";
  ctx.fillStyle = textOnGradient;
  ctx.globalAlpha = 0.92;
  drawFooterMark(ctx, 'Grapino', centerX, CARD_HEIGHT - 50, textOnGradient, 0.4);
  ctx.globalAlpha = 1;

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
 * "shared", wenn die native Share-Sheet uebernommen hat (eigene
 * Betriebssystem-Rueckmeldung), "downloaded", wenn stattdessen die Datei
 * heruntergeladen wurde (dafuer zeigt der Aufrufer eine eigene Bestaetigung,
 * siehe YearRecapPage.tsx).
 */
export type ShareResult = 'shared' | 'downloaded';

/**
 * Teilt die generierte Weinjahr-Karte ueber die native Share-Sheet (falls vom
 * Browser unterstuetzt), oder laedt sie andernfalls als PNG-Datei herunter.
 */
export async function shareOrDownloadYearRecap(stats: YearRecapStats): Promise<ShareResult> {
  const blob = await generateYearRecapCard(stats);
  const filename = `weinjahr-${stats.year}-grapino.png`;
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `Weinjahr ${stats.year}`, text: 'Mein Weinjahr mit Grapino' });
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
