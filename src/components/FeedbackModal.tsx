import { useState } from 'react';
import { StarRating } from './StarRating';
import { submitFeedback } from '../lib/feedbackRepository';

const TIP_MIN = 5;
const TIP_MAX = 40;

function smileyFor(tip: number) {
  if (tip >= 32) return '\u{1F929}'; // 🤩
  if (tip >= 20) return '\u{1F604}'; // 😄
  if (tip >= 10) return '\u{1F642}'; // 🙂
  return '\u{1F610}'; // 😐
}

export function FeedbackModal({ onSubmitted, onClose }: { onSubmitted: () => void; onClose?: () => void }) {
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [tip, setTip] = useState(TIP_MIN);
  const [showTip, setShowTip] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const smileySize = 32 + ((tip - TIP_MIN) / (TIP_MAX - TIP_MIN)) * 56;

  async function handleSubmit() {
    if (!rating) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitFeedback({
        rating,
        message: message.trim() || null,
        tip_amount: showTip ? tip : null,
      });
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler.');
      setSubmitting(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">Wie gefaellt dir Grapino?</div>
        <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <StarRating value={rating} onChange={setRating} size={30} />
          </div>

          <textarea
            className="input"
            placeholder="Magst du kurz etwas dazu schreiben? (optional)"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ resize: 'none' }}
          />

          {!showTip && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowTip(true)}
            >
              Trinkgeld dalassen
            </button>
          )}

          {showTip && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  fontSize: smileySize,
                  lineHeight: 1,
                  transition: 'font-size 120ms ease-out',
                }}
                aria-hidden="true"
              >
                {smileyFor(tip)}
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18 }}>
                {tip.toFixed(0)}.-
              </div>
              <input
                type="range"
                min={TIP_MIN}
                max={TIP_MAX}
                step={1}
                value={tip}
                onChange={(e) => setTip(Number(e.target.value))}
                style={{ width: '100%' }}
                aria-label="Trinkgeld-Betrag"
              />
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                Nur eine Wertschaetzung - keine echte Zahlung ueber die App.
              </div>
            </div>
          )}

          {error && <div style={{ color: 'var(--color-bordeaux)', fontSize: 13 }}>{error}</div>}
        </div>
        <div className="dialog-actions">
          {onClose && (
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Abbrechen
            </button>
          )}
          <button
            type="button"
            className={onClose ? 'btn btn-primary' : 'btn btn-primary btn-block'}
            onClick={handleSubmit}
            disabled={!rating || submitting}
          >
            {submitting ? 'Wird gesendet ...' : 'Absenden'}
          </button>
        </div>
      </div>
    </div>
  );
}
