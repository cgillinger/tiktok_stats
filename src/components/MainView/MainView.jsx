import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
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
  PlusCircle
} from 'lucide-react';
import { SummaryView } from '../SummaryView/SummaryView';
import { VideoView } from '../VideoView/VideoView';
import { AccountsPage } from '../AccountsPage/AccountsPage';
import { ColumnMappingEditor } from '../ColumnMappingEditor/ColumnMappingEditor';
import { StorageStatus } from '../StorageStatus/StorageStatus';
import { useAccountManager } from '../AccountManager/useAccountManager';
import { getAccountData } from '@/utils/webStorageService';
import { 
  SUMMARY_VIEW_AVAILABLE_FIELDS, 
  VIDEO_VIEW_AVAILABLE_FIELDS,
  CSV_TYPES
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
    loadAccounts
  } = useAccountManager();
  
  const [activeTab, setActiveTab] = useState('summary');
  const [activeView, setActiveView] = useState('main');
  
  const [summaryData, setSummaryData] = useState([]);
  const [videoData, setVideoData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Fältval för respektive vy - initiera med tomma arrayer
  const [selectedSummaryFields, setSelectedSummaryFields] = useState([]);
  const [selectedVideoFields, setSelectedVideoFields] = useState([]);

  // Filtrera konto i vyerna
  const [filteredAccountId, setFilteredAccountId] = useState(null);

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

  // När vi återvänder från AccountsPage, uppdatera konton och data
  const handleReturnFromAccounts = async () => {
    setActiveView('main');
    await loadAccounts();
  };

  // Hantera kontofiltrering från vyerna
  const handleAccountFilter = (accountId) => {
    setFilteredAccountId(accountId);
    if (accountId !== 'all') {
      setSelectedAccountId(accountId);
    }
  };

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
            onClick={() => setActiveView('accounts')}
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
              onClick={() => setActiveView('accounts')}
              size="sm"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Lägg till fler konton
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
                onClick={() => setActiveView('accounts')}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Lägg till ditt första konto
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              />
            </TabsContent>
            
            <TabsContent value="video">
              <VideoView 
                data={videoData} 
                selectedFields={selectedVideoFields}
                account={getSelectedAccount()}
                accounts={accounts}
                onAccountFilter={handleAccountFilter}
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
              onClick={() => setActiveView('accounts')}
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