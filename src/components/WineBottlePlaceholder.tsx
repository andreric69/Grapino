import type { WineType } from '../types';

interface WineBottlePlaceholderProps {
  /** Wird als Etikett-Aufschrift auf der Cartoon-Flasche angezeigt. */
  name: string;
  wineType?: WineType | null;
}

const BOTTLE_COLORS: Record<WineType, { glass: string; glassDark: string }> = {
  rot: { glass: '#5c2430', glassDark: '#3d1720' },
  weiss: { glass: '#8a9a5b', glassDark: '#66753f' },
  rose: { glass: '#c98a92', glassDark: '#a5636c' },
  dessert: { glass: '#b6892f', glassDark: '#8f6a1f' },
  schaumwein: { glass: '#3f5c40', glassDark: '#2a3f2b' },
};
const DEFAULT_COLORS = { glass: '#8c8377', glassDark: '#655e54' };

const MAX_CHARS_PER_LINE = 10;
const MAX_LINES = 3;

/** Bricht den Weinnamen grob in Zeilen um, damit er ins SVG-Etikett passt (letzte Zeile mit Ellipse, falls zu lang). */
function wrapLabelText(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = '';
  let usedWords = 0;
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > MAX_CHARS_PER_LINE && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
    usedWords++;
    if (lines.length === MAX_LINES - 1 && current.length >= MAX_CHARS_PER_LINE) break;
    if (lines.length === MAX_LINES) break;
  }
  if (current && lines.length < MAX_LINES) lines.push(current);
  if (usedWords < words.length || lines.some((l) => l.length > MAX_CHARS_PER_LINE)) {
    const lastIndex = lines.length - 1;
    let last = lines[lastIndex] ?? '';
    if (last.length > MAX_CHARS_PER_LINE - 1) last = last.slice(0, MAX_CHARS_PER_LINE - 1);
    lines[lastIndex] = `${last.replace(/[.,;:\s]+$/, '')}…`;
  }
  return lines.slice(0, MAX_LINES);
}

/**
 * Fuellt die leere Foto-Flaeche eines Weins ohne eigenes Foto: eine
 * Cartoon-Weinflasche ohne echtes Etikett-Design, aber mit dem Weinnamen
 * als Aufschrift - wirkt weniger "leer" als reiner Platzhaltertext und
 * gibt trotzdem sofort einen Hinweis, um welchen Wein es sich handelt.
 */
export function WineBottlePlaceholder({ name, wineType }: WineBottlePlaceholderProps) {
  const colors = (wineType && BOTTLE_COLORS[wineType]) || DEFAULT_COLORS;
  const lines = wrapLabelText(name);
  const lineHeight = 15;
  const startY = 168 - ((lines.length - 1) * lineHeight) / 2;

  return (
    <svg
      viewBox="0 0 120 240"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Kein Foto - Platzhalter-Flasche für ${name}`}
    >
      {/* Kapsel */}
      <rect x="46" y="6" width="28" height="20" rx="4" fill={colors.glassDark} />
      {/* Hals */}
      <rect x="50" y="24" width="20" height="46" fill={colors.glass} />
      {/* Schulter + Körper */}
      <path
        d="M 50 68 C 50 68 32 92 32 118 L 32 214 C 32 228 42 236 60 236 C 78 236 88 228 88 214 L 88 118 C 88 92 70 68 70 68 Z"
        fill={colors.glass}
      />
      {/* Glanzlicht */}
      <path
        d="M 40 108 C 40 108 38 160 38 208"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      {/* Etikett */}
      <rect x="27" y="132" width="66" height="70" rx="4" fill="#f4ede4" stroke="rgba(61,43,43,0.18)" />
      <line x1="35" y1="144" x2="85" y2="144" stroke="rgba(61,43,43,0.18)" strokeWidth="1" />
      <text
        x="60"
        y={startY}
        textAnchor="middle"
        fontFamily="var(--font-heading)"
        fontSize="13"
        fill="#3d2b2b"
      >
        {lines.map((line, i) => (
          <tspan key={i} x="60" dy={i === 0 ? 0 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </svg>
  );
}
