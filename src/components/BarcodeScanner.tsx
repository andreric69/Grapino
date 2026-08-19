import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat, NotFoundException } from '@zxing/library';

interface BarcodeScannerProps {
  onDetect: (code: string) => void;
  onClose: () => void;
}

// ZXing ist eine reine JS-Bibliothek (kein Browser-natives API) - laeuft
// deshalb ueberall dort, wo eine Kamera per getUserMedia angesprochen werden
// kann, insbesondere auch im iPhone/iPad-Safari, wo die native
// BarcodeDetector-API bislang fehlt. Kostenlos, quelloffen (MIT-Lizenz),
// laeuft komplett im Browser - keine laufenden Kosten. Die Bibliothek ist
// relativ gross, deshalb wird diese Komponente in WineFormPage nur bei
// Bedarf per React.lazy nachgeladen (siehe dort) - HAS_CAMERA_SCANNER selbst
// steht separat in lib/cameraSupport.ts, damit die einfache Verfuegbarkeits-
// pruefung nicht die ganze Bibliothek mit sich zieht.

const HINTS = new Map();
HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.QR_CODE,
]);
// Etwas toleranter bei schlecht beleuchteten/leicht verzerrten
// Flaschenetiketten - probiert bei Bedarf staerker, auf Kosten von Tempo.
HINTS.set(DecodeHintType.TRY_HARDER, true);

/** Scannt fortlaufend Kamera-Bilder nach einem EAN/UPC-Barcode (rein als zusaetzliche Kennung). */
export function BarcodeScanner({ onDetect, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const detectedRef = useRef(false);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader(HINTS, 300);
    readerRef.current = reader;
    detectedRef.current = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        videoRef.current!,
        (result, err) => {
          if (result && !detectedRef.current) {
            detectedRef.current = true;
            onDetect(result.getText());
          } else if (err && !(err instanceof NotFoundException)) {
            // NotFoundException wird bei jedem Frame ohne Treffer geworfen -
            // das ist der Normalfall waehrend des Suchens, kein echter Fehler.
            console.error('Barcode-Scan-Fehler:', err);
          }
        },
      )
      .catch(() => {
        setError('Kamera konnte nicht geoeffnet werden. Bitte Kamerazugriff erlauben oder EAN von Hand eintragen.');
      });

    return () => {
      reader.reset();
    };
  }, [onDetect]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#000', display: 'flex', flexDirection: 'column' }}>
      {error ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 24,
            color: '#f4ede4',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 14 }}>{error}</div>
          <button type="button" className="btn btn-secondary" style={{ color: '#f4ede4', borderColor: '#f4ede4' }} onClick={onClose}>
            Schliessen
          </button>
        </div>
      ) : (
        <>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '75%',
                height: 110,
                border: '2px solid #fff',
                borderRadius: 8,
                boxShadow: '0 0 0 2000px rgba(0,0,0,0.4)',
              }}
            />
            <div style={{ position: 'absolute', bottom: 100, left: 0, right: 0, textAlign: 'center', color: '#f4ede4', fontSize: 13 }}>
              Barcode oder QR-Code im Rahmen positionieren
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 24px calc(20px + env(safe-area-inset-bottom))', background: '#000' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#f4ede4', fontSize: 15, fontFamily: 'var(--font-heading)', cursor: 'pointer' }}
            >
              Abbrechen
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Default-Export fuer React.lazy() (Code-Splitting - die Scanner-Bibliothek
// wird so nur geladen, wenn der Nutzer den Scanner tatsaechlich oeffnet).
export default BarcodeScanner;
