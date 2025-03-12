import { useState, useEffect, useCallback } from 'react';
import { getStorageStats } from '@/utils/webStorageService';
import { STORAGE_LIMITS } from '@/utils/constants';

/**
 * Hook för att övervaka lagringsutrymme
 * @returns {Object} Data och funktioner för lagringsövervakning
 */
export function useStorageMonitor() {
  const [storageStats, setStorageStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Hämta lagringsstatistik
  const fetchStorageStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const stats = await getStorageStats();
      setStorageStats(stats);
    } catch (err) {
      console.error('Fel vid hämtning av lagringsstatistik:', err);
      setError('Kunde inte hämta lagringsstatistik');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Uppdatera lagringsstatistik när komponenten monteras
  useEffect(() => {
    fetchStorageStats();
  }, [fetchStorageStats]);

  // Beräkna lagringsstatus
  const getStorageStatus = useCallback(() => {
    if (!storageStats) return 'unknown';
    
    const { localStorage, total } = storageStats;
    
    // Kontrollera localStorage (som har hårdare begränsningar)
    if (localStorage.percentage > 90) {
      return 'critical';
    }
    
    if (localStorage.percentage > 75) {
      return 'warning';
    }
    
    // Kontrollera total lagring
    if (total.percentage > STORAGE_LIMITS.INDEXED_DB_WARNING / 1024 / 1024 * 100) {
      return 'warning';
    }
    
    return 'ok';
  }, [storageStats]);

  // Få en beskrivande text om lagringsstatus
  const getStatusDescription = useCallback(() => {
    if (!storageStats) return 'Hämtar lagringsinformation...';
    
    const { localStorage, total } = storageStats;
    const status = getStorageStatus();
    
    if (status === 'critical') {
      return 'Lagringsutrymmet är nästan fullt. Radera data för att fortsätta använda appen.';
    }
    
    if (status === 'warning') {
      return 'Lagringsutrymmet börjar bli fullt. Överväg att radera onödig data.';
    }
    
    // Formatera storlekar till läsbara enheter
    const formatSize = (bytes) => {
      const kb = bytes / 1024;
      if (kb < 1000) return `${kb.toFixed(1)} KB`;
      return `${(kb / 1024).toFixed(1)} MB`;
    };
    
    return `Använder ${formatSize(total.used)} av tillgängligt lagringsutrymme.`;
  }, [storageStats, getStorageStatus]);

  return {
    storageStats,
    isLoading,
    error,
    fetchStorageStats,
    getStorageStatus,
    getStatusDescription
  };
}