import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

export interface CropRect {
  /** Alle Werte 0-1, relativ zur Bildgroesse - damit unabhaengig von der Anzeigegroesse weiterverwendbar. */
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_RECT: CropRect = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
const MIN_SIZE = 0.15;

type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se';

/**
 * Einfacher, rechteckiger Zuschnitt (kein perspektivisches Entzerren) - der
 * Nutzer zieht einen Rahmen ums Etikett, bevor die Texterkennung laeuft.
 * Entfernt Flaschenhals/-boden, Nachbarflaschen und Hintergrund aus dem
 * Bild, das die Erkennung zu Gesicht bekommt, ohne das gespeicherte Foto
 * selbst zu veraendern (siehe WineFormPage - der Zuschnitt gilt nur fuer
 * die OCR-Eingabekopie).
 */
export function LabelCropper({
  imageUrl,
  onConfirm,
  onSkip,
}: {
  imageUrl: string;
  onConfirm: (rect: CropRect) => void;
  onSkip: () => void;
}) {
  const [rect, setRect] = useState<CropRect>(DEFAULT_RECT);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ handle: Handle; startX: number; startY: number; startRect: CropRect } | null>(null);

  function clientToRelative(clientX: number, clientY: number) {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return { x: (clientX - box.left) / box.width, y: (clientY - box.top) / box.height };
  }

  function handlePointerDown(handle: Handle) {
    return (e: ReactPointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      const { x, y } = clientToRelative(e.clientX, e.clientY);
      dragRef.current = { handle, startX: x, startY: y, startRect: rect };
    };
  }

  function handlePointerMove(e: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const { x, y } = clientToRelative(e.clientX, e.clientY);
    const dx = x - drag.startX;
    const dy = y - drag.startY;
    const s = drag.startRect;

    let next: CropRect = s;
    if (drag.handle === 'move') {
      const nx = clamp(s.x + dx, 0, 1 - s.width);
      const ny = clamp(s.y + dy, 0, 1 - s.height);
      next = { ...s, x: nx, y: ny };
    } else {
      let { x: rx, y: ry, width: rw, height: rh } = s;
      if (drag.handle === 'nw' || drag.handle === 'sw') {
        const newX = clamp(s.x + dx, 0, s.x + s.width - MIN_SIZE);
        rw = s.width - (newX - s.x);
        rx = newX;
      }
      if (drag.handle === 'ne' || drag.handle === 'se') {
        rw = clamp(s.width + dx, MIN_SIZE, 1 - s.x);
      }
      if (drag.handle === 'nw' || drag.handle === 'ne') {
        const newY = clamp(s.y + dy, 0, s.y + s.height - MIN_SIZE);
        rh = s.height - (newY - s.y);
        ry = newY;
      }
      if (drag.handle === 'sw' || drag.handle === 'se') {
        rh = clamp(s.height + dy, MIN_SIZE, 1 - s.y);
      }
      next = { x: rx, y: ry, width: rw, height: rh };
    }
    setRect(next);
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/*
        Der aeussere Rahmen begrenzt die Anzeigehoehe (55vh) und scrollt bei
        hochformatigen Fotos - der innere (containerRef) ist bewusst NICHT
        begrenzt/geclippt, seine Hoehe entspricht also immer exakt der echten
        gerenderten Bildhoehe. Waeren beide dasselbe Element (wie zuvor),
        wuerde getBoundingClientRect() bei hohen Bildern die Hoehe auf 55vh
        kappen, obwohl das Bild selbst hoeher gerendert ist - die daraus
        berechneten 0-1-Bruchteile (clientToRelative) würden dann nicht mehr
        zu den Bruchteilen passen, die cropImage() spaeter auf das volle,
        unbeschnittene Originalbild anwendet (falscher Bildausschnitt bei
        Hochformat-Fotos).
      */}
      <div style={{ maxHeight: '55vh', overflow: 'auto', borderRadius: 'var(--radius-md)' }}>
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ position: 'relative', width: '100%', touchAction: 'none' }}
        >
          <img src={imageUrl} alt="" style={{ width: '100%', display: 'block', userSelect: 'none' }} draggable={false} />
        {/* Abgedunkelte Bereiche ausserhalb des Rahmens - vier Balken statt
            clip-path mit Loch, das nicht ueberall zuverlaessig unterstuetzt wird. */}
        <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: `${rect.y * 100}%`, background: 'rgba(0,0,0,0.5)' }} />
        <div style={{ position: 'absolute', left: 0, bottom: 0, right: 0, height: `${(1 - rect.y - rect.height) * 100}%`, background: 'rgba(0,0,0,0.5)' }} />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: `${rect.y * 100}%`,
            width: `${rect.x * 100}%`,
            height: `${rect.height * 100}%`,
            background: 'rgba(0,0,0,0.5)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: `${rect.y * 100}%`,
            width: `${(1 - rect.x - rect.width) * 100}%`,
            height: `${rect.height * 100}%`,
            background: 'rgba(0,0,0,0.5)',
          }}
        />
        <div
          onPointerDown={handlePointerDown('move')}
          style={{
            position: 'absolute',
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.width * 100}%`,
            height: `${rect.height * 100}%`,
            border: '2px solid var(--color-accent)',
            cursor: 'move',
            boxSizing: 'border-box',
          }}
        >
          {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
            <div
              key={corner}
              onPointerDown={handlePointerDown(corner)}
              style={{
                position: 'absolute',
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'var(--color-accent)',
                border: '2px solid var(--color-surface)',
                cursor: `${corner}-resize`,
                top: corner.includes('n') ? -13 : undefined,
                bottom: corner.includes('s') ? -13 : undefined,
                left: corner.includes('w') ? -13 : undefined,
                right: corner.includes('e') ? -13 : undefined,
              }}
            />
          ))}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, opacity: 0.6, textAlign: 'center' }}>
        Rahmen ums Etikett ziehen - verbessert die Texterkennung deutlich.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onSkip}>
          Ohne Zuschnitt
        </button>
        <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => onConfirm(rect)}>
          Zuschneiden
        </button>
      </div>
    </div>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
