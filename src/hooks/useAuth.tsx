import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface SignUpResult {
  error: string | null;
  // true, wenn Supabase eine Bestaetigungs-Mail verlangt (kein Session sofort
  // zurueckgegeben) - dann noch nicht eingeloggt, muss erst den Mail-Link
  // anklicken.
  needsEmailConfirmation: boolean;
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<{ error: string | null }>;
}

// Neu selbst registrierte Nutzer bekommen automatisch eine Testphase (siehe
// TrialStatusScreen) - bei einem admin-angelegten Konto entscheidet weiterhin
// Andrin von Hand, ob/wie lange eine Testphase gilt.
const SELF_SIGNUP_TRIAL_DAYS = 7;

/**
 * Legt die Testphase-Zeile fuer einen frisch selbst registrierten Nutzer an.
 * Nebeneffekt, kein kritischer Schritt - schlaegt es fehl, bleibt der Nutzer
 * trotzdem eingeloggt (gilt dann einfach als "kein Testphase-Datum gesetzt",
 * kein Zugangsproblem). Wird von zwei Stellen aufgerufen: direkt bei
 * signUp(), falls Supabase sofort eine Sitzung liefert (E-Mail-Bestaetigung
 * nicht erforderlich), oder beim ersten Login NACH einer Bestaetigungs-Mail
 * (siehe Effect oben) - je nachdem, wie das Supabase-Projekt konfiguriert
 * ist.
 */
function insertTrialRow(userId: string) {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + SELF_SIGNUP_TRIAL_DAYS);
  supabase
    .from('user_access')
    .insert({ user_id: userId, trial_ends_at: trialEndsAt.toISOString().slice(0, 10) })
    .then(({ error }) => {
      if (error) console.error('Testphase konnte nicht angelegt werden:', error);
    });
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Nach dem Anklicken des Bestaetigungslinks landet man mit
    // "#access_token=...&type=signup" in der URL - das einzige verlaessliche
    // Signal, dass gerade eine frische Registrierung bestaetigt wurde (nicht
    // nur ein normaler Login). Genau dann die Testphase anlegen, die bei
    // signUp() selbst noch nicht angelegt werden konnte (keine Sitzung vor
    // der Bestaetigung, siehe signUp() unten). Einmalig ausserhalb des
    // Callbacks gelesen, weil Supabase den Hash nach dem Verarbeiten
    // entfernt - ein erneutes Auslesen im Callback koennte dann leer sein.
    const isSignupConfirmation = window.location.hash.includes('type=signup');
    let trialHandled = false;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (isSignupConfirmation && newSession && !trialHandled) {
        trialHandled = true;
        insertTrialRow(newSession.user.id);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        return { error: 'E-Mail oder Passwort ist falsch.' };
      }
      // Nach einer Registrierung, die noch nicht per Mail bestaetigt wurde -
      // ohne diesen Fall zeigte "Anmelden" faelschlich "Internetverbindung
      // pruefen" statt des eigentlichen Grunds.
      if (error.message.toLowerCase().includes('email not confirmed')) {
        return { error: 'Bitte zuerst die Bestätigungs-Mail anklicken, die du bei der Registrierung erhalten hast.' };
      }
      return { error: 'Anmeldung fehlgeschlagen. Bitte Internetverbindung pruefen und erneut versuchen.' };
    }
    return { error: null };
  }

  async function signUp(email: string, password: string): Promise<SignUpResult> {
    // Ohne explizites emailRedirectTo baut Supabase den Bestaetigungs-Link
    // aus der im Dashboard hinterlegten "Site URL" - stand dort noch auf
    // einem alten localhost-Wert, landeten frisch registrierte Nutzer beim
    // Anklicken der Mail auf einer toten lokalen Adresse statt der echten
    // App. Explizit setzen, damit das unabhaengig von dieser
    // Dashboard-Einstellung immer stimmt.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        return { error: 'Für diese E-Mail-Adresse besteht bereits ein Konto.', needsEmailConfirmation: false };
      }
      if (error.message.toLowerCase().includes('password')) {
        return { error: 'Passwort zu kurz - mindestens 8 Zeichen.', needsEmailConfirmation: false };
      }
      return { error: 'Registrierung fehlgeschlagen. Bitte Internetverbindung prüfen und erneut versuchen.', needsEmailConfirmation: false };
    }
    if (!data.session) {
      // Supabase verlangt eine Bestaetigungs-Mail, bevor ein Login moeglich
      // ist - noch keine Sitzung, Testphase wird beim ersten echten Login
      // nachgeholt (siehe Effect oben, erkennt "type=signup" im URL-Hash).
      return { error: null, needsEmailConfirmation: true };
    }
    insertTrialRow(data.session.user.id);
    return { error: null, needsEmailConfirmation: false };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function updateDisplayName(name: string) {
    const { error } = await supabase.auth.updateUser({ data: { display_name: name.trim() } });
    if (error) return { error: 'Name konnte nicht gespeichert werden. Bitte Internetverbindung pruefen.' };
    return { error: null };
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut, updateDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden');
  return ctx;
}
