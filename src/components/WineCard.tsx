import { useNavigate } from 'react-router-dom';
import { WINE_TYPE_LABELS, type Wine } from '../types';
import { QuantityStepper } from './QuantityStepper';
import { WineBottlePlaceholder } from './WineBottlePlaceholder';

interface WineCardProps {
  wine: Wine;
  photoUrl?: string;
  onRequestAdd: (wine: Wine) => void;
  onRequestRemove: (wine: Wine) => void;
  onRestore: (wine: Wine) => void;
  /** Kompakte, horizontale Listenzeile statt Karte im Raster. */
  compact?: boolean;
}

/** Kleines, NICHT antippbares Herz-Zeichen - reine Anzeige, ob dieser Wein auf der Detailseite als Favorit markiert wurde. Kein Filter, kein Tap-Ziel. */
function FavoriteBadge({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--color-bordeaux)" stroke="none" style={{ flexShrink: 0 }}>
      <path d="M12 20.5s-7.5-4.6-10-9.3C0.3 7.9 2 4.5 5.4 4c2-.3 3.9.6 5 2.2C11.6 4.6 13.5 3.7 15.5 4c3.4.5 5.1 3.9 3.5 7.2-2.5 4.7-10 9.3-10 9.3z" />
    </svg>
  );
}

export function WineCard({ wine, photoUrl, onRequestAdd, onRequestRemove, onRestore, compact }: WineCardProps) {
  const navigate = useNavigate();

  function open() {
    navigate(`/wine/${wine.id}`);
  }

  const consumedRow = wine.is_consumed ? (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span className="tag tag-warn">Getrunken</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRestore(wine);
        }}
        style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: 'var(--color-accent)', textDecoration: 'underline', cursor: 'pointer' }}
      >
        Zurück in Vorrat
      </button>
    </div>
  ) : (
    <QuantityStepper
      quantity={wine.quantity}
      onRequestAdd={() => onRequestAdd(wine)}
      onRequestRemove={() => onRequestRemove(wine)}
      size={compact ? 'sm' : 'md'}
    />
  );

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
            <img src={photoUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', padding: 3, boxSizing: 'border-box' }}>
              <WineBottlePlaceholder name={wine.name} wineType={wine.wine_type} />
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div className="card-title" style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {wine.name}
            </div>
            {wine.is_favorite && <FavoriteBadge size={11} />}
          </div>
          <div className="card-meta" style={{ marginTop: 2 }}>
            {wine.vintage && <span>{wine.vintage}</span>}
            {wine.vintage && wine.region && <span>&middot;</span>}
            {wine.region && <span>{wine.region}</span>}
          </div>
        </div>
        {consumedRow}
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
          <img src={photoUrl} alt="" loading="lazy" />
        ) : (
          <div style={{ width: '100%', height: '100%', padding: '10% 0' }}>
            <WineBottlePlaceholder name={wine.name} wineType={wine.wine_type} />
          </div>
        )}

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
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <div className="card-title" style={{ fontSize: 14, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {wine.name}
          </div>
          {wine.is_favorite && <FavoriteBadge />}
        </div>
        {wine.producer && <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 2 }}>{wine.producer}</div>}
        <div className="card-meta" style={{ marginTop: 6 }}>
          {wine.vintage && <span>{wine.vintage}</span>}
          {wine.vintage && wine.region && <span>&middot;</span>}
          {wine.region && <span>{wine.region}</span>}
        </div>
        {wine.wine_type && !wine.is_consumed && (
          <span className="tag tag-outline" style={{ marginTop: 6, fontSize: 9.5 }}>
            {WINE_TYPE_LABELS[wine.wine_type]}
          </span>
        )}
        <div style={{ marginTop: 9 }}>{consumedRow}</div>
      </div>
    </div>
  );
}
