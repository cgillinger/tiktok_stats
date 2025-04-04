import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { UploadCloud, FileWarning, Loader2, CheckCircle2, AlertCircle, FileType2, ArrowLeft, AlertTriangle, Calendar } from 'lucide-react';
import { handleFileUpload } from '@/utils/webStorageService';
import { processTikTokData, getDefaultColumnMappings, detectCSVType } from '@/utils/webDataProcessor';
import { useFileDetection } from './useFileDetection';
import { CSV_TYPES, CSV_TYPE_DISPLAY_NAMES } from '@/utils/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { getColumnMappings, saveAccountData } from '@/utils/webStorageService';
import { cn, formatDate } from '@/utils/utils';
import Papa from 'papaparse';

/**
 * Komponent för uppladdning av TikTok-CSV-filer
 * @param {Object} props - Komponentens properties
 * @param {Object} props.account - Kontot att ladda upp för
 * @param {Function} props.onSuccess - Callback när uppladdningen lyckas
 * @param {Function} props.onCancel - Callback när uppladdningen avbryts
 * @param {string} [props.forcedFileType] - Tvinga en specifik CSV-typ (overview eller video)
 */
export function FileUploader({ account, onSuccess, onCancel, forcedFileType = null }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState(forcedFileType);
  const [wrongFileTypeWarning, setWrongFileTypeWarning] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const fileInputRef = useRef(null);
  
  const { 
    file, 
    setFile, 
    fileType, 
    fileContent, 
    isDetecting, 
    error, 
    resetFile,
    getFileTypeDisplayName
  } = useFileDetection();

  // När en fil väljs, försök att identifiera datumintervallet
  useEffect(() => {
    if (file && fileContent && !isDetecting) {
      analyzeDateRange(fileContent, fileType || forcedFileType);
    }
  }, [file, fileContent, isDetecting, fileType, forcedFileType]);

  // Hantera när en fil väljs
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadError(null);
      setWrongFileTypeWarning(null);
      setDateRange(null);
    }
  };

  // Analysera datumintervall för filen
  const analyzeDateRange = (content, csvType) => {
    if (!content || !csvType) return;
    
    // Använd Papa Parse för att analysera CSV-innehållet
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          // Hitta datumfältet baserat på CSV-typ
          const dateField = csvType === CSV_TYPES.OVERVIEW ? 'date' : 'publish_time';
          
          // Hämta kolumnmappningar för att hitta rätt kolumnnamn
          getColumnMappings(csvType).then(mappings => {
            // Hitta det externa kolumnnamnet för datumfältet
            let externalDateField = null;
            for (const [external, internal] of Object.entries(mappings)) {
              if (internal === dateField) {
                externalDateField = external;
                break;
              }
            }
            
            if (!externalDateField) {
              // Fallback till standardnamn om mappningen inte hittas
              externalDateField = csvType === CSV_TYPES.OVERVIEW ? 'Datum' : 'Publiceringstid';
            }
            
            // Samla in alla datum från filen
            const dates = [];
            results.data.forEach(row => {
              const dateValue = row[externalDateField];
              if (dateValue) {
                try {
                  const date = new Date(dateValue);
                  if (!isNaN(date.getTime())) {
                    dates.push(date);
                  }
                } catch (e) {
                  console.warn('Kunde inte tolka datum:', dateValue);
                }
              }
            });
            
            // Om några datum hittades, beräkna intervallet
            if (dates.length > 0) {
              const sortedDates = [...dates].sort((a, b) => a - b);
              setDateRange({
                startDate: sortedDates[0],
                endDate: sortedDates[sortedDates.length - 1]
              });
            }
          });
        } catch (err) {
          console.error('Fel vid analys av datumintervall:', err);
        }
      }
    });
  };

  // Hantera drag-och-släpp
  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const droppedFile = event.dataTransfer.files[0];
      setFile(droppedFile);
      setUploadError(null);
      setWrongFileTypeWarning(null);
      setDateRange(null);
    }
  };

  // Öppna filväljaren
  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  // Check if detected file type matches expected type
  React.useEffect(() => {
    if (fileType && forcedFileType && fileType !== forcedFileType) {
      setWrongFileTypeWarning({
        detectedType: fileType,
        expectedType: forcedFileType
      });
    } else {
      setWrongFileTypeWarning(null);
    }
  }, [fileType, forcedFileType]);

  // Processar och laddar upp datan
  const handleUpload = async () => {
    if (!file || !fileContent) {
      setUploadError('Ingen fil vald');
      return;
    }
    
    if (!account) {
      setUploadError('Inget konto valt');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Använd vald filtyp (manuellt vald eller forcerad eller automatiskt detekterad)
      const typeToUse = selectedFileType || forcedFileType || fileType;
      
      if (!typeToUse) {
        throw new Error('Filtyp kunde inte detekteras eller väljas');
      }

      // Hämta kolumnmappningar för denna filtyp
      let mappings = await getColumnMappings(typeToUse);
      
      // Om inga mappningar finns, använd standard
      if (!mappings || Object.keys(mappings).length === 0) {
        mappings = getDefaultColumnMappings(typeToUse);
      }

      // Bearbeta data
      const processedData = await processTikTokData(fileContent, mappings, typeToUse);
      
      // Spara data för detta konto
      await saveAccountData(account.id, typeToUse, processedData.data);
      
      // Visa framgångsmeddelande
      setUploadSuccess(true);
      
      // Anropa success callback
      if (onSuccess) {
        setTimeout(() => {
          onSuccess({
            accountId: account.id,
            csvType: typeToUse,
            processedData,
            filename: file.name
          });
        }, 1500);
      }
    } catch (err) {
      console.error('Fel vid uppladdning:', err);
      setUploadError(`Fel vid bearbetning: ${err.message || 'Okänt fel'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Visa vyn med framgångsmeddelande
  if (uploadSuccess) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4 py-6">
            <div className="bg-green-100 rounded-full p-3 text-green-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold text-green-700">Uppladdning slutförd!</h3>
            <p className="text-muted-foreground">
              {file?.name} har laddats upp och bearbetats framgångsrikt.
            </p>
            <Button onClick={() => onSuccess && onSuccess()}>
              Fortsätt
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Ladda upp statistikfil</CardTitle>
            <CardDescription>
              {account ? (
                <>
                  Välj en TikTok-statistikfil för {account.name}
                  {forcedFileType && (
                    <> ({CSV_TYPE_DISPLAY_NAMES[forcedFileType]})</>
                  )}
                </>
              ) : (
                <>Välj ett konto innan du laddar upp</>
              )}
            </CardDescription>
          </div>
          {onCancel && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onCancel}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Tillbaka
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div 
          className={cn(
            "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
            file ? 'border-primary bg-primary/5' : 'border-border',
            isUploading && 'opacity-50 cursor-not-allowed'
          )}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={isUploading ? undefined : handleBrowseClick}
        >
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={isUploading}
          />
          
          <div className="flex flex-col items-center justify-center space-y-4">
            <UploadCloud className="w-12 h-12 text-muted-foreground" />
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {file ? file.name : 'Släpp CSV-fil här eller klicka för att bläddra'}
              </h3>
              
              {!file && (
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Ladda upp en CSV-fil med TikTok-statistik. 
                  {forcedFileType ? (
                    <> Välj en fil med {CSV_TYPE_DISPLAY_NAMES[forcedFileType].toLowerCase()}.</>
                  ) : (
                    <> Filen kan vara antingen översiktsdata eller videodata.</>
                  )}
                </p>
              )}
              
              {file && !isDetecting && fileType && (
                <div className="flex items-center justify-center space-x-2 text-sm text-primary">
                  <FileType2 className="h-4 w-4" />
                  <span>Identifierad som: {getFileTypeDisplayName()}</span>
                </div>
              )}
              
              {file && isDetecting && (
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyserar fil...</span>
                </div>
              )}
              
              {file && dateRange && (
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground mt-2">
                  <Calendar className="h-4 w-4" />
                  <span>Period: {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Wrong file type warning */}
        {wrongFileTypeWarning && (
          <Alert variant="warning" className="mt-4 border-yellow-300 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Fel filtyp upptäckt</AlertTitle>
            <AlertDescription className="text-yellow-700">
              <p>Denna fil verkar innehålla <strong>{CSV_TYPE_DISPLAY_NAMES[wrongFileTypeWarning.detectedType]}</strong>, 
              men du försöker ladda upp den som <strong>{CSV_TYPE_DISPLAY_NAMES[wrongFileTypeWarning.expectedType]}</strong>.</p>
              <p className="mt-1">Du kan fortsätta ändå, men det kan leda till felaktig databearbetning.</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Error message */}
        {(error || uploadError) && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Fel vid filhantering</AlertTitle>
            <AlertDescription>{error || uploadError}</AlertDescription>
          </Alert>
        )}

        {file && !error && (
          <div className="mt-4 border rounded-md p-4 bg-muted/20">
            <h4 className="font-medium mb-2">Filtyp</h4>
            <div className="space-y-4">
              <Select
                value={selectedFileType || forcedFileType || fileType || ''}
                onValueChange={setSelectedFileType}
                disabled={isUploading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Välj filtyp manuellt..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CSV_TYPES.OVERVIEW}>{CSV_TYPE_DISPLAY_NAMES[CSV_TYPES.OVERVIEW]}</SelectItem>
                  <SelectItem value={CSV_TYPES.VIDEO}>{CSV_TYPE_DISPLAY_NAMES[CSV_TYPES.VIDEO]}</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="text-xs text-muted-foreground">
                <p>Filtyp detekteras automatiskt, men du kan välja manuellt om det behövs.</p>
                <ul className="list-disc list-inside mt-1">
                  <li><strong>Översiktsdata</strong>: Innehåller daglig statistik, räckvidd, följare, etc.</li>
                  <li><strong>Videodata</strong>: Innehåller statistik för varje enskild video</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => {
            resetFile();
            onCancel && onCancel();
          }}
          disabled={isUploading}
        >
          Avbryt
        </Button>
        
        <Button 
          onClick={handleUpload}
          disabled={!file || isDetecting || isUploading || !account || (!fileType && !forcedFileType && !selectedFileType)}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Bearbetar...
            </>
          ) : 'Ladda upp'}
        </Button>
      </CardFooter>
    </Card>
  );
}
