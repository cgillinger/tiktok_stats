import React, { useState, useRef, useEffect } from 'react';
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
  FileType2, 
  Calendar,
  Trash, 
  Plus
} from 'lucide-react';
import { getColumnMappings, saveAccountData } from '@/utils/webStorageService';
import { processTikTokData, getDefaultColumnMappings, detectCSVType } from '@/utils/webDataProcessor';
import { CSV_TYPES, CSV_TYPE_DISPLAY_NAMES } from '@/utils/constants';
import { cn, formatDate } from '@/utils/utils';
import Papa from 'papaparse';

/**
 * Komponent för att ladda upp flera CSV-filer samtidigt
 * @param {Object} props - Komponentens properties
 * @param {Object} props.account - Konto att ladda upp för (om null, skapas nytt konto)
 * @param {Function} props.onSuccess - Callback när uppladdningen lyckas
 * @param {Function} props.onCancel - Callback när uppladdningen avbryts
 * @param {Function} props.onCreateAccount - Callback för att skapa nytt konto
 */
export function MultiFileUploader({ account, onSuccess, onCancel, onCreateAccount }) {
  // State för att hantera formulärdata och filer
  const [accountName, setAccountName] = useState(account ? account.name : '');
  
  // State för att hantera filer
  const [csvFiles, setCsvFiles] = useState([]);
  const [analyzedFiles, setAnalyzedFiles] = useState([]);
  
  // State för laddningsindikation, fel och framgång
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Filinputs
  const fileInputRef = useRef(null);

  // Validera filerna och uppdatera datumintervaller när filerna ändras
  useEffect(() => {
    if (csvFiles.length > 0) {
      setAnalyzedFiles([]);
      Promise.all(csvFiles.map(analyzeFile))
        .then(results => {
          setAnalyzedFiles(results.filter(Boolean));
        })
        .catch(err => {
          console.error("Error analyzing files:", err);
          setError("Det gick inte att analysera filerna: " + err.message);
        });
    } else {
      setAnalyzedFiles([]);
    }
  }, [csvFiles]);

  /**
   * Analyserar en fil för att identifiera filtyp och datumintervall
   * @param {File} file - Filen att analysera
   * @returns {Promise<Object>} - Promise med analysdata
   */
  const analyzeFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          
          // Endast parsa ett representativt sampel för snabbare analys
          // Detta förbättrar prestandan vid stora filer
          const previewContent = content.slice(0, 50000); // Begränsa till 50 KB för analys
          
          // Parsa CSV med PapaParse för att få headers och data
          Papa.parse(previewContent, {
            header: true,
            preview: 50, // Analysera bara 50 rader för snabbare detektering
            skipEmptyLines: true,
            complete: (results) => {
              try {
                if (!results.meta || !results.meta.fields || results.meta.fields.length === 0) {
                  reject(new Error('Kunde inte läsa kolumnrubriker från CSV-filen'));
                  return;
                }
                
                // Detektera filtyp baserat på kolumnrubriker
                const detectedType = detectCSVType(results.meta.fields);
                console.log(`Detekterad filtyp för ${file.name}: ${detectedType}`);
                
                // Hitta datumfält baserat på filtyp
                let dateField;
                if (detectedType === CSV_TYPES.OVERVIEW) {
                  // Leta efter datumfält i översiktsdata
                  dateField = results.meta.fields.find(field => 
                    field.toLowerCase().includes('datum') || 
                    field.toLowerCase().includes('date')
                  );
                } else {
                  // Leta efter publiceringsdatum i videodata
                  dateField = results.meta.fields.find(field => 
                    field.toLowerCase().includes('publiceringstid') || 
                    field.toLowerCase().includes('publish') ||
                    field.toLowerCase().includes('date')
                  );
                }
                
                let dateRange = null;
                if (dateField) {
                  // Samla in alla giltiga datum
                  const dates = [];
                  results.data.forEach(row => {
                    const dateValue = row[dateField];
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
                    dateRange = {
                      startDate: sortedDates[0],
                      endDate: sortedDates[sortedDates.length - 1]
                    };
                  }
                }
                
                resolve({
                  file,
                  detectedType,
                  dateRange,
                  content,  // Spara hela innehållet för senare bearbetning
                  headers: results.meta.fields,
                  rowCount: results.data.length
                });
              } catch (err) {
                console.error('Fel vid analys av CSV-fil:', err);
                reject(err);
              }
            },
            error: (err) => {
              console.error('Fel vid parsning av CSV:', err);
              reject(err);
            }
          });
        } catch (err) {
          console.error('Fel vid läsning av fil:', err);
          reject(err);
        }
      };
      
      reader.onerror = (err) => {
        console.error('Fel vid läsning av fil:', err);
        reject(err);
      };
      
      reader.readAsText(file);
    });
  };

  /**
   * Hantera ändring av filer
   * @param {Event} event - Event objekt
   */
  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length === 0) return;
    
    // Begränsa till max 2 filer
    const newFiles = [...csvFiles];
    selectedFiles.forEach(file => {
      if (newFiles.length < 2 && !newFiles.find(f => f.name === file.name)) {
        newFiles.push(file);
      }
    });
    
    setCsvFiles(newFiles);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Öppna filväljaren
   */
  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  /**
   * Ta bort en vald fil
   * @param {File} fileToRemove - Filen att ta bort
   */
  const handleRemoveFile = (fileToRemove) => {
    setCsvFiles(csvFiles.filter(file => file !== fileToRemove));
    setAnalyzedFiles(analyzedFiles.filter(item => item.file !== fileToRemove));
  };

  /**
   * Ladda upp och bearbeta filerna med förbättrad feedback
   */
  const handleUpload = async () => {
    // Validera att vi har minst ett kontonamn och en fil
    if (!accountName.trim()) {
      setError('Du måste ange ett kontonamn');
      return;
    }
    
    if (csvFiles.length === 0) {
      setError('Du måste välja minst en fil att ladda upp');
      return;
    }
    
    // Starta uppladdning
    setIsUploading(true);
    setError(null);
    setUploadProgress(10); // Börja på 10% direkt för bättre feedback
    
    try {
      // Sparar kontouppgifter
      setUploadStage('Sparar kontouppgifter...');
      
      let currentAccount = account;
      
      if (!currentAccount) {
        // Skapa nytt konto
        const newAccount = await onCreateAccount({
          name: accountName.trim(),
          createdAt: Date.now()
        });
        
        currentAccount = newAccount;
      }
      
      if (!currentAccount || !currentAccount.id) {
        throw new Error('Det gick inte att skapa/hitta kontot');
      }
      
      setUploadProgress(20);
      
      // Processa och ladda upp filer
      const results = {
        overview: null,
        video: null
      };
      
      // Ladda upp varje fil
      for (let i = 0; i < analyzedFiles.length; i++) {
        const analyzedFile = analyzedFiles[i];
        
        if (!analyzedFile.detectedType || !analyzedFile.content) {
          console.warn('Hopping över fil utan detekterad typ eller innehåll:', analyzedFile.file?.name);
          continue;
        }
        
        setUploadStage(`Bearbetar ${analyzedFile.file.name}...`);
        setUploadProgress(30 + (i * 20)); // Progressiv feedback
        
        const typeToUse = analyzedFile.detectedType;
        
        try {
          // Hämta kolumnmappningar
          let mappings = await getColumnMappings(typeToUse);
          
          // Om inga mappningar finns, använd standard
          if (!mappings || Object.keys(mappings).length === 0) {
            mappings = getDefaultColumnMappings(typeToUse);
          }
          
          // Visa progressiv feedback för att undvika att användaren tror appen har hängt sig
          const progressUpdater = setInterval(() => {
            setUploadProgress(prev => {
              const newProgress = prev + 1;
              return newProgress > 90 ? 90 : newProgress;
            });
          }, 1000);
          
          // Bearbeta data
          const processedData = await processTikTokData(analyzedFile.content, mappings, typeToUse);
          
          // Stoppa progressuppdateringen
          clearInterval(progressUpdater);
          
          // Validera att vi har korrekt data
          if (!processedData.data || !Array.isArray(processedData.data) || processedData.data.length === 0) {
            console.warn('Ingen data bearbetades från filen');
            continue;
          }
          
          // Sätt upp progress för varje sparad fil
          setUploadProgress(70 + (i * 10));
          
          // Spara data
          await saveAccountData(currentAccount.id, typeToUse, processedData.data);
          
          results[typeToUse === CSV_TYPES.OVERVIEW ? 'overview' : 'video'] = {
            success: true,
            fileName: analyzedFile.file.name,
            dateRange: analyzedFile.dateRange,
            rowCount: processedData.data.length
          };
          
          console.log(`Data sparad för ${typeToUse} (${processedData.data.length} rader)`);
          
          // Uppdatera progress efter varje fil
          setUploadProgress(80 + (i * 10));
        } catch (err) {
          console.error(`Fel vid bearbetning av ${analyzedFile.file.name}:`, err);
          results[typeToUse === CSV_TYPES.OVERVIEW ? 'overview' : 'video'] = {
            success: false,
            fileName: analyzedFile.file.name,
            error: err.message
          };
        }
      }
      
      // Färdig!
      setUploadStage('Uppladdning slutförd');
      setUploadProgress(100);
      setUploadSuccess(true);
      
      // Anropa success callback efter en kort fördröjning för bättre användarupplevelse
      setTimeout(() => {
        if (onSuccess) {
          onSuccess({
            account: currentAccount,
            results: results
          });
        }
      }, 500); // Kortare delay för bättre respons
      
    } catch (err) {
      console.error('Fel vid uppladdning:', err);
      setError(`Fel vid uppladdning: ${err.message || 'Okänt fel'}`);
      setIsUploading(false);
    }
  };

  // Kontrollera om vi har filer av en viss typ
  const hasFileType = (type) => {
    return analyzedFiles.some(item => item.detectedType === type);
  };

  // Visa uppladdningsframgång
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
              Din data har laddats upp och bearbetats framgångsrikt.
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
        <CardTitle>
          {account ? `Lägg till data för ${account.name}` : 'Kontouppgifter'}
        </CardTitle>
        <CardDescription>
          {account 
            ? 'Ladda upp översiktsdata och/eller videodata för detta konto' 
            : 'Ange kontonamn och ladda upp dina TikTok-filer'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Felmeddelande */}
        {error && (
          <Alert variant="destructive" className="animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Fel</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Kontouppgifter */}
        {!account && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Kontouppgifter</h3>
            
            <div className="space-y-2">
              <Label htmlFor="account-name">Kontonamn *</Label>
              <Input
                id="account-name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Ex: P3, SVT, etc."
                disabled={isUploading}
                required
              />
            </div>
          </div>
        )}

        {/* Filuppladdning */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Ladda upp data</h3>
          <p className="text-sm text-muted-foreground">
            Ladda upp översiktsdata (daily stats) och/eller videodata (video specific stats) från TikTok. 
            Systemet känner automatiskt igen vilken typ av data som finns i filerna.
          </p>
          
          <input
            type="file"
            accept=".csv"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={isUploading || csvFiles.length >= 2}
          />
          
          {/* File display/selection area */}
          <div className="space-y-3">
            {csvFiles.length < 2 && (
              <div 
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  isUploading ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50 hover:bg-primary/5"
                )}
                onClick={() => !isUploading && handleBrowseClick()}
              >
                <div className="flex flex-col items-center justify-center space-y-2">
                  <UploadCloud className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      Klicka för att välja CSV-fil
                      {csvFiles.length > 0 ? ' (max 2 filer)' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ladda upp översiktsdata och/eller videodata
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Files display */}
            {csvFiles.map((file, index) => {
              const analyzedFile = analyzedFiles.find(item => item.file === file);
              const fileType = analyzedFile?.detectedType;
              const dateRange = analyzedFile?.dateRange;
              const rowCount = analyzedFile?.rowCount || 0;
              
              return (
                <div key={index} className="border rounded-lg p-4 bg-muted/10">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <FileType2 className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''}
                          {rowCount > 0 && fileType && 
                            <span className="text-green-600 ml-2">
                              • {rowCount} rader • {CSV_TYPE_DISPLAY_NAMES[fileType]} ✓
                            </span>
                          }
                          {!fileType && <span className="text-yellow-600 ml-2">• Analyserar...</span>}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile(file)}
                      disabled={isUploading}
                      title="Ta bort fil"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {dateRange && (
                    <div className="mt-2 flex items-center text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>
                        {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Status summary */}
          {analyzedFiles.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 p-3 border rounded-md bg-muted/5">
              <div className="flex items-center">
                <span className={`w-3 h-3 rounded-full mr-2 ${hasFileType(CSV_TYPES.OVERVIEW) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                <span className={hasFileType(CSV_TYPES.OVERVIEW) ? 'text-green-700' : 'text-gray-500'}>
                  Översiktsdata {hasFileType(CSV_TYPES.OVERVIEW) ? '✓' : '–'}
                </span>
              </div>
              <div className="flex items-center">
                <span className={`w-3 h-3 rounded-full mr-2 ${hasFileType(CSV_TYPES.VIDEO) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                <span className={hasFileType(CSV_TYPES.VIDEO) ? 'text-green-700' : 'text-gray-500'}>
                  Videodata {hasFileType(CSV_TYPES.VIDEO) ? '✓' : '–'}
                </span>
              </div>
            </div>
          )}
          
          {/* Laddningsindikator med förbättrad visuell feedback */}
          {isUploading && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">{uploadStage}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-2.5 rounded-full bg-primary relative transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                >
                  {/* Pulseffekt för bättre feedback */}
                  {uploadProgress < 100 && (
                    <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {uploadProgress < 30 && "Initierar bearbetning..."}
                {uploadProgress >= 30 && uploadProgress < 70 && "Omvandlar och bearbetar data..."}
                {uploadProgress >= 70 && uploadProgress < 90 && "Sparar dina data..."}
                {uploadProgress >= 90 && uploadProgress < 100 && "Nästan klar..."}
              </p>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={isUploading}
        >
          Avbryt
        </Button>
        
        <Button 
          onClick={handleUpload}
          disabled={
            isUploading || 
            (!account && !accountName.trim()) || 
            csvFiles.length === 0
          }
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Bearbetar...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              {account ? 'Lägg till data' : 'Skapa konto & ladda upp'}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}