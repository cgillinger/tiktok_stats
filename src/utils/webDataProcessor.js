/**
 * Web Data Processor
 * 
 * Hanterar bearbetning av TikTok CSV-data med stöd för:
 * - Detektering av CSV-typ (Overview eller Video)
 * - Mappning av kolumnnamn till interna fältnamn
 * - Beräkning av sammanfattande statistik
 */
import Papa from 'papaparse';
import { 
  CSV_TYPES, 
  CSV_TYPE_INDICATORS,
  OVERVIEW_FIELDS, 
  VIDEO_FIELDS,
  OVERVIEW_CALCULATED_FIELDS,
  VIDEO_CALCULATED_FIELDS,
} from './constants';

// ----------------------------------------
// CSV Typdetektering
// ----------------------------------------

/**
 * Detekterar vilken typ av CSV det är baserat på kolumnrubriker
 * @param {Array<string>} headers - Lista med kolumnrubriker
 * @returns {string} - CSV-typ (overview eller video)
 */
export const detectCSVType = (headers) => {
  if (!headers || !Array.isArray(headers)) {
    throw new Error('Ogiltiga headers för CSV-typdetektering');
  }
  
  // Normalisera headers
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
  
  // Kontrollera indikatorer för varje typ
  const overviewMatches = CSV_TYPE_INDICATORS[CSV_TYPES.OVERVIEW].filter(
    indicator => normalizedHeaders.some(header => header.toLowerCase() === indicator.toLowerCase())
  ).length;
  
  const videoMatches = CSV_TYPE_INDICATORS[CSV_TYPES.VIDEO].filter(
    indicator => normalizedHeaders.some(header => header.toLowerCase() === indicator.toLowerCase())
  ).length;
  
  // Returner typ baserat på antal matchningar
  if (overviewMatches > videoMatches) {
    return CSV_TYPES.OVERVIEW;
  } else if (videoMatches > overviewMatches) {
    return CSV_TYPES.VIDEO;
  } else {
    // Om det är samma antal matchningar, använd heuristik
    // Om det finns 'datum' eller 'date', är det troligen overview
    if (normalizedHeaders.some(h => h === 'datum' || h === 'date')) {
      return CSV_TYPES.OVERVIEW;
    }
    // Om det finns 'videotitel' eller 'video title', är det troligen video
    if (normalizedHeaders.some(h => h === 'videotitel' || h === 'video title')) {
      return CSV_TYPES.VIDEO;
    }
    
    // Fallback till overview
    return CSV_TYPES.OVERVIEW;
  }
};

// ----------------------------------------
// Data bearbetning
// ----------------------------------------

/**
 * Normaliserar text för konsekvent jämförelse
 * @param {string} text - Text att normalisera
 * @returns {string} - Normaliserad text
 */
const normalizeText = (text) => {
  if (text === null || text === undefined) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Hantera multipla mellanslag
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Ta bort osynliga tecken
};

/**
 * Mappar en rad från CSV till interna fältnamn
 * @param {Object} row - CSV-rad
 * @param {Object} columnMappings - Kolumnmappningar (externt -> internt)
 * @returns {Object} - Mappad rad
 */
const mapRow = (row, columnMappings) => {
  const result = {};
  
  for (const [externalName, value] of Object.entries(row)) {
    // Hitta matchande internt namn i mappningar
    let internalName = null;
    const normalizedExternal = normalizeText(externalName);
    
    for (const [mappingKey, mappingValue] of Object.entries(columnMappings)) {
      if (normalizeText(mappingKey) === normalizedExternal) {
        internalName = mappingValue;
        break;
      }
    }
    
    // Om inget internt namn hittas, använd originalnamnet
    if (!internalName) {
      internalName = externalName;
    }
    
    // Konvertera numeriska värden
    let processedValue = value;
    if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
      processedValue = parseFloat(value);
    }
    
    result[internalName] = processedValue;
  }
  
  return result;
};

/**
 * Beräknar sammanfattande fält för Overview-data
 * @param {Object} row - Mappad CSV-rad
 * @returns {Object} - Rad med beräknade fält
 */
const calculateOverviewFields = (row) => {
  const result = { ...row };
  
  // Beräkna interaktioner: summan av likes, comments och shares
  const likes = parseFloat(row.likes || 0);
  const comments = parseFloat(row.comments || 0);
  const shares = parseFloat(row.shares || 0);
  result.interactions = likes + comments + shares;
  
  // Beräkna engagemangsnivå: interaktioner / reach * 100
  if (row.reach && row.reach > 0) {
    result.engagement_rate = parseFloat(((result.interactions / row.reach) * 100).toFixed(2));
  } else {
    result.engagement_rate = 0;
  }
  
  return result;
};

/**
 * Beräknar sammanfattande fält för Video-data
 * @param {Object} row - Mappad CSV-rad
 * @returns {Object} - Rad med beräknade fält
 */
const calculateVideoFields = (row) => {
  const result = { ...row };
  
  // Beräkna interaktioner: summan av likes, comments, shares och favorites
  const likes = parseFloat(row.likes || 0);
  const comments = parseFloat(row.comments || 0);
  const shares = parseFloat(row.shares || 0);
  const favorites = parseFloat(row.favorites || 0);
  result.interactions = likes + comments + shares + favorites;
  
  // Beräkna engagemangsnivå: interaktioner / views * 100
  if (row.views && row.views > 0) {
    result.engagement_rate = parseFloat(((result.interactions / row.views) * 100).toFixed(2));
  } else {
    result.engagement_rate = 0;
  }
  
  return result;
};

/**
 * Processar TikTok CSV-data
 * @param {string} csvContent - CSV-innehåll
 * @param {Object} columnMappings - Kolumnmappningar
 * @param {string} [forcedType] - Tvinga CSV-typ (optional)
 * @returns {Promise<Object>} - Bearbetad data och metadata
 */
export const processTikTokData = (csvContent, columnMappings, forcedType = null) => {
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
          
          // Detektera CSV-typ om inte tvingad
          const csvType = forcedType || detectCSVType(results.meta.fields);
          
          console.log(`CSV-typ detekterad: ${csvType}`);
          console.log('CSV-data analyserad:', {
            rows: results.data.length,
            columns: Object.keys(results.data[0]).length
          });
          
          // Mappa varje rad till interna fältnamn
          const mappedData = results.data.map(row => mapRow(row, columnMappings));
          
          // Beräkna sammanfattande fält baserat på CSV-typ
          let processedData;
          if (csvType === CSV_TYPES.OVERVIEW) {
            processedData = mappedData.map(calculateOverviewFields);
          } else {
            processedData = mappedData.map(calculateVideoFields);
          }
          
          // Hitta datumintervall för metadata
          let dateRange = { startDate: null, endDate: null };
          
          if (csvType === CSV_TYPES.OVERVIEW) {
            const dates = processedData
              .map(row => row.date)
              .filter(date => date);
            
            if (dates.length > 0) {
              const sortedDates = [...dates].sort();
              dateRange = {
                startDate: sortedDates[0],
                endDate: sortedDates[sortedDates.length - 1]
              };
            }
          } else if (csvType === CSV_TYPES.VIDEO) {
            const dates = processedData
              .map(row => row.publish_time)
              .filter(date => date);
            
            if (dates.length > 0) {
              const sortedDates = [...dates].sort();
              dateRange = {
                startDate: sortedDates[0],
                endDate: sortedDates[sortedDates.length - 1]
              };
            }
          }
          
          resolve({
            data: processedData,
            csvType,
            meta: {
              rowCount: processedData.length,
              processedAt: new Date(),
              dateRange,
              fields: results.meta.fields
            }
          });
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

/**
 * Returnerar standardkolumnmappningar baserat på CSV-typ
 * @param {string} csvType - CSV-typ (overview eller video)
 * @returns {Object} - Standardkolumnmappningar
 */
export const getDefaultColumnMappings = (csvType) => {
  if (csvType === CSV_TYPES.OVERVIEW) {
    return Object.entries(OVERVIEW_FIELDS).reduce((acc, [internal, external]) => {
      acc[external] = internal;
      return acc;
    }, {});
  } else {
    return Object.entries(VIDEO_FIELDS).reduce((acc, [internal, external]) => {
      acc[external] = internal;
      return acc;
    }, {});
  }
};

/**
 * Returnerar vilka fält som är beräknade baserat på CSV-typ
 * @param {string} csvType - CSV-typ (overview eller video)
 * @returns {Array<string>} - Lista med beräknade fältnamn
 */
export const getCalculatedFields = (csvType) => {
  if (csvType === CSV_TYPES.OVERVIEW) {
    return Object.keys(OVERVIEW_CALCULATED_FIELDS);
  } else {
    return Object.keys(VIDEO_CALCULATED_FIELDS);
  }
};