import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Edit, Trash2, Upload, Clock } from 'lucide-react';
import { cn, getInitials, stringToColor, formatDate } from '@/utils/utils';
import { CSV_TYPES, CSV_TYPE_DISPLAY_NAMES } from '@/utils/constants';

/**
 * Komponent för ett TikTok-konto som visar status och alternativ
 * @param {Object} props - Komponentens properties
 * @param {Object} props.account - Kontot att visa
 * @param {boolean} props.isSelected - Om kontot är valt
 * @param {Function} props.onSelect - Callback när kontot väljs
 * @param {Function} props.onEdit - Callback när kontot ska redigeras
 * @param {Function} props.onDelete - Callback när kontot ska tas bort
 * @param {Function} props.onUpload - Callback när data ska laddas upp
 */
export function AccountCard({ account, isSelected, onSelect, onEdit, onDelete, onUpload }) {
  if (!account) return null;
  
  // Beräkna bakgrundsfärg från kontonamn
  const bgColor = stringToColor(account.name);
  
  // Beräkna statusbadge baserat på tillgänglig data
  const getStatusBadge = () => {
    const hasOverview = account.hasOverviewData;
    const hasVideo = account.hasVideoData;
    
    if (hasOverview && hasVideo) {
      return (
        <Badge variant="success" className="ml-2">Komplett</Badge>
      );
    } else if (hasOverview || hasVideo) {
      return (
        <Badge variant="warning" className="ml-2">Delvis</Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="ml-2 bg-muted/20">Tomt</Badge>
      );
    }
  };
  
  return (
    <Card 
      className={cn(
        "transition-colors border-2",
        isSelected ? "border-primary" : "border-border hover:border-primary/20"
      )}
      onClick={() => onSelect(account.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <Avatar className="h-12 w-12" style={{ backgroundColor: bgColor }}>
              <AvatarFallback className="text-white">
                {getInitials(account.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="ml-3">
              <h3 className="font-medium flex items-center">
                {account.name}
                {getStatusBadge()}
              </h3>
              
              {account.username && (
                <p className="text-sm text-muted-foreground">
                  @{account.username}
                </p>
              )}
              
              <div className="flex flex-wrap gap-1 mt-2">
                {/* Visa senaste uppdatering för översiktsdata */}
                {account.hasOverviewData && (
                  <div className="inline-flex items-center text-xs text-muted-foreground bg-muted/20 rounded-full px-2 py-0.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                    {CSV_TYPE_DISPLAY_NAMES[CSV_TYPES.OVERVIEW]}
                    {account.lastOverviewUpdate && (
                      <span className="ml-1 flex items-center" title={`Senast uppdaterad: ${formatDate(new Date(account.lastOverviewUpdate))}`}>
                        <Clock className="h-3 w-3 mr-0.5" />
                        {formatDate(new Date(account.lastOverviewUpdate))}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Visa senaste uppdatering för videodata */}
                {account.hasVideoData && (
                  <div className="inline-flex items-center text-xs text-muted-foreground bg-muted/20 rounded-full px-2 py-0.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                    {CSV_TYPE_DISPLAY_NAMES[CSV_TYPES.VIDEO]}
                    {account.lastVideoUpdate && (
                      <span className="ml-1 flex items-center" title={`Senast uppdaterad: ${formatDate(new Date(account.lastVideoUpdate))}`}>
                        <Clock className="h-3 w-3 mr-0.5" />
                        {formatDate(new Date(account.lastVideoUpdate))}
                      </span>
                    )}
                  </div>
                )}
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
                onUpload(account.id, CSV_TYPES.OVERVIEW);
              }}
              title="Ladda upp översiktsdata"
            >
              <Upload className="h-4 w-4" />
              <span className="sr-only">Ladda upp</span>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(account.id);
              }}
              title="Redigera konto"
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
              title="Ta bort konto"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Ta bort</span>
            </Button>
          </div>
        </div>
        
        {account.description && (
          <p className="text-sm text-muted-foreground mt-3">
            {account.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}