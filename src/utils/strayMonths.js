/**
 * Hittar en ofullständig månad i en uppladdningsomgång.
 *
 * En export som körs i början av en månad kan få med de första videorna från
 * den nya månaden. Laddas den upp ser det ut som att alla andra konton saknar
 * CSV för den månaden, fast ingen månad egentligen fattas.
 *
 * Den senaste månaden i omgången räknas som ofullständig om:
 *  - färre filer innehåller den än månaden före, och
 *  - varje fil som innehåller den också innehåller andra månader.
 *
 * Det andra villkoret gör att en vanlig omgång med filer från flera månader
 * (en fil per konto och månad) aldrig flaggas, även om något konto fattas.
 *
 * @param {Array<{months: string[]}>} entries - Analyserade filer
 * @returns {{month: string, fileCount: number, totalFiles: number,
 *            previousMonth: string, previousCount: number} | null}
 */
export function findStrayMonth(entries) {
  const files = entries.filter(e => Array.isArray(e.months) && e.months.length > 0);
  if (files.length < 2) return null;

  const counts = new Map();
  files.forEach(e => {
    new Set(e.months).forEach(m => counts.set(m, (counts.get(m) || 0) + 1));
  });

  const ordered = Array.from(counts.keys()).sort();
  if (ordered.length < 2) return null;

  const month = ordered[ordered.length - 1];
  const previousMonth = ordered[ordered.length - 2];
  const fileCount = counts.get(month);
  const previousCount = counts.get(previousMonth);

  if (fileCount >= previousCount) return null;

  const onlyTrailing = files
    .filter(e => e.months.includes(month))
    .every(e => e.months.some(m => m !== month));
  if (!onlyTrailing) return null;

  return { month, fileCount, totalFiles: files.length, previousMonth, previousCount };
}

/**
 * Tar bort en månad ur en parsad fil, både månadsrader och videor.
 */
export function withoutMonth(parsed, month) {
  if (!parsed || !month) return parsed;
  return {
    ...parsed,
    videos: parsed.videos.filter(v => v.month !== month),
    months: parsed.months.filter(m => m.month !== month),
  };
}
