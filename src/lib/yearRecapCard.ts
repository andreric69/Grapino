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
  const textOnGradient = '#f8f4f4';

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
  ctx.arc(CARD_WIDTH * 0.85, CARD_HEIGHT * 0.1, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(CARD_WIDTH * 0.08, CARD_HEIGHT * 0.92, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

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
  const leftX = centerX - CARD_WIDTH * 0.23;
  const rightX = centerX + CARD_WIDTH * 0.23;
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
    roundedRectPath(ctx, margin, cursorY, textMaxWidth, cardHeight, 28);
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = textOnGradient;
    ctx.fill();
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

  // Footer-Wortmarke.
  ctx.font = "600 32px 'Cormorant Garamond', serif";
  ctx.fillStyle = textOnGradient;
  ctx.globalAlpha = 0.9;
  ctx.fillText('Grapino', centerX, CARD_HEIGHT - 50);
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
 * Teilt die generierte Weinjahr-Karte ueber die native Share-Sheet (falls vom
 * Browser unterstuetzt), oder laedt sie andernfalls als PNG-Datei herunter.
 */
export async function shareOrDownloadYearRecap(stats: YearRecapStats): Promise<void> {
  const blob = await generateYearRecapCard(stats);
  const filename = `weinjahr-${stats.year}-grapino.png`;
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `Weinjahr ${stats.year}`, text: 'Mein Weinjahr mit Grapino' });
      return;
    } catch (error) {
      // Nutzer hat die native Share-Sheet einfach abgebrochen - kein Fehler,
      // sondern normales Verhalten, still ignorieren.
      if (error instanceof DOMException && error.name === 'AbortError') return;
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
}
