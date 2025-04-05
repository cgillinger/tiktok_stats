import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Upload, 
  Loader2,
  RefreshCw,
  Plus,
  User
} from 'lucide-react';
import { useAccountManager } from '../AccountManager/useAccountManager';
import { FileUploader } from '../FileUploader/FileUploader';
import { MultiFileUploader } from '../MultiFileUploader/MultiFileUploader';
import { CSV_TYPES, CSV_TYPE_DISPLAY_NAMES, STORAGE_KEYS } from '@/utils/constants';
import { formatDate } from '@/utils/utils';
import { AccountForm } from '../AccountManager/AccountForm';

/**
 * Dedicated page for account management and data upload
 * @param {Object} props - Component properties
 * @param {Function} props.onBack - Callback to return to main view
 */
export function AccountsPage({ onBack }) {
  // Account management
  const { 
    accounts, 
    selectedAccountId, 
    isLoading, 
    error, 
    setSelectedAccountId,
    createAccount,
    removeAccount,
    loadAccounts,
    updateDataStatus
  } = useAccountManager();
  
  // Local states
  const [activeView, setActiveView] = useState('accounts');
  const [selectedAccountForUpload, setSelectedAccountForUpload] = useState(null);
  const [uploadType, setUploadType] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [resetConfirmation, setResetConfirmation] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState(null);

  // Visa framgångsmeddelande
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  // Skapa ett nytt konto
  const handleCreateAccount = async (accountData) => {
    try {
      const account = await createAccount(accountData);
      return account;
    } catch (err) {
      console.error('Fel vid skapande av konto:', err);
      throw err;
    }
  };

  // Hantera redigering av konto
  const handleEditAccount = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      setAccountToEdit(account);
      setIsEditingAccount(true);
      setActiveView('edit-account');
    }
  };

  // Hantera sparande av redigerat konto
  const handleAccountSubmit = async (accountData) => {
    try {
      // Använd createAccount som uppdaterar befintligt konto om ID finns
      await createAccount(accountData);
      
      // Ladda om kontolistan
      await loadAccounts();
      
      // Visa framgångsmeddelande och återgå till kontolistan
      showSuccessMessage(`Kontot "${accountData.name}" har uppdaterats`);
      setActiveView('accounts');
      setIsEditingAccount(false);
      setAccountToEdit(null);
      
      return true;
    } catch (err) {
      console.error('Fel vid uppdatering av konto:', err);
      throw err;
    }
  };

  // Hantera filuppladdningsframgång
  const handleMultiUploadSuccess = (result) => {
    if (result && result.account) {
      // Uppdatera kontolistan
      loadAccounts();
      
      // Visa framgångsmeddelande
      showSuccessMessage(`Kontot "${result.account.name}" har skapats och data har laddats upp`);
      
      // Återgå till kontoöversikten
      setActiveView('accounts');
    }
  };

  // Hantera uppladdningsframgång
  const handleUploadSuccess = (result) => {
    if (result && result.accountId && result.csvType) {
      // Uppdatera kontot med ny datatypsinfo
      const dataStatus = {};
      const csvTypeLabel = CSV_TYPE_DISPLAY_NAMES[result.csvType];
      
      if (result.csvType === CSV_TYPES.OVERVIEW) {
        dataStatus.hasOverviewData = true;
        dataStatus.lastOverviewUpdate = Date.now();
      } else {
        dataStatus.hasVideoData = true;
        dataStatus.lastVideoUpdate = Date.now();
      }
      
      updateDataStatus(result.accountId, dataStatus);
      
      // Visa framgångsmeddelande
      showSuccessMessage(`${csvTypeLabel} har laddats upp framgångsrikt`);
      
      // Återgå till kontoöversikten
      setActiveView('accounts');
      setSelectedAccountForUpload(null);
      setUploadType(null);
    } else {
      setSelectedAccountForUpload(null);
      setUploadType(null);
    }
  };

  // Visa för att lägga till data till ett konto
  const handleAddDataClick = (accountId, csvType = null) => {
    const account = accounts.find(acc => acc.id === accountId);
    setSelectedAccountForUpload(account);
    setUploadType(csvType);
    setActiveView('upload');
  };

  // Visa för att lägga till nytt konto
  const handleAddAccountClick = () => {
    setActiveView('new-account');
  };

  // Hantera återställning av all data med förbättrad felhantering och timeout
  const handleReset = async () => {
    try {
      setIsResetting(true);
      setResetError(null);
      
      // Rensa localStorage för all app data
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

  // Visa delete confirmation dialog
  if (deleteConfirmation) {
    return (
      <div className="space-y-4">
        <button 
          onClick={() => setDeleteConfirmation(null)}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Tillbaka till kontolistan
        </button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ta bort konto</AlertTitle>
          <AlertDescription>
            <div className="space-y-4 mt-2">
              <p>
                Är du säker på att du vill ta bort kontot <strong>{deleteConfirmation.name}</strong>?
              </p>
              <p>
                Detta kommer ta bort all statistikdata kopplad till kontot. Denna åtgärd kan inte ångras.
              </p>
              <div className="flex space-x-4 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteConfirmation(null)}
                >
                  Avbryt
                </Button>
                <Button 
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await removeAccount(deleteConfirmation.id);
                      setDeleteConfirmation(null);
                      
                      showSuccessMessage(`Kontot "${deleteConfirmation.name}" har tagits bort`);
                    } catch (err) {
                      console.error('Fel vid borttagning av konto:', err);
                    }
                  }}
                >
                  Ta bort permanent
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show reset confirmation dialog
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
          <ArrowLeft className="h-4 w-4 mr-1" />
          Tillbaka till kontolistan
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
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Lägg till vy för att redigera konto
  if (activeView === 'edit-account' && accountToEdit) {
    return (
      <div className="space-y-4">
        <button 
          onClick={() => {
            setActiveView('accounts');
            setIsEditingAccount(false);
            setAccountToEdit(null);
          }}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Tillbaka till kontolistan
        </button>
        
        <AccountForm 
          account={accountToEdit}
          onSubmit={handleAccountSubmit}
          onCancel={() => {
            setActiveView('accounts');
            setIsEditingAccount(false);
            setAccountToEdit(null);
          }}
        />
      </div>
    );
  }

  // Visa "snabb" uppladdning för nytt konto
  if (activeView === 'new-account') {
    return (
      <div className="space-y-4">
        <button 
          onClick={() => {
            setActiveView('accounts');
          }}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Tillbaka till kontolistan
        </button>
        
        <MultiFileUploader 
          account={null} 
          onCreateAccount={handleCreateAccount}
          onSuccess={handleMultiUploadSuccess}
          onCancel={() => setActiveView('accounts')}
        />
      </div>
    );
  }

  // Visa uppladdningsvyn för ett specifikt konto
  if (activeView === 'upload' && selectedAccountForUpload) {
    // Om en specifik filtyp är vald, använd den vanliga FileUploader
    if (uploadType) {
      return (
        <div className="space-y-4">
          <button 
            onClick={() => {
              setActiveView('accounts');
              setSelectedAccountForUpload(null);
              setUploadType(null);
            }}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Tillbaka till kontolistan
          </button>
          
          <FileUploader 
            account={selectedAccountForUpload}
            onSuccess={handleUploadSuccess}
            onCancel={() => {
              setActiveView('accounts');
              setSelectedAccountForUpload(null);
              setUploadType(null);
            }}
            forcedFileType={uploadType}
          />
        </div>
      );
    }
    
    // Annars, använd MultiFileUploader för att ladda upp båda typerna på en gång
    return (
      <div className="space-y-4">
        <button 
          onClick={() => {
            setActiveView('accounts');
            setSelectedAccountForUpload(null);
          }}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Tillbaka till kontolistan
        </button>
        
        <MultiFileUploader 
          account={selectedAccountForUpload}
          onSuccess={handleMultiUploadSuccess}
          onCancel={() => {
            setActiveView('accounts');
            setSelectedAccountForUpload(null);
          }}
        />
      </div>
    );
  }

  // Visa huvudvyn med konton
  return (
    <div className="space-y-4">
      {/* Back button to main view */}
      <button 
        onClick={onBack}
        className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Tillbaka till huvudvyn
      </button>
      
      {/* Success message */}
      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Klart!</AlertTitle>
          <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fel</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hantera TikTok-konton</CardTitle>
          <CardDescription>
            Lägg till, redigera eller ta bort konton och ladda upp CSV-filer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Huvudknappar */}
          <div className="flex justify-between items-center mb-4">
            {/* Återställning av data */}
            <Button 
              variant="outline" 
              onClick={() => setResetConfirmation(true)}
              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50"
              disabled={isResetting}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Återställ data
            </Button>
          
            {/* Lägga till konto */}
            <Button 
              onClick={handleAddAccountClick}
            >
              <Plus className="h-4 w-4 mr-2" />
              Lägg till nytt konto
            </Button>
          </div>
          
          {/* Visa alla konton */}
          <div className="space-y-4">
            {accounts.length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded-lg">
                <div className="flex justify-center mb-3">
                  <User className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">Du har inga konton ännu</p>
                <Button 
                  onClick={handleAddAccountClick}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Kom igång genom att skapa ditt första konto
                </Button>
              </div>
            ) : (
              accounts.map(account => (
                <div 
                  key={account.id}
                  className={`p-4 border rounded-lg ${
                    selectedAccountId === account.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedAccountId(account.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-medium">{account.name}</h3>
                      {account.username && (
                        <p className="text-sm text-muted-foreground">@{account.username}</p>
                      )}
                      {account.description && (
                        <p className="text-sm text-muted-foreground">{account.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-1">
                        <div className={`px-2 py-0.5 rounded-full text-xs flex items-center ${account.hasOverviewData ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          <span className="w-2 h-2 rounded-full mr-1 bg-green-500 opacity-50"></span>
                          Översiktsdata {account.hasOverviewData ? '✓' : '–'}
                          {account.lastOverviewUpdate && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {formatDate(new Date(account.lastOverviewUpdate))}
                            </span>
                          )}
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-xs flex items-center ${account.hasVideoData ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          <span className="w-2 h-2 rounded-full mr-1 bg-green-500 opacity-50"></span>
                          Videodata {account.hasVideoData ? '✓' : '–'}
                          {account.lastVideoUpdate && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {formatDate(new Date(account.lastVideoUpdate))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddDataClick(account.id);
                        }}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Lägg till data
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAccount(account.id);
                        }}
                      >
                        Redigera
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmation(account);
                        }}
                      >
                        Ta bort
                      </Button>
                    </div>
                  </div>
                  
                  {/* Upload buttons - show only when this account is selected */}
                  {selectedAccountId === account.id && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button 
                        variant={account.hasOverviewData ? "outline" : "default"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddDataClick(account.id, CSV_TYPES.OVERVIEW);
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {account.hasOverviewData 
                          ? "Uppdatera översiktsdata" 
                          : "Ladda upp översiktsdata"}
                      </Button>
                      <Button 
                        variant={account.hasVideoData ? "outline" : "default"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddDataClick(account.id, CSV_TYPES.VIDEO);
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {account.hasVideoData 
                          ? "Uppdatera videodata" 
                          : "Ladda upp videodata"}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}