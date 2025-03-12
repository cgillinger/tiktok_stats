import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { useStorageMonitor } from './useStorageMonitor';
import { Loader2, AlertCircle, AlertTriangle, CheckCircle, RefreshCw, HardDrive } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/utils/utils';

/**
 * Komponent för att visa status för lagringsutrymme
 */
export function StorageStatus() {
  const { 
    storageStats, 
    isLoading, 
    error, 
    fetchStorageStats, 
    getStorageStatus,
    getStatusDescription 
  } = useStorageMonitor();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
          <p className="text-sm text-muted-foreground">Hämtar lagringsinformation...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fel</AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <p>{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchStorageStats}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Försök igen
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Hämta lagringsstatus
  const status = getStorageStatus();
  const statusDescription = getStatusDescription();

  // Returnera rätt UI baserat på lagringsstatus
  return (
    <Card className={cn(
      status === 'critical' && 'border-red-500',
      status === 'warning' && 'border-yellow-500'
    )}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Lagringsstatus</CardTitle>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8" 
            onClick={fetchStorageStats}
            title="Uppdatera statistik"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Uppdatera</span>
          </Button>
        </div>
        <CardDescription>
          {statusDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'critical' && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Kritiskt lågt lagringsutrymme</AlertTitle>
            <AlertDescription>
              Webbläsarens lagringsutrymme är nästan fullt. Du behöver ta bort data för att kunna fortsätta använda appen.
            </AlertDescription>
          </Alert>
        )}

        {status === 'warning' && (
          <Alert variant="warning" className="mb-4 border-yellow-500 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Varning: Lagringsutrymme börjar bli fullt</AlertTitle>
            <AlertDescription className="text-yellow-700">
              Överväg att ta bort onödig data för att frigöra utrymme.
            </AlertDescription>
          </Alert>
        )}

        {status === 'ok' && (
          <div className="flex items-center text-green-600 mb-4">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span>Lagringsutrymmet är tillräckligt</span>
          </div>
        )}

        {storageStats && (
          <div className="space-y-4">
            {/* localStorage användning */}
            <div>
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="flex items-center">
                  <HardDrive className="h-4 w-4 mr-1 text-primary" /> 
                  localStorage
                </span>
                <span className="text-muted-foreground">
                  {(storageStats.localStorage.used / 1024).toFixed(1)} KB 
                  {' / '}
                  {(storageStats.localStorage.limit / 1024 / 1024).toFixed(0)} MB
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className={cn(
                    "h-2.5 rounded-full",
                    storageStats.localStorage.percentage > 90 ? "bg-red-600" :
                    storageStats.localStorage.percentage > 75 ? "bg-yellow-500" :
                    "bg-green-600"
                  )}
                  style={{ width: `${Math.min(storageStats.localStorage.percentage, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Datastatistik */}
            <div className="border rounded-md p-3 text-sm">
              <h4 className="font-medium mb-2">Datastatistik</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex justify-between">
                  <span>Antal konton:</span>
                  <span>{storageStats.indexedDB.accountsCount}</span>
                </li>
                <li className="flex justify-between">
                  <span>Översiktsdata:</span>
                  <span>{storageStats.indexedDB.overviewDataCount} dataset</span>
                </li>
                <li className="flex justify-between">
                  <span>Videodata:</span>
                  <span>{storageStats.indexedDB.videoDataCount} dataset</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}