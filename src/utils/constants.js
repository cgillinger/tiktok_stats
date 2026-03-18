/**
 * Application-wide constants for the TikTok Statistics App
 */

// Storage keys for localStorage and IndexedDB
export const STORAGE_KEYS = {
  LAST_SELECTED_ACCOUNT: 'tiktok_stats_last_selected_account',

  // Account data
  ACCOUNTS: 'tiktok_stats_accounts',

  // CSV data (for small files only, larger ones use IndexedDB)
  OVERVIEW_DATA_PREFIX: 'tiktok_stats_overview_data_',  // + accountId

  // IndexedDB configurations
  DB_NAME: 'TikTokStatisticsDB',
  DB_VERSION: 1,
  STORE_ACCOUNTS: 'accounts',
  STORE_OVERVIEW_DATA: 'overviewData',
};

// Översiktsfält (OVERVIEW CSV fields) - Swedish column names
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

// Summary View tillgängliga fält
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

// Account View tillgängliga fält (aggregerade per konto)
export const ACCOUNT_VIEW_AVAILABLE_FIELDS = {
  'video_views': 'Videovisningar',
  'reach': 'Räckvidd (snitt)',
  'profile_views': 'Profilvisningar',
  'likes': 'Gilla-markeringar',
  'comments': 'Kommentarer',
  'shares': 'Delningar',
  'interactions': 'Interaktioner',
  'engagement_rate': 'Engagemangsnivå (%)',
  'new_followers': 'Nya följare',
  'lost_followers': 'Tappade följare',
  'follower_net_growth': 'Nettotillväxt',
  'post_count': 'Antal dagar',
};

// Lagrings begränsningar
export const STORAGE_LIMITS = {
  LOCAL_STORAGE_MAX: 5 * 1024 * 1024, // 5MB
  INDEXED_DB_WARNING: 50 * 1024 * 1024, // 50MB - varning vid denna nivå
  ACCOUNT_MAX: 50, // Max antal konton
};
