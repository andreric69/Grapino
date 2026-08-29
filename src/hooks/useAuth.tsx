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

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        return { error: 'E-Mail oder Passwort ist falsch.' };
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
      // ist - noch keine Sitzung, Testphase kann erst nach der Bestaetigung
      // (beim ersten echten Login) angelegt werden, siehe unten.
      return { error: null, needsEmailConfirmation: true };
    }
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + SELF_SIGNUP_TRIAL_DAYS);
    // Nebeneffekt, kein kritischer Schritt - schlaegt das Anlegen der
    // Testphase-Zeile fehl, bleibt der Nutzer trotzdem eingeloggt (gilt dann
    // einfach als "kein Testphase-Datum gesetzt", kein Zugangsproblem).
    await supabase
      .from('user_access')
      .insert({ user_id: data.session.user.id, trial_ends_at: trialEndsAt.toISOString().slice(0, 10) })
      .then(({ error: accessError }) => {
        if (accessError) console.error('Testphase konnte nicht angelegt werden:', accessError);
      });
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
