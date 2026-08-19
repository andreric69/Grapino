import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addOneBottle, deleteWine, drinkOneBottle, getSignedPhotoUrls, getWine } from '../lib/wineRepository';
import { useWineActions } from '../hooks/useWineActions';
import { WINE_TYPE_LABELS, splitCommaList, type Wine } from '../types';
import { StarRating } from '../components/StarRating';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { FavoriteButton } from '../components/FavoriteButton';
import { ConsumedButton } from '../components/ConsumedButton';
import { WineBottlePlaceholder } from '../components/WineBottlePlaceholder';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';

export function WineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [wine, setWine] = useState<Wine | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [activePhoto, setActivePhoto] = useState(0);
  const [fullscreenPhoto, setFullscreenPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmConsume, setConfirmConsume] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const { toastMessage, showToast } = useToast();

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getWine(id);
      setWine(data);
      setActivePhoto(0);
      const paths = data.photo_urls?.length ? data.photo_urls : data.photo_url ? [data.photo_url] : [];
      if (paths.length > 0) {
        const urlMap = await getSignedPhotoUrls(paths);
        setPhotoUrls(paths.map((p) => urlMap[p]).filter((u): u is string => !!u));
      } else {
        setPhotoUrls([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const { toggleFavorite: toggleFavoriteAction, toggleConsumed: toggleConsumedAction } = useWineActions({
    applyUpdate: (wineId, updater) => setWine((w) => (w && w.id === wineId ? updater(w) : w)),
    rollback: (_wineId, previous) => setWine(previous),
    showToast,
    onError: (msg) => setQuantityError(msg),
  });

  async function handleToggleFavorite() {
    if (!wine) return;
    await toggleFavoriteAction(wine);
  }

  // Getrunken-Icon: bei mehreren Flaschen geht nur eine weg (Bestand -1),
  // erst bei der letzten wandert der Wein in den "Getrunken"-Bereich. Vom
  // Getrunken-Bereich aus antippen holt ihn wieder in den Vorrat zurueck.
  async function handleToggleConsumed() {
    if (!wine) return;
    setQuantityError(null);
    await toggleConsumedAction(wine);
  }

  async function handleQuantityChange(delta: number) {
    if (!wine) return;
    if (delta === 0) return;
    const previous = wine;
    setQuantityError(null);
    try {
      if (delta > 0) {
        setWine({ ...wine, quantity: wine.quantity + 1, is_consumed: false });
        await addOneBottle(wine);
      } else {
        const nextQuantity = Math.max(0, wine.quantity - 1);
        if (nextQuantity === wine.quantity) return;
        setWine({ ...wine, quantity: nextQuantity, is_consumed: nextQuantity === 0 });
        await drinkOneBottle(wine);
      }
    } catch (e) {
      setWine(previous);
      setQuantityError(e instanceof Error ? e.message : 'Anzahl konnte nicht gespeichert werden.');
    }
  }

  async function handleDelete() {
    if (!wine) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteWine(wine);
      navigate('/');
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Loeschen fehlgeschlagen.');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="app-screen" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <LoadingSpinner label="Wein wird geladen ..." />
      </div>
    );
  }

  if (error || !wine) {
    return (
      <div className="app-screen">
        <ErrorBanner message={error ?? 'Wein nicht gefunden.'} onRetry={load} />
        <div style={{ padding: '0 20px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
            Zur Uebersicht
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-screen" style={{ paddingBottom: 40, position: 'relative' }}>
      <div className="top-bar">
        <button type="button" className="icon-btn" aria-label="Zurueck" onClick={() => navigate(-1)}>
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 1L2 9l8 8" />
          </svg>
        </button>
        <button
          type="button"
          className="btn"
          style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
          onClick={() => navigate(`/wine/${wine.id}/edit`)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 4l4 4L8 19H4v-4L15 4z" />
          </svg>
          Bearbeiten
        </button>
      </div>

      <div className="plate" style={{ margin: '0 20px', height: 380, position: 'relative' }}>
        {photoUrls.length > 0 ? (
          <img
            src={photoUrls[activePhoto]}
            alt=""
            onClick={() => setFullscreenPhoto(true)}
            style={{ cursor: 'zoom-in' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', padding: '5% 0' }}>
            <WineBottlePlaceholder name={wine.name} wineType={wine.wine_type} />
          </div>
        )}
        {photoUrls.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Vorheriges Foto"
              onClick={() => setActivePhoto((i) => (i - 1 + photoUrls.length) % photoUrls.length)}
              style={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0,0,0,0.35)',
                color: '#fff',
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              &lsaquo;
            </button>
            <button
              type="button"
              aria-label="Naechstes Foto"
              onClick={() => setActivePhoto((i) => (i + 1) % photoUrls.length)}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0,0,0,0.35)',
                color: '#fff',
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              &rsaquo;
            </button>
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 5,
              }}
            >
              {photoUrls.map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: i === activePhoto ? '#fff' : 'rgba(255,255,255,0.4)',
                  }}
                />
              ))}
            </div>
          </>
        )}
        <ConsumedButton
          active={wine.is_consumed}
          onToggle={() => (wine.is_consumed ? handleToggleConsumed() : setConfirmConsume(true))}
          style={{ position: 'absolute', top: 10, left: 10 }}
        />
        <FavoriteButton active={wine.is_favorite} onToggle={handleToggleFavorite} style={{ position: 'absolute', top: 10, right: 10 }} />
      </div>

      {fullscreenPhoto && photoUrls.length > 0 && (
        <div
          onClick={() => setFullscreenPhoto(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
          }}
        >
          <img
            src={photoUrls[activePhoto]}
            alt=""
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      )}
      {wine.is_consumed && (
        <div style={{ margin: '10px 20px 0', fontSize: 12.5, color: 'var(--color-accent)', fontWeight: 600 }}>
          Als getrunken markiert
        </div>
      )}

      <div style={{ padding: 20 }}>
        {(wine.subregion || wine.region || wine.country) && (
          <div className="card-kicker">
            {[wine.subregion, wine.region, wine.country].filter(Boolean).join(' · ')}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
          <h1 style={{ fontSize: 29, margin: '0 0 2px' }}>{wine.name}</h1>
          {wine.is_wishlist && (
            <span className="tag tag-accent" style={{ fontSize: 10 }}>
              Wunschliste
            </span>
          )}
        </div>
        <div style={{ fontSize: 13.5, opacity: 0.65 }}>{[wine.producer, wine.vintage].filter(Boolean).join(' · ')}</div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {wine.wine_type && <span className="tag tag-accent">{WINE_TYPE_LABELS[wine.wine_type]}</span>}
          {wine.vintage && <span className="tag tag-accent">{wine.vintage}</span>}
          {splitCommaList(wine.grape_variety).map((v) => (
            <button
              key={v}
              type="button"
              className="tag tag-outline"
              style={{ border: 0, cursor: 'pointer' }}
              onClick={() => navigate(`/lexikon?type=rebsorten&q=${encodeURIComponent(v)}`)}
            >
              {v}
            </button>
          ))}
          {wine.region && (
            <button
              type="button"
              className="tag tag-outline"
              style={{ border: 0, cursor: 'pointer' }}
              onClick={() => navigate(`/lexikon?type=regionen&q=${encodeURIComponent(wine.region!)}`)}
            >
              {wine.region}
            </button>
          )}
          {wine.bottle_size && <span className="tag tag-outline">{wine.bottle_size}</span>}
          {wine.price !== null && <span className="tag tag-outline">{wine.price.toFixed(2)}</span>}
          {typeof wine.community_rating === 'number' && (
            <span className="tag tag-outline">⌀ {wine.community_rating.toFixed(1)}/5</span>
          )}
        </div>

        {wine.critic_scores && (
          <div style={{ marginTop: 10, fontSize: 12.5, opacity: 0.7 }}>{wine.critic_scores}</div>
        )}

        {wine.food_pairing && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {splitCommaList(wine.food_pairing).map((f) => (
              <span key={f} className="tag" style={{ background: 'var(--color-divider)' }}>
                {f}
              </span>
            ))}
          </div>
        )}

        {(wine.drink_from || wine.drink_to || wine.storage_location) && (
          <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap', fontSize: 12.5 }}>
            {(wine.drink_from || wine.drink_to) && (
              <div>
                <span style={{ opacity: 0.55 }}>Trinkfenster: </span>
                {wine.drink_from ?? '?'}&ndash;{wine.drink_to ?? '?'}
              </div>
            )}
            {wine.storage_location && (
              <div>
                <span style={{ opacity: 0.55 }}>Lagerort: </span>
                {wine.storage_location}
              </div>
            )}
          </div>
        )}

        {(wine.tasting_tannin || wine.tasting_acidity || wine.tasting_sweetness || wine.tasting_body) && (
          <div style={{ marginTop: 16 }}>
            <div className="card-kicker" style={{ marginBottom: 8 }}>
              Verkostungsnotizen
            </div>
            <TastingNotesDisplay wine={wine} />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
          <span className="card-kicker">Bestand</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn btn-icon btn-secondary"
              aria-label="Eine Flasche weniger (getrunken)"
              onClick={() => handleQuantityChange(-1)}
              disabled={wine.quantity <= 0}
            >
              &minus;
            </button>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18, minWidth: 20, textAlign: 'center' }}>
              {wine.quantity}
            </span>
            <button
              type="button"
              className="btn btn-icon btn-secondary"
              aria-label="Eine Flasche mehr"
              onClick={() => handleQuantityChange(1)}
            >
              +
            </button>
          </div>
          <span style={{ fontSize: 12.5, opacity: 0.6 }}>{wine.quantity === 1 ? 'Flasche' : 'Flaschen'}</span>
        </div>
        {quantityError && <ErrorBanner message={quantityError} />}

        {wine.rating && (
          <div style={{ marginTop: 18 }}>
            <StarRating value={wine.rating} />
          </div>
        )}

        {wine.notes && (
          <>
            <div className="hr" />
            <div className="card-kicker" style={{ marginBottom: 8 }}>
              Notizen
            </div>
            <p style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: 16, lineHeight: 1.55, opacity: 0.9, margin: 0 }}>
              {wine.notes}
            </p>
          </>
        )}

        {wine.ean_code && (
          <div style={{ marginTop: 10, fontSize: 11, opacity: 0.45 }}>EAN: {wine.ean_code}</div>
        )}

        <div className="hr" />
        <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
          Wein loeschen
        </button>
        {deleteError && <ErrorBanner message={deleteError} onRetry={handleDelete} />}
      </div>

      {confirmDelete && (
        <div className="dialog-backdrop" onClick={() => !deleting && setConfirmDelete(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">Wein loeschen?</div>
            <div className="dialog-body">
              "{wine.name}" wird unwiderruflich geloescht, inklusive Foto. Das kann nicht rueckgaengig gemacht werden.
            </div>
            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Abbrechen
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Wird geloescht ...' : 'Loeschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmConsume && (
        <div className="dialog-backdrop" onClick={() => setConfirmConsume(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">Als getrunken markieren?</div>
            <div className="dialog-body">
              {wine.quantity > 1
                ? `Eine Flasche "${wine.name}" wird vom Vorrat abgebucht und im Rueckblick vermerkt.`
                : `"${wine.name}" wandert in den Bereich "Getrunken" und wird im Rueckblick vermerkt.`}
            </div>
            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmConsume(false)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setConfirmConsume(false);
                  handleToggleConsumed();
                }}
              >
                Bestaetigen
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toastMessage} />
    </div>
  );
}

const TASTING_ROWS: Array<{ key: 'tasting_tannin' | 'tasting_acidity' | 'tasting_sweetness' | 'tasting_body'; label: string }> = [
  { key: 'tasting_tannin', label: 'Tannin' },
  { key: 'tasting_acidity', label: 'Saeure' },
  { key: 'tasting_sweetness', label: 'Suesse' },
  { key: 'tasting_body', label: 'Koerper' },
];

function TastingNotesDisplay({ wine }: { wine: Wine }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {TASTING_ROWS.filter((r) => wine[r.key]).map((r) => (
        <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, width: 60, opacity: 0.65 }}>{r.label}</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                style={{
                  width: 16,
                  height: 6,
                  borderRadius: 3,
                  background: n <= (wine[r.key] ?? 0) ? 'var(--color-accent)' : 'var(--color-divider)',
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
