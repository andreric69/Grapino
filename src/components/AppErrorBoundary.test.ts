import { describe, expect, it } from 'vitest';
import { isChunkLoadError } from './AppErrorBoundary';

describe('isChunkLoadError', () => {
  it('erkennt die Chrome/Edge-Fehlermeldung fuer einen fehlgeschlagenen Chunk-Import', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: https://weinsammlung-two.vercel.app/assets/WineFormPage-abc123.js'))).toBe(true);
  });

  it('erkennt die Firefox-Fehlermeldung', () => {
    expect(isChunkLoadError(new Error('error loading dynamically imported module: https://weinsammlung-two.vercel.app/assets/StatsPage-def456.js'))).toBe(true);
  });

  it('erkennt die Safari-Fehlermeldung (ohne Datei-Referenz)', () => {
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
  });

  it('ignoriert Gross-/Kleinschreibung', () => {
    expect(isChunkLoadError(new Error('FAILED TO FETCH DYNAMICALLY IMPORTED MODULE'))).toBe(true);
  });

  it('erkennt einen echten Programmfehler NICHT als Chunk-Fehler', () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined (reading 'map')"))).toBe(false);
  });

  it('erkennt eine normale Netzwerk-/API-Fehlermeldung NICHT als Chunk-Fehler', () => {
    expect(isChunkLoadError(new Error('Failed to fetch'))).toBe(false);
  });

  it('kommt auch mit einem nicht-Error-Wert klar (z. B. ein geworfener String)', () => {
    expect(isChunkLoadError('failed to fetch dynamically imported module')).toBe(true);
    expect(isChunkLoadError('irgendein anderer Fehler')).toBe(false);
  });
});
