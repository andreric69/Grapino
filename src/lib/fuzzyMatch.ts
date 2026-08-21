/**
 * Levenshtein-Distanz (Anzahl Einzelzeichen-Aenderungen, um a in b zu
 * verwandeln) - Grundlage fuer den tippfehler-toleranten Abgleich gegen die
 * Referenzlisten. maxDistance erlaubt einen fruehen Abbruch (Bail-out,
 * sobald klar ist, dass die Distanz sowieso zu gross wird), damit ein
 * Abgleich gegen tausende Referenzeintraege schnell bleibt.
 */
export function levenshteinDistance(a: string, b: string, maxDistance = Infinity): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > maxDistance) return maxDistance + 1;
  if (al === 0) return bl;
  if (bl === 0) return al;

  let prevRow = new Array(bl + 1);
  let curRow = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prevRow[j] = j;

  for (let i = 1; i <= al; i++) {
    curRow[0] = i;
    let rowMin = curRow[0];
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curRow[j] = Math.min(prevRow[j] + 1, curRow[j - 1] + 1, prevRow[j - 1] + cost);
      if (curRow[j] < rowMin) rowMin = curRow[j];
    }
    if (rowMin > maxDistance) return maxDistance + 1; // ganze Zeile schon zu weit weg - kann nicht mehr besser werden
    [prevRow, curRow] = [curRow, prevRow];
  }
  return prevRow[bl];
}

/**
 * Wie viele Zeichen-Fehler bei einem Text dieser Laenge noch als "Tippfehler"
 * statt als "anderes Wort" gelten - kurze Woerter verzeihen wenig (sonst
 * verwechselt man leicht zwei unterschiedliche kurze Namen), laengere Namen
 * duerfen anteilig mehr Abweichung haben (OCR verhaspelt sich bei langen
 * Woertern leichter mehrfach).
 */
function maxAllowedDistance(length: number): number {
  if (length <= 5) return 1;
  if (length <= 10) return 2;
  return Math.min(4, Math.floor(length * 0.22));
}

export interface FuzzyMatch<T> {
  value: T;
  distance: number;
}

/**
 * Sucht den best passenden Eintrag in einer Liste normalisierter Kandidaten
 * fuer einen gegebenen normalisierten Text - z.B. um ein leicht falsch
 * erkanntes "Chateu Margaus" trotzdem als "Chateau Margaux" zu finden.
 * Liefert null, wenn kein Eintrag nah genug dran ist.
 */
export function findClosestFuzzyMatch<T>(
  normalizedText: string,
  candidates: { normalized: string; value: T }[],
): FuzzyMatch<T> | null {
  let best: FuzzyMatch<T> | null = null;
  for (const c of candidates) {
    const allowed = maxAllowedDistance(c.normalized.length);
    const distance = levenshteinDistance(normalizedText, c.normalized, allowed);
    if (distance <= allowed && (!best || distance < best.distance)) {
      best = { value: c.value, distance };
    }
  }
  return best;
}
