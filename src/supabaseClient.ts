import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Zeigt einen klaren Hinweis statt eines kryptischen Fehlers, falls die
  // .env.local (siehe .env.example) noch nicht angelegt wurde.
  throw new Error(
    'Supabase ist nicht konfiguriert: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY fehlen. ' +
      'Siehe .env.example.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const WINE_PHOTOS_BUCKET = 'wine-photos';
