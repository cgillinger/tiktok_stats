/**
 * Hämtning från TikToks oEmbed-API
 *
 * Detta är appens ENDA nätverkstrafik. All statistik bearbetas lokalt; det
 * som hämtas här är miniatyrbilder och visningsnamn, och bara när användaren
 * uttryckligen har bett om det.
 *
 * Varje funktion kräver därför ett `consent`-argument som måste vara exakt
 * true. Spärren finns för att ett framtida anrop inte ska kunna råka hämta
 * data utan att användaren valt det - det är lätt att glömma en flagga, och
 * konsekvensen här är att appens integritetslöfte bryts.
 *
 * Vad som lämnar webbläsaren vid ett anrop: videons publika URL (och därmed
 * konto och video-ID) samt användarens IP-adress, till TikTok. Ingen
 * statistik och inga uppladdade filer skickas någonsin.
 *
 * Miniatyr-URL:erna från oEmbed är signerade och slutar fungera efter ungefär
 * ett dygn, så bilderna cachas som bytes - aldrig som URL:er.
 */
import { getCachedThumbnail, cacheThumbnail } from './webStorageService.js';

const OEMBED_ENDPOINT = 'https://www.tiktok.com/oembed';

// Hur många samtidiga anrop vi tillåter mot TikTok
const CONCURRENCY = 4;

const REQUEST_TIMEOUT_MS = 8000;

export class ConsentRequiredError extends Error {
  constructor() {
    super('Hämtning från TikTok kräver att användaren uttryckligen har valt det.');
    this.name = 'ConsentRequiredError';
  }
}

const assertConsent = (consent) => {
  if (consent !== true) throw new ConsentRequiredError();
};

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Kör uppgifter med en tak på antal samtidiga anrop.
 */
const runLimited = async (items, worker, limit = CONCURRENCY) => {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        results[index] = { error };
      }
    }
  });

  await Promise.all(runners);
  return results;
};

/**
 * Hämtar oEmbed-metadata för en video-URL.
 *
 * @param {string} videoUrl
 * @param {boolean} consent - måste vara true
 * @returns {Promise<{title, authorName, thumbnailUrl}|null>}
 */
export async function fetchOEmbed(videoUrl, consent) {
  assertConsent(consent);
  if (!videoUrl) return null;

  const response = await fetchWithTimeout(
    `${OEMBED_ENDPOINT}?url=${encodeURIComponent(videoUrl)}`
  );

  if (!response.ok) return null;

  const data = await response.json();
  return {
    title: data.title || null,
    authorName: data.author_name || null,
    authorUrl: data.author_url || null,
    thumbnailUrl: data.thumbnail_url || null,
  };
}

/**
 * Hämtar visningsnamnet för ett konto, via en av dess videor.
 *
 * @param {string} videoUrl - en video som tillhör kontot
 * @param {boolean} consent
 * @returns {Promise<string|null>}
 */
export async function fetchAccountDisplayName(videoUrl, consent) {
  assertConsent(consent);
  try {
    const data = await fetchOEmbed(videoUrl, consent);
    return data?.authorName || null;
  } catch (error) {
    console.warn('Kunde inte hämta visningsnamn:', error);
    return null;
  }
}

/**
 * Hämtar en miniatyr som blob, från cachen om den finns där.
 *
 * @param {Object} video - { video_id, url }
 * @param {boolean} consent
 * @returns {Promise<Blob|null>}
 */
export async function fetchThumbnail(video, consent) {
  assertConsent(consent);
  if (!video?.url) return null;

  const videoId = video.video_id || video.url;

  const cached = await getCachedThumbnail(videoId);
  if (cached) return cached;

  const meta = await fetchOEmbed(video.url, consent);
  if (!meta?.thumbnailUrl) return null;

  // crossOrigin-läget spelar roll: bilden ska kunna ritas på canvas utan att
  // göra den "tainted", annars slutar PNG-exporten fungera.
  const imageResponse = await fetchWithTimeout(meta.thumbnailUrl, { mode: 'cors' });
  if (!imageResponse.ok) return null;

  const blob = await imageResponse.blob();
  await cacheThumbnail(videoId, blob);
  return blob;
}

/**
 * Hämtar miniatyrer för flera videor.
 *
 * @param {Array} videos - [{ video_id, url }]
 * @param {boolean} consent
 * @param {Function} [onProgress] - (klara, totalt)
 * @returns {Promise<Map<string, string>>} - videoId -> object-URL
 */
export async function fetchThumbnails(videos, consent, onProgress) {
  assertConsent(consent);

  const withUrl = (videos || []).filter(v => v?.url);
  const result = new Map();
  let done = 0;

  await runLimited(withUrl, async (video) => {
    try {
      const blob = await fetchThumbnail(video, consent);
      if (blob) {
        result.set(video.video_id || video.url, URL.createObjectURL(blob));
      }
    } catch (error) {
      console.warn(`Miniatyr misslyckades för ${video.url}:`, error);
    } finally {
      done += 1;
      if (onProgress) onProgress(done, withUrl.length);
    }
  });

  return result;
}

/**
 * Laddar en blob till ett HTMLImageElement, redo att ritas på canvas.
 *
 * @param {Blob} blob
 * @returns {Promise<HTMLImageElement|null>}
 */
export function blobToImage(blob) {
  return new Promise((resolve) => {
    if (!blob) {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}
