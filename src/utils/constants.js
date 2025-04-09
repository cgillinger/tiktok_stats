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
  FACEBOOK: 'facebook',  // New: Facebook detection
  INSTAGRAM: 'instagram', // New: Instagram detection
  UNKNOWN: 'unknown',     // New: For unrecognized formats
};

// Display names for CSV types
export const CSV_TYPE_DISPLAY_NAMES = {
  [CSV_TYPES.OVERVIEW]: 'Översiktsdata',
  [CSV_TYPES.VIDEO]: 'Videodata',
  [CSV_TYPES.FACEBOOK]: 'Facebook-statistik', // New
  [CSV_TYPES.INSTAGRAM]: 'Instagram-statistik', // New
  [CSV_TYPES.UNKNOWN]: 'Okänd datatyp', // New
};

// CSV detection - Keys that strongly indicate a specific CSV type
export const CSV_TYPE_INDICATORS = {
  [CSV_TYPES.OVERVIEW]: [
    // Swedish indicators
    'Datum', 'Målgrupp som nåtts', 'Profilvisningar', 'Nya följare', 'Tappade följare',
    'Videovisningar', 'Nettotillväxt',
    // English indicators
    'Date', 'Reached audience', 'Profile views', 'New followers', 'Lost followers',
    'Video Views', 'Net growth'
  ],
  [CSV_TYPES.VIDEO]: [
    // Swedish indicators
    'Videotitel', 'Videolänk', 'Publiceringstid', 'Lägg till i Favoriter',
    // English indicators
    'Video title', 'Video link', 'Publishing time', 'Add to favorites'
  ],
  // New: Facebook indicators
  [CSV_TYPES.FACEBOOK]: [
    'Page name', 'Sidnamn', 'Facebook Page', 'Sida',
    'Page total reach', 'Page total impressions', 
    'Sidans totala räckvidd', 'Sidans totala visningar',
    'Post reach', 'Post impressions', 'Räckvidd för inlägg', 'Visningar av inlägg'
  ],
  // New: Instagram indicators
  [CSV_TYPES.INSTAGRAM]: [
    'Instagram username', 'Instagram-användarnamn',
    'Profile visits', 'Profilbesök',
    'Accounts engaged', 'Konton som interagerade',
    'Instagram reach', 'Instagram-räckvidd',
    'Impressions', 'Stories impressions', 'Videovisningar', 
    'Followers', 'Reach', 'Accounts reached'
  ]
};

// Required columns for valid TikTok CSV files
export const REQUIRED_OVERVIEW_FIELDS = [
  'date', 'video_views', 'reach', 'profile_views', 'likes', 'comments', 'shares'
];

export const REQUIRED_VIDEO_FIELDS = [
  'title', 'publish_time', 'views', 'likes', 'comments', 'shares'
];

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

// English equivalents for overview fields
export const OVERVIEW_FIELDS_ENGLISH = {
  'date': 'Date',
  'video_views': 'Video views',
  'reach': 'Reached audience',
  'profile_views': 'Profile views',
  'likes': 'Likes',
  'shares': 'Shares',
  'comments': 'Comments',
  'product_clicks': 'Product link clicks',
  'product_purchase': 'Product link complete payment',
  'product_gmv': 'Product link GMV',
  'website_clicks': 'Website clicks',
  'phone_clicks': 'Phone number clicks',
  'collected_leads': 'Leads submission',
  'app_download_clicks': 'App download link clicks',
  'follower_net_growth': 'Net growth',
  'new_followers': 'New followers',
  'lost_followers': 'Lost followers',
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

// English equivalents for video fields
export const VIDEO_FIELDS_ENGLISH = {
  'title': 'Video title',
  'link': 'Video link',
  'publish_time': 'Post time',
  'views': 'Video views',
  'likes': 'Likes',
  'comments': 'Comments',
  'shares': 'Shares',
  'favorites': 'Add to favorites',
};

// Beräknade videofält
export const VIDEO_CALCULATED_FIELDS = {
  'interactions': 'Interaktioner',
  'engagement_rate': 'Engagemangsnivå (%)',
  'publication_count': 'Antal publiceringar',
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
  'publication_count': 'Antal publiceringar',
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