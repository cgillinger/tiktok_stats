import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { 
  Settings, 
  Users,
  LayoutDashboard, 
  BatteryLow, 
  ListFilter,
  CheckCircle2,
  PlusCircle,
  RefreshCw,
  Trash2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { SummaryView } from '../SummaryView/SummaryView';
import { VideoView } from '../VideoView/VideoView';
import { AccountsPage } from '../AccountsPage/AccountsPage';
import { ColumnMappingEditor } from '../ColumnMappingEditor/ColumnMappingEditor';
import { StorageStatus } from '../StorageStatus/StorageStatus';
import { useAccountManager } from '../AccountManager/useAccountManager';
import { getAccountData } from '@/utils/webStorageService';
import { MultiFileUploader } from '../MultiFileUploader/MultiFileUploader';
import { 
  SUMMARY_VIEW_AVAILABLE_FIELDS, 
  VIDEO_VIEW_AVAILABLE_FIELDS,
  CSV_TYPES,
  STORAGE_KEYS
} from '@/utils/constants';

/**
 * Huvudkomponent för applikationens vy med förenklat arbetsflöde
 */
export function MainView() {
  // Datahantering och konton
  const { 
    accounts, 
    selectedAccountId, 
    getSelectedAccount, 
    setSelectedAccountId,
    loadAccounts,
    createAccount
  } = useAccountManager();
  
  const [activeTab, setActiveTab] = useState('summary');
  const [activeView, setActiveView] = useState('main');
  
  const [summaryData, setSummaryData] = useState([]);
  const [videoData, setVideoData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [resetConfirmation, setResetConfirmation] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState(null);

  // Fältval för respektive vy - med endast 'interactions' som förvalt fält för bättre UX
  const [selectedSummaryFields, setSelectedSummaryFields] = useState([
    'interactions'
  ]);
  const [selectedVideoFields, setSelectedVideoFields] = useState([
    'interactions'
  ]);

  // Filtrera konto i vyerna - sätt till 'all' som standard
  const [filteredAccountId, setFilteredAccountId] = useState('all');

  // Visa onboarding-vy om inga konton finns
  const [showOnboarding, setShowOnboarding] = useState(accounts.length === 0);
  
  // Uppdatera onboarding-status när accounts ändras
  useEffect(() => {
    setShowOnboarding(accounts.length === 0);
  }, [accounts]);

  // Hämta data för alla konton
  useEffect(() => {
    if (accounts.length === 0) return;
    
    const loadAllAccountsData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Hämta översiktsdata för alla konton
        const summaryPromises = accounts
          .filter(acc => acc.hasOverviewData)
          .map(async (acc) => {
            const data = await getAccountData(acc.id, CSV_TYPES.OVERVIEW);
            return data; // accountId is now already included in the data
          });
        
        // Hämta videodata för alla konton
        const videoPromises = accounts
          .filter(acc => acc.hasVideoData)
          .map(async (acc) => {
            const data = await getAccountData(acc.id, CSV_TYPES.VIDEO);
            return data; // accountId is now already included in the data
          });
        
        // Vänta på all data och kombinera
        const summaryResults = await Promise.all(summaryPromises);
        const videoResults = await Promise.all(videoPromises);
        
        // Slå ihop all data
        const allSummaryData = summaryResults.flat();
        const allVideoData = videoResults.flat();
        
        setSummaryData(allSummaryData);
        setVideoData(allVideoData);
      } catch (err) {
        console.error('Fel vid hämtning av data:', err);
        setError('Kunde inte hämta data för alla konton');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAllAccountsData();
  }, [accounts]);

  // Visa framgångsmeddelande
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  // Hantera återställning av all data med förbättrad felhantering och timeout
  const handleReset = async () => {
    try {
      setIsResetting(true);
      setResetError(null);
      
      // Rensa localStorage for all app data
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tiktok_stats_')) {
          localStorage.removeItem(key);
        }
      }

      // Set a timeout to handle cases where the IndexedDB deletion gets stuck
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Återställning tog för lång tid. Laddar om sidan...'));
        }, 5000); // 5 second timeout
      });

      // Delete the IndexedDB database
      const deleteDbPromise = new Promise((resolve, reject) => {
        try {
          const deleteRequest = window.indexedDB.deleteDatabase(STORAGE_KEYS.DB_NAME);

          deleteRequest.onerror = function(event) {
            console.error('Fel vid återställning av data:', event);
            reject(new Error('Kunde inte radera databasen'));
          };

          deleteRequest.onblocked = function(event) {
            console.warn('Databasen är blockerad. Några anslutningar kan fortfarande vara öppna.', event);
            // Still consider this successful as we're going to reload anyway
            resolve();
          };

          deleteRequest.onsuccess = function() {
            console.log('Database successfully deleted');
            resolve();
          };
        } catch (err) {
          // Handle any exceptions during the deletion process
          console.error('Exception during database deletion:', err);
          reject(err);
        }
      });

      // Race the database deletion against the timeout
      try {
        await Promise.race([deleteDbPromise, timeoutPromise]);
        // If we get here, either the DB was deleted or it timed out
        showSuccessMessage('All data har återställts. Laddar om sidan...');
      } catch (error) {
        console.error('Fel vid databorttagning:', error);
        showSuccessMessage('Återställningsprocessen slutförs. Laddar om sidan...');
      }
      
      // Always reload the page after a delay, regardless of whether the DB deletion succeeded
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error('Fel vid återställning av data:', err);
      setResetError(err.message || 'Ett fel uppstod vid återställning av data.');
      setIsResetting(false);
      // Still allow the user to cancel the operation
    }
  };

  // Forced reset with minimal error handling - for emergencies
  const forceReset = () => {
    // Clear localStorage
    localStorage.clear();
    
    // Don't wait for IndexedDB, just reload
    showSuccessMessage('Tvingar omstart av applikationen...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // Hantera navigationsflöde för AccountsPage
  // När användaren klickar på "Hantera konton" i huvudvyn ska de hamna på kontolistan direkt
  const handleManageAccounts = () => {
    setActiveView('accounts');
  };

  // När vi återvänder från AccountsPage, uppdatera konton och data
  const handleReturnFromAccounts = async () => {
    setActiveView('main');
    await loadAccounts();
  };

  // Hantera kontofiltrering från vyerna
  const handleAccountFilter = (accountId) => {
    setFilteredAccountId(accountId);
    // Uppdatera även det valda kontot i useAccountManager för att hålla UI konsekvent
    setSelectedAccountId(accountId);
  };

  // Hantera framgång med att skapa första kontot och ladda upp data
  const handleInitialSetupSuccess = (result) => {
    if (result && result.account) {
      // Uppdatera kontolistan
      loadAccounts();
      
      // Visa framgångsmeddelande
      showSuccessMessage(`Kontot "${result.account.name}" har konfigurerats framgångsrikt`);
      
      // Stäng onboarding-vyn
      setShowOnboarding(false);
      
      // Gå till huvudvyn
      setActiveView('main');
    }
  };

  // Reset confirmation dialog
  if (resetConfirmation) {
    return (
      <div className="space-y-4">
        <button 
          onClick={() => {
            if (!isResetting) {
              setResetConfirmation(false);
            }
          }}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          disabled={isResetting}
        >
          <LayoutDashboard className="h-4 w-4 mr-1" />
          Tillbaka
        </button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Återställ alla data</AlertTitle>
          <AlertDescription>
            <div className="space-y-4 mt-2">
              <p>
                Är du säker på att du vill återställa all data? Detta kommer att:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Ta bort alla konton och deras inställningar</li>
                <li>Radera all statistikdata från översikts- och videodata</li>
                <li>Återställa alla kolumnmappningar till standard</li>
              </ul>
              <p className="font-bold text-red-600">
                Denna åtgärd kan inte ångras!
              </p>
              
              {resetError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{resetError}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex space-x-4 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (!isResetting) {
                      setResetConfirmation(false);
                    }
                  }}
                  disabled={isResetting}
                >
                  Avbryt
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleReset}
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Återställer...
                    </>
                  ) : (
                    'Återställ all data'
                  )}
                </Button>
                
                {isResetting && (
                  <Button 
                    variant="destructive"
                    onClick={forceReset}
                    className="ml-2"
                  >
                    Tvinga omstart
                  </Button>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Visa onboarding-vy om inga konton finns
  if (showOnboarding) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Välkommen till TikTok Statistik</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            Kom igång genom att skapa ditt första konto och ladda upp dina TikTok-data. 
            Både översiktsdata (daglig statistik) och videodata (specifik statistik för enskilda videor) stöds.
          </p>
          
          {/* Flyttad meny för att välja att fortsätta med sparad data eller rensa */}
          <div className="flex justify-center items-center mb-8">
            <div className="text-center px-5 py-4 border rounded-lg bg-gray-50 max-w-lg mx-auto">
              <p className="text-sm mb-3">Har du redan data sparad i webbläsaren?</p>
              <div className="flex justify-center space-x-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowOnboarding(false)}
                >
                  Visa sparad data
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setResetConfirmation(true)}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Rensa gammal data och börja från början
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Success message */}
        {successMessage && (
          <Alert className="bg-green-50 border-green-200 max-w-3xl mx-auto">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Klart!</AlertTitle>
            <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
          </Alert>
        )}
        
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Kom igång med TikTok Statistik</CardTitle>
            <CardDescription>
              Skapa ditt första konto och ladda upp TikTok-data för att börja analysera din statistik
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MultiFileUploader 
              account={null}
              onCreateAccount={createAccount}
              onSuccess={handleInitialSetupSuccess}
              onCancel={() => setShowOnboarding(false)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Visa kontohantering
  if (activeView === 'accounts') {
    return <AccountsPage onBack={handleReturnFromAccounts} />;
  }

  // Visa kolumnmappningshantering
  if (activeView === 'settings') {
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => setActiveView('main')}
        >
          <LayoutDashboard className="h-4 w-4 mr-2" />
          Tillbaka till huvudvyn
        </Button>
        <ColumnMappingEditor 
          onBack={() => setActiveView('main')}
        />
      </div>
    );
  }
  
  // Visa lagringsstatistik
  if (activeView === 'storage') {
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => setActiveView('main')}
        >
          <LayoutDashboard className="h-4 w-4 mr-2" />
          Tillbaka till huvudvyn
        </Button>
        <StorageStatus />
      </div>
    );
  }

  // Visa huvudvyn
  return (
    <div className="space-y-6">
      {/* Rubrik och knappar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">TikTok-statistik</h1>
          <p className="text-muted-foreground">
            Analysera och visualisera din TikTok-data
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleManageAccounts}
            title="Hantera konton och filer"
          >
            <Users className="h-4 w-4 mr-2" />
            <span className="sm:inline hidden">Hantera konton</span>
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => setActiveView('settings')}
            title="Hantera kolumnmappningar"
          >
            <ListFilter className="h-4 w-4 mr-2" />
            <span className="sm:inline hidden">Kolumnmappningar</span>
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={() => setActiveView('storage')}
            title="Visa lagringsstatus"
          >
            <BatteryLow className="h-4 w-4" />
            <span className="sr-only">Lagringsstatus</span>
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={() => setResetConfirmation(true)}
            title="Återställ data"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Återställ data</span>
          </Button>
        </div>
      </div>
      
      {/* Felmeddelande */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Fel</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Framgångsmeddelande */}
      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Klart!</AlertTitle>
          <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
        </Alert>
      )}
      
      {/* Kontoöversikt */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Konton och data</CardTitle>
            <Button 
              onClick={handleManageAccounts}
              size="sm"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Hantera konton
            </Button>
          </div>
          <CardDescription>
            Dina TikTok-konton och deras data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center p-6 border border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">Du har inga konton ännu</p>
              <Button 
                onClick={handleManageAccounts}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Lägg till ditt första konto
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Visa 'Alla konton' ruta först */}
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedAccountId === 'all' 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedAccountId('all')}
              >
                <h3 className="font-medium mb-1">Alla konton</h3>
                <p className="text-xs text-muted-foreground mb-2">Visa data från alla konton</p>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700`}>
                    Visar alla data
                  </span>
                </div>
              </div>
              
              {/* Visa alla individuella konton */}
              {accounts.map(account => (
                <div 
                  key={account.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedAccountId === account.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedAccountId(account.id)}
                >
                  <h3 className="font-medium mb-1">{account.name}</h3>
                  {account.username && (
                    <p className="text-xs text-muted-foreground mb-2">@{account.username}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${account.hasOverviewData ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      Översiktsdata {account.hasOverviewData ? '✓' : '–'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${account.hasVideoData ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      Videodata {account.hasVideoData ? '✓' : '–'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Visualiseringsvy om data finns */}
      {(summaryData.length > 0 || videoData.length > 0) && (
        <>
          {/* Välj värden att visa */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-lg">Välj värden att visa</CardTitle>
              <CardDescription>
                Välj vilka värden som ska visas i tabellerna nedan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Display the field selection UI based on activeTab without tabs UI */}
              <div className="flex space-x-4 mb-4">
                <button 
                  onClick={() => setActiveTab('summary')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${activeTab === 'summary' 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:bg-muted/30'}`}
                >
                  Översiktsdata
                </button>
                <button 
                  onClick={() => setActiveTab('video')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${activeTab === 'video' 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:bg-muted/30'}`}
                >
                  Videodata
                </button>
              </div>
              
              {activeTab === 'summary' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {Object.entries(SUMMARY_VIEW_AVAILABLE_FIELDS).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`summary-${key}`}
                        checked={selectedSummaryFields.includes(key)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSummaryFields([...selectedSummaryFields, key]);
                          } else {
                            setSelectedSummaryFields(selectedSummaryFields.filter(f => f !== key));
                          }
                        }}
                      />
                      <Label htmlFor={`summary-${key}`}>{label}</Label>
                    </div>
                  ))}
                </div>
              )}
              
              {activeTab === 'video' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {Object.entries(VIDEO_VIEW_AVAILABLE_FIELDS).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`video-${key}`}
                        checked={selectedVideoFields.includes(key)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedVideoFields([...selectedVideoFields, key]);
                          } else {
                            setSelectedVideoFields(selectedVideoFields.filter(f => f !== key));
                          }
                        }}
                      />
                      <Label htmlFor={`video-${key}`}>{label}</Label>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Data-innehåll med TabsList - keep this one */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="summary">Översiktsdata</TabsTrigger>
              <TabsTrigger value="video">Videodata</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary">
              <SummaryView 
                data={summaryData} 
                selectedFields={selectedSummaryFields}
                account={getSelectedAccount()}
                accounts={accounts}
                onAccountFilter={handleAccountFilter}
                initialSelectedAccountId={selectedAccountId}  // Skicka med valt konto-ID
              />
            </TabsContent>
            
            <TabsContent value="video">
              <VideoView 
                data={videoData} 
                selectedFields={selectedVideoFields}
                account={getSelectedAccount()}
                accounts={accounts}
                onAccountFilter={handleAccountFilter}
                initialSelectedAccountId={selectedAccountId}  // Skicka med valt konto-ID
              />
            </TabsContent>
          </Tabs>
        </>
      )}
      
      {/* Visa uppmaning att ladda upp data om det saknas */}
      {accounts.length > 0 && summaryData.length === 0 && videoData.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">Ingen data finns tillgänglig ännu</p>
            <Button 
              onClick={handleManageAccounts}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Lägg till data
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}