import { useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggleTheme}
      aria-label={theme === 'light' ? 'Dunkles Thema aktivieren' : 'Helles Thema aktivieren'}
      title={theme === 'light' ? 'Walnuss (dunkel)' : 'Papier (hell)'}
    >
      {theme === 'light' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="1.8">
          <path d="M21 12.6A9 9 0 1111.4 3a7 7 0 009.6 9.6z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="1.8">
          <circle cx="12" cy="12" r="4.5" />
          <path
            d="M12 2.5v2.4M12 19.1v2.4M4.4 4.4l1.7 1.7M17.9 17.9l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.4 19.6l1.7-1.7M17.9 6.1l1.7-1.7"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
