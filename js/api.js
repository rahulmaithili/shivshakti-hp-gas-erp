/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - CENTRAL API CLIENT
 * Handles authentication, timeout (30s), single retry, duplicate prevention,
 * request ID tracking, standard error responses, and automatic logout on 401.
 * ============================================================================
 */

import { CONFIG } from './config.js';
import { ui } from './ui.js';

// In-flight request tracker for duplicate submission prevention
const activeRequests = new Set();

/**
 * Central API function used by ALL modules
 */
export async function api(action, payload = {}, options = {}) {
  const {
    showLoading = true,
    loadingText = 'Processing...',
    preventDuplicate = true,
    timeout = CONFIG.DEFAULT_TIMEOUT
  } = options;

  // 1. Duplicate submission check
  const requestKey = `${action}_${JSON.stringify(payload)}`;
  if (preventDuplicate && activeRequests.has(requestKey)) {
    ui.toast('A duplicate request is already in progress. Please wait.', 'warning');
    throw new Error('Duplicate submission prevented.');
  }

  if (preventDuplicate) {
    activeRequests.add(requestKey);
  }

  if (showLoading) {
    ui.loading(loadingText);
  }

  const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN) || null;
  const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

  const requestBody = JSON.stringify({
    action,
    token,
    requestId,
    payload
  });

  // Determine endpoint: check user-overridden URL, else config proxy URL
  const endpoint = localStorage.getItem(CONFIG.STORAGE_KEYS.API_URL) || CONFIG.API_PROXY_URL;

  let attempt = 0;
  const maxAttempts = CONFIG.MAX_RETRIES + 1;

  try {
    while (attempt < maxAttempts) {
      attempt++;
      try {
        const controller = new AbortController();
        const timeoutTimer = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: requestBody,
          signal: controller.signal
        });

        clearTimeout(timeoutTimer);

        const responseText = await response.text();
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseErr) {
          throw new Error('Invalid JSON response received from backend: ' + responseText.substring(0, 150));
        }

        // Standard API Response Handling
        if (!result.ok) {
          const errCode = result.error?.code || 'SERVER';
          const errMsg = result.error?.message || result.error || 'Unknown server error.';

          // Automatic session expiration handling
          if (errCode === 'AUTH' || errMsg.includes('Session expired') || errMsg.includes('Authentication failed')) {
            handleSessionExpired();
          }

          throw new Error(errMsg);
        }

        return result.data !== undefined ? result.data : result;
      } catch (err) {
        if (err.name === 'AbortError') {
          throw new Error(`Request timed out after ${timeout / 1000} seconds. Please check your network.`);
        }
        // If it's a network error and we have retries left, try once more
        if (attempt < maxAttempts && (err.message.includes('network') || err.message.includes('fetch'))) {
          console.warn(`[API] Retrying action: ${action} (Attempt ${attempt + 1})...`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        throw err;
      }
    }
  } catch (finalError) {
    ui.error('Transaction Failed', finalError.message);
    throw finalError;
  } finally {
    if (preventDuplicate) {
      activeRequests.delete(requestKey);
    }
    if (showLoading) {
      ui.close();
    }
  }
}

/**
 * Handle session expiration and redirect to login
 */
function handleSessionExpired() {
  localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
  document.body.classList.remove('user-logged-in');
  document.body.classList.add('user-logged-out');
  ui.warn('Session Expired', 'Your 12-hour encrypted session has expired. Please log in again.');
  window.location.hash = '#login';
}
