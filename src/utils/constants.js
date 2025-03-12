/**
 * Application-wide constants for the TikTok Statistics App
 */

// Storage keys for localStorage and IndexedDB
export const STORAGE_KEYS = {
  // Configuration
  COLUMN_MAPPINGS_OVERVIEW: 'tiktok_stats_column_mappings_overview',
  COLUMN_MAPPINGS_VIDEO: 'tiktok_stats_column_mappings_video',
  LAST_SELECTED_ACCOUNT: 'tiktok_stats_last_selected_account',
  
  // Account data
  ACCOUNTS: 'tiktok_stats_accounts',
  
  // CSV data (for small files only, larger ones use IndexedDB)
  OVERVIEW_DATA_PREFIX: 'tiktok_stats_overview_data_',  // + accountId
  VIDEO_DATA_PREFIX: 'tiktok_stats_video_data_',        // + accountId
  
  // IndexedDB configurations
  DB_NAME: 'TikTokStatisticsDB',
  DB_VERSION: 1,
  STORE_ACCOUNTS: 'accounts',
  STORE_OVERVIEW_DATA: 'overviewData',
  STORE_VIDEO_DATA: 'videoData',
};

// CSV Data types
export const CSV_TYPES = {
  OVERVIEW: 'overview',
  VIDEO: 'video',
};

// Display names for CSV types
export const CSV_TYPE_DISPLAY_NAMES = {
  [CSV_TYPES.OVERVIEW]: 'Översiktsdata',
  [CSV_TYPES.VIDEO]: 'Videodata',
};

// CSV detection - Keys that strongly indicate a specific CSV type
export const CSV_TYPE_INDICATORS = {
  [CSV_TYPES.OVERVIEW]: ['Datum', 'Målgrupp som nåtts', 'Profilvisningar', 'Nya följare', 'Tappade följare'],
  [CSV_TYPES.VIDEO]: ['Videotitel', 'Videolänk', 'Publiceringstid', 'Lägg till i Favoriter'],
};

// Översiktsfält (OVERVIEW CSV fields)
export const OVERVIEW_FIELDS = {
  'date': 'Datum',
  'video_views': 'Videovisningar',
  'reach': 'Målgrupp som nåtts',
  'profile_views': 'Profilvisningar',
  'likes': 'Gilla-markeringar',
  'shares': 'Delningar',
  'comments': 'Kommentarer',
  'product_clicks': 'Klick på produktlänkar',
  'product_purchase': 'Produktlänk genomför betalning',
  'product_gmv': 'GMV för produktlänkar',
  'website_clicks': 'Webbplatsklickar',
  'phone_clicks': 'Telefonnummerklickar',
  'collected_leads': 'Insamlade leads',
  'app_download_clicks': 'Klick på nedladdningslänk för app',
  'follower_net_growth': 'Nettotillväxt',
  'new_followers': 'Nya följare',
  'lost_followers': 'Tappade följare',
};

// Beräknade översiktsfält
export const OVERVIEW_CALCULATED_FIELDS = {
  'interactions': 'Interaktioner',
  'engagement_rate': 'Engagemangsnivå (%)',
};

// Alla tillgängliga översiktsfält (inklusive beräknade)
export const OVERVIEW_ALL_FIELDS = {
  ...OVERVIEW_FIELDS,
  ...OVERVIEW_CALCULATED_FIELDS,
};

// Videofält (VIDEO CSV fields)
export const VIDEO_FIELDS = {
  'title': 'Videotitel',
  'link': 'Videolänk',
  'publish_time': 'Publiceringstid',
  'views': 'Videovisningar',
  'likes': 'Gilla-markeringar',
  'comments': 'Kommentarer',
  'shares': 'Delningar',
  'favorites': 'Lägg till i Favoriter',
};

// Beräknade videofält
export const VIDEO_CALCULATED_FIELDS = {
  'interactions': 'Interaktioner',
  'engagement_rate': 'Engagemangsnivå (%)',
};

// Alla tillgängliga videofält (inklusive beräknade)
export const VIDEO_ALL_FIELDS = {
  ...VIDEO_FIELDS,
  ...VIDEO_CALCULATED_FIELDS,
};

// Summary View tillgängliga fält (baserat på OVERVIEW data)
export const SUMMARY_VIEW_AVAILABLE_FIELDS = {
  'video_views': 'Videovisningar',
  'reach': 'Målgrupp som nåtts',
  'profile_views': 'Profilvisningar',
  'likes': 'Gilla-markeringar',
  'comments': 'Kommentarer',
  'shares': 'Delningar',
  'interactions': 'Interaktioner',
  'engagement_rate': 'Engagemangsnivå (%)',
  'follower_net_growth': 'Nettotillväxt',
  'new_followers': 'Nya följare',
  'lost_followers': 'Tappade följare',
};

// Video View tillgängliga fält (baserat på VIDEO data)
export const VIDEO_VIEW_AVAILABLE_FIELDS = {
  'views': 'Videovisningar',
  'likes': 'Gilla-markeringar',
  'comments': 'Kommentarer',
  'shares': 'Delningar',
  'favorites': 'Lägg till i Favoriter',
  'interactions': 'Interaktioner',
  'engagement_rate': 'Engagemangsnivå (%)',
};

// Lagrings begränsningar
export const STORAGE_LIMITS = {
  LOCAL_STORAGE_MAX: 5 * 1024 * 1024, // 5MB
  INDEXED_DB_WARNING: 50 * 1024 * 1024, // 50MB - varning vid denna nivå
  ACCOUNT_MAX: 50, // Max antal konton
};

// Kategorier för fält (används i ColumnMappingEditor)
export const FIELD_CATEGORIES = {
  OVERVIEW: {
    'Tidsdata': ['date'],
    'Synlighet': ['video_views', 'reach', 'profile_views'],
    'Engagemang': ['likes', 'comments', 'shares'],
    'Följare': ['follower_net_growth', 'new_followers', 'lost_followers'],
    'Konvertering': ['product_clicks', 'product_purchase', 'product_gmv', 'website_clicks', 
                     'phone_clicks', 'collected_leads', 'app_download_clicks'],
  },
  VIDEO: {
    'Metadata': ['title', 'link', 'publish_time'],
    'Prestanda': ['views'],
    'Engagemang': ['likes', 'comments', 'shares', 'favorites'],
  },
};