/**
 * PNG-rendering av topplistor
 *
 * Ritar topplistan direkt på en canvas i stället för att fotografera DOM:en.
 * Skälet är att bilden ska gå att klistra in i en presentation: vi får full
 * kontroll över upplösning, marginaler och typografi, och slipper beroenden
 * till externa bibliotek, teckensnittsladdning och CORS-problem.
 *
 * Kronikonen är lucide "crown" (ISC), samma ikonuppsättning som gränssnittet
 * använder i övrigt - path-datan är hämtad därifrån så att bild och skärm
 * visar samma symbol.
 */

// lucide "crown", 24x24, stroke-width 2 (ISC - Lucide Contributors)
const CROWN_PATH = 'm2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14';

// Guld, silver, brons
export const MEDAL_COLORS = ['#C8A02C', '#8E9196', '#A2673F'];

const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const THEME = {
  scale: 2,                 // ritas i 2x för skarp text i presentationer
  width: 1280,
  padding: 56,
  headerGap: 26,
  rowHeight: 76,
  rowGap: 10,
  radius: 14,
  background: '#FFFFFF',
  cardFill: '#F6F7F9',
  cardFillTop: '#FFFFFF',
  text: '#16181D',
  textMuted: '#6B7280',
  accent: '#E11D62',
  barTrack: '#E9EBEF',
};

const formatNumber = (value) => {
  if (value === null || value === undefined) return '-';
  try {
    return new Intl.NumberFormat('sv-SE').format(value);
  } catch (e) {
    return String(value);
  }
};

/**
 * Kortar av text så att den ryms inom maxWidth, med avslutande ellips.
 */
const fitText = (ctx, text, maxWidth) => {
  const value = String(text ?? '');
  if (ctx.measureText(value).width <= maxWidth) return value;

  let low = 0;
  let high = value.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (ctx.measureText(value.slice(0, mid) + '…').width <= maxWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return value.slice(0, low).trimEnd() + '…';
};

/**
 * Bryter text till rader som ryms inom maxWidth, högst maxLines.
 * Sista raden får ellips om texten inte får plats.
 */
const wrapText = (ctx, text, maxWidth, maxLines) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    current = word;

    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && current) lines.push(current);

  // Fick allt inte plats - markera med ellips på sista raden
  const joined = lines.join(' ');
  if (joined.length < String(text).replace(/\s+/g, ' ').trim().length && lines.length > 0) {
    lines[lines.length - 1] = fitText(ctx, lines[lines.length - 1] + ' …', maxWidth);
  }

  return lines;
};

const roundedRect = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

/**
 * Ritar lucide-kronan centrerad i (cx, cy) med angiven höjd.
 */
const drawCrown = (ctx, cx, cy, size, color) => {
  const scale = size / 24;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;          // i ikonens eget 24-koordinatsystem
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(CROWN_PATH));
  ctx.restore();
};

/**
 * Ritar en kanalfärgad kontoikon - samma ruta som ProfileIcon i gränssnittet.
 */
const drawProfileIcon = (ctx, x, y, size, { label, color }) => {
  ctx.save();
  ctx.fillStyle = color;
  roundedRect(ctx, x, y, size, size, 4);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 ${Math.round(size * 0.42)}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(label || '?'), x + size / 2, y + size / 2 + 1);
  ctx.restore();
};

/**
 * Ritar en miniatyrbild beskuren till en kvadrat med rundade hörn.
 * TikTok-bilder är stående (9:16), så vi beskär mitten på höjden.
 */
const drawThumbnail = (ctx, image, x, y, size) => {
  if (!image || !image.width || !image.height) return;

  ctx.save();
  roundedRect(ctx, x, y, size, size, 6);
  ctx.clip();

  const scale = Math.max(size / image.width, size / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;

  ctx.drawImage(
    image,
    x + (size - drawWidth) / 2,
    y + (size - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
  ctx.restore();
};

/**
 * Renderar en topplista till en canvas.
 *
 * @param {Object} options
 * @param {string} options.title - t.ex. "Topp 10 - Visningar"
 * @param {string} options.subtitle - t.ex. "Per konto · 2026-08"
 * @param {Array} options.rows - [{ label, sublabel, value, icon, thumbnail }] där
 *   icon är { label, color } från resolveChannel, thumbnail ett laddat
 *   HTMLImageElement och detail fortsättningen på inläggstexten - alla valfria
 * @param {string} options.metricLabel - t.ex. "Visningar"
 * @param {string} [options.footer]
 * @returns {HTMLCanvasElement}
 */
export function renderLeaderboardCanvas({ title, subtitle, rows, metricLabel, footer }) {
  const items = Array.isArray(rows) ? rows : [];
  const { scale, width, padding, rowGap, headerGap } = THEME;

  // Miniatyrer och fortsättningstext kräver högre rader
  const hasThumbnails = items.some(row => row.thumbnail);
  const hasDetail = items.some(row => row.detail);
  const rowHeight = hasDetail ? 124 : (hasThumbnails ? 96 : THEME.rowHeight);

  const headerHeight = 132;
  const footerHeight = footer ? 52 : 24;
  const bodyHeight = items.length * rowHeight + Math.max(0, items.length - 1) * rowGap;
  const height = headerHeight + headerGap + bodyHeight + footerHeight + padding;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.textBaseline = 'middle';

  // Bakgrund
  ctx.fillStyle = THEME.background;
  ctx.fillRect(0, 0, width, height);

  // Rubrik
  ctx.fillStyle = THEME.text;
  ctx.font = `700 40px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText(fitText(ctx, title, width - padding * 2), padding, padding + 22);

  ctx.fillStyle = THEME.textMuted;
  ctx.font = `400 20px ${FONT_STACK}`;
  ctx.fillText(fitText(ctx, subtitle, width - padding * 2), padding, padding + 62);

  // Kolumnrubrik för mätvärdet
  ctx.textAlign = 'right';
  ctx.font = `600 15px ${FONT_STACK}`;
  ctx.fillStyle = THEME.textMuted;
  ctx.fillText(String(metricLabel || '').toUpperCase(), width - padding, padding + 62);

  // Skiljelinje
  ctx.strokeStyle = THEME.barTrack;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding + 88);
  ctx.lineTo(width - padding, padding + 88);
  ctx.stroke();

  const maxValue = items.reduce((max, row) => Math.max(max, Number(row.value) || 0), 0);

  items.forEach((row, index) => {
    const y = headerHeight + headerGap + index * (rowHeight + rowGap);
    const isTop3 = index < 3;

    // Kort
    ctx.fillStyle = isTop3 ? THEME.cardFillTop : THEME.cardFill;
    roundedRect(ctx, padding, y, width - padding * 2, rowHeight, THEME.radius);
    ctx.fill();

    if (isTop3) {
      ctx.strokeStyle = MEDAL_COLORS[index];
      ctx.lineWidth = 2;
      roundedRect(ctx, padding + 1, y + 1, width - padding * 2 - 2, rowHeight - 2, THEME.radius);
      ctx.stroke();
    }

    const rankX = padding + 44;

    if (isTop3) {
      drawCrown(ctx, rankX, y + rowHeight / 2 - 11, 26, MEDAL_COLORS[index]);
      ctx.fillStyle = MEDAL_COLORS[index];
      ctx.font = `700 19px ${FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(index + 1), rankX, y + rowHeight / 2 + 16);
    } else {
      ctx.fillStyle = THEME.textMuted;
      ctx.font = `600 24px ${FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(index + 1), rankX, y + rowHeight / 2);
    }

    // Värde först, så att vi vet hur mycket plats etiketten får
    ctx.textAlign = 'right';
    ctx.fillStyle = THEME.text;
    ctx.font = `700 27px ${FONT_STACK}`;
    const valueText = formatNumber(row.value);
    ctx.fillText(valueText, width - padding - 24, y + rowHeight / 2);
    const valueWidth = ctx.measureText(valueText).width;

    const iconSize = 30;
    let labelX = rankX + 42;

    if (row.thumbnail) {
      const thumbSize = rowHeight - 24;
      drawThumbnail(ctx, row.thumbnail, labelX, y + 12, thumbSize);
      labelX += thumbSize + 16;
    }

    if (row.icon) {
      drawProfileIcon(ctx, labelX, y + rowHeight / 2 - iconSize / 2, iconSize, row.icon);
      labelX += iconSize + 14;
    }

    const labelMaxWidth = width - padding - 24 - valueWidth - 40 - labelX;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = THEME.text;

    if (row.sublabel || row.detail) {
      // Rubrikrad stort, fortsättningen mindre och ofet, konto sist
      const blockLines = [];

      ctx.font = `600 20px ${FONT_STACK}`;
      blockLines.push({
        text: fitText(ctx, row.label, labelMaxWidth),
        font: `600 20px ${FONT_STACK}`,
        color: THEME.text,
        height: 26,
      });

      if (row.detail) {
        ctx.font = `400 17px ${FONT_STACK}`;
        wrapText(ctx, row.detail, labelMaxWidth, 2).forEach(line => {
          blockLines.push({
            text: line,
            font: `400 17px ${FONT_STACK}`,
            color: THEME.textMuted,
            height: 23,
          });
        });
      }

      if (row.sublabel) {
        ctx.font = `400 15px ${FONT_STACK}`;
        blockLines.push({
          text: fitText(ctx, row.sublabel, labelMaxWidth),
          font: `400 15px ${FONT_STACK}`,
          color: THEME.textMuted,
          height: 21,
        });
      }

      const blockHeight = blockLines.reduce((sum, line) => sum + line.height, 0);
      let cursorY = y + rowHeight / 2 - blockHeight / 2;

      blockLines.forEach(line => {
        ctx.font = line.font;
        ctx.fillStyle = line.color;
        ctx.fillText(line.text, labelX, cursorY + line.height / 2);
        cursorY += line.height;
      });
    } else {
      ctx.font = `600 22px ${FONT_STACK}`;
      ctx.fillText(fitText(ctx, row.label, labelMaxWidth), labelX, y + rowHeight / 2 - 8);

      // Proportionsstapel under namnet
      const value = Number(row.value) || 0;
      const barWidth = maxValue > 0 ? Math.max(4, (labelMaxWidth * value) / maxValue) : 0;
      ctx.fillStyle = THEME.barTrack;
      roundedRect(ctx, labelX, y + rowHeight / 2 + 12, labelMaxWidth, 6, 3);
      ctx.fill();
      ctx.fillStyle = isTop3 ? MEDAL_COLORS[index] : THEME.accent;
      roundedRect(ctx, labelX, y + rowHeight / 2 + 12, barWidth, 6, 3);
      ctx.fill();
    }
  });

  if (footer) {
    ctx.textAlign = 'left';
    ctx.fillStyle = THEME.textMuted;
    ctx.font = `400 15px ${FONT_STACK}`;
    ctx.fillText(footer, padding, height - padding / 2 - 4);
  }

  return canvas;
}

/**
 * Renderar och laddar ner topplistan som PNG.
 *
 * @param {Object} options - samma som renderLeaderboardCanvas, plus filename
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export function downloadLeaderboardPng(options) {
  return new Promise((resolve) => {
    try {
      const canvas = renderLeaderboardCanvas(options);

      canvas.toBlob((blob) => {
        if (!blob) {
          resolve({ success: false, error: 'Bilden kunde inte skapas' });
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = options.filename || 'topplista.png';
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          URL.revokeObjectURL(url);
          document.body.removeChild(link);
        }, 100);

        resolve({ success: true });
      }, 'image/png');
    } catch (error) {
      console.error('Fel vid PNG-export:', error);
      resolve({ success: false, error: error.message });
    }
  });
}
