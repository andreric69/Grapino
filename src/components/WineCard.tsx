import { useNavigate } from 'react-router-dom';
import { WINE_TYPE_LABELS, type Wine } from '../types';
import { FavoriteButton } from './FavoriteButton';
import { ConsumedButton } from './ConsumedButton';
import { WineBottlePlaceholder } from './WineBottlePlaceholder';

interface WineCardProps {
  wine: Wine;
  photoUrl?: string;
  onToggleFavorite: (wine: Wine) => void;
  onToggleConsumed: (wine: Wine) => void;
  /** Kompakte, horizontale Listenzeile statt Karte im Raster. */
  compact?: boolean;
}

export function WineCard({ wine, photoUrl, onToggleFavorite, onToggleConsumed, compact }: WineCardProps) {
  const navigate = useNavigate();

  function open() {
    navigate(`/wine/${wine.id}`);
  }

  if (compact) {
    return (
      <div
        className="card elev-sm"
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 }}
      >
        <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, background: 'var(--color-divider)' }}>
          {photoUrl ? (
            <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', padding: 3, boxSizing: 'border-box' }}>
              <WineBottlePlaceholder name={wine.name} wineType={wine.wine_type} />
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card-title" style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {wine.name}
          </div>
          <div className="card-meta" style={{ marginTop: 2 }}>
            {wine.vintage && <span>{wine.vintage}</span>}
            {wine.vintage && wine.region && <span>&middot;</span>}
            {wine.region && <span>{wine.region}</span>}
          </div>
        </div>
        {wine.quantity > 0 && (
          <span className="tag tag-outline" style={{ flexShrink: 0 }}>
            &times;{wine.quantity}
          </span>
        )}
        <FavoriteButton
          active={wine.is_favorite}
          onToggle={() => onToggleFavorite(wine)}
          style={{ position: 'static', flexShrink: 0, width: 26, height: 26 }}
        />
        <ConsumedButton
          active={wine.is_consumed}
          onToggle={() => onToggleConsumed(wine)}
          style={{ position: 'static', flexShrink: 0, width: 26, height: 26 }}
        />
      </div>
    );
  }

  return (
    <div
      className="wine-card card elev-sm"
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
    >
      <div className="plate" style={{ position: 'relative' }}>
        {photoUrl ? (
          <img src={photoUrl} alt="" />
        ) : (
          <div style={{ width: '100%', height: '100%', padding: '10% 0' }}>
            <WineBottlePlaceholder name={wine.name} wineType={wine.wine_type} />
          </div>
        )}

        <ConsumedButton
          active={wine.is_consumed}
          onToggle={() => onToggleConsumed(wine)}
          style={{ position: 'absolute', top: 6, left: 6 }}
        />

        <FavoriteButton
          active={wine.is_favorite}
          onToggle={() => onToggleFavorite(wine)}
          style={{ position: 'absolute', top: 6, right: 6 }}
        />

        {wine.quantity > 0 && (
          <span
            className="tag"
            style={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              background: 'color-mix(in srgb, var(--color-neutral-900) 65%, transparent)',
              color: '#f4ede4',
            }}
          >
            &times;{wine.quantity}
          </span>
        )}
      </div>
      <div className="wine-card-body">
        <div className="card-title" style={{ fontSize: 14 }}>
          {wine.name}
        </div>
        {wine.producer && <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 2 }}>{wine.producer}</div>}
        <div className="card-meta" style={{ marginTop: 6 }}>
          {wine.vintage && <span>{wine.vintage}</span>}
          {wine.vintage && wine.region && <span>&middot;</span>}
          {wine.region && <span>{wine.region}</span>}
        </div>
        {wine.wine_type && (
          <span className="tag tag-outline" style={{ marginTop: 6, fontSize: 9.5 }}>
            {WINE_TYPE_LABELS[wine.wine_type]}
          </span>
        )}
      </div>
    </div>
  );
}
