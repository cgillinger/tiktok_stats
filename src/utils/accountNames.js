/**
 * Normalisering av kontonamn
 *
 * CSV-filerna innehåller inget visningsnamn - bara handlet, som går att läsa
 * ur URL-kolumnen (@p3dingata) eller filnamnet. Ett läsbart namn måste därför
 * konstrueras, i två lager:
 *
 *  1. En heuristik som klarar de regelbundna fallen: P3 som prefix eller
 *     suffix, avgränsare och versalisering.
 *  2. En undantagstabell för sammansatta stammar som ingen heuristik kan
 *     dela korrekt ("dingata" -> "Din Gata").
 *
 * Resultatet är ett förslag. Användaren kan alltid skriva över det i
 * uppladdaren, och namnet som sparas är det som står i fältet.
 */

/**
 * Stammar som inte går att dela automatiskt. Nyckeln är stammen efter att
 * P3-prefix/-suffix plockats bort, i gemener utan avgränsare.
 */
export const STEM_OVERRIDES = {
  'dingata': 'Din Gata',
  'sverigesradio': 'Sveriges Radio',
  'nyhetsklubben': 'Nyhetsklubben',
  'radiosporten': 'Radiosporten',
  'creepypodden': 'Creepypodden',
  'morgonpasset': 'Morgonpasset',
  'eftermiddag': 'Eftermiddag',
};

/**
 * Hela handles som ska få ett specifikt namn, oavsett heuristik.
 * Används när ens de delade orden inte ger rätt resultat.
 */
export const HANDLE_OVERRIDES = {};

/**
 * Ord som ska versaliseras på ett bestämt sätt i stället för med enkel
 * begynnelseversal.
 */
export const WORD_OVERRIDES = {
  'sr': 'SR',
  'p1': 'P1',
  'p2': 'P2',
  'p3': 'P3',
  'p4': 'P4',
  'tv': 'TV',
  'i': 'i',
  'och': 'och',
};

const capitalize = (word) => {
  if (!word) return word;
  const known = WORD_OVERRIDES[word.toLowerCase()];
  if (known) return known;
  return word.charAt(0).toUpperCase() + word.slice(1);
};

/**
 * Delar upp en stam i ord och versaliserar dem.
 * Slår upp hela stammen i undantagstabellen först.
 */
const formatStem = (stem) => {
  if (!stem) return '';

  const key = stem.toLowerCase().replace(/[^a-z0-9åäö]/g, '');
  if (STEM_OVERRIDES[key]) return STEM_OVERRIDES[key];

  return stem
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map(capitalize)
    .join(' ');
};

/**
 * Gör ett läsbart kontonamn av ett TikTok-handle.
 *
 *   p3nyheter       -> P3 Nyheter
 *   p3dingata       -> P3 Din Gata
 *   creepypoddenip3 -> Creepypodden i P3
 *   radiosporten    -> Radiosporten
 *
 * @param {string} handle - Handle utan @, t.ex. "p3dingata"
 * @returns {string} - Förslag på visningsnamn, eller handlet oförändrat
 */
export function normalizeAccountName(handle) {
  if (!handle) return '';

  const raw = String(handle).trim().replace(/^@/, '');
  if (!raw) return '';

  const lower = raw.toLowerCase();

  if (HANDLE_OVERRIDES[lower]) return HANDLE_OVERRIDES[lower];

  // "<stam>ip3" -> "<Stam> i P3"
  const suffixMatch = lower.match(/^(.+?)ip3$/);
  if (suffixMatch) {
    const stem = formatStem(suffixMatch[1]);
    if (stem) return `${stem} i P3`;
  }

  // "p3<stam>" -> "P3 <Stam>"
  const prefixMatch = lower.match(/^p3[._\-]?(.+)$/);
  if (prefixMatch) {
    const stem = formatStem(prefixMatch[1]);
    if (stem) return `P3 ${stem}`;
  }

  return formatStem(raw) || raw;
}
