import { useRef, useState, type ChangeEvent } from 'react';
import { CameraCapture } from './CameraCapture';

interface PhotoCaptureProps {
  previewUrl: string | null;
  onSelect: (file: File) => void;
  busy?: boolean;
  busyLabel?: string;
  /** Erlaubt es, das Warten auf die Texterkennung abzubrechen und manuell weiterzumachen. */
  onSkipBusy?: () => void;
}

const HAS_CAMERA =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;

export function PhotoCapture({ previewUrl, onSelect, busy, busyLabel, onSkipBusy }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Eigenes, zweites Input-Element OHNE "capture"-Attribut fuer die
  // Galerie-Buttons: das "capture"-Attribut auf inputRef zwingt mobile
  // Browser (v.a. iOS Safari), IMMER die Kamera statt der Fotomediathek zu
  // oeffnen - unabhaengig davon, welcher Button den Klick ausgeloest hat.
  // War der gemeldete Bug: "Aus Galerie" fuehrte trotzdem zur Kamera.
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onSelect(file);
    e.target.value = '';
  }

  function handleCameraCapture(file: File) {
    setShowCamera(false);
    onSelect(file);
  }

  function openPrimary() {
    if (HAS_CAMERA) {
      setShowCamera(true);
    } else {
      inputRef.current?.click();
    }
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleChange} style={{ display: 'none' }} />

      {showCamera && <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}

      {previewUrl ? (
        <div style={{ position: 'relative' }}>
          <div className="plate" style={{ margin: 0, height: 220, borderWidth: 4 }}>
            <img src={previewUrl} alt="Etikett" />
          </div>
          {busy && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: 'color-mix(in srgb, var(--color-bg) 55%, transparent)',
                fontSize: 12.5,
                fontWeight: 600,
                textAlign: 'center',
                padding: 12,
              }}
            >
              <span>{busyLabel ?? 'Wird verarbeitet ...'}</span>
              {onSkipBusy && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: 12, fontWeight: 400 }}
                  onClick={onSkipBusy}
                >
                  Ohne Erkennung fortfahren
                </button>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={openPrimary} disabled={busy}>
              {HAS_CAMERA ? 'Neues Foto' : 'Anderes Foto waehlen'}
            </button>
            {HAS_CAMERA && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => galleryInputRef.current?.click()}
                disabled={busy}
              >
                Aus Galerie
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
          <button
            type="button"
            onClick={openPrimary}
            style={{
              width: '100%',
              border: '1px dashed var(--color-divider)',
              borderRadius: 'var(--radius-md)',
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 9,
              background: 'transparent',
              cursor: 'pointer',
              color: 'inherit',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '1px solid var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinejoin="round">
                <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
                <circle cx="12" cy="13.5" r="3.4" />
              </svg>
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14.5 }}>
              {HAS_CAMERA ? 'Etikett fotografieren' : 'Foto auswaehlen'}
            </div>
          </button>
          {HAS_CAMERA && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 12.5 }}
              onClick={() => galleryInputRef.current?.click()}
            >
              oder aus der Galerie waehlen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
