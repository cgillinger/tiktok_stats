import { useState, useEffect, useCallback } from 'react';
import { 
  getAccounts, 
  saveAccount, 
  deleteAccount,
  updateAccountDataStatus
} from '@/utils/webStorageService';
import { STORAGE_KEYS } from '@/utils/constants';

/**
 * Hook för hantering av TikTok-konton
 * @returns {Object} Funktioner och data för kontohantering
 */
export function useAccountManager() {
  const [accounts, setAccounts] = useState([]);
  // Ändra standardvärdet till 'all' istället för null
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Hämta alla konton när komponenten monteras
  const loadAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Hämta konton från lagring
      const fetchedAccounts = await getAccounts();
      setAccounts(fetchedAccounts || []);
      
      // Hämta senast valt konto från localStorage
      const lastSelectedId = localStorage.getItem(STORAGE_KEYS.LAST_SELECTED_ACCOUNT);
      
      // Om "all" är lagrat eller ingen tidigare inställning finns, använd "all"
      if (lastSelectedId === 'all' || !lastSelectedId) {
        setSelectedAccountId('all');
      }
      // Om ett specifikt konto var valt och det fortfarande finns, använd det
      else if (fetchedAccounts.some(acc => acc.id === lastSelectedId)) {
        setSelectedAccountId(lastSelectedId);
      } 
      // Annars använd 'all' som fallback
      else {
        setSelectedAccountId('all');
      }
    } catch (err) {
      console.error('Fel vid hämtning av konton:', err);
      setError('Kunde inte hämta konton: ' + (err.message || 'Okänt fel'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Spara valt konto i localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LAST_SELECTED_ACCOUNT, selectedAccountId);
  }, [selectedAccountId]);

  /**
   * Hämtar det valda kontot från listan
   * @returns {Object|null} Det valda kontot, eller null om inget är valt eller "alla" är valt
   */
  const getSelectedAccount = useCallback(() => {
    if (!selectedAccountId || selectedAccountId === 'all') return null;
    return accounts.find(acc => acc.id === selectedAccountId) || null;
  }, [selectedAccountId, accounts]);

  /**
   * Skapar ett nytt konto
   * @param {Object} accountData - Data för det nya kontot
   * @returns {Promise<Object>} Det skapade kontot
   */
  const createAccount = useCallback(async (accountData) => {
    try {
      setError(null);
      
      if (!accountData.name || accountData.name.trim() === '') {
        throw new Error('Kontonamn måste anges');
      }
      
      // Skapa nytt konto
      const newAccount = await saveAccount({
        ...accountData,
        hasOverviewData: false,
        hasVideoData: false,
        createdAt: Date.now(),
        lastUpdate: Date.now()
      });
      
      // Uppdatera listan med konton
      setAccounts(prev => [...prev, newAccount]);
      
      return newAccount;
    } catch (err) {
      console.error('Fel vid skapande av konto:', err);
      setError('Kunde inte skapa konto: ' + (err.message || 'Okänt fel'));
      throw err;
    }
  }, []);

  /**
   * Uppdaterar ett befintligt konto
   * @param {string} accountId - ID för kontot att uppdatera
   * @param {Object} accountData - Ny data för kontot
   * @returns {Promise<Object>} Det uppdaterade kontot
   */
  const updateAccount = useCallback(async (accountId, accountData) => {
    try {
      setError(null);
      
      if (!accountId) {
        throw new Error('Konto-ID måste anges');
      }
      
      if (!accountData.name || accountData.name.trim() === '') {
        throw new Error('Kontonamn måste anges');
      }
      
      // Hitta befintligt konto
      const existingAccount = accounts.find(acc => acc.id === accountId);
      if (!existingAccount) {
        throw new Error(`Hittade inget konto med ID ${accountId}`);
      }
      
      // Uppdatera konto
      const updatedAccount = await saveAccount({
        ...existingAccount,
        ...accountData,
        lastUpdate: Date.now()
      });
      
      // Uppdatera listan med konton
      setAccounts(prev => prev.map(acc => 
        acc.id === accountId ? updatedAccount : acc
      ));
      
      return updatedAccount;
    } catch (err) {
      console.error('Fel vid uppdatering av konto:', err);
      setError('Kunde inte uppdatera konto: ' + (err.message || 'Okänt fel'));
      throw err;
    }
  }, [accounts]);

  /**
   * Tar bort ett konto
   * @param {string} accountId - ID för kontot att ta bort
   * @returns {Promise<boolean>} true om borttagningen lyckades
   */
  const removeAccount = useCallback(async (accountId) => {
    try {
      setError(null);
      
      if (!accountId) {
        throw new Error('Konto-ID måste anges');
      }
      
      // Ta bort konto
      const result = await deleteAccount(accountId);
      
      if (result) {
        // Uppdatera listan med konton
        setAccounts(prev => prev.filter(acc => acc.id !== accountId));
        
        // Om det borttagna kontot var det valda, sätt tillbaka till 'all'
        if (selectedAccountId === accountId) {
          setSelectedAccountId('all');
        }
      }
      
      return result;
    } catch (err) {
      console.error('Fel vid borttagning av konto:', err);
      setError('Kunde inte ta bort konto: ' + (err.message || 'Okänt fel'));
      throw err;
    }
  }, [selectedAccountId]);

  /**
   * Uppdaterar ett kontos datastatus (har översiktsdata/videodata)
   * @param {string} accountId - ID för kontot att uppdatera
   * @param {Object} dataStatus - Ny datastatus ({ hasOverviewData, hasVideoData })
   * @returns {Promise<Object>} Det uppdaterade kontot
   */
  const updateDataStatus = useCallback(async (accountId, dataStatus) => {
    try {
      if (!accountId) {
        throw new Error('Konto-ID måste anges');
      }
      
      // Uppdatera kontostatus
      const updatedAccount = await updateAccountDataStatus(accountId, {
        ...dataStatus,
        lastUpdate: Date.now()
      });
      
      // Uppdatera listan med konton
      setAccounts(prev => prev.map(acc => 
        acc.id === accountId ? updatedAccount : acc
      ));
      
      return updatedAccount;
    } catch (err) {
      console.error('Fel vid uppdatering av kontostatus:', err);
      throw err;
    }
  }, []);

  return {
    accounts,
    selectedAccountId,
    isLoading,
    error,
    loadAccounts,
    getSelectedAccount,
    setSelectedAccountId,
    createAccount,
    updateAccount,
    removeAccount,
    updateDataStatus
  };
}