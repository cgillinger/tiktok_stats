import React from 'react';
import { MainView } from './components/MainView/MainView';

/**
 * Huvudapplikationskomponent
 */
function App() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="24" rx="6" fill="black"></rect>
                <path d="M15.6,9.57c0.6,0.43,1.3,0.7,2.05,0.75v-1.8c-0.17,0-0.34-0.02-0.5-0.05v1.39c-0.75-0.05-1.45-0.32-2.05-0.75v3.51 c0,2.42-2.1,4.42-4.65,4.42c-0.96,0-1.84-0.3-2.56-0.8c0.76,0.77,1.82,1.24,3,1.24c2.55,0,4.65-1.99,4.65-4.42V9.57z M17.15,7.27c-0.33-0.35-0.55-0.81-0.6-1.31v-0.24h-0.46C16.17,6.29,16.6,6.86,17.15,7.27z M10.12,15.97 c-0.54-0.38-0.9-1-0.9-1.71c0-1.17,0.96-2.12,2.14-2.12c0.18,0,0.35,0.02,0.51,0.07v-1.85c-0.17-0.02-0.35-0.03-0.52-0.01v1.42 c-0.16-0.04-0.34-0.06-0.51-0.06c-1.17,0-2.13,0.94-2.13,2.12C8.71,14.64,9.27,15.54,10.12,15.97z" fill="#00F2EA"></path>
                <path d="M16.09,5.72c0.06,0.5,0.28,0.96,0.61,1.31C17.25,6.62,17.68,6.06,17.76,5.4h-1.67V5.72z M13.25,12.01v-0.99 c-1.16-0.11-2.23,0.36-2.84,1.11C10.76,11.44,11.87,11.14,13.25,12.01z M9.22,14.26c0,0.7,0.36,1.32,0.9,1.7 c-0.85-0.43-1.41-1.33-1.41-2.34c0-1.17,0.96-2.12,2.14-2.12c0.18,0,0.36,0.03,0.52,0.07v-1.43c-0.17-0.01-0.34-0.01-0.51,0.01 v0.99c-0.17-0.04-0.34-0.07-0.52-0.07C10.17,12.08,9.22,13.03,9.22,14.26z M15.1,8.12c0.6,0.43,1.3,0.7,2.05,0.75V7.48 c-0.55-0.41-0.98-0.98-1.15-1.66h-0.9V9.57V13.08c0,2.42-2.1,4.42-4.65,4.42c-1.17,0-2.23-0.45-3-1.19 c0.72,0.49,1.61,0.79,2.56,0.79c2.55,0,4.65-1.99,4.65-4.42V9.15V5.4h1.4c0.16,0.03,0.33,0.05,0.5,0.05v-1.4 c-0.99-0.05-1.8-0.75-1.95-1.68h-1.45v7.74V8.12z" fill="#FF004F"></path>
              </svg>
              <div>
                <h1 className="text-xl font-bold text-foreground">TikTok Statistik</h1>
                <p className="text-xs text-muted-foreground">Analysera dina TikTok data lokalt</p>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground hidden md:block">
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span>Data bearbetas direkt i din webbläsare - inget skickas till någon server</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <MainView />
      </main>

      <footer className="border-t border-border mt-16">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center">
              <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="24" rx="6" fill="black"></rect>
                <path d="M15.6,9.57c0.6,0.43,1.3,0.7,2.05,0.75v-1.8c-0.17,0-0.34-0.02-0.5-0.05v1.39c-0.75-0.05-1.45-0.32-2.05-0.75v3.51 c0,2.42-2.1,4.42-4.65,4.42c-0.96,0-1.84-0.3-2.56-0.8c0.76,0.77,1.82,1.24,3,1.24c2.55,0,4.65-1.99,4.65-4.42V9.57z M17.15,7.27c-0.33-0.35-0.55-0.81-0.6-1.31v-0.24h-0.46C16.17,6.29,16.6,6.86,17.15,7.27z M10.12,15.97 c-0.54-0.38-0.9-1-0.9-1.71c0-1.17,0.96-2.12,2.14-2.12c0.18,0,0.35,0.02,0.51,0.07v-1.85c-0.17-0.02-0.35-0.03-0.52-0.01v1.42 c-0.16-0.04-0.34-0.06-0.51-0.06c-1.17,0-2.13,0.94-2.13,2.12C8.71,14.64,9.27,15.54,10.12,15.97z" fill="#00F2EA"></path>
                <path d="M16.09,5.72c0.06,0.5,0.28,0.96,0.61,1.31C17.25,6.62,17.68,6.06,17.76,5.4h-1.67V5.72z M13.25,12.01v-0.99 c-1.16-0.11-2.23,0.36-2.84,1.11C10.76,11.44,11.87,11.14,13.25,12.01z M9.22,14.26c0,0.7,0.36,1.32,0.9,1.7 c-0.85-0.43-1.41-1.33-1.41-2.34c0-1.17,0.96-2.12,2.14-2.12c0.18,0,0.36,0.03,0.52,0.07v-1.43c-0.17-0.01-0.34-0.01-0.51,0.01 v0.99c-0.17-0.04-0.34-0.07-0.52-0.07C10.17,12.08,9.22,13.03,9.22,14.26z M15.1,8.12c0.6,0.43,1.3,0.7,2.05,0.75V7.48 c-0.55-0.41-0.98-0.98-1.15-1.66h-0.9V9.57V13.08c0,2.42-2.1,4.42-4.65,4.42c-1.17,0-2.23-0.45-3-1.19 c0.72,0.49,1.61,0.79,2.56,0.79c2.55,0,4.65-1.99,4.65-4.42V9.15V5.4h1.4c0.16,0.03,0.33,0.05,0.5,0.05v-1.4 c-0.99-0.05-1.8-0.75-1.95-1.68h-1.45v7.74V8.12z" fill="#FF004F"></path>
              </svg>
              <div>
                <p className="text-sm font-medium">TikTok Statistik</p>
                <p className="text-xs text-muted-foreground">© {new Date().getFullYear()}</p>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>All data behandlas lokalt i din webbläsare</p>
              <p className="text-xs">Denna app har ingen koppling till TikTok eller ByteDance Ltd.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;