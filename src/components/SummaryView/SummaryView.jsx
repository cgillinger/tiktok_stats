import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight, 
  FileDown, 
  FileSpreadsheet, 
  Calculator,
  Calendar,
  Search,
  Info,
  BarChart,
  List
} from 'lucide-react';
import { Input } from '../ui/input';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { SUMMARY_VIEW_AVAILABLE_FIELDS } from '@/utils/constants';
import { formatDate, formatNumber } from '@/utils/utils';
import { CopyableValue } from '../ui/copyable-value';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';

/**
 * Komponent för visning av översiktsdata
 * @param {Object} props - Komponentens properties
 * @param {Array} props.data - Data att visa
 * @param {Array} props.selectedFields - Valda fält att visa
 * @param {Object} props.account - Kontot som data tillhör
 * @param {Array} props.accounts - Lista över alla konton
 * @param {Function} props.onAccountFilter - Callback vid filtrering på konto
 * @param {string} props.initialSelectedAccountId - Initialt valt konto-ID ('all' för alla)
 */
export function SummaryView({ 
  data, 
  selectedFields, 
  account, 
  accounts = [], 
  onAccountFilter,
  initialSelectedAccountId = 'all'
}) {
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Använd initialSelectedAccountId som standardvärde, defaulta till 'all'
  const [selectedAccountId, setSelectedAccountId] = useState(initialSelectedAccountId || 'all');
  
  const [viewByAccount, setViewByAccount] = useState(false);
  const [showInfoText, setShowInfoText] = useState(false);
  
  const PAGE_SIZE_OPTIONS = [
    { value: '10', label: '10 per sida' },
    { value: '20', label: '20 per sida' },
    { value: '50', label: '50 per sida' },
    { value: '100', label: '100 per sida' }
  ];

  // Fields that can't be aggregated in account view
  const NON_AGGREGATABLE_FIELDS = ['reach'];

  // Fields that should be calculated differently in account view
  const CALCULATED_FIELDS = ['engagement_rate'];

  // Check if there are multiple accounts with data
  const hasMultipleAccounts = useMemo(() => {
    const accountsWithData = new Set();
    data.forEach(item => {
      if (item.accountId) {
        accountsWithData.add(item.accountId);
      }
    });
    return accountsWithData.size > 1;
  }, [data]);

  // Återställ till första sidan när data, pageSize eller sortering ändras
  useEffect(() => {
    setCurrentPage(1);
  }, [data, pageSize, sortConfig, selectedAccountId, viewByAccount]);

  // Uppdatera valt konto när initialSelectedAccountId ändras
  useEffect(() => {
    setSelectedAccountId(initialSelectedAccountId || 'all');
  }, [initialSelectedAccountId]);

  // Beräkna datumintervall när data laddas
  useEffect(() => {
    if (data && data.length > 0) {
      const dates = data
        .map(item => item.date)
        .filter(date => date);
      
      if (dates.length > 0) {
        const sortedDates = [...dates].sort();
        setDateRange({
          startDate: sortedDates[0],
          endDate: sortedDates[sortedDates.length - 1]
        });
      }
    }
  }, [data]);

  // Hantera när konto ändras
  const handleAccountChange = (accountId) => {
    setSelectedAccountId(accountId);
    if (onAccountFilter) {
      onAccountFilter(accountId);
    }
  };

  // Hantera sortering
  const handleSort = (key) => {
    setSortConfig((currentSort) => ({
      key,
      direction: currentSort.key === key && currentSort.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Hämta sorteringsikon
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4 ml-1" /> : 
      <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Hämta displaynamn för ett fält
  const getDisplayName = (field) => {
    return SUMMARY_VIEW_AVAILABLE_FIELDS[field] || field;
  };

  // Hitta kontonamn baserat på ID
  const getAccountName = (accountId) => {
    if (!accountId) return 'Okänt konto';
    const foundAccount = accounts.find(acc => acc.id === accountId);
    return foundAccount ? foundAccount.name : 'Okänt konto';
  };

  // Toggle visning mellan per dag och per konto
  const handleToggleView = () => {
    setViewByAccount(!viewByAccount);
  };

  // Filtrera bort fält som inte kan aggregeras i kontovisning
  const getVisibleFields = () => {
    if (!viewByAccount) {
      return selectedFields;
    }
    return selectedFields.filter(field => !NON_AGGREGATABLE_FIELDS.includes(field));
  };

  // Filtrera, sortera och paginera data
  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return { 
      paginatedData: [], 
      totalPages: 0, 
      totals: {} 
    };
    
    // Filtrera data baserat på sökning och konto
    let filteredData = data;
    
    // Filtrera baserat på valt konto om inte "alla" är valt
    if (selectedAccountId !== 'all') {
      filteredData = filteredData.filter(item => item.accountId === selectedAccountId);
    }
    
    // Filtrera baserat på sökning
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filteredData = filteredData.filter(item => {
        // Sök i datumet
        const date = item.date ? new Date(item.date).toLocaleDateString() : '';
        if (date.toLowerCase().includes(search)) return true;
        
        // Sök i kontonamn
        const accountName = item.accountId ? getAccountName(item.accountId) : '';
        if (accountName.toLowerCase().includes(search)) return true;
        
        // Sök i övriga fält
        for (const field of selectedFields) {
          const value = item[field];
          if (value && String(value).toLowerCase().includes(search)) {
            return true;
          }
        }
        
        return false;
      });
    }
    
    // Aggregera data per konto om vyn är inställd på det
    let processableData = [...filteredData];
    
    if (viewByAccount) {
      const aggregatedData = [];
      const accountGroups = {};
      
      // Gruppera data per konto
      filteredData.forEach(item => {
        const accountId = item.accountId || 'unknown';
        if (!accountGroups[accountId]) {
          accountGroups[accountId] = [];
        }
        accountGroups[accountId].push(item);
      });
      
      // Aggregera data för varje konto
      for (const [accountId, items] of Object.entries(accountGroups)) {
        const accountData = {
          accountId,
          date: 'Totalt', // Placeholder för att behålla datumkolumnen
        };
        
        // Summera alla nummerriska fält
        selectedFields.forEach(field => {
          // Hoppa över icke-aggregerbara fält
          if (NON_AGGREGATABLE_FIELDS.includes(field)) {
            return;
          }
          
          // Hoppa över datum- och kontofält
          if (field === 'date' || field === 'accountId') {
            return;
          }
          
          // Beräkna summa för övriga numeriska fält
          if (!CALCULATED_FIELDS.includes(field)) {
            accountData[field] = items.reduce((sum, item) => {
              const value = item[field];
              return sum + (typeof value === 'number' ? value : 0);
            }, 0);
          }
        });
        
        // Beräkna engagement_rate baserat på summerade värden
        if (selectedFields.includes('engagement_rate')) {
          const interactions = accountData.interactions || 
            (accountData.likes || 0) + (accountData.comments || 0) + (accountData.shares || 0);
          const summedReach = items.reduce((sum, item) => sum + (item.reach || 0), 0);
          
          if (summedReach > 0) {
            accountData.engagement_rate = (interactions / summedReach) * 100;
          } else {
            accountData.engagement_rate = 0;
          }
        }
        
        aggregatedData.push(accountData);
      }
      
      processableData = aggregatedData;
    }
    
    // Sortera data
    let sortedData = [...processableData];
    if (sortConfig.key) {
      sortedData.sort((a, b) => {
        // Sortera på kontonamn om det är den valda kolumnen
        if (sortConfig.key === 'accountId') {
          const aName = getAccountName(a.accountId);
          const bName = getAccountName(b.accountId);
          return sortConfig.direction === 'asc'
            ? aName.localeCompare(bName)
            : bName.localeCompare(aName);
        }

        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return 1;
        if (bValue === null) return -1;

        // Specialhantering för datum
        if (sortConfig.key === 'date') {
          if (a.date === 'Totalt') return sortConfig.direction === 'asc' ? 1 : -1;
          if (b.date === 'Totalt') return sortConfig.direction === 'asc' ? -1 : 1;
          
          const aDate = new Date(aValue);
          const bDate = new Date(bValue);
          return sortConfig.direction === 'asc' 
            ? aDate - bDate 
            : bDate - aDate;
        }

        // Hantering för numeriska värden
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' 
            ? aValue - bValue 
            : bValue - aValue;
        }

        // Fallback till strängsortering
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        return sortConfig.direction === 'asc' 
          ? aStr.localeCompare(bStr) 
          : bStr.localeCompare(aStr);
      });
    }

    // Beräkna totalsummor för alla fält
    const totals = {};
    
    // Beräkna bara summor för numeriska fält (utom datum)
    if (sortedData.length > 0) {
      // Lägg alltid till datumet för totalraden
      totals.date = 'Totalt';
      // Lägg till kontonamn för totalraden (om konto visas)
      totals.accountId = '';
      
      // Om vi är i kontovisningen, beräkna totalsumma för alla konton
      if (viewByAccount) {
        selectedFields.forEach(field => {
          // Vissa fält ska inte summeras
          if (field === 'date' || field === 'accountId' || NON_AGGREGATABLE_FIELDS.includes(field)) {
            return;
          }
          
          // Beräkna summa för övriga numeriska fält
          if (!CALCULATED_FIELDS.includes(field)) {
            totals[field] = sortedData.reduce((sum, item) => {
              const value = item[field];
              return sum + (typeof value === 'number' ? value : 0);
            }, 0);
          }
        });
        
        // Specialhantering för engagement_rate - beräkna genomsnitt
        if (selectedFields.includes('engagement_rate')) {
          const sum = sortedData.reduce((sum, item) => {
            return sum + (typeof item.engagement_rate === 'number' ? item.engagement_rate : 0);
          }, 0);
          totals.engagement_rate = sortedData.length > 0 ? sum / sortedData.length : 0;
        }
      } else {
        // I dagsvisning, beräkna totalsummor normalt
        selectedFields.forEach(field => {
          // Vissa fält ska inte summeras
          if (field === 'date' || field === 'accountId' || field === 'engagement_rate') {
            return;
          }
          
          // Beräkna summa för övriga numeriska fält
          totals[field] = sortedData.reduce((sum, item) => {
            const value = item[field];
            return sum + (typeof value === 'number' ? value : 0);
          }, 0);
        });
        
        // Specialhantering för engagement_rate - beräkna genomsnitt
        if (selectedFields.includes('engagement_rate')) {
          const sum = sortedData.reduce((sum, item) => {
            return sum + (typeof item.engagement_rate === 'number' ? item.engagement_rate : 0);
          }, 0);
          totals.engagement_rate = sortedData.length > 0 ? sum / sortedData.length : 0;
        }
      }
    }
    
    // Paginera data
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);
    const totalPages = Math.ceil(sortedData.length / pageSize);
    
    return {
      paginatedData,
      totalPages,
      filteredCount: filteredData.length,
      totals
    };
  }, [data, sortConfig, currentPage, pageSize, selectedFields, searchTerm, selectedAccountId, viewByAccount, accounts]);

  // Exportera data till Excel
  const handleExportToExcel = async () => {
    try {
      setIsLoading(true);
      
      // Formatera data för export
      const formattedData = formatDataForExport(data);
      
      // Generera filnamn
      let fileName;
      if (selectedAccountId !== 'all') {
        const accountName = getAccountName(selectedAccountId);
        fileName = `${accountName.toLowerCase().replace(/\s+/g, '-')}-oversiktsdata.xlsx`;
      } else {
        fileName = 'tiktok-oversiktsdata.xlsx';
      }
      
      // Exportera med Electron API eller webbversion
      const result = await window.electronAPI.exportToExcel(formattedData, fileName);
      
      if (result.success) {
        console.log('Export till Excel lyckades:', result.filePath);
      }
    } catch (error) {
      console.error('Export till Excel misslyckades:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Exportera data till CSV
  const handleExportToCSV = async () => {
    try {
      setIsLoading(true);
      
      // Formatera data för export
      const formattedData = formatDataForExport(data);
      
      // Generera filnamn
      let fileName;
      if (selectedAccountId !== 'all') {
        const accountName = getAccountName(selectedAccountId);
        fileName = `${accountName.toLowerCase().replace(/\s+/g, '-')}-oversiktsdata.csv`;
      } else {
        fileName = 'tiktok-oversiktsdata.csv';
      }
      
      // Exportera med Electron API eller webbversion
      const result = await window.electronAPI.exportToCSV(formattedData, fileName);
      
      if (result.success) {
        console.log('Export till CSV lyckades:', result.filePath);
      }
    } catch (error) {
      console.error('Export till CSV misslyckades:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Formatera data för export
  const formatDataForExport = (dataToExport) => {
    if (!dataToExport || !Array.isArray(dataToExport)) return [];
    
    // Filtrera data om ett konto är valt
    let filteredData = dataToExport;
    if (selectedAccountId !== 'all') {
      filteredData = dataToExport.filter(item => item.accountId === selectedAccountId);
    }
    
    return filteredData.map(item => {
      const exportRow = {
        'Konto': item.accountId ? getAccountName(item.accountId) : 'Okänt konto',
        'Datum': item.date ? formatDate(item.date) : 'Okänt'
      };
      
      // Lägg till valda fält
      selectedFields.forEach(field => {
        if (field === 'date' || field === 'accountId') return; // Hoppa över datum och konto som redan är tillagt
        
        const displayName = getDisplayName(field);
        const value = item[field];
        
        // Formatera värden
        if (value === null || value === undefined) {
          exportRow[displayName] = '';
        } else if (typeof value === 'number') {
          exportRow[displayName] = value;
        } else {
          exportRow[displayName] = String(value);
        }
      });
      
      return exportRow;
    });
  };

  // Om inga fält är valda, visa meddelande
  if (selectedFields.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <p>Välj värden att visa i tabellen ovan</p>
        </div>
      </Card>
    );
  }

  // Om ingen data finns, visa meddelande
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <p>Ingen översiktsdata tillgänglig för detta konto</p>
          <p className="mt-2 text-sm">Ladda upp en översikts-CSV-fil för att se statistik</p>
        </div>
      </Card>
    );
  }

  // Få synliga fält baserat på visningsläge
  const visibleFields = getVisibleFields();

  return (
    <Card>
      <CardContent className="p-4">
        {/* Data och sökverktyg */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          {/* Datumintervall */}
          {dateRange.startDate && dateRange.endDate && (
            <div className="flex items-center text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-md">
              <Calendar className="h-4 w-4 mr-2" />
              <span>
                Perioden {formatDate(dateRange.startDate)} till {formatDate(dateRange.endDate)}
              </span>
            </div>
          )}
          
          {/* Sökverktyg och export */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Kontoval om det finns fler än ett konto med data */}
            {hasMultipleAccounts && (
              <Select
                value={selectedAccountId}
                onValueChange={handleAccountChange}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Välj konto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla konton</SelectItem>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Sökfält */}
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            
            {/* Exportknappar */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportToCSV}
                disabled={isLoading}
                aria-label="Exportera till CSV"
              >
                <FileDown className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                onClick={handleExportToExcel}
                disabled={isLoading}
                aria-label="Exportera till Excel"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </div>
        
        {/* Växla mellan dagsvy och kontovy */}
        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Switch 
              id="view-toggle" 
              checked={viewByAccount}
              onCheckedChange={handleToggleView}
            />
            <Label htmlFor="view-toggle" className="flex space-x-2 items-center">
              {viewByAccount ? (
                <>
                  <BarChart className="h-4 w-4" />
                  <span>Visa per konto</span>
                </>
              ) : (
                <>
                  <List className="h-4 w-4" />
                  <span>Visa per dag</span>
                </>
              )}
            </Label>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInfoText(!showInfoText)}
            className="text-muted-foreground"
          >
            <Info className="h-4 w-4 mr-1" />
            Information om beräkningar
          </Button>
        </div>
        
        {/* Förklarande text om beräkningsskillnader */}
        {showInfoText && (
          <Alert className="mb-4 bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Information om statistikberäkningar</AlertTitle>
            <AlertDescription className="text-blue-700">
              <p>
                I översiktsvyn beräknas statistiken annorlunda jämfört med videovyn. Översiktsvyn visar totalstatistik 
                för varje dag, inklusive interaktioner från äldre inlägg, medan videovyn endast visar 
                interaktioner för videor som publicerades under den valda perioden.
              </p>
              <p className="mt-2">
                Detta kan leda till att summan av interaktioner och andra värden skiljer sig mellan översiktsvyn 
                och videovyn. Exempelvis kan en video som publicerades före den valda perioden fortfarande 
                generera interaktioner som syns i översiktsvyn men inte i videovyn.
              </p>
              <p className="mt-2">
                <strong>Engagemangsnivå (%)</strong> beräknas i översiktsvyn som 
                <code className="mx-1 px-1 py-0.5 bg-blue-100 rounded">
                  (likes + comments + shares) / reach * 100
                </code>
                och i videovyn som 
                <code className="mx-1 px-1 py-0.5 bg-blue-100 rounded">
                  (likes + comments + shares) / views * 100
                </code>
              </p>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Sökresultatinformation */}
        {searchTerm && (
          <div className="mb-4">
            <Alert variant="info" className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Sökresultat</AlertTitle>
              <AlertDescription className="text-blue-700">
                Visar {processedData.filteredCount} av {data.length} rader som matchar "{searchTerm}"
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Datatabell */}
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Always show account column first*/}
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                    onClick={() => handleSort('accountId')}
                  >
                    <div className="flex items-center">
                      Kontonamn {getSortIcon('accountId')}
                    </div>
                  </TableHead>
                  
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">
                      Datum {getSortIcon('date')}
                    </div>
                  </TableHead>
                  
                  {visibleFields
                    .filter(field => field !== 'date' && field !== 'accountId') // Filtrera bort datum och konto som visas separat
                    .map(field => (
                      <TableHead 
                        key={field}
                        className="cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                        onClick={() => handleSort(field)}
                      >
                        <div className="flex items-center">
                          {getDisplayName(field)} {getSortIcon(field)}
                        </div>
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Totalsumma rad */}
                <TableRow className="bg-primary/5 border-b-2 border-primary/20 font-medium">
                  {/* Kontokolumnen i totalsummaraden */}
                  <TableCell className="font-semibold">
                    <span className="text-primary">Alla konton</span>
                  </TableCell>
                  
                  <TableCell className="font-semibold flex items-center">
                    <Calculator className="w-4 h-4 mr-2 text-primary" />
                    <span className="text-primary">Totalt</span>
                  </TableCell>
                  
                  {visibleFields
                    .filter(field => field !== 'date' && field !== 'accountId')
                    .map((field) => (
                      <TableCell key={field} className="text-right font-semibold text-primary">
                        {processedData.totals[field] !== undefined 
                          ? (field === 'engagement_rate' 
                              ? <CopyableValue 
                                  value={processedData.totals[field].toFixed(2)} 
                                  formattedValue={`${processedData.totals[field].toFixed(2)}%`}
                                  align="right"
                                  className="font-semibold text-primary"
                                />
                              : <CopyableValue 
                                  value={processedData.totals[field]} 
                                  formattedValue={formatNumber(processedData.totals[field])}
                                  align="right"
                                  className="font-semibold text-primary"
                                />)
                          : ''}
                      </TableCell>
                    ))}
                </TableRow>

                {/* Datarader */}
                {processedData.paginatedData.map((item, index) => (
                  <TableRow key={`${item.date}-${item.accountId || 'unknown'}-${index}`}>
                    {/* Always show account name first */}
                    <TableCell className="whitespace-nowrap">
                      {item.accountId ? getAccountName(item.accountId) : 'Okänt konto'}
                    </TableCell>
                    
                    <TableCell className="whitespace-nowrap font-medium">
                      {item.date ? (item.date === 'Totalt' ? 'Totalt' : formatDate(item.date)) : 'Okänt datum'}
                    </TableCell>
                    
                    {visibleFields
                      .filter(field => field !== 'date' && field !== 'accountId')
                      .map((field) => (
                        <TableCell key={field} className="text-right">
                          {item[field] === null || item[field] === undefined 
                            ? '-' 
                            : field === 'engagement_rate'
                              ? <CopyableValue 
                                  value={item[field].toFixed(2)} 
                                  formattedValue={`${item[field].toFixed(2)}%`}
                                  align="right"
                                />
                              : <CopyableValue 
                                  value={item[field]} 
                                  formattedValue={formatNumber(item[field])}
                                  align="right"
                                />
                          }
                        </TableCell>
                      ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Visa</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(newSize) => {
                  setPageSize(Number(newSize));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-6">
              <span className="text-sm text-muted-foreground">
                Visar {((currentPage - 1) * pageSize) + 1} till {Math.min(currentPage * pageSize, processedData.filteredCount)} av {processedData.filteredCount}
              </span>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Föregående sida</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(processedData.totalPages, p + 1))}
                  disabled={currentPage >= processedData.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Nästa sida</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}