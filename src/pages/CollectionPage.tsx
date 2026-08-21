import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { listWines, getSignedPhotoUrls } from '../lib/wineRepository';
import { isBackupOverdue } from '../lib/backupReminder';
import { isFeedbackDelayOver } from '../lib/feedbackReminder';
import {
  hasSubmittedFeedbackEver,
  getUnfulfilledFeedbackRequest,
  markFeedbackRequestFulfilled,
} from '../lib/feedbackRepository';
import { getDueAnnouncement, dismissAnnouncement } from '../lib/announcementRepository';
import { useWineActions } from '../hooks/useWineActions';
import { WINE_TYPE_LABELS, splitCommaList, type Announcement, type SortOption, type Wine } from '../types';
import { WineCard } from '../components/WineCard';
import { SearchBar } from '../components/SearchBar';
import { FilterSheet } from '../components/FilterSheet';
import { SortMenu } from '../components/SortMenu';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { ThemeToggle } from '../components/ThemeToggle';
import { BackupReminderBanner } from '../components/BackupReminderBanner';
import { AnnouncementBanner } from '../components/AnnouncementBanner';
import { FeedbackModal } from '../components/FeedbackModal';
import { ChatBubble } from '../components/ChatBubble';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';

const FEEDBACK_MIN_WINES = 3;

type FilterKey =
  | 'vintage'
  | 'region'
  | 'grape_variety'
  | 'wine_type'
  | 'country'
  | 'subregion'
  | 'bottle_size'
  | 'food_pairing'
  | 'community_rating';
type Tab = 'active' | 'consumed' | 'wishlist';
type ViewMode = 'grid' | 'list';
const VIEW_MODE_KEY = 'weinsammlung-view-mode';

const FILTER_LABELS: Record<FilterKey, string> = {
  vintage: 'Jahrgang',
  region: 'Region',
  grape_variety: 'Rebsorte',
  wine_type: 'Typ',
  country: 'Land',
  subregion: 'Subregion',
  bottle_size: 'Flaschengroesse',
  food_pairing: 'Passt zu',
  community_rating: 'Bewertung',
};

export function CollectionPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const displayName = (session?.user.user_metadata?.display_name as string | undefined)?.trim();
  const [wines, setWines] = useState<Wine[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [filters, setFilters] = useState<Record<FilterKey, string[]>>({
    vintage: [],
    region: [],
    grape_variety: [],
    wine_type: [],
    country: [],
    subregion: [],
    bottle_size: [],
    food_pairing: [],
    community_rating: [],
  });
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [noPriceOnly, setNoPriceOnly] = useState(false);
  const [drinkNowOnly, setDrinkNowOnly] = useState(false);
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [unseenAnnouncement, setUnseenAnnouncement] = useState<Announcement | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRequestId, setFeedbackRequestId] = useState<string | null>(null);
  const [pendingConsume, setPendingConsume] = useState<Wine | null>(null);
  const [tab, setTab] = useState<Tab>('active');
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem(VIEW_MODE_KEY) as ViewMode | null) ?? 'grid',
  );
  const { toastMessage, showToast } = useToast();

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listWines();
      setWines(data);
      if (data.length > 0 && isBackupOverdue()) setShowBackupReminder(true);
      // isFeedbackDelayOver() zeichnet beim allerersten Aufruf den "erster
      // Start"-Zeitpunkt auf - deshalb immer aufrufen (nicht erst ab 3 Weinen),
      // sonst wuerde die Stunde erst ab dem dritten Wein zu laufen beginnen.
      const delayOver = isFeedbackDelayOver();
      const pendingRequest = await getUnfulfilledFeedbackRequest();
      if (pendingRequest) {
        // Vom Betreiber aktiv angefragt - erscheint sofort, unabhaengig von
        // der sonstigen Verzoegerung und davon, ob schon einmal Feedback kam.
        setFeedbackRequestId(pendingRequest.id);
        setShowFeedback(true);
      } else if (data.length >= FEEDBACK_MIN_WINES && delayOver && !(await hasSubmittedFeedbackEver())) {
        setShowFeedback(true);
      }
      const paths = data.map((w) => w.photo_url).filter((p): p is string => !!p);
      const urls = await getSignedPhotoUrls(paths);
      setPhotoUrls(urls);

      const due = await getDueAnnouncement();
      setUnseenAnnouncement(due);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler.');
    } finally {
      setLoading(false);
    }
  }

  function handleFeedbackSubmitted() {
    if (feedbackRequestId) {
      markFeedbackRequestFulfilled(feedbackRequestId);
      setFeedbackRequestId(null);
    }
    setShowFeedback(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Getrunken" und "Wunschliste" sind eigene Bereiche, kein Filter - ein
  // Wunschlisten-Eintrag zaehlt nicht zum Bestand/zur Statistik und taucht
  // nie im normalen Vorrat auf.
  const tabWines = useMemo(() => {
    if (tab === 'wishlist') return wines.filter((w) => w.is_wishlist);
    if (tab === 'consumed') return wines.filter((w) => w.is_consumed && !w.is_wishlist);
    return wines.filter((w) => !w.is_consumed && !w.is_wishlist);
  }, [wines, tab]);

  const filterOptions = useMemo(() => {
    const uniq = (values: (string | number | null)[]) =>
      Array.from(new Set(values.filter((v): v is string => v !== null && v !== '').map(String))).sort();
    const uniqMulti = (values: (string | null)[]) =>
      Array.from(new Set(values.flatMap((v) => splitCommaList(v)))).sort();
    return {
      vintage: uniq(tabWines.map((w) => w.vintage)),
      region: uniq(tabWines.map((w) => w.region)),
      grape_variety: uniqMulti(tabWines.map((w) => w.grape_variety)),
      wine_type: uniq(tabWines.map((w) => (w.wine_type ? WINE_TYPE_LABELS[w.wine_type] : null))),
      country: uniq(tabWines.map((w) => w.country)),
      subregion: uniq(tabWines.map((w) => w.subregion)),
      bottle_size: uniq(tabWines.map((w) => w.bottle_size)),
      food_pairing: uniqMulti(tabWines.map((w) => w.food_pairing)),
      community_rating: uniq(
        tabWines.map((w) => (typeof w.community_rating === 'number' ? w.community_rating.toFixed(1) : null)),
      ),
    };
  }, [tabWines]);

  const visibleWines = useMemo(() => {
    let result = tabWines;

    if (favoritesOnly) result = result.filter((w) => w.is_favorite);
    if (noPriceOnly) result = result.filter((w) => w.price === null);
    if (drinkNowOnly) {
      const year = new Date().getFullYear();
      result = result.filter(
        (w) => w.drink_from !== null && w.drink_from <= year && (w.drink_to === null || w.drink_to >= year),
      );
    }
    if (filters.vintage.length) result = result.filter((w) => filters.vintage.includes(String(w.vintage)));
    if (filters.region.length) result = result.filter((w) => w.region !== null && filters.region.includes(w.region));
    if (filters.grape_variety.length) {
      const wanted = filters.grape_variety;
      result = result.filter((w) => splitCommaList(w.grape_variety).some((g) => wanted.includes(g)));
    }
    if (filters.wine_type.length) {
      const wanted = filters.wine_type;
      result = result.filter((w) => w.wine_type !== null && wanted.includes(WINE_TYPE_LABELS[w.wine_type]));
    }
    if (filters.country.length) result = result.filter((w) => w.country !== null && filters.country.includes(w.country));
    if (filters.subregion.length) result = result.filter((w) => w.subregion !== null && filters.subregion.includes(w.subregion));
    if (filters.bottle_size.length) result = result.filter((w) => w.bottle_size !== null && filters.bottle_size.includes(w.bottle_size));
    if (filters.food_pairing.length) {
      const wanted = filters.food_pairing;
      result = result.filter((w) => splitCommaList(w.food_pairing).some((f) => wanted.includes(f)));
    }
    if (filters.community_rating.length) {
      result = result.filter(
        (w) => typeof w.community_rating === 'number' && filters.community_rating.includes(w.community_rating.toFixed(1)),
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          (w.producer ?? '').toLowerCase().includes(q) ||
          (w.region ?? '').toLowerCase().includes(q) ||
          (w.subregion ?? '').toLowerCase().includes(q) ||
          (w.country ?? '').toLowerCase().includes(q) ||
          (w.grape_variety ?? '').toLowerCase().includes(q),
      );
    }

    result = [...result].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'de');
      if (sort === 'vintage') return (b.vintage ?? 0) - (a.vintage ?? 0);
      if (sort === 'price') return (b.price ?? -1) - (a.price ?? -1);
      if (sort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      if (sort === 'drinkwindow') {
        // Weine mit Trinkfenster zuerst, danach nach fruehestem Ablauf (drink_to) sortiert -
        // "bald faellig" oben. Weine ohne Trinkfenster stehen ganz hinten.
        if (a.drink_to === null && b.drink_to === null) return 0;
        if (a.drink_to === null) return 1;
        if (b.drink_to === null) return -1;
        return a.drink_to - b.drink_to;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [tabWines, filters, search, sort, favoritesOnly, noPriceOnly, drinkNowOnly]);

  const regionCount = useMemo(
    () => new Set(tabWines.map((w) => w.region).filter(Boolean)).size,
    [tabWines],
  );
  const bottleCount = useMemo(() => tabWines.reduce((sum, w) => sum + w.quantity, 0), [tabWines]);

  const { toggleFavorite: handleToggleFavorite, toggleConsumed: handleToggleConsumed } = useWineActions({
    applyUpdate: (wineId, updater) =>
      setWines((ws) => ws.map((w) => (w.id === wineId ? updater(w) : w))),
    rollback: (wineId, previous) => setWines((ws) => ws.map((w) => (w.id === wineId ? previous : w))),
    showToast,
  });

  return (
    <div className="app-screen">
      <ChatBubble wines={wines} />
      <div className="top-bar">
        <button
          type="button"
          className="icon-btn"
          aria-label={favoritesOnly ? 'Alle Weine anzeigen' : 'Nur Favoriten anzeigen'}
          aria-pressed={favoritesOnly}
          style={favoritesOnly ? { borderColor: 'var(--color-bordeaux)' } : undefined}
          onClick={() => setFavoritesOnly((v) => !v)}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill={favoritesOnly ? 'var(--color-bordeaux-fill)' : 'none'}
            stroke={favoritesOnly ? 'var(--color-bordeaux-fill)' : 'var(--color-text)'}
            strokeWidth="1.8"
          >
            <path d="M12 20.5s-7.5-4.6-10-9.3C0.3 7.9 2 4.5 5.4 4c2-.3 3.9.6 5 2.2C11.6 4.6 13.5 3.7 15.5 4c3.4.5 5.1 3.9 3.5 7.2-2.5 4.7-10 9.3-10 9.3z" />
          </svg>
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="icon-btn" aria-label="Einstellungen" title="Einstellungen" onClick={() => navigate('/settings')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 008.6 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 8.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.42.7.7 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
          <ThemeToggle />
        </div>
      </div>

      <div className="app-header">
        <div className="kicker">{displayName ? `Hallo, ${displayName}` : 'Private Sammlung'}</div>
        <h1>Meine Weine</h1>
        <div className="subtitle">
          {bottleCount} {bottleCount === 1 ? 'Flasche' : 'Flaschen'}
          {regionCount > 0 && (
            <>
              {' '}
              &middot; {regionCount} {regionCount === 1 ? 'Region' : 'Regionen'}
            </>
          )}
          {favoritesOnly && <> &middot; nur Favoriten</>}
        </div>
      </div>

      {unseenAnnouncement && (
        <AnnouncementBanner
          announcement={unseenAnnouncement}
          onDismiss={() => {
            dismissAnnouncement(unseenAnnouncement.id);
            setUnseenAnnouncement(null);
          }}
        />
      )}

      {showBackupReminder && (
        <BackupReminderBanner
          onOpenSettings={() => navigate('/settings')}
          onDismiss={() => setShowBackupReminder(false)}
        />
      )}

      <div style={{ display: 'flex', gap: 8, padding: '0 20px 14px' }}>
        <button
          type="button"
          className={tab === 'active' ? 'btn btn-primary' : 'btn btn-secondary'}
          style={{ flex: 1 }}
          onClick={() => setTab('active')}
        >
          Vorrat
        </button>
        <button
          type="button"
          className={tab === 'wishlist' ? 'btn btn-primary' : 'btn btn-secondary'}
          style={{ flex: 1 }}
          onClick={() => setTab('wishlist')}
        >
          Wunschliste
        </button>
        <button
          type="button"
          className={tab === 'consumed' ? 'btn btn-primary' : 'btn btn-secondary'}
          style={{ flex: 1 }}
          onClick={() => setTab('consumed')}
        >
          Getrunken
        </button>
      </div>

      <SearchBar value={search} onChange={setSearch} />

      <div className="filter-row" style={{ padding: '0 20px 8px' }}>
        {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => {
          const count = filters[key].length;
          const label = count === 0 ? FILTER_LABELS[key] : count === 1 ? filters[key][0] : `${FILTER_LABELS[key]} (${count})`;
          return (
            <button
              key={key}
              type="button"
              className={`tag tag-outline${count > 0 ? ' is-active' : ''}`}
              onClick={() => setOpenFilter(key)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              {label}
              {count > 0 && (
                <span
                  role="button"
                  aria-label={`${FILTER_LABELS[key]}-Filter entfernen`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilters((f) => ({ ...f, [key]: [] }));
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.85,
                    fontSize: 20,
                    lineHeight: 1,
                    padding: '4px 6px',
                    margin: '-4px -4px -4px 0',
                  }}
                >
                  &times;
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          className={`tag tag-outline${noPriceOnly ? ' is-active' : ''}`}
          onClick={() => setNoPriceOnly((v) => !v)}
        >
          Ohne Preis
        </button>
        {tab === 'active' && (
          <button
            type="button"
            className={`tag tag-outline${drinkNowOnly ? ' is-active' : ''}`}
            onClick={() => setDrinkNowOnly((v) => !v)}
          >
            Jetzt trinkreif
          </button>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center', padding: '0 20px 14px' }}>
        <div style={{ display: 'flex', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <button
            type="button"
            aria-label="Rasteransicht"
            aria-pressed={viewMode === 'grid'}
            onClick={() => changeViewMode('grid')}
            style={{
              padding: '9px 12px',
              border: 'none',
              background: viewMode === 'grid' ? 'var(--color-accent)' : 'transparent',
              color: viewMode === 'grid' ? '#fff' : 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="8" height="8" /><rect x="13" y="3" width="8" height="8" />
              <rect x="3" y="13" width="8" height="8" /><rect x="13" y="13" width="8" height="8" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Listenansicht"
            aria-pressed={viewMode === 'list'}
            onClick={() => changeViewMode('list')}
            style={{
              padding: '9px 12px',
              border: 'none',
              background: viewMode === 'list' ? 'var(--color-accent)' : 'transparent',
              color: viewMode === 'list' ? '#fff' : 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        </div>
        <SortMenu value={sort} onChange={setSort} />
      </div>

      {loading && <LoadingSpinner label="Sammlung wird geladen ..." />}
      {error && <ErrorBanner message={error} onRetry={load} />}

      {!loading && !error && visibleWines.length === 0 && (
        <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.6, fontSize: 14 }}>
          {wines.length === 0
            ? 'Noch keine Weine erfasst. Tippe auf + um den ersten Wein hinzuzufuegen.'
            : tab === 'consumed'
              ? 'Noch keine Weine als getrunken markiert.'
              : tab === 'wishlist'
                ? 'Noch nichts auf der Wunschliste.'
                : favoritesOnly
                  ? 'Noch keine Favoriten markiert.'
                  : 'Keine Weine gefunden.'}
        </div>
      )}

      {!loading && !error && visibleWines.length > 0 && (
        <div className={viewMode === 'grid' ? 'wine-grid' : 'wine-list'}>
          {visibleWines.map((wine) => (
            <WineCard
              key={wine.id}
              wine={wine}
              photoUrl={wine.photo_url ? photoUrls[wine.photo_url] : undefined}
              onToggleFavorite={handleToggleFavorite}
              onToggleConsumed={(w) => (w.is_consumed ? handleToggleConsumed(w) : setPendingConsume(w))}
              compact={viewMode === 'list'}
            />
          ))}
        </div>
      )}

      <button type="button" className="fab" aria-label="Neuen Wein hinzufuegen" onClick={() => navigate('/wine/new')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f4ede1" strokeWidth="2.2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {openFilter && (
        <FilterSheet
          title={FILTER_LABELS[openFilter]}
          options={filterOptions[openFilter]}
          selected={filters[openFilter]}
          onToggle={(v) =>
            setFilters((f) => {
              const current = f[openFilter];
              const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
              return { ...f, [openFilter]: next };
            })
          }
          onClear={() => setFilters((f) => ({ ...f, [openFilter]: [] }))}
          onClose={() => setOpenFilter(null)}
        />
      )}

      {showFeedback && <FeedbackModal onSubmitted={handleFeedbackSubmitted} />}

      {pendingConsume && (
        <div className="dialog-backdrop" onClick={() => setPendingConsume(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">Als getrunken markieren?</div>
            <div className="dialog-body">
              {pendingConsume.quantity > 1
                ? `Eine Flasche "${pendingConsume.name}" wird vom Vorrat abgebucht und im Rueckblick vermerkt.`
                : `"${pendingConsume.name}" wandert in den Bereich "Getrunken" und wird im Rueckblick vermerkt.`}
            </div>
            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setPendingConsume(null)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const wine = pendingConsume;
                  setPendingConsume(null);
                  handleToggleConsumed(wine);
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
