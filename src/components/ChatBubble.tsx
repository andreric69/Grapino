import { useEffect, useMemo, useState } from 'react';
import type { OrderCategory, Wine } from '../types';
import { sendMessage } from '../lib/messageRepository';
import { submitOrder, ORDER_CATEGORY_INFO } from '../lib/orderRepository';
import { buildPriceTable, computeOrderPrice, getPricingConfig, type PricingConfig } from '../lib/pricingConfig';
import { FeedbackModal } from './FeedbackModal';

type Tab = 'allgemein' | 'vorschlag' | 'auftrag';
type FilterPreset = 'alle' | 'ohne_trinkfenster' | 'ohne_foto' | 'ohne_preis' | 'neu';

const FILTER_LABELS: Record<FilterPreset, string> = {
  alle: 'Alle Weine im Vorrat',
  ohne_trinkfenster: 'Alle ohne Trinkfenster',
  ohne_foto: 'Alle ohne Foto',
  ohne_preis: 'Alle ohne Preis',
  neu: 'Neu hinzugefuegt (letzte 30 Tage)',
};

function matchesFilter(wine: Wine, filter: FilterPreset): boolean {
  switch (filter) {
    case 'alle':
      return true;
    case 'ohne_trinkfenster':
      return !wine.drink_from && !wine.drink_to;
    case 'ohne_foto':
      return !wine.photo_url && wine.photo_urls.length === 0;
    case 'ohne_preis':
      return wine.price === null;
    case 'neu':
      return Date.now() - new Date(wine.created_at).getTime() < 30 * 24 * 60 * 60 * 1000;
  }
}

export function ChatBubble({ wines }: { wines: Wine[] }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('allgemein');
  const [showFeedback, setShowFeedback] = useState(false);

  const activeWines = useMemo(() => wines.filter((w) => !w.is_consumed && !w.is_wishlist), [wines]);

  // --- Allgemein / Vorschlag ---
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  async function handleSendMessage(category: 'allgemein' | 'vorschlag') {
    if (!messageText.trim()) return;
    setSendingMessage(true);
    setMessageError(null);
    try {
      await sendMessage(category, messageText.trim());
      setMessageSent(true);
      setMessageText('');
    } catch (e) {
      setMessageError(e instanceof Error ? e.message : 'Unbekannter Fehler.');
    } finally {
      setSendingMessage(false);
    }
  }

  // --- Auftrag ---
  const [orderCategory, setOrderCategory] = useState<OrderCategory>('trinkfenster');
  const [orderFilter, setOrderFilter] = useState<FilterPreset>('ohne_trinkfenster');
  const [orderNote, setOrderNote] = useState('');
  const [sendingOrder, setSendingOrder] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const matchingWines = useMemo(
    () => activeWines.filter((w) => matchesFilter(w, orderFilter)),
    [activeWines, orderFilter],
  );

  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  useEffect(() => {
    getPricingConfig().then(setPricing);
  }, []);
  const estimatedPrice = pricing ? computeOrderPrice(pricing, orderCategory, matchingWines.length) : null;

  async function handleSubmitOrder() {
    if (matchingWines.length === 0) return;
    setSendingOrder(true);
    setOrderError(null);
    try {
      await submitOrder({
        category: orderCategory,
        wineIds: matchingWines.map((w) => w.id),
        note: orderNote.trim() || null,
      });
      setOrderSent(true);
      setOrderNote('');
    } catch (e) {
      setOrderError(e instanceof Error ? e.message : 'Unbekannter Fehler.');
    } finally {
      setSendingOrder(false);
    }
  }

  function closeAndReset() {
    setOpen(false);
    setTab('allgemein');
    setMessageSent(false);
    setOrderSent(false);
  }

  return (
    <>
      <button
        type="button"
        className="icon-btn"
        aria-label="Kontakt / Nachricht senden"
        title="Kontakt"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 'calc(28px + env(safe-area-inset-bottom))',
          left: 20,
          zIndex: 20,
          width: 48,
          height: 48,
          background: 'var(--color-surface)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      </button>

      {open && (
        <div className="dialog-backdrop" onClick={closeAndReset}>
          <div className="dialog" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">Kontakt</div>
            <div style={{ display: 'flex', gap: 6, padding: '0 20px 8px', flexWrap: 'wrap' }}>
              {(
                [
                  ['allgemein', 'Allgemein'],
                  ['vorschlag', 'Vorschlag'],
                  ['bewertung', 'Bewertung'],
                  ['auftrag', 'Auftrag geben'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={tab === key ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '5px 10px', fontSize: 12.5 }}
                  onClick={() => {
                    if (key === 'bewertung') {
                      setShowFeedback(true);
                      return;
                    }
                    setTab(key);
                    setMessageSent(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {(tab === 'allgemein' || tab === 'vorschlag') && (
              <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12.5, opacity: 0.65 }}>
                  {tab === 'allgemein'
                    ? 'Schreib mir, was dir gefaellt oder nicht gefaellt.'
                    : 'Schlag mir eine Aenderung oder ein neues Feature vor.'}
                </div>
                {messageSent ? (
                  <div style={{ fontSize: 13.5, color: 'var(--color-bordeaux)' }}>Gesendet, danke!</div>
                ) : (
                  <>
                    <textarea
                      className="input"
                      rows={4}
                      style={{ resize: 'none' }}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                    />
                    {messageError && <div style={{ color: 'var(--color-bordeaux)', fontSize: 13 }}>{messageError}</div>}
                  </>
                )}
              </div>
            )}

            {tab === 'auftrag' && (
              <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {orderSent ? (
                  <div style={{ fontSize: 13.5, color: 'var(--color-bordeaux)' }}>
                    Auftrag gesendet - du bekommst eine Zahlungsanfrage, sobald er bestaetigt ist.
                  </div>
                ) : (
                  <>
                    <div>
                      <label style={{ fontSize: 12.5, opacity: 0.65, display: 'block', marginBottom: 4 }}>Art</label>
                      <select
                        className="input"
                        value={orderCategory}
                        onChange={(e) => setOrderCategory(e.target.value as OrderCategory)}
                      >
                        {Object.entries(ORDER_CATEGORY_INFO).map(([key, info]) => (
                          <option key={key} value={key}>
                            {info.label}
                            {pricing ? ` (ab ${pricing[key as OrderCategory].toFixed(2)} CHF/Wein)` : ''}
                          </option>
                        ))}
                      </select>
                      <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 4 }}>
                        {ORDER_CATEGORY_INFO[orderCategory].description} Preis richtet sich nach Anzahl
                        unterschiedlicher Weine (nicht Flaschen) - bei vielen wird es pro Wein guenstiger, der genaue
                        Preis unten ist immer massgebend.
                      </div>

                      {pricing && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 4,
                            overflowX: 'auto',
                            marginTop: 8,
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
                          }}
                        >
                          {buildPriceTable(pricing, orderCategory).map((row) => (
                            <div key={row.count} style={{ textAlign: 'center', flexShrink: 0, minWidth: 52 }}>
                              <div style={{ fontSize: 10.5, opacity: 0.6 }}>{row.count} Weine</div>
                              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{row.price.toFixed(2)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{ fontSize: 12.5, opacity: 0.65, display: 'block', marginBottom: 4 }}>Welche Weine</label>
                      <select className="input" value={orderFilter} onChange={(e) => setOrderFilter(e.target.value as FilterPreset)}>
                        {Object.entries(FILTER_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <textarea
                      className="input"
                      rows={2}
                      placeholder="Notiz (optional)"
                      style={{ resize: 'none' }}
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                    />

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 13.5,
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'color-mix(in srgb, var(--color-bordeaux) 8%, transparent)',
                      }}
                    >
                      <span>
                        {matchingWines.length} {matchingWines.length === 1 ? 'Wein' : 'Weine'}
                      </span>
                      <strong>{estimatedPrice !== null ? `${estimatedPrice.toFixed(2)} CHF` : '...'}</strong>
                    </div>
                    {matchingWines.length === 0 && (
                      <div style={{ fontSize: 12, opacity: 0.6 }}>Kein Wein passt aktuell auf diesen Filter.</div>
                    )}
                    {orderError && <div style={{ color: 'var(--color-bordeaux)', fontSize: 13 }}>{orderError}</div>}
                  </>
                )}
              </div>
            )}

            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={closeAndReset}>
                Schliessen
              </button>
              {(tab === 'allgemein' || tab === 'vorschlag') && !messageSent && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={sendingMessage || !messageText.trim()}
                  onClick={() => handleSendMessage(tab)}
                >
                  {sendingMessage ? 'Wird gesendet ...' : 'Senden'}
                </button>
              )}
              {tab === 'auftrag' && !orderSent && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={sendingOrder || matchingWines.length === 0}
                  onClick={handleSubmitOrder}
                >
                  {sendingOrder ? 'Wird gesendet ...' : 'Auftrag senden'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showFeedback && (
        <FeedbackModal
          onSubmitted={() => {
            setShowFeedback(false);
            closeAndReset();
          }}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </>
  );
}
