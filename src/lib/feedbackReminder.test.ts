import { beforeEach, describe, expect, it } from 'vitest';
import { hasFeedbackBeenSubmitted, isFeedbackDelayOver, markFeedbackSubmitted } from './feedbackReminder';

// Hinweis: FEEDBACK_NOT_BEFORE in feedbackReminder.ts ist auf 2026-08-17 gesetzt
// und liegt damit in der Vergangenheit - die Tests pruefen daher die
// "1 Stunde seit erstem Start"-Regel, die danach greift.
describe('feedbackReminder', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('wurde noch nicht abgeschickt, wenn noch nichts gespeichert ist', () => {
    expect(hasFeedbackBeenSubmitted()).toBe(false);
  });

  it('merkt sich ein abgeschicktes Feedback dauerhaft', () => {
    markFeedbackSubmitted();
    expect(hasFeedbackBeenSubmitted()).toBe(true);
  });

  it('zeigt das Popup nicht direkt beim allerersten Start (innerhalb der 1-Stunden-Frist)', () => {
    expect(isFeedbackDelayOver()).toBe(false);
  });

  it('zeigt das Popup, wenn der erste Start mehr als 1 Stunde zurueckliegt', () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    localStorage.setItem('weinsammlung-first-open-at', String(twoHoursAgo));
    expect(isFeedbackDelayOver()).toBe(true);
  });

  it('merkt sich den ersten Start nur einmal, auch bei mehrfachem Aufruf', () => {
    isFeedbackDelayOver();
    const firstRecorded = localStorage.getItem('weinsammlung-first-open-at');
    isFeedbackDelayOver();
    const secondRecorded = localStorage.getItem('weinsammlung-first-open-at');
    expect(firstRecorded).toBe(secondRecorded);
  });
});
