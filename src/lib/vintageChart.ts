/**
 * Jahrgangs-Einschätzung fuer die grossen, gut dokumentierten Weinregionen:
 * war ein bestimmter Jahrgang in dieser Region allgemein eher stark oder
 * schwach? Das ist bekanntes, jaehrlich von Kritikern/Handelsverbaenden
 * veroeffentlichtes Fachwissen (Jahrgangstabellen), keine proprietaere oder
 * erfundene Bewertung einzelner Flaschen.
 *
 * Bewusst KEINE erfundenen Daten - nur echte, allgemein bekannte
 * Jahrgangs-Reputation. Luecken (fehlende Region oder fehlender Jahrgang)
 * sind normal und beabsichtigt: lieber "keine Angabe" als eine geratene
 * Einschaetzung. Rein clientseitig, keine Fetches, keine Kosten.
 */

export type VintageRating = 'aussergewoehnlich' | 'sehr_gut' | 'gut' | 'durchschnittlich' | 'schwach';

export interface VintageInfo {
  rating: VintageRating;
  /** Kurzer, sachlicher Hinweis - z. B. Besonderheiten des Jahrgangs. */
  note?: string;
}

type VintageTable = Record<number, VintageInfo>;

const COMBINING_MARKS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g');

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(COMBINING_MARKS_REGEX, '')
    .toLowerCase()
    .trim();
}

/**
 * Jahrgangstabellen der grossen, allgemein bekannten Sammler-Regionen.
 * Abdeckung: ca. 2006-2024, mit bewussten Luecken bei unsicheren Jahren.
 * Schluessel = normalisierter Name der jeweiligen Top-Level-Region.
 */
const VINTAGE_CHARTS: Record<string, VintageTable> = {
  bordeaux: {
    2006: { rating: 'durchschnittlich', note: 'Uneinheitlich, September-Regen bei manchen Lagen' },
    2007: { rating: 'schwach', note: 'Kuehl und regnerisch, schwierige Lese' },
    2008: { rating: 'gut', note: 'Spaeter, aber sauberer Jahrgang mit guter Struktur' },
    2009: { rating: 'aussergewoehnlich', note: 'Warm und ausgereift, sehr konzentrierte Weine' },
    2010: { rating: 'aussergewoehnlich', note: 'Klassisch, hohe Saeure, sehr gutes Lagerpotenzial' },
    2011: { rating: 'durchschnittlich' },
    2012: { rating: 'gut' },
    2013: { rating: 'schwach', note: 'Nass und kuehl, eine der schwierigsten Ernten der 2010er' },
    2014: { rating: 'durchschnittlich', note: 'Spaetreifer, ordentlicher Jahrgang' },
    2015: { rating: 'sehr_gut' },
    2016: { rating: 'sehr_gut', note: 'Trockener, warmer Spaetsommer nach feuchtem Fruehjahr' },
    2017: { rating: 'durchschnittlich', note: 'Fruehjahrsfrost in Teilen, dennoch solide Qualitaet' },
    2018: { rating: 'sehr_gut', note: 'Warm und konzentriert, teils sehr hohe Alkoholwerte' },
    2019: { rating: 'sehr_gut' },
    2020: { rating: 'sehr_gut' },
    2021: { rating: 'durchschnittlich', note: 'Kuehl und feucht, geringere Ertraege' },
    2022: { rating: 'aussergewoehnlich', note: 'Sehr warm und trocken, kraftvolle, dichte Weine' },
    2023: { rating: 'gut' },
    2024: { rating: 'schwach', note: 'Sehr nass mit hohem Mehltaudruck, herausfordernde Ernte' },
  },
  burgund: {
    2009: { rating: 'sehr_gut' },
    2010: { rating: 'sehr_gut' },
    2011: { rating: 'durchschnittlich' },
    2012: { rating: 'gut', note: 'Geringe Ertraege durch Hagel, aber gute Qualitaet' },
    2013: { rating: 'schwach', note: 'Hagel und Regen, schwierig' },
    2014: { rating: 'gut' },
    2015: { rating: 'aussergewoehnlich', note: 'Warm und reif, herausragend bei Rot wie Weiss' },
    2016: { rating: 'gut', note: 'Starker Fruehjahrsfrost reduzierte die Menge deutlich' },
    2017: { rating: 'sehr_gut' },
    2018: { rating: 'sehr_gut', note: 'Warm und grosszuegig, hohe Ertraege' },
    2019: { rating: 'aussergewoehnlich', note: 'Konzentriert durch Trockenheit, niedrige Ertraege' },
    2020: { rating: 'sehr_gut', note: 'Fruehe, warme Ernte' },
    2021: { rating: 'schwach', note: 'Frost und Hagel dezimierten die Ernte stark' },
    2022: { rating: 'aussergewoehnlich', note: 'Grosse Menge bei sehr guter Reife' },
    2023: { rating: 'sehr_gut', note: 'Grosse Erntemenge bei guter Qualitaet' },
  },
  champagne: {
    2008: { rating: 'aussergewoehnlich', note: 'Gilt als einer der besten Champagner-Jahrgaenge der letzten Jahrzehnte' },
    2012: { rating: 'sehr_gut' },
    2013: { rating: 'gut' },
    2015: { rating: 'sehr_gut' },
    2018: { rating: 'sehr_gut', note: 'Warm und reif' },
    2019: { rating: 'sehr_gut' },
    2020: { rating: 'sehr_gut' },
    2022: { rating: 'sehr_gut', note: 'Grosse Erntemenge bei hoher Qualitaet' },
  },
  rhone: {
    2009: { rating: 'aussergewoehnlich' },
    2010: { rating: 'aussergewoehnlich' },
    2011: { rating: 'durchschnittlich' },
    2012: { rating: 'gut' },
    2013: { rating: 'schwach' },
    2014: { rating: 'durchschnittlich' },
    2015: { rating: 'sehr_gut' },
    2016: { rating: 'sehr_gut' },
    2017: { rating: 'gut', note: 'Heiss und trocken, im Sueden von Duerre gepraegt' },
    2018: { rating: 'sehr_gut' },
    2019: { rating: 'sehr_gut' },
    2020: { rating: 'gut' },
    2021: { rating: 'durchschnittlich', note: 'Kuehler und spaeter Jahrgang' },
    2022: { rating: 'sehr_gut', note: 'Heiss und konzentriert' },
  },
  piemont: {
    2006: { rating: 'sehr_gut' },
    2007: { rating: 'gut' },
    2008: { rating: 'gut' },
    2009: { rating: 'gut' },
    2010: { rating: 'aussergewoehnlich' },
    2011: { rating: 'durchschnittlich' },
    2012: { rating: 'gut' },
    2013: { rating: 'aussergewoehnlich', note: 'Klassischer, langlebiger Jahrgang mit hoher Saeure' },
    2014: { rating: 'schwach', note: 'Sehr regnerisch, schwierige Ernte' },
    2015: { rating: 'sehr_gut' },
    2016: { rating: 'aussergewoehnlich', note: 'Gilt als einer der besten modernen Barolo/Barbaresco-Jahrgaenge' },
    2017: { rating: 'durchschnittlich', note: 'Heiss und trocken, kompaktere Weine' },
    2018: { rating: 'durchschnittlich', note: 'Regnerisch, leichterer Jahrgang' },
    2019: { rating: 'sehr_gut' },
    2020: { rating: 'sehr_gut' },
    2021: { rating: 'sehr_gut' },
  },
  toskana: {
    2006: { rating: 'sehr_gut' },
    2007: { rating: 'sehr_gut' },
    2008: { rating: 'durchschnittlich' },
    2009: { rating: 'durchschnittlich' },
    2010: { rating: 'sehr_gut' },
    2011: { rating: 'gut' },
    2012: { rating: 'gut' },
    2013: { rating: 'gut' },
    2014: { rating: 'schwach', note: 'Sehr regnerisches Jahr, viele Betriebe deklassierten' },
    2015: { rating: 'aussergewoehnlich' },
    2016: { rating: 'aussergewoehnlich' },
    2017: { rating: 'gut', note: 'Heiss und trocken, geringere Ertraege' },
    2018: { rating: 'gut' },
    2019: { rating: 'sehr_gut' },
    2020: { rating: 'sehr_gut' },
    2021: { rating: 'sehr_gut' },
  },
  'napa valley': {
    2007: { rating: 'aussergewoehnlich' },
    2010: { rating: 'gut', note: 'Kuehlerer Jahrgang' },
    2011: { rating: 'schwach', note: 'Kuehl und regnerisch zur Ernte' },
    2012: { rating: 'sehr_gut' },
    2013: { rating: 'aussergewoehnlich' },
    2014: { rating: 'sehr_gut' },
    2015: { rating: 'sehr_gut', note: 'Geringe Ertraege, sehr konzentriert' },
    2016: { rating: 'sehr_gut' },
    2018: { rating: 'aussergewoehnlich' },
    2019: { rating: 'sehr_gut' },
    2020: { rating: 'schwach', note: 'Waldbrand-Rauch beeintraechtigte viele Weine deutlich' },
    2021: { rating: 'gut' },
  },
  rioja: {
    2010: { rating: 'aussergewoehnlich', note: 'Gilt allgemein als aussergewoehnlicher Jahrgang' },
    2011: { rating: 'aussergewoehnlich' },
    2016: { rating: 'aussergewoehnlich' },
    2017: { rating: 'sehr_gut' },
    2019: { rating: 'sehr_gut' },
    2020: { rating: 'sehr_gut' },
    2022: { rating: 'sehr_gut' },
  },
  mosel: {
    2015: { rating: 'sehr_gut' },
    2016: { rating: 'gut' },
    2017: { rating: 'sehr_gut' },
    2018: { rating: 'sehr_gut', note: 'Warm und ausgereift' },
    2019: { rating: 'sehr_gut' },
    2020: { rating: 'gut' },
    2021: { rating: 'durchschnittlich', note: 'Kuehl mit hoher Saeure, mehr Regen als sonst' },
    2022: { rating: 'sehr_gut' },
    2023: { rating: 'gut' },
  },
  'barossa valley': {
    2010: { rating: 'sehr_gut' },
    2012: { rating: 'sehr_gut' },
    2014: { rating: 'sehr_gut' },
    2016: { rating: 'aussergewoehnlich' },
    2017: { rating: 'gut' },
    2018: { rating: 'sehr_gut' },
    2019: { rating: 'gut', note: 'Trockenheit reduzierte die Ertraege' },
    2020: { rating: 'schwach', note: 'Buschbrand-Rauch beeintraechtigte Teile der Ernte' },
    2021: { rating: 'sehr_gut' },
  },
};

/**
 * Bekannte Appellationen/Gemeinden/Untergebiete, die auf eine der oben
 * gefuehrten Top-Level-Regionen abgebildet werden (z. B. "Margaux" ->
 * "Bordeaux"). Bewusst nicht erschoepfend - nur die gaengigsten Namen.
 */
const REGION_ALIASES: Record<string, string> = {
  // Bordeaux
  margaux: 'bordeaux',
  pauillac: 'bordeaux',
  'saint-julien': 'bordeaux',
  'saint julien': 'bordeaux',
  'saint-estephe': 'bordeaux',
  'saint estephe': 'bordeaux',
  'saint-emilion': 'bordeaux',
  'saint emilion': 'bordeaux',
  pomerol: 'bordeaux',
  sauternes: 'bordeaux',
  graves: 'bordeaux',
  medoc: 'bordeaux',
  'haut-medoc': 'bordeaux',
  'haut medoc': 'bordeaux',
  // Burgund
  chablis: 'burgund',
  burgundy: 'burgund',
  bourgogne: 'burgund',
  'cote de nuits': 'burgund',
  'cote de beaune': 'burgund',
  'cote chalonnaise': 'burgund',
  maconnais: 'burgund',
  'gevrey-chambertin': 'burgund',
  'gevrey chambertin': 'burgund',
  'vosne-romanee': 'burgund',
  'vosne romanee': 'burgund',
  meursault: 'burgund',
  'puligny-montrachet': 'burgund',
  'puligny montrachet': 'burgund',
  pommard: 'burgund',
  // Rhone
  'rhone valley': 'rhone',
  'vallee du rhone': 'rhone',
  'chateauneuf-du-pape': 'rhone',
  'chateauneuf du pape': 'rhone',
  'cote-rotie': 'rhone',
  'cote rotie': 'rhone',
  hermitage: 'rhone',
  'crozes-hermitage': 'rhone',
  'crozes hermitage': 'rhone',
  gigondas: 'rhone',
  vacqueyras: 'rhone',
  // Piemont
  piedmont: 'piemont',
  barolo: 'piemont',
  barbaresco: 'piemont',
  langhe: 'piemont',
  // Toskana
  tuscany: 'toskana',
  chianti: 'toskana',
  'chianti classico': 'toskana',
  'brunello di montalcino': 'toskana',
  montalcino: 'toskana',
  bolgheri: 'toskana',
  'vino nobile di montepulciano': 'toskana',
  // Napa Valley
  napa: 'napa valley',
  oakville: 'napa valley',
  rutherford: 'napa valley',
  'st. helena': 'napa valley',
  'st helena': 'napa valley',
  'stags leap': 'napa valley',
  // Rioja
  'rioja alta': 'rioja',
  'rioja alavesa': 'rioja',
  'rioja oriental': 'rioja',
  // Mosel
  moselle: 'mosel',
  bernkastel: 'mosel',
  piesport: 'mosel',
  wehlen: 'mosel',
  urzig: 'mosel',
  // Barossa
  barossa: 'barossa valley',
};

/**
 * Sucht die Jahrgangs-Einschaetzung fuer eine Region + einen Jahrgang.
 * Matcht auch bekannte Subregionen/Gemeinden auf ihre uebergeordnete
 * Region (z. B. "Margaux" -> "Bordeaux"). Gibt null zurueck, sobald die
 * Region nicht abgedeckt ist oder fuer diesen Jahrgang keine Einschaetzung
 * vorliegt - das ist der haeufige, erwartete Fall fuer die meisten Weine.
 */
export function lookupVintageInfo(region: string, vintage: number): VintageInfo | null {
  const key = normalize(region);
  if (!key || !vintage) return null;

  const tableKey = VINTAGE_CHARTS[key] ? key : REGION_ALIASES[key];
  if (!tableKey) return null;

  const table = VINTAGE_CHARTS[tableKey];
  if (!table) return null;

  return table[vintage] ?? null;
}

export const VINTAGE_RATING_LABELS: Record<VintageRating, string> = {
  aussergewoehnlich: 'Aussergewöhnlicher Jahrgang',
  sehr_gut: 'Sehr guter Jahrgang',
  gut: 'Guter Jahrgang',
  durchschnittlich: 'Durchschnittlicher Jahrgang',
  schwach: 'Schwacher Jahrgang',
};
