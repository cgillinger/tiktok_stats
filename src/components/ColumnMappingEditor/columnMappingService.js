/**
 * Service för hantering av kolumnmappningar
 * 
 * En robust hantering av kolumnmappningar som används för att översätta
 * externa kolumnnamn från CSV-filer till interna fältnamn i applikationen.
 */
import { 
  getColumnMappings, 
  saveColumnMappings 
} from '@/utils/webStorageService';
import { 
  CSV_TYPES, 
  OVERVIEW_FIELDS, 
  VIDEO_FIELDS,
  FIELD_CATEGORIES
} from '@/utils/constants';

// Cachade mappningar för prestanda
let cachedMappings = {
  [CSV_TYPES.OVERVIEW]: null,
  [CSV_TYPES.VIDEO]: null
};

/**
 * Normalisera text för konsistent jämförelse
 * @param {string} text - Text att normalisera
 * @returns {string} - Normaliserad text
 */
export function normalizeText(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Hantera multipla mellanslag
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Ta bort osynliga tecken
}

/**
 * Hämtar standardkolumnmappningar för en viss CSV-typ
 * @param {string} csvType - CSV-typ (overview eller video)
 * @returns {Object} - Standardkolumnmappningar
 */
export function getDefaultMappings(csvType) {
  const fieldsToUse = csvType === CSV_TYPES.OVERVIEW ? OVERVIEW_FIELDS : VIDEO_FIELDS;
  
  // Skapa mappningar där värdet (internt namn) blir nyckeln och displaynamnet blir värdet
  return Object.entries(fieldsToUse).reduce((acc, [internalName, displayName]) => {
    acc[displayName] = internalName;
    return acc;
  }, {});
}

/**
 * Hämtar nya/alternativa namn för ett fält baserat på tidigare mappningar
 * @param {string} internalName - Internt fältnamn
 * @param {Object} currentMappings - Aktuella mappningar
 * @returns {Array<string>} - Lista med alternativa namn
 */
export function getAlternativeNames(internalName, currentMappings) {
  // Samla alla kända namn för detta interna fält
  const names = new Set();
  
  // Lägg till från aktuella mappningar
  for (const [externalName, mappedName] of Object.entries(currentMappings)) {
    if (mappedName === internalName) {
      names.add(externalName);
    }
  }
  
  // Lägg till standardnamn
  if (internalName in OVERVIEW_FIELDS) {
    names.add(OVERVIEW_FIELDS[internalName]);
  }
  
  if (internalName in VIDEO_FIELDS) {
    names.add(VIDEO_FIELDS[internalName]);
  }
  
  // Lägg till några vanliga varianter
  // T.ex. för 'likes' kan vi lägga till 'Gilla-markeringar', 'Gilla', etc.
  const commonVariants = {
    'likes': ['Gilla-markeringar', 'Gilla', 'Gillningar', 'Likes'],
    'shares': ['Delningar', 'Shares', 'Share Count'],
    'comments': ['Kommentarer', 'Comments', 'Comment Count'],
    'views': ['Visningar', 'Videovisningar', 'Views', 'Video Views'],
    'reach': ['Räckvidd', 'Reach', 'Målgrupp som nåtts'],
    'profile_views': ['Profilvisningar', 'Profile Views'],
    'date': ['Datum', 'Date', 'Dag'],
    'title': ['Videotitel', 'Video Title', 'Titel'],
    'publish_time': ['Publiceringstid', 'Publish Time', 'Publish Date'],
    'favorites': ['Lägg till i Favoriter', 'Favorites', 'Add to Favorites']
  };
  
  if (internalName in commonVariants) {
    commonVariants[internalName].forEach(variant => names.add(variant));
  }
  
  return [...names];
}

/**
 * Hämtar kolumnmappningar, använder cache om möjligt
 * @param {string} csvType - CSV-typ (overview eller video)
 * @returns {Promise<Object>} - Kolumnmappningar
 */
export async function getCurrentMappings(csvType) {
  // Om mappningarna är cachade, använd dem
  if (cachedMappings[csvType]) {
    return cachedMappings[csvType];
  }
  
  try {
    // Hämta mappningar från lagring
    let mappings = await getColumnMappings(csvType);
    
    // Om inga mappningar hittades, använd standard
    if (!mappings || Object.keys(mappings).length === 0) {
      mappings = getDefaultMappings(csvType);
    }
    
    // Cacha mappningarna
    cachedMappings[csvType] = mappings;
    
    return mappings;
  } catch (error) {
    console.error(`Fel vid hämtning av mappningar för ${csvType}:`, error);
    
    // Vid fel, returnera standardmappningar
    const defaultMappings = getDefaultMappings(csvType);
    cachedMappings[csvType] = defaultMappings;
    
    return defaultMappings;
  }
}

/**
 * Sparar kolumnmappningar och uppdaterar cache
 * @param {string} csvType - CSV-typ (overview eller video)
 * @param {Object} mappings - Mappningar att spara
 * @returns {Promise<boolean>} - true om sparandet lyckades
 */
export async function updateMappings(csvType, mappings) {
  try {
    // Spara mappningar
    await saveColumnMappings(csvType, mappings);
    
    // Uppdatera cache
    cachedMappings[csvType] = mappings;
    
    return true;
  } catch (error) {
    console.error(`Fel vid sparande av mappningar för ${csvType}:`, error);
    return false;
  }
}

/**
 * Återställer kolumnmappningar till standard
 * @param {string} csvType - CSV-typ (overview eller video)
 * @returns {Promise<Object>} - De återställda mappningarna
 */
export async function resetMappings(csvType) {
  try {
    // Hämta standardmappningar
    const defaultMappings = getDefaultMappings(csvType);
    
    // Spara standardmappningar
    await saveColumnMappings(csvType, defaultMappings);
    
    // Uppdatera cache
    cachedMappings[csvType] = defaultMappings;
    
    return defaultMappings;
  } catch (error) {
    console.error(`Fel vid återställning av mappningar för ${csvType}:`, error);
    throw error;
  }
}

/**
 * Rensa kolumnmappningscachen
 */
export function clearMappingsCache() {
  cachedMappings = {
    [CSV_TYPES.OVERVIEW]: null,
    [CSV_TYPES.VIDEO]: null
  };
}

/**
 * Hämtar interna fältnamn för en CSV-typ
 * @param {string} csvType - CSV-typ (overview eller video)
 * @returns {Array<string>} - Lista med interna fältnamn
 */
export function getInternalFieldNames(csvType) {
  if (csvType === CSV_TYPES.OVERVIEW) {
    return Object.keys(OVERVIEW_FIELDS);
  } else {
    return Object.keys(VIDEO_FIELDS);
  }
}

/**
 * Hämtar displaynamn för ett internt fältnamn
 * @param {string} internalName - Internt fältnamn
 * @param {string} csvType - CSV-typ (overview eller video)
 * @returns {string} - Displaynamn för fältet
 */
export function getDisplayName(internalName, csvType) {
  if (csvType === CSV_TYPES.OVERVIEW && internalName in OVERVIEW_FIELDS) {
    return OVERVIEW_FIELDS[internalName];
  } else if (csvType === CSV_TYPES.VIDEO && internalName in VIDEO_FIELDS) {
    return VIDEO_FIELDS[internalName];
  }
  
  return internalName;
}

/**
 * Grupperar fält enligt kategorier
 * @param {string} csvType - CSV-typ (overview eller video)
 * @returns {Object} - Grupperade fält
 */
export function getFieldGroups(csvType) {
  const groups = {};
  const categories = FIELD_CATEGORIES[csvType === CSV_TYPES.OVERVIEW ? 'OVERVIEW' : 'VIDEO'];
  
  // Skapa grupper enligt kategorier
  for (const [groupName, fieldList] of Object.entries(categories)) {
    groups[groupName] = fieldList;
  }
  
  return groups;
}