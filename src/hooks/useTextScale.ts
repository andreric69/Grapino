import { useEffect, useState } from 'react';

export type TextScale = 'normal' | 'gross' | 'sehr-gross';

const STORAGE_KEY = 'weinsammlung-text-scale';

function getInitialTextScale(): TextScale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'normal' || stored === 'gross' || stored === 'sehr-gross') return stored;
  return 'normal';
}

export function useTextScale() {
  const [scale, setScale] = useState<TextScale>(getInitialTextScale);

  useEffect(() => {
    document.documentElement.setAttribute('data-text-scale', scale);
    localStorage.setItem(STORAGE_KEY, scale);
  }, [scale]);

  return { scale, setScale };
}
