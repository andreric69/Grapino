import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { listWines, createWine, updateWine, deleteAllWines } from '../lib/wineRepository';
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
import type { Wine, WineInput } from '../types';
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
  const { session, signOut } = useAuth();

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

  useEffect(() => {
    loadWines();
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
  async function handleConfirmImport(toImport: WineInput[]) {
    const merged = mergeDuplicatesWithinBatch(toImport);
    setImportState({ phase: 'importing', total: merged.length, done: 0 });
    const existingIndex = buildExistingActiveIndex(wines);
    let imported = 0;
    let mergedCount = 0;
    let failed = 0;
    for (const wine of merged) {
      try {
        const existing = findExistingMatch(wine, existingIndex);
        if (existing) {
          const updated = await updateWine(existing.id, { quantity: existing.quantity + wine.quantity });
          existingIndex.set(
            `${wine.name.trim().toLowerCase()}|${(wine.producer ?? '').trim().toLowerCase()}|${wine.vintage ?? ''}`,
            updated,
          );
          mergedCount++;
        } else {
          await createWine(wine);
          imported++;
        }
      } catch {
        failed++;
      }
      setImportState((s) => (s.phase === 'importing' ? { ...s, done: s.done + 1 } : s));
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
      await deleteAllWines(wines);
      setConfirmDeleteAll(false);
      setDeleteAllConfirmText('');
      await loadWines();
    } catch (e) {
      setDeleteAllError(e instanceof Error ? e.message : 'Loeschen fehlgeschlagen.');
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <div className="app-screen">
      <div className="top-bar">
        <button type="button" className="icon-btn" aria-label="Zurueck" onClick={() => navigate(-1)}>
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
            <button type="button" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={handleSignOut}>
              Abmelden
            </button>
          </div>
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
              Weinlexikon oeffnen
            </button>
          </div>
        </section>

        <section style={{ marginBottom: 28 }}>
          <div className="card-kicker" style={{ marginBottom: 8 }}>
            Statistik
          </div>
          <div className="card" style={{ gap: 12 }}>
            <div style={{ fontSize: 12.5, opacity: 0.65, lineHeight: 1.5 }}>
              Uebersicht: wie viele Weine, aus welcher Region, welche Rebsorten.
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
                Laedt alle Wein-Angaben als Datei herunter (ohne Fotos - die liegen bereits sicher bei Supabase). Gut
                als zusaetzliche, unabhaengige Kopie.
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
                Druckansicht oeffnen
              </button>
            </div>

            <div className="hr" style={{ margin: 0 }} />

            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                Sammlung importieren
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.65, marginBottom: 10, lineHeight: 1.5 }}>
                Eine zuvor gesicherte Datei wieder einspielen. Bestehende Weine werden dabei nicht veraendert oder
                geloescht - importierte Weine kommen als neue Eintraege hinzu.
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
                  Datei auswaehlen
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
                    ` ${importState.merged} ${importState.merged === 1 ? 'Duplikat wurde' : 'Duplikate wurden'} stattdessen mit dem Bestand zusammengefuehrt.`}
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
                Eine CSV-Datei auswaehlen (z. B. aus Vivino exportiert). Du ordnest danach kurz zu, welche Spalte
                welchem Feld entspricht - importierte Weine kommen als neue Eintraege hinzu, nichts wird
                ueberschrieben.
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
                  CSV-Datei auswaehlen
                </button>
              )}

              {csvState.phase === 'reading' && <LoadingSpinner label="Datei wird gelesen ..." />}

              {csvState.phase === 'mapping' && (
                <div>
                  <div style={{ fontSize: 13.5, marginBottom: 10 }}>
                    {csvState.rows.length} {csvState.rows.length === 1 ? 'Zeile' : 'Zeilen'} gefunden. Bitte pruefen,
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

        <section style={{ marginBottom: 28 }}>
          <div className="card-kicker" style={{ marginBottom: 8, color: 'var(--color-bordeaux)' }}>
            Gefahrenzone
          </div>
          <div className="card" style={{ gap: 10, border: '1px solid var(--color-bordeaux)' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15 }}>
              Ganze Sammlung loeschen
            </div>
            <div style={{ fontSize: 12.5, opacity: 0.65, lineHeight: 1.5 }}>
              Loescht unwiderruflich alle Weine (Vorrat, Wunschliste, Getrunken) inklusive aller Fotos. Der
              Trinkverlauf im Rueckblick bleibt erhalten. Vorher am besten eine Sicherung herunterladen.
            </div>
            <button
              type="button"
              className="btn btn-danger"
              style={{ alignSelf: 'flex-start' }}
              disabled={wines.length === 0}
              onClick={() => setConfirmDeleteAll(true)}
            >
              Sammlung loeschen ({wines.length})
            </button>
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
            <div className="dialog-title">Ganze Sammlung loeschen?</div>
            <div className="dialog-body">
              Alle {wines.length} {wines.length === 1 ? 'Wein wird' : 'Weine werden'} unwiderruflich geloescht,
              inklusive aller Fotos. Das kann nicht rueckgaengig gemacht werden.
              <div style={{ marginTop: 12 }}>
                Zum Bestaetigen <strong>{DELETE_ALL_KEYWORD}</strong> eintippen:
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
                {deletingAll ? 'Wird geloescht ...' : 'Endgueltig loeschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
