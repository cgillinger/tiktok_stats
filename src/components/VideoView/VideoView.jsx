import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileSpreadsheet,
  Calculator,
  Search,
  ExternalLink
} from 'lucide-react';
import { VIDEO_VIEW_AVAILABLE_FIELDS, ENGAGEMENT_RATE_BASIS } from '@/utils/constants';
import { formatNumber, truncateText } from '@/utils/utils';
import { CopyableValue } from '../ui/copyable-value';
import { ProfileIcon } from '../ui/profile-icon';

const AVG_FIELDS = ['engagement_rate'];

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 per sida' },
  { value: '20', label: '20 per sida' },
  { value: '50', label: '50 per sida' },
  { value: '100', label: '100 per sida' }
];

/**
 * Formaterar publiceringsdatum som "ÅÅÅÅ-MM-DD TT:MM"
 */
function formatPublished(date) {
  if (!date) return '-';
  const str = String(date);
  const match = str.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]}` : str;
}

/**
 * Komponent för per video-vyn - en rad per publicerad video.
 *
 * @param {Array} props.videos - Videorader (med accountId på varje rad)
 * @param {Array} props.accounts - Lista med alla konton
 * @param {Array} props.selectedFields - Valda fält att visa
 */
export function VideoView({ videos = [], accounts = [], selectedFields }) {
  const [sortConfig, setSortConfig] = useState({ key: 'views', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('all');

  const getDisplayName = (field) => VIDEO_VIEW_AVAILABLE_FIELDS[field] || field;

  const getAccountName = (accountId) => {
    if (!accountId) return 'Okänt konto';
    const found = accounts.find(a => a.id === accountId);
    return found ? found.name : 'Okänt konto';
  };

  const getAccountHandle = (accountId) => {
    if (!accountId) return null;
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

  const { paginatedData, totalPages, filteredCount, totals, sortedFiltered } = useMemo(() => {
    if (!videos || !Array.isArray(videos)) {
      return { paginatedData: [], totalPages: 0, filteredCount: 0, totals: {}, sortedFiltered: [] };
    }

    let filtered = videos;

    if (selectedAccountId !== 'all') {
      filtered = filtered.filter(v => v.accountId === selectedAccountId);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(v => {
        const title = (v.title || '').toLowerCase();
        const accountName = getAccountName(v.accountId).toLowerCase();
        return title.includes(search) || accountName.includes(search);
      });
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortConfig.key === 'accountId') {
        const an = getAccountName(a.accountId);
        const bn = getAccountName(b.accountId);
        return sortConfig.direction === 'asc' ? an.localeCompare(bn) : bn.localeCompare(an);
      }

      if (sortConfig.key === 'title') {
        return sortConfig.direction === 'asc'
          ? String(a.title || '').localeCompare(String(b.title || ''))
          : String(b.title || '').localeCompare(String(a.title || ''));
      }

      if (sortConfig.key === 'date') {
        const ad = new Date(a.date);
        const bd = new Date(b.date);
        return sortConfig.direction === 'asc' ? ad - bd : bd - ad;
      }

      const av = a[sortConfig.key];
      const bv = b[sortConfig.key];
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;

      if (typeof av === 'number' && typeof bv === 'number') {
        return sortConfig.direction === 'asc' ? av - bv : bv - av;
      }

      return sortConfig.direction === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

    // Totalrad
    const totalsRow = {};
    (selectedFields || []).forEach(field => {
      if (AVG_FIELDS.includes(field)) {
        const vals = sorted.map(v => typeof v[field] === 'number' ? v[field] : 0);
        totalsRow[field] = vals.length > 0
          ? parseFloat((vals.reduce((s, v2) => s + v2, 0) / vals.length).toFixed(2))
          : 0;
      } else {
        totalsRow[field] = sorted.reduce((s, v) => s + (typeof v[field] === 'number' ? v[field] : 0), 0);
      }
    });

    const start = (currentPage - 1) * pageSize;
    const paginated = sorted.slice(start, start + pageSize);
    const pages = Math.ceil(sorted.length / pageSize);

    return { paginatedData: paginated, totalPages: pages, filteredCount: sorted.length, totals: totalsRow, sortedFiltered: sorted };
  }, [videos, sortConfig, currentPage, pageSize, selectedFields, searchTerm, selectedAccountId, accounts]);

  const formatDataForExport = () => {
    return sortedFiltered.map(v => {
      const row = {
        'Konto': getAccountName(v.accountId),
        'Titel': v.title || '',
        'URL': v.url || '',
        'Publicerad': formatPublished(v.date),
      };
      (selectedFields || []).forEach(field => {
        row[getDisplayName(field)] = v[field] === null || v[field] === undefined ? '' : v[field];
      });
      return row;
    });
  };

  const handleExportToCSV = async () => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI.exportToCSV(formatDataForExport(), 'tiktok-per-video.csv');
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
      const result = await window.electronAPI.exportToExcel(formatDataForExport(), 'tiktok-per-video.xlsx');
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

  if (!selectedFields || selectedFields.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <p>Välj värden att visa i tabellen ovan</p>
        </div>
      </Card>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <p>Inga videor tillgängliga</p>
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
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {filteredCount} {filteredCount === 1 ? 'video' : 'videor'}
          </span>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Select value={selectedAccountId} onValueChange={(v) => { setSelectedAccountId(v); setCurrentPage(1); }}>
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

            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök på titel eller konto..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
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

        {/* Table */}
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap min-w-[180px]"
                    onClick={() => handleSort('accountId')}
                  >
                    <div className="flex items-center">Konto {getSortIcon('accountId')}</div>
                  </TableHead>

                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">Titel {getSortIcon('title')}</div>
                  </TableHead>

                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">Publicerad {getSortIcon('date')}</div>
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
                {paginatedData.map((video, index) => (
                  <TableRow key={`${video.video_id || video.filename}-${index}`}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <ProfileIcon name={getAccountName(video.accountId)} handle={getAccountHandle(video.accountId)} size="sm" />
                        <span>{getAccountName(video.accountId)}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {video.url ? (
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Öppna videon på TikTok"
                          aria-label="Öppna videon på TikTok"
                          className="inline-flex items-center gap-1.5 text-primary hover:underline"
                        >
                          <span>{truncateText(video.title || '(Utan titel)', 80)}</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </a>
                      ) : (
                        <span title={video.title}>{truncateText(video.title || '(Utan titel)', 80)}</span>
                      )}
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      {formatPublished(video.date)}
                    </TableCell>

                    {selectedFields.map(field => (
                      <TableCell key={field} className="text-right">
                        {renderValue(video, field)}
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
                Visar {Math.min((currentPage - 1) * pageSize + 1, filteredCount)}–{Math.min(currentPage * pageSize, filteredCount)} av {filteredCount}
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
