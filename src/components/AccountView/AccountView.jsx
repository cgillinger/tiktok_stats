import React, { useState, useMemo } from 'react';
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
  Calculator
} from 'lucide-react';
import { ACCOUNT_VIEW_AVAILABLE_FIELDS } from '@/utils/constants';
import { formatNumber } from '@/utils/utils';
import { CopyableValue } from '../ui/copyable-value';

/**
 * Komponent för aggregerad per-konto-vy
 *
 * @param {Array} props.data - All daglig data (med accountId på varje rad)
 * @param {Array} props.selectedFields - Valda fält att visa
 * @param {Array} props.accounts - Lista med alla konton
 */
export function AccountView({ data, selectedFields, accounts = [] }) {
  const [sortConfig, setSortConfig] = useState({ key: 'video_views', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);

  const PAGE_SIZE_OPTIONS = [
    { value: '10', label: '10 per sida' },
    { value: '20', label: '20 per sida' },
    { value: '50', label: '50 per sida' },
    { value: '100', label: '100 per sida' }
  ];

  // Fields aggregated as average (not sum)
  const AVG_FIELDS = ['reach', 'engagement_rate'];
  // post_count is a row count
  const COUNT_FIELDS = ['post_count'];

  const getAccountName = (accountId) => {
    if (!accountId) return 'Okänt konto';
    const found = accounts.find(a => a.id === accountId);
    return found ? found.name : 'Okänt konto';
  };

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const getDisplayName = (field) => ACCOUNT_VIEW_AVAILABLE_FIELDS[field] || field;

  // Aggregate data per account
  const { aggregatedData, totals } = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { aggregatedData: [], totals: {} };
    }

    // Group by accountId
    const groups = {};
    data.forEach(item => {
      const accountId = item.accountId || 'unknown';
      if (!groups[accountId]) {
        groups[accountId] = [];
      }
      groups[accountId].push(item);
    });

    // Aggregate each group
    const aggregated = Object.entries(groups).map(([accountId, items]) => {
      const row = { accountId, name: getAccountName(accountId) };

      selectedFields.forEach(field => {
        if (field === 'post_count') {
          row.post_count = items.length;
        } else if (AVG_FIELDS.includes(field)) {
          const values = items.map(i => typeof i[field] === 'number' ? i[field] : 0);
          row[field] = values.length > 0
            ? parseFloat((values.reduce((s, v) => s + v, 0) / values.length).toFixed(2))
            : 0;
        } else {
          // Sum
          row[field] = items.reduce((sum, i) => {
            const v = i[field];
            return sum + (typeof v === 'number' ? v : 0);
          }, 0);
        }
      });

      return row;
    });

    // Sort
    const sorted = [...aggregated].sort((a, b) => {
      if (sortConfig.key === 'name') {
        return sortConfig.direction === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }

      const av = a[sortConfig.key];
      const bv = b[sortConfig.key];
      if (av === undefined && bv === undefined) return 0;
      if (av === undefined) return 1;
      if (bv === undefined) return -1;

      if (typeof av === 'number' && typeof bv === 'number') {
        return sortConfig.direction === 'asc' ? av - bv : bv - av;
      }

      return sortConfig.direction === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

    // Totals row
    const totalsRow = { accountId: '', name: 'Totalt' };
    selectedFields.forEach(field => {
      if (field === 'post_count') {
        totalsRow.post_count = sorted.reduce((s, r) => s + (r.post_count || 0), 0);
      } else if (AVG_FIELDS.includes(field)) {
        const vals = sorted.map(r => typeof r[field] === 'number' ? r[field] : 0);
        totalsRow[field] = vals.length > 0
          ? parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2))
          : 0;
      } else {
        totalsRow[field] = sorted.reduce((s, r) => {
          const v = r[field];
          return s + (typeof v === 'number' ? v : 0);
        }, 0);
      }
    });

    return { aggregatedData: sorted, totals: totalsRow };
  }, [data, selectedFields, sortConfig, accounts]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return aggregatedData.slice(start, start + pageSize);
  }, [aggregatedData, currentPage, pageSize]);

  const totalPages = Math.ceil(aggregatedData.length / pageSize);

  // Export helpers
  const formatDataForExport = () => {
    return aggregatedData.map(row => {
      const exportRow = { 'Kontonamn': row.name };
      selectedFields.forEach(field => {
        exportRow[getDisplayName(field)] = row[field] ?? '';
      });
      return exportRow;
    });
  };

  const handleExportToCSV = async () => {
    try {
      setIsLoading(true);
      const formattedData = formatDataForExport();
      const result = await window.electronAPI.exportToCSV(formattedData, 'tiktok-konton.csv');
      if (result.success) console.log('Export till CSV lyckades');
    } catch (error) {
      console.error('Export till CSV misslyckades:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportToExcel = async () => {
    try {
      setIsLoading(true);
      const formattedData = formatDataForExport();
      const result = await window.electronAPI.exportToExcel(formattedData, 'tiktok-konton.xlsx');
      if (result.success) console.log('Export till Excel lyckades');
    } catch (error) {
      console.error('Export till Excel misslyckades:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderValue = (row, field) => {
    const value = row[field];
    if (value === null || value === undefined) return '-';

    if (field === 'engagement_rate') {
      return (
        <CopyableValue
          value={value.toFixed(2)}
          formattedValue={`${value.toFixed(2)}%`}
          align="right"
        />
      );
    }

    return (
      <CopyableValue
        value={value}
        formattedValue={formatNumber(value)}
        align="right"
      />
    );
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
          <p>Ingen data tillgänglig</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        {/* Toolbar */}
        <div className="flex justify-between items-center mb-4 gap-4">
          <span className="text-sm text-muted-foreground">
            {aggregatedData.length} konton
          </span>

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

        {/* Table */}
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Kontonamn {getSortIcon('name')}
                    </div>
                  </TableHead>

                  {selectedFields.map(field => (
                    <TableHead
                      key={field}
                      className="cursor-pointer hover:bg-muted/50 whitespace-nowrap text-right"
                      onClick={() => handleSort(field)}
                    >
                      <div className="flex items-center justify-end">
                        {getDisplayName(field)} {getSortIcon(field)}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Totals row */}
                <TableRow className="bg-primary/5 border-b-2 border-primary/20 font-medium">
                  <TableCell className="font-semibold flex items-center">
                    <Calculator className="w-4 h-4 mr-2 text-primary" />
                    <span className="text-primary">Totalt</span>
                  </TableCell>

                  {selectedFields.map(field => (
                    <TableCell key={field} className="text-right font-semibold text-primary">
                      {totals[field] !== undefined ? (
                        field === 'engagement_rate' ? (
                          <CopyableValue
                            value={totals[field].toFixed(2)}
                            formattedValue={`${totals[field].toFixed(2)}%`}
                            align="right"
                            className="font-semibold text-primary"
                          />
                        ) : (
                          <CopyableValue
                            value={totals[field]}
                            formattedValue={formatNumber(totals[field])}
                            align="right"
                            className="font-semibold text-primary"
                          />
                        )
                      ) : ''}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Data rows */}
                {paginatedData.map((row, index) => (
                  <TableRow key={`${row.accountId}-${index}`}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {row.name}
                    </TableCell>

                    {selectedFields.map(field => (
                      <TableCell key={field} className="text-right">
                        {renderValue(row, field)}
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
                Visar {Math.min((currentPage - 1) * pageSize + 1, aggregatedData.length)}–{Math.min(currentPage * pageSize, aggregatedData.length)} av {aggregatedData.length}
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
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
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
