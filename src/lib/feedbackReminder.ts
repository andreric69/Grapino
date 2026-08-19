// v2: eigener Schluessel, damit ein bereits gesetztes "weggeklickt"-Flag aus
// der fruehen (noch wegklickbaren) Version das Popup nicht faelschlich
// unterdrueckt - das Popup ist jetzt nicht mehr wegklickbar, nur nach
// tatsaechlichem Absenden verschwindet es dauerhaft.
const FEEDBACK_SUBMITTED_KEY = 'weinsammlung-feedback-submitted-v2';
const FIRST_OPEN_KEY = 'weinsammlung-first-open-at';
const FEEDBACK_DELAY_MS = 60 * 60 * 1000; // 1 Stunde
// Auf Wunsch pausiert - das Popup erscheint erst wieder ab diesem Datum
// (Montag), unabhaengig von der 1-Stunde-Regel oben.
const FEEDBACK_NOT_BEFORE = new Date('2026-08-17T00:00:00');

export function hasFeedbackBeenSubmitted(): boolean {
  return localStorage.getItem(FEEDBACK_SUBMITTED_KEY) === '1';
}

export function markFeedbackSubmitted() {
  localStorage.setItem(FEEDBACK_SUBMITTED_KEY, '1');
}

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
