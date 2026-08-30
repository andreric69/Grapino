import { useEffect, useMemo, useState } from 'react';
import type { OrderCategory, Wine } from '../types';
import { sendMessage } from '../lib/messageRepository';
import { submitOrder, ORDER_CATEGORY_INFO } from '../lib/orderRepository';
import { computeOrderPrice, getPricingConfig, type PricingConfig } from '../lib/pricingConfig';
import { FeedbackModal } from './FeedbackModal';

type Tab = 'allgemein' | 'vorschlag' | 'auftrag';
type WineMode = 'alle' | 'bestimmte';
type RecentRange = 'tag' | 'woche' | 'monat';

const RECENT_RANGE_MS: Record<RecentRange, number> = {
  tag: 24 * 60 * 60 * 1000,
  woche: 7 * 24 * 60 * 60 * 1000,
  monat: 30 * 24 * 60 * 60 * 1000,
};
const RECENT_RANGE_LABELS: Record<RecentRange, string> = {
  tag: 'Letzter Tag',
  woche: 'Letzte Woche',
  monat: 'Letzter Monat',
};

interface WineCriteria {
  noPrice: boolean;
  noWindow: boolean;
  noPhoto: boolean;
  recent: boolean;
  recentRange: RecentRange;
}

const EMPTY_CRITERIA: WineCriteria = { noPrice: false, noWindow: false, noPhoto: false, recent: false, recentRange: 'woche' };

/** Ob ein Wein auf mindestens eines der angehakten Kriterien passt (Vereinigung, kein UND). */
function matchesCriteria(wine: Wine, criteria: WineCriteria): boolean {
  if (criteria.noPrice && wine.price === null) return true;
  if (criteria.noWindow && !wine.drink_from && !wine.drink_to) return true;
  if (criteria.noPhoto && !wine.photo_url && wine.photo_urls.length === 0) return true;
  if (criteria.recent && Date.now() - new Date(wine.created_at).getTime() < RECENT_RANGE_MS[criteria.recentRange]) return true;
  return false;
}

export function ChatBubble({ wines }: { wines: Wine[] }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('allgemein');
  const [showFeedback, setShowFeedback] = useState(false);

  const activeWines = useMemo(() => wines.filter((w) => !w.is_consumed), [wines]);

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
  const [orderCategory, setOrderCategory] = useState<OrderCategory>('refresh');
  const [wineMode, setWineMode] = useState<WineMode>('bestimmte');
  const [criteria, setCriteria] = useState<WineCriteria>({ ...EMPTY_CRITERIA, noPrice: true });
  const [orderNote, setOrderNote] = useState('');
  const [sendingOrder, setSendingOrder] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const matchingWines = useMemo(
    () => (wineMode === 'alle' ? activeWines : activeWines.filter((w) => matchesCriteria(w, criteria))),
    [activeWines, wineMode, criteria],
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
          border: '2px solid var(--color-bordeaux)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      </button>

      {open && (
        <div className="dialog-backdrop" onClick={closeAndReset}>
          <div className="dialog" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">Kontakt</div>
            <div className="chat-tab-row" style={{ margin: '0 20px 8px' }}>
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
                  className={`chat-tab${tab === key ? ' is-active' : ''}`}
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
                    ? 'Schreib mir, was dir gefällt oder nicht gefällt.'
                    : 'Schlag mir eine Änderung oder ein neues Feature vor.'}
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
              <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {orderSent ? (
                  <div style={{ fontSize: 13.5, color: 'var(--color-bordeaux)' }}>
                    Auftrag gesendet - du bekommst eine Zahlungsanfrage, sobald er bestätigt ist.
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        fontSize: 12.5,
                        lineHeight: 1.55,
                        opacity: 0.75,
                        background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 12px',
                      }}
                    >
                      Wähle, was aktualisiert werden soll. Wir kümmern uns dann darum - danach bekommst du eine
                      Zahlungsanfrage mit dem berechneten Preis.
                    </div>

                    <div>
                      <label style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-accent)', display: 'block', marginBottom: 8 }}>
                        Was soll gemacht werden?
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(Object.entries(ORDER_CATEGORY_INFO) as [OrderCategory, (typeof ORDER_CATEGORY_INFO)[OrderCategory]][]).map(
                          ([key, info]) => {
                            const selected = orderCategory === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setOrderCategory(key)}
                                style={{
                                  textAlign: 'left',
                                  border: selected ? '2px solid var(--color-bordeaux)' : '1px solid var(--color-divider)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: selected ? '9px 11px' : '10px 12px',
                                  background: selected ? 'color-mix(in srgb, var(--color-bordeaux) 6%, transparent)' : 'transparent',
                                  cursor: 'pointer',
                                }}
                              >
                                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14.5 }}>{info.label}</span>
                                <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 3, lineHeight: 1.4 }}>{info.description}</div>
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-accent)', display: 'block', marginBottom: 8 }}>
                        Welche Weine?
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className={`chat-tab${wineMode === 'alle' ? ' is-active' : ''}`}
                          style={{ flex: 1, border: '1px solid var(--color-accent)', borderColor: wineMode === 'alle' ? 'var(--color-bordeaux)' : 'var(--color-accent)' }}
                          onClick={() => setWineMode('alle')}
                        >
                          Alle Weine
                        </button>
                        <button
                          type="button"
                          className={`chat-tab${wineMode === 'bestimmte' ? ' is-active' : ''}`}
                          style={{ flex: 1, border: '1px solid var(--color-accent)', borderColor: wineMode === 'bestimmte' ? 'var(--color-bordeaux)' : 'var(--color-accent)' }}
                          onClick={() => setWineMode('bestimmte')}
                        >
                          Nur bestimmte
                        </button>
                      </div>

                      {wineMode === 'bestimmte' && (
                        <div style={{ marginTop: 8 }}>
                          <CriteriaRow
                            label="Weine ohne Preis"
                            checked={criteria.noPrice}
                            onToggle={() => setCriteria((c) => ({ ...c, noPrice: !c.noPrice }))}
                          />
                          <CriteriaRow
                            label="Weine ohne Trinkfenster"
                            checked={criteria.noWindow}
                            onToggle={() => setCriteria((c) => ({ ...c, noWindow: !c.noWindow }))}
                          />
                          <CriteriaRow
                            label="Weine ohne Foto"
                            checked={criteria.noPhoto}
                            onToggle={() => setCriteria((c) => ({ ...c, noPhoto: !c.noPhoto }))}
                          />
                          <CriteriaRow
                            label="Zuletzt hinzugefügt"
                            checked={criteria.recent}
                            onToggle={() => setCriteria((c) => ({ ...c, recent: !c.recent }))}
                            last
                          />
                          {criteria.recent && (
                            <div style={{ display: 'flex', gap: 6, margin: '6px 0 8px 29px' }}>
                              {(Object.keys(RECENT_RANGE_LABELS) as RecentRange[]).map((range) => (
                                <button
                                  key={range}
                                  type="button"
                                  onClick={() => setCriteria((c) => ({ ...c, recentRange: range }))}
                                  style={{
                                    flex: 1,
                                    fontSize: 11.5,
                                    padding: '6px 4px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--color-accent)',
                                    background: criteria.recentRange === range ? 'var(--color-accent)' : 'transparent',
                                    color: criteria.recentRange === range ? '#fff' : 'var(--color-accent)',
                                    cursor: 'pointer',
                                    fontFamily: 'var(--font-heading)',
                                    fontWeight: 600,
                                  }}
                                >
                                  {RECENT_RANGE_LABELS[range]}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
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
                      <div style={{ fontSize: 12, opacity: 0.6 }}>Kein Wein passt aktuell auf diese Auswahl.</div>
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

function CriteriaRow({ label, checked, onToggle, last }: { label: string; checked: boolean; onToggle: () => void; last?: boolean }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 4px',
        borderBottom: last ? 'none' : '1px solid var(--color-divider)',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          width: 19,
          height: 19,
          borderRadius: 4,
          border: '1.5px solid var(--color-accent)',
          flexShrink: 0,
          background: checked ? 'var(--color-accent)' : 'transparent',
        }}
      />
      <span style={{ fontSize: 13.5, flex: 1 }}>{label}</span>
    </div>
  );
}
