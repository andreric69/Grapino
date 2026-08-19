import { useCallback, useEffect, useRef, useState } from 'react';

/** Kurze, sich selbst ausblendende Bestaetigungsmeldung - fuer Aktionen wie
 * "eine Flasche getrunken", bei denen sich sonst kaum etwas sichtbar aendert. */
export function useToast(durationMs = 2800) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const showToast = useCallback(
    (message: string) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      setToastMessage(message);
      timerRef.current = window.setTimeout(() => setToastMessage(null), durationMs);
    },
    [durationMs],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return { toastMessage, showToast };
}
