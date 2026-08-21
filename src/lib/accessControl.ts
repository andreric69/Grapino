import { supabase } from '../supabaseClient';

export interface AccessStatus {
  isBlocked: boolean;
  blockReason: string | null;
  blockAmount: number | null;
}

const DEFAULT_STATUS: AccessStatus = { isBlocked: false, blockReason: null, blockAmount: null };

/**
 * Liest den eigenen Zugangsstatus (nur von der Admin-App gesetzt, siehe
 * user_access in Supabase). Fehlt die Zeile ganz (Normalfall - z. B. Vater/
 * Thomas, fuer die nie eine Blockade angelegt wurde) oder schlaegt der
 * Request fehl, gilt "nicht blockiert" - bewusst "default allow", damit ein
 * Datenbankfehler nie versehentlich den ganzen App-Zugang sperrt.
 */
export async function getAccessStatus(): Promise<AccessStatus> {
  const { data, error } = await supabase
    .from('user_access')
    .select('is_blocked, block_reason, block_amount')
    .maybeSingle();
  if (error || !data) return DEFAULT_STATUS;
  return {
    isBlocked: data.is_blocked,
    blockReason: data.block_reason,
    blockAmount: data.block_amount,
  };
}
