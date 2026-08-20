import { supabase, WINE_PHOTOS_BUCKET } from '../supabaseClient';
import type { ConsumptionLogEntry, DeletionRequest, Wine, WineInput } from '../types';

export const NETWORK_ERROR_MESSAGE =
  'Keine Verbindung zum Server. Bitte Internetverbindung pruefen und erneut versuchen.';

function toFriendlyError(error: unknown): Error {
  // Technische Details nur in der Konsole, damit der (nicht-technische)
  // Nutzer ausschliesslich die klare deutsche Meldung sieht.
  console.error('Supabase-Fehler:', error);
  return new Error(NETWORK_ERROR_MESSAGE);
}

export async function listWines(): Promise<Wine[]> {
  const { data, error } = await supabase.from('wines').select('*').order('created_at', { ascending: false });
  if (error) throw toFriendlyError(error);
  return data as Wine[];
}

/** Trinkverlauf fuer die Rueckblick-Seite - neueste zuerst. */
export async function listConsumptionLog(): Promise<ConsumptionLogEntry[]> {
  const { data, error } = await supabase
    .from('wine_consumption_log')
    .select('*')
    .order('consumed_at', { ascending: false });
  if (error) throw toFriendlyError(error);
  return data as ConsumptionLogEntry[];
}

export async function getWine(id: string): Promise<Wine> {
  const { data, error } = await supabase.from('wines').select('*').eq('id', id).single();
  if (error) throw toFriendlyError(error);
  return data as Wine;
}

export async function createWine(input: WineInput): Promise<Wine> {
  const { data, error } = await supabase.from('wines').insert(input).select().single();
  if (error) throw toFriendlyError(error);
  return data as Wine;
}

export async function updateWine(id: string, input: Partial<WineInput>): Promise<Wine> {
  const { data, error } = await supabase.from('wines').update(input).eq('id', id).select().single();
  if (error) throw toFriendlyError(error);
  return data as Wine;
}

export async function setFavorite(id: string, isFavorite: boolean): Promise<Wine> {
  return updateWine(id, { is_favorite: isFavorite });
}

/**
 * Schreibt einen Eintrag in den Trinkverlauf (fuer die Rueckblick-Seite) -
 * ein Aufruf pro getrunkener Flasche. Wird von drinkOneBottle IMMER
 * abgewartet (nicht mehr "fire-and-forget") - sonst kann die
 * Rueckblick-Seite geladen werden, bevor der Log-Eintrag geschrieben ist,
 * und die Flasche taucht dort scheinbar nicht auf. Ein zweiter Versuch
 * faengt einen kurzen Netzwerkaussetzer ab, damit der Verlauf auch bei
 * einem einmaligen Fehler zuverlaessig ankommt.
 */
async function logConsumption(wine: Wine): Promise<void> {
  const payload = {
    wine_id: wine.id,
    wine_name: wine.name,
    region: wine.region,
    grape_variety: wine.grape_variety,
    wine_type: wine.wine_type,
  };
  const first = await supabase.from('wine_consumption_log').insert(payload);
  if (first.error) {
    const retry = await supabase.from('wine_consumption_log').insert(payload);
    if (retry.error) console.error('Trinkverlauf konnte nicht geschrieben werden:', retry.error);
  }
}

/** Loescht den zuletzt fuer diesen Wein geloggten Trinkverlauf-Eintrag (beim Rueckgaengigmachen). */
async function undoLastConsumptionLog(wineId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('wine_consumption_log')
      .select('id')
      .eq('wine_id', wineId)
      .order('consumed_at', { ascending: false })
      .limit(1);
    const lastId = data?.[0]?.id;
    if (lastId) await supabase.from('wine_consumption_log').delete().eq('id', lastId);
  } catch (e) {
    console.error('Trinkverlauf-Eintrag konnte nicht zurueckgenommen werden:', e);
  }
}

/**
 * Eine Flasche als getrunken markieren: verringert den Bestand um genau
 * eins. Erst wenn die letzte Flasche weg ist (Bestand erreicht 0), wandert
 * der Wein in den "Getrunken"-Bereich - bei mehreren Flaschen bleibt er im
 * Vorrat, nur mit einer weniger. Jeder Aufruf zaehlt fuer den Rueckblick.
 */
export async function drinkOneBottle(wine: Wine): Promise<Wine> {
  const nextQuantity = Math.max(0, wine.quantity - 1);
  const updated = await updateWine(wine.id, { quantity: nextQuantity, is_consumed: nextQuantity === 0 });
  await logConsumption(wine);
  return updated;
}

/** Gegenstueck zu drinkOneBottle: eine Flasche wieder in den Bestand aufnehmen. */
export async function addOneBottle(wine: Wine): Promise<Wine> {
  return updateWine(wine.id, { quantity: wine.quantity + 1, is_consumed: false });
}

/** Einen als "getrunken" markierten Wein wieder in den Vorrat zurueckholen. */
export async function restoreToStock(wine: Wine): Promise<Wine> {
  const updated = await updateWine(wine.id, { is_consumed: false, quantity: Math.max(1, wine.quantity) });
  await undoLastConsumptionLog(wine.id);
  return updated;
}

export async function deleteWine(wine: Wine): Promise<void> {
  const paths = [wine.photo_url, ...(wine.photo_urls ?? [])].filter((p): p is string => !!p);
  if (paths.length > 0) {
    await supabase.storage.from(WINE_PHOTOS_BUCKET).remove(paths);
  }
  const { error } = await supabase.from('wines').delete().eq('id', wine.id);
  if (error) throw toFriendlyError(error);
}

/**
 * Der Nutzer kann seine Sammlung nicht mehr selbst sofort loeschen - stattdessen
 * wird eine Anfrage angelegt, die erst ueber die Admin-App bestaetigt werden muss.
 */
export async function requestCollectionDeletion(): Promise<void> {
  const { error } = await supabase.from('deletion_requests').insert({});
  if (error) throw toFriendlyError(error);
}

/** Liefert die aktuell offene (noch nicht geprueft) Loeschanfrage des Nutzers, falls vorhanden. */
export async function getPendingDeletionRequest(): Promise<DeletionRequest | null> {
  const { data, error } = await supabase
    .from('deletion_requests')
    .select('id, created_at, status')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw toFriendlyError(error);
  return data as DeletionRequest | null;
}

/** Nimmt eine noch offene, eigene Loeschanfrage zurueck. */
export async function cancelDeletionRequest(id: string): Promise<void> {
  const { error } = await supabase.from('deletion_requests').delete().eq('id', id);
  if (error) throw toFriendlyError(error);
}

/** Laedt ein Foto hoch und liefert den Storage-Pfad (nicht die URL) zurueck. */
export async function uploadWinePhoto(wineId: string, photo: Blob): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Nicht angemeldet.');

  const path = `${user.id}/${wineId}.jpg`;
  const { error } = await supabase.storage.from(WINE_PHOTOS_BUCKET).upload(path, photo, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw toFriendlyError(error);
  return path;
}

/** Laedt mehrere Fotos fuer denselben Wein hoch (eigener Dateiname je Foto) und liefert die Pfade zurueck. */
export async function uploadWinePhotos(wineId: string, photos: Blob[]): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Nicht angemeldet.');

  const paths: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    const path = `${user.id}/${wineId}/${Date.now()}-${i}.jpg`;
    const { error } = await supabase.storage.from(WINE_PHOTOS_BUCKET).upload(path, photos[i], {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (error) throw toFriendlyError(error);
    paths.push(path);
  }
  return paths;
}

export async function getSignedPhotoUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(WINE_PHOTOS_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

/** Erzeugt Signed URLs fuer mehrere Fotopfade in einem Request (fuer die Grid-Ansicht). */
export async function getSignedPhotoUrls(
  paths: string[],
  expiresInSeconds = 3600,
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(WINE_PHOTOS_BUCKET)
    .createSignedUrls(paths, expiresInSeconds);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const entry of data) {
    if (entry.signedUrl && entry.path) map[entry.path] = entry.signedUrl;
  }
  return map;
}
