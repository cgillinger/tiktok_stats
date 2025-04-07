import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Save, AlertCircle, CheckCircle2, Loader2, Info, RefreshCw, ArrowLeft, Globe } from 'lucide-react';
import { 
  getCurrentMappings,
  updateMappings,
  resetMappings,
  getFieldGroups,
  getDisplayName,
  getAlternativeNames,
  clearMappingsCache
} from './columnMappingService';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { CSV_TYPES, CSV_TYPE_DISPLAY_NAMES, OVERVIEW_FIELDS, OVERVIEW_FIELDS_ENGLISH, VIDEO_FIELDS, VIDEO_FIELDS_ENGLISH } from '@/utils/constants';

/**
 * Komponent för att redigera kolumnmappningar för CSV-filer
 * @param {Object} props - Komponentens properties
 * @param {Function} props.onBack - Callback för att gå tillbaka
 */
export function ColumnMappingEditor({ onBack }) {
  const [csvType, setCsvType] = useState(CSV_TYPES.OVERVIEW);
  const [mappings, setMappings] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showExamples, setShowExamples] = useState({});

  // Ladda mappningar när csv-typ ändras
  useEffect(() => {
    loadMappings();
  }, [csvType]);

  const loadMappings = async () => {
    console.log(`ColumnMappingEditor: Börjar ladda mappningar för ${csvType}`);
    setIsLoading(true);
    
    try {
      const data = await getCurrentMappings(csvType);
      console.log(`ColumnMappingEditor: Laddade mappningar för ${csvType}:`, data);
      setMappings(data);
      setError(null);
    } catch (err) {
      console.error(`ColumnMappingEditor: Fel vid laddning för ${csvType}:`, err);
      setError('Kunde inte ladda kolumnmappningar: ' + err.message);
    } finally {
      setIsLoading(false);
      console.log(`ColumnMappingEditor: Laddning slutförd för ${csvType}`);
    }
  };

  const handleSave = async () => {
    console.log(`ColumnMappingEditor: Börjar spara ändringar för ${csvType}`);
    console.log('ColumnMappingEditor: Mappningar att spara:', mappings);
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Spara mappningarna
      await updateMappings(csvType, mappings);
      console.log('ColumnMappingEditor: Sparning lyckades');
      
      // Rensa cachen för att säkerställa att alla komponenter får de nya mappningarna
      clearMappingsCache();
      
      // Visa framgångsmeddelande
      setSuccessMessage('Ändringarna har sparats.');
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      console.error('ColumnMappingEditor: Fel vid sparning:', err);
      setError('Kunde inte spara ändringarna: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    console.log(`ColumnMappingEditor: Återställer till standardvärden för ${csvType}`);
    
    setIsResetting(true);
    setError(null);
    
    try {
      // Återställ mappningar till standard
      const defaultMappings = await resetMappings(csvType);
      setMappings(defaultMappings);
      console.log('ColumnMappingEditor: Återställning lyckades');
      
      // Rensa cachen för att säkerställa att alla komponenter får de nya mappningarna
      clearMappingsCache();
      
      // Visa framgångsmeddelande
      setSuccessMessage('Mappningarna har återställts till standardvärden.');
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      console.error('ColumnMappingEditor: Fel vid återställning:', err);
      setError('Kunde inte återställa mappningarna: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  // Hantera värdeändringar i input-fält
  const handleValueChange = (originalName, internalName, newValue, language) => {
    if (!newValue.trim()) {
      setError('Kolumnnamn kan inte vara tomt');
      return;
    }
    
    console.log('ColumnMappingEditor: Ändrar mappning');
    console.log('Från:', originalName);
    console.log('Till:', newValue);
    console.log('Språk:', language);
    
    // Kontrollera om det nya värdet redan finns som en nyckel för ett annat fält
    const existingMapping = Object.entries(mappings).find(([key, value]) => 
      key !== originalName && key === newValue && value !== internalName
    );
    
    if (existingMapping) {
      setError(`Kolumnnamnet "${newValue}" används redan för fältet "${existingMapping[1]}". Välj ett annat namn.`);
      return;
    }
    
    setMappings(prev => {
      // Skapa en kopia av mappningarna
      const newMappings = { ...prev };
      
      // Om vi tar bort en befintlig mappning, men ser till att det finns en annan mappning för samma interna fält
      if (originalName && originalName !== newValue) {
        // Ta bort den gamla mappningen
        delete newMappings[originalName];
      }
      
      // Lägg till den nya mappningen
      if (newValue && newValue.trim() !== '') {
        newMappings[newValue] = internalName;
      }
      
      console.log('ColumnMappingEditor: Nya mappningar:', newMappings);
      return newMappings;
    });
    
    // Rensa eventuellt tidigare fel
    setError(null);
  };

  // Visa/dölj exempel för ett fält
  const toggleExamples = (internalName) => {
    setShowExamples(prev => ({
      ...prev,
      [internalName]: !prev[internalName]
    }));
  };
  
  // Hantera klick på ett exempel för att kopiera det
  const handleExampleClick = (exampleName, internalName, language) => {
    // Hitta befintlig mappning för detta interna fält och språk
    let existingName = null;
    
    if (language === 'sv') {
      // Leta efter en svensk mappning
      for (const [key, value] of Object.entries(mappings)) {
        if (value === internalName && OVERVIEW_FIELDS[internalName] === key || VIDEO_FIELDS[internalName] === key) {
          existingName = key;
          break;
        }
      }
    } else {
      // Leta efter en engelsk mappning
      for (const [key, value] of Object.entries(mappings)) {
        if (value === internalName && OVERVIEW_FIELDS_ENGLISH[internalName] === key || VIDEO_FIELDS_ENGLISH[internalName] === key) {
          existingName = key;
          break;
        }
      }
    }
    
    handleValueChange(existingName, internalName, exampleName, language);
  };

  // Hämta alla mappningar för ett internt fältnamn
  const getMappingsForInternalName = (internalName) => {
    return Object.entries(mappings)
      .filter(([_, value]) => value === internalName)
      .map(([key, _]) => key);
  };

  // Hämta den svenska mappningen för ett internt fält
  const getSwedishMapping = (internalName) => {
    // Standardmappning från konstanter
    const defaultMapping = csvType === CSV_TYPES.OVERVIEW 
      ? OVERVIEW_FIELDS[internalName] 
      : VIDEO_FIELDS[internalName];
    
    // Leta efter en befintlig svensk mappning i mappings
    for (const [key, value] of Object.entries(mappings)) {
      if (value === internalName) {
        // Om nyckeln matchar standardmappningen eller innehåller svenska tecken (å, ä, ö)
        if (key === defaultMapping || /[åäö]/i.test(key)) {
          return key;
        }
      }
    }
    
    // Om ingen hittades, returnera standardmappningen
    return defaultMapping;
  };

  // Hämta den engelska mappningen för ett internt fält
  const getEnglishMapping = (internalName) => {
    // Standardmappning från konstanter
    const defaultMapping = csvType === CSV_TYPES.OVERVIEW 
      ? OVERVIEW_FIELDS_ENGLISH[internalName] 
      : VIDEO_FIELDS_ENGLISH[internalName];
    
    // Leta efter en befintlig engelsk mappning i mappings
    for (const [key, value] of Object.entries(mappings)) {
      if (value === internalName) {
        // Om nyckeln matchar standardmappningen eller inte innehåller svenska tecken (å, ä, ö)
        if (key === defaultMapping || (!/[åäö]/i.test(key) && key !== OVERVIEW_FIELDS[internalName] && key !== VIDEO_FIELDS[internalName])) {
          return key;
        }
      }
    }
    
    // Om ingen hittades, returnera standardmappningen
    return defaultMapping;
  };

  // Visa laddningsindikator
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p>Laddar kolumnmappningar...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Hämta fältgrupper för vald CSV-typ
  const fieldGroups = getFieldGroups(csvType);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Hantera kolumnmappningar</CardTitle>
          {onBack && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Tillbaka
            </Button>
          )}
        </div>
        <CardDescription>
          När TikTok ändrar kolumnnamn i exportfilerna behöver du uppdatera mappningarna här.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* CSV-typsväljare */}
          <Tabs 
            value={csvType} 
            onValueChange={setCsvType}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value={CSV_TYPES.OVERVIEW}>
                {CSV_TYPE_DISPLAY_NAMES[CSV_TYPES.OVERVIEW]}
              </TabsTrigger>
              <TabsTrigger value={CSV_TYPES.VIDEO}>
                {CSV_TYPE_DISPLAY_NAMES[CSV_TYPES.VIDEO]}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Felmeddelande */}
          {error && (
            <Alert variant="destructive" className="animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fel</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Framgångsmeddelande */}
          {success && (
            <Alert className="bg-green-50 border-green-200 animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Ändringar sparade</AlertTitle>
              <AlertDescription className="text-green-700">
                <div className="space-y-2">
                  <p>{successMessage}</p>
                  <p className="font-semibold">Du måste ladda in en ny CSV-fil för att ändringarna ska börja gälla.</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Instruktioner */}
          <div className="bg-muted/40 p-4 rounded-md border text-sm">
            <h4 className="font-medium mb-2">Så här uppdaterar du mappningar:</h4>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Ladda upp en ny CSV-fil från TikTok</li>
              <li>Om filen inte kan läsas in, notera vilka kolumner som saknas</li>
              <li>Hitta kolumnen med det gamla namnet under <strong>Svenska</strong> eller <strong>Engelska</strong> och ändra det till det nya namnet som TikTok nu använder</li>
              <li>Klicka på <strong>Spara ändringar</strong></li>
              <li>Ladda upp CSV-filen igen</li>
            </ol>
            <div className="mt-2 text-blue-600 font-medium flex items-center">
              <Globe className="h-4 w-4 mr-1" />
              <span>
                Uppdatera både svenska och engelska kolumnnamn för bästa kompatibilitet.
              </span>
            </div>
          </div>

          {/* Mappningstabeller per kategori */}
          {Object.entries(fieldGroups).map(([groupName, internalNames]) => (
            <div key={groupName}>
              <h3 className="text-lg font-semibold mb-2">{groupName}</h3>
              <div className="rounded-md border mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/4">Fältnamn</TableHead>
                      <TableHead className="w-1/3">Svenska kolumnnamn</TableHead>
                      <TableHead className="w-1/3">Engelska kolumnnamn</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {internalNames.map(internalName => {
                      const swedishMapping = getSwedishMapping(internalName);
                      const englishMapping = getEnglishMapping(internalName);
                      
                      return (
                        <React.Fragment key={internalName}>
                          <TableRow>
                            <TableCell className="font-medium">
                              {getDisplayName(internalName, csvType)}
                            </TableCell>
                            {/* Svenska mappning */}
                            <TableCell>
                              <Input
                                value={swedishMapping || ''}
                                onChange={(e) => handleValueChange(swedishMapping, internalName, e.target.value, 'sv')}
                                className="max-w-sm"
                                disabled={isSaving || isResetting}
                              />
                            </TableCell>
                            {/* Engelska mappning */}
                            <TableCell>
                              <Input
                                value={englishMapping || ''}
                                onChange={(e) => handleValueChange(englishMapping, internalName, e.target.value, 'en')}
                                className="max-w-sm"
                                disabled={isSaving || isResetting}
                              />
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => toggleExamples(internalName)}
                                title="Visa exempel på vanliga kolumnnamn"
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          
                          {/* Visa exempel på möjliga kolumnnamn */}
                          {showExamples[internalName] && (
                            <TableRow>
                              <TableCell colSpan={4} className="bg-slate-50">
                                <div className="p-2 text-sm">
                                  <p className="font-medium mb-1">Vanliga kolumnnamn för detta fält:</p>
                                  
                                  <div className="space-y-2">
                                    {/* Svenska exempel */}
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground">Svenska:</p>
                                      <div className="flex flex-wrap gap-1 pl-2 text-gray-600">
                                        {getAlternativeNames(internalName, mappings)
                                          .filter(name => /[åäö]/i.test(name) || name === OVERVIEW_FIELDS[internalName] || name === VIDEO_FIELDS[internalName])
                                          .map((name, i) => (
                                          <button
                                            key={i} 
                                            className="px-2 py-1 rounded hover:bg-blue-100 hover:text-blue-600 border border-gray-200"
                                            onClick={() => handleExampleClick(name, internalName, 'sv')}
                                          >
                                            {name}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    
                                    {/* Engelska exempel */}
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground">Engelska:</p>
                                      <div className="flex flex-wrap gap-1 pl-2 text-gray-600">
                                        {getAlternativeNames(internalName, mappings)
                                          .filter(name => !/[åäö]/i.test(name) && name !== OVERVIEW_FIELDS[internalName] && name !== VIDEO_FIELDS[internalName])
                                          .map((name, i) => (
                                          <button
                                            key={i} 
                                            className="px-2 py-1 rounded hover:bg-blue-100 hover:text-blue-600 border border-gray-200"
                                            onClick={() => handleExampleClick(name, internalName, 'en')}
                                          >
                                            {name}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <p className="mt-2 text-xs text-gray-500">
                                    Klicka på något av namnen ovan för att använda det.
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}

          <div className="flex justify-between">
            <Button 
              onClick={handleReset} 
              disabled={isResetting || isSaving}
              variant="outline"
              className="min-w-[100px]"
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Återställer...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Återställ till standard
                </>
              )}
            </Button>

            <Button 
              onClick={handleSave} 
              disabled={isSaving || isResetting}
              className="min-w-[100px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sparar...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Spara ändringar
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}