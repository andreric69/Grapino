import { useEffect, useRef, useState } from 'react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

/**
 * Live-Kamera-Ansicht (getUserMedia) statt nur der OS-Dateiauswahl - fuehlt
 * sich fuer den nicht-technischen Nutzer wie eine "richtige" Kamera-App an.
 * Faellt bei fehlender Kamera/Berechtigung sauber auf eine Fehlermeldung
 * zurueck, PhotoCapture bietet daneben weiterhin die normale Dateiauswahl an.
 */
export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setReady(true);
      })
      .catch(() => {
        setError('Kamera konnte nicht geoeffnet werden. Bitte Kamerazugriff erlauben oder ein Foto auswaehlen.');
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  function handleCapture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], 'etikett.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
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
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px calc(20px + env(safe-area-inset-bottom))',
              background: '#000',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#f4ede4', fontSize: 15, fontFamily: 'var(--font-heading)', cursor: 'pointer' }}
            >
              Abbrechen
            </button>
            <button
              type="button"
              aria-label="Foto aufnehmen"
              onClick={handleCapture}
              disabled={!ready}
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: '#fff',
                border: '4px solid rgba(244,237,228,0.4)',
                cursor: ready ? 'pointer' : 'default',
                opacity: ready ? 1 : 0.5,
              }}
            />
            <div style={{ width: 70 }} aria-hidden />
          </div>
        </>
      )}
    </div>
  );
}
