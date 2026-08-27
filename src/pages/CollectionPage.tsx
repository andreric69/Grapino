import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { listWines, getSignedPhotoUrls } from '../lib/wineRepository';
import { isBackupOverdue } from '../lib/backupReminder';
import { getUnfulfilledFeedbackRequest, markFeedbackRequestFulfilled } from '../lib/feedbackRepository';
import { getDueAnnouncements, dismissAnnouncement } from '../lib/announcementRepository';
import { useWineActions } from '../hooks/useWineActions';
import { WINE_TYPE_LABELS, splitCommaList, type Announcement, type SortDirection, type SortOption, type Wine } from '../types';
import { WineCard } from '../components/WineCard';
import { SearchBar } from '../components/SearchBar';
import { FilterSheet } from '../components/FilterSheet';
import { SortMenu, SORT_DEFAULT_DIRECTION } from '../components/SortMenu';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { ThemeToggle } from '../components/ThemeToggle';
import { BackupReminderBanner } from '../components/BackupReminderBanner';
import { AnnouncementBanner } from '../components/AnnouncementBanner';
import { DraftReminderBanner } from '../components/DraftReminderBanner';
import { hasWineDraft, clearWineDraft } from '../lib/wineDraft';
import { FeedbackModal } from '../components/FeedbackModal';
import { ChatBubble } from '../components/ChatBubble';
import { ConsumeDialog } from '../components/ConsumeDialog';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';

type FilterKey = 'vintage' | 'region' | 'country' | 'grape_variety' | 'wine_type' | 'bottle_size' | 'community_rating';
type Tab = 'active' | 'consumed' | 'wishlist';
type ViewMode = 'grid' | 'list';
const VIEW_MODE_KEY = 'weinsammlung-view-mode';

// Reihenfolge, in der die Filter-Chips angezeigt werden (Kundenperspektive:
// Jahrgang/Region/Land/Rebsorte sind die haeufigsten Suchkriterien, kommen
// deshalb zuerst - der Rest ist seltener gebraucht und kommt danach). Kein
// admin-konfigurierbares Umsortieren pro Person - eine feste, durchdachte
// Reihenfolge ist fuer 45+ nicht-technische Nutzer einfacher als eine
// weitere Einstellungsmoeglichkeit.
const FILTER_ORDER: FilterKey[] = ['vintage', 'region', 'country', 'grape_variety', 'wine_type', 'community_rating', 'bottle_size'];

// Filter/Suche/Sortierung ueberleben damit einen Ausflug auf die
// Detailseite und zurueck - vorher gingen sie beim Zurueckkommen verloren,
// weil CollectionPage beim Routenwechsel komplett neu gemountet wird.
const FILTER_STATE_KEY = 'weinsammlung-filter-state';
// Gleicher Grund wie oben, aber fuer die Scroll-Position - Papa will nach
// "Wein anschauen -> zurueck" wieder dort landen, wo er war, nicht ganz oben.
const SCROLL_STATE_KEY = 'weinsammlung-scroll-position';

interface PersistedFilterState {
  search: string;
  sort: SortOption;
  sortDirection: SortDirection;
  filters: Record<FilterKey, string[]>;
  favoritesOnly: boolean;
  noPriceOnly: boolean;
  noPhotoOnly: boolean;
  drinkNowOnly: boolean;
  tab: Tab;
}

const DEFAULT_FILTERS: Record<FilterKey, string[]> = {
  vintage: [],
  region: [],
  country: [],
  grape_variety: [],
  wine_type: [],
  bottle_size: [],
  community_rating: [],
};

// sessionStorage bewusst statt localStorage: Filter sollen einen Ausflug auf
// die Detailseite ueberleben, aber bei einem frischen App-Start (Tab/PWA neu
// geoeffnet) wieder leer sein - kein dauerhaft "hängender" Filter von vor
// Tagen.
function loadPersistedFilterState(): Partial<PersistedFilterState> {
  try {
    const raw = sessionStorage.getItem(FILTER_STATE_KEY);
    return raw ? (JSON.parse(raw) as Partial<PersistedFilterState>) : {};
  } catch {
    return {};
  }
}

const FILTER_LABELS: Record<FilterKey, string> = {
  vintage: 'Jahrgang',
  region: 'Region',
  country: 'Land',
  grape_variety: 'Rebsorte',
  wine_type: 'Typ',
  bottle_size: 'Flaschengrösse',
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

  const persistedFilterState = useMemo(loadPersistedFilterState, []);
  const [search, setSearch] = useState(persistedFilterState.search ?? '');
  const [sort, setSort] = useState<SortOption>(persistedFilterState.sort ?? 'newest');
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    persistedFilterState.sortDirection ?? SORT_DEFAULT_DIRECTION[persistedFilterState.sort ?? 'newest'],
  );
  const [filters, setFilters] = useState<Record<FilterKey, string[]>>(persistedFilterState.filters ?? DEFAULT_FILTERS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(persistedFilterState.favoritesOnly ?? false);
  const [noPriceOnly, setNoPriceOnly] = useState(persistedFilterState.noPriceOnly ?? false);
  const [noPhotoOnly, setNoPhotoOnly] = useState(persistedFilterState.noPhotoOnly ?? false);
  const [drinkNowOnly, setDrinkNowOnly] = useState(persistedFilterState.drinkNowOnly ?? false);
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [showDraftReminder, setShowDraftReminder] = useState(false);
  const [unseenAnnouncements, setUnseenAnnouncements] = useState<Announcement[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRequestId, setFeedbackRequestId] = useState<string | null>(null);
  const [pendingConsume, setPendingConsume] = useState<Wine | null>(null);
  const [tab, setTab] = useState<Tab>(persistedFilterState.tab ?? 'active');
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem(VIEW_MODE_KEY) as ViewMode | null) ?? 'grid',
  );
  const { toastMessage, showToast } = useToast();

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  useEffect(() => {
    const state: PersistedFilterState = {
      search,
      sort,
      sortDirection,
      filters,
      favoritesOnly,
      noPriceOnly,
      noPhotoOnly,
      drinkNowOnly,
      tab,
    };
    sessionStorage.setItem(FILTER_STATE_KEY, JSON.stringify(state));
  }, [search, sort, sortDirection, filters, favoritesOnly, noPriceOnly, noPhotoOnly, drinkNowOnly, tab]);

  // Scroll-Position merken, solange die Seite offen ist - und nach dem
  // Laden (z. B. beim Zurueckkommen von der Detailseite, siehe
  // FILTER_STATE_KEY oben fuer den gleichen Grund) wiederherstellen, statt
  // Papa jedes Mal ganz nach oben zu werfen.
  useEffect(() => {
    // Ein "scroll"-Event feuert waehrend Momentum-Scrolling viele Male pro
    // Sekunde - bei einer langen Liste (z. B. 1500 Weine) auf jedes einzelne
    // synchron in sessionStorage zu schreiben kann spuerbar ruckeln. Max.
    // einmal pro Frame schreiben reicht fuer den Zweck (Position beim
    // naechsten Mount wiederherstellen) voellig aus.
    let scheduled = false;
    function handleScroll() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        sessionStorage.setItem(SCROLL_STATE_KEY, String(window.scrollY));
        scheduled = false;
      });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (loading) return;
    const saved = Number(sessionStorage.getItem(SCROLL_STATE_KEY));
    if (!Number.isFinite(saved) || saved <= 0) return;
    requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: 'auto' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listWines();
      setWines(data);
      if (data.length > 0 && isBackupOverdue()) setShowBackupReminder(true);
      if (hasWineDraft()) setShowDraftReminder(true);
      // Das Feedback-Popup erscheint nur noch, wenn der Betreiber es ueber
      // "Feedback anfragen" aktiv ausgeloest hat - keine automatische
      // Anzeige mehr nach Zeit/Wein-Anzahl.
      const pendingRequest = await getUnfulfilledFeedbackRequest();
      if (pendingRequest) {
        setFeedbackRequestId(pendingRequest.id);
        setShowFeedback(true);
      }
      const paths = data.map((w) => w.photo_url).filter((p): p is string => !!p);
      const urls = await getSignedPhotoUrls(paths);
      setPhotoUrls(urls);

      setUnseenAnnouncements(await getDueAnnouncements());
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
      country: uniq(tabWines.map((w) => w.country)),
      grape_variety: uniqMulti(tabWines.map((w) => w.grape_variety)),
      wine_type: uniq(tabWines.map((w) => (w.wine_type ? WINE_TYPE_LABELS[w.wine_type] : null))),
      bottle_size: uniq(tabWines.map((w) => w.bottle_size)),
      community_rating: uniq(
        tabWines.map((w) => (typeof w.community_rating === 'number' ? w.community_rating.toFixed(1) : null)),
      ),
    };
  }, [tabWines]);

  const visibleWines = useMemo(() => {
    let result = tabWines;

    if (favoritesOnly) result = result.filter((w) => w.is_favorite);
    if (noPriceOnly) result = result.filter((w) => w.price === null);
    if (noPhotoOnly) result = result.filter((w) => !w.photo_url && w.photo_urls.length === 0);
    // Der Chip dafuer existiert nur im Vorrat-Tab (siehe chips-Liste unten) -
    // ohne diese Bedingung bliebe der Filter beim Wechsel zu Wunschliste/
    // Getrunken unsichtbar aktiv, ohne Moeglichkeit, ihn dort auszuschalten.
    if (drinkNowOnly && tab === 'active') {
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
    if (filters.bottle_size.length) result = result.filter((w) => w.bottle_size !== null && filters.bottle_size.includes(w.bottle_size));
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

    // Richtung nur auf die eigentliche Sortierung anwenden - Weine ohne
    // Trinkfenster bleiben bei "drinkwindow" IMMER ganz hinten, unabhaengig
    // von der Richtung (sonst wuerden sie bei "laenger haltbar zuerst"
    // ploetzlich ganz vorne stehen, obwohl "kein Trinkfenster bekannt" das
    // Gegenteil von "haltbar" bedeutet).
    const dir = sortDirection === 'asc' ? 1 : -1;
    result = [...result].sort((a, b) => {
      if (sort === 'name') {
        // Bei gleichem Namen (z. B. derselbe Wein in mehreren Jahrgaengen)
        // zusaetzlich nach Jahrgang sortieren, statt die Reihenfolge dem
        // Zufall zu ueberlassen - so stehen alle Jahrgaenge eines Weins
        // gruppiert und geordnet beieinander.
        return dir * (a.name.localeCompare(b.name, 'de') || (a.vintage ?? 0) - (b.vintage ?? 0));
      }
      if (sort === 'vintage') return dir * ((a.vintage ?? 0) - (b.vintage ?? 0));
      if (sort === 'price') return dir * ((a.price ?? -1) - (b.price ?? -1));
      if (sort === 'rating') return dir * ((a.rating ?? 0) - (b.rating ?? 0));
      if (sort === 'drinkwindow') {
        if (a.drink_to === null && b.drink_to === null) return 0;
        if (a.drink_to === null) return 1;
        if (b.drink_to === null) return -1;
        return dir * (a.drink_to - b.drink_to);
      }
      return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    return result;
  }, [tabWines, filters, search, sort, sortDirection, favoritesOnly, noPriceOnly, noPhotoOnly, drinkNowOnly]);

  const regionCount = useMemo(
    () => new Set(tabWines.map((w) => w.region).filter(Boolean)).size,
    [tabWines],
  );
  const bottleCount = useMemo(() => tabWines.reduce((sum, w) => sum + w.quantity, 0), [tabWines]);

  // Alle Filter-/Schnellwahl-Chips als eine einheitliche Liste, damit sie
  // sich zusammen sortieren lassen (aktive zuerst, siehe unten) und leere
  // Filter (nichts zum Filtern vorhanden) einheitlich ausgeblendet werden
  // koennen - aus Kundensicht soll nie ein Filter angetippt werden koennen,
  // der eh nichts liefert.
  const hasNoPrice = useMemo(() => tabWines.some((w) => w.price === null), [tabWines]);
  const hasNoPhoto = useMemo(() => tabWines.some((w) => !w.photo_url && w.photo_urls.length === 0), [tabWines]);
  const hasDrinkWindow = useMemo(() => tabWines.some((w) => w.drink_from !== null), [tabWines]);

  const chips = useMemo(() => {
    const items: { id: string; label: string; active: boolean; onOpen: () => void; onRemove: () => void }[] = [];
    for (const key of FILTER_ORDER) {
      if (filterOptions[key].length === 0) continue;
      const count = filters[key].length;
      items.push({
        id: key,
        label: count === 0 ? FILTER_LABELS[key] : count === 1 ? filters[key][0] : `${FILTER_LABELS[key]} (${count})`,
        active: count > 0,
        onOpen: () => setOpenFilter(key),
        onRemove: () => setFilters((f) => ({ ...f, [key]: [] })),
      });
    }
    if (tab === 'active' && hasDrinkWindow) {
      items.push({
        id: 'drinkNow',
        label: 'Jetzt trinkreif',
        active: drinkNowOnly,
        onOpen: () => setDrinkNowOnly((v) => !v),
        onRemove: () => setDrinkNowOnly(false),
      });
    }
    if (hasNoPrice) {
      items.push({
        id: 'noPrice',
        label: 'Ohne Preis',
        active: noPriceOnly,
        onOpen: () => setNoPriceOnly((v) => !v),
        onRemove: () => setNoPriceOnly(false),
      });
    }
    if (hasNoPhoto) {
      items.push({
        id: 'noPhoto',
        label: 'Ohne Foto',
        active: noPhotoOnly,
        onOpen: () => setNoPhotoOnly((v) => !v),
        onRemove: () => setNoPhotoOnly(false),
      });
    }
    // Aktive Filter kommen ganz nach vorn (links) - auf einen Blick sehen,
    // was gerade gefiltert wird, statt sie in der festen Reihenfolge suchen
    // zu muessen. Innerhalb "aktiv"/"inaktiv" bleibt die obige Reihenfolge erhalten.
    return [...items].sort((a, b) => Number(b.active) - Number(a.active));
  }, [filterOptions, filters, tab, hasDrinkWindow, drinkNowOnly, hasNoPrice, noPriceOnly, hasNoPhoto, noPhotoOnly]);

  const anyFilterActive = chips.some((c) => c.active);

  function clearAllFilters() {
    setFilters(DEFAULT_FILTERS);
    setDrinkNowOnly(false);
    setNoPriceOnly(false);
    setNoPhotoOnly(false);
  }

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
        <div className="subtitle" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: 'var(--color-accent)', opacity: 0.8, display: 'inline-flex' }}>
            <BottleIcon />
          </span>
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

      {unseenAnnouncements.map((a) => (
        <AnnouncementBanner
          key={a.id}
          announcement={a}
          onDismiss={() => {
            dismissAnnouncement(a.id);
            setUnseenAnnouncements((list) => list.filter((x) => x.id !== a.id));
          }}
        />
      ))}

      {showBackupReminder && (
        <BackupReminderBanner
          onOpenSettings={() => navigate('/settings')}
          onDismiss={() => setShowBackupReminder(false)}
        />
      )}

      {showDraftReminder && (
        <DraftReminderBanner
          onContinue={() => navigate('/wine/new')}
          onDiscard={() => {
            clearWineDraft();
            setShowDraftReminder(false);
          }}
        />
      )}

      <div style={{ display: 'flex', gap: 8, padding: '0 20px 14px' }}>
        <button
          type="button"
          className={tab === 'active' ? 'btn btn-primary' : 'btn btn-secondary'}
          style={{ flex: 1 }}
          onClick={() => setTab('active')}
        >
          <BottleIcon size={14} />
          Vorrat
        </button>
        <button
          type="button"
          className={tab === 'wishlist' ? 'btn btn-primary' : 'btn btn-secondary'}
          style={{ flex: 1 }}
          onClick={() => setTab('wishlist')}
        >
          <BookmarkIcon size={14} />
          Wunschliste
        </button>
        <button
          type="button"
          className={tab === 'consumed' ? 'btn btn-primary' : 'btn btn-secondary'}
          style={{ flex: 1 }}
          onClick={() => setTab('consumed')}
        >
          <CheckIcon size={14} />
          Getrunken
        </button>
      </div>

      <SearchBar value={search} onChange={setSearch} />

      {chips.length > 0 && (
        <div className="filter-row" style={{ padding: '0 20px 8px' }}>
          {anyFilterActive && (
            <button type="button" className="clear-all-btn" onClick={clearAllFilters}>
              Alle Filter entfernen
            </button>
          )}
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`tag tag-outline${chip.active ? ' is-active' : ''}`}
              onClick={chip.onOpen}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              {chip.label}
              {chip.active && (
                <span
                  role="button"
                  aria-label={`${chip.label}-Filter entfernen`}
                  onClick={(e) => {
                    e.stopPropagation();
                    chip.onRemove();
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    lineHeight: 1,
                    padding: '6px 8px',
                    margin: '-6px -8px -6px 2px',
                  }}
                >
                  &times;
                </span>
              )}
            </button>
          ))}
        </div>
      )}
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
        <SortMenu value={sort} direction={sortDirection} onChange={setSort} onChangeDirection={setSortDirection} />
      </div>

      {loading && <LoadingSpinner label="Sammlung wird geladen ..." />}
      {error && <ErrorBanner message={error} onRetry={load} />}

      {!loading && !error && visibleWines.length === 0 && (
        <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.6, fontSize: 14 }}>
          {wines.length === 0
            ? 'Noch keine Weine erfasst. Tippe auf + um den ersten Wein hinzuzufügen.'
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

      <button type="button" className="fab" aria-label="Neuen Wein hinzufügen" onClick={() => navigate('/wine/new')}>
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
        <ConsumeDialog
          wine={pendingConsume}
          onCancel={() => setPendingConsume(null)}
          onConfirm={(count) => {
            const wine = pendingConsume;
            setPendingConsume(null);
            handleToggleConsumed(wine, count);
          }}
        />
      )}

      <Toast message={toastMessage} />
    </div>
  );
}

/* ---- kleine Linien-Icons, einheitlich mit der Statistik-Seite ------------- */
function iconProps(size: number) {
  return { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
}
function BottleIcon({ size = 15 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M10 2h4v3.2l1.7 2.6c.2.3.3.7.3 1.1V20a2 2 0 01-2 2h-4a2 2 0 01-2-2V8.9c0-.4.1-.8.3-1.1L10 5.2V2z" />
      <path d="M9 12h6" />
    </svg>
  );
}
function BookmarkIcon({ size = 15 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M6.5 3h11a1 1 0 011 1v17l-6.5-4.2L5.5 21V4a1 1 0 011-1z" />
    </svg>
  );
}
function CheckIcon({ size = 15 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.3l2.6 2.6L16 9.5" />
    </svg>
  );
}
