/**
 * Web Data Processor
 *
 * Hanterar bearbetning av TikTok CSV-data (daglig översiktsdata).
 * Kolumnmappning är hårdkodad från OVERVIEW_FIELDS + OVERVIEW_FIELDS_ENGLISH.
 */
import Papa from 'papaparse';
import {
  OVERVIEW_FIELDS,
  OVERVIEW_FIELDS_ENGLISH,
} from './constants';

// Build hardcoded column mapping (external CSV name -> internal field name)
// Supports both Swedish and English column names
const buildColumnMappings = () => {
  const mappings = {};

  // Swedish names
  Object.entries(OVERVIEW_FIELDS).forEach(([internal, external]) => {
    mappings[external] = internal;
  });

  // English names
  Object.entries(OVERVIEW_FIELDS_ENGLISH).forEach(([internal, external]) => {
    mappings[external] = internal;
  });

  return mappings;
};

const COLUMN_MAPPINGS = buildColumnMappings();

// ----------------------------------------
// Data bearbetning
// ----------------------------------------

const normalizeText = (text) => {
  if (text === null || text === undefined) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
};

const mapRow = (row) => {
  const result = {};

  for (const [externalName, value] of Object.entries(row)) {
    let internalName = null;
    const normalizedExternal = normalizeText(externalName);

    for (const [mappingKey, mappingValue] of Object.entries(COLUMN_MAPPINGS)) {
      if (normalizeText(mappingKey) === normalizedExternal) {
        internalName = mappingValue;
        break;
      }
    }

    if (!internalName) {
      internalName = externalName;
    }

    let processedValue = value;
    if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
      processedValue = parseFloat(value);
    }

    result[internalName] = processedValue;
  }

  return result;
};

const calculateOverviewFields = (row) => {
  const result = { ...row };

  const likes = parseFloat(row.likes || 0);
  const comments = parseFloat(row.comments || 0);
  const shares = parseFloat(row.shares || 0);
  result.interactions = likes + comments + shares;

  if (row.reach && row.reach > 0) {
    result.engagement_rate = parseFloat(((result.interactions / row.reach) * 100).toFixed(2));
  } else {
    result.engagement_rate = 0;
  }

  return result;
};

/**
 * Processar TikTok CSV-data (daglig översiktsdata)
 * @param {string} csvContent - CSV-innehåll
 * @returns {Promise<Object>} - Bearbetad data och metadata
 */
export const processTikTokData = (csvContent) => {
  return new Promise((resolve, reject) => {
    try {
      Papa.parse(csvContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            reject(new Error('Ingen data hittades i CSV-filen.'));
            return;
          }

          console.log('CSV-data analyserad:', {
            rows: results.data.length,
            columns: Object.keys(results.data[0]).length
          });

          // Limit rows for performance
          const maxRows = 5000;
          let dataToProcess = results.data;
          let isLimited = false;

          if (dataToProcess.length > maxRows) {
            console.warn(`Begränsar databearbetning till ${maxRows} rader`);
            dataToProcess = dataToProcess.slice(0, maxRows);
            isLimited = true;
          }

          setTimeout(() => {
            try {
              const batchSize = 500;
              let processedData = [];

              for (let i = 0; i < dataToProcess.length; i += batchSize) {
                const batch = dataToProcess.slice(i, i + batchSize);
                const mappedBatch = batch.map(row => mapRow(row));
                const processedBatch = mappedBatch.map(calculateOverviewFields);
                processedData = [...processedData, ...processedBatch];
              }

              // Find date range
              const dates = processedData
                .map(row => row.date)
                .filter(date => date);

              let dateRange = { startDate: null, endDate: null };
              if (dates.length > 0) {
                const sortedDates = [...dates].sort();
                dateRange = {
                  startDate: sortedDates[0],
                  endDate: sortedDates[sortedDates.length - 1]
                };
              }

              resolve({
                data: processedData,
                meta: {
                  rowCount: processedData.length,
                  totalRows: results.data.length,
                  isLimited,
                  processedAt: new Date(),
                  dateRange,
                  fields: results.meta.fields
                }
              });
            } catch (innerError) {
              console.error('Fel vid databearbetning:', innerError);
              reject(innerError);
            }
          }, 10);
        },
        error: (error) => {
          console.error('Fel vid CSV-parsning:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('Oväntat fel vid bearbetning:', error);
      reject(error);
    }
  });
};
