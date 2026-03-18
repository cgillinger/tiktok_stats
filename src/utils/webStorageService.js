/**
 * Web Storage Service
 *
 * Hanterar lagring av data i webbläsaren med stöd för:
 * - localStorage för konfiguration och små datamängder
 * - IndexedDB för större datauppsättningar
 * - Support för flera TikTok-konton
 */
import { STORAGE_KEYS } from './constants';

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

      if (!db.objectStoreNames.contains(STORAGE_KEYS.STORE_ACCOUNTS)) {
        db.createObjectStore(STORAGE_KEYS.STORE_ACCOUNTS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORAGE_KEYS.STORE_OVERVIEW_DATA)) {
        const overviewStore = db.createObjectStore(STORAGE_KEYS.STORE_OVERVIEW_DATA, { keyPath: 'id', autoIncrement: true });
        overviewStore.createIndex('accountId', 'accountId', { unique: false });
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
    const overviewData = await getByIndex(STORAGE_KEYS.STORE_OVERVIEW_DATA, 'accountId', accountId);

    for (const item of overviewData) {
      await deleteById(STORAGE_KEYS.STORE_OVERVIEW_DATA, item.id);
    }

    try {
      localStorage.removeItem(`${STORAGE_KEYS.OVERVIEW_DATA_PREFIX}${accountId}`);
    } catch (e) {
      console.warn('Kunde inte ta bort från localStorage:', e);
    }

    return true;
  } catch (error) {
    console.error('Fel vid borttagning av kontodata:', error);
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
 * Sparar CSV-data för ett specifikt konto
 * @param {string} accountId - Konto-ID
 * @param {Array} data - Data att spara
 * @param {Object} [options] - Options: { merge: bool } - om true, slå ihop med befintlig data (deduplicera på datum)
 * @returns {Promise<boolean>}
 */
export const saveAccountData = async (accountId, data, options = {}) => {
  try {
    if (!accountId || !data) {
      throw new Error('accountId och data krävs');
    }

    if (!Array.isArray(data)) {
      throw new Error('Data måste vara en array');
    }

    console.log(`Sparar data för konto ${accountId} (${data.length} rader)`);

    let dataToSave = data;

    if (options.merge) {
      // Hämta befintlig data och slå ihop
      const existing = await getAccountData(accountId);
      if (existing.length > 0) {
        // Deduplicera på datum - ny data vinner
        const existingByDate = {};
        existing.forEach(item => {
          if (item.date) existingByDate[item.date] = item;
        });
        data.forEach(item => {
          if (item.date) existingByDate[item.date] = item;
        });
        dataToSave = Object.values(existingByDate);
        console.log(`Sammanslagning: ${existing.length} befintliga + ${data.length} nya = ${dataToSave.length} unika rader`);
      }
    }

    const processedData = dataToSave.map(item => {
      const processed = { ...item, accountId };

      if (processed.date) {
        try {
          const date = new Date(processed.date);
          if (!isNaN(date.getTime())) {
            processed.date = date.toISOString();
          }
        } catch (e) {
          console.warn('Failed to format date:', processed.date);
        }
      }

      return processed;
    });

    const dataWithMeta = {
      accountId,
      timestamp: Date.now(),
      data: processedData
    };

    // For small datasets, also save in localStorage
    const dataSize = JSON.stringify(data).length;
    if (dataSize < 1000000) {
      saveToLocalStorage(`${STORAGE_KEYS.OVERVIEW_DATA_PREFIX}${accountId}`, dataWithMeta);
    }

    // Always save in IndexedDB
    const existingItems = await getByIndex(STORAGE_KEYS.STORE_OVERVIEW_DATA, 'accountId', accountId);
    for (const item of existingItems) {
      await deleteById(STORAGE_KEYS.STORE_OVERVIEW_DATA, item.id);
    }

    await saveToIndexedDB(STORAGE_KEYS.STORE_OVERVIEW_DATA, dataWithMeta);

    // Update account status
    const account = await getAccount(accountId);
    if (account) {
      await saveAccount({
        ...account,
        hasData: true,
        lastUpdate: Date.now(),
        rowCount: processedData.length
      });
    }

    console.log(`Data sparad (${processedData.length} rader)`);
    return true;
  } catch (error) {
    console.error(`Fel vid sparande av data för konto ${accountId}:`, error);
    return false;
  }
};

/**
 * Hämtar CSV-data för ett specifikt konto
 * @param {string} accountId - Konto-ID
 * @returns {Promise<Array>}
 */
export const getAccountData = async (accountId) => {
  try {
    if (!accountId) {
      throw new Error('accountId krävs');
    }

    console.log(`Hämtar data för konto ${accountId}`);

    // Try IndexedDB first
    const indexedDBData = await getByIndex(STORAGE_KEYS.STORE_OVERVIEW_DATA, 'accountId', accountId);

    if (indexedDBData && indexedDBData.length > 0) {
      const sortedData = indexedDBData.sort((a, b) => b.timestamp - a.timestamp);

      if (sortedData[0].data && Array.isArray(sortedData[0].data)) {
        console.log(`Hittade ${sortedData[0].data.length} rader i IndexedDB`);

        return sortedData[0].data.map(item => ({
          ...item,
          accountId: accountId
        }));
      }
    }

    // Fallback to localStorage
    const localData = getFromLocalStorage(`${STORAGE_KEYS.OVERVIEW_DATA_PREFIX}${accountId}`, null);

    if (localData && localData.data && Array.isArray(localData.data)) {
      console.log(`Hittade ${localData.data.length} rader i localStorage`);

      return localData.data.map(item => ({
        ...item,
        accountId: accountId
      }));
    }

    console.log(`Ingen data hittades för konto ${accountId}`);
    return [];
  } catch (error) {
    console.error(`Fel vid hämtning av data för konto ${accountId}:`, error);
    return [];
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
      overviewDataCount: 0,
      estimatedSize: 0
    };

    const accounts = await getAllFromIndexedDB(STORAGE_KEYS.STORE_ACCOUNTS);
    indexedDBStats.accountsCount = accounts.length;

    const overviewData = await getAllFromIndexedDB(STORAGE_KEYS.STORE_OVERVIEW_DATA);
    indexedDBStats.overviewDataCount = overviewData.length;

    const accountsSize = JSON.stringify(accounts).length;
    const overviewSize = overviewData.reduce((total, item) => total + JSON.stringify(item).length, 0);

    indexedDBStats.estimatedSize = accountsSize + overviewSize;

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
      indexedDB: { accountsCount: 0, overviewDataCount: 0, estimatedSize: 0 },
      total: { used: 0, percentage: 0 }
    };
  }
};
