/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - CENTRAL SYSTEM CONFIGURATION
 * Single source of truth for endpoints, timeouts, and business rules
 * ============================================================================
 */

export const CONFIG = {
  APP_NAME: 'Shiv Shakti HP Gas ERP',
  AGENCY_NAME: 'Shiv Shakti HP Gas (Pandaul)',
  DISTRIBUTOR_CODE: 'HP-124908',
  
  // API Endpoints: Primary Netlify Function Proxy & Direct GAS Fallback
  API_PROXY_URL: '/api',
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz7H4EIGnGX_Jm4rtbpQ0l19LaeHpgBDa7P7jA_UEF1TYFpQs25pX_xw7HJdxWES_5zWw/exec',

  // Network & Timeout (30 seconds default)
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRIES: 1,

  // Business Locale & Formats
  TIMEZONE: 'Asia/Kolkata',
  CURRENCY: 'INR',
  CURRENCY_SYMBOL: '₹',
  DATE_FORMAT: 'DD-MM-YYYY',

  // Pagination & Storage Keys
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,

  STORAGE_KEYS: {
    TOKEN: 'ss_token',
    USER: 'ss_user',
    THEME: 'ss_theme',
    THEME_VARS: 'app_theme_vars',
    API_URL: 'ss_api_url',
    SIDEBAR_COLLAPSED: 'ss_sidebar_collapsed',
    REMEMBERED_USER: 'ss_remembered_username',
    COMPANY: 'ss_company_cache'
  }
};
