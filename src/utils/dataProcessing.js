/**
 * Databearbetning för TikTok-statistik
 * 
 * Funktioner för att bearbeta och aggregera statistikdata
 */
import { CSV_TYPES, OVERVIEW_ALL_FIELDS, VIDEO_ALL_FIELDS } from './constants';

/**
 * Beräknar engagement rate baserat på vy-typ
 * @param {Object} data - Datarad med statistik
 * @param {string} csvType - CSV-typ (overview eller video)
 * @returns {number} - Engagement rate i procent
 */
export const calculateEngagementRate = (data, csvType) => {
  let interactions = 0;
  let divisor = 0;
  
  if (csvType === CSV_TYPES.OVERVIEW) {
    // För översiktsdata: (likes + comments + shares) / reach * 100
    interactions = (data.likes || 0) + (data.comments || 0) + (data.shares || 0);
    divisor = data.reach || 0;
  } else {
    // För videodata: (likes + comments + shares + favorites) / views * 100
    interactions = (data.likes || 0) + (data.comments || 0) + (data.shares || 0) + (data.favorites || 0);
    divisor = data.views || 0;
  }
  
  if (divisor === 0) return 0;
  return (interactions / divisor) * 100;
};

/**
 * Beräknar totala interaktioner baserat på vy-typ
 * @param {Object} data - Datarad med statistik
 * @param {string} csvType - CSV-typ (overview eller video)
 * @returns {number} - Totala interaktioner
 */
export const calculateInteractions = (data, csvType) => {
  if (csvType === CSV_TYPES.OVERVIEW) {
    // För översiktsdata: likes + comments + shares
    return (data.likes || 0) + (data.comments || 0) + (data.shares || 0);
  } else {
    // För videodata: likes + comments + shares + favorites
    return (data.likes || 0) + (data.comments || 0) + (data.shares || 0) + (data.favorites || 0);
  }
};

/**
 * Beräknar sammanfattningsstatistik för ett datumintervall
 * @param {Array} data - Array med datarader
 * @param {string} csvType - CSV-typ (overview eller video)
 * @param {Date} startDate - Startdatum (optional)
 * @param {Date} endDate - Slutdatum (optional)
 * @returns {Object} - Sammanfattningsstatistik
 */
export const calculateSummaryStats = (data, csvType, startDate = null, endDate = null) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      totalRows: 0,
      dateRange: { startDate: null, endDate: null },
      totals: {}
    };
  }
  
  // Filtrera data om datum är angivna
  let filteredData = data;
  if (startDate || endDate) {
    filteredData = data.filter(row => {
      const rowDate = csvType === CSV_TYPES.OVERVIEW 
        ? new Date(row.date) 
        : new Date(row.publish_time);
      
      if (startDate && rowDate < startDate) return false;
      if (endDate && rowDate > endDate) return false;
      return true;
    });
  }
  
  // Hitta datumintervall
  let dateField = csvType === CSV_TYPES.OVERVIEW ? 'date' : 'publish_time';
  let dates = filteredData
    .map(row => row[dateField])
    .filter(date => date)
    .map(date => new Date(date));
  
  let dateRange = { startDate: null, endDate: null };
  if (dates.length > 0) {
    dateRange = {
      startDate: new Date(Math.min(...dates)),
      endDate: new Date(Math.max(...dates))
    };
  }
  
  // Beräkna summor för olika fält
  const totals = {};
  const fields = csvType === CSV_TYPES.OVERVIEW 
    ? Object.keys(OVERVIEW_ALL_FIELDS) 
    : Object.keys(VIDEO_ALL_FIELDS);
  
  fields.forEach(field => {
    // Hoppa över icke-numeriska fält och datum
    if (field === 'date' || field === 'publish_time' || 
        field === 'title' || field === 'link' ||
        field === 'engagement_rate') {
      return;
    }
    
    // Beräkna summa
    totals[field] = filteredData.reduce((sum, row) => {
      return sum + (typeof row[field] === 'number' ? row[field] : 0);
    }, 0);
  });
  
  // Beräkna genomsnittlig engagement rate
  const engagementRates = filteredData.map(row => calculateEngagementRate(row, csvType));
  totals.engagement_rate = engagementRates.length > 0 
    ? engagementRates.reduce((sum, rate) => sum + rate, 0) / engagementRates.length 
    : 0;
  
  return {
    totalRows: filteredData.length,
    dateRange,
    totals
  };
};

/**
 * Filtrerar data baserat på söktermer
 * @param {Array} data - Array med datarader
 * @param {string} searchTerm - Sökterm
 * @param {string} csvType - CSV-typ (overview eller video)
 * @returns {Array} - Filtrerad data
 */
export const filterData = (data, searchTerm, csvType) => {
  if (!data || !Array.isArray(data) || !searchTerm) {
    return data || [];
  }
  
  const search = searchTerm.toLowerCase();
  
  return data.filter(row => {
    // För videodata, sök i titel och länk
    if (csvType === CSV_TYPES.VIDEO) {
      if (row.title && row.title.toLowerCase().includes(search)) return true;
      if (row.link && row.link.toLowerCase().includes(search)) return true;
    }
    
    // Sök i datum
    const dateField = csvType === CSV_TYPES.OVERVIEW ? 'date' : 'publish_time';
    if (row[dateField]) {
      const dateStr = new Date(row[dateField]).toLocaleDateString();
      if (dateStr.toLowerCase().includes(search)) return true;
    }
    
    // Sök i övriga fält
    for (const key in row) {
      const value = row[key];
      if (value && String(value).toLowerCase().includes(search)) {
        return true;
      }
    }
    
    return false;
  });
};

/**
 * Sorterar data baserat på fält och riktning
 * @param {Array} data - Array med datarader 
 * @param {string} field - Fält att sortera på
 * @param {string} direction - Riktning (asc eller desc)
 * @returns {Array} - Sorterad data
 */
export const sortData = (data, field, direction = 'asc') => {
  if (!data || !Array.isArray(data) || !field) {
    return data || [];
  }
  
  return [...data].sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];

    // Hantera null-värden
    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return 1;
    if (bValue === null) return -1;

    // Specialhantering för datum
    if (field === 'date' || field === 'publish_time') {
      const aDate = new Date(aValue);
      const bDate = new Date(bValue);
      return direction === 'asc' 
        ? aDate - bDate 
        : bDate - aDate;
    }

    // Hantering för numeriska värden
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return direction === 'asc' 
        ? aValue - bValue 
        : bValue - aValue;
    }

    // Fallback till strängsortering
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    return direction === 'asc' 
      ? aStr.localeCompare(bStr) 
      : bStr.localeCompare(aStr);
  });
};