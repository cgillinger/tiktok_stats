/**
 * Databearbetning för TikTok-statistik
 *
 * Hjälpfunktioner för att bearbeta och aggregera statistikdata
 */

/**
 * Konverterar ett värde till ett numeriskt värde om möjligt
 */
export const parseNumericValue = (value) => {
  if (value === null || value === undefined || value === '') return 0;

  if (typeof value === 'string') {
    const cleanValue = value
      .replace(/\s+/g, '')
      .replace(/\.(?=\d{3})/g, '')
      .replace(/,/g, '.');

    const num = parseFloat(cleanValue);
    if (!isNaN(num)) return num;
  }

  if (typeof value === 'number' && !isNaN(value)) return value;

  return 0;
};

/**
 * Beräknar engagement rate för översiktsdata
 * (likes + comments + shares) / reach * 100
 */
export const calculateEngagementRate = (data) => {
  const interactions =
    parseNumericValue(data.likes) +
    parseNumericValue(data.comments) +
    parseNumericValue(data.shares);
  const divisor = parseNumericValue(data.reach);

  if (divisor === 0) return 0;
  return (interactions / divisor) * 100;
};

/**
 * Beräknar totala interaktioner för översiktsdata
 * likes + comments + shares
 */
export const calculateInteractions = (data) => {
  return (
    parseNumericValue(data.likes) +
    parseNumericValue(data.comments) +
    parseNumericValue(data.shares)
  );
};

/**
 * Sorterar data baserat på fält och riktning
 */
export const sortData = (data, field, direction = 'asc') => {
  if (!data || !Array.isArray(data) || !field) return data || [];

  return [...data].sort((a, b) => {
    const av = a[field];
    const bv = b[field];

    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;

    if (field === 'date') {
      try {
        const ad = new Date(av);
        const bd = new Date(bv);
        if (!isNaN(ad.getTime()) && !isNaN(bd.getTime())) {
          return direction === 'asc' ? ad - bd : bd - ad;
        }
      } catch (e) { /* fall through */ }
    }

    const an = parseNumericValue(av);
    const bn = parseNumericValue(bv);
    if (!isNaN(an) && !isNaN(bn)) {
      return direction === 'asc' ? an - bn : bn - an;
    }

    const as = String(av).toLowerCase();
    const bs = String(bv).toLowerCase();
    return direction === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
  });
};
