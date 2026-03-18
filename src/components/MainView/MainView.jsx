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
  Upload
} from 'lucide-react';
import { SummaryView } from '../SummaryView/SummaryView';
import { AccountView } from '../AccountView/AccountView';
import { StorageStatus } from '../StorageStatus/StorageStatus';
import { BatchUploader } from '../BatchUploader/BatchUploader';
import { getAccounts, getAccountData, deleteAccount } from '@/utils/webStorageService';
import {
  SUMMARY_VIEW_AVAILABLE_FIELDS,
  ACCOUNT_VIEW_AVAILABLE_FIELDS,
  STORAGE_KEYS
} from '@/utils/constants';

export function MainView() {
  const [accounts, setAccounts] = useState([]);
  const [allData, setAllData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [activeTab, setActiveTab] = useState('accounts');
  const [activeView, setActiveView] = useState('main'); // 'main' | 'upload' | 'storage'

  const [resetConfirmation, setResetConfirmation] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState(null);

  // Field selection - default to interactions for both views
  const [selectedSummaryFields, setSelectedSummaryFields] = useState(['interactions']);
  const [selectedAccountFields, setSelectedAccountFields] = useState(['video_views', 'interactions', 'new_followers']);

  // Selected account for SummaryView filter
  const [filteredAccountId, setFilteredAccountId] = useState('all');

  const showSuccessMessage = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedAccounts = await getAccounts();
      setAccounts(loadedAccounts);

      if (loadedAccounts.length > 0) {
        const dataPromises = loadedAccounts
          .filter(acc => acc.hasData)
          .map(acc => getAccountData(acc.id));

        const results = await Promise.all(dataPromises);
        setAllData(results.flat());
      } else {
        setAllData([]);
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
              Ladda upp TikTok-exportfiler (daglig översiktsdata) för ett eller flera konton.
              Om kontonamnet redan finns läggs data till (dubbletter på datum tas bort).
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

  // No data: show uploader directly
  if (accounts.length === 0 || allData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold mb-2">TikTok Statistik</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Ladda upp TikTok-exportfiler (daglig översiktsdata CSV) för att börja analysera din statistik.
          </p>
        </div>

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

        {accounts.length > 0 && allData.length === 0 && (
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
            {accounts.length} konton · {allData.length.toLocaleString('sv')} rader data
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
          <TabsTrigger value="summary">Per dag</TabsTrigger>
        </TabsList>

        {/* Field selector card */}
        <Card className="mb-4">
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

            {activeTab === 'summary' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Object.entries(SUMMARY_VIEW_AVAILABLE_FIELDS).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sum-${key}`}
                      checked={selectedSummaryFields.includes(key)}
                      onCheckedChange={(checked) => {
                        setSelectedSummaryFields(prev =>
                          checked ? [...prev, key] : prev.filter(f => f !== key)
                        );
                      }}
                    />
                    <Label htmlFor={`sum-${key}`} className="text-sm">{label}</Label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <TabsContent value="accounts">
          <AccountView
            data={allData}
            selectedFields={selectedAccountFields}
            accounts={accounts}
          />
        </TabsContent>

        <TabsContent value="summary">
          <SummaryView
            data={allData}
            selectedFields={selectedSummaryFields}
            accounts={accounts}
            onAccountFilter={setFilteredAccountId}
            initialSelectedAccountId={filteredAccountId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
