import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabaseClient';
import {
  listWines,
  createWines,
  updateWineQuantities,
  requestCollectionDeletion,
  getPendingDeletionRequest,
  cancelDeletionRequest,
} from '../lib/wineRepository';
import { downloadWinesBackup, parseWinesBackupFile } from '../lib/backup';
import { mergeDuplicatesWithinBatch, buildExistingActiveIndex, findExistingMatch } from '../lib/importMerge';
import {
  parseCsv,
  rowsToWineInputs,
  guessField,
  FIELD_LABELS,
  MAPPABLE_FIELDS,
  type MappableField,
} from '../lib/csvImport';
import { listMyFeedback, deleteFeedback } from '../lib/feedbackRepository';
import { listMyPaymentRequests } from '../lib/paymentRequestRepository';
import { listMyOrders, ORDER_CATEGORY_INFO } from '../lib/orderRepository';
import { getPricingConfig, computeOrderPrice, type PricingConfig } from '../lib/pricingConfig';
import type { DeletionRequest, EnrichmentOrder, MyFeedback, PaymentRequest, Wine, WineInput } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';

type ImportState =
  | { phase: 'idle' }
  | { phase: 'reading' }
  | { phase: 'confirm'; wines: WineInput[] }
  | { phase: 'importing'; total: number; done: number }
  | { phase: 'done'; imported: number; merged: number; failed: number }
  | { phase: 'error'; message: string };

type CsvImportState =
  | { phase: 'idle' }
  | { phase: 'reading' }
  | { phase: 'mapping'; headers: string[]; mapping: MappableField[]; rows: string[][] }
  | { phase: 'error'; message: string };

export function SettingsPage() {
  const navigate = useNavigate();
  const { session, signOut, updateDisplayName } = useAuth();

  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    setNameInput((session?.user.user_metadata?.display_name as string | undefined) ?? '');
  }, [session?.user.user_metadata?.display_name]);

  async function handleSaveName() {
    setSavingName(true);
    setNameError(null);
    setNameSaved(false);
    const { error } = await updateDisplayName(nameInput);
    if (error) setNameError(error);
    else setNameSaved(true);
    setSavingName(false);
  }

  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  async function handleSetPassword() {
    if (newPassword.length < 8) {
      setPasswordError('Mindestens 8 Zeichen.');
      return;
    }
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSaved(false);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setPasswordError(error.message);
    else {
      setPasswordSaved(true);
      setNewPassword('');
    }
    setSavingPassword(false);
  }

  const [wines, setWines] = useState<Wine[]>([]);
  const [loadingWines, setLoadingWines] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [importState, setImportState] = useState<ImportState>({ phase: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvState, setCsvState] = useState<CsvImportState>({ phase: 'idle' });
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);
  const DELETE_ALL_KEYWORD = 'LOESCHEN';

  const [pendingDeletionRequest, setPendingDeletionRequest] = useState<DeletionRequest | null>(null);
  const [loadingDeletionRequest, setLoadingDeletionRequest] = useState(true);
  const [cancelingRequest, setCancelingRequest] = useState(false);

  const [myFeedback, setMyFeedback] = useState<MyFeedback[]>([]);
  const [feedbackToDelete, setFeedbackToDelete] = useState<MyFeedback | null>(null);
  const [deletingFeedback, setDeletingFeedback] = useState(false);
  const [feedbackDeleteError, setFeedbackDeleteError] = useState<string | null>(null);
  const [myPaymentRequests, setMyPaymentRequests] = useState<PaymentRequest[]>([]);
  const [myOrders, setMyOrders] = useState<EnrichmentOrder[]>([]);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const ownActiveWineCount = wines.filter((w) => !w.is_consumed && !w.is_wishlist).length;

  async function handleDeleteFeedback() {
    if (!feedbackToDelete) return;
    setDeletingFeedback(true);
    setFeedbackDeleteError(null);
    try {
      await deleteFeedback(feedbackToDelete.id);
      setMyFeedback((list) => list.filter((f) => f.id !== feedbackToDelete.id));
      setFeedbackToDelete(null);
    } catch (e) {
      setFeedbackDeleteError(e instanceof Error ? e.message : 'Löschen fehlgeschlagen.');
    } finally {
      setDeletingFeedback(false);
    }
  }

  async function loadWines() {
    setLoadingWines(true);
    setLoadError(null);
    try {
      setWines(await listWines());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Unbekannter Fehler.');
    } finally {
      setLoadingWines(false);
    }
  }

  async function loadDeletionRequest() {
    setLoadingDeletionRequest(true);
    try {
      setPendingDeletionRequest(await getPendingDeletionRequest());
    } catch {
      // Stiller Fehlschlag: die Anfrage-Karte bleibt einfach weg, der
      // Loeschen-Button funktioniert unabhaengig davon weiterhin.
    } finally {
      setLoadingDeletionRequest(false);
    }
  }

  useEffect(() => {
    loadWines();
    loadDeletionRequest();
    listMyFeedback().then(setMyFeedback);
    listMyPaymentRequests().then(setMyPaymentRequests);
    listMyOrders().then(setMyOrders);
    getPricingConfig().then(setPricing);
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  async function handleFileChosen(file: File) {
    setImportState({ phase: 'reading' });
    try {
      const parsed = await parseWinesBackupFile(file);
      setImportState({ phase: 'confirm', wines: parsed });
    } catch (e) {
      setImportState({ phase: 'error', message: e instanceof Error ? e.message : 'Datei konnte nicht gelesen werden.' });
    }
  }

  // Fasst zuerst exakt gleiche Weine (Name+Produzent+Jahrgang) INNERHALB der
  // Import-Datei zusammen (Menge addiert, statt jede Flasche als eigene
  // Zeile anzulegen), und gleicht danach jeden Eintrag gegen den bereits
  // vorhandenen Bestand ab - findet sich ein Treffer, wird dort nur die
  // Menge erhoeht statt einen neuen Eintrag zu erzeugen.
  // Bewusst in Bloecken statt einzeln importiert - bei einem grossen Import
  // (z. B. ein Vivino-Export mit ueber tausend Flaschen) waeren tausende
  // einzelne Requests viel zu langsam (mehrere Minuten, Abbruchrisiko bei
  // Verbindungsproblemen). In 150er-Bloecken sind es nur eine Handvoll
  // Requests, die Fortschrittsanzeige aktualisiert sich nach jedem Block.
  const IMPORT_CHUNK_SIZE = 150;

  async function handleConfirmImport(toImport: WineInput[]) {
    const merged = mergeDuplicatesWithinBatch(toImport);
    setImportState({ phase: 'importing', total: merged.length, done: 0 });
    // Nur einmal zu Beginn gebaut - mergeDuplicatesWithinBatch hat vorher
    // bereits alle identischen Weine INNERHALB des Imports zusammengefasst,
    // jeder Schluessel taucht in "merged" also hoechstens einmal auf. Der
    // Index muss deshalb waehrend des Imports nicht mehr aktualisiert werden.
    const existingIndex = buildExistingActiveIndex(wines);

    let imported = 0;
    let mergedCount = 0;
    let failed = 0;

    for (let i = 0; i < merged.length; i += IMPORT_CHUNK_SIZE) {
      const chunk = merged.slice(i, i + IMPORT_CHUNK_SIZE);
      const toCreate: WineInput[] = [];
      const toUpdate: { id: string; quantity: number }[] = [];
      for (const wine of chunk) {
        const existing = findExistingMatch(wine, existingIndex);
        if (existing) {
          toUpdate.push({ id: existing.id, quantity: existing.quantity + wine.quantity });
        } else {
          toCreate.push(wine);
        }
      }

      if (toCreate.length > 0) {
        try {
          await createWines(toCreate);
          imported += toCreate.length;
        } catch (err) {
          // Ein einzelner ungueltiger Wein (z. B. Constraint-Verletzung) liess
          // bisher den gesamten Chunk (bis zu IMPORT_CHUNK_SIZE Weine) still
          // scheitern - stattdessen einzeln nachversuchen, damit nur der
          // tatsaechlich fehlerhafte Wein verloren geht, und den Fehler loggen.
          console.error('CSV-Import: Chunk-Erstellung fehlgeschlagen, versuche einzeln.', err);
          for (const wine of toCreate) {
            try {
              await createWines([wine]);
              imported += 1;
            } catch (singleErr) {
              failed += 1;
              console.error('CSV-Import: Wein konnte nicht angelegt werden.', wine, singleErr);
            }
          }
        }
      }
      if (toUpdate.length > 0) {
        try {
          await updateWineQuantities(toUpdate);
          mergedCount += toUpdate.length;
        } catch (err) {
          console.error('CSV-Import: Chunk-Mengenupdate fehlgeschlagen, versuche einzeln.', err);
          for (const update of toUpdate) {
            try {
              await updateWineQuantities([update]);
              mergedCount += 1;
            } catch (singleErr) {
              failed += 1;
              console.error('CSV-Import: Menge konnte nicht aktualisiert werden.', update, singleErr);
            }
          }
        }
      }

      setImportState((s) => (s.phase === 'importing' ? { ...s, done: Math.min(merged.length, i + chunk.length) } : s));
    }

    setImportState({ phase: 'done', imported, merged: mergedCount, failed });
    loadWines();
  }

  async function handleCsvFileChosen(file: File) {
    setCsvState({ phase: 'reading' });
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) {
        setCsvState({
          phase: 'error',
          message: 'In dieser Datei wurden keine Weine gefunden (nur eine Kopfzeile oder leer).',
        });
        return;
      }
      const headers = rows[0];
      const dataRows = rows.slice(1);
      const mapping = headers.map(guessField);
      setCsvState({ phase: 'mapping', headers, mapping, rows: dataRows });
    } catch {
      setCsvState({ phase: 'error', message: 'Datei konnte nicht gelesen werden.' });
    }
  }

  function handleCsvMappingChange(columnIndex: number, field: MappableField) {
    setCsvState((s) => {
      if (s.phase !== 'mapping') return s;
      const mapping = [...s.mapping];
      mapping[columnIndex] = field;
      return { ...s, mapping };
    });
  }

  function handleCsvImportStart() {
    if (csvState.phase !== 'mapping') return;
    const wines = rowsToWineInputs(csvState.mapping, csvState.rows);
    if (wines.length === 0) {
      setCsvState({
        phase: 'error',
        message: 'Keine Zeile mit einem Namen gefunden. Bitte eine Spalte als "Name" zuordnen.',
      });
      return;
    }
    setCsvState({ phase: 'idle' });
    handleConfirmImport(wines);
  }

  async function handleDeleteAll() {
    setDeletingAll(true);
    setDeleteAllError(null);
    try {
      await requestCollectionDeletion();
      setConfirmDeleteAll(false);
      setDeleteAllConfirmText('');
      await loadDeletionRequest();
    } catch (e) {
      setDeleteAllError(e instanceof Error ? e.message : 'Anfrage konnte nicht gesendet werden.');
    } finally {
      setDeletingAll(false);
    }
  }

  async function handleCancelRequest() {
    if (!pendingDeletionRequest) return;
    setCancelingRequest(true);
    try {
      await cancelDeletionRequest(pendingDeletionRequest.id);
      await loadDeletionRequest();
    } catch {
      // Bewusst still: Karte bleibt einfach stehen, Nutzer kann es erneut versuchen.
    } finally {
      setCancelingRequest(false);
    }
  }

  return (
    <div className="app-screen">
      <div className="top-bar">
        <button type="button" className="icon-btn" aria-label="Zurück" onClick={() => navigate(-1)}>
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 1L2 9l8 8" />
          </svg>
        </button>
      </div>

      <div className="form-page" style={{ paddingTop: 0 }}>
        <h1 style={{ fontSize: 25, marginBottom: 20 }}>Einstellungen</h1>

        <section style={{ marginBottom: 28 }}>
          <div className="card-kicker" style={{ marginBottom: 8 }}>
            Konto
          </div>
          <div className="card" style={{ gap: 12 }}>
            <div style={{ fontSize: 14 }}>{session?.user.email}</div>
            <div>
              <label style={{ fontSize: 12.5, opacity: 0.65, display: 'block', marginBottom: 4 }}>
                Name (so wirst du in der App angesprochen)
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  style={{ flex: 1 }}
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    setNameSaved(false);
                  }}
                  placeholder="z.B. Gregor"
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={savingName || !nameInput.trim()}
                  onClick={handleSaveName}
                >
                  {savingName ? 'Speichert ...' : 'Speichern'}
                </button>
              </div>
              {nameError && <ErrorBanner message={nameError} />}
              {nameSaved && <div style={{ fontSize: 12.5, color: 'var(--color-bordeaux)', marginTop: 4 }}>Gespeichert.</div>}
            </div>
            <div>
              <label style={{ fontSize: 12.5, opacity: 0.65, display: 'block', marginBottom: 4 }}>
                Passwort ändern
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  style={{ flex: 1 }}
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordSaved(false);
                    setPasswordError(null);
                  }}
                  placeholder="Neues Passwort (mind. 8 Zeichen)"
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={savingPassword || newPassword.length < 8}
                  onClick={handleSetPassword}
                >
                  {savingPassword ? 'Speichert ...' : 'Speichern'}
                </button>
              </div>
              {passwordError && <ErrorBanner message={passwordError} />}
              {passwordSaved && <div style={{ fontSize: 12.5, color: 'var(--color-bordeaux)', marginTop: 4 }}>Gespeichert.</div>}
            </div>
            <button type="button" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={handleSignOut}>
              Abmelden
            </button>
          </div>
        </section>

        <section style={{ marginBottom: 28 }}>
          <div className="card-kicker" style={{ marginBottom: 8 }}>
            Kosten &amp; Zahlungen
          </div>

          {myPaymentRequests.filter((p) => p.status === 'open').length > 0 && (
            <div
              className="card"
              style={{ gap: 10, marginBottom: 14, border: '2px solid var(--color-bordeaux)', background: 'color-mix(in srgb, var(--color-bordeaux) 10%, transparent)' }}
            >
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, color: 'var(--color-bordeaux)' }}>
                Offene Zahlung{myPaymentRequests.filter((p) => p.status === 'open').length > 1 ? 'en' : ''}
              </div>
              {myPaymentRequests
                .filter((p) => p.status === 'open')
                .map((p) => (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 8, borderBottom: '1px solid var(--color-divider)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <strong style={{ fontSize: 18 }}>{p.amount.toFixed(2)} CHF</strong>
                      <span style={{ fontSize: 11.5, opacity: 0.55 }}>{new Date(p.created_at).toLocaleDateString('de-CH')}</span>
                    </div>
                    <div style={{ fontSize: 13.5 }}>{p.reason}</div>
                  </div>
                ))}
              <div style={{ fontSize: 12, opacity: 0.7 }}>Überweisung/TWINT an Andrin, wie besprochen.</div>
            </div>
          )}

          {myPaymentRequests.filter((p) => p.status !== 'open').length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {myPaymentRequests
                .filter((p) => p.status !== 'open')
                .map((p) => (
                  <div key={p.id} className="card" style={{ gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <strong style={{ fontSize: 15 }}>{p.amount.toFixed(2)} CHF</strong>
                      <span style={{ fontSize: 12, opacity: 0.55 }}>{new Date(p.created_at).toLocaleDateString('de-CH')}</span>
                    </div>
                    <div style={{ fontSize: 13.5 }}>{p.reason}</div>
                    <div style={{ fontSize: 12.5, opacity: 0.7 }}>
                      {p.status === 'paid' && `Bezahlt${p.paid_at ? ' am ' + new Date(p.paid_at).toLocaleDateString('de-CH') : ''}.`}
                      {p.status === 'cancelled' && 'Storniert.'}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {myOrders.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, opacity: 0.65, marginBottom: 8 }}>Meine Aufträge</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {myOrders.map((o) => (
                  <div key={o.id} className="card" style={{ gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <strong style={{ fontSize: 14 }}>{ORDER_CATEGORY_INFO[o.category].label}</strong>
                      <span style={{ fontSize: 12, opacity: 0.55 }}>{new Date(o.created_at).toLocaleDateString('de-CH')}</span>
                    </div>
                    <div style={{ fontSize: 13 }}>
                      {o.wine_count} {o.wine_count === 1 ? 'Wein' : 'Weine'} · {o.estimated_price.toFixed(2)} CHF
                    </div>
                    <div style={{ fontSize: 12.5, opacity: 0.7 }}>
                      {o.status === 'pending' && 'Wartet auf Bearbeitung'}
                      {o.status === 'in_progress' && 'Wird bearbeitet'}
                      {o.status === 'done' && 'Erledigt'}
                      {o.status === 'cancelled' && 'Storniert'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pricing && (
            <div className="card" style={{ gap: 8 }}>
              <div style={{ fontSize: 12.5, opacity: 0.65, marginBottom: 2 }}>
                Preise für Aktualisierungs-Aufträge ({ownActiveWineCount} {ownActiveWineCount === 1 ? 'Wein' : 'Weine'} in deiner Sammlung)
              </div>
              {(Object.keys(ORDER_CATEGORY_INFO) as (keyof typeof ORDER_CATEGORY_INFO)[]).map((key) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{ORDER_CATEGORY_INFO[key].label}</span>
                  <span style={{ opacity: 0.7 }}>
                    {ownActiveWineCount > 0 ? computeOrderPrice(pricing, key, ownActiveWineCount).toFixed(2) : pricing[key].toFixed(2)} CHF
                  </span>
                </div>
              ))}
              <div style={{ fontSize: 11.5, opacity: 0.55, marginTop: 4 }}>
                {ownActiveWineCount > 0
                  ? 'Preis, wenn du deine ganze aktuelle Sammlung als Auftrag gibst. Bei einer Auswahl (z. B. nur neue Weine) fällt er entsprechend kleiner aus.'
                  : 'Preis für einen Auftrag mit einem Wein - bei mehr Weinen wird es pro Wein günstiger.'}
              </div>
              <div style={{ fontSize: 11.5, opacity: 0.55, marginTop: 4 }}>
                Aktualisierungs-Aufträge kosten, weil dahinter echte Recherche steckt - pro Wein wird online nach
                Region, Rebsorte, Trinkfenster und Kritiker-Punkten gesucht, bei importierten Weinen zusätzlich ein
                passendes Etikett-Foto. Das braucht Zeit, auch wenn ein Grossteil automatisiert abläuft.
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 11.5, alignSelf: 'flex-start', padding: 0, marginTop: 4 }}
                onClick={() => navigate('/impressum')}
              >
                Impressum &amp; Kosten-Hinweise
              </button>
            </div>
          )}
        </section>

        <section style={{ marginBottom: 28 }}>
          <div className="card-kicker" style={{ marginBottom: 8 }}>
            Wissen
          </div>
          <div className="card" style={{ gap: 12 }}>
            <div style={{ fontSize: 12.5, opacity: 0.65, lineHeight: 1.5 }}>
              Rebsorten und Weinregionen mit Beschreibung zum Nachschlagen.
            </div>
            <button type="button" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/lexikon')}>
              Weinlexikon öffnen
            </button>
          </div>
        </section>

        <section style={{ marginBottom: 28 }}>
          <div className="card-kicker" style={{ marginBottom: 8 }}>
            Hilfe
          </div>
          <div className="card" style={{ gap: 10 }}>
            <div style={{ fontSize: 12.5, opacity: 0.65, lineHeight: 1.5 }}>
              Anleitungen zur Bedienung von Grapino.
            </div>
            <a href="/Grapino-Anleitung.pdf" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
              Erste Schritte (PDF)
            </a>
            <a href="/Grapino-Anleitung-Weine-Anlegen.pdf" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
              Weine anlegen (PDF)
            </a>
            <a href="/Grapino-Anleitung-App.pdf" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
              So funktioniert die App (PDF)
            </a>
            <a href="/Grapino-Anleitung-Nachrichten.pdf" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
              Kontakt und Nachrichten (PDF)
            </a>
          </div>
        </section>

        <section style={{ marginBottom: 28 }}>
          <div className="card-kicker" style={{ marginBottom: 8 }}>
            Statistik
          </div>
          <div className="card" style={{ gap: 12 }}>
            <div style={{ fontSize: 12.5, opacity: 0.65, lineHeight: 1.5 }}>
              Übersicht: wie viele Weine, aus welcher Region, welche Rebsorten.
            </div>
            <button type="button" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/statistik')}>
              Statistik anzeigen
            </button>
          </div>
        </section>

        <section style={{ marginBottom: 28 }}>
          <div className="card-kicker" style={{ marginBottom: 8 }}>
            Daten
          </div>
          <div className="card" style={{ gap: 14 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                Sammlung sichern
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.65, marginBottom: 10, lineHeight: 1.5 }}>
                Lädt alle Wein-Angaben als Datei herunter (ohne Fotos - die liegen bereits sicher bei Supabase). Gut
                als zusätzliche, unabhängige Kopie.
              </div>
              {loadingWines ? (
                <LoadingSpinner label="Sammlung wird geladen ..." />
              ) : loadError ? (
                <ErrorBanner message={loadError} onRetry={loadWines} />
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={wines.length === 0}
                  onClick={() => downloadWinesBackup(wines)}
                >
                  Sammlung herunterladen ({wines.length})
                </button>
              )}
            </div>

            <div className="hr" style={{ margin: 0 }} />

            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                Als PDF drucken
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.65, marginBottom: 10, lineHeight: 1.5 }}>
                Druckoptimierte Liste des aktuellen Bestands (ohne Wunschliste/Getrunken) - im Druckdialog als PDF
                speicherbar.
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/drucken')}>
                Druckansicht öffnen
              </button>
            </div>

            <div className="hr" style={{ margin: 0 }} />

            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                Sammlung importieren
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.65, marginBottom: 10, lineHeight: 1.5 }}>
                Eine zuvor gesicherte Datei wieder einspielen. Bestehende Weine werden dabei nicht verändert oder
                gelöscht - importierte Weine kommen als neue Einträge hinzu.
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChosen(file);
                  e.target.value = '';
                }}
              />

              {importState.phase === 'idle' && (
                <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                  Datei auswählen
                </button>
              )}

              {importState.phase === 'reading' && <LoadingSpinner label="Datei wird gelesen ..." />}

              {importState.phase === 'confirm' && (
                <div>
                  <div style={{ fontSize: 13.5, marginBottom: 10 }}>
                    {importState.wines.length} {importState.wines.length === 1 ? 'Wein' : 'Weine'} gefunden.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setImportState({ phase: 'idle' })}>
                      Abbrechen
                    </button>
                    <button type="button" className="btn btn-primary" onClick={() => handleConfirmImport(importState.wines)}>
                      Importieren
                    </button>
                  </div>
                </div>
              )}

              {importState.phase === 'importing' && (
                <LoadingSpinner label={`Wird importiert ... (${importState.done}/${importState.total})`} />
              )}

              {importState.phase === 'done' && (
                <div style={{ fontSize: 13.5 }}>
                  {importState.imported} {importState.imported === 1 ? 'Wein' : 'Weine'} neu angelegt.
                  {importState.merged > 0 &&
                    ` ${importState.merged} ${importState.merged === 1 ? 'Duplikat wurde' : 'Duplikate wurden'} stattdessen mit dem Bestand zusammengeführt.`}
                  {importState.failed > 0 && ` ${importState.failed} fehlgeschlagen.`}
                  <div style={{ marginTop: 10 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setImportState({ phase: 'idle' })}>
                      Weitere Datei importieren
                    </button>
                  </div>
                </div>
              )}

              {importState.phase === 'error' && (
                <ErrorBanner message={importState.message} onRetry={() => setImportState({ phase: 'idle' })} />
              )}
            </div>

            <div className="hr" style={{ margin: 0 }} />

            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                Aus Vivino oder Excel importieren
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.65, marginBottom: 10, lineHeight: 1.5 }}>
                Eine CSV-Datei auswählen (z. B. aus Vivino exportiert). Du ordnest danach kurz zu, welche Spalte
                welchem Feld entspricht - importierte Weine kommen als neue Einträge hinzu, nichts wird
                überschrieben.
              </div>

              <input
                ref={csvFileInputRef}
                type="file"
                accept="text/csv,.csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCsvFileChosen(file);
                  e.target.value = '';
                }}
              />

              {csvState.phase === 'idle' && (
                <button type="button" className="btn btn-secondary" onClick={() => csvFileInputRef.current?.click()}>
                  CSV-Datei auswählen
                </button>
              )}

              {csvState.phase === 'reading' && <LoadingSpinner label="Datei wird gelesen ..." />}

              {csvState.phase === 'mapping' && (
                <div>
                  <div style={{ fontSize: 13.5, marginBottom: 10 }}>
                    {csvState.rows.length} {csvState.rows.length === 1 ? 'Zeile' : 'Zeilen'} gefunden. Bitte prüfen,
                    welche Spalte welchem Feld entspricht:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {csvState.headers.map((header, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {header || `Spalte ${i + 1}`}
                        </div>
                        <select
                          className="input"
                          style={{ flex: 1, padding: '6px 8px', fontSize: 13 }}
                          value={csvState.mapping[i]}
                          onChange={(e) => handleCsvMappingChange(i, e.target.value as MappableField)}
                        >
                          {MAPPABLE_FIELDS.map((f) => (
                            <option key={f} value={f}>
                              {FIELD_LABELS[f]}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setCsvState({ phase: 'idle' })}>
                      Abbrechen
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleCsvImportStart}>
                      Importieren
                    </button>
                  </div>
                </div>
              )}

              {csvState.phase === 'error' && (
                <ErrorBanner message={csvState.message} onRetry={() => setCsvState({ phase: 'idle' })} />
              )}
            </div>
          </div>
        </section>

        {myFeedback.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <div className="card-kicker" style={{ marginBottom: 8 }}>
              Meine Rückmeldungen
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myFeedback.map((f) => (
                <div key={f.id} className="card" style={{ gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--color-bordeaux)' }}>{'★'.repeat(f.rating)}</span>
                      <span style={{ opacity: 0.55 }}>{new Date(f.created_at).toLocaleDateString('de-CH')}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: 11.5, padding: 0, color: 'var(--color-bordeaux)' }}
                      onClick={() => setFeedbackToDelete(f)}
                    >
                      Löschen
                    </button>
                  </div>
                  {f.message && <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{f.message}</div>}
                  {f.reply && (
                    <div
                      style={{
                        marginTop: 4,
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'color-mix(in srgb, var(--color-bordeaux) 8%, transparent)',
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>Antwort:</strong> {f.reply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={{ marginBottom: 28 }}>
          <div className="card-kicker" style={{ marginBottom: 8, color: 'var(--color-bordeaux)' }}>
            Gefahrenzone
          </div>
          <div className="card" style={{ gap: 10, border: '1px solid var(--color-bordeaux)' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15 }}>
              Ganze Sammlung löschen
            </div>
            {!loadingDeletionRequest && pendingDeletionRequest ? (
              <>
                <div style={{ fontSize: 12.5, opacity: 0.65, lineHeight: 1.5 }}>
                  Löschanfrage gesendet am{' '}
                  {new Date(pendingDeletionRequest.created_at).toLocaleString('de-CH')}. Sie wird geprüft, bevor
                  etwas gelöscht wird.
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ alignSelf: 'flex-start' }}
                  disabled={cancelingRequest}
                  onClick={handleCancelRequest}
                >
                  {cancelingRequest ? 'Wird zurückgenommen ...' : 'Anfrage zurückziehen'}
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12.5, opacity: 0.65, lineHeight: 1.5 }}>
                  Sendet eine Anfrage zum Löschen der gesamten Sammlung (Vorrat, Wunschliste, Getrunken)
                  inklusive aller Fotos. Die Löschung wird erst nach Bestätigung ausgeführt. Vorher am besten
                  eine Sicherung herunterladen.
                </div>
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ alignSelf: 'flex-start' }}
                  disabled={wines.length === 0}
                  onClick={() => setConfirmDeleteAll(true)}
                >
                  Sammlung löschen ({wines.length})
                </button>
              </>
            )}
          </div>
        </section>
      </div>

      {confirmDeleteAll && (
        <div
          className="dialog-backdrop"
          onClick={() => {
            if (deletingAll) return;
            setConfirmDeleteAll(false);
            setDeleteAllConfirmText('');
            setDeleteAllError(null);
          }}
        >
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">Löschanfrage senden?</div>
            <div className="dialog-body">
              Alle {wines.length} {wines.length === 1 ? 'Wein wird' : 'Weine werden'} zur Löschung angefragt,
              inklusive aller Fotos. Die Sammlung wird erst gelöscht, nachdem die Anfrage bestätigt wurde.
              <div style={{ marginTop: 12 }}>
                Zum Bestätigen <strong>{DELETE_ALL_KEYWORD}</strong> eintippen:
              </div>
              <input
                className="input"
                style={{ marginTop: 8 }}
                value={deleteAllConfirmText}
                onChange={(e) => setDeleteAllConfirmText(e.target.value)}
                autoFocus
                disabled={deletingAll}
              />
              {deleteAllError && <ErrorBanner message={deleteAllError} />}
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={deletingAll}
                onClick={() => {
                  setConfirmDeleteAll(false);
                  setDeleteAllConfirmText('');
                  setDeleteAllError(null);
                }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deletingAll || deleteAllConfirmText.trim().toUpperCase() !== DELETE_ALL_KEYWORD}
                onClick={handleDeleteAll}
              >
                {deletingAll ? 'Wird gesendet ...' : 'Anfrage senden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedbackToDelete && (
        <div className="dialog-backdrop" onClick={() => !deletingFeedback && setFeedbackToDelete(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">Rückmeldung löschen?</div>
            <div className="dialog-body">
              Diese Rückmeldung wird unwiderruflich gelöscht.
              {feedbackDeleteError && <ErrorBanner message={feedbackDeleteError} />}
            </div>
            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setFeedbackToDelete(null)} disabled={deletingFeedback}>
                Abbrechen
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteFeedback} disabled={deletingFeedback}>
                {deletingFeedback ? 'Wird gelöscht ...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
