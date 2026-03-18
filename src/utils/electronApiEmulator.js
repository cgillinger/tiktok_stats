/**
 * Electron API Emulator
 *
 * Ersätter Electron IPC med webbläsarens API:er så att befintlig kod
 * som använder window.electronAPI fungerar i en webbläsarkontext.
 */
import {
  handleFileUpload,
  downloadFile,
  downloadExcel,
  openExternalLink
} from './webStorageService';

export function initElectronApiEmulator() {
  if (typeof window === 'undefined') return;

  if (!window.electronAPI) {
    console.log('Initierar Electron API-emulator för webben');

    window.electronAPI = {
      // External links
      openExternalLink: (url) => openExternalLink(url),

      // Export functions
      exportToExcel: async (data, filename) => {
        return await downloadExcel(data, filename);
      },

      exportToCSV: async (data, filename) => {
        const Papa = await import('papaparse');
        const csvContent = Papa.unparse(data);
        return downloadFile(csvContent, filename, 'text/csv');
      },

      showSaveDialog: async (options) => {
        return {
          canceled: false,
          filePath: options.defaultPath || 'nedladdad-fil.csv'
        };
      }
    };

    console.log('Electron API-emulator initierad');
  }
}
