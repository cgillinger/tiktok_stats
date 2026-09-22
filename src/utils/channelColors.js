/**
 * Kanalfärger och kontoikoner
 *
 * Samma palett och samma logik som Meta Analytics (metaDB) använder för sina
 * profilikoner, så att de två apparna går att läsa på samma sätt: en färgad
 * ruta med kanalens initialer framför varje konto.
 *
 * Kanalen härleds ur kontots namn eller handle. Konton som inte skvallrar om
 * sin kanal i namnet får en post i ACCOUNT_CHANNEL_OVERRIDES.
 */

export const CHANNEL_COLORS = {
  P1: '#0066cc',
  P2: '#ff6600',
  P3: '#00cc66',
  P4: '#cc33cc',
  EKOT: '#005eb8',
  RADIOSPORTEN: '#1c5c35',
  SR: '#000000',
  default: '#000000',
};

/**
 * Konton vars kanaltillhörighet inte framgår av namnet.
 * Nyckeln matchas mot både handle och kontonamn, i gemener.
 */
export const ACCOUNT_CHANNEL_OVERRIDES = {
  'nyhetsklubben': 'P4',
};

/**
 * Kanalordningen spelar roll: radiosporten och ekot testas före P1-P4, och
 * "sveriges radio" sist, eftersom t.ex. "P3 Sveriges Radio" ska bli P3.
 */
const CHANNEL_MATCHERS = [
  { channel: 'EKOT', label: 'E', test: (s) => s.includes('ekot') || s.includes('radio sweden') },
  { channel: 'RADIOSPORTEN', label: 'RS', test: (s) => s.includes('radiosporten') || s.includes('radio sporten') },
  { channel: 'P1', label: 'P1', test: (s) => s.includes('p1') },
  { channel: 'P2', label: 'P2', test: (s) => s.includes('p2') },
  { channel: 'P3', label: 'P3', test: (s) => s.includes('p3') },
  { channel: 'P4', label: 'P4', test: (s) => s.includes('p4') },
  { channel: 'SR', label: 'SR', test: (s) => s.includes('sveriges radio') || s.includes('sverigesradio') },
];

const CHANNEL_LABELS = {
  EKOT: 'E',
  RADIOSPORTEN: 'RS',
  P1: 'P1',
  P2: 'P2',
  P3: 'P3',
  P4: 'P4',
  SR: 'SR',
};

/**
 * Tar fram etikett och färg för ett konto.
 *
 * @param {Object} account - { name, handle }
 * @returns {{label: string, color: string, channel: string|null}}
 */
export function resolveChannel({ name, handle } = {}) {
  const candidates = [handle, name].filter(Boolean).map(v => String(v).toLowerCase());

  // Uttryckliga undantag först
  for (const candidate of candidates) {
    const override = ACCOUNT_CHANNEL_OVERRIDES[candidate];
    if (override) {
      return {
        label: CHANNEL_LABELS[override] || override,
        color: CHANNEL_COLORS[override] || CHANNEL_COLORS.default,
        channel: override,
      };
    }
  }

  for (const candidate of candidates) {
    for (const matcher of CHANNEL_MATCHERS) {
      if (matcher.test(candidate)) {
        return {
          label: matcher.label,
          color: CHANNEL_COLORS[matcher.channel],
          channel: matcher.channel,
        };
      }
    }
  }

  // Ingen kanal känns igen - använd första bokstaven i namnet
  const fallbackSource = name || handle || '';
  return {
    label: fallbackSource.charAt(0).toUpperCase() || '?',
    color: CHANNEL_COLORS.default,
    channel: null,
  };
}
