/**
 * Databearbetning för TikTok-statistik
 * 
 * Funktioner för att bearbeta och aggregera statistikdata
 */
import { CSV_TYPES, OVERVIEW_ALL_FIELDS, VIDEO_ALL_FIELDS } from './constants';

/**
 * Konverterar ett stringvärde till ett numeriskt värde om möjligt
 * @param {string|number} value - Värdet att konvertera
 * @returns {number} - Konverterat numeriskt värde
 */
export const parseNumericValue = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  
  // Om värdet är en sträng, försök konvertera
  if (typeof value === 'string') {
    // Ta bort mellanslag, tusentalsavgränsare och byt ut eventuella kommatecken mot punkter
    const cleanValue = value
      .replace(/\s+/g, '')
      .replace(/\.(?=\d{3})/g, '')  // Ta bort punkter som är tusentalsavgränsare (före tre siffror)
      .replace(/,/g, '.');           // Ersätt komma med punkt för decimaltal
    
    // Försök konvertera till ett nummer
    const num = parseFloat(cleanValue);
    if (!isNaN(num)) {
      return num;
    }
  }
  
  // Om värdet redan är ett nummer, returnera det
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  // Fallback till 0 för värden som inte kan konverteras
  return 0;
};

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
    interactions = parseNumericValue(data.likes) + parseNumericValue(data.comments) + parseNumericValue(data.shares);
    divisor = parseNumericValue(data.reach);
  } else {
    // För videodata: (likes + comments + shares + favorites) / views * 100
    interactions = parseNumericValue(data.likes) + parseNumericValue(data.comments) + 
                  parseNumericValue(data.shares) + parseNumericValue(data.favorites);
    divisor = parseNumericValue(data.views);
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
    return parseNumericValue(data.likes) + parseNumericValue(data.comments) + parseNumericValue(data.shares);
  } else {
    // För videodata: likes + comments + shares + favorites
    return parseNumericValue(data.likes) + parseNumericValue(data.comments) + 
           parseNumericValue(data.shares) + parseNumericValue(data.favorites);
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
      const dateField = csvType === CSV_TYPES.OVERVIEW ? 'date' : 'publish_time';
      const rowDateStr = row[dateField];
      
      if (!rowDateStr) return false;
      
      try {
        const rowDate = new Date(rowDateStr);
        if (isNaN(rowDate.getTime())) return false;
        
        if (startDate && rowDate < startDate) return false;
        if (endDate && rowDate > endDate) return false;
        return true;
      } catch (e) {
        console.warn('Kunde inte parsa datum:', rowDateStr);
        return false;
      }
    });
  }
  
  // Hitta datumintervall
  let dateField = csvType === CSV_TYPES.OVERVIEW ? 'date' : 'publish_time';
  let dates = filteredData
    .map(row => row[dateField])
    .filter(date => date)
    .map(date => {
      try {
        const parsedDate = new Date(date);
        return isNaN(parsedDate.getTime()) ? null : parsedDate;
      } catch (e) {
        return null;
      }
    })
    .filter(date => date !== null);
  
  let dateRange = { startDate: null, endDate: null };
  if (dates.length > 0) {
    dateRange = {
      startDate: new Date(Math.min(...dates.map(d => d.getTime()))),
      endDate: new Date(Math.max(...dates.map(d => d.getTime())))
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
    
    // Beräkna summa med säker konvertering av värden
    totals[field] = filteredData.reduce((sum, row) => {
      return sum + parseNumericValue(row[field]);
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
      let dateStr;
      try {
        dateStr = new Date(row[dateField]).toLocaleDateString();
      } catch (e) {
        dateStr = String(row[dateField]);
      }
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
      // Handle 'Totalt' rows in special cases
      if (a.date === 'Totalt') return direction === 'asc' ? 1 : -1;
      if (b.date === 'Totalt') return direction === 'asc' ? -1 : 1;

      try {
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        
        // Only compare as dates if both are valid
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          return direction === 'asc' 
            ? aDate - bDate 
            : bDate - aDate;
        }
      } catch (e) {
        // Fall back to string comparison if date parsing fails
      }
    }

    // Hantering för numeriska värden
    const aNum = parseNumericValue(aValue);
    const bNum = parseNumericValue(bValue);
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return direction === 'asc' 
        ? aNum - bNum 
        : bNum - aNum;
    }

    // Fallback till strängsortering
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    return direction === 'asc' 
      ? aStr.localeCompare(bStr) 
      : bStr.localeCompare(aStr);
  });
};