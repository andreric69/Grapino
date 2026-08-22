import type { VercelRequest, VercelResponse } from './_types.js';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

// Reine Sicherheitsnetz-Grenze gegen einen Bug/eine Endlosschleife im
// Frontend - nicht wegen der Kosten (siehe label-recognition-log-2026-08-22.sql).
const DAILY_LIMIT = 100;

const LABEL_FIELDS = [
  'name',
  'producer',
  'vintage',
  'grapeVariety',
  'region',
  'subregion',
  'country',
  'wineType',
] as const;

const LabelRecognitionSchema = z.object({
  name: z.string().nullable(),
  producer: z.string().nullable(),
  vintage: z.number().int().min(1900).max(2100).nullable(),
  grapeVariety: z.string().nullable(),
  region: z.string().nullable(),
  subregion: z.string().nullable(),
  country: z.string().nullable(),
  wineType: z.enum(['rot', 'weiss', 'rose', 'dessert', 'schaumwein']).nullable(),
  // Felder, bei denen sich die Erkennung selbst unsicher ist (z. B. verschwommen,
  // teilweise verdeckt) - werden dem Nutzer im Formular als "bitte pruefen" markiert.
  uncertainFields: z.array(z.enum(LABEL_FIELDS)),
  fullText: z.string(),
  chips: z.array(z.string()),
});

const SYSTEM_PROMPT = `Du liest ein fotografiertes Weinetikett und gibst AUSSCHLIESSLICH das wieder, was tatsaechlich auf dem Etikett gedruckt steht.

Regeln:
- Nichts aus eigenem Wissen ergaenzen oder raten - insbesondere KEIN Trinkfenster, KEINE Kritiker-Punkte, KEIN Passt-zu, keine Vermutungen ueber Felder, die auf dem Etikett nicht lesbar sind.
- Ist ein Feld nicht eindeutig auf dem Etikett erkennbar, setze es auf null statt zu raten.
- "name" ist der Name des Weins selbst (nicht der Produzent, ausser beide sind identisch).
- "vintage" ist der Jahrgang (vierstellige Zahl), nur falls auf dem Etikett gedruckt.
- "region"/"subregion"/"country": geografische Herkunft, nur falls auf dem Etikett erkennbar.
- "wineType": rot/weiss/rose/dessert/schaumwein, nur wenn aus dem Etikett klar hervorgeht (Farbe im Foto, Bezeichnung wie "Rosso"/"Blanc de Blancs", bekannte Appellation) - sonst null.
- "uncertainFields": Namen der obigen Felder, bei denen du unsicher bist.
- "fullText": eine moeglichst vollstaendige Abschrift des gesamten lesbaren Texts auf dem Etikett.
- "chips": weitere kurze Textfragmente vom Etikett, die noch keinem Feld zugeordnet sind (z. B. Alkoholgehalt, Klassifikation, Lagename) - jeweils nur wenige Woerter.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Nicht angemeldet.' });
    return;
  }
  const accessToken = authHeader.slice('Bearer '.length);

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!supabaseUrl || !anonKey || !anthropicKey) {
    res.status(500).json({ error: 'Server-Konfiguration fehlt.' });
    return;
  }

  // Client mit dem Access-Token DES AUFRUFERS (nicht Service-Role) - RLS
  // sorgt dafuer, dass der Rate-Limit-Zaehler unten automatisch nur die
  // eigenen Eintraege dieses Nutzers sieht/schreibt. Kein Service-Role-Key
  // noetig - die Weinapp braucht dadurch weiterhin keinen (siehe README).
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Ungueltige Sitzung.' });
    return;
  }

  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from('label_recognition_log')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', cutoff);
    if (countError) throw countError;
    if ((count ?? 0) >= DAILY_LIMIT) {
      res.status(429).json({ error: 'Tageslimit fuer die Etikett-Erkennung erreicht.' });
      return;
    }

    const { image } = (req.body ?? {}) as { image?: string };
    if (!image) {
      res.status(400).json({ error: 'image erforderlich.' });
      return;
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const response = await anthropic.beta.messages.parse({
      model: 'claude-sonnet-5',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: 'Lies dieses Weinetikett.' },
          ],
        },
      ],
      output_format: betaZodOutputFormat(LabelRecognitionSchema),
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      res.status(502).json({ error: 'Erkennung fehlgeschlagen.' });
      return;
    }

    // Nebeneffekt, kein kritischer Schritt - schlaegt das Loggen fehl, wird
    // trotzdem das Ergebnis zurueckgegeben (nur das Tageslimit ist dann
    // etwas ungenauer, kein Grund den Nutzer warten zu lassen).
    const { error: logError } = await supabase.from('label_recognition_log').insert({});
    if (logError) console.error('Rate-Limit-Log fehlgeschlagen:', logError);

    res.status(200).json(parsed);
  } catch (e) {
    console.error('Etikett-Erkennung fehlgeschlagen:', e);
    res.status(502).json({ error: e instanceof Error ? e.message : 'Unbekannter Fehler.' });
  }
}
