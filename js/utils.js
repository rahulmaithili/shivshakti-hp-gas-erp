/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - UTILITIES & NUMBER HELPERS
 * Exact currency calculation in paise, date formats, HTML sanitization, Base64
 * ============================================================================
 */

import { CONFIG } from './config.js';

/**
 * Format numeric value to Indian Rupee (₹1,234.56)
 */
export function formatINR(val) {
  const num = Number(val) || 0;
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Converts decimal currency to integer paise to eliminate floating point errors
 */
export function toPaise(val) {
  if (val === null || val === undefined) return 0;
  const num = Number(val);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Converts integer paise back to Rupee float
 */
export function fromPaise(paise) {
  return Number((paise / 100).toFixed(2));
}

/**
 * Format YYYY-MM-DD to DD-MM-YYYY
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Get local Indian calendar date string YYYY-MM-DD
 */
export function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Escape HTML to prevent XSS in dynamic tables
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Debounce helper for instant global search & autocomplete
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * File to Base64 Converter with MIME and Size Validation
 */
export function fileToBase64(file, maxBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided for upload.'));
    }
    if (file.size > maxBytes) {
      return reject(new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed limit (${(maxBytes / 1024 / 1024).toFixed(2)} MB).`));
    }
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validMimes.includes(file.type)) {
      return reject(new Error('Invalid image format. Supported formats: PNG, JPG, JPEG, WEBP, SVG.'));
    }

    const reader = new FileReader();
    reader.onload = () => resolve({
      base64: reader.result,
      mimeType: file.type,
      fileName: file.name,
      fileSize: file.size
    });
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}
