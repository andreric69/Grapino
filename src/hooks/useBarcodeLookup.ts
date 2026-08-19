import { type Dispatch, type MutableRefObject, type SetStateAction, useState } from 'react';
import { compressImage } from '../lib/imageCompression';
import { lookupBarcodeProduct } from '../lib/barcodeLookup';
import { matchWineReferences } from '../lib/wineReference';
import type { FormState, SuggestedField } from '../pages/WineFormPage';

// Ein reiner EAN/UPC-Barcode besteht nur aus Ziffern (6-14 Stellen). Ein
// QR-Code liefert dagegen meist eine URL oder freien Text des Weinguts -
// dafuer gibt es keine Produktdatenbank wie Open Food Facts, deshalb wird
// der Inhalt in diesem Fall stattdessen durch denselben Referenzabgleich
// gejagt wie erkannter Etikett-Text (Produzent/Region/Rebsorte/Land).
const EAN_LIKE = /^[0-9]{6,14}$/;

interface UseBarcodeLookupOptions {
  photoPreviewUrl: string | null;
  setPhotoPreviewUrl: (url: string | null) => void;
  setPendingPhotoBlob: (blob: Blob) => void;
  objectUrlRef: MutableRefObject<string | null>;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  setForm: Dispatch<SetStateAction<FormState>>;
  setSuggested: Dispatch<SetStateAction<Set<SuggestedField>>>;
}

/**
 * Buendelt den kompletten Barcode/QR-Scan-Ablauf im Formular: Scanner
 * oeffnen/schliessen, EAN- bzw. QR-Text nachschlagen und Formularfelder als
 * Vorschlag befuellen, sowie ein optionales Produktfoto vorschlagen (das der
 * Nutzer erst aktiv bestaetigen muss, bevor es als eigenes Foto uebernommen
 * wird). 1:1 aus WineFormPage.tsx ausgelagert, ohne Verhaltensaenderung.
 */
export function useBarcodeLookup({
  photoPreviewUrl,
  setPhotoPreviewUrl,
  setPendingPhotoBlob,
  objectUrlRef,
  updateField,
  setForm,
  setSuggested,
}: UseBarcodeLookupOptions) {
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [barcodeLookupBusy, setBarcodeLookupBusy] = useState(false);
  const [barcodeLookupMessage, setBarcodeLookupMessage] = useState<string | null>(null);
  const [suggestedPhotoUrl, setSuggestedPhotoUrl] = useState<string | null>(null);
  const [suggestedPhotoBusy, setSuggestedPhotoBusy] = useState(false);

  // Barcode erkannt: EAN wird immer uebernommen, zusaetzlich wird versucht,
  // darueber Angaben nachzuschlagen (Open Food Facts, kostenlos). Nur leere
  // Felder werden befuellt - vorhandene Eingaben des Nutzers bleiben
  // unangetastet. Findet sich nichts, bleibt einfach nur die EAN stehen.
  async function handleBarcodeDetect(code: string) {
    setShowBarcodeScanner(false);
    setBarcodeLookupBusy(true);
    setBarcodeLookupMessage(null);

    if (!EAN_LIKE.test(code)) {
      try {
        const matches = await matchWineReferences(code);
        const nextSuggested = new Set<SuggestedField>();
        setForm((f) => {
          const next = { ...f };
          if (matches.producer && !next.producer.trim()) {
            next.producer = matches.producer;
            nextSuggested.add('producer');
          }
          if (matches.region && !next.region.trim()) {
            next.region = matches.region;
            nextSuggested.add('region');
          }
          if (matches.country && !next.country.trim()) {
            next.country = matches.country;
            nextSuggested.add('country');
          }
          if (matches.grapeVariety && !next.grapeVariety.trim()) {
            next.grapeVariety = matches.grapeVariety;
            nextSuggested.add('grapeVariety');
          }
          if (matches.wineType && !next.wineType) {
            next.wineType = matches.wineType;
            nextSuggested.add('wineType');
          }
          return next;
        });
        setSuggested((s) => new Set([...s, ...nextSuggested]));
        setBarcodeLookupMessage(
          nextSuggested.size > 0
            ? 'QR-Code gelesen, passende Angaben uebernommen - bitte pruefen.'
            : 'QR-Code gelesen, aber keine bekannten Angaben darin gefunden - bitte manuell ausfuellen.',
        );
      } finally {
        setBarcodeLookupBusy(false);
      }
      return;
    }

    updateField('eanCode', code);
    try {
      const info = await lookupBarcodeProduct(code);
      if (!info || Object.keys(info).length === 0) {
        setBarcodeLookupMessage('Kein Eintrag zu diesem Barcode gefunden - bitte manuell ausfuellen.');
        return;
      }
      const nextSuggested = new Set<SuggestedField>();
      setForm((f) => {
        const next = { ...f };
        if (info.name && !next.name.trim()) {
          next.name = info.name;
          nextSuggested.add('name');
        }
        if (info.producer && !next.producer.trim()) {
          next.producer = info.producer;
          nextSuggested.add('producer');
        }
        if (info.bottleSize && !next.bottleSize.trim()) next.bottleSize = info.bottleSize;
        if (info.region && !next.region.trim()) {
          next.region = info.region;
          nextSuggested.add('region');
        }
        if (info.country && !next.country.trim()) {
          next.country = info.country;
          nextSuggested.add('country');
        }
        if (info.grapeVariety && !next.grapeVariety.trim()) {
          next.grapeVariety = info.grapeVariety;
          nextSuggested.add('grapeVariety');
        }
        if (info.wineType && !next.wineType) {
          next.wineType = info.wineType;
          nextSuggested.add('wineType');
        }
        return next;
      });
      setSuggested((s) => new Set([...s, ...nextSuggested]));
      // Produktfoto nur vorschlagen, wenn noch kein eigenes Foto gewaehlt
      // wurde - der Nutzer muss es aktiv bestaetigen, es wird nie
      // automatisch als Foto des eigenen Weins uebernommen.
      if (info.imageUrl && !photoPreviewUrl) {
        setSuggestedPhotoUrl(info.imageUrl);
      }
      setBarcodeLookupMessage(
        nextSuggested.size > 0
          ? 'Angaben aus einer freien Produktdatenbank uebernommen - bitte pruefen.'
          : 'Eintrag gefunden, aber keine neuen Angaben daraus uebernehmbar.',
      );
    } finally {
      setBarcodeLookupBusy(false);
    }
  }

  // Der Foto-Vorschlag aus dem Barcode-Treffer wird erst beim aktiven
  // Bestaetigen heruntergeladen und wie ein selbst aufgenommenes Foto
  // komprimiert - vorher ist es nur eine externe Bild-URL zur Vorschau.
  async function handleAcceptSuggestedPhoto() {
    if (!suggestedPhotoUrl) return;
    setSuggestedPhotoBusy(true);
    try {
      const res = await fetch(suggestedPhotoUrl);
      const blob = await res.blob();
      const compressed = await compressImage(new File([blob], 'vorschlag.jpg', { type: blob.type || 'image/jpeg' }));
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const objectUrl = URL.createObjectURL(compressed);
      objectUrlRef.current = objectUrl;
      setPhotoPreviewUrl(objectUrl);
      setPendingPhotoBlob(compressed);
      setSuggestedPhotoUrl(null);
    } catch (e) {
      console.error('Foto-Vorschlag konnte nicht uebernommen werden:', e);
      setBarcodeLookupMessage('Foto-Vorschlag konnte nicht geladen werden.');
    } finally {
      setSuggestedPhotoBusy(false);
    }
  }

  return {
    showBarcodeScanner,
    setShowBarcodeScanner,
    barcodeLookupBusy,
    barcodeLookupMessage,
    suggestedPhotoUrl,
    setSuggestedPhotoUrl,
    suggestedPhotoBusy,
    handleBarcodeDetect,
    handleAcceptSuggestedPhoto,
  };
}
