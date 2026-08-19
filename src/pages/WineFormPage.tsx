import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createWine,
  getSignedPhotoUrls,
  getWine,
  listWines,
  NETWORK_ERROR_MESSAGE,
  updateWine,
  uploadWinePhoto,
  uploadWinePhotos,
} from '../lib/wineRepository';
import { compressImage, preprocessForOcr } from '../lib/imageCompression';
import { preloadOcrWorker, recognizeWineLabel } from '../lib/ocr';
import { preloadWineReference, lookupCountryForRegion, lookupCountryForProducer, lookupTypeForGrape } from '../lib/wineReference';
import { WINE_TYPE_LABELS, type Wine, type WineType } from '../types';
import { PhotoCapture } from '../components/PhotoCapture';
import { OcrChipTray } from '../components/OcrChipTray';
import { StarRating } from '../components/StarRating';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { TastingNotesInput } from '../components/TastingNotesInput';
import { HAS_CAMERA_SCANNER } from '../lib/cameraSupport';
import { useBarcodeLookup } from '../hooks/useBarcodeLookup';
import { useDuplicateCheck } from '../hooks/useDuplicateCheck';

// Code-Splitting: die Scanner-Bibliothek (ZXing) ist relativ gross und wird
// so nur geladen, wenn der Nutzer den Scanner tatsaechlich oeffnet, statt bei
// jedem Formular-Aufruf.
const BarcodeScanner = lazy(() => import('../components/BarcodeScanner'));

export type SuggestedField = 'name' | 'producer' | 'vintage' | 'grapeVariety' | 'region' | 'country' | 'wineType';

export interface FormState {
  name: string;
  producer: string;
  vintage: string;
  quantity: string;
  price: string;
  grapeVariety: string;
  region: string;
  notes: string;
  rating: number | null;
  wineType: WineType | '';
  country: string;
  subregion: string;
  bottleSize: string;
  communityRating: string;
  criticScores: string;
  foodPairing: string;
  drinkFrom: string;
  drinkTo: string;
  isWishlist: boolean;
  storageLocation: string;
  tastingTannin: number | null;
  tastingAcidity: number | null;
  tastingSweetness: number | null;
  tastingBody: number | null;
  eanCode: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  producer: '',
  vintage: '',
  quantity: '1',
  price: '',
  grapeVariety: '',
  region: '',
  notes: '',
  rating: null,
  wineType: '',
  country: '',
  subregion: '',
  bottleSize: '',
  communityRating: '',
  criticScores: '',
  foodPairing: '',
  drinkFrom: '',
  drinkTo: '',
  isWishlist: false,
  storageLocation: '',
  tastingTannin: null,
  tastingAcidity: null,
  tastingSweetness: null,
  tastingBody: null,
  eanCode: '',
};

const WINE_TYPE_OPTIONS: WineType[] = ['rot', 'weiss', 'rose', 'dessert', 'schaumwein'];

interface ExtraPhoto {
  id: string;
  blob: Blob | null;
  existingPath: string | null;
  previewUrl: string;
}

export function WineFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [suggested, setSuggested] = useState<Set<SuggestedField>>(new Set());
  const [chips, setChips] = useState<string[]>([]);
  const [hoveredDropField, setHoveredDropField] = useState<string | null>(null);

  const [existingWine, setExistingWine] = useState<Wine | null>(null);
  // Falls das Speichern nach dem Anlegen (z. B. beim Foto-Upload) fehlschlaegt,
  // verhindert das einen doppelten Eintrag, wenn der Nutzer erneut "speichern" drueckt.
  const [createdWineId, setCreatedWineId] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [pendingPhotoBlob, setPendingPhotoBlob] = useState<Blob | null>(null);
  const [extraPhotos, setExtraPhotos] = useState<ExtraPhoto[]>([]);
  const extraPhotoInputRef = useRef<HTMLInputElement>(null);

  const [loadingExisting, setLoadingExisting] = useState(mode === 'edit');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    setExistingWinesForCheck,
    duplicateWine,
    setDuplicateWine,
    duplicateBusy,
    skipDuplicateCheckRef,
    findDuplicate,
    handleIncreaseDuplicateInstead,
  } = useDuplicateCheck({ navigate, setSaveError });

  // Wird gesetzt, wenn der Nutzer die Texterkennung ueberspringt - ein spaeter
  // eintreffendes OCR-Ergebnis darf dann die manuell eingetragenen Werte nicht
  // mehr ueberschreiben.
  const ocrSkippedRef = useRef(false);

  // Merkt sich vom Browser erzeugte Objekt-URLs (Foto-Vorschau vor dem
  // Speichern), damit sie beim Wechsel/Verlassen wieder freigegeben werden.
  const objectUrlRef = useRef<string | null>(null);
  const extraObjectUrlsRef = useRef<string[]>([]);

  const {
    showBarcodeScanner,
    setShowBarcodeScanner,
    barcodeLookupBusy,
    barcodeLookupMessage,
    suggestedPhotoUrl,
    setSuggestedPhotoUrl,
    suggestedPhotoBusy,
    handleBarcodeDetect,
    handleAcceptSuggestedPhoto,
  } = useBarcodeLookup({
    photoPreviewUrl,
    setPhotoPreviewUrl,
    setPendingPhotoBlob,
    objectUrlRef,
    updateField,
    setForm,
    setSuggested,
  });

  useEffect(() => {
    preloadWineReference(); // schon mal im Hintergrund laden, bevor ein Foto gewaehlt wird
    preloadOcrWorker(); // OCR-Sprachmodelle ebenfalls schon vorab laden, spart Zeit beim ersten Foto
    if (mode === 'create') {
      listWines()
        .then(setExistingWinesForCheck)
        .catch(() => {
          /* Duplikat-Check ist nur eine Hilfestellung - bei Fehler einfach ohne ihn weitermachen. */
        });
    }
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      for (const u of extraObjectUrlsRef.current) URL.revokeObjectURL(u);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    (async () => {
      setLoadingExisting(true);
      setLoadError(null);
      try {
        const wine = await getWine(id);
        setExistingWine(wine);
        setForm({
          name: wine.name,
          producer: wine.producer ?? '',
          vintage: wine.vintage ? String(wine.vintage) : '',
          quantity: String(wine.quantity),
          price: wine.price !== null ? String(wine.price) : '',
          grapeVariety: wine.grape_variety ?? '',
          region: wine.region ?? '',
          notes: wine.notes ?? '',
          rating: wine.rating,
          wineType: wine.wine_type ?? '',
          country: wine.country ?? '',
          subregion: wine.subregion ?? '',
          bottleSize: wine.bottle_size ?? '',
          communityRating: typeof wine.community_rating === 'number' ? String(wine.community_rating) : '',
          criticScores: wine.critic_scores ?? '',
          foodPairing: wine.food_pairing ?? '',
          drinkFrom: wine.drink_from ? String(wine.drink_from) : '',
          drinkTo: wine.drink_to ? String(wine.drink_to) : '',
          isWishlist: wine.is_wishlist,
          storageLocation: wine.storage_location ?? '',
          tastingTannin: wine.tasting_tannin,
          tastingAcidity: wine.tasting_acidity,
          tastingSweetness: wine.tasting_sweetness,
          tastingBody: wine.tasting_body,
          eanCode: wine.ean_code ?? '',
        });

        const allPaths = wine.photo_urls?.length ? wine.photo_urls : wine.photo_url ? [wine.photo_url] : [];
        if (allPaths.length > 0) {
          const urls = await getSignedPhotoUrls(allPaths);
          setPhotoPreviewUrl(urls[allPaths[0]] ?? null);
          setExtraPhotos(
            allPaths.slice(1).map((path) => ({
              id: path,
              blob: null,
              existingPath: path,
              previewUrl: urls[path] ?? '',
            })),
          );
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : NETWORK_ERROR_MESSAGE);
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [mode, id]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function clearSuggestion(field: SuggestedField) {
    setSuggested((s) => {
      if (!s.has(field)) return s;
      const next = new Set(s);
      next.delete(field);
      return next;
    });
  }

  // Waehrend der Nutzer Region/Rebsorte von Hand eintippt (nicht per OCR),
  // wird - falls das Land/Typ-Feld noch leer ist - automatisch ein Vorschlag
  // aus den Referenzdaten nachgezogen (z. B. Region "Barolo" -> Land "Italy").
  // Debounced, damit nicht bei jedem Tastenanschlag nachgeschlagen wird.
  useEffect(() => {
    if (!form.region.trim() || form.country.trim()) return;
    const handle = setTimeout(async () => {
      const country = await lookupCountryForRegion(form.region);
      if (country) {
        setForm((f) => (f.country.trim() ? f : { ...f, country }));
        setSuggested((s) => new Set(s).add('country'));
      }
    }, 500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.region]);

  // Ergaenzung zur Region-Ableitung oben: falls die Region nichts liefert,
  // wird das Land alternativ aus dem eingetippten Produzenten/Weingut
  // abgeleitet (z. B. "Château Giscours" -> Land "France").
  useEffect(() => {
    if (!form.producer.trim() || form.country.trim()) return;
    const handle = setTimeout(async () => {
      const country = await lookupCountryForProducer(form.producer);
      if (country) {
        setForm((f) => (f.country.trim() ? f : { ...f, country }));
        setSuggested((s) => new Set(s).add('country'));
      }
    }, 500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.producer]);

  useEffect(() => {
    if (!form.grapeVariety.trim() || form.wineType) return;
    const handle = setTimeout(async () => {
      const wineType = await lookupTypeForGrape(form.grapeVariety);
      if (wineType) {
        setForm((f) => (f.wineType ? f : { ...f, wineType }));
        setSuggested((s) => new Set(s).add('wineType'));
      }
    }, 500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.grapeVariety]);

  async function handlePhotoSelect(file: File) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setPhotoPreviewUrl(objectUrl);
    setOcrBusy(true);
    setChips([]);
    ocrSkippedRef.current = false;
    try {
      const compressed = await compressImage(file);
      setPendingPhotoBlob(compressed);

      // Fuer die Texterkennung eine eigene, hoeher aufgeloeste Kopie des
      // ORIGINALFOTOS erzeugen (nicht die 1500px-Speicherversion) - moderne
      // Handyfotos haben oft deutlich mehr Detail, das fuer kleine
      // Etikett-Schrift (Rebsorte, Region, Prozentzahl) verloren geht, wenn
      // man nur die schon auf Speichergroesse verkleinerte Version nutzt.
      // Diese Kopie wird nie gespeichert/hochgeladen, nur an die
      // Texterkennung uebergeben und danach verworfen.
      const ocrSource = await compressImage(file, 2200).catch(() => compressed);

      // Fuer die Texterkennung zusaetzlich Graustufen + Kontrast anwenden -
      // das gespeicherte Farbfoto bleibt unangetastet, nur die OCR-Eingabe
      // wird optimiert.
      const ocrInput = await preprocessForOcr(ocrSource).catch(() => ocrSource);

      // Erkennung darf den Nutzer nie unbegrenzt blockieren - nach 20s wird
      // abgebrochen und einfach manuell weitergemacht.
      const suggestions = await Promise.race([
        recognizeWineLabel(ocrInput),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('OCR-Timeout')), 20000)),
      ]);

      if (ocrSkippedRef.current) return; // Nutzer wollte manuell eintragen - Ergebnis verwerfen.

      const nextSuggested = new Set<SuggestedField>();
      setForm((f) => {
        const next = { ...f };
        if (suggestions.name) {
          next.name = suggestions.name;
          nextSuggested.add('name');
        }
        if (suggestions.producer) {
          next.producer = suggestions.producer;
          nextSuggested.add('producer');
        }
        if (suggestions.vintage) {
          next.vintage = String(suggestions.vintage);
          nextSuggested.add('vintage');
        }
        if (suggestions.grapeVariety) {
          next.grapeVariety = suggestions.grapeVariety;
          nextSuggested.add('grapeVariety');
        }
        if (suggestions.region) {
          next.region = suggestions.region;
          nextSuggested.add('region');
        }
        if (suggestions.country) {
          next.country = suggestions.country;
          nextSuggested.add('country');
        }
        if (suggestions.wineType) {
          next.wineType = suggestions.wineType;
          nextSuggested.add('wineType');
        }
        return next;
      });
      setSuggested(nextSuggested);
      setChips(suggestions.chips);
    } catch (e) {
      // Foto-Erkennung ist nur eine Hilfestellung - schlaegt sie fehl, traegt
      // der Nutzer die Angaben einfach manuell ein. Kein Fehlerbanner noetig.
      console.error('OCR fehlgeschlagen:', e);
    } finally {
      setOcrBusy(false);
    }
  }

  function handleSkipOcr() {
    ocrSkippedRef.current = true;
    setOcrBusy(false);
  }

  async function handleExtraPhotoSelect(file: File) {
    const compressed = await compressImage(file);
    const previewUrl = URL.createObjectURL(compressed);
    extraObjectUrlsRef.current.push(previewUrl);
    setExtraPhotos((photos) => [
      ...photos,
      { id: `${Date.now()}-${Math.random()}`, blob: compressed, existingPath: null, previewUrl },
    ]);
  }

  function removeExtraPhoto(id: string) {
    setExtraPhotos((photos) => photos.filter((p) => p.id !== id));
  }

  // Ein erkanntes Textfragment ("Chip") wurde auf ein Feld gezogen. Der Chip
  // bleibt danach weiter bestehen - er darf beliebig oft auf beliebige Felder
  // gezogen werden (z. B. wenn derselbe Begriff sowohl als Name als auch als
  // Produzent infrage kommt).
  function handleChipAssign(text: string, field: string) {
    if (field === 'vintage') {
      const match = text.match(/\b(19|20)\d{2}\b/);
      if (!match) return; // Jahrgang-Feld akzeptiert nur eine echte 4-stellige Jahreszahl.
      updateField('vintage', match[0]);
      clearSuggestion('vintage');
      return;
    }
    if (field === 'name' || field === 'producer' || field === 'grapeVariety' || field === 'region') {
      updateField(field, text);
      clearSuggestion(field);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (mode === 'create' && !skipDuplicateCheckRef.current) {
      const dup = findDuplicate(form.name, form.producer, form.vintage);
      if (dup) {
        setDuplicateWine(dup);
        return;
      }
    }

    setSaving(true);
    setSaveError(null);
    try {
      const input = {
        name: form.name.trim(),
        producer: form.producer.trim() || null,
        vintage: form.vintage ? Number(form.vintage) : null,
        quantity: form.quantity ? Math.max(0, Math.round(Number(form.quantity))) : 1,
        price: form.price.trim() ? Math.max(0, Number(form.price)) : null,
        grape_variety: form.grapeVariety.trim() || null,
        region: form.region.trim() || null,
        notes: form.notes.trim() || null,
        rating: form.rating,
        photo_url: existingWine?.photo_url ?? null,
        photo_urls: existingWine?.photo_urls ?? [],
        is_favorite: existingWine?.is_favorite ?? false,
        is_consumed: existingWine?.is_consumed ?? false,
        wine_type: form.wineType || null,
        country: form.country.trim() || null,
        subregion: form.subregion.trim() || null,
        bottle_size: form.bottleSize.trim() || null,
        community_rating: form.communityRating.trim()
          ? Math.min(5, Math.max(0, Number(form.communityRating)))
          : null,
        critic_scores: form.criticScores.trim() || null,
        food_pairing: form.foodPairing.trim() || null,
        drink_from: form.drinkFrom ? Number(form.drinkFrom) : null,
        drink_to: form.drinkTo ? Number(form.drinkTo) : null,
        is_wishlist: form.isWishlist,
        storage_location: form.storageLocation.trim() || null,
        tasting_tannin: form.tastingTannin,
        tasting_acidity: form.tastingAcidity,
        tasting_sweetness: form.tastingSweetness,
        tasting_body: form.tastingBody,
        ean_code: form.eanCode.trim() || null,
      };

      const targetId = existingWine?.id ?? createdWineId;
      const wine = targetId ? await updateWine(targetId, input) : await createWine(input);
      if (!targetId) setCreatedWineId(wine.id);

      // Fotos hochladen: neues Hauptfoto (falls gewaehlt) + alle neuen
      // Zusatzfotos; bereits vorhandene (existingPath) bleiben unveraendert.
      const newBlobs = extraPhotos.filter((p) => p.blob).map((p) => p.blob!);
      const keptExistingPaths = extraPhotos.filter((p) => p.existingPath).map((p) => p.existingPath!);

      let primaryPath = existingWine?.photo_url ?? existingWine?.photo_urls?.[0] ?? null;
      if (pendingPhotoBlob) {
        primaryPath = await uploadWinePhoto(wine.id, pendingPhotoBlob);
      }
      const newExtraPaths = newBlobs.length > 0 ? await uploadWinePhotos(wine.id, newBlobs) : [];

      const photoUrls = [primaryPath, ...keptExistingPaths, ...newExtraPaths].filter((p): p is string => !!p);
      if (photoUrls.length > 0 || pendingPhotoBlob || existingWine) {
        await updateWine(wine.id, { photo_url: primaryPath, photo_urls: photoUrls });
      }

      navigate(`/wine/${wine.id}`);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : NETWORK_ERROR_MESSAGE);
      setSaving(false);
    }
  }

  if (loadingExisting) {
    return (
      <div className="app-screen" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <LoadingSpinner label="Wein wird geladen ..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="app-screen">
        <ErrorBanner message={loadError} onRetry={() => window.location.reload()} />
        <div style={{ padding: '0 20px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
            Zur Uebersicht
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-screen">
      <div className="top-bar">
        <button type="button" className="icon-btn" aria-label="Abbrechen" onClick={() => navigate(-1)}>
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 1L2 9l8 8" />
          </svg>
        </button>
      </div>

      {showBarcodeScanner && (
        <Suspense
          fallback={
            <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#000', display: 'grid', placeItems: 'center' }}>
              <LoadingSpinner label="Scanner wird geladen ..." />
            </div>
          }
        >
          <BarcodeScanner onDetect={handleBarcodeDetect} onClose={() => setShowBarcodeScanner(false)} />
        </Suspense>
      )}

      <form className="form-page" style={{ paddingTop: 0 }} onSubmit={handleSubmit}>
        <h1 style={{ fontSize: 25, marginBottom: 4 }}>
          {mode === 'edit' ? 'Wein bearbeiten' : 'Neuen Wein hinzufuegen'}
        </h1>
        <div style={{ fontSize: 12.5, opacity: 0.6, marginBottom: 18 }}>
          Etikett fotografieren oder Angaben von Hand eintragen
        </div>

        <PhotoCapture
          previewUrl={photoPreviewUrl}
          onSelect={handlePhotoSelect}
          busy={ocrBusy}
          busyLabel="Etikett wird gelesen ..."
          onSkipBusy={handleSkipOcr}
        />
        <div style={{ fontSize: 11.5, fontStyle: 'italic', opacity: 0.55, marginBottom: 12, lineHeight: 1.4 }}>
          Nach dem Foto traegt die App erkannte Werte direkt ein, wo sie sich sicher ist (z. B. den Jahrgang). Bei
          allem anderen: unten erscheinen die erkannten Woerter als Chips zum Ziehen - auf das passende Feld ziehen.
        </div>

        {suggestedPhotoUrl && (
          <div className="card elev-sm" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, marginBottom: 16 }}>
            <img
              src={suggestedPhotoUrl}
              alt=""
              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 'var(--radius-md)', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Foto aus einer freien Produktdatenbank gefunden</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                Achtung: Jahrgang/Etikett kann abweichen - bitte pruefen, bevor du es uebernimmst.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: 11.5, padding: '4px 10px' }}
                onClick={handleAcceptSuggestedPhoto}
                disabled={suggestedPhotoBusy}
              >
                {suggestedPhotoBusy ? 'Laedt ...' : 'Uebernehmen'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 11.5, padding: '4px 10px' }}
                onClick={() => setSuggestedPhotoUrl(null)}
                disabled={suggestedPhotoBusy}
              >
                Verwerfen
              </button>
            </div>
          </div>
        )}

        {photoPreviewUrl && (
          <div style={{ marginBottom: 16 }}>
            <div className="card-kicker" style={{ marginBottom: 8 }}>
              Weitere Fotos (z. B. Rueckenetikett)
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {extraPhotos.map((p) => (
                <div key={p.id} style={{ position: 'relative', width: 64, height: 64 }}>
                  <img
                    src={p.previewUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                  />
                  <button
                    type="button"
                    aria-label="Foto entfernen"
                    onClick={() => removeExtraPhoto(p.id)}
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'var(--color-bordeaux)',
                      color: '#fff',
                      border: '2px solid var(--color-bg)',
                      fontSize: 12,
                      lineHeight: 1,
                      cursor: 'pointer',
                    }}
                  >
                    &times;
                  </button>
                </div>
              ))}
              <button
                type="button"
                aria-label="Weiteres Foto hinzufuegen"
                onClick={() => extraPhotoInputRef.current?.click()}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--color-divider)',
                  background: 'transparent',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 22,
                  color: 'var(--color-accent)',
                  cursor: 'pointer',
                }}
              >
                +
              </button>
              <input
                ref={extraPhotoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleExtraPhotoSelect(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        )}

        <OcrChipTray chips={chips} onAssign={handleChipAssign} onHoverFieldChange={setHoveredDropField} />

        {duplicateWine && (
          <div
            className="card"
            style={{ marginBottom: 16, border: '1px solid var(--color-accent)', gap: 10 }}
          >
            <div style={{ fontSize: 13.5 }}>
              "{duplicateWine.name}" {duplicateWine.producer ? `(${duplicateWine.producer}) ` : ''}
              {duplicateWine.vintage ?? ''} ist bereits mit {duplicateWine.quantity}{' '}
              {duplicateWine.quantity === 1 ? 'Flasche' : 'Flaschen'} erfasst.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={duplicateBusy}
                onClick={() =>
                  handleIncreaseDuplicateInstead(form.quantity ? Math.max(1, Math.round(Number(form.quantity))) : 1)
                }
              >
                {duplicateBusy ? 'Wird gespeichert ...' : 'Stattdessen Bestand erhoehen'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={duplicateBusy}
                onClick={() => {
                  skipDuplicateCheckRef.current = true;
                  setDuplicateWine(null);
                }}
              >
                Trotzdem neu anlegen
              </button>
              <button type="button" className="btn btn-ghost" disabled={duplicateBusy} onClick={() => setDuplicateWine(null)}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        <FormField label="Name" suggested={suggested.has('name')} dropField="name" hovered={hoveredDropField === 'name'}>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => {
              updateField('name', e.target.value);
              clearSuggestion('name');
            }}
          />
        </FormField>

        <FormField
          label="Produzent"
          suggested={suggested.has('producer')}
          dropField="producer"
          hovered={hoveredDropField === 'producer'}
        >
          <input
            className="input"
            value={form.producer}
            onChange={(e) => {
              updateField('producer', e.target.value);
              clearSuggestion('producer');
            }}
          />
        </FormField>

        <div className="field" style={{ marginBottom: 13 }}>
          <label>
            Typ
            {suggested.has('wineType') && (
              <span className="tag tag-accent" style={{ fontSize: 9 }}>
                Vorschlag
              </span>
            )}
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {WINE_TYPE_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                className={`tag tag-outline${form.wineType === t ? ' is-active' : ''}`}
                onClick={() => {
                  updateField('wineType', form.wineType === t ? '' : t);
                  clearSuggestion('wineType');
                }}
              >
                {WINE_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="field" style={{ marginBottom: 13 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.isWishlist}
              onChange={(e) => updateField('isWishlist', e.target.checked)}
            />
            Auf die Wunschliste (noch nicht im Bestand)
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FormField
              label="Jahrgang"
              suggested={suggested.has('vintage')}
              dropField="vintage"
              hovered={hoveredDropField === 'vintage'}
            >
              <input
                className="input"
                type="number"
                inputMode="numeric"
                min={1900}
                max={2100}
                value={form.vintage}
                onChange={(e) => {
                  updateField('vintage', e.target.value);
                  clearSuggestion('vintage');
                }}
              />
            </FormField>
          </div>
          {!form.isWishlist && (
            <div style={{ flex: 1 }}>
              <FormField label="Anzahl Flaschen">
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={999}
                  value={form.quantity}
                  onChange={(e) => updateField('quantity', e.target.value)}
                />
              </FormField>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FormField label="Preis pro Flasche">
              <input
                className="input"
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                placeholder="z. B. 25.90"
                value={form.price}
                onChange={(e) => updateField('price', e.target.value)}
              />
            </FormField>
          </div>
          <div style={{ flex: 1 }}>
            <FormField label="Flaschengroesse">
              <input
                className="input"
                placeholder="z. B. 75cl, 1.5l"
                value={form.bottleSize}
                onChange={(e) => updateField('bottleSize', e.target.value)}
              />
            </FormField>
          </div>
        </div>

        <FormField label="Lagerort">
          <input
            className="input"
            placeholder="z. B. Keller Regal 3"
            value={form.storageLocation}
            onChange={(e) => updateField('storageLocation', e.target.value)}
          />
        </FormField>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FormField label="Trinkfenster von">
              <input
                className="input"
                type="number"
                inputMode="numeric"
                min={1900}
                max={2100}
                placeholder="z. B. 2026"
                value={form.drinkFrom}
                onChange={(e) => updateField('drinkFrom', e.target.value)}
              />
            </FormField>
          </div>
          <div style={{ flex: 1 }}>
            <FormField label="Trinkfenster bis">
              <input
                className="input"
                type="number"
                inputMode="numeric"
                min={1900}
                max={2100}
                placeholder="z. B. 2034"
                value={form.drinkTo}
                onChange={(e) => updateField('drinkTo', e.target.value)}
              />
            </FormField>
          </div>
        </div>

        <FormField
          label="Rebsorte(n)"
          suggested={suggested.has('grapeVariety')}
          dropField="grapeVariety"
          hovered={hoveredDropField === 'grapeVariety'}
        >
          <input
            className="input"
            placeholder="z. B. Cabernet Sauvignon, Merlot"
            value={form.grapeVariety}
            onChange={(e) => {
              updateField('grapeVariety', e.target.value);
              clearSuggestion('grapeVariety');
            }}
          />
        </FormField>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FormField
              label="Region"
              suggested={suggested.has('region')}
              dropField="region"
              hovered={hoveredDropField === 'region'}
            >
              <input
                className="input"
                placeholder="z. B. Medoc"
                value={form.region}
                onChange={(e) => {
                  updateField('region', e.target.value);
                  clearSuggestion('region');
                }}
              />
            </FormField>
          </div>
          <div style={{ flex: 1 }}>
            <FormField label="Subregion">
              <input
                className="input"
                placeholder="z. B. Pauillac"
                value={form.subregion}
                onChange={(e) => updateField('subregion', e.target.value)}
              />
            </FormField>
          </div>
        </div>

        <FormField label="Herkunftsland" suggested={suggested.has('country')}>
          <input
            className="input"
            placeholder="z. B. Frankreich"
            value={form.country}
            onChange={(e) => {
              updateField('country', e.target.value);
              clearSuggestion('country');
            }}
          />
        </FormField>

        <div className="field" style={{ marginBottom: 13 }}>
          <label>Bewertung</label>
          <StarRating value={form.rating} onChange={(v) => updateField('rating', v)} />
        </div>

        <div className="field" style={{ marginBottom: 13 }}>
          <label>Verkostungsnotizen</label>
          <TastingNotesInput
            value={{
              tannin: form.tastingTannin,
              acidity: form.tastingAcidity,
              sweetness: form.tastingSweetness,
              body: form.tastingBody,
            }}
            onChange={(v) => {
              setForm((f) => ({
                ...f,
                tastingTannin: v.tannin,
                tastingAcidity: v.acidity,
                tastingSweetness: v.sweetness,
                tastingBody: v.body,
              }));
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FormField label="Durchschnittsbewertung">
              <input
                className="input"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={0}
                max={5}
                placeholder="z. B. 4.5"
                value={form.communityRating}
                onChange={(e) => updateField('communityRating', e.target.value)}
              />
            </FormField>
          </div>
          <div style={{ flex: 1 }}>
            <FormField label="Auszeichnungen / Score">
              <input
                className="input"
                placeholder="z. B. Parker 94"
                value={form.criticScores}
                onChange={(e) => updateField('criticScores', e.target.value)}
              />
            </FormField>
          </div>
        </div>

        <FormField label="Passt zu">
          <input
            className="input"
            placeholder="z. B. Rind, Lamm, Wild"
            value={form.foodPairing}
            onChange={(e) => updateField('foodPairing', e.target.value)}
          />
        </FormField>

        <FormField label="EAN / Barcode">
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              placeholder="optional"
              value={form.eanCode}
              onChange={(e) => updateField('eanCode', e.target.value)}
              style={{ flex: 1 }}
            />
            {HAS_CAMERA_SCANNER && (
              <button type="button" className="btn btn-secondary" onClick={() => setShowBarcodeScanner(true)} disabled={barcodeLookupBusy}>
                Scannen
              </button>
            )}
          </div>
          {barcodeLookupBusy && (
            <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 6 }}>Wird nachgeschlagen ...</div>
          )}
          {barcodeLookupMessage && (
            <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 6 }}>{barcodeLookupMessage}</div>
          )}
        </FormField>

        <FormField label="Notizen">
          <textarea
            className="input"
            placeholder="Eigene Verkostungsnotizen ..."
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
          />
        </FormField>

        {saveError && <ErrorBanner message={saveError} />}

        <button type="submit" className="btn btn-primary btn-block" disabled={saving || !!duplicateWine}>
          {saving ? 'Wird gespeichert ...' : 'Wein speichern'}
        </button>
      </form>
    </div>
  );
}

function FormField({
  label,
  suggested,
  dropField,
  hovered,
  children,
}: {
  label: string;
  suggested?: boolean;
  /** Macht dieses Feld zu einem Ablageziel fuer OCR-Chips (siehe OcrChipTray). */
  dropField?: string;
  /** Wird gerade ein Chip darueber gehalten? - fuer die visuelle Hervorhebung. */
  hovered?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="field"
      data-ocr-drop-field={dropField}
      style={{
        marginBottom: 13,
        padding: 4,
        borderRadius: 'var(--radius-md)',
        transition: 'box-shadow 0.1s ease, background-color 0.1s ease',
        boxShadow: hovered ? '0 0 0 2px var(--color-bordeaux)' : 'none',
        background: hovered ? 'color-mix(in srgb, var(--color-bordeaux) 10%, transparent)' : 'transparent',
      }}
    >
      <label>
        {label}
        {suggested && (
          <span className="tag tag-accent" style={{ fontSize: 9 }}>
            Vorschlag
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
