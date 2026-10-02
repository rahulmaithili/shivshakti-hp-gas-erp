/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - BACKEND UTILITIES & RESPONSE HELPERS
 * Standard responses, Password Salted SHA-256 Hashing, Audit Writer, Paise math
 * ============================================================================
 */

function sendSuccess(data, message) {
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    data: data !== undefined ? data : {},
    message: message || ''
  })).setMimeType(ContentService.MimeType.JSON);
}

function sendError(code, message) {
  return ContentService.createTextOutput(JSON.stringify({
    ok: false,
    error: {
      code: code || 'SERVER',
      message: message || 'An unexpected server error occurred.'
    }
  })).setMimeType(ContentService.MimeType.JSON);
}

function successResponse(data, message) {
  return {
    ok: true,
    data: data !== undefined ? data : {},
    message: message || ''
  };
}

function errorResponse(message, code) {
  return {
    ok: false,
    error: {
      code: code || 'SERVER',
      message: message || 'An unexpected server error occurred.'
    }
  };
}

function generateSalt() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let salt = '';
  for (let i = 0; i < 16; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

function hashPassword(password, salt) {
  const raw = String(password) + String(salt);
  const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return signature.map(function(byte) {
    const v = (byte < 0 ? byte + 256 : byte).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function sanitizeDate(dateStr) {
  if (!dateStr) return getTodayDateString();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return getTodayDateString();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function toPaise(val) {
  const num = Number(val);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

function writeAudit(userId, username, action, module, recordId, reason, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('AuditLog');
    if (sheet) {
      const auditId = 'aud_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      sheet.appendRow([
        auditId,
        new Date().toISOString(),
        userId || 'system',
        username || 'System',
        action,
        module,
        recordId || '',
        reason || '',
        details || '',
        false
      ]);
    }
  } catch (e) {
    console.error('Audit writing error:', e);
  }
}

function formatDateString(val) {
  return sanitizeDate(val);
}

function getTodayISO() {
  return getTodayDateString();
}

function writeAuditLog(user, action, module, recordId, reason, details) {
  const uid = user ? (user.userId || user.username || 'system') : 'system';
  const uname = user ? (user.username || 'System') : 'System';
  writeAudit(uid, uname, action, module, recordId, reason, details);
}
