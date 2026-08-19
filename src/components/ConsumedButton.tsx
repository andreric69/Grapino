import type { CSSProperties } from 'react';

interface ConsumedButtonProps {
  active: boolean;
  onToggle: () => void;
  style?: CSSProperties;
}

/** Ein-Tipp-Umschalter "als getrunken markieren" - bewusst genauso einfach wie FavoriteButton. */
export function ConsumedButton({ active, onToggle, style }: ConsumedButtonProps) {
  return (
    <button
      type="button"
      aria-label={active ? 'Als noch nicht getrunken markieren' : 'Als getrunken markieren'}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active
          ? 'var(--color-accent)'
          : 'color-mix(in srgb, var(--color-neutral-900) 45%, transparent)',
        backdropFilter: 'blur(2px)',
        ...style,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#2d2b2b' : '#f4ede4'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </button>
  );
}
