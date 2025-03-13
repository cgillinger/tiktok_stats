import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Upload, 
  Plus,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { AccountList } from '../AccountManager/AccountList';
import { AccountForm } from '../AccountManager/AccountForm';
import { useAccountManager } from '../AccountManager/useAccountManager';
import { FileUploader } from '../FileUploader/FileUploader';
import { CSV_TYPES, CSV_TYPE_DISPLAY_NAMES } from '@/utils/constants';

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
    updateAccount,
    removeAccount,
    updateDataStatus
  } = useAccountManager();

  // Local states
  const [formMode, setFormMode] = useState(null); // 'create', 'edit', or null
  const [accountToEdit, setAccountToEdit] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [resetConfirmation, setResetConfirmation] = useState(false);
  const [uploadMode, setUploadMode] = useState(null); // 'overview', 'video', or null
  const [newAccountName, setNewAccountName] = useState('');
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Starta med kontoeditor direkt om användaren kommer från "Lägg till första konto"
  useEffect(() => {
    if (accounts.length === 0) {
      setIsAddingAccount(true);
    }
  }, [accounts]);

  // Handle account selection
  const handleAccountSelect = (accountId) => {
    setSelectedAccountId(accountId);
  };

  // Show form for adding new account
  const handleAddNew = () => {
    setFormMode('create');
    setAccountToEdit(null);
  };

  // Show form for editing account
  const handleEdit = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      setAccountToEdit(account);
      setFormMode('edit');
    }
  };

  // Show confirmation for deleting account
  const handleDeleteClick = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      setDeleteConfirmation(account);
    }
  };

  // Confirm account deletion
  const handleDeleteConfirm = async () => {
    if (deleteConfirmation) {
      try {
        await removeAccount(deleteConfirmation.id);
        setDeleteConfirmation(null);
        
        showSuccessMessage(`Kontot "${deleteConfirmation.name}" har tagits bort`);
      } catch (err) {
        console.error('Fel vid borttagning av konto:', err);
      }
    }
  };

  // Show confirmation for resetting all data
  const handleResetClick = () => {
    setResetConfirmation(true);
  };

  // Confirm reset all data
  const handleResetConfirm = async () => {
    try {
      // Rensa localStorage
      localStorage.clear();

      // Visa IndexedDB-databasen för att radera den
      const deleteRequest = window.indexedDB.deleteDatabase('TikTokStatisticsDB');

      deleteRequest.onsuccess = function() {
        showSuccessMessage('All data har återställts. Ladda om sidan för att starta om.');
        
        // Visa en knapp för att ladda om sidan
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      };

      deleteRequest.onerror = function(event) {
        console.error('Fel vid återställning av data:', event);
        setError('Kunde inte återställa all data. Försök att ladda om sidan.');
      };

      setResetConfirmation(false);
    } catch (err) {
      console.error('Fel vid återställning av data:', err);
      setError('Kunde inte återställa all data. Försök att ladda om sidan.');
    }
  };

  // Handle form submission (create/update account)
  const handleFormSubmit = async (formData) => {
    try {
      if (formMode === 'create') {
        const account = await createAccount(formData);
        showSuccessMessage(`Kontot "${account.name}" har skapats`);
      } else if (formMode === 'edit') {
        const account = await updateAccount(formData.id, formData);
        showSuccessMessage(`Kontot "${account.name}" har uppdaterats`);
      }
      return true;
    } catch (err) {
      console.error('Fel vid hantering av kontoformulär:', err);
      throw err;
    }
  };

  // Handle simple account creation
  const handleAddAccount = async () => {
    if (!newAccountName.trim()) {
      return;
    }

    try {
      const account = await createAccount({ 
        name: newAccountName.trim(),
        createdAt: Date.now()
      });
      
      setSelectedAccountId(account.id);
      setNewAccountName('');
      setIsAddingAccount(false);
      showSuccessMessage(`Kontot "${newAccountName}" har skapats!`);
    } catch (err) {
      console.error('Fel vid skapande av konto:', err);
    }
  };

  // Display a success message that disappears after a few seconds
  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  // Handle file upload completion
  const handleUploadSuccess = (result) => {
    if (result && result.accountId && result.csvType) {
      const csvTypeLabel = CSV_TYPE_DISPLAY_NAMES[result.csvType];
      showSuccessMessage(`${csvTypeLabel} har laddats upp framgångsrikt`);
      setUploadMode(null);
    } else {
      setUploadMode(null);
    }
  };

  // Show upload interface for specific CSV type
  const handleUploadClick = (accountId, csvType) => {
    setSelectedAccountId(accountId);
    setUploadMode(csvType);
  };

  // Cancel any active mode and return to default view
  const handleCancel = () => {
    setFormMode(null);
    setAccountToEdit(null);
    setDeleteConfirmation(null);
    setResetConfirmation(false);
    setUploadMode(null);
  };

  // Show delete confirmation dialog
  if (deleteConfirmation) {
    return (
      <div className="space-y-4">
        <button 
          onClick={handleCancel}
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
                  onClick={handleCancel}
                >
                  Avbryt
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDeleteConfirm}
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
          onClick={handleCancel}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
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
              <div className="flex space-x-4 justify-end">
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                >
                  Avbryt
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleResetConfirm}
                >
                  Återställ all data
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show account form for creating or editing
  if (formMode) {
    return (
      <div className="space-y-4">
        <button 
          onClick={handleCancel}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Tillbaka till kontolistan
        </button>
        
        <AccountForm 
          account={accountToEdit}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  // Show file uploader for selected account and CSV type
  if (uploadMode) {
    const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
    if (!selectedAccount) {
      setUploadMode(null);
      return null;
    }
    
    return (
      <div className="space-y-4">
        <button 
          onClick={handleCancel}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Tillbaka till kontolistan
        </button>
        
        <FileUploader 
          account={selectedAccount}
          onSuccess={handleUploadSuccess}
          onCancel={handleCancel}
          forcedFileType={uploadMode}
        />
      </div>
    );
  }

  // Show main account management view
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
          <CardTitle>Hantera TikTok-konton</CardTitle>
          <CardDescription>
            Lägg till, redigera eller ta bort konton och ladda upp CSV-filer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            {/* Återställning av data */}
            <Button 
              variant="outline" 
              onClick={handleResetClick}
              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Återställ data
            </Button>
          
            {/* Lägga till konto */}
            <Button 
              onClick={() => setIsAddingAccount(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Lägg till nytt konto
            </Button>
          </div>
        
          {/* Quick account creation */}
          {isAddingAccount && (
            <div className="space-y-2 mb-4">
              <Label htmlFor="account-name">Ange kontonamn</Label>
              <div className="flex gap-2">
                <Input 
                  id="account-name"
                  placeholder="Ex: P3, SVT, etc."
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                />
                <Button 
                  onClick={handleAddAccount}
                  disabled={!newAccountName.trim() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Skapar...
                    </>
                  ) : (
                    'Skapa konto'
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddingAccount(false)}
                >
                  Avbryt
                </Button>
              </div>
            </div>
          )}

          {/* Account list with actions */}
          <div className="space-y-4">
            {accounts.length === 0 ? (
              <div className="text-center p-6 border border-dashed rounded-lg">
                <p className="text-muted-foreground mb-2">Du har inga konton ännu</p>
                <p className="text-sm text-muted-foreground">Skapa ett konto ovan för att komma igång</p>
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
                  onClick={() => handleAccountSelect(account.id)}
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
                        <span className={`px-2 py-0.5 rounded-full text-xs ${account.hasOverviewData ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          Översiktsdata {account.hasOverviewData ? '✓' : '–'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${account.hasVideoData ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          Videodata {account.hasVideoData ? '✓' : '–'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(account.id);
                        }}
                      >
                        Redigera
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(account.id);
                        }}
                      >
                        Ta bort
                      </Button>
                    </div>
                  </div>
                  
                  {/* Upload buttons */}
                  {selectedAccountId === account.id && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button 
                        variant={account.hasOverviewData ? "outline" : "default"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUploadClick(account.id, CSV_TYPES.OVERVIEW);
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
                          handleUploadClick(account.id, CSV_TYPES.VIDEO);
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