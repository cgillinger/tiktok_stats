/**
 * Web Data Processor
 *
 * Läser månads-CSV: en fil per konto och månad, med sektionerna
 * MÅNADSSUMMERING och PER VIDEO. Videoraderna är appens kanoniska data —
 * alla aggregat räknas ur dem. Månadssummeringen sparas ändå, av två skäl:
 *
 *  1. Den är kvittot på att en CSV faktiskt är uppladdad för konto+månad,
 *     så en månad utan publicerade videor kan visas som "tom" i stället för
 *     att se ut som om filen saknas.
 *  2. Den används som kontrollsumma vid import.
 */
import Papa from 'papaparse';
import {
  VIDEO_FIELDS,
  MONTH_FIELDS,
  NUMERIC_FIELDS,
} from './constants.js';
import {
  CSV_FORMAT,
  detectCsvFormat,
  splitSections,
  extractHandleFromUrl,
  extractHandleFromFilename,
} from './csvFormat.js';

// ----------------------------------------
// Hjälpfunktioner
// ----------------------------------------

const normalizeText = (text) => {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/[​-‍﻿]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
};

// Bygger extern kolumnrubrik -> internt fältnamn
const buildMapping = (fields) => {
  const mapping = {};
  Object.entries(fields).forEach(([internal, external]) => {
    mapping[normalizeText(external)] = internal;
  });
  return mapping;
};

const VIDEO_MAPPING = buildMapping(VIDEO_FIELDS);
const MONTH_MAPPING = buildMapping(MONTH_FIELDS);

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;

  const cleaned = String(value).replace(/\s| /g, '').replace(/,/g, '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const calcEngagementRate = (interactions, views) => {
  if (!views || views <= 0) return 0;
  return parseFloat(((interactions / views) * 100).toFixed(2));
};

const mapRow = (row, mapping) => {
  const result = {};

  for (const [externalName, value] of Object.entries(row)) {
    const internalName = mapping[normalizeText(externalName)] || externalName;
    result[internalName] = NUMERIC_FIELDS.includes(internalName)
      ? toNumber(value)
      : (value === null || value === undefined ? '' : String(value).trim());
  }

  return result;
};

const parseSection = (csvText, mapping) => {
  if (!csvText) return [];

  const results = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  return (results.data || [])
    .map(row => mapRow(row, mapping))
    .filter(row => Object.values(row).some(v => v !== '' && v !== 0));
};

// ----------------------------------------
// Fel som går att visa för användaren
// ----------------------------------------

export class UnsupportedCsvError extends Error {
  constructor(detection) {
    super(detection.message);
    this.name = 'UnsupportedCsvError';
    this.format = detection.format;
    this.label = detection.label;
    this.isLegacy = detection.format === CSV_FORMAT.LEGACY_OVERVIEW
      || detection.format === CSV_FORMAT.LEGACY_VIDEO;
  }
}

// ----------------------------------------
// Huvudfunktion
// ----------------------------------------

/**
 * Processar en månads-CSV-fil.
 *
 * @param {string} csvContent - CSV-innehåll
 * @param {Object} [options]
 * @param {string} [options.filename] - Filnamn, används för kontonamn som reserv
 * @returns {Promise<Object>} - { videos, months, handle, warnings, meta }
 * @throws {UnsupportedCsvError} - vid gammalt eller okänt format
 */
export const processTikTokData = (csvContent, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const detection = detectCsvFormat(csvContent);

      if (!detection.isSupported) {
        reject(new UnsupportedCsvError(detection));
        return;
      }

      const { monthCsv, videoCsv } = splitSections(csvContent);

      const videos = parseSection(videoCsv, VIDEO_MAPPING).map(row => {
        const interactions = row.interactions || (row.likes + row.comments + row.shares);
        return {
          ...row,
          interactions,
          engagement_rate: calcEngagementRate(interactions, row.views),
        };
      });

      const monthRows = parseSection(monthCsv, MONTH_MAPPING);

      // Summera videoraderna per månad - både som kontrollsumma och för att
      // kunna fylla i månader som saknas i summeringssektionen.
      const videoTotalsByMonth = {};
      videos.forEach(video => {
        const month = video.month || '';
        if (!videoTotalsByMonth[month]) {
          videoTotalsByMonth[month] = {
            video_count: 0, views: 0, likes: 0, comments: 0, shares: 0, interactions: 0,
          };
        }
        const totals = videoTotalsByMonth[month];
        totals.video_count += 1;
        totals.views += video.views;
        totals.likes += video.likes;
        totals.comments += video.comments;
        totals.shares += video.shares;
        totals.interactions += video.interactions;
      });

      const warnings = [];
      const months = [];
      const seenMonths = new Set();

      monthRows.forEach(row => {
        if (!row.month) return;
        seenMonths.add(row.month);

        const fromVideos = videoTotalsByMonth[row.month];

        if (fromVideos) {
          // Kontrollräkna summeringen mot videoraderna
          ['video_count', 'views', 'likes', 'comments', 'shares', 'interactions'].forEach(field => {
            if (row[field] !== fromVideos[field]) {
              warnings.push(
                `${row.month}: ${MONTH_FIELDS[field]} i månadssummeringen (${row[field]}) ` +
                `stämmer inte med summan av videoraderna (${fromVideos[field]}).`
              );
            }
          });
        }

        months.push({
          ...row,
          video_count: row.video_count,
          engagement_rate: calcEngagementRate(row.interactions, row.views),
          isEmpty: row.video_count === 0,
        });
      });

      // Månader som bara finns bland videoraderna (ingen summeringsrad)
      Object.entries(videoTotalsByMonth).forEach(([month, totals]) => {
        if (!month || seenMonths.has(month)) return;
        months.push({
          month,
          ...totals,
          engagement_rate: calcEngagementRate(totals.interactions, totals.views),
          isEmpty: false,
        });
      });

      months.sort((a, b) => String(a.month).localeCompare(String(b.month)));

      const handle =
        extractHandleFromUrl(videos.find(v => v.url)?.url) ||
        extractHandleFromFilename(options.filename) ||
        null;

      if (months.length === 0 && videos.length === 0) {
        reject(new Error('Filen innehåller varken månadssummering eller videorader.'));
        return;
      }

      resolve({
        format: detection.format,
        videos,
        months,
        handle,
        warnings,
        meta: {
          videoCount: videos.length,
          monthCount: months.length,
          months: months.map(m => m.month),
          isEmptyImport: videos.length === 0,
          processedAt: new Date().toISOString(),
          filename: options.filename || null,
        },
      });
    } catch (error) {
      console.error('Oväntat fel vid bearbetning:', error);
      reject(error);
    }
  });
};
