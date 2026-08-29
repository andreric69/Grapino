import { useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from '../components/ThemeToggle';

type Mode = 'login' | 'signup' | 'forgot';

// Kein Drittanbieter-Captcha (braucht ein eigenes Konto) - stattdessen zwei
// einfache, kostenlose Bot-Filter fuer die offene Selbst-Registrierung:
// ein Honeypot-Feld (fuer Menschen unsichtbar, simple Bots fuellen es aber
// aus) und eine Mindestzeit zwischen Seitenaufruf und Absenden (ein
// automatisiertes Skript tippt nicht, ein Mensch braucht immer ein paar
// Sekunden fuers Ausfuellen). Kein perfekter Schutz, aber haelt einfache
// Massen-Registrierungs-Skripte zuverlaessig ab, ganz ohne neues Konto.
const MIN_SIGNUP_SECONDS = 3;

export function LoginPage() {
  const { session, signIn, signUp, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const formMountedAt = useRef(Date.now());

  if (session) {
    return <Navigate to="/" replace />;
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setConfirmationSent(false);
    setResetSent(false);
    setPasswordConfirm('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && password !== passwordConfirm) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }

    if (mode === 'signup') {
      // Honeypot ausgefuellt oder Formular verdaechtig schnell abgeschickt -
      // beides deutet auf ein automatisiertes Skript statt einen Menschen
      // hin. Bewusst keine erkennbare Fehlermeldung ("Bot erkannt") - zeigt
      // stattdessen einfach denselben Bestaetigungs-Screen wie ein echter
      // Sign-up, ohne dass tatsaechlich ein Konto angelegt wird. Das
      // verhindert, dass ein Skript aus der Fehlermeldung lernt, wie es den
      // Filter umgehen koennte.
      const secondsSinceMount = (Date.now() - formMountedAt.current) / 1000;
      if (honeypot.trim() || secondsSinceMount < MIN_SIGNUP_SECONDS) {
        setConfirmationSent(true);
        return;
      }
    }

    setSubmitting(true);

    if (mode === 'forgot') {
      const { error } = await requestPasswordReset(email);
      setSubmitting(false);
      if (error) {
        setError(error);
        return;
      }
      setResetSent(true);
      return;
    }

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      setSubmitting(false);
      if (error) setError(error);
      return;
    }

    const { error, needsEmailConfirmation } = await signUp(email, password);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    if (needsEmailConfirmation) {
      setConfirmationSent(true);
    }
    // Sonst: Sign-up hat direkt eine Sitzung geliefert - "session" oben wird
    // gleich gesetzt, die Navigate-Weiche greift dann automatisch.
  }

  if (confirmationSent) {
    return (
      <div className="app-screen" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 24 }}>
          <div className="card elev-lg" style={{ maxWidth: 360, textAlign: 'center', gap: 14, padding: 28 }}>
            <div style={{ fontSize: 32 }}>📬</div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, margin: 0 }}>Fast geschafft</h1>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
              Wir haben dir eine Bestätigungs-Mail an {email} geschickt. Klick auf den Link darin, um dein Konto zu
              aktivieren.
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => switchMode('login')} style={{ marginTop: 4 }}>
              Zurück zum Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (resetSent) {
    return (
      <div className="app-screen" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 24 }}>
          <div className="card elev-lg" style={{ maxWidth: 360, textAlign: 'center', gap: 14, padding: 28 }}>
            <div style={{ fontSize: 32 }}>📬</div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, margin: 0 }}>E-Mail unterwegs</h1>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
              Falls für {email} ein Konto besteht, haben wir gerade einen Link zum Zurücksetzen des Passworts
              geschickt. Klick darauf, um ein neues Passwort zu setzen.
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => switchMode('login')} style={{ marginTop: 4 }}>
              Zurück zum Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-screen" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 16px 0' }}>
        <ThemeToggle />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 24px 64px' }}>
        <div style={{ maxWidth: 360, width: '100%', margin: '0 auto' }}>
          <div className="kicker" style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: 6 }}>
            Private Sammlung
          </div>
          <h1 style={{ fontSize: 32, marginBottom: 24 }}>Grapino</h1>

          {mode !== 'forgot' && (
            <div className="chat-tab-row" style={{ marginBottom: 20 }}>
              <button type="button" className={`chat-tab${mode === 'login' ? ' is-active' : ''}`} onClick={() => switchMode('login')}>
                Anmelden
              </button>
              <button type="button" className={`chat-tab${mode === 'signup' ? ' is-active' : ''}`} onClick={() => switchMode('signup')}>
                Konto erstellen
              </button>
            </div>
          )}
          {mode === 'forgot' && (
            <div style={{ fontSize: 13, marginBottom: 16 }}>
              Gib deine E-Mail-Adresse ein - wir schicken dir einen Link zum Zurücksetzen deines Passworts.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              // Honeypot: fuer Menschen unsichtbar (Position ausserhalb des
              // sichtbaren Bereichs, nicht "display:none" - manche Bots
              // ueberspringen display:none-Felder gezielt), einfache Bots
              // fuellen aber jedes Feld im Formular aus. tabIndex -1 und
              // aria-hidden, damit auch Tastatur-Navigation/Screenreader es
              // ueberspringen.
              <div style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>
            )}
            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="email">E-Mail</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {mode !== 'forgot' && (
              <>
                <div className="field" style={{ marginBottom: mode === 'signup' ? 14 : 4 }}>
                  <label htmlFor="password">Passwort</label>
                  <input
                    id="password"
                    className="input"
                    type="password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    minLength={mode === 'signup' ? 8 : undefined}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {mode === 'signup' && (
                  <div style={{ fontSize: 11, opacity: 0.55, marginTop: -10, marginBottom: 10 }}>Mindestens 8 Zeichen.</div>
                )}
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: 'var(--color-accent)', cursor: 'pointer', marginBottom: 12 }}
                  >
                    Passwort vergessen?
                  </button>
                )}
              </>
            )}
            {mode === 'signup' && (
              <div className="field" style={{ marginBottom: 8 }}>
                <label htmlFor="passwordConfirm">Passwort bestätigen</label>
                <input
                  id="passwordConfirm"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                />
              </div>
            )}

            {error && (
              <div style={{ color: 'var(--color-bordeaux)', fontSize: 13, margin: '10px 0' }}>{error}</div>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? '...' : mode === 'login' ? 'Anmelden' : mode === 'signup' ? 'Konto erstellen' : 'Link schicken'}
            </button>

            {mode === 'signup' && (
              <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 10, textAlign: 'center' }}>
                Du bekommst automatisch eine kostenlose 7-tägige Testphase. Mit dem Erstellen eines Kontos akzeptierst
                du die Hinweise im{' '}
                <a href="/impressum" style={{ color: 'inherit' }}>
                  Impressum
                </a>
                .
              </div>
            )}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: 'var(--color-accent)', cursor: 'pointer', marginTop: 12, display: 'block' }}
              >
                Zurück zum Login
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
