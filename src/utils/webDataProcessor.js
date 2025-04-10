/**
 * Web Data Processor
 * 
 * Hanterar bearbetning av TikTok CSV-data med stöd för:
 * - Detektering av CSV-typ (Overview eller Video)
 * - Identifiering av icke-TikTok filer (Facebook, Instagram)
 * - Validering av nödvändiga kolumner
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
  OVERVIEW_FIELDS_ENGLISH,
  VIDEO_FIELDS_ENGLISH,
  REQUIRED_OVERVIEW_FIELDS,
  REQUIRED_VIDEO_FIELDS
} from './constants';

// ----------------------------------------
// CSV Typdetektering
// ----------------------------------------

/**
 * Detekterar vilken typ av CSV det är baserat på kolumnrubriker
 * @param {Array<string>} headers - Lista med kolumnrubriker
 * @returns {string} - CSV-typ (overview, video, facebook, instagram, eller unknown)
 */
export const detectCSVType = (headers) => {
  if (!headers || !Array.isArray(headers)) {
    throw new Error('Ogiltiga headers för CSV-typdetektering');
  }
  
  // Normalisera headers för enklare matchning
  const normalizedHeaders = headers.map(h => h ? h.trim().toLowerCase() : '');
  
  // Skapa ett objekt för att hålla reda på matchningar per CSV-typ
  const matches = {};
  
  // Räkna antalet matcher för varje CSV-typ
  for (const [type, indicators] of Object.entries(CSV_TYPE_INDICATORS)) {
    matches[type] = indicators.filter(
      indicator => normalizedHeaders.some(header => 
        header.toLowerCase() === indicator.toLowerCase() || 
        header.toLowerCase().includes(indicator.toLowerCase())
      )
    ).length;
  }
  
  console.log("CSV typ matchningar:", matches);
  
  // Hitta typen med flest matcher
  let bestMatch = { type: CSV_TYPES.UNKNOWN, count: 0 };
  
  for (const [type, count] of Object.entries(matches)) {
    if (count > bestMatch.count) {
      bestMatch = { type, count };
    }
  }
  
  // Om inga betydande matchningar (minst 2), använd heuristik
  if (bestMatch.count < 2) {
    // Om det finns 'datum' eller 'date', är det troligen overview
    if (normalizedHeaders.some(h => h === 'datum' || h === 'date')) {
      return CSV_TYPES.OVERVIEW;
    }
    
    // Om det finns 'videotitel' eller varianter, är det troligen video
    if (normalizedHeaders.some(h => 
      h === 'videotitel' || 
      h === 'video title' || 
      h === 'title' ||
      h.includes('video')
    )) {
      return CSV_TYPES.VIDEO;
    }
    
    // Om vi har Facebook- eller Instagram-relaterade termer
    if (normalizedHeaders.some(h => h.includes('facebook') || h.includes('page'))) {
      return CSV_TYPES.FACEBOOK;
    }
    
    if (normalizedHeaders.some(h => h.includes('instagram') || h.includes('insta'))) {
      return CSV_TYPES.INSTAGRAM;
    }
    
    // Om vi fortfarande inte har en match, returnera UNKNOWN
    return CSV_TYPES.UNKNOWN;
  }
  
  return bestMatch.type;
};

/**
 * Validerar att alla nödvändiga kolumner finns i CSV-filen
 * @param {Array<string>} headers - Lista med kolumnrubriker
 * @param {Object} columnMappings - Kolumnmappningar
 * @param {string} csvType - CSV-typ (overview eller video)
 * @returns {Object} - Resultat av valideringen {isValid, missingColumns}
 */
export const validateRequiredColumns = (headers, columnMappings, csvType) => {
  if (!headers || !Array.isArray(headers) || !columnMappings) {
    return { 
      isValid: false, 
      missingColumns: [], 
      error: 'Ogiltiga headers eller mappningar för validering' 
    };
  }
  
  // Normalisera headers
  const normalizedHeaders = headers.map(h => h ? h.trim().toLowerCase() : '');
  
  // Hämta listan över nödvändiga fält baserat på CSV-typ
  const requiredFields = csvType === CSV_TYPES.OVERVIEW 
    ? REQUIRED_OVERVIEW_FIELDS 
    : REQUIRED_VIDEO_FIELDS;
  
  // Skapa omvänd mappning (internt fältnamn -> externa kolumnnamn) för att söka efter mappade kolumner
  const reverseMapping = {};
  for (const [externalName, internalName] of Object.entries(columnMappings)) {
    // Det kan finnas flera externa namn som mappar till samma interna namn
    if (!reverseMapping[internalName]) {
      reverseMapping[internalName] = [];
    }
    reverseMapping[internalName].push(externalName.toLowerCase());
  }
  
  // Kontrollera om varje nödvändigt fält finns i headers (direkt eller via mappning)
  const missingColumns = [];
  
  for (const requiredField of requiredFields) {
    const externalNames = reverseMapping[requiredField] || [];
    
    // Kontrollera om något av de externa namnen finns i headers
    const found = externalNames.some(name => 
      normalizedHeaders.includes(name.toLowerCase())
    );
    
    if (!found) {
      // Hämta visningsnamn för det saknade fältet
      const displayFields = csvType === CSV_TYPES.OVERVIEW 
        ? OVERVIEW_FIELDS 
        : VIDEO_FIELDS;
      
      const displayName = displayFields[requiredField] || requiredField;
      
      missingColumns.push(displayName);
    }
  }
  
  return {
    isValid: missingColumns.length === 0,
    missingColumns: missingColumns,
    error: missingColumns.length > 0 
      ? `Saknar nödvändiga kolumner: ${missingColumns.join(', ')}`
      : null
  };
};

/**
 * Avgör om en CSV-fil är från en annan plattform än TikTok
 * @param {string} csvType - Detekterad CSV-typ
 * @returns {Object|null} - Information om fel platform eller null
 */
export const checkWrongPlatform = (csvType) => {
  if (csvType === CSV_TYPES.FACEBOOK) {
    return {
      platform: 'Facebook',
      message: 'Detta verkar vara Facebook-statistik, inte TikTok-data. Appen stödjer endast TikTok-statistikfiler.'
    };
  }
  
  if (csvType === CSV_TYPES.INSTAGRAM) {
    return {
      platform: 'Instagram',
      message: 'Detta verkar vara Instagram-statistik, inte TikTok-data. Appen stödjer endast TikTok-statistikfiler.'
    };
  }
  
  if (csvType === CSV_TYPES.UNKNOWN) {
    return {
      platform: 'Okänd',
      message: 'Kunde inte identifiera denna fil som TikTok-statistik. Kontrollera att du valt rätt fil.'
    };
  }
  
  return null; // Ingen felaktig plattform detekterad
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
    
    // Om inget internt namn hitts, använd originalnamnet
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
  
  // Beräkna interaktioner: summan av likes, comments och shares (och eventuellt favorites)
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
 * Processar TikTok CSV-data med förbättrad prestanda
 * @param {string} csvContent - CSV-innehåll
 * @param {Object} columnMappings - Kolumnmappningar
 * @param {string} [forcedType] - Tvinga CSV-typ (optional)
 * @returns {Promise<Object>} - Bearbetad data och metadata
 */
export const processTikTokData = (csvContent, columnMappings, forcedType = null) => {
  return new Promise((resolve, reject) => {
    try {
      // Prestanda: Använd skipEmptyLines:true och dynamicTyping för bättre hastighet
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
          
          // Kontrollera om det är en annan plattform än TikTok
          const wrongPlatform = checkWrongPlatform(csvType);
          if (wrongPlatform) {
            reject(new Error(wrongPlatform.message));
            return;
          }
          
          // Validera nödvändiga kolumner
          const validation = validateRequiredColumns(results.meta.fields, columnMappings, csvType);
          
          // PRESTANDAOPTIMERING: Begränsa antal rader för bättre prestanda vid stor data
          // Detta gör att UI inte fryser vid stora filer
          const maxRows = 5000; // Sätt en rimlig begränsning
          let dataToProcess = results.data;
          let isLimited = false;
          
          if (dataToProcess.length > maxRows) {
            console.warn(`Begränsar databearbetning till ${maxRows} rader för bättre prestanda`);
            dataToProcess = dataToProcess.slice(0, maxRows);
            isLimited = true;
          }
          
          // PRESTANDAOPTIMERING: Använd Web Workers för tung bearbetning i bakgrunden
          // Simulera detta genom att batcha bearbetningen för att inte låsa UI
          setTimeout(() => {
            try {
              // Batch-process data för att inte låsa UI (simulerar Web Workers)
              const batchSize = 500;
              let processedData = [];
              
              // Mappa och beräkna i batches
              for (let i = 0; i < dataToProcess.length; i += batchSize) {
                const batch = dataToProcess.slice(i, i + batchSize);
                
                // Mappa varje rad till interna fältnamn
                const mappedBatch = batch.map(row => mapRow(row, columnMappings));
                
                // Beräkna sammanfattande fält baserat på CSV-typ
                let processedBatch;
                if (csvType === CSV_TYPES.OVERVIEW) {
                  processedBatch = mappedBatch.map(calculateOverviewFields);
                } else {
                  processedBatch = mappedBatch.map(calculateVideoFields);
                }
                
                processedData = [...processedData, ...processedBatch];
              }
              
              // Lägg till publication_count om det är VIDEO data
              if (csvType === CSV_TYPES.VIDEO) {
                // Beräkna antal publiceringar (1 per video)
                processedData.forEach(item => {
                  item.publication_count = 1;
                });
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
                  totalRows: results.data.length,
                  isLimited,
                  processedAt: new Date(),
                  dateRange,
                  fields: results.meta.fields,
                  missingColumns: validation.missingColumns,
                  wrongPlatform: wrongPlatform
                }
              });
            } catch (innerError) {
              console.error('Fel vid databearbetning:', innerError);
              reject(innerError);
            }
          }, 10); // Kort timeout för att låta UI uppdateras
          
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
    // Combine Swedish and English mappings for overview data
    const swedishMappings = Object.entries(OVERVIEW_FIELDS).reduce((acc, [internal, external]) => {
      acc[external] = internal;
      return acc;
    }, {});
    
    const englishMappings = Object.entries(OVERVIEW_FIELDS_ENGLISH).reduce((acc, [internal, external]) => {
      acc[external] = internal;
      return acc;
    }, {});
    
    return { ...swedishMappings, ...englishMappings };
  } else {
    // Combine Swedish and English mappings for video data
    const swedishMappings = Object.entries(VIDEO_FIELDS).reduce((acc, [internal, external]) => {
      acc[external] = internal;
      return acc;
    }, {});
    
    const englishMappings = Object.entries(VIDEO_FIELDS_ENGLISH).reduce((acc, [internal, external]) => {
      acc[external] = internal;
      return acc;
    }, {});
    
    return { ...swedishMappings, ...englishMappings };
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