import { describe, expect, it } from 'vitest';
import { buildPhrases, type RecognizedWord } from './ocr';

function word(text: string, x0: number, y0: number, x1: number, y1: number, confidence = 90): RecognizedWord {
  return { text, confidence, bbox: { x0, y0, x1, y1 } };
}

describe('buildPhrases', () => {
  it('fasst mehrwortige Namen auf derselben Zeile zusammen', () => {
    const words = [
      word('Domaine', 50, 100, 160, 130),
      word('de', 168, 102, 190, 128),
      word('Chevalier', 198, 100, 330, 130),
    ];
    const phrases = buildPhrases(words);
    expect(phrases.map((p) => p.text)).toEqual(['Domaine de Chevalier']);
  });

  it('trennt Woerter auf unterschiedlichen Zeilen in eigene Phrasen', () => {
    const words = [word('Domaine', 50, 100, 160, 130), word('Pessac-Leognan', 50, 200, 250, 230)];
    const phrases = buildPhrases(words);
    expect(phrases.map((p) => p.text)).toEqual(['Domaine', 'Pessac-Leognan']);
  });

  it('trennt Woerter mit grossem horizontalem Abstand auf derselben Zeilenhoehe', () => {
    const words = [word('Grand', 50, 300, 100, 330), word('Cru', 400, 302, 440, 328)];
    const phrases = buildPhrases(words);
    expect(phrases.map((p) => p.text)).toEqual(['Grand', 'Cru']);
  });

  it('liefert eine leere Liste fuer keine Woerter', () => {
    expect(buildPhrases([])).toEqual([]);
  });

  it('behandelt ein einzelnes Wort als eigene Phrase', () => {
    const phrases = buildPhrases([word('Riesling', 10, 10, 100, 40)]);
    expect(phrases.map((p) => p.text)).toEqual(['Riesling']);
  });
});
