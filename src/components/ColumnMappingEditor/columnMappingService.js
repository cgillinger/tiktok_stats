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
  FIELD_CATEGORIES,
  OVERVIEW_FIELDS_ENGLISH,
  VIDEO_FIELDS_ENGLISH
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
 * @param {boolean} swedishPreferred - Om svenska mappningar ska prioriteras (annars engelska)
 * @returns {Object} - Standardkolumnmappningar
 */
export function getDefaultMappings(csvType, swedishPreferred = true) {
  if (csvType === CSV_TYPES.OVERVIEW) {
    // Skapa mappningar där värdet (internt namn) blir nyckeln och displaynamnet blir värdet
    const swedishMappings = Object.entries(OVERVIEW_FIELDS).reduce((acc, [internalName, displayName]) => {
      acc[displayName] = internalName;
      return acc;
    }, {});
    
    const englishMappings = Object.entries(OVERVIEW_FIELDS_ENGLISH).reduce((acc, [internalName, displayName]) => {
      acc[displayName] = internalName;
      return acc;
    }, {});
    
    // Om svenska föredras, återvänd de svenska mappningarna först (så att svenska visas i UI)
    return swedishPreferred 
      ? { ...englishMappings, ...swedishMappings } // Svenska överskriver engelska
      : { ...swedishMappings, ...englishMappings }; // Engelska överskriver svenska
  } else {
    // Skapa mappningar för video
    const swedishMappings = Object.entries(VIDEO_FIELDS).reduce((acc, [internalName, displayName]) => {
      acc[displayName] = internalName;
      return acc;
    }, {});
    
    const englishMappings = Object.entries(VIDEO_FIELDS_ENGLISH).reduce((acc, [internalName, displayName]) => {
      acc[displayName] = internalName;
      return acc;
    }, {});
    
    // Om svenska föredras, återvänd de svenska mappningarna först (så att svenska visas i UI)
    return swedishPreferred 
      ? { ...englishMappings, ...swedishMappings } // Svenska överskriver engelska  
      : { ...swedishMappings, ...englishMappings }; // Engelska överskriver svenska
  }
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
  
  // Lägg till standardnamn (both Swedish and English)
  if (internalName in OVERVIEW_FIELDS) {
    names.add(OVERVIEW_FIELDS[internalName]);
  }
  
  if (internalName in VIDEO_FIELDS) {
    names.add(VIDEO_FIELDS[internalName]);
  }
  
  // Add English variants
  if (internalName in OVERVIEW_FIELDS_ENGLISH) {
    names.add(OVERVIEW_FIELDS_ENGLISH[internalName]);
  }
  
  if (internalName in VIDEO_FIELDS_ENGLISH) {
    names.add(VIDEO_FIELDS_ENGLISH[internalName]);
  }
  
  // Lägg till några vanliga varianter
  // T.ex. för 'likes' kan vi lägga till 'Gilla-markeringar', 'Gilla', etc.
  const commonVariants = {
    'likes': ['Gilla-markeringar', 'Gilla', 'Gillningar', 'Likes'],
    'shares': ['Delningar', 'Shares', 'Share Count'],
    'comments': ['Kommentarer', 'Comments', 'Comment Count'],
    'views': ['Visningar', 'Videovisningar', 'Views', 'Video Views'],
    'reach': ['Räckvidd', 'Reach', 'Målgrupp som nåtts', 'Reached audience'],
    'profile_views': ['Profilvisningar', 'Profile Views'],
    'date': ['Datum', 'Date', 'Dag'],
    'title': ['Videotitel', 'Video Title', 'Titel'],
    'publish_time': ['Publiceringstid', 'Publish Time', 'Publish Date', 'Publishing time', 'Post time'],
    'favorites': ['Lägg till i Favoriter', 'Favorites', 'Add to Favorites', 'Add to favorites'],
    'new_followers': ['Nya följare', 'New Followers', 'New followers'],
    'lost_followers': ['Tappade följare', 'Lost Followers', 'Lost followers'],
    'follower_net_growth': ['Nettotillväxt', 'Net Growth', 'Net growth'],
    'video_views': ['Videovisningar', 'Video Views', 'Video views']
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
      mappings = getDefaultMappings(csvType, true); // Föredra svenska
    }
    
    // Cacha mappningarna
    cachedMappings[csvType] = mappings;
    
    return mappings;
  } catch (error) {
    console.error(`Fel vid hämtning av mappningar för ${csvType}:`, error);
    
    // Vid fel, returnera standardmappningar
    const defaultMappings = getDefaultMappings(csvType, true); // Föredra svenska
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
    // Hämta standardmappningar med svensk preferens
    const defaultMappings = getDefaultMappings(csvType, true);
    
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