import React, { useState } from 'react';
import { AccountList } from './AccountList';
import { AccountForm } from './AccountForm';
import { useAccountManager } from './useAccountManager';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';

/**
 * Huvudkomponent för hantering av TikTok-konton
 * @param {Object} props - Komponentens properties
 * @param {Function} props.onAccountSelect - Callback när ett konto väljs
 * @param {Function} props.onBack - Callback när användaren vill gå tillbaka
 */
export function AccountManager({ onAccountSelect, onBack }) {
  const [formMode, setFormMode] = useState(null); // 'create', 'edit', eller null
  const [accountToEdit, setAccountToEdit] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  
  const { 
    accounts, 
    selectedAccountId, 
    isLoading, 
    error, 
    setSelectedAccountId,
    createAccount,
    updateAccount,
    removeAccount,
    getSelectedAccount
  } = useAccountManager();

  // Hantera val av konto
  const handleAccountSelect = (accountId) => {
    setSelectedAccountId(accountId);
    
    if (onAccountSelect) {
      const account = accounts.find(acc => acc.id === accountId);
      onAccountSelect(account);
    }
  };

  // Visa formulär för att lägga till nytt konto
  const handleAddNew = () => {
    setFormMode('create');
    setAccountToEdit(null);
  };

  // Visa formulär för att redigera konto
  const handleEdit = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      setAccountToEdit(account);
      setFormMode('edit');
    }
  };

  // Visa bekräftelse för att ta bort konto
  const handleDeleteClick = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      setDeleteConfirmation(account);
    }
  };

  // Genomför borttagning av konto
  const handleDeleteConfirm = async () => {
    if (deleteConfirmation) {
      try {
        await removeAccount(deleteConfirmation.id);
        setDeleteConfirmation(null);
      } catch (err) {
        console.error('Fel vid borttagning av konto:', err);
      }
    }
  };

  // Hantera formulärinskickning (skapa/uppdatera konto)
  const handleFormSubmit = async (formData) => {
    try {
      if (formMode === 'create') {
        await createAccount(formData);
      } else if (formMode === 'edit') {
        await updateAccount(formData.id, formData);
      }
    } catch (err) {
      console.error('Fel vid hantering av kontoformulär:', err);
      throw err;
    }
  };

  // Avbryt formulär eller bekräftelse
  const handleCancel = () => {
    setFormMode(null);
    setAccountToEdit(null);
    setDeleteConfirmation(null);
  };

  // Visa bekräftelse för borttagning
  if (deleteConfirmation) {
    return (
      <div className="space-y-4">
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

  // Visa formulär för att skapa/redigera konto
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

  // Visa kontolista
  return (
    <div className="space-y-4">
      {onBack && (
        <button 
          onClick={onBack}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Tillbaka till huvudvyn
        </button>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fel</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <AccountList 
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onSelect={handleAccountSelect}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        onAddNew={handleAddNew}
        isLoading={isLoading}
      />
    </div>
  );
}