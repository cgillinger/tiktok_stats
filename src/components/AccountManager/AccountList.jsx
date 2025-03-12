import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Loader2, Plus, Settings, Circle, CheckCircle2, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/utils/utils';
import { CSV_TYPE_DISPLAY_NAMES, CSV_TYPES } from '@/utils/constants';

/**
 * Lista över TikTok-konton med möjlighet att välja, redigera och ta bort
 * @param {Object} props - Komponentens properties
 * @param {Array} props.accounts - Lista med konton
 * @param {string} props.selectedAccountId - ID för valt konto
 * @param {Function} props.onSelect - Callback när ett konto väljs
 * @param {Function} props.onEdit - Callback när ett konto ska redigeras
 * @param {Function} props.onDelete - Callback när ett konto ska tas bort
 * @param {Function} props.onAddNew - Callback när nytt konto ska läggas till
 * @param {boolean} [props.isLoading=false] - Om kontona håller på att laddas
 */
export function AccountList({ 
  accounts, 
  selectedAccountId, 
  onSelect, 
  onEdit, 
  onDelete, 
  onAddNew, 
  isLoading = false 
}) {
  // Hitta valt konto
  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Dina TikTok-konton</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onAddNew}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-1" />
            Lägg till
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center p-8 border border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">Du har inga konton ännu</p>
            <Button onClick={onAddNew} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Lägg till ditt första konto
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map(account => (
              <div 
                key={account.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-md border transition-colors",
                  selectedAccountId === account.id 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:bg-muted/50 cursor-pointer"
                )}
                onClick={() => onSelect(account.id)}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: getAccountColor(account) 
                    }}
                  >
                    <span className="text-white font-medium">
                      {getAccountInitials(account)}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium">{account.name}</h4>
                    <div className="flex space-x-1 mt-1">
                      <DataStatusIndicator 
                        hasData={account.hasOverviewData} 
                        type={CSV_TYPES.OVERVIEW}
                      />
                      <DataStatusIndicator 
                        hasData={account.hasVideoData} 
                        type={CSV_TYPES.VIDEO}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(account.id);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Redigera</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(account.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Ta bort</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {selectedAccount && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium mb-2">Valt konto</h4>
            <div className="flex justify-between items-center">
              <div className="text-sm space-y-1">
                <p>
                  <strong>Namn:</strong> {selectedAccount.name}
                </p>
                {selectedAccount.username && (
                  <p>
                    <strong>Användarnamn:</strong> @{selectedAccount.username}
                  </p>
                )}
                {selectedAccount.description && (
                  <p>
                    <strong>Beskrivning:</strong> {selectedAccount.description}
                  </p>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onEdit(selectedAccount.id)}
              >
                <Settings className="h-4 w-4 mr-1" />
                Inställningar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Datakällsindikator (visar om ett konto har översiktsdata/videodata)
 */
function DataStatusIndicator({ hasData, type }) {
  return (
    <div className="flex items-center text-xs">
      {hasData ? (
        <CheckCircle2 className="h-3 w-3 text-green-600 mr-1" />
      ) : (
        <Circle className="h-3 w-3 text-muted-foreground mr-1" />
      )}
      <span className={cn(
        hasData ? "text-green-600" : "text-muted-foreground"
      )}>
        {CSV_TYPE_DISPLAY_NAMES[type]}
      </span>
    </div>
  );
}

/**
 * Hämtar initialer från ett kontonamn
 */
function getAccountInitials(account) {
  if (!account.name) return '?';
  
  const words = account.name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/**
 * Genererar en bakgrundsfärg för ett konto baserat på dess namn
 */
function getAccountColor(account) {
  const name = account.name || '';
  
  // Skapa en hashkod från namnet
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Konvertera hashkoden till en HSL-färg
  // Använd en ljus och färgstark färg (hög saturation och lightness)
  const h = hash % 360;
  return `hsl(${h}, 70%, 60%)`;
}