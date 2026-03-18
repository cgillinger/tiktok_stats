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
  Search
} from 'lucide-react';
import { Input } from '../ui/input';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Info } from 'lucide-react';
import { SUMMARY_VIEW_AVAILABLE_FIELDS } from '@/utils/constants';
import { formatDate, formatNumber } from '@/utils/utils';
import { CopyableValue } from '../ui/copyable-value';

/**
 * Komponent för visning av daglig översiktsdata
 *
 * @param {Array} props.data - Data att visa
 * @param {Array} props.selectedFields - Valda fält att visa
 * @param {Array} props.accounts - Lista över alla konton
 * @param {Function} props.onAccountFilter - Callback vid filtrering på konto
 * @param {string} props.initialSelectedAccountId - Initialt valt konto-ID ('all' för alla)
 */
export function SummaryView({
  data,
  selectedFields,
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
  const [selectedAccountId, setSelectedAccountId] = useState(initialSelectedAccountId || 'all');

  const PAGE_SIZE_OPTIONS = [
    { value: '10', label: '10 per sida' },
    { value: '20', label: '20 per sida' },
    { value: '50', label: '50 per sida' },
    { value: '100', label: '100 per sida' }
  ];

  const hasMultipleAccounts = useMemo(() => {
    const ids = new Set();
    data.forEach(item => { if (item.accountId) ids.add(item.accountId); });
    return ids.size > 1;
  }, [data]);

  useEffect(() => {
    setCurrentPage(1);
  }, [data, pageSize, sortConfig, selectedAccountId]);

  useEffect(() => {
    setSelectedAccountId(initialSelectedAccountId || 'all');
  }, [initialSelectedAccountId]);

  useEffect(() => {
    if (data && data.length > 0) {
      const dates = data.map(item => item.date).filter(Boolean);
      if (dates.length > 0) {
        const sorted = [...dates].sort();
        setDateRange({ startDate: sorted[0], endDate: sorted[sorted.length - 1] });
      }
    }
  }, [data]);

  const handleAccountChange = (accountId) => {
    setSelectedAccountId(accountId);
    if (onAccountFilter) onAccountFilter(accountId);
  };

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const getDisplayName = (field) => SUMMARY_VIEW_AVAILABLE_FIELDS[field] || field;

  const getAccountName = (accountId) => {
    if (!accountId) return 'Okänt konto';
    const found = accounts.find(a => a.id === accountId);
    return found ? found.name : 'Okänt konto';
  };

  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      return { paginatedData: [], totalPages: 0, filteredCount: 0, totals: {} };
    }

    let filtered = data;

    if (selectedAccountId !== 'all') {
      filtered = filtered.filter(item => item.accountId === selectedAccountId);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const date = item.date ? new Date(item.date).toLocaleDateString() : '';
        if (date.toLowerCase().includes(search)) return true;
        const accountName = item.accountId ? getAccountName(item.accountId) : '';
        if (accountName.toLowerCase().includes(search)) return true;
        for (const field of selectedFields) {
          const value = item[field];
          if (value && String(value).toLowerCase().includes(search)) return true;
        }
        return false;
      });
    }

    // Sort
    let sorted = [...filtered];
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        if (sortConfig.key === 'accountId') {
          const an = getAccountName(a.accountId);
          const bn = getAccountName(b.accountId);
          return sortConfig.direction === 'asc' ? an.localeCompare(bn) : bn.localeCompare(an);
        }

        const av = a[sortConfig.key];
        const bv = b[sortConfig.key];

        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;

        if (sortConfig.key === 'date') {
          const ad = new Date(av);
          const bd = new Date(bv);
          return sortConfig.direction === 'asc' ? ad - bd : bd - ad;
        }

        if (typeof av === 'number' && typeof bv === 'number') {
          return sortConfig.direction === 'asc' ? av - bv : bv - av;
        }

        return sortConfig.direction === 'asc'
          ? String(av).toLowerCase().localeCompare(String(bv).toLowerCase())
          : String(bv).toLowerCase().localeCompare(String(av).toLowerCase());
      });
    }

    // Totals
    const totals = {};
    if (sorted.length > 0) {
      totals.date = 'Totalt';
      totals.accountId = '';

      selectedFields.forEach(field => {
        if (field === 'date' || field === 'accountId' || field === 'engagement_rate') return;
        totals[field] = sorted.reduce((sum, item) => {
          const v = item[field];
          return sum + (typeof v === 'number' ? v : 0);
        }, 0);
      });

      if (selectedFields.includes('engagement_rate')) {
        const sum = sorted.reduce((s, item) =>
          s + (typeof item.engagement_rate === 'number' ? item.engagement_rate : 0), 0);
        totals.engagement_rate = sorted.length > 0 ? sum / sorted.length : 0;
      }
    }

    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = sorted.slice(startIndex, startIndex + pageSize);
    const totalPages = Math.ceil(sorted.length / pageSize);

    return { paginatedData, totalPages, filteredCount: sorted.length, totals };
  }, [data, sortConfig, currentPage, pageSize, selectedFields, searchTerm, selectedAccountId, accounts]);

  const formatDataForExport = () => {
    let filtered = data;
    if (selectedAccountId !== 'all') {
      filtered = data.filter(item => item.accountId === selectedAccountId);
    }

    return filtered.map(item => {
      const row = {
        'Konto': item.accountId ? getAccountName(item.accountId) : 'Okänt konto',
        'Datum': item.date ? formatDate(item.date) : 'Okänt'
      };

      selectedFields.forEach(field => {
        if (field === 'date' || field === 'accountId') return;
        const displayName = getDisplayName(field);
        const value = item[field];
        row[displayName] = value === null || value === undefined ? '' : value;
      });

      return row;
    });
  };

  const handleExportToCSV = async () => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI.exportToCSV(
        formatDataForExport(),
        selectedAccountId !== 'all'
          ? `${getAccountName(selectedAccountId).toLowerCase().replace(/\s+/g, '-')}-oversiktsdata.csv`
          : 'tiktok-oversiktsdata.csv'
      );
      if (result.success) console.log('Export lyckades');
    } catch (err) {
      console.error('Export misslyckades:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportToExcel = async () => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI.exportToExcel(
        formatDataForExport(),
        selectedAccountId !== 'all'
          ? `${getAccountName(selectedAccountId).toLowerCase().replace(/\s+/g, '-')}-oversiktsdata.xlsx`
          : 'tiktok-oversiktsdata.xlsx'
      );
      if (result.success) console.log('Export lyckades');
    } catch (err) {
      console.error('Export misslyckades:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedFields.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <p>Välj värden att visa i tabellen ovan</p>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <p>Ingen översiktsdata tillgänglig</p>
          <p className="mt-2 text-sm">Ladda upp en CSV-fil för att se statistik</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          {dateRange.startDate && dateRange.endDate && (
            <div className="flex items-center text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-md">
              <Calendar className="h-4 w-4 mr-2" />
              <span>
                Perioden {formatDate(dateRange.startDate)} till {formatDate(dateRange.endDate)}
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {hasMultipleAccounts && (
              <Select value={selectedAccountId} onValueChange={handleAccountChange}>
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

            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportToCSV} disabled={isLoading}>
                <FileDown className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" onClick={handleExportToExcel} disabled={isLoading}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </div>

        {searchTerm && (
          <div className="mb-4">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                Visar {processedData.filteredCount} av {data.length} rader som matchar "{searchTerm}"
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Table */}
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                    onClick={() => handleSort('accountId')}
                  >
                    <div className="flex items-center">Kontonamn {getSortIcon('accountId')}</div>
                  </TableHead>

                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">Datum {getSortIcon('date')}</div>
                  </TableHead>

                  {selectedFields
                    .filter(f => f !== 'date' && f !== 'accountId')
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
                {/* Totals row */}
                <TableRow className="bg-primary/5 border-b-2 border-primary/20 font-medium">
                  <TableCell className="font-semibold">
                    <span className="text-primary">Alla konton</span>
                  </TableCell>

                  <TableCell className="font-semibold flex items-center">
                    <Calculator className="w-4 h-4 mr-2 text-primary" />
                    <span className="text-primary">Totalt</span>
                  </TableCell>

                  {selectedFields
                    .filter(f => f !== 'date' && f !== 'accountId')
                    .map(field => (
                      <TableCell key={field} className="text-right font-semibold text-primary">
                        {processedData.totals[field] !== undefined ? (
                          field === 'engagement_rate' ? (
                            <CopyableValue
                              value={processedData.totals[field].toFixed(2)}
                              formattedValue={`${processedData.totals[field].toFixed(2)}%`}
                              align="right"
                              className="font-semibold text-primary"
                            />
                          ) : (
                            <CopyableValue
                              value={processedData.totals[field]}
                              formattedValue={formatNumber(processedData.totals[field])}
                              align="right"
                              className="font-semibold text-primary"
                            />
                          )
                        ) : ''}
                      </TableCell>
                    ))}
                </TableRow>

                {/* Data rows */}
                {processedData.paginatedData.map((item, index) => (
                  <TableRow key={`${item.date}-${item.accountId || 'unknown'}-${index}`}>
                    <TableCell className="whitespace-nowrap">
                      {item.accountId ? getAccountName(item.accountId) : 'Okänt konto'}
                    </TableCell>

                    <TableCell className="whitespace-nowrap font-medium">
                      {item.date ? formatDate(item.date) : 'Okänt datum'}
                    </TableCell>

                    {selectedFields
                      .filter(f => f !== 'date' && f !== 'accountId')
                      .map(field => (
                        <TableCell key={field} className="text-right">
                          {item[field] === null || item[field] === undefined ? '-' : (
                            field === 'engagement_rate' ? (
                              <CopyableValue
                                value={item[field].toFixed(2)}
                                formattedValue={`${item[field].toFixed(2)}%`}
                                align="right"
                              />
                            ) : (
                              <CopyableValue
                                value={item[field]}
                                formattedValue={formatNumber(item[field])}
                                align="right"
                              />
                            )
                          )}
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
                onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-6">
              <span className="text-sm text-muted-foreground">
                Visar {Math.min((currentPage - 1) * pageSize + 1, processedData.filteredCount)}–{Math.min(currentPage * pageSize, processedData.filteredCount)} av {processedData.filteredCount}
              </span>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(processedData.totalPages, p + 1))}
                  disabled={currentPage >= processedData.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
