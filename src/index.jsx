import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { initElectronApiEmulator } from './utils/electronApiEmulator';

// Initialize the app without clearing data
// This allows data to persist between sessions
(async function() {
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