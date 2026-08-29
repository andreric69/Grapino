import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from '../components/ThemeToggle';

export function LoginPage() {
  const { session, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  if (session) {
    return <Navigate to="/" replace />;
  }

  function switchMode(next: 'login' | 'signup') {
    setMode(next);
    setError(null);
    setConfirmationSent(false);
    setPasswordConfirm('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && password !== passwordConfirm) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }

    setSubmitting(true);
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

          <div className="chat-tab-row" style={{ marginBottom: 20 }}>
            <button type="button" className={`chat-tab${mode === 'login' ? ' is-active' : ''}`} onClick={() => switchMode('login')}>
              Anmelden
            </button>
            <button type="button" className={`chat-tab${mode === 'signup' ? ' is-active' : ''}`} onClick={() => switchMode('signup')}>
              Konto erstellen
            </button>
          </div>

          <form onSubmit={handleSubmit}>
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
            <div className="field" style={{ marginBottom: mode === 'signup' ? 14 : 8 }}>
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
              {submitting ? '...' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
            </button>

            {mode === 'signup' && (
              <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 10, textAlign: 'center' }}>
                Du bekommst automatisch eine kostenlose 7-tägige Testphase.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
