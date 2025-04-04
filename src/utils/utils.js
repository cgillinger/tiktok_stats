import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Kombinerar CSS-klasser och hanterar Tailwind-konflikter
 * @param  {...any} inputs - CSS-klasser att kombinera
 * @returns {string} - Kombinerade CSS-klasser
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Formaterar ett datum enligt svensk standard
 * @param {Date|string} date - Datum att formatera
 * @returns {string} - Formaterat datum
 */
export function formatDate(date) {
  if (!date) return '';
  
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Formaterar ett datum med tid enligt svensk standard
 * @param {Date|string} date - Datum att formatera
 * @returns {string} - Formaterat datum och tid
 */
export function formatDateTime(date) {
  if (!date) return '';
  
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('Error formatting date time:', error);
    return '';
  }
}

/**
 * Formaterar ett nummer med tusentalsavgränsare
 * @param {number} number - Nummer att formatera
 * @returns {string} - Formaterat nummer
 */
export function formatNumber(number) {
  if (number === null || number === undefined) return '-';
  if (number === 0) return '0';
  
  try {
    return new Intl.NumberFormat('sv-SE').format(number)
  } catch (error) {
    console.error('Error formatting number:', error);
    return String(number);
  }
}

/**
 * Kopierar ett rent värde till urklipp
 * @param {number|string} value - Värdet att kopiera
 * @returns {Promise<boolean>} - true om kopiering lyckades
 */
export async function copyToClipboard(value) {
  try {
    // Säkerställ att vi har ett rent värde
    const cleanValue = String(value).trim();
    
    // Använd Clipboard API om tillgänglig
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(cleanValue);
      return true;
    }
    
    // Fallback för äldre webbläsare
    const textArea = document.createElement('textarea');
    textArea.value = cleanValue;
    
    // Placera elementet utanför skärmen
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    
    // Välj texten och kopiera
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    
    // Städa upp
    document.body.removeChild(textArea);
    
    return success;
  } catch (error) {
    console.error('Fel vid kopiering till urklipp:', error);
    return false;
  }
}

/**
 * Validerar en CSV-fil
 * @param {File} file - Filen att validera
 * @returns {boolean} - true om filen är giltig
 */
export function isValidCSVFile(file) {
  return file && (
    file.type === 'text/csv' ||
    file.name.toLowerCase().endsWith('.csv')
  )
}

/**
 * Genererar en unik ID-sträng
 * @returns {string} - Unik ID
 */
export function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * Trunkerar text till en viss längd och lägger till "..." i slutet
 * @param {string} text - Text att trunkera
 * @param {number} maxLength - Maximal längd
 * @returns {string} - Trunkerad text
 */
export function truncateText(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
}

/**
 * Hämtar initialer från ett namn (upp till 2 bokstäver)
 * @param {string} name - Namn att hämta initialer från
 * @returns {string} - Initialer (1-2 tecken)
 */
export function getInitials(name) {
  if (!name) return '';
  
  const parts = name.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Skapar ett färgvärde från en sträng (konsekvent för samma input)
 * @param {string} str - Strängen att basera färgen på
 * @returns {string} - HSL färgsträng
 */
export function stringToColor(str) {
  if (!str) return 'hsl(0, 0%, 60%)';
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Använd en ljus och färgstark färg
  const h = hash % 360;
  return `hsl(${h}, 70%, 60%)`;
}

/**
 * Förenklar ett filnamn för visning
 * @param {string} filename - Filnamn att förenkla
 * @returns {string} - Förenklat filnamn
 */
export function simplifyFilename(filename) {
  if (!filename) return '';
  
  // Ta bort .csv ändelse
  let simplified = filename.replace(/\.csv$/i, '');
  
  // Ta bort vanliga prefix/suffix
  simplified = simplified.replace(/^tiktok_/i, '');
  simplified = simplified.replace(/_data$/i, '');
  
  // Ersätt understreck med mellanslag
  simplified = simplified.replace(/_/g, ' ');
  
  return simplified;
}