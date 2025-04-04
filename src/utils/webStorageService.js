/**
 * Web Storage Service
 * 
 * Hanterar lagring av data i webbläsaren med stöd för:
 * - localStorage för konfiguration och små datamängder
 * - IndexedDB för större datauppsättningar
 * - Support för flera TikTok-konton med olika datatyper
 */
import { STORAGE_KEYS, CSV_TYPES } from './constants';

// Keep a reference to the database instance to prevent re-opening the connection
let dbInstance = null;

// ----------------------------------------
// IndexedDB hantering
// ----------------------------------------

/**
 * Initierar och öppnar IndexedDB
 * @returns {Promise<IDBDatabase>} - Referens till databasen
 */
const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STORAGE_KEYS.DB_NAME, STORAGE_KEYS.DB_VERSION);
    
    request.onerror = (event) => {
      console.error('IndexedDB-fel:', event.target.error);
      reject(event.target.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Skapa objektlager om de inte existerar
      if (!db.objectStoreNames.contains(STORAGE_KEYS.STORE_ACCOUNTS)) {
        db.createObjectStore(STORAGE_KEYS.STORE_ACCOUNTS, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORAGE_KEYS.STORE_OVERVIEW_DATA)) {
        const overviewStore = db.createObjectStore(STORAGE_KEYS.STORE_OVERVIEW_DATA, { keyPath: 'id', autoIncrement: true });
        overviewStore.createIndex('accountId', 'accountId', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORAGE_KEYS.STORE_VIDEO_DATA)) {
        const videoStore = db.createObjectStore(STORAGE_KEYS.STORE_VIDEO_DATA, { keyPath: 'id', autoIncrement: true });
        videoStore.createIndex('accountId', 'accountId', { unique: false });
      }
    };
    
    request.onsuccess = (event) => {
      // Store the db instance for reuse
      dbInstance = event.target.result;
      resolve(dbInstance);
    };
  });
};

/**
 * Get database instance - reuse existing connection if available
 * @returns {Promise<IDBDatabase>} - Database reference
 */
const getDatabase = async () => {
  if (dbInstance) {
    return dbInstance;
  }
  
  return await openDatabase();
};

/**
 * Sparar data i IndexedDB
 * @param {string} storeName - Namn på objektlager
 * @param {Object} data - Data att spara
 * @returns {Promise<number>} - ID för sparat objekt
 */
const saveToIndexedDB = async (storeName, data) => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Hämtar alla data från ett objektlager
 * @param {string} storeName - Namn på objektlager
 * @returns {Promise<Array>} - Array med alla objekt
 */
const getAllFromIndexedDB = async (storeName) => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Hämtar data baserat på index
 * @param {string} storeName - Namn på objektlager
 * @param {string} indexName - Namn på index
 * @param {any} value - Värdet att söka efter
 * @returns {Promise<Array>} - Array med matchande objekt
 */
const getByIndex = async (storeName, indexName, value) => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Hämtar ett objekt med specifikt ID
 * @param {string} storeName - Namn på objektlager
 * @param {number|string} id - ID för objektet att hämta
 * @returns {Promise<Object>} - Det hämtade objektet
 */
const getById = async (storeName, id) => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Tar bort ett objekt med specifikt ID
 * @param {string} storeName - Namn på objektlager
 * @param {number|string} id - ID för objektet att ta bort
 * @returns {Promise<boolean>} - true om borttagningen lyckades
 */
const deleteById = async (storeName, id) => {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Tar bort all data för ett specifikt konto
 * @param {string} accountId - Konto-ID
 * @returns {Promise<{overview: boolean, video: boolean}>} - Status för borttagning
 */
const deleteAccountData = async (accountId) => {
  try {
    // Hämta all data för detta konto
    const overviewData = await getByIndex(STORAGE_KEYS.STORE_OVERVIEW_DATA, 'accountId', accountId);
    const videoData = await getByIndex(STORAGE_KEYS.STORE_VIDEO_DATA, 'accountId', accountId);
    
    // Ta bort all overview data
    for (const item of overviewData) {
      await deleteById(STORAGE_KEYS.STORE_OVERVIEW_DATA, item.id);
    }
    
    // Ta bort all video data
    for (const item of videoData) {
      await deleteById(STORAGE_KEYS.STORE_VIDEO_DATA, item.id);
    }
    
    // Ta även bort från localStorage (för små dataset)
    try {
      localStorage.removeItem(`${STORAGE_KEYS.OVERVIEW_DATA_PREFIX}${accountId}`);
      localStorage.removeItem(`${STORAGE_KEYS.VIDEO_DATA_PREFIX}${accountId}`);
    } catch (e) {
      console.warn('Kunde inte ta bort från localStorage:', e);
    }
    
    return {
      overview: true,
      video: true
    };
  } catch (error) {
    console.error('Fel vid borttagning av kontodata:', error);
    return {
      overview: false,
      video: false,
      error: error.message
    };
  }
};

// ----------------------------------------
// localStorage hantering
// ----------------------------------------

/**
 * Sparar data i localStorage
 * @param {string} key - Nyckel att spara under
 * @param {any} data - Data att spara
 * @returns {boolean} - true om sparandet lyckades
 */
const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Fel vid sparande till localStorage (${key}):`, error);
    return false;
  }
};

/**
 * Hämtar data från localStorage
 * @param {string} key - Nyckel att hämta
 * @param {any} defaultValue - Standardvärde om nyckeln inte finns
 * @returns {any} - Hämtad data eller standardvärde
 */
const getFromLocalStorage = (key, defaultValue = null) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Fel vid hämtning från localStorage (${key}):`, error);
    return defaultValue;
  }
};

// ----------------------------------------
// API för kontohantering
// ----------------------------------------

/**
 * Hämtar alla konton
 * @returns {Promise<Array>} - Array med alla konton
 */
export const getAccounts = async () => {
  try {
    // Försök hämta från localStorage först (för bakåtkompatibilitet)
    let accounts = getFromLocalStorage(STORAGE_KEYS.ACCOUNTS, []);
    
    // Om inga konton finns i localStorage, hämta från IndexedDB
    if (!accounts || accounts.length === 0) {
      accounts = await getAllFromIndexedDB(STORAGE_KEYS.STORE_ACCOUNTS);
      
      // Uppdatera localStorage om det finns konton i IndexedDB
      if (accounts && accounts.length > 0) {
        saveToLocalStorage(STORAGE_KEYS.ACCOUNTS, accounts);
      }
    }
    
    return accounts || [];
  } catch (error) {
    console.error('Fel vid hämtning av konton:', error);
    return [];
  }
};

/**
 * Sparar ett nytt konto eller uppdaterar ett befintligt
 * @param {Object} account - Kontoobjekt att spara
 * @returns {Promise<Object>} - Det sparade kontot
 */
export const saveAccount = async (account) => {
  try {
    // Hämta befintliga konton
    let accounts = await getAccounts();
    
    // Om kontot har ett ID, uppdatera det
    if (account.id) {
      const index = accounts.findIndex(a => a.id === account.id);
      if (index !== -1) {
        accounts[index] = { ...accounts[index], ...account };
      } else {
        accounts.push(account);
      }
    } else {
      // Annars skapa ett nytt konto med genererat ID
      account.id = Date.now().toString();
      accounts.push(account);
    }
    
    // Spara i både IndexedDB och localStorage
    await saveToIndexedDB(STORAGE_KEYS.STORE_ACCOUNTS, account);
    saveToLocalStorage(STORAGE_KEYS.ACCOUNTS, accounts);
    
    return account;
  } catch (error) {
    console.error('Fel vid sparande av konto:', error);
    throw error;
  }
};

/**
 * Tar bort ett konto och all dess data
 * @param {string} accountId - ID för kontot att ta bort
 * @returns {Promise<boolean>} - true om borttagningen lyckades
 */
export const deleteAccount = async (accountId) => {
  try {
    // Hämta befintliga konton
    let accounts = await getAccounts();
    
    // Filtrera bort det borttagna kontot
    accounts = accounts.filter(a => a.id !== accountId);
    
    // Ta bort kontot från IndexedDB
    await deleteById(STORAGE_KEYS.STORE_ACCOUNTS, accountId);
    
    // Ta bort all data för detta konto
    await deleteAccountData(accountId);
    
    // Uppdatera localStorage
    saveToLocalStorage(STORAGE_KEYS.ACCOUNTS, accounts);
    
    return true;
  } catch (error) {
    console.error('Fel vid borttagning av konto:', error);
    return false;
  }
};

/**
 * Hämtar ett specifikt konto baserat på ID
 * @param {string} accountId - ID för kontot att hämta
 * @returns {Promise<Object>} - Det hämtade kontot eller null
 */
export const getAccount = async (accountId) => {
  try {
    // Hämta från IndexedDB
    const account = await getById(STORAGE_KEYS.STORE_ACCOUNTS, accountId);
    
    if (account) {
      return account;
    }
    
    // Fallback: Sök i localStorage-konton
    const accounts = getFromLocalStorage(STORAGE_KEYS.ACCOUNTS, []);
    return accounts.find(a => a.id === accountId) || null;
  } catch (error) {
    console.error(`Fel vid hämtning av konto (${accountId}):`, error);
    return null;
  }
};

/**
 * Uppdaterar ett kontos datastatus
 * @param {string} accountId - ID för kontot att uppdatera
 * @param {Object} dataStatus - Nytt datastatus ({ hasOverviewData, hasVideoData })
 * @returns {Promise<Object>} - Det uppdaterade kontot
 */
export const updateAccountDataStatus = async (accountId, dataStatus) => {
  try {
    const account = await getAccount(accountId);
    
    if (!account) {
      throw new Error(`Konto med ID ${accountId} hittades inte`);
    }
    
    const updatedAccount = {
      ...account,
      ...dataStatus
    };
    
    return await saveAccount(updatedAccount);
  } catch (error) {
    console.error('Fel vid uppdatering av kontostatus:', error);
    throw error;
  }
};

// ----------------------------------------
// CSV kolumnmappningar
// ----------------------------------------

/**
 * Hämtar kolumnmappningar för en specifik CSV-typ
 * @param {string} csvType - CSV-typ (overview eller video)
 * @returns {Promise<Object>} - Kolumnmappningar
 */
export const getColumnMappings = async (csvType) => {
  const key = csvType === CSV_TYPES.OVERVIEW 
    ? STORAGE_KEYS.COLUMN_MAPPINGS_OVERVIEW 
    : STORAGE_KEYS.COLUMN_MAPPINGS_VIDEO;
  
  return getFromLocalStorage(key, {});
};

/**
 * Sparar kolumnmappningar för en specifik CSV-typ
 * @param {string} csvType - CSV-typ (overview eller video)
 * @param {Object} mappings - Kolumnmappningar att spara
 * @returns {Promise<boolean>} - true om sparandet lyckades
 */
export const saveColumnMappings = async (csvType, mappings) => {
  const key = csvType === CSV_TYPES.OVERVIEW 
    ? STORAGE_KEYS.COLUMN_MAPPINGS_OVERVIEW 
    : STORAGE_KEYS.COLUMN_MAPPINGS_VIDEO;
  
  return saveToLocalStorage(key, mappings);
};

// ----------------------------------------
// Data hantering per konto och datatyp
// ----------------------------------------

/**
 * Sparar CSV-data för ett specifikt konto och datatyp
 * @param {string} accountId - Konto-ID
 * @param {string} csvType - CSV-typ (overview eller video)
 * @param {Array} data - Data att spara
 * @returns {Promise<boolean>} - true om sparandet lyckades
 */
export const saveAccountData = async (accountId, csvType, data) => {
  try {
    if (!accountId || !csvType || !data) {
      throw new Error('accountId, csvType och data krävs');
    }
    
    console.log(`Sparar ${csvType}-data för konto ${accountId} (${data.length} rader)`);
    
    // Validera data
    if (!Array.isArray(data)) {
      throw new Error('Data måste vara en array');
    }
    
    // Validera och försök rätta till datum
    const processedData = data.map(item => {
      const processed = { ...item, accountId };
      
      // Ensure date fields have proper format
      if (csvType === CSV_TYPES.OVERVIEW && processed.date) {
        try {
          const date = new Date(processed.date);
          if (!isNaN(date.getTime())) {
            processed.date = date.toISOString();
          }
        } catch (e) {
          console.warn('Failed to format date:', processed.date);
        }
      } else if (csvType === CSV_TYPES.VIDEO && processed.publish_time) {
        try {
          const date = new Date(processed.publish_time);
          if (!isNaN(date.getTime())) {
            processed.publish_time = date.toISOString();
          }
        } catch (e) {
          console.warn('Failed to format publish_time:', processed.publish_time);
        }
      }

      return processed;
    });
    
    // Lägg till metadata
    const dataWithMeta = {
      accountId,
      dataType: csvType,
      timestamp: Date.now(),
      data: processedData
    };
    
    // Kontrollera datamängd för att avgöra om localStorage eller IndexedDB ska användas
    const dataSize = JSON.stringify(data).length;
    
    // För små datamängder, använd localStorage med anpassad nyckel
    if (dataSize < 1000000) { // ~1MB
      const storageKey = csvType === CSV_TYPES.OVERVIEW
        ? `${STORAGE_KEYS.OVERVIEW_DATA_PREFIX}${accountId}`
        : `${STORAGE_KEYS.VIDEO_DATA_PREFIX}${accountId}`;
      
      saveToLocalStorage(storageKey, dataWithMeta);
    }
    
    // För alla datamängder, spara även i IndexedDB för säkerhets skull
    const storeName = csvType === CSV_TYPES.OVERVIEW
      ? STORAGE_KEYS.STORE_OVERVIEW_DATA
      : STORAGE_KEYS.STORE_VIDEO_DATA;
    
    // Delete any previous data for this account and type
    const existingItems = await getByIndex(storeName, 'accountId', accountId);
    for (const item of existingItems) {
      await deleteById(storeName, item.id);
    }
    
    // Save the new data
    await saveToIndexedDB(storeName, dataWithMeta);
    
    // Uppdatera kontots datastatus
    const dataStatus = csvType === CSV_TYPES.OVERVIEW
      ? { hasOverviewData: true, lastOverviewUpdate: Date.now() }
      : { hasVideoData: true, lastVideoUpdate: Date.now() };
    
    await updateAccountDataStatus(accountId, dataStatus);
    
    console.log(`Data sparad för ${csvType} (${processedData.length} rader)`);
    return true;
  } catch (error) {
    console.error(`Fel vid sparande av ${csvType}-data för konto ${accountId}:`, error);
    return false;
  }
};

/**
 * Hämtar CSV-data för ett specifikt konto och datatyp
 * @param {string} accountId - Konto-ID
 * @param {string} csvType - CSV-typ (overview eller video)
 * @returns {Promise<Array>} - Hämtad data eller tom array
 */
export const getAccountData = async (accountId, csvType) => {
  try {
    if (!accountId || !csvType) {
      throw new Error('accountId och csvType krävs');
    }
    
    console.log(`Hämtar ${csvType}-data för konto ${accountId}`);
    
    // Först, försök hämta från IndexedDB
    const storeName = csvType === CSV_TYPES.OVERVIEW
      ? STORAGE_KEYS.STORE_OVERVIEW_DATA
      : STORAGE_KEYS.STORE_VIDEO_DATA;
    
    const indexedDBData = await getByIndex(storeName, 'accountId', accountId);
    
    if (indexedDBData && indexedDBData.length > 0) {
      // Sortera efter timestamp (senaste först) och returnera datan
      const sortedData = indexedDBData.sort((a, b) => b.timestamp - a.timestamp);
      
      if (sortedData[0].data && Array.isArray(sortedData[0].data)) {
        console.log(`Hittade ${sortedData[0].data.length} rader i IndexedDB`);
        
        // Ensure accountId is on each data item
        return sortedData[0].data.map(item => ({
          ...item,
          accountId: accountId
        }));
      }
    }
    
    // Fallback: Försök hämta från localStorage
    const localStorageKey = csvType === CSV_TYPES.OVERVIEW
      ? `${STORAGE_KEYS.OVERVIEW_DATA_PREFIX}${accountId}`
      : `${STORAGE_KEYS.VIDEO_DATA_PREFIX}${accountId}`;
    
    const localData = getFromLocalStorage(localStorageKey, null);
    
    if (localData && localData.data && Array.isArray(localData.data)) {
      console.log(`Hittade ${localData.data.length} rader i localStorage`);
      
      // Ensure accountId is on each data item
      return localData.data.map(item => ({
        ...item,
        accountId: accountId
      }));
    }
    
    console.log(`Ingen data hittades för ${csvType}`);
    return [];
  } catch (error) {
    console.error(`Fel vid hämtning av ${csvType}-data för konto ${accountId}:`, error);
    return [];
  }
};

// ----------------------------------------
// Filhantering
// ----------------------------------------

/**
 * Hanterar uppladdning av CSV-fil
 * @param {File} file - Filen att ladda upp
 * @returns {Promise<string>} - Filinnehåll som text
 */
export const handleFileUpload = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    
    reader.onerror = (error) => {
      console.error('Filläsningsfel:', error);
      reject(error);
    };
    
    reader.readAsText(file);
  });
};

/**
 * Hanterar nedladdning av data som fil
 * @param {string} data - Data att ladda ner
 * @param {string} filename - Filnamn
 * @param {string} type - MIME-typ
 * @returns {Object} - Status för nedladdningen
 */
export const downloadFile = (data, filename, type = 'text/csv') => {
  // Skapa blob och nedladdningslänk
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  
  // Skapa och klicka på en tillfällig länk
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  // Städa upp
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  }, 100);
  
  return { success: true, filePath: filename };
};

/**
 * Hanterar nedladdning av data som Excel-fil
 * @param {Array} data - Data att ladda ner
 * @param {string} filename - Filnamn
 * @returns {Promise<Object>} - Status för nedladdningen
 */
export const downloadExcel = async (data, filename) => {
  try {
    // Importera XLSX dynamiskt när funktionen anropas
    const XLSX = await import('xlsx');
    
    // Skapa arbetsbok
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'TikTok Statistik');
    
    // Konvertera till binärdata
    const excelData = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    // Skapa och ladda ner filen
    const blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Städa upp
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 100);
    
    return { success: true, filePath: filename };
  } catch (error) {
    console.error('Excel-nedladdningsfel:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Öppnar extern URL i en ny flik
 * @param {string} url - URL att öppna
 * @returns {boolean} - true om öppningen lyckades
 */
export const openExternalLink = (url) => {
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
};

// ----------------------------------------
// Lagringsutrymme statistik
// ----------------------------------------

/**
 * Hämtar statistik om lagringsutrymme
 * @returns {Promise<Object>} - Statistik om lagringsutrymme
 */
export const getStorageStats = async () => {
  try {
    // Beräkna localStorage-användning
    let localStorageUsed = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('tiktok_stats_')) {
        const value = localStorage.getItem(key);
        localStorageUsed += (key.length + value.length) * 2; // Approximation i bytes
      }
    }
    
    // IndexedDB-storlek är svårare att beräkna exakt, men vi kan uppskatta baserat på antal objekt
    let indexedDBStats = {
      accountsCount: 0,
      overviewDataCount: 0,
      videoDataCount: 0,
      estimatedSize: 0
    };
    
    // Hämta statistik för konton
    const accounts = await getAllFromIndexedDB(STORAGE_KEYS.STORE_ACCOUNTS);
    indexedDBStats.accountsCount = accounts.length;
    
    // Hämta statistik för overview data
    const overviewData = await getAllFromIndexedDB(STORAGE_KEYS.STORE_OVERVIEW_DATA);
    indexedDBStats.overviewDataCount = overviewData.length;
    
    // Hämta statistik för video data
    const videoData = await getAllFromIndexedDB(STORAGE_KEYS.STORE_VIDEO_DATA);
    indexedDBStats.videoDataCount = videoData.length;
    
    // Uppskatta storlek baserat på antal objekt (grov uppskattning)
    const accountsSize = JSON.stringify(accounts).length;
    const overviewSize = overviewData.reduce((total, item) => total + JSON.stringify(item).length, 0);
    const videoSize = videoData.reduce((total, item) => total + JSON.stringify(item).length, 0);
    
    indexedDBStats.estimatedSize = accountsSize + overviewSize + videoSize;
    
    return {
      localStorage: {
        used: localStorageUsed,
        limit: 5 * 1024 * 1024, // 5MB (generell begränsning)
        percentage: (localStorageUsed / (5 * 1024 * 1024)) * 100
      },
      indexedDB: indexedDBStats,
      total: {
        used: localStorageUsed + indexedDBStats.estimatedSize,
        percentage: ((localStorageUsed + indexedDBStats.estimatedSize) / (50 * 1024 * 1024)) * 100
      }
    };
  } catch (error) {
    console.error('Fel vid hämtning av lagringsstatistik:', error);
    return {
      error: error.message,
      localStorage: { used: 0, limit: 5 * 1024 * 1024, percentage: 0 },
      indexedDB: { accountsCount: 0, overviewDataCount: 0, videoDataCount: 0, estimatedSize: 0 },
      total: { used: 0, percentage: 0 }
    };
  }
};