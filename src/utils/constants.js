/**
 * Application-wide constants for the TikTok Statistics App
 *
 * Appen läser månads-CSV: en fil per konto och månad, med två
 * sektioner (MÅNADSSUMMERING + PER VIDEO). De gamla TikTok-exporterna
 * (Översikt resp. Video) stöds inte längre — se LEGACY_FORMATS.
 */

// Storage keys for localStorage and IndexedDB
export const STORAGE_KEYS = {
  LAST_SELECTED_ACCOUNT: 'tiktok_stats_last_selected_account',

  // Account data
  ACCOUNTS: 'tiktok_stats_accounts',

  // CSV data (for small files only, larger ones use IndexedDB)
  VIDEO_DATA_PREFIX: 'tiktok_stats_video_data_',   // + accountId
  MONTH_DATA_PREFIX: 'tiktok_stats_month_data_',   // + accountId

  // Sätts när v1-data (gamla formatet) rensats vid DB-uppgradering
  LEGACY_DATA_CLEARED: 'tiktok_stats_legacy_data_cleared',

  // Användarens val att hämta data från TikTok (av som standard)
  FETCH_THUMBNAILS: 'tiktok_stats_fetch_thumbnails',

  // IndexedDB configurations
  DB_NAME: 'TikTokStatisticsDB',
  DB_VERSION: 3,
  STORE_ACCOUNTS: 'accounts',
  STORE_VIDEO_DATA: 'videoData',
  STORE_MONTH_DATA: 'monthData',
  STORE_THUMBNAILS: 'thumbnails',

  // v1-store, raderas vid uppgradering till v2
  LEGACY_STORE_OVERVIEW_DATA: 'overviewData',
};

// Sektionsrubriker i CSV-filen
export const CSV_SECTIONS = {
  MONTH: 'MÅNADSSUMMERING',
  VIDEO: 'PER VIDEO',
};

// PER VIDEO-sektionens kolumner (CSV-namn -> internt fältnamn)
export const VIDEO_FIELDS = {
  'filename': 'Filnamn',
  'video_id': 'VideoID',
  'title': 'Titel',
  'url': 'URL',
  'month': 'Månad',
  'date': 'Datum',
  'views': 'Visningar',
  'likes': 'Gilla',
  'comments': 'Kommentarer',
  'shares': 'Delningar',
  'interactions': 'Interaktioner',
};

// MÅNADSSUMMERING-sektionens kolumner (CSV-namn -> internt fältnamn)
export const MONTH_FIELDS = {
  'month': 'Månad',
  'video_count': 'Videor',
  'interactions': 'Interaktioner',
  'likes': 'Gilla',
  'comments': 'Kommentarer',
  'shares': 'Delningar',
  'views': 'Visningar',
};

// Fält som alltid tolkas som tal
export const NUMERIC_FIELDS = [
  'views', 'likes', 'comments', 'shares', 'interactions', 'video_count',
];

// Mätvärden som går att välja i vyerna
export const METRIC_FIELDS = {
  'views': 'Visningar',
  'likes': 'Gilla',
  'comments': 'Kommentarer',
  'shares': 'Delningar',
  'interactions': 'Interaktioner',
  'engagement_rate': 'Engagemangsnivå (%)',
};

// Per konto-vyn (aggregerat över alla uppladdade månader)
export const ACCOUNT_VIEW_AVAILABLE_FIELDS = {
  ...METRIC_FIELDS,
  'video_count': 'Antal videor',
  'month_count': 'Antal månader',
};

// Per månad-vyn (en rad per konto och månad)
export const MONTH_VIEW_AVAILABLE_FIELDS = {
  ...METRIC_FIELDS,
  'video_count': 'Antal videor',
};

// Per video-vyn (en rad per video)
export const VIDEO_VIEW_AVAILABLE_FIELDS = {
  ...METRIC_FIELDS,
};

/**
 * Hur engagemangsnivån räknas ut i det nya formatet.
 * Gamla formatet hade räckvidd ("Målgrupp som nåtts") som nämnare — den
 * finns inte i månadsfilerna, så nämnaren är visningar.
 */
export const ENGAGEMENT_RATE_BASIS = 'Interaktioner / visningar × 100';

/**
 * Längre förklaring, visas där måttet väljs. Nämnaren har bytt sedan det gamla
 * formatet, så siffrorna är inte jämförbara med äldre uttag.
 */
export const ENGAGEMENT_RATE_NOTE =
  'Interaktioner (gilla + kommentarer + delningar) delat med visningar, gånger 100. ' +
  'Räknades tidigare på räckvidd, som inte ingår i det nya dataformatet - värdena är ' +
  'därför inte jämförbara med äldre uttag.';

/**
 * Signaturer för de gamla TikTok-exporterna. Används enbart för att kunna
 * ge användaren ett begripligt felmeddelande - formaten stöds inte längre.
 */
export const LEGACY_FORMATS = {
  legacy_overview: {
    label: 'Översikt (daglig statistik)',
    signatures: [
      ['datum', 'videovisningar'],
      ['date', 'video views'],
    ],
  },
  legacy_video: {
    label: 'Video (en rad per video)',
    signatures: [
      ['videotitel', 'publiceringstid'],
      ['video title', 'post time'],
    ],
  },
};

export const LEGACY_FORMAT_MESSAGE =
  'Det verkar som att du försöker ladda upp CSV i det gamla formatet, de fungerar inte längre.';

// Lagrings begränsningar
export const STORAGE_LIMITS = {
  LOCAL_STORAGE_MAX: 5 * 1024 * 1024, // 5MB
  INDEXED_DB_WARNING: 50 * 1024 * 1024, // 50MB - varning vid denna nivå
  ACCOUNT_MAX: 50, // Max antal konton
};
