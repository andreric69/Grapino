import type { CSSProperties } from 'react';

interface FavoriteButtonProps {
  active: boolean;
  onToggle: () => void;
  style?: CSSProperties;
}

export function FavoriteButton({ active, onToggle, style }: FavoriteButtonProps) {
  return (
    <button
      type="button"
      aria-label={active ? 'Von Favoriten entfernen' : 'Zu Favoriten hinzufuegen'}
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
        background: 'color-mix(in srgb, var(--color-neutral-900) 45%, transparent)',
        backdropFilter: 'blur(2px)',
        ...style,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={active ? 'var(--color-bordeaux-fill)' : 'none'}
        stroke={active ? 'var(--color-bordeaux-fill)' : '#f4ede4'}
        strokeWidth="1.8"
      >
        <path d="M12 20.5s-7.5-4.6-10-9.3C0.3 7.9 2 4.5 5.4 4c2-.3 3.9.6 5 2.2C11.6 4.6 13.5 3.7 15.5 4c3.4.5 5.1 3.9 3.5 7.2-2.5 4.7-10 9.3-10 9.3z" />
      </svg>
    </button>
  );
}
