import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
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
  Inbox,
  FileQuestion
} from 'lucide-react';
import { MONTH_VIEW_AVAILABLE_FIELDS, ENGAGEMENT_RATE_BASIS } from '@/utils/constants';
import { formatNumber } from '@/utils/utils';
import { CopyableValue } from '../ui/copyable-value';
import { ProfileIcon } from '../ui/profile-icon';

// Fält som räknas som medelvärde vid summering, inte summa
const AVG_FIELDS = ['engagement_rate'];

// Textetiketter för de tre tillstånden
const STATUS_LABELS = {
  data: 'Data',
  empty: 'Inga videor publicerade',
  missing: 'Ingen CSV uppladdad',
};

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 per sida' },
  { value: '20', label: '20 per sida' },
  { value: '50', label: '50 per sida' },
  { value: '100', label: '100 per sida' }
];

/**
 * Badge som visar tillståndet för en konto+månad-rad.
 * Tom månad (CSV finns, noll videor) och saknad CSV får medvetet olika
 * ikon och färg så att de aldrig kan förväxlas.
 */
function StatusBadge({ status }) {
  if (status === 'missing') {
    return (
      <Badge
        variant="outline"
        className="border-dashed border-red-400 text-red-600 bg-red-50 gap-1"
      >
        <FileQuestion className="h-3.5 w-3.5" />
        {STATUS_LABELS.missing}
      </Badge>
    );
  }

  if (status === 'empty') {
    return (
      <Badge variant="warning" className="gap-1">
        <Inbox className="h-3.5 w-3.5" />
        {STATUS_LABELS.empty}
      </Badge>
    );
  }

  return <Badge variant="success">{STATUS_LABELS.data}</Badge>;
}

/**
 * Komponent för per konto × månad-vyn.
 *
 * Bygger en rad per konto och månad utifrån hela månadsuniversumet
 * (alla månader som förekommer i någon uppladdad CSV, för alla konton).
 * En rad utan motsvarande månadsrad betyder att ingen CSV laddats upp
 * för det kontot och den månaden.
 *
 * @param {Array} props.months - Månadsrader (en per konto+uppladdad månad)
 * @param {Array} props.videos - Videorader (skickas med för konsekvens, används ej direkt här)
 * @param {Array} props.accounts - Lista med alla konton
 * @param {Array} props.selectedFields - Valda fält att visa
 */
export function MonthView({ months = [], videos = [], accounts = [], selectedFields }) {
  const [sortConfig, setSortConfig] = useState({ key: 'month', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [showMissing, setShowMissing] = useState(true);

  const getDisplayName = (field) => MONTH_VIEW_AVAILABLE_FIELDS[field] || field;

  const getAccountHandle = (accountId) => {
    const found = accounts.find(a => a.id === accountId);
    return found?.handle || null;
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

  // Alla månader som förekommer i uppladdad data, oavsett konto, nyast först
  const monthUniverse = useMemo(() => {
    const set = new Set();
    months.forEach(m => { if (m.month) set.add(m.month); });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [months]);

  // Bygg matrisen konto × månad
  const matrixRows = useMemo(() => {
    const monthMap = new Map();
    months.forEach(m => monthMap.set(`${m.accountId}|${m.month}`, m));

    const rows = [];
    accounts.forEach(acc => {
      monthUniverse.forEach(month => {
        const monthRow = monthMap.get(`${acc.id}|${month}`);
        const status = !monthRow ? 'missing' : (monthRow.video_count === 0 ? 'empty' : 'data');

        const row = {
          accountId: acc.id,
          accountName: acc.name,
          month,
          status,
        };

        Object.keys(MONTH_VIEW_AVAILABLE_FIELDS).forEach(field => {
          row[field] = status === 'missing' ? null : (monthRow[field] ?? 0);
        });

        rows.push(row);
      });
    });

    return rows;
  }, [accounts, monthUniverse, months]);

  // Sammanfattning oberoende av "visa saknade"-läget
  const summary = useMemo(() => {
    const dataCount = matrixRows.filter(r => r.status === 'data').length;
    const emptyCount = matrixRows.filter(r => r.status === 'empty').length;
    const missingCount = matrixRows.filter(r => r.status === 'missing').length;
    return { dataCount, emptyCount, missingCount, total: matrixRows.length };
  }, [matrixRows]);

  const { sortedRows, totals } = useMemo(() => {
    let visible = showMissing ? matrixRows : matrixRows.filter(r => r.status !== 'missing');

    const sorted = [...visible].sort((a, b) => {
      if (sortConfig.key === 'accountName') {
        return sortConfig.direction === 'asc'
          ? a.accountName.localeCompare(b.accountName)
          : b.accountName.localeCompare(a.accountName);
      }

      if (sortConfig.key === 'month') {
        return sortConfig.direction === 'asc'
          ? a.month.localeCompare(b.month)
          : b.month.localeCompare(a.month);
      }

      if (sortConfig.key === 'status') {
        return sortConfig.direction === 'asc'
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      }

      const av = a[sortConfig.key];
      const bv = b[sortConfig.key];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;

      return sortConfig.direction === 'asc' ? av - bv : bv - av;
    });

    // Totalrad - summera bara rader med data eller tom månad, aldrig saknad CSV
    const included = matrixRows.filter(r => r.status === 'data' || r.status === 'empty');
    const totalsRow = { accountName: 'Totalt', month: '', status: null };
    (selectedFields || []).forEach(field => {
      if (AVG_FIELDS.includes(field)) {
        const vals = included.map(r => typeof r[field] === 'number' ? r[field] : 0);
        totalsRow[field] = vals.length > 0
          ? parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2))
          : 0;
      } else {
        totalsRow[field] = included.reduce((s, r) => s + (typeof r[field] === 'number' ? r[field] : 0), 0);
      }
    });

    return { sortedRows: sorted, totals: totalsRow };
  }, [matrixRows, showMissing, sortConfig, selectedFields]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedRows.length / pageSize);

  const formatDataForExport = () => {
    const rowsToExport = showMissing ? matrixRows : matrixRows.filter(r => r.status !== 'missing');
    return rowsToExport.map(row => {
      const exportRow = {
        'Konto': row.accountName,
        'Månad': row.month,
        'Status': STATUS_LABELS[row.status],
      };
      (selectedFields || []).forEach(field => {
        exportRow[getDisplayName(field)] = row[field] === null ? '' : row[field];
      });
      return exportRow;
    });
  };

  const handleExportToCSV = async () => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI.exportToCSV(formatDataForExport(), 'tiktok-per-manad.csv');
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
      const result = await window.electronAPI.exportToExcel(formatDataForExport(), 'tiktok-per-manad.xlsx');
      if (result.success) console.log('Export till Excel lyckades');
    } catch (error) {
      console.error('Export till Excel misslyckades:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderValue = (row, field) => {
    const value = row[field];
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">-</span>;
    }

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

  if (!selectedFields || selectedFields.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <p>Välj värden att visa i tabellen ovan</p>
        </div>
      </Card>
    );
  }

  if (monthUniverse.length === 0) {
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <span className="text-sm text-muted-foreground">
            {accounts.length} konton × {monthUniverse.length} {monthUniverse.length === 1 ? 'månad' : 'månader'} ·{' '}
            {summary.dataCount} med data · {summary.emptyCount} tomma · {summary.missingCount} saknar CSV
          </span>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-missing"
                checked={showMissing}
                onCheckedChange={setShowMissing}
              />
              <Label htmlFor="show-missing" className="text-sm">
                Visa rader utan uppladdad CSV
              </Label>
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

        {/* Legend för de två badgarna */}
        <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Badge variant="warning" className="gap-1"><Inbox className="h-3.5 w-3.5" />{STATUS_LABELS.empty}</Badge>
            <span>CSV uppladdad, men inga videor publicerades den månaden</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="border-dashed border-red-400 text-red-600 bg-red-50 gap-1">
              <FileQuestion className="h-3.5 w-3.5" />{STATUS_LABELS.missing}
            </Badge>
            <span>Ingen CSV har laddats upp för konto och månad</span>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap min-w-[180px]"
                    onClick={() => handleSort('accountName')}
                  >
                    <div className="flex items-center">Konto {getSortIcon('accountName')}</div>
                  </TableHead>

                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                    onClick={() => handleSort('month')}
                  >
                    <div className="flex items-center">Månad {getSortIcon('month')}</div>
                  </TableHead>

                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">Status {getSortIcon('status')}</div>
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
                  <TableCell />
                  <TableCell />

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
                {paginatedRows.map((row, index) => (
                  <TableRow key={`${row.accountId}-${row.month}-${index}`}>
                    <TableCell className="font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <ProfileIcon name={row.accountName} handle={getAccountHandle(row.accountId)} size="sm" />
                        <span>{row.accountName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{row.month}</TableCell>
                    <TableCell className="whitespace-nowrap"><StatusBadge status={row.status} /></TableCell>

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
                Visar {Math.min((currentPage - 1) * pageSize + 1, sortedRows.length)}–{Math.min(currentPage * pageSize, sortedRows.length)} av {sortedRows.length}
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

        {/* Fotnot om beräkning */}
        <p className="text-xs text-muted-foreground mt-3 px-1">
          Engagemangsnivå (%) = {ENGAGEMENT_RATE_BASIS}
        </p>
      </CardContent>
    </Card>
  );
}
