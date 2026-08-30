import { useRef, useState } from 'react';
import { NETWORK_ERROR_MESSAGE, updateWine } from '../lib/wineRepository';
import type { Wine } from '../types';

interface UseDuplicateCheckOptions {
  navigate: (path: string) => void;
  setSaveError: (message: string | null) => void;
}

/**
 * Buendelt die Duplikat-Erkennung beim Anlegen eines neuen Weins: Abgleich
 * gegen die bereits geladene Sammlung (Name + Produzent + Jahrgang, kein
 * Wunschlisten-Eintrag) sowie die Alternative "Bestand erhoehen" statt einen
 * zweiten Eintrag anzulegen. 1:1 aus WineFormPage.tsx ausgelagert, ohne
 * Verhaltensaenderung.
 */
export function useDuplicateCheck({ navigate, setSaveError }: UseDuplicateCheckOptions) {
  const [existingWinesForCheck, setExistingWinesForCheck] = useState<Wine[]>([]);
  const [duplicateWine, setDuplicateWine] = useState<Wine | null>(null);
  const [duplicateBusy, setDuplicateBusy] = useState(false);
  const skipDuplicateCheckRef = useRef(false);

  function findDuplicate(name: string, producer: string, vintage: string): Wine | null {
    const normName = name.trim().toLowerCase();
    if (!normName) return null;
    const normProducer = producer.trim().toLowerCase();
    const vintageNum = vintage ? Number(vintage) : null;
    return (
      existingWinesForCheck.find(
        (w) =>
          w.name.trim().toLowerCase() === normName &&
          (w.producer ?? '').trim().toLowerCase() === normProducer &&
          w.vintage === vintageNum,
      ) ?? null
    );
  }

  async function handleIncreaseDuplicateInstead(addQuantity: number) {
    if (!duplicateWine) return;
    setDuplicateBusy(true);
    try {
      const updated = await updateWine(duplicateWine.id, {
        quantity: duplicateWine.quantity + addQuantity,
        is_consumed: false,
      });
      navigate(`/wine/${updated.id}`);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : NETWORK_ERROR_MESSAGE);
      setDuplicateBusy(false);
    }
  }

  return {
    setExistingWinesForCheck,
    duplicateWine,
    setDuplicateWine,
    duplicateBusy,
    skipDuplicateCheckRef,
    findDuplicate,
    handleIncreaseDuplicateInstead,
  };
}
