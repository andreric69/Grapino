interface StarRatingProps {
  value: number | null;
  onChange?: (value: number | null) => void;
  size?: number;
}

export function StarRating({ value, onChange, size = 19 }: StarRatingProps) {
  const editable = !!onChange;
  const rating = value ?? 0;

  return (
    <div className="star-rating" role={editable ? 'radiogroup' : undefined} aria-label="Bewertung">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= rating;
        const star = (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? 'var(--color-bordeaux-fill)' : 'none'}
            stroke={filled ? 'var(--color-bordeaux-fill)' : 'var(--color-divider)'}
            strokeWidth={filled ? 1 : 1.5}
          >
            <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.6L12 17.8l-5.9 2.8 1.2-6.6L2.5 9.4l6.6-.9L12 2.5z" />
          </svg>
        );
        if (!editable) {
          return <span key={n}>{star}</span>;
        }
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} von 5 Sternen${n === rating ? ' - erneut tippen zum Entfernen' : ''}`}
            aria-pressed={n === rating}
            onClick={() => onChange!(n === value ? null : n)}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}
