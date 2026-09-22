import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Crown, FileImage, FileSpreadsheet, ExternalLink, Info } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { METRIC_FIELDS } from '@/utils/constants';
import { formatNumber, truncateText } from '@/utils/utils';
import { downloadLeaderboardPng, MEDAL_COLORS } from '@/utils/leaderboardImage';
import { ProfileIcon } from '../ui/profile-icon';
import { resolveChannel } from '@/utils/channelColors';

/**
 * Topplisteläge
 *
 * Redaktionellt läge för "Topp 10 visningar" och liknande: färre siffror,
 * större typografi och en bild som går att klistra in i en presentation.
 *
 * Måtten går att ställa på tre axlar - nivå (konto eller video), mätvärde och
 * period - eftersom en topplista nästan alltid gäller en avgränsad period.
 *
 * @param {Array} props.videos - Alla videorader
 * @param {Array} props.months - Alla månadsrader
 * @param {Array} props.accounts - Alla konton
 */
export function LeaderboardView({ videos = [], months = [], accounts = [] }) {
  const [level, setLevel] = useState('accounts');   // 'accounts' | 'videos'
  const [metric, setMetric] = useState('views');
  const [fromMonth, setFromMonth] = useState(null);   // null = tidigaste månaden
  const [toMonth, setToMonth] = useState(null);       // null = senaste månaden
  const [limit, setLimit] = useState('10');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Stigande ordning - månaderna jämförs som strängar, vilket fungerar för YYYY-MM
  const availableMonths = useMemo(() => {
    const unique = new Set();
    months.forEach(m => { if (m.month) unique.add(m.month); });
    videos.forEach(v => { if (v.month) unique.add(v.month); });
    return Array.from(unique).sort();
  }, [months, videos]);

  const firstMonth = availableMonths[0] || null;
  const lastMonth = availableMonths[availableMonths.length - 1] || null;

  // Ett tomt val betyder "så långt det finns data", så att intervallet växer
  // av sig självt när en ny månad laddas upp.
  const rangeStart = fromMonth && availableMonths.includes(fromMonth) ? fromMonth : firstMonth;
  const rangeEndRaw = toMonth && availableMonths.includes(toMonth) ? toMonth : lastMonth;

  // Bakvänt intervall ska inte ge en tom lista
  const rangeEnd = rangeEndRaw && rangeStart && rangeEndRaw < rangeStart ? rangeStart : rangeEndRaw;

  const monthsInRange = useMemo(
    () => availableMonths.filter(m => (!rangeStart || m >= rangeStart) && (!rangeEnd || m <= rangeEnd)),
    [availableMonths, rangeStart, rangeEnd]
  );

  const isFullRange = rangeStart === firstMonth && rangeEnd === lastMonth;

  const getAccount = (accountId) => accounts.find(a => a.id === accountId) || null;
  const getAccountName = (accountId) => getAccount(accountId)?.name || 'Okänt konto';

  // Engagemangsnivå är ett snitt och får inte summeras
  const isAverage = metric === 'engagement_rate';

  const rows = useMemo(() => {
    const inPeriod = (item) => {
      if (!item.month) return false;
      if (rangeStart && item.month < rangeStart) return false;
      if (rangeEnd && item.month > rangeEnd) return false;
      return true;
    };
    const relevantVideos = videos.filter(inPeriod);

    if (level === 'videos') {
      return relevantVideos
        .map(video => {
          const account = getAccount(video.accountId);
          return {
            key: video.video_id || video.url,
            label: video.title || '(utan titel)',
            sublabel: getAccountName(video.accountId),
            iconName: account?.name || getAccountName(video.accountId),
            iconHandle: account?.handle || null,
            url: video.url || null,
            month: video.month,
            value: typeof video[metric] === 'number' ? video[metric] : 0,
          };
        })
        .sort((a, b) => b.value - a.value);
    }

    // Kontonivå: summera videoraderna, eller snitta när måttet är ett snitt
    const groups = {};
    relevantVideos.forEach(video => {
      const id = video.accountId || 'unknown';
      if (!groups[id]) groups[id] = [];
      groups[id].push(video);
    });

    return Object.entries(groups)
      .map(([accountId, items]) => {
        const values = items.map(i => (typeof i[metric] === 'number' ? i[metric] : 0));
        const value = isAverage
          ? (values.length ? parseFloat((values.reduce((s, v) => s + v, 0) / values.length).toFixed(2)) : 0)
          : values.reduce((s, v) => s + v, 0);

        const account = getAccount(accountId);
        const handle = account?.handle || null;

        return {
          key: accountId,
          label: getAccountName(accountId),
          sublabel: null,
          iconName: getAccountName(accountId),
          iconHandle: handle,
          url: handle ? `https://www.tiktok.com/@${handle}` : null,
          videoCount: items.length,
          value,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [videos, level, metric, rangeStart, rangeEnd, accounts, isAverage]);

  const topRows = useMemo(
    () => rows.slice(0, parseInt(limit, 10) || 10),
    [rows, limit]
  );

  const metricLabel = METRIC_FIELDS[metric] || metric;

  const periodLabel = (() => {
    if (!rangeStart || !rangeEnd) return 'Ingen period';
    if (rangeStart === rangeEnd) return rangeStart;
    const range = `${rangeStart} – ${rangeEnd}`;
    return isFullRange ? `${range} (alla månader)` : range;
  })();

  const periodSlug = rangeStart === rangeEnd ? rangeStart : `${rangeStart}_${rangeEnd}`;

  const title = `Topp ${topRows.length} · ${metricLabel}`;
  const subtitle = `${level === 'videos' ? 'Per video' : 'Per konto'} · ${periodLabel}`;

  const formatValue = (value) =>
    isAverage ? `${Number(value).toFixed(2)} %` : formatNumber(value);

  const handleExportPng = async () => {
    setIsExporting(true);
    setExportError(null);

    const result = await downloadLeaderboardPng({
      title,
      subtitle,
      metricLabel,
      rows: topRows.map(row => ({
        label: row.label,
        sublabel: row.sublabel,
        icon: resolveChannel({ name: row.iconName, handle: row.iconHandle }),
        value: isAverage ? Number(row.value).toFixed(2) : row.value,
      })),
      footer: `TikTok-statistik · Underlag: ${periodLabel} · Skapad ${new Date().toLocaleDateString('sv-SE')}`,
      filename: `topplista-${level === 'videos' ? 'video' : 'konto'}-${metric}-${periodSlug}.png`,
    });

    if (!result.success) {
      setExportError(result.error || 'Bilden kunde inte sparas');
    }
    setIsExporting(false);
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      const data = topRows.map((row, index) => {
        const exportRow = {
          'Placering': index + 1,
          [level === 'videos' ? 'Titel' : 'Konto']: row.label,
        };
        if (level === 'videos') {
          exportRow['Konto'] = row.sublabel;
          exportRow['Månad'] = row.month;
          exportRow['Länk'] = row.url || '';
        } else {
          exportRow['Antal videor'] = row.videoCount;
        }
        exportRow[metricLabel] = row.value;
        return exportRow;
      });

      await window.electronAPI.exportToExcel(
        data,
        `topplista-${level === 'videos' ? 'video' : 'konto'}-${metric}-${periodSlug}.xlsx`
      );
    } catch (error) {
      console.error('Export till Excel misslyckades:', error);
      setExportError(error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const maxValue = topRows.reduce((max, row) => Math.max(max, Number(row.value) || 0), 0);

  /**
   * Ett längre intervall gör det lätt att missa att en månad saknar CSV för
   * något konto - summan ser komplett ut ändå. Räkna luckorna och säg till.
   */
  const coverage = useMemo(() => {
    const uploaded = new Set(months.map(m => `${m.accountId}|${m.month}`));
    const relevantAccounts = accounts.filter(a => a.hasData);

    let missing = 0;
    relevantAccounts.forEach(account => {
      monthsInRange.forEach(month => {
        if (!uploaded.has(`${account.id}|${month}`)) missing += 1;
      });
    });

    return {
      missing,
      total: relevantAccounts.length * monthsInRange.length,
    };
  }, [months, accounts, monthsInRange]);

  return (
    <div className="space-y-4">
      {/* Inställningar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nivå</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="accounts">Per konto</SelectItem>
                  <SelectItem value="videos">Per video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mätvärde</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(METRIC_FIELDS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Från månad</Label>
              <Select value={rangeStart || ''} onValueChange={setFromMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableMonths.map(month => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Till månad</Label>
              <Select value={rangeEnd || ''} onValueChange={setToMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableMonths
                    .filter(month => !rangeStart || month >= rangeStart)
                    .map(month => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Antal</Label>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['3', '5', '10', '20'].map(n => (
                    <SelectItem key={n} value={n}>Topp {n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-xs text-muted-foreground">Period: {periodLabel}</span>
            {!isFullRange && availableMonths.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setFromMonth(firstMonth); setToMonth(lastMonth); }}
              >
                Visa alla månader
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            <Button onClick={handleExportPng} disabled={isExporting || topRows.length === 0}>
              <FileImage className="h-4 w-4 mr-2" />
              Spara som PNG
            </Button>
            <Button variant="outline" onClick={handleExportExcel} disabled={isExporting || topRows.length === 0}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportera till Excel
            </Button>
            <span className="text-xs text-muted-foreground self-center ml-1">
              PNG:en är gjord för att klistras in i en presentation
            </span>
          </div>

          {exportError && (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>{exportError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Topplistan */}
      {topRows.length === 0 ? (
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <p>Ingen data för den valda perioden.</p>
            {period !== 'all' && (
              <p className="text-sm mt-1">Prova en annan månad, eller "Alla månader".</p>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-bold">{title}</h2>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>

            <ol className="space-y-2">
              {topRows.map((row, index) => {
                const isTop3 = index < 3;
                const color = isTop3 ? MEDAL_COLORS[index] : undefined;
                const share = maxValue > 0 ? (Number(row.value) / maxValue) * 100 : 0;

                return (
                  <li
                    key={row.key}
                    className="flex items-center gap-4 rounded-xl border p-3 transition-colors"
                    style={isTop3 ? { borderColor: color } : undefined}
                  >
                    <div className="w-12 shrink-0 flex flex-col items-center justify-center">
                      {isTop3 ? (
                        <>
                          <Crown className="h-6 w-6" style={{ color }} aria-hidden="true" />
                          <span className="text-sm font-bold leading-none mt-0.5" style={{ color }}>
                            {index + 1}
                          </span>
                        </>
                      ) : (
                        <span className="text-xl font-semibold text-muted-foreground">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    <ProfileIcon
                      name={row.iconName}
                      handle={row.iconHandle}
                      size="md"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold truncate" title={row.label}>
                          {truncateText(row.label, 90)}
                        </span>
                        {row.url && (
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={level === 'videos' ? 'Öppna videon på TikTok' : 'Öppna kontot på TikTok'}
                            aria-label={level === 'videos' ? 'Öppna videon på TikTok' : 'Öppna kontot på TikTok'}
                            className="shrink-0 text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>

                      {row.sublabel ? (
                        <p className="text-xs text-muted-foreground truncate">{row.sublabel}</p>
                      ) : (
                        <div className="h-1.5 rounded-full bg-muted mt-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${share}%`,
                              backgroundColor: color || 'hsl(var(--primary))',
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold tabular-nums">
                        {formatValue(row.value)}
                      </div>
                      <div className="text-xs text-muted-foreground">{metricLabel}</div>
                    </div>
                  </li>
                );
              })}
            </ol>

            {coverage.missing > 0 && (
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {coverage.missing} av {coverage.total} konto-månader i perioden saknar
                  uppladdad CSV. Summorna för de kontona kan därför vara underskattade.
                  Vilka det gäller syns i vyn "Per månad".
                </AlertDescription>
              </Alert>
            )}

            {isAverage && (
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Engagemangsnivån är ett genomsnitt per video, inte en summa. En topplista
                  på engagemangsnivå kan därför toppas av konton med få men välfungerande klipp.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
