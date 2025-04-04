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
  ExternalLink
} from 'lucide-react';
import { Input } from '../ui/input';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { VIDEO_VIEW_AVAILABLE_FIELDS } from '@/utils/constants';
import { formatDate, formatDateTime, formatNumber, truncateText } from '@/utils/utils';
import { CopyableValue } from '../ui/copyable-value';

/**
 * Komponent för visning av videodata
 * @param {Object} props - Komponentens properties
 * @param {Array} props.data - Data att visa
 * @param {Array} props.selectedFields - Valda fält att visa
 * @param {Object} props.account - Kontot som data tillhör
 * @param {Array} props.accounts - Lista över alla konton
 * @param {Function} props.onAccountFilter - Callback vid filtrering på konto
 * @param {string} props.initialSelectedAccountId - Initialt valt konto-ID ('all' för alla)
 */
export function VideoView({ 
  data, 
  selectedFields, 
  account, 
  accounts = [], 
  onAccountFilter,
  initialSelectedAccountId = 'all'
}) {
  const [sortConfig, setSortConfig] = useState({ key: 'publish_time', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Använd initialSelectedAccountId som standardvärde, defaulta till 'all'
  const [selectedAccountId, setSelectedAccountId] = useState(initialSelectedAccountId || 'all');
  
  const PAGE_SIZE_OPTIONS = [
    { value: '5', label: '5 per sida' },
    { value: '10', label: '10 per sida' },
    { value: '20', label: '20 per sida' },
    { value: '50', label: '50 per sida' }
  ];

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
  }, [data, pageSize, sortConfig, selectedAccountId]);

  // Uppdatera valt konto när initialSelectedAccountId ändras
  useEffect(() => {
    setSelectedAccountId(initialSelectedAccountId || 'all');
  }, [initialSelectedAccountId]);

  // Beräkna datumintervall när data laddas
  useEffect(() => {
    if (data && data.length > 0) {
      const dates = data
        .map(item => item.publish_time)
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

  // Hantera klick på extern länk
  const handleExternalLink = (url) => {
    if (!url) return;
    
    try {
      if (window.electronAPI?.openExternalLink) {
        window.electronAPI.openExternalLink(url);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Failed to open external link:', error);
    }
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
    return VIDEO_VIEW_AVAILABLE_FIELDS[field] || field;
  };

  // Hitta kontonamn baserat på ID
  const getAccountName = (accountId) => {
    if (!accountId) return 'Okänt konto';
    const foundAccount = accounts.find(acc => acc.id === accountId);
    return foundAccount ? foundAccount.name : 'Okänt konto';
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
        // Sök i titel och länk
        if (item.title && item.title.toLowerCase().includes(search)) return true;
        if (item.link && item.link.toLowerCase().includes(search)) return true;
        
        // Sök i datum
        const date = item.publish_time ? new Date(item.publish_time).toLocaleDateString() : '';
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
    
    // Sortera data
    let sortedData = [...filteredData];
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
        if (sortConfig.key === 'publish_time') {
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
    
    // Beräkna bara summor för numeriska fält
    if (sortedData.length > 0) {
      // Placeholders för icke-summerbara fält
      totals.title = 'Totalt';
      totals.link = '';
      totals.publish_time = '';
      totals.accountId = '';
      
      selectedFields.forEach(field => {
        // Vissa fält ska inte summeras
        if (['title', 'link', 'publish_time', 'accountId', 'engagement_rate'].includes(field)) {
          return;
        }
        
        // Beräkna summa för övriga numeriska fält
        totals[field] = sortedData.reduce((sum, item) => {
          const value = item[field];
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);
        
        // Specialhantering för engagement_rate - beräkna genomsnitt
        if (field === 'engagement_rate') {
          const sum = sortedData.reduce((sum, item) => {
            return sum + (typeof item[field] === 'number' ? item[field] : 0);
          }, 0);
          totals[field] = sortedData.length > 0 ? sum / sortedData.length : 0;
        }
      });
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
  }, [data, sortConfig, currentPage, pageSize, selectedFields, searchTerm, selectedAccountId, accounts]);

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
        fileName = `${accountName.toLowerCase().replace(/\s+/g, '-')}-videodata.xlsx`;
      } else {
        fileName = 'tiktok-videodata.xlsx';
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
        fileName = `${accountName.toLowerCase().replace(/\s+/g, '-')}-videodata.csv`;
      } else {
        fileName = 'tiktok-videodata.csv';
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
        'Videotitel': item.title || '',
        'Publiceringstid': item.publish_time ? formatDateTime(item.publish_time) : '',
        'Videolänk': item.link || ''
      };
      
      // Lägg till valda fält
      selectedFields.forEach(field => {
        if (['title', 'link', 'publish_time', 'accountId'].includes(field)) return; // Hoppa över fält som redan är tillagda
        
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
          <p>Ingen videodata tillgänglig för detta konto</p>
          <p className="mt-2 text-sm">Ladda upp en video-CSV-fil för att se statistik</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        {/* Prominent Account Selection at Top */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <label className="font-medium text-sm">Visa konto:</label>
            <Select
              value={selectedAccountId}
              onValueChange={handleAccountChange}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Välj konto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla konton</SelectItem>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
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
        
        {/* Date range and search */}
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
          
          {/* Sökfält */}
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök video..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full md:w-[280px]"
            />
          </div>
        </div>
        
        {/* Sökresultatinformation */}
        {searchTerm && (
          <div className="mb-4">
            <Alert variant="info" className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Sökresultat</AlertTitle>
              <AlertDescription className="text-blue-700">
                Visar {processedData.filteredCount} av {data.length} videor som matchar "{searchTerm}"
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
                  {/* Account name first */}
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                    onClick={() => handleSort('accountId')}
                  >
                    <div className="flex items-center">
                      Kontonamn {getSortIcon('accountId')}
                    </div>
                  </TableHead>
                  
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      Videotitel {getSortIcon('title')}
                    </div>
                  </TableHead>
                  
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap w-32"
                    onClick={() => handleSort('publish_time')}
                  >
                    <div className="flex items-center">
                      Publicerad {getSortIcon('publish_time')}
                    </div>
                  </TableHead>
                  
                  {selectedFields
                    .filter(field => !['title', 'link', 'publish_time', 'accountId'].includes(field))
                    .map(field => (
                      <TableHead 
                        key={field}
                        className="cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                        onClick={() => handleSort(field)}
                      >
                        <div className="flex items-center justify-end">
                          {getDisplayName(field)} {getSortIcon(field)}
                        </div>
                      </TableHead>
                    ))}
                  
                  <TableHead className="w-10 text-center">
                    Länk
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Totalsumma rad */}
                <TableRow className="bg-primary/5 border-b-2 border-primary/20 font-medium">
                  <TableCell className="font-semibold">
                    <span className="text-primary">Alla konton</span>
                  </TableCell>
                  
                  <TableCell className="font-semibold flex items-center">
                    <Calculator className="w-4 h-4 mr-2 text-primary" />
                    <span className="text-primary">Totalt {processedData.filteredCount} videor</span>
                  </TableCell>
                  
                  <TableCell></TableCell>
                  
                  {selectedFields
                    .filter(field => !['title', 'link', 'publish_time', 'accountId'].includes(field))
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
                  
                  <TableCell></TableCell>
                </TableRow>

                {/* Datarader */}
                {processedData.paginatedData.map((item, index) => (
                  <TableRow key={`${item.title || item.link || 'unknown'}-${item.accountId || 'unknown'}-${index}`}>
                    {/* Account name first */}
                    <TableCell className="whitespace-nowrap">
                      {item.accountId ? getAccountName(item.accountId) : 'Okänt konto'}
                    </TableCell>
                    
                    <TableCell className="max-w-xs">
                      <div className="truncate">
                        {truncateText(item.title || 'Namnlös video', 80)}
                      </div>
                    </TableCell>
                    
                    <TableCell className="whitespace-nowrap">
                      {item.publish_time ? formatDate(item.publish_time) : '-'}
                    </TableCell>
                    
                    {selectedFields
                      .filter(field => !['title', 'link', 'publish_time', 'accountId'].includes(field))
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
                    
                    <TableCell className="text-center">
                      {item.link && (
                        <button
                          onClick={() => handleExternalLink(item.link)}
                          className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800"
                          title="Öppna på TikTok"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="sr-only">Öppna på TikTok</span>
                        </button>
                      )}
                    </TableCell>
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