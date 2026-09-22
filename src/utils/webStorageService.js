/**
 * Web Storage Service
 *
 * Hanterar lagring av data i webbläsaren med stöd för:
 * - localStorage för konfiguration och små datamängder
 * - IndexedDB för större datauppsättningar
 * - Support för flera TikTok-konton
 *
 * Per konto lagras två dataset:
 *  - videoData: en rad per video (kanonisk data, dedupliceras på video_id)
 *  - monthData: en rad per uppladdad månad (dedupliceras på month)
 *
 * monthData är det som skiljer "CSV uppladdad men inga videor publicerade"
 * från "ingen CSV uppladdad" — utan den försvinner en tom månad spårlöst.
 */
import { STORAGE_KEYS } from './constants.js';

// Keep a reference to the database instance to prevent re-opening the connection
let dbInstance = null;

// ----------------------------------------
// IndexedDB hantering
// ----------------------------------------

const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STORAGE_KEYS.DB_NAME, STORAGE_KEYS.DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB-fel:', event.target.error);
      reject(event.target.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion || 0;

      // v1 lagrade daglig översiktsdata från det gamla CSV-formatet. Den datan
      // går inte att tolka om, så den rensas och användaren informeras.
      if (oldVersion > 0 && oldVersion < 2) {
        if (db.objectStoreNames.contains(STORAGE_KEYS.LEGACY_STORE_OVERVIEW_DATA)) {
          db.deleteObjectStore(STORAGE_KEYS.LEGACY_STORE_OVERVIEW_DATA);
        }
        if (db.objectStoreNames.contains(STORAGE_KEYS.STORE_ACCOUNTS)) {
          db.deleteObjectStore(STORAGE_KEYS.STORE_ACCOUNTS);
        }
        clearLegacyLocalStorage();
      }

      if (!db.objectStoreNames.contains(STORAGE_KEYS.STORE_ACCOUNTS)) {
        db.createObjectStore(STORAGE_KEYS.STORE_ACCOUNTS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORAGE_KEYS.STORE_VIDEO_DATA)) {
        const videoStore = db.createObjectStore(STORAGE_KEYS.STORE_VIDEO_DATA, { keyPath: 'id', autoIncrement: true });
        videoStore.createIndex('accountId', 'accountId', { unique: false });
      }

      // v3 lade till cachen för miniatyrer. Den innehåller bara hämtade bilder
      // och kan alltid byggas om, till skillnad från statistiken.
      if (!db.objectStoreNames.contains(STORAGE_KEYS.STORE_THUMBNAILS)) {
        db.createObjectStore(STORAGE_KEYS.STORE_THUMBNAILS, { keyPath: 'videoId' });
      }

      if (!db.objectStoreNames.contains(STORAGE_KEYS.STORE_MONTH_DATA)) {
        const monthStore = db.createObjectStore(STORAGE_KEYS.STORE_MONTH_DATA, { keyPath: 'id', autoIncrement: true });
        monthStore.createIndex('accountId', 'accountId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };
  });
};

const getDatabase = async () => {
  if (dbInstance) {
    return dbInstance;
  }
  return await openDatabase();
};

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

const deleteAccountData = async (accountId) => {
  try {
    for (const storeName of [STORAGE_KEYS.STORE_VIDEO_DATA, STORAGE_KEYS.STORE_MONTH_DATA]) {
      const items = await getByIndex(storeName, 'accountId', accountId);
      for (const item of items) {
        await deleteById(storeName, item.id);
      }
    }

    try {
      localStorage.removeItem(`${STORAGE_KEYS.VIDEO_DATA_PREFIX}${accountId}`);
      localStorage.removeItem(`${STORAGE_KEYS.MONTH_DATA_PREFIX}${accountId}`);
    } catch (e) {
      console.warn('Kunde inte ta bort från localStorage:', e);
    }

    return true;
  } catch (error) {
    console.error('Fel vid borttagning av kontodata:', error);
    return false;
  }
};

/**
 * Rensar localStorage-nycklar från v1 (gamla CSV-formatet) och flaggar att
 * det skett, så att gränssnittet kan förklara varför datan är borta.
 */
function clearLegacyLocalStorage() {
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('tiktok_stats_overview_data_') || key === STORAGE_KEYS.ACCOUNTS)) {
        toRemove.push(key);
      }
    }
    toRemove.forEach(key => localStorage.removeItem(key));
    localStorage.setItem(STORAGE_KEYS.LEGACY_DATA_CLEARED, '1');
  } catch (e) {
    console.warn('Kunde inte rensa gammal localStorage-data:', e);
  }
}

/**
 * True om data i det gamla formatet rensades vid senaste uppstart.
 */
export const consumeLegacyDataClearedFlag = () => {
  try {
    const wasCleared = localStorage.getItem(STORAGE_KEYS.LEGACY_DATA_CLEARED) === '1';
    if (wasCleared) localStorage.removeItem(STORAGE_KEYS.LEGACY_DATA_CLEARED);
    return wasCleared;
  } catch (e) {
    return false;
  }
};

// ----------------------------------------
// localStorage hantering
// ----------------------------------------

const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Fel vid sparande till localStorage (${key}):`, error);
    return false;
  }
};

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

export const getAccounts = async () => {
  try {
    let accounts = getFromLocalStorage(STORAGE_KEYS.ACCOUNTS, []);

    if (!accounts || accounts.length === 0) {
      accounts = await getAllFromIndexedDB(STORAGE_KEYS.STORE_ACCOUNTS);

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

export const saveAccount = async (account) => {
  try {
    let accounts = await getAccounts();

    if (account.id) {
      const index = accounts.findIndex(a => a.id === account.id);
      if (index !== -1) {
        accounts[index] = { ...accounts[index], ...account };
      } else {
        accounts.push(account);
      }
    } else {
      account.id = Date.now().toString();
      accounts.push(account);
    }

    await saveToIndexedDB(STORAGE_KEYS.STORE_ACCOUNTS, account);
    saveToLocalStorage(STORAGE_KEYS.ACCOUNTS, accounts);

    return account;
  } catch (error) {
    console.error('Fel vid sparande av konto:', error);
    throw error;
  }
};

export const deleteAccount = async (accountId) => {
  try {
    let accounts = await getAccounts();
    accounts = accounts.filter(a => a.id !== accountId);

    await deleteById(STORAGE_KEYS.STORE_ACCOUNTS, accountId);
    await deleteAccountData(accountId);
    saveToLocalStorage(STORAGE_KEYS.ACCOUNTS, accounts);

    return true;
  } catch (error) {
    console.error('Fel vid borttagning av konto:', error);
    return false;
  }
};

export const getAccount = async (accountId) => {
  try {
    const account = await getById(STORAGE_KEYS.STORE_ACCOUNTS, accountId);

    if (account) {
      return account;
    }

    const accounts = getFromLocalStorage(STORAGE_KEYS.ACCOUNTS, []);
    return accounts.find(a => a.id === accountId) || null;
  } catch (error) {
    console.error(`Fel vid hämtning av konto (${accountId}):`, error);
    return null;
  }
};

// ----------------------------------------
// Data hantering per konto
// ----------------------------------------

/**
 * Sparar data för ett konto.
 *
 * Videorader dedupliceras på video_id och månadsrader på month — nyaste
 * uppladdningen vinner. Det gör att flera månadsfiler för samma konto kan
 * laddas upp efter varandra utan att skriva över varandra.
 *
 * @param {string} accountId - Konto-ID
 * @param {Object} payload - { videos: Array, months: Array }
 * @param {Object} [options] - { merge: bool }
 * @returns {Promise<boolean>}
 */
export const saveAccountData = async (accountId, payload, options = {}) => {
  try {
    if (!accountId || !payload) {
      throw new Error('accountId och data krävs');
    }

    const videos = Array.isArray(payload.videos) ? payload.videos : [];
    const months = Array.isArray(payload.months) ? payload.months : [];

    let videosToSave = videos;
    let monthsToSave = months;

    if (options.merge) {
      const existingVideos = await getAccountData(accountId);
      const existingMonths = await getAccountMonths(accountId);

      if (existingVideos.length > 0) {
        // En ny fil är facit för de månader den täcker: befintliga videor i
        // samma månad rensas först, annars ligger borttagna videor kvar när
        // en månad laddas upp på nytt.
        const replacedMonths = new Set(months.map(m => m.month).filter(Boolean));

        const byId = {};
        existingVideos
          .filter(item => !replacedMonths.has(item.month))
          .forEach(item => {
            const key = item.video_id || item.url;
            if (key) byId[key] = item;
          });
        videos.forEach(item => {
          const key = item.video_id || item.url;
          if (key) byId[key] = item;
        });
        videosToSave = Object.values(byId);
      }

      if (existingMonths.length > 0) {
        const byMonth = {};
        existingMonths.forEach(item => {
          if (item.month) byMonth[item.month] = item;
        });
        months.forEach(item => {
          if (item.month) byMonth[item.month] = item;
        });
        monthsToSave = Object.values(byMonth);
      }
    }

    monthsToSave = [...monthsToSave].sort((a, b) =>
      String(a.month).localeCompare(String(b.month)));

    const stampedVideos = videosToSave.map(item => ({ ...item, accountId }));
    const stampedMonths = monthsToSave.map(item => ({ ...item, accountId }));

    console.log(
      `Sparar data för konto ${accountId}: ` +
      `${stampedVideos.length} videor, ${stampedMonths.length} månader`
    );

    await replaceStoreData(STORAGE_KEYS.STORE_VIDEO_DATA, STORAGE_KEYS.VIDEO_DATA_PREFIX, accountId, stampedVideos);
    await replaceStoreData(STORAGE_KEYS.STORE_MONTH_DATA, STORAGE_KEYS.MONTH_DATA_PREFIX, accountId, stampedMonths);

    // Update account status
    const account = await getAccount(accountId);
    if (account) {
      await saveAccount({
        ...account,
        hasData: stampedMonths.length > 0,
        lastUpdate: Date.now(),
        videoCount: stampedVideos.length,
        monthCount: stampedMonths.length,
        months: stampedMonths.map(m => m.month),
      });
    }

    return true;
  } catch (error) {
    console.error(`Fel vid sparande av data för konto ${accountId}:`, error);
    return false;
  }
};

const replaceStoreData = async (storeName, localStoragePrefix, accountId, data) => {
  const dataWithMeta = { accountId, timestamp: Date.now(), data };

  const dataSize = JSON.stringify(data).length;
  if (dataSize < 1000000) {
    saveToLocalStorage(`${localStoragePrefix}${accountId}`, dataWithMeta);
  } else {
    try {
      localStorage.removeItem(`${localStoragePrefix}${accountId}`);
    } catch (e) { /* ignorera */ }
  }

  const existingItems = await getByIndex(storeName, 'accountId', accountId);
  for (const item of existingItems) {
    await deleteById(storeName, item.id);
  }

  await saveToIndexedDB(storeName, dataWithMeta);
};

const readStoreData = async (storeName, localStoragePrefix, accountId) => {
  try {
    if (!accountId) throw new Error('accountId krävs');

    const indexedDBData = await getByIndex(storeName, 'accountId', accountId);

    if (indexedDBData && indexedDBData.length > 0) {
      const sorted = indexedDBData.sort((a, b) => b.timestamp - a.timestamp);
      if (Array.isArray(sorted[0].data)) {
        return sorted[0].data.map(item => ({ ...item, accountId }));
      }
    }

    const localData = getFromLocalStorage(`${localStoragePrefix}${accountId}`, null);
    if (localData && Array.isArray(localData.data)) {
      return localData.data.map(item => ({ ...item, accountId }));
    }

    return [];
  } catch (error) {
    console.error(`Fel vid hämtning från ${storeName} för konto ${accountId}:`, error);
    return [];
  }
};

/**
 * Hämtar videoraderna för ett konto.
 * @param {string} accountId
 * @returns {Promise<Array>}
 */
export const getAccountData = async (accountId) =>
  readStoreData(STORAGE_KEYS.STORE_VIDEO_DATA, STORAGE_KEYS.VIDEO_DATA_PREFIX, accountId);

/**
 * Hämtar månadsraderna för ett konto - dvs. vilka månader det finns en
 * uppladdad CSV för, inklusive månader utan publicerade videor.
 * @param {string} accountId
 * @returns {Promise<Array>}
 */
export const getAccountMonths = async (accountId) =>
  readStoreData(STORAGE_KEYS.STORE_MONTH_DATA, STORAGE_KEYS.MONTH_DATA_PREFIX, accountId);

// ----------------------------------------
// Miniatyrcache
// ----------------------------------------

/**
 * Miniatyrer cachas som bytes, inte som URL:er - TikToks bild-URL:er är
 * signerade och slutar fungera efter ungefär ett dygn.
 */
export const getCachedThumbnail = async (videoId) => {
  try {
    if (!videoId) return null;
    const entry = await getById(STORAGE_KEYS.STORE_THUMBNAILS, videoId);
    return entry?.blob || null;
  } catch (error) {
    console.warn('Kunde inte läsa miniatyr ur cachen:', error);
    return null;
  }
};

export const cacheThumbnail = async (videoId, blob) => {
  try {
    if (!videoId || !blob) return false;
    await saveToIndexedDB(STORAGE_KEYS.STORE_THUMBNAILS, {
      videoId,
      blob,
      cachedAt: Date.now(),
    });
    return true;
  } catch (error) {
    console.warn('Kunde inte spara miniatyr i cachen:', error);
    return false;
  }
};

/**
 * Töms när användaren stänger av miniatyrerna, så att inget hämtat
 * material blir kvar mot användarens vilja.
 */
export const clearThumbnailCache = async () => {
  try {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORAGE_KEYS.STORE_THUMBNAILS], 'readwrite');
      const request = transaction.objectStore(STORAGE_KEYS.STORE_THUMBNAILS).clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Kunde inte tömma miniatyrcachen:', error);
    return false;
  }
};

// ----------------------------------------
// Filhantering
// ----------------------------------------

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

export const downloadFile = (data, filename, type = 'text/csv') => {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  }, 100);

  return { success: true, filePath: filename };
};

export const downloadExcel = async (data, filename) => {
  try {
    const XLSX = await import('xlsx');

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'TikTok Statistik');

    const excelData = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    const blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

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

export const openExternalLink = (url) => {
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
};

// ----------------------------------------
// Lagringsutrymme statistik
// ----------------------------------------

export const getStorageStats = async () => {
  try {
    let localStorageUsed = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('tiktok_stats_')) {
        const value = localStorage.getItem(key);
        localStorageUsed += (key.length + value.length) * 2;
      }
    }

    let indexedDBStats = {
      accountsCount: 0,
      videoDataCount: 0,
      monthDataCount: 0,
      estimatedSize: 0
    };

    const accounts = await getAllFromIndexedDB(STORAGE_KEYS.STORE_ACCOUNTS);
    indexedDBStats.accountsCount = accounts.length;

    const videoData = await getAllFromIndexedDB(STORAGE_KEYS.STORE_VIDEO_DATA);
    const monthData = await getAllFromIndexedDB(STORAGE_KEYS.STORE_MONTH_DATA);

    indexedDBStats.videoDataCount = videoData.reduce(
      (total, item) => total + (Array.isArray(item.data) ? item.data.length : 0), 0);
    indexedDBStats.monthDataCount = monthData.reduce(
      (total, item) => total + (Array.isArray(item.data) ? item.data.length : 0), 0);

    const sizeOf = (items) => items.reduce((total, item) => total + JSON.stringify(item).length, 0);
    indexedDBStats.estimatedSize = JSON.stringify(accounts).length + sizeOf(videoData) + sizeOf(monthData);

    return {
      localStorage: {
        used: localStorageUsed,
        limit: 5 * 1024 * 1024,
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
      indexedDB: { accountsCount: 0, videoDataCount: 0, monthDataCount: 0, estimatedSize: 0 },
      total: { used: 0, percentage: 0 }
    };
  }
};
