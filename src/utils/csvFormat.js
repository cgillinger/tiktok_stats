/**
 * Formatdetektering och sektionsuppdelning för TikTok-CSV
 *
 * Det nuvarande formatet (från tiktok-scrape) har två sektioner i samma fil:
 *
 *   MÅNADSSUMMERING
 *   Månad,Videor,Interaktioner,Gilla,Kommentarer,Delningar,Visningar
 *   2026-08,2,17983,16849,83,1051,196100
 *
 *   PER VIDEO
 *   Filnamn,VideoID,Titel,URL,Månad,Datum,Visningar,...
 *   "7680...mp4","7680...","Creepypastan om...","https://...",2026-08,...
 *
 * De gamla TikTok-exporterna (Översikt / Video) känns igen enbart för att
 * kunna säga till användaren att de inte fungerar längre.
 */
import { CSV_SECTIONS, LEGACY_FORMATS, LEGACY_FORMAT_MESSAGE } from './constants.js';

export const CSV_FORMAT = {
  CURRENT: 'current',
  LEGACY_OVERVIEW: 'legacy_overview',
  LEGACY_VIDEO: 'legacy_video',
  UNKNOWN: 'unknown',
};

export const stripBom = (text) => String(text || '').replace(/^﻿/, '');

const normalizeLine = (line) =>
  stripBom(line)
    .replace(/[​-‍﻿]/g, '')
    .trim()
    .toLowerCase();

/**
 * Delar upp filen i dess två sektioner.
 *
 * Raderna används bara för att hitta sektionsmarkörerna; varje sektionsblock
 * fogas ihop igen och lämnas till PapaParse, så citerade fält som innehåller
 * radbrytningar hanteras korrekt.
 *
 * @param {string} content - Hela filens innehåll
 * @returns {{monthCsv: string|null, videoCsv: string|null}}
 */
export function splitSections(content) {
  const lines = stripBom(String(content || '')).split(/\r\n|\n|\r/);

  let monthStart = -1;
  let videoStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = normalizeLine(lines[i]);

    // Månadsmarkören står först i filen - leta bara i inledningen
    if (monthStart === -1 && i < 5 && line === CSV_SECTIONS.MONTH.toLowerCase()) {
      monthStart = i + 1;
      continue;
    }

    if (videoStart === -1 && line === CSV_SECTIONS.VIDEO.toLowerCase()) {
      videoStart = i + 1;
      break;
    }
  }

  const block = (from, to) => {
    if (from === -1) return null;
    const end = to === -1 ? lines.length : to - 1;
    const slice = lines.slice(from, end).filter((l, idx, arr) => {
      // Trimma bort tomma rader i början och slutet, behåll dem i mitten
      if (l.trim() !== '') return true;
      const before = arr.slice(0, idx).some(x => x.trim() !== '');
      const after = arr.slice(idx + 1).some(x => x.trim() !== '');
      return before && after;
    });
    const text = slice.join('\n').trim();
    return text === '' ? null : text;
  };

  return {
    monthCsv: block(monthStart, videoStart),
    videoCsv: block(videoStart, -1),
  };
}

const firstHeaderLine = (content) => {
  const lines = stripBom(String(content || '')).split(/\r\n|\n|\r/);
  for (const line of lines) {
    if (line.trim() !== '') return normalizeLine(line);
  }
  return '';
};

const matchesLegacy = (header) => {
  for (const [key, spec] of Object.entries(LEGACY_FORMATS)) {
    for (const signature of spec.signatures) {
      if (signature.every(col => header.includes(col))) {
        return { format: key, label: spec.label };
      }
    }
  }
  return null;
};

/**
 * Avgör vilket format en CSV-fil har.
 *
 * @param {string} content - Filens innehåll (hela eller inledningen)
 * @returns {{format: string, isSupported: boolean, label: string, message: string|null}}
 */
export function detectCsvFormat(content) {
  const { monthCsv, videoCsv } = splitSections(content);

  if (monthCsv || videoCsv) {
    return {
      format: CSV_FORMAT.CURRENT,
      isSupported: true,
      label: 'TikTok-statistik per månad',
      message: null,
    };
  }

  const legacy = matchesLegacy(firstHeaderLine(content));
  if (legacy) {
    return {
      format: legacy.format,
      isSupported: false,
      label: legacy.label,
      message: LEGACY_FORMAT_MESSAGE,
    };
  }

  return {
    format: CSV_FORMAT.UNKNOWN,
    isSupported: false,
    label: 'Okänt format',
    message:
      'Filen känns inte igen som TikTok-statistik. Förväntat innehåll är en fil med ' +
      `sektionerna ${CSV_SECTIONS.MONTH} och ${CSV_SECTIONS.VIDEO}.`,
  };
}

/**
 * Plockar ut kontots handle (@-namn) ur en video-URL.
 * @param {string} url - t.ex. https://www.tiktok.com/@p3nyheter/video/7677...
 * @returns {string|null} - t.ex. "p3nyheter"
 */
export function extractHandleFromUrl(url) {
  if (!url) return null;
  const match = String(url).match(/@([A-Za-z0-9._-]+)/);
  return match ? match[1] : null;
}

/**
 * Faller tillbaka på filnamnet när URL saknas.
 * "p3nyheter_full_tagen-2026-09-17.csv" -> "p3nyheter"
 * @param {string} filename
 * @returns {string|null}
 */
export function extractHandleFromFilename(filename) {
  if (!filename) return null;
  const base = String(filename).replace(/\.csv$/i, '');
  const match = base.match(/^([A-Za-z0-9._-]+?)(?:_full|_tagen|-\d{4}-\d{2})/);
  return match ? match[1] : base || null;
}
