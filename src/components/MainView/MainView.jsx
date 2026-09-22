import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import {
  BatteryLow,
  CheckCircle2,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  Loader2,
  LayoutDashboard,
  Trash2,
  Upload,
  Info,
  Crown
} from 'lucide-react';
import { AccountView } from '../AccountView/AccountView';
import { MonthView } from '../MonthView/MonthView';
import { VideoView } from '../VideoView/VideoView';
import { LeaderboardView } from '../LeaderboardView/LeaderboardView';
import { cn } from '@/utils/utils';
import { StorageStatus } from '../StorageStatus/StorageStatus';
import { BatchUploader } from '../BatchUploader/BatchUploader';
import {
  getAccounts,
  getAccountData,
  getAccountMonths,
  consumeLegacyDataClearedFlag
} from '@/utils/webStorageService';
import {
  ACCOUNT_VIEW_AVAILABLE_FIELDS,
  MONTH_VIEW_AVAILABLE_FIELDS,
  VIDEO_VIEW_AVAILABLE_FIELDS,
  ENGAGEMENT_RATE_NOTE,
  STORAGE_KEYS
} from '@/utils/constants';

export function MainView() {
  const [accounts, setAccounts] = useState([]);
  const [allVideos, setAllVideos] = useState([]);
  const [allMonths, setAllMonths] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [legacyDataCleared, setLegacyDataCleared] = useState(false);

  const [activeTab, setActiveTab] = useState('accounts');
  const [activeView, setActiveView] = useState('main'); // 'main' | 'upload' | 'storage'

  const [resetConfirmation, setResetConfirmation] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState(null);

  // Fältval - separat state per vy
  const [selectedAccountFields, setSelectedAccountFields] = useState(['views', 'interactions', 'video_count']);
  const [selectedMonthFields, setSelectedMonthFields] = useState(['views', 'interactions', 'video_count']);
  const [selectedVideoFields, setSelectedVideoFields] = useState(['views', 'interactions']);

  const showSuccessMessage = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Körs en gång vid start - flaggan konsumeras (nollställs) av anropet
  useEffect(() => {
    if (consumeLegacyDataClearedFlag()) {
      setLegacyDataCleared(true);
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedAccounts = await getAccounts();
      setAccounts(loadedAccounts);

      const withData = loadedAccounts.filter(acc => acc.hasData);

      if (withData.length > 0) {
        const [videoResults, monthResults] = await Promise.all([
          Promise.all(withData.map(acc => getAccountData(acc.id))),
          Promise.all(withData.map(acc => getAccountMonths(acc.id))),
        ]);
        setAllVideos(videoResults.flat());
        setAllMonths(monthResults.flat());
      } else {
        setAllVideos([]);
        setAllMonths([]);
      }
    } catch (err) {
      console.error('Fel vid laddning av data:', err);
      setError('Kunde inte ladda data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUploadSuccess = async () => {
    await loadData();
    setActiveView('main');
    showSuccessMessage('Data har laddats upp framgångsrikt!');
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      setResetError(null);

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tiktok_stats_')) {
          localStorage.removeItem(key);
        }
      }

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      const deleteDbPromise = new Promise((resolve, reject) => {
        try {
          const req = window.indexedDB.deleteDatabase(STORAGE_KEYS.DB_NAME);
          req.onerror = () => reject(new Error('Kunde inte radera databasen'));
          req.onblocked = () => resolve();
          req.onsuccess = () => resolve();
        } catch (err) {
          reject(err);
        }
      });

      try {
        await Promise.race([deleteDbPromise, timeoutPromise]);
      } catch (err) {
        console.warn('DB deletion issue:', err);
      }

      showSuccessMessage('All data har återställts. Laddar om...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setResetError(err.message || 'Ett fel uppstod');
      setIsResetting(false);
    }
  };

  const forceReset = () => {
    localStorage.clear();
    showSuccessMessage('Tvingar omstart...');
    setTimeout(() => window.location.reload(), 1000);
  };

  const monthUniverseCount = new Set(allMonths.map(m => m.month)).size;

  const legacyClearedAlert = legacyDataCleared && (
    <Alert variant="info">
      <Info className="h-4 w-4" />
      <AlertTitle>Tidigare data har rensats</AlertTitle>
      <AlertDescription>
        Datan som låg lagrad var i det gamla CSV-formatet (TikToks dagliga översiktsexport),
        som inte längre stöds. Den har rensats automatiskt - ladda upp filerna på nytt i det
        nya formatet (en CSV per konto och månad) för att fortsätta.
      </AlertDescription>
    </Alert>
  );

  // Reset confirmation dialog
  if (resetConfirmation) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => !isResetting && setResetConfirmation(false)}
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
              <p>Är du säker? Detta tar bort alla konton och all statistikdata.</p>
              <p className="font-bold text-red-600">Denna åtgärd kan inte ångras!</p>

              {resetError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{resetError}</AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-4 justify-end">
                <Button
                  variant="outline"
                  onClick={() => !isResetting && setResetConfirmation(false)}
                  disabled={isResetting}
                >
                  Avbryt
                </Button>
                <Button variant="destructive" onClick={handleReset} disabled={isResetting}>
                  {isResetting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Återställer...</>
                  ) : 'Återställ all data'}
                </Button>
                {isResetting && (
                  <Button variant="destructive" onClick={forceReset}>
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

  // Storage view
  if (activeView === 'storage') {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setActiveView('main')}>
          <LayoutDashboard className="h-4 w-4 mr-2" />
          Tillbaka till huvudvyn
        </Button>
        <StorageStatus />
      </div>
    );
  }

  // Upload view (add more data)
  if (activeView === 'upload') {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setActiveView('main')}>
          <LayoutDashboard className="h-4 w-4 mr-2" />
          Tillbaka
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Lägg till data</CardTitle>
            <CardDescription>
              Ladda upp CSV-filer från tiktok-scrape - en fil per konto och månad - för ett
              eller flera konton. Om kontonamnet redan finns läggs månaden till.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BatchUploader
              onSuccess={handleUploadSuccess}
              onCancel={() => setActiveView('main')}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Tomt läge: visa uppladdaren när ingen enda CSV är uppladdad - inte bara
  // när videolistan är tom, eftersom en uppladdad men tom månad också ska
  // gå att se i "Per månad"-vyn
  if (allMonths.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold mb-2">TikTok Statistik</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Ladda upp CSV-filer från tiktok-scrape för att börja analysera din statistik.
            Varje fil är en export för ett konto och en månad.
          </p>
        </div>

        {legacyClearedAlert && (
          <div className="max-w-3xl mx-auto">{legacyClearedAlert}</div>
        )}

        {successMessage && (
          <Alert className="bg-green-50 border-green-200 max-w-3xl mx-auto">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Klart!</AlertTitle>
            <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="max-w-3xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Fel</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Kom igång</CardTitle>
            <CardDescription>
              Välj en eller flera CSV-filer och ange kontonamn för varje fil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BatchUploader onSuccess={handleUploadSuccess} />
          </CardContent>
        </Card>

        {accounts.length > 0 && allMonths.length === 0 && (
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResetConfirmation(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Rensa gammal data och börja om
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">TikTok-statistik</h1>
          <p className="text-muted-foreground text-sm">
            {accounts.length} konton · {monthUniverseCount} {monthUniverseCount === 1 ? 'månad' : 'månader'} · {allVideos.length.toLocaleString('sv')} videor
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setActiveView('upload')}>
            <Upload className="h-4 w-4 mr-2" />
            Lägg till data
          </Button>

          <Button
            variant="ghost"
            onClick={() => setActiveView('storage')}
            title="Lagringsstatus"
          >
            <BatteryLow className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            onClick={() => setResetConfirmation(true)}
            title="Återställ data"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      {legacyClearedAlert}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Fel</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Klart!</AlertTitle>
          <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Field selector + Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="accounts">Per konto</TabsTrigger>
          <TabsTrigger value="months">Per månad</TabsTrigger>
          <TabsTrigger value="videos">Per video</TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-1.5">
            <Crown className="h-3.5 w-3.5" />
            Topplista
          </TabsTrigger>
        </TabsList>

        {/* Fältväljare - topplistan har egna kontroller och behöver den inte */}
        <Card className={cn("mb-4", activeTab === 'leaderboard' && "hidden")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Välj värden att visa</CardTitle>
          </CardHeader>
          <CardContent>
            {activeTab === 'accounts' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Object.entries(ACCOUNT_VIEW_AVAILABLE_FIELDS).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`acct-${key}`}
                      checked={selectedAccountFields.includes(key)}
                      onCheckedChange={(checked) => {
                        setSelectedAccountFields(prev =>
                          checked ? [...prev, key] : prev.filter(f => f !== key)
                        );
                      }}
                    />
                    <Label htmlFor={`acct-${key}`} className="text-sm">{label}</Label>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'months' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Object.entries(MONTH_VIEW_AVAILABLE_FIELDS).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`month-${key}`}
                      checked={selectedMonthFields.includes(key)}
                      onCheckedChange={(checked) => {
                        setSelectedMonthFields(prev =>
                          checked ? [...prev, key] : prev.filter(f => f !== key)
                        );
                      }}
                    />
                    <Label htmlFor={`month-${key}`} className="text-sm">{label}</Label>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'videos' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Object.entries(VIDEO_VIEW_AVAILABLE_FIELDS).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`video-${key}`}
                      checked={selectedVideoFields.includes(key)}
                      onCheckedChange={(checked) => {
                        setSelectedVideoFields(prev =>
                          checked ? [...prev, key] : prev.filter(f => f !== key)
                        );
                      }}
                    />
                    <Label htmlFor={`video-${key}`} className="text-sm">{label}</Label>
                  </div>
                ))}
              </div>
            )}

            {/* Engagemangsnivån har bytt nämnare - förklara den där den väljs */}
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t">
              <span className="font-medium text-foreground">Engagemangsnivå (%):</span>{' '}
              {ENGAGEMENT_RATE_NOTE}
            </p>
          </CardContent>
        </Card>

        <TabsContent value="accounts">
          <AccountView
            data={allVideos}
            months={allMonths}
            selectedFields={selectedAccountFields}
            accounts={accounts}
          />
        </TabsContent>

        <TabsContent value="months">
          <MonthView
            months={allMonths}
            videos={allVideos}
            accounts={accounts}
            selectedFields={selectedMonthFields}
          />
        </TabsContent>

        <TabsContent value="videos">
          <VideoView
            videos={allVideos}
            accounts={accounts}
            selectedFields={selectedVideoFields}
          />
        </TabsContent>

        <TabsContent value="leaderboard">
          <LeaderboardView
            videos={allVideos}
            months={allMonths}
            accounts={accounts}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
