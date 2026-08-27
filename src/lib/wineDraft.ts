import type { FormState } from '../pages/WineFormPage';

const DRAFT_KEY = 'weinsammlung-wine-draft';

// Nur Textfelder - Fotos liegen vor dem Speichern nur als Blob im Speicher
// (siehe handleSubmit in WineFormPage.tsx) und wuerden einen Reload ohnehin
// nicht ueberleben, ohne einen groesseren Umbau auf IndexedDB.
export function saveWineDraft(form: FormState) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  } catch {
    // localStorage kann voll oder deaktiviert sein - der Entwurf ist nur eine Komfort-Funktion.
  }
}

export function loadWineDraft(): FormState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FormState;
  } catch {
    return null;
  }
}

export function clearWineDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function hasWineDraft(): boolean {
  try {
    return localStorage.getItem(DRAFT_KEY) !== null;
  } catch {
    return false;
  }
}

/** Ob ein Entwurf ueberhaupt etwas Sinnvolles enthaelt - verhindert, dass die leere Ausgangsform selbst schon als Entwurf zaehlt. */
export function isDraftMeaningful(form: FormState): boolean {
  return form.name.trim().length > 0 || form.producer.trim().length > 0 || form.notes.trim().length > 0;
}
