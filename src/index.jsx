import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { initElectronApiEmulator } from './utils/electronApiEmulator';
import { STORAGE_KEYS } from './utils/constants';

// Clear app data from previous sessions
const clearAppData = async () => {
  console.log('Clearing app data from previous session...');
  
  // Clear localStorage data related to the app
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('tiktok_stats_')) {
      localStorage.removeItem(key);
    }
  }
  
  // Clear IndexedDB data
  try {
    const DBDeleteRequest = window.indexedDB.deleteDatabase(STORAGE_KEYS.DB_NAME);
    
    DBDeleteRequest.onerror = function() {
      console.error("Error deleting IndexedDB database");
    };
    
    DBDeleteRequest.onsuccess = function() {
      console.log("IndexedDB database successfully deleted");
    };
  } catch (error) {
    console.error('Error clearing IndexedDB:', error);
  }
  
  console.log('App data cleared successfully');
};

// Initialize the app after clearing data
(async function() {
  await clearAppData();
  
  // Initialize Electron API emulator for web environment
  initElectronApiEmulator();
  
  const container = document.getElementById('root');
  
  if (!container) {
    console.error("❌ Root-elementet kunde inte hittas! Kontrollera 'index.html'");
  } else {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
})();