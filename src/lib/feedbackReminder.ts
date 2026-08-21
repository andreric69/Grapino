const FIRST_OPEN_KEY = 'weinsammlung-first-open-at';
const FEEDBACK_DELAY_MS = 60 * 60 * 1000; // 1 Stunde
// Auf Wunsch pausiert - das Popup erscheint erst wieder ab diesem Datum
// (Montag), unabhaengig von der 1-Stunde-Regel oben.
const FEEDBACK_NOT_BEFORE = new Date('2026-08-17T00:00:00');

/** Merkt sich den allerersten App-Start auf diesem Geraet (einmalig, danach unveraendert). */
function getOrRecordFirstOpen(): number {
  const raw = localStorage.getItem(FIRST_OPEN_KEY);
  if (raw) return Number(raw);
  const now = Date.now();
  localStorage.setItem(FIRST_OPEN_KEY, String(now));
  return now;
}

/** Das Feedback-Popup soll erst eine Stunde nach dem ersten App-Start auf diesem Geraet erscheinen - und nicht vor dem FEEDBACK_NOT_BEFORE-Datum. */
export function isFeedbackDelayOver(): boolean {
  if (Date.now() < FEEDBACK_NOT_BEFORE.getTime()) return false;
  const firstOpen = getOrRecordFirstOpen();
  return Date.now() - firstOpen >= FEEDBACK_DELAY_MS;
}
