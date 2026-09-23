import React, { useState, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Label } from '../ui/label';
import {
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CalendarRange,
  Trash2,
  Play,
  Ban,
  Inbox,
  ExternalLink,
  Download
} from 'lucide-react';
import { saveAccountData, getAccounts, saveAccount } from '@/utils/webStorageService';
import { processTikTokData, UnsupportedCsvError } from '@/utils/webDataProcessor';
import { cn } from '@/utils/utils';
import { normalizeAccountName } from '@/utils/accountNames';
import { fetchAccountDisplayName } from '@/utils/tiktokEmbed';

const FILE_STATUS = {
  ANALYZING: 'analyzing',
  READY: 'ready',
  UNSUPPORTED: 'unsupported',
  PROCESSING: 'processing',
  DONE: 'done',
  ERROR: 'error'
};

/**
 * Batch-upload av månads-CSV-filer.
 *
 * Varje fil är ett konto och en månad. Kontonamnet förifylls från @-handlet i
 * URL-kolumnen och går att ändra.
 *
 * Tre utfall visas åtskilda, eftersom de kräver helt olika saker av användaren:
 *  - filen har videodata            -> vanlig import
 *  - filen är giltig men tom        -> importeras ändå, månaden märks som tom
 *  - filen är i det gamla formatet  -> kan inte importeras, tydligt besked
 *
 * @param {Function} props.onSuccess - Callback när uppladdning lyckats
 * @param {Function} props.onCancel - Callback för avbryt
 */
export function BatchUploader({ onSuccess, onCancel }) {
  const [fileEntries, setFileEntries] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalProgress, setTotalProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [isFetchingNames, setIsFetchingNames] = useState(false);
  const [nameFetchProgress, setNameFetchProgress] = useState({ done: 0, total: 0 });

  const fileInputRef = useRef(null);

  const readFile = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });

  const analyzeFile = useCallback(async (file) => {
    const content = await readFile(file);

    if (content === null) {
      return { status: FILE_STATUS.ERROR, error: 'Filen kunde inte läsas.' };
    }

    try {
      const parsed = await processTikTokData(content, { filename: file.name });

      return {
        status: FILE_STATUS.READY,
        content,
        parsed,
        handle: parsed.handle || null,
        accountName: normalizeAccountName(parsed.handle) || '',
        videoCount: parsed.meta.videoCount,
        months: parsed.meta.months,
        isEmptyImport: parsed.meta.isEmptyImport,
        warnings: parsed.warnings
      };
    } catch (err) {
      if (err instanceof UnsupportedCsvError) {
        return {
          status: FILE_STATUS.UNSUPPORTED,
          error: err.message,
          formatLabel: err.label,
          isLegacy: err.isLegacy
        };
      }
      return { status: FILE_STATUS.ERROR, error: err.message };
    }
  }, []);

  const addFiles = useCallback(async (files) => {
    const newEntries = [];

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.csv')) continue;

      newEntries.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        accountName: '',
        handle: null,
        status: FILE_STATUS.ANALYZING,
        error: null,
        formatLabel: null,
        isLegacy: false,
        content: null,
        parsed: null,
        videoCount: 0,
        months: [],
        isEmptyImport: false,
        warnings: [],
        // Läget för uppslagning av visningsnamn mot TikTok (frivillig funktion)
        nameFetchStatus: 'idle',
        nameFetchError: null,
        nameFromTikTok: false
      });
    }

    if (newEntries.length === 0) return;

    setFileEntries(prev => [...prev, ...newEntries]);

    for (const entry of newEntries) {
      const result = await analyzeFile(entry.file);
      setFileEntries(prev => prev.map(e =>
        e.id === entry.id ? { ...e, ...result } : e
      ));
    }
  }, [analyzeFile]);

  const handleFileInputChange = (e) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files || []));
  };

  const handleRemoveFile = (id) => {
    setFileEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleAccountNameChange = (id, name) => {
    setFileEntries(prev => prev.map(e => e.id === id
      // Ändrar användaren namnet för hand räknas det inte längre som hämtat från TikTok
      ? { ...e, accountName: name, nameFromTikTok: false, nameFetchStatus: 'idle', nameFetchError: null }
      : e
    ));
  };

  // En tom månad saknar videor och går alltså inte att slå upp mot TikTok
  const hasVideoUrl = (entry) => Boolean(entry.parsed?.videos?.some(v => v?.url));

  const handleFetchName = useCallback(async (entry) => {
    const videoUrl = entry.parsed?.videos?.find(v => v?.url)?.url;
    if (!videoUrl) return;

    setFileEntries(prev => prev.map(e =>
      e.id === entry.id ? { ...e, nameFetchStatus: 'loading', nameFetchError: null } : e
    ));

    try {
      const name = await fetchAccountDisplayName(videoUrl, true);
      if (name) {
        setFileEntries(prev => prev.map(e =>
          e.id === entry.id
            ? { ...e, accountName: name, nameFetchStatus: 'idle', nameFetchError: null, nameFromTikTok: true }
            : e
        ));
      } else {
        setFileEntries(prev => prev.map(e =>
          e.id === entry.id
            ? { ...e, nameFetchStatus: 'error', nameFetchError: 'Kunde inte hämta namnet från TikTok' }
            : e
        ));
      }
    } catch (err) {
      setFileEntries(prev => prev.map(e =>
        e.id === entry.id
          ? { ...e, nameFetchStatus: 'error', nameFetchError: 'Kunde inte hämta namnet från TikTok' }
          : e
      ));
    }
  }, []);

  const readyEntries = fileEntries.filter(e => e.status === FILE_STATUS.READY);
  const unsupportedEntries = fileEntries.filter(e => e.status === FILE_STATUS.UNSUPPORTED);
  const legacyCount = unsupportedEntries.filter(e => e.isLegacy).length;
  const entriesWithVideos = fileEntries.filter(hasVideoUrl);

  const handleFetchAllNames = async () => {
    const targets = fileEntries.filter(hasVideoUrl);
    if (targets.length === 0) return;

    setIsFetchingNames(true);
    setNameFetchProgress({ done: 0, total: targets.length });

    for (let i = 0; i < targets.length; i++) {
      await handleFetchName(targets[i]);
      setNameFetchProgress({ done: i + 1, total: targets.length });
    }

    setIsFetchingNames(false);
  };

  const canProcess = readyEntries.length > 0 &&
    readyEntries.every(e => e.accountName.trim() !== '') &&
    !isProcessing;

  const handleProcessAll = async () => {
    if (readyEntries.length === 0) return;

    if (readyEntries.some(e => !e.accountName.trim())) {
      setGlobalError('Alla filer som ska bearbetas måste ha ett kontonamn');
      return;
    }

    setIsProcessing(true);
    setGlobalError(null);
    setTotalProgress(0);

    let processed = 0;
    let anyDone = false;

    for (const entry of readyEntries) {
      setFileEntries(prev => prev.map(e =>
        e.id === entry.id ? { ...e, status: FILE_STATUS.PROCESSING } : e
      ));

      try {
        const parsed = entry.parsed;
        if (!parsed) throw new Error('Ingen data att bearbeta');

        const accounts = await getAccounts();
        const accountName = entry.accountName.trim();
        const handle = entry.handle;

        // Matcha på handle före namn. Samma TikTok-konto ska hamna på samma
        // post även om visningsnamnet skrivits om sedan förra uppladdningen -
        // annars hade "p3dingata" och "P3 Din Gata" blivit två konton.
        let account =
          (handle && accounts.find(a => a.handle && a.handle === handle)) ||
          accounts.find(a => a.name.toLowerCase() === accountName.toLowerCase()) ||
          (handle && accounts.find(a => a.name.toLowerCase() === handle.toLowerCase())) ||
          null;

        const mergeData = Boolean(account);
        if (account) {
          // Namnet i fältet vinner, så att ett konto går att döpa om
          if (account.name !== accountName || account.handle !== handle) {
            account = await saveAccount({ ...account, name: accountName, handle: handle || account.handle || null });
          }
        } else {
          account = await saveAccount({
            name: accountName,
            handle: handle || null,
            createdAt: Date.now(),
            hasData: false
          });
        }

        const saved = await saveAccountData(
          account.id,
          { videos: parsed.videos, months: parsed.months },
          { merge: mergeData }
        );

        if (!saved) throw new Error('Data kunde inte sparas');

        anyDone = true;
        setFileEntries(prev => prev.map(e =>
          e.id === entry.id ? { ...e, status: FILE_STATUS.DONE } : e
        ));
      } catch (err) {
        console.error(`Fel vid bearbetning av ${entry.file.name}:`, err);
        setFileEntries(prev => prev.map(e =>
          e.id === entry.id ? { ...e, status: FILE_STATUS.ERROR, error: err.message } : e
        ));
      }

      processed++;
      setTotalProgress(Math.round((processed / readyEntries.length) * 100));
    }

    setIsProcessing(false);

    if (anyDone && onSuccess) {
      onSuccess();
    }
  };

  const renderStatus = (entry) => {
    switch (entry.status) {
      case FILE_STATUS.ANALYZING:
        return (
          <span className="text-xs text-yellow-700 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />Analyserar...
          </span>
        );

      case FILE_STATUS.READY:
        return entry.isEmptyImport ? (
          <span className="text-xs text-amber-700 flex items-center gap-1">
            <Inbox className="h-3 w-3" />
            Giltig fil - men inga videor publicerade denna månad
          </span>
        ) : (
          <span className="text-xs text-blue-700">
            Klar att bearbeta · {entry.videoCount} videor
          </span>
        );

      case FILE_STATUS.UNSUPPORTED:
        return (
          <span className="text-xs text-red-700 flex items-center gap-1">
            <Ban className="h-3 w-3" />{entry.formatLabel}
          </span>
        );

      case FILE_STATUS.PROCESSING:
        return (
          <span className="text-xs text-orange-700 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />Bearbetar...
          </span>
        );

      case FILE_STATUS.DONE:
        return (
          <span className="text-xs text-green-700 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {entry.isEmptyImport
              ? 'Importerad - månaden registrerad som tom'
              : `Klar! ${entry.videoCount} videor`}
          </span>
        );

      case FILE_STATUS.ERROR:
        return (
          <span className="text-xs text-red-700 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />{entry.error || 'Fel'}
          </span>
        );

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

      {legacyCount > 0 && (
        <Alert variant="destructive">
          <Ban className="h-4 w-4" />
          <AlertTitle>Gammalt CSV-format</AlertTitle>
          <AlertDescription>
            <p>
              Det verkar som att du försöker ladda upp CSV i det gamla formatet, de
              fungerar inte längre.
            </p>
            <p className="mt-2 text-sm">
              {legacyCount === 1 ? 'Filen är' : `${legacyCount} av filerna är`} en
              TikTok-export av den gamla typen (Översikt eller Video). Appen läser numera
              månadsfiler som innehåller sektionerna MÅNADSSUMMERING och
              PER VIDEO. Övriga filer i listan kan bearbetas som vanligt.
            </p>
          </AlertDescription>
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
            En fil per konto och månad - flera filer går bra samtidigt
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
                (entry.status === FILE_STATUS.ERROR || entry.status === FILE_STATUS.UNSUPPORTED)
                  && "border-red-200 bg-red-50",
                entry.status === FILE_STATUS.READY && entry.isEmptyImport
                  && "border-amber-200 bg-amber-50",
                entry.status === FILE_STATUS.DONE && "border-green-200 bg-green-50"
              )}
            >
              <div className="flex-1 min-w-0 space-y-2">
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

                {entry.status === FILE_STATUS.UNSUPPORTED ? (
                  <p className="text-sm text-red-700">{entry.error}</p>
                ) : (
                  <div className="space-y-1.5">
                    {entry.handle && (
                      <a
                        href={`https://www.tiktok.com/@${entry.handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Öppna kontot på TikTok"
                        aria-label="Öppna kontot på TikTok"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        @{entry.handle}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <Label
                        htmlFor={`account-${entry.id}`}
                        className="text-xs text-muted-foreground whitespace-nowrap"
                      >
                        Visningsnamn:
                      </Label>
                      <Input
                        id={`account-${entry.id}`}
                        value={entry.accountName}
                        onChange={(e) => handleAccountNameChange(entry.id, e.target.value)}
                        placeholder="Ex: P3 Nyheter"
                        className="h-7 text-sm"
                        disabled={isProcessing || entry.status === FILE_STATUS.DONE}
                      />
                      {hasVideoUrl(entry) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground"
                          onClick={() => handleFetchName(entry)}
                          disabled={
                            isProcessing ||
                            isFetchingNames ||
                            entry.status === FILE_STATUS.DONE ||
                            entry.nameFetchStatus === 'loading'
                          }
                          title="Slår upp kontots namn hos TikTok. Då skickas videons länk och din IP-adress dit. Din statistik lämnar aldrig webbläsaren."
                        >
                          {entry.nameFetchStatus === 'loading' ? (
                            <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Hämtar...</>
                          ) : (
                            <><Download className="mr-1 h-3 w-3" />Hämta namn från TikTok</>
                          )}
                        </Button>
                      )}
                    </div>
                    {entry.nameFromTikTok && entry.nameFetchStatus !== 'error' && (
                      <p className="text-xs text-muted-foreground">Namnet ovan är hämtat från TikTok.</p>
                    )}
                    {entry.nameFetchStatus === 'error' && (
                      <p className="text-xs text-red-700 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />{entry.nameFetchError}
                      </p>
                    )}
                  </div>
                )}

                {(entry.status === FILE_STATUS.READY ||
                  entry.status === FILE_STATUS.PROCESSING ||
                  entry.status === FILE_STATUS.ERROR) && (
                  entry.handle ? (
                    <p className="text-xs text-muted-foreground">
                      Visningsnamnet går att ändra fritt - data hamnar ändå på samma
                      konto som tidigare uppladdningar av @{entry.handle}.
                    </p>
                  ) : (
                    <p className="text-xs text-amber-700">
                      Kontots @-namn kunde inte läsas ur filen - ange visningsnamnet
                      manuellt.
                    </p>
                  )
                )}

                <div className="flex items-center gap-4 flex-wrap">
                  {entry.months.length > 0 && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <CalendarRange className="h-3 w-3 mr-1" />
                      <span>{entry.months.join(', ')}</span>
                    </div>
                  )}
                  {renderStatus(entry)}
                </div>

                {entry.warnings.length > 0 && (
                  <ul className="text-xs text-amber-700 list-disc list-inside">
                    {entry.warnings.map((warning, i) => <li key={i}>{warning}</li>)}
                  </ul>
                )}
              </div>
            </div>
          ))}

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
      <div className="flex flex-col gap-2 pt-2">
        {entriesWithVideos.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Att hämta namn från TikTok slår upp kontot hos TikTok - videons länk och din
            IP-adress skickas då dit. Din statistik lämnar aldrig webbläsaren, och
            ingenting hämtas förrän du klickar.
          </p>
        )}

        <div className="flex justify-between items-center gap-2 flex-wrap">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
              Avbryt
            </Button>
          )}

          <div className="flex items-center gap-2 flex-wrap ml-auto justify-end">
            {entriesWithVideos.length > 0 && (
              <Button
                variant="outline"
                onClick={handleFetchAllNames}
                disabled={isProcessing || isFetchingNames}
              >
                {isFetchingNames ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Hämtar {nameFetchProgress.done}/{nameFetchProgress.total}
                  </>
                ) : (
                  <><Download className="mr-2 h-4 w-4" />Hämta namn från TikTok för alla</>
                )}
              </Button>
            )}

            <Button
              onClick={handleProcessAll}
              disabled={!canProcess}
              className={cn(!onCancel && entriesWithVideos.length === 0 && "w-full")}
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Bearbetar...</>
              ) : (
                <><Play className="mr-2 h-4 w-4" />Bearbeta alla ({readyEntries.length} filer)</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
