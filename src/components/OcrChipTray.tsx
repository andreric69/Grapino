import { useState, type PointerEvent as ReactPointerEvent } from 'react';

interface OcrChipTrayProps {
  chips: string[];
  onAssign: (text: string, field: string) => void;
  onHoverFieldChange: (field: string | null) => void;
}

interface DragState {
  text: string;
  x: number;
  y: number;
}

/**
 * Zeigt erkannte Textfragmente vom Etikett als Chips, die per Ziehen auf ein
 * Formularfeld (data-ocr-drop-field="...") fallengelassen werden koennen.
 *
 * Nutzt bewusst die Pointer-Events-API statt der HTML5-Drag-and-Drop-API:
 * Letztere funktioniert auf iOS Safari nicht zuverlaessig per Touch. Pointer
 * Events vereinheitlichen Maus und Touch und funktionieren dort zuverlaessig.
 */
export function OcrChipTray({ chips, onAssign, onHoverFieldChange }: OcrChipTrayProps) {
  const [drag, setDrag] = useState<DragState | null>(null);

  function fieldAtPoint(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y);
    const target = el?.closest<HTMLElement>('[data-ocr-drop-field]');
    return target?.dataset.ocrDropField ?? null;
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLButtonElement>, text: string) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ text, x: e.clientX, y: e.clientY });
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    setDrag({ ...drag, x: e.clientX, y: e.clientY });
    onHoverFieldChange(fieldAtPoint(e.clientX, e.clientY));
  }

  function endDrag(e: ReactPointerEvent<HTMLButtonElement>, commit: boolean) {
    if (!drag) return;
    if (commit) {
      const field = fieldAtPoint(e.clientX, e.clientY);
      if (field) onAssign(drag.text, field);
    }
    setDrag(null);
    onHoverFieldChange(null);
  }

  if (chips.length === 0) return null;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11.5, opacity: 0.6, marginBottom: 8 }}>
        Erkannt - auf ein Feld ziehen, um es zu übernehmen (mehrfach möglich):
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            className="tag tag-outline"
            style={{
              fontSize: 13,
              padding: '7px 13px',
              cursor: 'grab',
              touchAction: 'none',
              userSelect: 'none',
              background: 'var(--color-bg)',
              opacity: drag?.text === chip ? 0.35 : 1,
            }}
            onPointerDown={(e) => handlePointerDown(e, chip)}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => endDrag(e, true)}
            onPointerCancel={(e) => endDrag(e, false)}
          >
            {chip}
          </button>
        ))}
      </div>

      {drag && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            left: drag.x,
            top: drag.y,
            transform: 'translate(-50%, -130%)',
            pointerEvents: 'none',
            zIndex: 300,
            background: 'var(--color-bordeaux)',
            color: '#f4ede4',
            padding: '8px 14px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-heading)',
            boxShadow: 'var(--shadow-lg)',
            whiteSpace: 'nowrap',
          }}
        >
          {drag.text}
        </div>
      )}
    </div>
  );
}
