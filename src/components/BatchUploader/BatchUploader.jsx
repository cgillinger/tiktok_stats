import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Label } from '../ui/label';
import {
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Trash2,
  Play
} from 'lucide-react';
import { saveAccountData, getAccounts, saveAccount } from '@/utils/webStorageService';
import { processTikTokData } from '@/utils/webDataProcessor';
import { cn, formatDate } from '@/utils/utils';
import Papa from 'papaparse';

const FILE_STATUS = {
  WAITING: 'waiting',
  ANALYZING: 'analyzing',
  READY: 'ready',
  PROCESSING: 'processing',
  DONE: 'done',
  ERROR: 'error'
};

/**
 * Komponent för batch-upload av TikTok CSV-filer
 * Varje fil kopplas till ett kontonamn (manuellt ifyllt av användaren)
 *
 * @param {Function} props.onSuccess - Callback när uppladdning lyckats
 * @param {Function} props.onCancel - Callback för avbryt
 */
export function BatchUploader({ onSuccess, onCancel }) {
  const [fileEntries, setFileEntries] = useState([]); // { id, file, accountName, dateRange, status, error, rowCount }
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalProgress, setTotalProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  const fileInputRef = useRef(null);

  const analyzeFile = useCallback(async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const content = event.target.result;
        const previewContent = content.slice(0, 50000);

        Papa.parse(previewContent, {
          header: true,
          preview: 100,
          skipEmptyLines: true,
          complete: (results) => {
            let dateRange = null;

            const dateField = results.meta?.fields?.find(f =>
              f.toLowerCase().includes('datum') || f.toLowerCase() === 'date'
            );

            if (dateField && results.data.length > 0) {
              const dates = [];
              results.data.forEach(row => {
                const val = row[dateField];
                if (val) {
                  try {
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) dates.push(d);
                  } catch (e) { /* ignore */ }
                }
              });

              if (dates.length > 0) {
                dates.sort((a, b) => a - b);
                dateRange = { startDate: dates[0], endDate: dates[dates.length - 1] };
              }
            }

            resolve({
              content,
              dateRange,
              rowCount: results.data.length
            });
          },
          error: () => resolve({ content, dateRange: null, rowCount: 0 })
        });
      };

      reader.onerror = () => resolve({ content: null, dateRange: null, rowCount: 0 });
      reader.readAsText(file);
    });
  }, []);

  const addFiles = useCallback(async (files) => {
    const newEntries = [];

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.csv')) continue;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const entry = {
        id,
        file,
        accountName: '',
        dateRange: null,
        status: FILE_STATUS.ANALYZING,
        error: null,
        rowCount: 0,
        content: null
      };
      newEntries.push(entry);
    }

    if (newEntries.length === 0) return;

    setFileEntries(prev => [...prev, ...newEntries]);

    // Analyze each file
    for (const entry of newEntries) {
      const result = await analyzeFile(entry.file);
      setFileEntries(prev => prev.map(e =>
        e.id === entry.id
          ? {
              ...e,
              status: FILE_STATUS.READY,
              dateRange: result.dateRange,
              rowCount: result.rowCount,
              content: result.content
            }
          : e
      ));
    }
  }, [analyzeFile]);

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    addFiles(files);
  };

  const handleRemoveFile = (id) => {
    setFileEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleAccountNameChange = (id, name) => {
    setFileEntries(prev => prev.map(e => e.id === id ? { ...e, accountName: name } : e));
  };

  const canProcess = fileEntries.length > 0 &&
    fileEntries.every(e => e.accountName.trim() !== '') &&
    fileEntries.some(e => e.status === FILE_STATUS.READY || e.status === FILE_STATUS.DONE) &&
    !isProcessing;

  const handleProcessAll = async () => {
    const readyEntries = fileEntries.filter(e => e.status === FILE_STATUS.READY);

    if (readyEntries.length === 0) return;

    // Validate all have account names
    const missing = readyEntries.filter(e => !e.accountName.trim());
    if (missing.length > 0) {
      setGlobalError('Alla filer måste ha ett kontonamn');
      return;
    }

    setIsProcessing(true);
    setGlobalError(null);
    setTotalProgress(0);

    let processed = 0;
    const total = readyEntries.length;

    for (const entry of readyEntries) {
      // Mark as processing
      setFileEntries(prev => prev.map(e =>
        e.id === entry.id ? { ...e, status: FILE_STATUS.PROCESSING } : e
      ));

      try {
        if (!entry.content) {
          throw new Error('Ingen data att bearbeta');
        }

        // Process CSV
        const result = await processTikTokData(entry.content);

        if (!result.data || result.data.length === 0) {
          throw new Error('Ingen data hittades i filen');
        }

        // Find or create account
        const accounts = await getAccounts();
        const accountName = entry.accountName.trim();
        let account = accounts.find(a => a.name.toLowerCase() === accountName.toLowerCase());

        let mergeData = false;
        if (account) {
          // Account already exists - merge data (deduplicating by date)
          mergeData = true;
        } else {
          // Create new account
          account = await saveAccount({
            name: accountName,
            createdAt: Date.now(),
            hasData: false
          });
        }

        await saveAccountData(account.id, result.data, { merge: mergeData });

        setFileEntries(prev => prev.map(e =>
          e.id === entry.id
            ? { ...e, status: FILE_STATUS.DONE, rowCount: result.data.length }
            : e
        ));
      } catch (err) {
        console.error(`Fel vid bearbetning av ${entry.file.name}:`, err);
        setFileEntries(prev => prev.map(e =>
          e.id === entry.id
            ? { ...e, status: FILE_STATUS.ERROR, error: err.message }
            : e
        ));
      }

      processed++;
      setTotalProgress(Math.round((processed / total) * 100));
    }

    setIsProcessing(false);

    // Check if any succeeded
    const doneEntries = fileEntries.filter(e => e.status === FILE_STATUS.DONE || e.status === FILE_STATUS.PROCESSING);
    // Re-check after state update

    setTimeout(() => {
      setFileEntries(current => {
        const anyDone = current.some(e => e.status === FILE_STATUS.DONE);
        if (anyDone && onSuccess) {
          onSuccess();
        }
        return current;
      });
    }, 300);
  };

  const getStatusBadge = (entry) => {
    switch (entry.status) {
      case FILE_STATUS.ANALYZING:
        return <span className="text-xs text-yellow-600 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Analyserar...</span>;
      case FILE_STATUS.READY:
        return <span className="text-xs text-blue-600">Klar att bearbeta</span>;
      case FILE_STATUS.PROCESSING:
        return <span className="text-xs text-orange-600 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Bearbetar...</span>;
      case FILE_STATUS.DONE:
        return <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Klar! {entry.rowCount} rader</span>;
      case FILE_STATUS.ERROR:
        return <span className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{entry.error || 'Fel'}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {globalError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fel</AlertTitle>
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}

      {/* Drop zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/10"
            : "border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5",
          isProcessing && "opacity-50 pointer-events-none"
        )}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
          disabled={isProcessing}
        />
        <div className="flex flex-col items-center gap-2">
          <UploadCloud className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">
            Dra och släpp CSV-filer här, eller klicka för att välja
          </p>
          <p className="text-xs text-muted-foreground">
            Välj en eller flera TikTok-exportfiler (daglig översiktsdata)
          </p>
        </div>
      </div>

      {/* File list */}
      {fileEntries.length > 0 && (
        <div className="space-y-3">
          {fileEntries.map(entry => (
            <div
              key={entry.id}
              className={cn(
                "border rounded-lg p-4 bg-muted/10",
                entry.status === FILE_STATUS.ERROR && "border-red-200 bg-red-50",
                entry.status === FILE_STATUS.DONE && "border-green-200 bg-green-50"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Filename */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{entry.file.name}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => handleRemoveFile(entry.id)}
                      disabled={isProcessing}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Account name input */}
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`account-${entry.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
                      Kontonamn:
                    </Label>
                    <Input
                      id={`account-${entry.id}`}
                      value={entry.accountName}
                      onChange={(e) => handleAccountNameChange(entry.id, e.target.value)}
                      placeholder="Ex: P3, Ekot, SVT..."
                      className="h-7 text-sm"
                      disabled={isProcessing || entry.status === FILE_STATUS.DONE}
                    />
                  </div>

                  {/* Date range and status */}
                  <div className="flex items-center gap-4">
                    {entry.dateRange && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>
                          {formatDate(entry.dateRange.startDate)} – {formatDate(entry.dateRange.endDate)}
                        </span>
                      </div>
                    )}
                    {getStatusBadge(entry)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Progress bar */}
          {isProcessing && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Bearbetar filer...</span>
                <span>{totalProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-between items-center pt-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Avbryt
          </Button>
        )}

        <Button
          onClick={handleProcessAll}
          disabled={!canProcess}
          className={cn(!onCancel && "w-full")}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Bearbetar...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Bearbeta alla ({fileEntries.filter(e => e.status === FILE_STATUS.READY).length} filer)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
