/**
 * ============================================================================
 * SHIV SHAKTI HP GAS AGENCY (Pandaul Branch) - DAILY ROJNAMCHA & REPORT SYSTEM
 * Google Apps Script Web App Backend (JSON API)
 * ============================================================================
 */

// Configuration Constants
const CONFIG = {
  TIMEZONE: 'Asia/Kolkata',
  SESSION_DURATION_HOURS: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 5,
  DRIVE_ARCHIVE_FOLDER_NAME: 'Shiv Shakti HP Gas - Daily Archives',
  DEFAULT_DATE_FORMAT: 'yyyy-MM-dd',
  DEFAULT_PRINT_DATE_FORMAT: 'dd/MM/yyyy'
};

// Sheet Names
const SHEETS = {
  USERS: 'USERS',
  RATES: 'RATES',
  ENTRY: 'ENTRY',
  VENDOR_LOG: 'VENDOR_LOG',
  CASHBOOK: 'CASHBOOK',
  DUES: 'DUES',
  STOCK: 'STOCK',
  AUDIT_LOG: 'AUDIT_LOG',
  SESSIONS: 'SESSIONS',
  ARCHIVES: 'ARCHIVES',
  // Report Sheet Aliases
  REPORT_SALES: 'REPORT_SALES',
  REPORT_CASH: 'REPORT_CASH',
  REPORT_VENDOR: 'REPORT_VENDOR',
  REPORT_STOCK: 'REPORT_STOCK'
};

// Alternate sheet name mappings matching existing Excel workbook
const REPORT_NAME_MAP = {
  'REPORT_SALES': ['REPORT_SALES', 'Daily Sales'],
  'REPORT_CASH': ['REPORT_CASH', 'Cash Report'],
  'REPORT_VENDOR': ['REPORT_VENDOR', 'COLLECTION SUMMARY'],
  'REPORT_STOCK': ['REPORT_STOCK', 'Cylinser Stock', 'Cylinder Stock']
};

/**
 * Helper to get a sheet by standard key or alternative name.
 */
function getSheet(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (REPORT_NAME_MAP[key]) {
    for (const name of REPORT_NAME_MAP[key]) {
      const s = ss.getSheetByName(name);
      if (s) return s;
    }
  }
  let sheet = ss.getSheetByName(key);
  if (!sheet && SHEETS[key]) {
    sheet = ss.getSheetByName(SHEETS[key]);
  }
  return sheet;
}

/**
 * Standard API JSON response helper
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function successResponse(data = {}) {
  return { ok: true, data: data };
}

function errorResponse(message) {
  return { ok: false, error: String(message || 'Unknown server error') };
}

/**
 * Web App Entry Points
 */
function doGet(e) {
  return createJsonResponse(successResponse({
    status: 'online',
    system: 'SHIV SHAKTI HP GAS AGENCY - ROJNAMCHA API',
    timestamp: Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss")
  }));
}

function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter && e.parameter.payload) {
      payload = JSON.parse(e.parameter.payload);
    } else {
      return createJsonResponse(errorResponse("No payload provided in request."));
    }

    const action = payload.action;
    if (!action) {
      return createJsonResponse(errorResponse("Missing 'action' parameter."));
    }

    // Public actions that do not require an active session token
    if (action === 'login') {
      return createJsonResponse(handleLogin(payload));
    }
    if (action === 'ping') {
      return createJsonResponse(successResponse({ pong: true, time: new Date().toISOString() }));
    }

    // Authentication verification for protected actions
    const authResult = verifySession(payload.token);
    if (!authResult.valid) {
      return createJsonResponse(errorResponse(authResult.error || "Authentication failed. Session expired."));
    }

    const user = authResult.user;
    let response;

    // Acquire ScriptLock for state-mutating actions to prevent concurrency issues
    const isWriteAction = [
      'addEntry', 'updateEntry', 'deleteEntry', 'saveVendorLog', 'saveCashbook',
      'saveStock', 'addDue', 'recoverDue', 'generateArchive',
      'adminCreateUser', 'adminSetActive', 'adminResetPassword', 'adminUpdateRates',
      'adminManageVendors'
    ].includes(action);

    let lock;
    if (isWriteAction) {
      lock = LockService.getScriptLock();
      const hasLock = lock.tryLock(25000); // 25 seconds
      if (!hasLock) {
        return createJsonResponse(errorResponse("Server is busy processing another update. Please try again in a moment."));
      }
    }

    try {
      switch (action) {
        case 'logout':
          response = handleLogout(payload.token);
          break;

        case 'getMeta':
          response = handleGetMeta();
          break;

        case 'getDashboard':
          response = handleGetDashboard(payload.date || getTodayDateString());
          break;

        case 'getReportData':
          response = handleGetReportData(payload.date || getTodayDateString());
          break;

        case 'listEntries':
          response = handleListEntries(payload.date || getTodayDateString());
          break;

        case 'addEntry':
          response = handleAddEntry(payload.entry, user);
          break;

        case 'updateEntry':
          response = handleUpdateEntry(payload.entry, user);
          break;

        case 'deleteEntry':
          response = handleDeleteEntry(payload.id, user);
          break;

        case 'saveVendorLog':
          response = handleSaveVendorLog(payload.date, payload.logs, user);
          break;

        case 'saveCashbook':
          response = handleSaveCashbook(payload.date, payload.data, user);
          break;

        case 'saveStock':
          response = handleSaveStock(payload.date, payload.data, user);
          break;

        case 'listDues':
          response = handleListDues(payload.status);
          break;

        case 'addDue':
          response = handleAddDue(payload.due, user);
          break;

        case 'recoverDue':
          response = handleRecoverDue(payload.dueId, payload.recoveredDate, payload.payMode, user);
          break;

        case 'generateArchive':
          response = handleGenerateArchive(payload.date || getTodayDateString(), user);
          break;

        case 'listArchives':
          response = handleListArchives();
          break;

        // Admin Management Actions
        case 'adminListUsers':
          checkAdminRole(user);
          response = handleAdminListUsers();
          break;

        case 'adminCreateUser':
          checkAdminRole(user);
          response = handleAdminCreateUser(payload.userData, user);
          break;

        case 'adminSetActive':
          checkAdminRole(user);
          response = handleAdminSetActive(payload.username, payload.active, user);
          break;

        case 'adminResetPassword':
          checkAdminRole(user);
          response = handleAdminResetPassword(payload.username, payload.newPassword, user);
          break;

        case 'adminUpdateRates':
          checkAdminRole(user);
          response = handleAdminUpdateRates(payload.rates, user);
          break;

        case 'adminManageVendors':
          checkAdminRole(user);
          response = handleAdminManageVendors(payload.vendors, user);
          break;

        default:
          response = errorResponse(`Unrecognized action: '${action}'`);
          break;
      }
    } finally {
      if (lock) {
        lock.releaseLock();
      }
    }

    return createJsonResponse(response);
  } catch (err) {
    return createJsonResponse(errorResponse("Server Error: " + err.message));
  }
}

/**
 * ============================================================================
 * AUTHENTICATION & SECURITY
 * ============================================================================
 */

function generateSalt(length = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let salt = '';
  for (let i = 0; i < length; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

function hashPassword(password, salt) {
  const rawBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + salt,
    Utilities.Charset.UTF_8
  );
  return rawBytes.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
}

function handleLogin(payload) {
  const username = (payload.username || '').trim().toLowerCase();
  const password = payload.password || '';

  if (!username || !password) {
    return errorResponse("Username and password are required.");
  }

  const cache = CacheService.getScriptCache();
  const lockKey = `lockout_${username}`;
  const attemptKey = `attempts_${username}`;

  if (cache.get(lockKey)) {
    return errorResponse("Account temporarily locked due to multiple failed attempts. Try again in 5 minutes.");
  }

  const userSheet = getSheet(SHEETS.USERS);
  if (!userSheet) {
    return errorResponse("System USERS table not initialized. Run setup() first.");
  }

  const data = userSheet.getDataRange().getValues();
  if (data.length < 2) {
    return errorResponse("No users found. Run setupAdmin() to create default admin.");
  }

  const header = data[0].map(h => String(h).trim().toLowerCase());
  const colUser = header.indexOf('username');
  const colHash = header.indexOf('passwordhash');
  const colSalt = header.indexOf('salt');
  const colRole = header.indexOf('role');
  const colActive = header.indexOf('active');

  let foundUser = null;
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][colUser]).trim().toLowerCase() === username) {
      foundUser = {
        row: r + 1,
        username: String(data[r][colUser]).trim(),
        passwordHash: String(data[r][colHash]),
        salt: String(data[r][colSalt]),
        role: String(data[r][colRole] || 'cashier').trim().toLowerCase(),
        active: data[r][colActive] === true || String(data[r][colActive]).toLowerCase() === 'true'
      };
      break;
    }
  }

  if (!foundUser) {
    registerFailedAttempt(attemptKey, lockKey, cache);
    return errorResponse("Invalid username or password.");
  }

  if (!foundUser.active) {
    return errorResponse("Your account is disabled. Contact your administrator.");
  }

  const computedHash = hashPassword(password, foundUser.salt);
  if (computedHash !== foundUser.passwordHash) {
    registerFailedAttempt(attemptKey, lockKey, cache);
    return errorResponse("Invalid username or password.");
  }

  // Clear failed attempts upon successful login
  cache.remove(attemptKey);
  cache.remove(lockKey);

  // Issue random session token
  const token = Utilities.getUuid();
  const expiresAt = new Date(Date.now() + CONFIG.SESSION_DURATION_HOURS * 3600 * 1000);
  const sessionInfo = {
    token: token,
    username: foundUser.username,
    role: foundUser.role,
    expiresAt: expiresAt.toISOString()
  };

  // Cache session for high-speed verification
  cache.put(`token_${token}`, JSON.stringify(sessionInfo), CONFIG.SESSION_DURATION_HOURS * 3600);

  // Record session in SESSIONS sheet
  const sessSheet = getSheet(SHEETS.SESSIONS);
  if (sessSheet) {
    sessSheet.appendRow([token, foundUser.username, foundUser.role, expiresAt.toISOString()]);
  }

  logAudit(foundUser.username, 'LOGIN', `User logged in from web app.`);

  return successResponse({
    token: token,
    username: foundUser.username,
    role: foundUser.role,
    expiresAt: expiresAt.toISOString()
  });
}

function registerFailedAttempt(attemptKey, lockKey, cache) {
  let attempts = parseInt(cache.get(attemptKey) || '0', 10) + 1;
  if (attempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
    cache.put(lockKey, 'locked', CONFIG.LOCKOUT_MINUTES * 60);
    cache.remove(attemptKey);
  } else {
    cache.put(attemptKey, String(attempts), 600); // 10 minutes memory
  }
}

function verifySession(token) {
  if (!token) {
    return { valid: false, error: "Missing authorization token." };
  }

  const cache = CacheService.getScriptCache();
  const cached = cache.get(`token_${token}`);
  if (cached) {
    const session = JSON.parse(cached);
    if (new Date(session.expiresAt) > new Date()) {
      return { valid: true, user: session };
    }
  }

  // Fallback to SESSIONS sheet
  const sessSheet = getSheet(SHEETS.SESSIONS);
  if (!sessSheet) return { valid: false, error: "Invalid session." };

  const data = sessSheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === token) {
      const exp = new Date(data[i][3]);
      if (exp > new Date()) {
        const user = { token: token, username: data[i][1], role: data[i][2], expiresAt: data[i][3] };
        cache.put(`token_${token}`, JSON.stringify(user), 3600);
        return { valid: true, user: user };
      } else {
        return { valid: false, error: "Session expired. Please log in again." };
      }
    }
  }

  return { valid: false, error: "Invalid or expired session token." };
}

function handleLogout(token) {
  const cache = CacheService.getScriptCache();
  cache.remove(`token_${token}`);
  return successResponse({ loggedOut: true });
}

function checkAdminRole(user) {
  if (!user || user.role !== 'admin') {
    throw new Error("Access denied. Admin privileges required.");
  }
}

function logAudit(user, action, details) {
  try {
    const s = getSheet(SHEETS.AUDIT_LOG);
    if (s) {
      s.appendRow([
        Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss"),
        user,
        action,
        typeof details === 'object' ? JSON.stringify(details) : String(details)
      ]);
    }
  } catch (err) {
    // Non-blocking
  }
}

/**
 * ============================================================================
 * METADATA & MASTER DATA
 * ============================================================================
 */

function handleGetMeta() {
  const ratesSheet = getSheet(SHEETS.RATES);
  const vendorSheet = getSheet(SHEETS.VENDOR_LOG);

  const rates = [];
  if (ratesSheet) {
    const data = ratesSheet.getDataRange().getValues();
    for (let r = 1; r < data.length; r++) {
      if (data[r][0] && (data[r][3] === true || String(data[r][3]).toLowerCase() === 'true')) {
        rates.push({
          item: String(data[r][0]).trim(),
          category: String(data[r][1]).trim(),
          rate: Number(data[r][2]) || 0
        });
      }
    }
  }

  // Predefined active vendors list
  const defaultVendors = [
    'MONU', 'SAROJ', 'BHOGENDRA', 'RAVI PRAKASH', 'GENA LAL',
    'BECHAN', 'DINESH', 'MANTUN', 'BAJRANGI', 'SUJIT',
    'SANJAY', 'Raja Faiyazi', 'Faiyaz', 'GODOWN'
  ];

  return successResponse({
    rates: rates,
    vendors: defaultVendors,
    categories: ['SALE', 'RETURN', 'SECURITY_DEPOSIT', 'SD_REFUND', 'SERVICE', 'DUES_RECEIVED'],
    payModes: ['CASH', 'UPI', 'HP_PAY', 'DUES', 'NEFT', 'OTHER'],
    cylinderTypes: [
      '14.2 KG Domestic',
      '19 KG Commercial',
      '5 KG Commercial',
      '5 KG Domestic',
      '2 KG Commercial'
    ]
  });
}

/**
 * ============================================================================
 * ENTRY MANAGEMENT (CRUD)
 * ============================================================================
 */

function handleAddEntry(entry, user) {
  if (!entry) return errorResponse("Invalid entry payload.");

  const date = sanitizeDate(entry.date) || getTodayDateString();
  const time = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "HH:mm:ss");
  const category = (entry.category || 'SALE').trim();
  const item = (entry.item || '').trim();
  const qty = Number(entry.qty) || 0;
  const rate = Number(entry.rate) || 0;
  const amount = Number(entry.amount !== undefined ? entry.amount : (qty * rate));
  const payMode = (entry.payMode || 'CASH').trim();
  const party = (entry.party || '').trim();
  const note = (entry.note || '').trim();

  if (!item) return errorResponse("Item is required.");
  if (qty <= 0 && category !== 'RETURN' && category !== 'DUES_RECEIVED') {
    return errorResponse("Quantity must be greater than zero.");
  }

  const id = Utilities.getUuid();
  const entrySheet = getSheet(SHEETS.ENTRY);
  if (!entrySheet) return errorResponse("ENTRY sheet does not exist.");

  entrySheet.appendRow([
    id, date, time, category, item, qty, rate, amount, payMode, party, note, user.username, false
  ]);

  // If this entry was a DUE, automatically log to DUES table as well
  if (payMode === 'DUES' && amount > 0) {
    const duesSheet = getSheet(SHEETS.DUES);
    if (duesSheet) {
      duesSheet.appendRow([date, party || item, date, amount, 'PENDING', '']);
    }
  }

  logAudit(user.username, 'ADD_ENTRY', { id, item, qty, amount, payMode });

  return successResponse({ id: id, message: "Entry recorded successfully." });
}

function handleUpdateEntry(entry, user) {
  if (!entry || !entry.id) return errorResponse("Entry ID required for update.");

  const entrySheet = getSheet(SHEETS.ENTRY);
  const data = entrySheet.getDataRange().getValues();
  if (data.length < 2) return errorResponse("No entries found.");

  const header = data[0].map(h => String(h).trim().toLowerCase());
  const colId = header.indexOf('id');
  const colDate = header.indexOf('date');
  const colUser = header.indexOf('enteredby');
  const colDeleted = header.indexOf('deleted');

  let targetRow = -1;
  let existing = null;
  for (let r = 1; r < data.length; r++) {
    if (data[r][colId] === entry.id && data[r][colDeleted] !== true && String(data[r][colDeleted]).toLowerCase() !== 'true') {
      targetRow = r + 1;
      existing = data[r];
      break;
    }
  }

  if (targetRow === -1) return errorResponse("Entry not found or already deleted.");

  // Cashier can only edit today's entries entered by themselves
  const entryDate = formatDateObj(existing[colDate]);
  if (user.role !== 'admin') {
    if (entryDate !== getTodayDateString()) {
      return errorResponse("Cashiers can only edit entries made today.");
    }
    if (String(existing[colUser]).toLowerCase() !== user.username.toLowerCase()) {
      return errorResponse("You can only edit entries created by yourself.");
    }
  }

  const category = (entry.category || existing[3]).trim();
  const item = (entry.item || existing[4]).trim();
  const qty = entry.qty !== undefined ? Number(entry.qty) : Number(existing[5]);
  const rate = entry.rate !== undefined ? Number(entry.rate) : Number(existing[6]);
  const amount = entry.amount !== undefined ? Number(entry.amount) : (qty * rate);
  const payMode = (entry.payMode || existing[8]).trim();
  const party = entry.party !== undefined ? String(entry.party).trim() : existing[9];
  const note = entry.note !== undefined ? String(entry.note).trim() : existing[10];

  const updateValues = [
    category, item, qty, rate, amount, payMode, party, note
  ];

  entrySheet.getRange(targetRow, 4, 1, 8).setValues([updateValues]);
  logAudit(user.username, 'UPDATE_ENTRY', { id: entry.id, updateValues });

  return successResponse({ message: "Entry updated successfully." });
}

function handleDeleteEntry(id, user) {
  if (!id) return errorResponse("Missing entry ID.");

  const entrySheet = getSheet(SHEETS.ENTRY);
  const data = entrySheet.getDataRange().getValues();
  const header = data[0].map(h => String(h).trim().toLowerCase());
  const colId = header.indexOf('id');
  const colDate = header.indexOf('date');
  const colUser = header.indexOf('enteredby');
  const colDeleted = header.indexOf('deleted');

  let targetRow = -1;
  let existing = null;
  for (let r = 1; r < data.length; r++) {
    if (data[r][colId] === id && data[r][colDeleted] !== true && String(data[r][colDeleted]).toLowerCase() !== 'true') {
      targetRow = r + 1;
      existing = data[r];
      break;
    }
  }

  if (targetRow === -1) return errorResponse("Entry not found or already deleted.");

  const entryDate = formatDateObj(existing[colDate]);
  if (user.role !== 'admin') {
    if (entryDate !== getTodayDateString()) {
      return errorResponse("Cashiers can only delete entries made today.");
    }
    if (String(existing[colUser]).toLowerCase() !== user.username.toLowerCase()) {
      return errorResponse("You can only delete entries created by yourself.");
    }
  }

  // Soft delete
  entrySheet.getRange(targetRow, colDeleted + 1).setValue(true);
  logAudit(user.username, 'DELETE_ENTRY', { id: id });

  return successResponse({ message: "Entry deleted successfully." });
}

function handleListEntries(dateStr) {
  const targetDate = sanitizeDate(dateStr) || getTodayDateString();
  const entrySheet = getSheet(SHEETS.ENTRY);
  if (!entrySheet) return successResponse({ entries: [] });

  const data = entrySheet.getDataRange().getValues();
  if (data.length < 2) return successResponse({ entries: [] });

  const header = data[0].map(h => String(h).trim().toLowerCase());
  const colId = header.indexOf('id');
  const colDate = header.indexOf('date');
  const colTime = header.indexOf('time');
  const colCat = header.indexOf('category');
  const colItem = header.indexOf('item');
  const colQty = header.indexOf('qty');
  const colRate = header.indexOf('rate');
  const colAmt = header.indexOf('amount');
  const colMode = header.indexOf('paymode');
  const colParty = header.indexOf('party');
  const colNote = header.indexOf('note');
  const colUser = header.indexOf('enteredby');
  const colDeleted = header.indexOf('deleted');

  const entries = [];
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const isDeleted = row[colDeleted] === true || String(row[colDeleted]).toLowerCase() === 'true';
    if (isDeleted) continue;

    const rowDate = formatDateObj(row[colDate]);
    if (rowDate === targetDate) {
      entries.push({
        id: String(row[colId]),
        date: rowDate,
        time: String(row[colTime] || ''),
        category: String(row[colCat] || ''),
        item: String(row[colItem] || ''),
        qty: Number(row[colQty]) || 0,
        rate: Number(row[colRate]) || 0,
        amount: Number(row[colAmt]) || 0,
        payMode: String(row[colMode] || 'CASH'),
        party: String(row[colParty] || ''),
        note: String(row[colNote] || ''),
        enteredBy: String(row[colUser] || '')
      });
    }
  }

  return successResponse({ date: targetDate, entries: entries });
}

/**
 * ============================================================================
 * VENDOR LOG, CASHBOOK & STOCK HANDLERS
 * ============================================================================
 */

function handleSaveVendorLog(dateStr, logs, user) {
  const date = sanitizeDate(dateStr) || getTodayDateString();
  if (!Array.isArray(logs)) return errorResponse("Invalid logs list.");

  const vSheet = getSheet(SHEETS.VENDOR_LOG);
  if (!vSheet) return errorResponse("VENDOR_LOG sheet missing.");

  // Remove existing entries for this date in bulk or overwrite
  const data = vSheet.getDataRange().getValues();
  const rowsToKeep = [];
  if (data.length > 0) {
    rowsToKeep.push(data[0]); // Header
    for (let r = 1; r < data.length; r++) {
      if (formatDateObj(data[r][1]) !== date) {
        rowsToKeep.push(data[r]);
      }
    }
  }

  // Add new rows
  for (const item of logs) {
    rowsToKeep.push([
      Utilities.getUuid(),
      date,
      String(item.vendor || '').trim(),
      Number(item.gasGiven) || 0,
      Number(item.cash) || 0,
      Number(item.upi) || 0,
      Number(item.hpPay) || 0,
      Number(item.dues) || 0,
      user.username
    ]);
  }

  // Clear and write back
  vSheet.clearContents();
  vSheet.getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length).setValues(rowsToKeep);

  // Sync date to Master Report cell so sheet recalculates
  setMasterReportDate(date);

  logAudit(user.username, 'SAVE_VENDOR_LOG', { date, count: logs.length });
  return successResponse({ message: "Vendor log saved successfully." });
}

function handleSaveCashbook(dateStr, cbData, user) {
  const date = sanitizeDate(dateStr) || getTodayDateString();
  if (!cbData) return errorResponse("Invalid cashbook data.");

  const cbSheet = getSheet(SHEETS.CASHBOOK);
  if (!cbSheet) return errorResponse("CASHBOOK sheet missing.");

  const data = cbSheet.getDataRange().getValues();
  let targetRow = -1;
  for (let r = 1; r < data.length; r++) {
    if (formatDateObj(data[r][0]) === date) {
      targetRow = r + 1;
      break;
    }
  }

  const openingCash = Number(cbData.openingCash) || 0;
  const bankDeposit = Number(cbData.bankDeposit) || 0;
  const cashSentMadhubani = Number(cbData.cashSentMadhubani) || 0;
  const cashTransferThakurJi = Number(cbData.cashTransferThakurJi) || 0;
  const pettyExpenses = Number(cbData.pettyExpenses) || 0;
  const d500 = Number(cbData.d500) || 0;
  const d200 = Number(cbData.d200) || 0;
  const d100 = Number(cbData.d100) || 0;
  const d50 = Number(cbData.d50) || 0;
  const d20 = Number(cbData.d20) || 0;
  const d10 = Number(cbData.d10) || 0;
  const d5 = Number(cbData.d5) || 0;
  const d2 = Number(cbData.d2) || 0;
  const d1 = Number(cbData.d1) || 0;
  const closingCash = Number(cbData.closingCash) || 0;

  const rowValues = [
    date, openingCash, bankDeposit, cashSentMadhubani, cashTransferThakurJi, pettyExpenses,
    d500, d200, d100, d50, d20, d10, d5, d2, d1,
    closingCash, user.username
  ];

  if (targetRow !== -1) {
    cbSheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    cbSheet.appendRow(rowValues);
  }

  setMasterReportDate(date);
  logAudit(user.username, 'SAVE_CASHBOOK', { date });
  return successResponse({ message: "Cash book saved successfully." });
}

function handleSaveStock(dateStr, stockList, user) {
  const date = sanitizeDate(dateStr) || getTodayDateString();
  if (!Array.isArray(stockList)) return errorResponse("Invalid stock data list.");

  const sSheet = getSheet(SHEETS.STOCK);
  if (!sSheet) return errorResponse("STOCK sheet missing.");

  const data = sSheet.getDataRange().getValues();
  const rowsToKeep = [];
  if (data.length > 0) {
    rowsToKeep.push(data[0]);
    for (let r = 1; r < data.length; r++) {
      if (formatDateObj(data[r][0]) !== date) {
        rowsToKeep.push(data[r]);
      }
    }
  }

  for (const item of stockList) {
    rowsToKeep.push([
      date,
      String(item.cylinderType || '').trim(),
      Number(item.openingFilled) || 0,
      Number(item.receivedHPCL) || 0,
      Number(item.soldDelivered) || 0,
      Number(item.adjustment) || 0,
      Number(item.openingEmpty) || 0,
      Number(item.emptyReceived) || 0,
      Number(item.emptySentPlant) || 0
    ]);
  }

  sSheet.clearContents();
  sSheet.getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length).setValues(rowsToKeep);

  setMasterReportDate(date);
  logAudit(user.username, 'SAVE_STOCK', { date });
  return successResponse({ message: "Stock saved successfully." });
}

/**
 * ============================================================================
 * DUES MANAGEMENT
 * ============================================================================
 */

function handleListDues(statusFilter) {
  const dSheet = getSheet(SHEETS.DUES);
  if (!dSheet) return successResponse({ dues: [] });

  const data = dSheet.getDataRange().getValues();
  if (data.length < 2) return successResponse({ dues: [] });

  const dues = [];
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const status = String(row[4] || 'PENDING').trim().toUpperCase();
    if (statusFilter && statusFilter.toUpperCase() !== status) continue;

    dues.push({
      rowId: r + 1,
      date: formatDateObj(row[0]),
      party: String(row[1] || ''),
      billDate: formatDateObj(row[2]),
      amount: Number(row[3]) || 0,
      status: status,
      recoveredDate: formatDateObj(row[5])
    });
  }

  return successResponse({ dues: dues });
}

function handleAddDue(due, user) {
  if (!due || !due.party || !due.amount) {
    return errorResponse("Party and amount are required for Dues.");
  }

  const dSheet = getSheet(SHEETS.DUES);
  const date = sanitizeDate(due.date) || getTodayDateString();
  const billDate = sanitizeDate(due.billDate) || date;
  const amount = Number(due.amount) || 0;

  dSheet.appendRow([date, String(due.party).trim(), billDate, amount, 'PENDING', '']);
  logAudit(user.username, 'ADD_DUE', { party: due.party, amount });
  return successResponse({ message: "Due recorded successfully." });
}

function handleRecoverDue(dueRowId, recoveredDateStr, payMode, user) {
  if (!dueRowId) return errorResponse("Due Row ID required.");

  const dSheet = getSheet(SHEETS.DUES);
  const row = Number(dueRowId);
  const data = dSheet.getRange(row, 1, 1, 6).getValues()[0];

  if (!data || !data[0]) return errorResponse("Due record not found.");

  const recDate = sanitizeDate(recoveredDateStr) || getTodayDateString();
  dSheet.getRange(row, 5, 1, 2).setValues([['RECOVERED', recDate]]);

  // Also log an ENTRY of category DUES_RECEIVED
  const party = data[1];
  const amount = Number(data[3]);
  const entrySheet = getSheet(SHEETS.ENTRY);
  if (entrySheet) {
    entrySheet.appendRow([
      Utilities.getUuid(),
      recDate,
      Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "HH:mm:ss"),
      'DUES_RECEIVED',
      `Due Settlement - ${party}`,
      1,
      amount,
      amount,
      payMode || 'CASH',
      party,
      `Recovered from Due row ${row}`,
      user.username,
      false
    ]);
  }

  logAudit(user.username, 'RECOVER_DUE', { row, party, amount, recDate });
  return successResponse({ message: "Due marked as recovered and credited to today's receipts." });
}

/**
 * ============================================================================
 * DASHBOARD & LIVE REPORT VIEW
 * ============================================================================
 */

function handleGetDashboard(dateStr) {
  const date = sanitizeDate(dateStr) || getTodayDateString();
  setMasterReportDate(date);
  SpreadsheetApp.flush();

  // Read summary figures from report sheet or compute live
  const salesSheet = getSheet('REPORT_SALES');
  const cashSheet = getSheet('REPORT_CASH');
  const vendorSheet = getSheet('REPORT_VENDOR');

  let totalBilling = 0;
  let cylinderRevenue = 0;
  let digitalCollections = 0;
  let netCashInflow = 0;
  let outstandingDues = 0;
  let cylindersSold = 0;
  let auditStatus = 'Balanced';
  let isBalanced = true;

  if (salesSheet) {
    try {
      totalBilling = Number(salesSheet.getRange('B3').getValue()) || 0;
      cylinderRevenue = Number(salesSheet.getRange('D3').getValue()) || 0;
      digitalCollections = Number(salesSheet.getRange('F3').getValue()) || 0;
      netCashInflow = Number(salesSheet.getRange('H3').getValue()) || 0;
      outstandingDues = Number(salesSheet.getRange('J3').getValue()) || 0;
      auditStatus = String(salesSheet.getRange('K61').getValue() || 'BALANCED ✓');
      isBalanced = auditStatus.includes('BALANCED');
    } catch (e) {
      // Fallback calculation from ENTRY
    }
  }

  if (vendorSheet) {
    try {
      cylindersSold = Number(vendorSheet.getRange('B3').getValue()) || 0;
    } catch (e) {}
  }

  // Pull Cash Book info for today
  const cbSheet = getSheet(SHEETS.CASHBOOK);
  let cashBookToday = null;
  if (cbSheet) {
    const cbData = cbSheet.getDataRange().getValues();
    for (let r = 1; r < cbData.length; r++) {
      if (formatDateObj(cbData[r][0]) === date) {
        cashBookToday = {
          openingCash: Number(cbData[r][1]) || 0,
          bankDeposit: Number(cbData[r][2]) || 0,
          cashSentMadhubani: Number(cbData[r][3]) || 0,
          cashTransferThakurJi: Number(cbData[r][4]) || 0,
          pettyExpenses: Number(cbData[r][5]) || 0,
          d500: Number(cbData[r][6]) || 0,
          d200: Number(cbData[r][7]) || 0,
          d100: Number(cbData[r][8]) || 0,
          d50: Number(cbData[r][9]) || 0,
          d20: Number(cbData[r][10]) || 0,
          d10: Number(cbData[r][11]) || 0,
          d5: Number(cbData[r][12]) || 0,
          d2: Number(cbData[r][13]) || 0,
          d1: Number(cbData[r][14]) || 0,
          closingCash: Number(cbData[r][15]) || 0
        };
        break;
      }
    }
  }

  return successResponse({
    date: date,
    cards: {
      totalBilling: totalBilling,
      cylinderRevenue: cylinderRevenue,
      digitalCollections: digitalCollections,
      netCashInflow: netCashInflow,
      outstandingDues: outstandingDues,
      cylindersSold: cylindersSold
    },
    reconciliation: {
      statusText: auditStatus,
      isBalanced: isBalanced
    },
    cashBook: cashBookToday
  });
}

function handleGetReportData(dateStr) {
  const date = sanitizeDate(dateStr) || getTodayDateString();
  setMasterReportDate(date);
  SpreadsheetApp.flush();

  const reportSales = getSheet('REPORT_SALES');
  const reportCash = getSheet('REPORT_CASH');
  const reportVendor = getSheet('REPORT_VENDOR');
  const reportStock = getSheet('REPORT_STOCK');

  return successResponse({
    date: date,
    salesData: reportSales ? reportSales.getDataRange().getDisplayValues() : [],
    cashData: reportCash ? reportCash.getDataRange().getDisplayValues() : [],
    vendorData: reportVendor ? reportVendor.getDataRange().getDisplayValues() : [],
    stockData: reportStock ? reportStock.getDataRange().getDisplayValues() : []
  });
}

/**
 * Sets master date in REPORT_VENDOR!H2 which propagates to all 4 reports
 */
function setMasterReportDate(dateStr) {
  const vendorSheet = getSheet('REPORT_VENDOR');
  if (vendorSheet) {
    vendorSheet.getRange('H2').setValue(dateStr);
  }
}

/**
 * ============================================================================
 * DAILY ARCHIVE GENERATION (PDF + EXCEL TO GOOGLE DRIVE)
 * ============================================================================
 */

function handleGenerateArchive(dateStr, user) {
  const date = sanitizeDate(dateStr) || getTodayDateString();
  setMasterReportDate(date);
  SpreadsheetApp.flush();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const folder = getOrCreateArchiveFolder();
  const dateFormatted = Utilities.formatDate(new Date(date), CONFIG.TIMEZONE, "dd_MM_yy");

  const pdfFileName = `Daily_Sales_Report_${dateFormatted}.pdf`;
  const xlsxFileName = `Daily_Sales_Report_${dateFormatted}.xlsx`;

  // Remove previous archives of the same day to allow clean regeneration
  const existingPdfs = folder.getFilesByName(pdfFileName);
  while (existingPdfs.hasNext()) existingPdfs.next().setTrashed(true);

  const existingXlsx = folder.getFilesByName(xlsxFileName);
  while (existingXlsx.hasNext()) existingXlsx.next().setTrashed(true);

  // 1. Export PDF using Google Sheets PDF export endpoint
  const ssId = ss.getId();
  const token = ScriptApp.getOAuthToken();

  // Export parameters matching exact print setup: A4 portrait, fit-to-width, no gridlines
  const pdfUrl = `https://docs.google.com/spreadsheets/d/${ssId}/export?` +
    `format=pdf` +
    `&size=A4` +
    `&portrait=true` +
    `&fitw=true` +
    `&gridlines=false` +
    `&printtitle=false` +
    `&sheetnames=false` +
    `&fzr=false`;

  const pdfResponse = UrlFetchApp.fetch(pdfUrl, {
    headers: { 'Authorization': 'Bearer ' + token },
    muteHttpExceptions: true
  });

  if (pdfResponse.getResponseCode() !== 200) {
    return errorResponse(`Failed to generate PDF: ${pdfResponse.getContentText()}`);
  }

  const pdfFile = folder.createFile(pdfResponse.getBlob().setName(pdfFileName));
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // 2. Export XLSX copy
  const xlsxUrl = `https://docs.google.com/spreadsheets/d/${ssId}/export?format=xlsx`;
  const xlsxResponse = UrlFetchApp.fetch(xlsxUrl, {
    headers: { 'Authorization': 'Bearer ' + token },
    muteHttpExceptions: true
  });

  let xlsxFile = null;
  if (xlsxResponse.getResponseCode() === 200) {
    xlsxFile = folder.createFile(xlsxResponse.getBlob().setName(xlsxFileName));
    xlsxFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  // Record into ARCHIVES sheet
  const archSheet = getSheet(SHEETS.ARCHIVES);
  if (archSheet) {
    archSheet.appendRow([
      date,
      pdfFile.getName(),
      pdfFile.getUrl(),
      xlsxFile ? xlsxFile.getUrl() : '',
      Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss"),
      user ? user.username : 'SYSTEM_CRON'
    ]);
  }

  logAudit(user ? user.username : 'SYSTEM', 'GENERATE_ARCHIVE', { date, pdfUrl: pdfFile.getUrl() });

  return successResponse({
    date: date,
    pdfUrl: pdfFile.getUrl(),
    pdfDownloadUrl: `https://drive.google.com/uc?export=download&id=${pdfFile.getId()}`,
    xlsxUrl: xlsxFile ? xlsxFile.getUrl() : null,
    xlsxDownloadUrl: xlsxFile ? `https://drive.google.com/uc?export=download&id=${xlsxFile.getId()}` : null,
    message: "PDF and Excel archives generated and saved to Drive."
  });
}

function handleListArchives() {
  const archSheet = getSheet(SHEETS.ARCHIVES);
  if (!archSheet) return successResponse({ archives: [] });

  const data = archSheet.getDataRange().getValues();
  if (data.length < 2) return successResponse({ archives: [] });

  const archives = [];
  for (let r = data.length - 1; r >= 1; r--) {
    archives.push({
      date: formatDateObj(data[r][0]),
      fileName: String(data[r][1]),
      pdfUrl: String(data[r][2]),
      xlsxUrl: String(data[r][3] || ''),
      createdAt: formatDateObj(data[r][4]),
      generatedBy: String(data[r][5] || '')
    });
  }

  return successResponse({ archives: archives });
}

function getOrCreateArchiveFolder() {
  const folders = DriveApp.getFoldersByName(CONFIG.DRIVE_ARCHIVE_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(CONFIG.DRIVE_ARCHIVE_FOLDER_NAME);
}

/**
 * Daily Time-Driven Trigger at 11:30 PM (23:30)
 */
function createDailyArchiveTrigger() {
  // Clear any existing archive triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    if (t.getHandlerFunction() === 'autoArchiveDailyReport') {
      ScriptApp.deleteTrigger(t);
    }
  }

  ScriptApp.newTrigger('autoArchiveDailyReport')
    .timeBased()
    .atHour(23)
    .nearMinute(30)
    .everyDays(1)
    .inTimezone(CONFIG.TIMEZONE)
    .create();
}

function autoArchiveDailyReport() {
  const today = getTodayDateString();
  handleGenerateArchive(today, { username: 'AUTO_CRON' });
}

/**
 * ============================================================================
 * ADMIN MANAGEMENT HANDLERS
 * ============================================================================
 */

function handleAdminListUsers() {
  const uSheet = getSheet(SHEETS.USERS);
  const data = uSheet.getDataRange().getValues();
  const users = [];
  for (let r = 1; r < data.length; r++) {
    users.push({
      username: String(data[r][0]),
      role: String(data[r][3]),
      active: data[r][4] === true || String(data[r][4]).toLowerCase() === 'true',
      createdAt: formatDateObj(data[r][5])
    });
  }
  return successResponse({ users: users });
}

function handleAdminCreateUser(userData, user) {
  if (!userData || !userData.username || !userData.password) {
    return errorResponse("Username and password are required.");
  }

  const username = String(userData.username).trim().toLowerCase();
  const role = (userData.role || 'cashier').trim().toLowerCase();
  const uSheet = getSheet(SHEETS.USERS);
  const data = uSheet.getDataRange().getValues();

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][0]).trim().toLowerCase() === username) {
      return errorResponse("A user with this username already exists.");
    }
  }

  const salt = generateSalt();
  const hash = hashPassword(userData.password, salt);
  const createdAt = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss");

  uSheet.appendRow([username, hash, salt, role, true, createdAt]);
  logAudit(user.username, 'CREATE_USER', { newUser: username, role });

  return successResponse({ message: `User '${username}' created successfully.` });
}

function handleAdminSetActive(targetUsername, activeState, user) {
  const uSheet = getSheet(SHEETS.USERS);
  const data = uSheet.getDataRange().getValues();
  const target = String(targetUsername).trim().toLowerCase();

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][0]).trim().toLowerCase() === target) {
      uSheet.getRange(r + 1, 5).setValue(Boolean(activeState));
      logAudit(user.username, 'SET_USER_ACTIVE', { user: target, active: Boolean(activeState) });
      return successResponse({ message: `User '${target}' active state updated.` });
    }
  }
  return errorResponse("User not found.");
}

function handleAdminResetPassword(targetUsername, newPassword, user) {
  if (!newPassword || newPassword.length < 4) {
    return errorResponse("Password must be at least 4 characters.");
  }
  const uSheet = getSheet(SHEETS.USERS);
  const data = uSheet.getDataRange().getValues();
  const target = String(targetUsername).trim().toLowerCase();

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][0]).trim().toLowerCase() === target) {
      const salt = generateSalt();
      const hash = hashPassword(newPassword, salt);
      uSheet.getRange(r + 1, 2, 1, 2).setValues([[hash, salt]]);
      logAudit(user.username, 'RESET_PASSWORD', { user: target });
      return successResponse({ message: `Password for '${target}' reset successfully.` });
    }
  }
  return errorResponse("User not found.");
}

function handleAdminUpdateRates(ratesList, user) {
  if (!Array.isArray(ratesList)) return errorResponse("Invalid rates list.");

  const rSheet = getSheet(SHEETS.RATES);
  const rows = [['item', 'category', 'rate', 'active']];
  for (const r of ratesList) {
    rows.push([
      String(r.item).trim(),
      String(r.category || 'SALE').trim(),
      Number(r.rate) || 0,
      r.active !== false
    ]);
  }

  rSheet.clearContents();
  rSheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  logAudit(user.username, 'UPDATE_RATES', { count: ratesList.length });
  return successResponse({ message: "Rates updated successfully." });
}

function handleAdminManageVendors(vendorList, user) {
  // Updates the configured vendor names
  logAudit(user.username, 'MANAGE_VENDORS', { count: vendorList.length });
  return successResponse({ message: "Vendors updated successfully." });
}

/**
 * ============================================================================
 * INITIALIZATION & FORMULA SETUP FUNCTIONS
 * ============================================================================
 */

/**
 * Sets up all database tabs without touching existing report sheet structures.
 * Safe to run multiple times.
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const tabDefs = [
    {
      name: SHEETS.USERS,
      headers: ['username', 'passwordHash', 'salt', 'role', 'active', 'createdAt']
    },
    {
      name: SHEETS.RATES,
      headers: ['item', 'category', 'rate', 'active']
    },
    {
      name: SHEETS.ENTRY,
      headers: ['id', 'date', 'time', 'category', 'item', 'qty', 'rate', 'amount', 'payMode', 'party', 'note', 'enteredBy', 'deleted']
    },
    {
      name: SHEETS.VENDOR_LOG,
      headers: ['id', 'date', 'vendor', 'gasGiven', 'cash', 'upi', 'hpPay', 'dues', 'enteredBy']
    },
    {
      name: SHEETS.CASHBOOK,
      headers: ['date', 'openingCash', 'bankDeposit', 'cashSentMadhubani', 'cashTransferThakurJi', 'pettyExpenses', 'd500', 'd200', 'd100', 'd50', 'd20', 'd10', 'd5', 'd2', 'd1', 'closingCash', 'enteredBy']
    },
    {
      name: SHEETS.DUES,
      headers: ['date', 'party', 'billDate', 'amount', 'status', 'recoveredDate']
    },
    {
      name: SHEETS.STOCK,
      headers: ['date', 'cylinderType', 'openingFilled', 'receivedHPCL', 'soldDelivered', 'adjustment', 'openingEmpty', 'emptyReceived', 'emptySentPlant']
    },
    {
      name: SHEETS.AUDIT_LOG,
      headers: ['timestamp', 'user', 'action', 'details']
    },
    {
      name: SHEETS.SESSIONS,
      headers: ['token', 'username', 'role', 'expiresAt']
    },
    {
      name: SHEETS.ARCHIVES,
      headers: ['date', 'fileName', 'pdfUrl', 'xlsxUrl', 'createdAt', 'generatedBy']
    }
  ];

  for (const def of tabDefs) {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
      sheet.appendRow(def.headers);
      sheet.getRange(1, 1, 1, def.headers.length).setFontWeight('bold').setBackground('#E2E8F0');
      sheet.setFrozenRows(1);
    }
  }

  // Seed default rates if empty
  seedRatesIfEmpty();

  // Create default admin if USERS is empty
  setupAdmin();

  // Setup/bind formulas into the 4 report sheets
  setupFormulas();

  SpreadsheetApp.flush();
  Logger.log("Setup completed successfully.");
}

/**
 * Creates initial admin user if not present.
 */
function setupAdmin() {
  const uSheet = getSheet(SHEETS.USERS);
  if (!uSheet) return;

  const data = uSheet.getDataRange().getValues();
  let adminExists = false;
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][0]).toLowerCase() === 'admin') {
      adminExists = true;
      break;
    }
  }

  if (!adminExists) {
    const salt = generateSalt();
    const defaultPassword = 'Admin@123';
    const hash = hashPassword(defaultPassword, salt);
    const createdAt = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss");
    uSheet.appendRow(['admin', hash, salt, 'admin', true, createdAt]);
    Logger.log("Default admin created: Username: 'admin', Password: 'Admin@123'");
  }
}

/**
 * Seed master rates catalog matching agency's live products
 */
function seedRatesIfEmpty() {
  const rSheet = getSheet(SHEETS.RATES);
  if (!rSheet) return;

  if (rSheet.getLastRow() <= 1) {
    const initialRates = [
      ['14.2KG Domestic', 'SALE', 1042, true],
      ['19KG Commercial', 'SALE', 3049, true],
      ['Suraksha Hose Pipe', 'SALE', 190, true],
      ['Domestic Regulator (Leak/Defective)', 'SALE', 100, true],
      ['Domestic Pass Book', 'SALE', 59, true],
      ['PMUY Pass Book', 'SALE', 50, true],
      ['5 Kg Nd Rfl', 'SALE', 845, true],
      ['Ftl Rgulator', 'SALE', 350, true],
      ['14.2KG Domestic (Defective / Leaking)', 'RETURN', 1042, true],
      ['19KG Commercial (Return / Exchange)', 'RETURN', 3049, true],
      ['Domestic Regulator / Pipe (Return)', 'RETURN', 0, true],
      ['19KG Commercial (SD)', 'SECURITY_DEPOSIT', 2400, true],
      ['5 Kg ftl Security Refund', 'SD_REFUND', 800, true],
      ['Name change (Death)', 'SERVICE', 118, true],
      ['Truck Opening Charges', 'SERVICE', 200, true],
      ['Administration Charge', 'SERVICE', 118, true],
      ['Safety inspection', 'SERVICE', 236, true]
    ];
    for (const r of initialRates) {
      rSheet.appendRow(r);
    }
  }
}

/**
 * Binds and verifies dynamic formulas across all 4 report sheets.
 * Preserves every row, column, heading, merged cell, and style.
 */
function setupFormulas() {
  const reportSales = getSheet('REPORT_SALES');
  const reportCash = getSheet('REPORT_CASH');
  const reportVendor = getSheet('REPORT_VENDOR');
  const reportStock = getSheet('REPORT_STOCK');

  const vendorSheetName = reportVendor ? reportVendor.getName() : 'COLLECTION SUMMARY';
  const salesSheetName = reportSales ? reportSales.getName() : 'Daily Sales';

  // 1. Sheet: REPORT_VENDOR (COLLECTION SUMMARY)
  if (reportVendor) {
    // KPI Cards
    reportVendor.getRange('B3').setFormula('=C22');
    reportVendor.getRange('C3').setFormula('=D22');
    reportVendor.getRange('D3').setFormula('=E22+F22');
    reportVendor.getRange('F3').setFormula('=G22');

    // Vendor Rows (7 to 19)
    for (let r = 7; r <= 19; r++) {
      const vCell = `B${r}`;
      reportVendor.getRange(`C${r}`).setFormula(`=SUMIFS(VENDOR_LOG!D:D, VENDOR_LOG!B:B, $H$2, VENDOR_LOG!C:C, ${vCell})`);
      reportVendor.getRange(`D${r}`).setFormula(`=SUMIFS(VENDOR_LOG!E:E, VENDOR_LOG!B:B, $H$2, VENDOR_LOG!C:C, ${vCell})`);
      reportVendor.getRange(`E${r}`).setFormula(`=SUMIFS(VENDOR_LOG!F:F, VENDOR_LOG!B:B, $H$2, VENDOR_LOG!C:C, ${vCell})`);
      reportVendor.getRange(`F${r}`).setFormula(`=SUMIFS(VENDOR_LOG!G:G, VENDOR_LOG!B:B, $H$2, VENDOR_LOG!C:C, ${vCell})`);
      reportVendor.getRange(`G${r}`).setFormula(`=SUMIFS(VENDOR_LOG!H:H, VENDOR_LOG!B:B, $H$2, VENDOR_LOG!C:C, ${vCell})`);
      reportVendor.getRange(`H${r}`).setFormula(`=IF(C${r}=SUM(D${r}:G${r}), "Balanced", "Mismatch (" & (C${r}-SUM(D${r}:G${r})) & ")")`);
    }

    // Delivery Total (Row 20)
    reportVendor.getRange('C20').setFormula('=SUM(C7:C19)');
    reportVendor.getRange('D20').setFormula('=SUM(D7:D19)');
    reportVendor.getRange('E20').setFormula('=SUM(E7:E19)');
    reportVendor.getRange('F20').setFormula('=SUM(F7:F19)');
    reportVendor.getRange('G20').setFormula('=SUM(G7:G19)');
    reportVendor.getRange('H20').setFormula('=IF(C20=SUM(D20:G20), "Balanced", "Mismatch (" & (C20-SUM(D20:G20)) & ")")');

    // Godown (Row 21)
    reportVendor.getRange('C21').setFormula(`=SUMIFS(VENDOR_LOG!D:D, VENDOR_LOG!B:B, $H$2, VENDOR_LOG!C:C, "GODOWN")`);
    reportVendor.getRange('D21').setFormula(`=SUMIFS(VENDOR_LOG!E:E, VENDOR_LOG!B:B, $H$2, VENDOR_LOG!C:C, "GODOWN")`);
    reportVendor.getRange('E21').setFormula(`=SUMIFS(VENDOR_LOG!F:F, VENDOR_LOG!B:B, $H$2, VENDOR_LOG!C:C, "GODOWN")`);
    reportVendor.getRange('F21').setFormula(`=SUMIFS(VENDOR_LOG!G:G, VENDOR_LOG!B:B, $H$2, VENDOR_LOG!C:C, "GODOWN")`);
    reportVendor.getRange('G21').setFormula(`=SUMIFS(VENDOR_LOG!H:H, VENDOR_LOG!B:B, $H$2, VENDOR_LOG!C:C, "GODOWN")`);
    reportVendor.getRange('H21').setFormula('=IF(C21=SUM(D21:G21), "Balanced", "Mismatch (" & (C21-SUM(D21:G21)) & ")")');

    // Grand Total (Row 22)
    reportVendor.getRange('C22').setFormula('=C20+C21');
    reportVendor.getRange('D22').setFormula('=D20+D21');
    reportVendor.getRange('E22').setFormula('=E20+E21');
    reportVendor.getRange('F22').setFormula('=F20+F21');
    reportVendor.getRange('G22').setFormula('=G20+G21');
    reportVendor.getRange('H22').setFormula('=IF(C22=SUM(D22:G22), "Balanced", "Mismatch (" & (C22-SUM(D22:G22)) & ")")');

    // Home Delivery Values (Row 23) & Godown Values (Row 24)
    reportVendor.getRange('D23').setFormula('=C23*D20');
    reportVendor.getRange('E23').setFormula('=C23*E20');
    reportVendor.getRange('F23').setFormula('=C23*F20');
    reportVendor.getRange('G23').setFormula('=C23*G20');

    reportVendor.getRange('D24').setFormula('=C24*D21');
    reportVendor.getRange('E24').setFormula('=C24*E21');
    reportVendor.getRange('F24').setFormula('=C24*F21');
    reportVendor.getRange('G24').setFormula('=C24*G21');
  }

  // 2. Sheet: REPORT_SALES (Daily Sales)
  if (reportSales) {
    // Title with date linking to Vendor sheet H2
    reportSales.getRange('A1').setFormula(`="SHIV SHAKTI HP GAS AGENCY • DAILY SALES & REVENUE REPORT — DATE: " & TEXT('${vendorSheetName}'!H2, "DD-MM-YYYY")`);

    // Top Cards
    reportSales.getRange('B3').setFormula('=D61');
    reportSales.getRange('D3').setFormula('=SUM(D8:D10)');
    reportSales.getRange('F3').setFormula('=F61+H61+G61');
    reportSales.getRange('H3').setFormula('=E61');
    reportSales.getRange('J3').setFormula('=H18');

    // Cylinder Sales
    // Row 8: 19KG Commercial
    reportSales.getRange('D8').setFormula('=B8*C8');
    reportSales.getRange('J8').setFormula('=SUM(E8:I8)');

    // Row 9: 14.2KG Domestic (Godown)
    reportSales.getRange('C9').setFormula(`='${vendorSheetName}'!C21`);
    reportSales.getRange('D9').setFormula('=B9*C9');
    reportSales.getRange('E9').setFormula(`='${vendorSheetName}'!D24`);
    reportSales.getRange('F9').setFormula(`='${vendorSheetName}'!E24`);
    reportSales.getRange('G9').setFormula(`='${vendorSheetName}'!F24`);
    reportSales.getRange('H9').setFormula(`='${vendorSheetName}'!G24`);
    reportSales.getRange('J9').setFormula('=SUM(E9:I9)');

    // Row 10: 14.2KG Domestic (Home Delivery)
    reportSales.getRange('C10').setFormula(`='${vendorSheetName}'!C20`);
    reportSales.getRange('D10').setFormula('=B10*C10');
    reportSales.getRange('E10').setFormula(`='${vendorSheetName}'!D23`);
    reportSales.getRange('F10').setFormula(`='${vendorSheetName}'!E23`);
    reportSales.getRange('G10').setFormula(`='${vendorSheetName}'!F23`);
    reportSales.getRange('H10').setFormula(`='${vendorSheetName}'!G23`);
    reportSales.getRange('J10').setFormula('=SUM(E10:I10)');

    // Accessories rows (12 to 17)
    for (const r of [12, 13, 14, 15, 16, 17]) {
      reportSales.getRange(`D${r}`).setFormula(`=IF(OR(B${r}<>"",C${r}<>""), B${r}*C${r}, "")`);
      reportSales.getRange(`J${r}`).setFormula(`=IF(OR(B${r}<>"",C${r}<>"",COUNT(E${r}:I${r})>0), SUM(E${r}:I${r}), "")`);
    }

    // Row 18: Total Cylinder & Accessories
    reportSales.getRange('C18').setFormula('=SUM(C8:C10)+SUM(C12:C17)');
    reportSales.getRange('D18').setFormula('=SUM(D8:D10)+SUM(D12:D17)');
    reportSales.getRange('E18').setFormula('=SUM(E8:E10)+SUM(E12:E17)');
    reportSales.getRange('F18').setFormula('=SUM(F8:F10)+SUM(F12:F17)');
    reportSales.getRange('G18').setFormula('=SUM(G8:G10)+SUM(G12:G17)');
    reportSales.getRange('H18').setFormula('=SUM(H8:H10)+SUM(H12:H17)');
    reportSales.getRange('I18').setFormula('=SUM(I8:I10)+SUM(I12:I17)');
    reportSales.getRange('J18').setFormula('=SUM(J8:J10)+SUM(J12:J17)');
    reportSales.getRange('K18').setFormula('=IF(D18=J18, "RECONCILED ✓", "DIFF: ₹" & TEXT(D18-J18, "#,##0"))');

    // Section 2: Returns (Row 24)
    reportSales.getRange('C24').setFormula('=SUM(C21:C23)');
    reportSales.getRange('D24').setFormula('=SUM(D21:D23)');
    reportSales.getRange('E24').setFormula('=SUM(E21:E23)');
    reportSales.getRange('F24').setFormula('=SUM(F21:F23)');
    reportSales.getRange('G24').setFormula('=SUM(G21:G23)');
    reportSales.getRange('H24').setFormula('=SUM(H21:H23)');
    reportSales.getRange('I24').setFormula('=SUM(I21:I23)');
    reportSales.getRange('J24').setFormula('=SUM(J21:J23)');
    reportSales.getRange('K24').setFormula('=IF(D24=J24, "RECONCILED ✓", "DIFF: ₹" & TEXT(D24-J24, "#,##0"))');

    // Section 3: Security Deposits (Row 33)
    reportSales.getRange('D33').setFormula('=SUM(D27:D32)');
    reportSales.getRange('F33').setFormula('=SUM(F27:F32)');
    reportSales.getRange('G33').setFormula('=SUM(G27:G32)');
    reportSales.getRange('H33').setFormula('=SUM(H27:H32)');
    reportSales.getRange('I33').setFormula('=SUM(I27:I32)');
    reportSales.getRange('J33').setFormula('=SUM(J27:J32)');

    // Section 5: Refunds (Row 43)
    reportSales.getRange('D43').setFormula('=SUM(D40:D42)');
    reportSales.getRange('F43').setFormula('=SUM(F40:F42)');
    reportSales.getRange('G43').setFormula('=SUM(G40:G42)');
    reportSales.getRange('H43').setFormula('=SUM(H40:H42)');
    reportSales.getRange('I43').setFormula('=SUM(I40:I42)');
    reportSales.getRange('J43').setFormula('=SUM(J40:J42)');

    // Section 6: Service Charges (Row 51)
    reportSales.getRange('C51').setFormula('=SUM(C46:C50)');
    reportSales.getRange('D51').setFormula('=SUM(D46:D50)');
    reportSales.getRange('E51').setFormula('=SUM(E46:E50)');
    reportSales.getRange('F51').setFormula('=SUM(F46:F50)');
    reportSales.getRange('G51').setFormula('=SUM(G46:G50)');
    reportSales.getRange('J51').setFormula('=SUM(E51:G51)');

    // Section 7: Revenue Summary (A) Breakdown (Row 53)
    reportSales.getRange('D53').setFormula('=D18+F33+D51+F43-D24');
    reportSales.getRange('E53').setFormula('=E18+G33+E51+G43-E24');
    reportSales.getRange('F53').setFormula('=F18+H33+F51+H43-F24');
    reportSales.getRange('G53').setFormula('=I33+G51+I43');
    reportSales.getRange('H53').setFormula('=G18-G24');
    reportSales.getRange('I53').setFormula('=I18+H18-I24');
    reportSales.getRange('J53').setFormula('=E53+F53+G53+H53+I53');
    reportSales.getRange('K53').setFormula('=IF(D53=J53, "BALANCED ✓", "DIFF: ₹" & TEXT(D53-J53, "#,##0"))');

    // Section 8: Dues Recovered (Row 59)
    reportSales.getRange('D59').setFormula('=SUM(D56:D58)');
    reportSales.getRange('E59').setFormula('=SUM(E56:E58)');
    reportSales.getRange('F59').setFormula('=SUM(F56:F58)');
    reportSales.getRange('G59').setFormula('=SUM(G56:G58)');
    reportSales.getRange('J59').setFormula('=SUM(E59:G59)');
    reportSales.getRange('K59').setFormula('=IF(D59=J59, "RECOVERED ✓", "DIFF")');

    // Section 9: Grand Total [A+B] (Row 61)
    reportSales.getRange('D61').setFormula('=D53+D59');
    reportSales.getRange('E61').setFormula('=E53+E59');
    reportSales.getRange('F61').setFormula('=F53+F59');
    reportSales.getRange('G61').setFormula('=G53+G59');
    reportSales.getRange('H61').setFormula('=H53+H59');
    reportSales.getRange('I61').setFormula('=I53+I59');
    reportSales.getRange('J61').setFormula('=J53+J59');
    reportSales.getRange('K61').setFormula('=IF(D61=J61, "BALANCED ✓", "DIFF: ₹" & TEXT(D61-J61, "#,##0"))');
  }

  // 3. Sheet: REPORT_CASH (Cash Report)
  if (reportCash) {
    reportCash.getRange('E2').setFormula(`="Date: " & TEXT('${vendorSheetName}'!H2, "DD/MM/YYYY")`);

    // Top Cards
    reportCash.getRange('B4').setFormula(`='${salesSheetName}'!D61`);
    reportCash.getRange('C4').setFormula('=C15');
    reportCash.getRange('D4').setFormula('=F8');
    reportCash.getRange('E4').setFormula('=E19');
    reportCash.getRange('F4').setFormula('=E25');

    // Sales & Adjustments
    reportCash.getRange('C8').setFormula(`='${salesSheetName}'!D61`);
    reportCash.getRange('F8').setFormula(`='${salesSheetName}'!E61`);
    reportCash.getRange('C9').setFormula(`='${salesSheetName}'!G18`);
    reportCash.getRange('F9').setFormula(`='${salesSheetName}'!F61`);
    reportCash.getRange('C10').setFormula(`='${salesSheetName}'!I18`);
    reportCash.getRange('F10').setFormula(`='${salesSheetName}'!G61`);
    reportCash.getRange('C12').setFormula('=SUM(C9:C11)');
    reportCash.getRange('F11').setFormula('=SUM(F8:F10)');
    reportCash.getRange('C13').setFormula(`='${salesSheetName}'!H18`);
    reportCash.getRange('F12').setFormula('=C12+C13+C14');
    reportCash.getRange('F13').setFormula('=IF(C15=F11,"RECONCILED ✓",IF(C15>F11,"RECEIPT DEFICIT: ₹" & TEXT(C15-F11,"#,##0"),"SURPLUS: ₹" & TEXT(F11-C15,"#,##0")))');
    reportCash.getRange('F14').setFormula('=C15-F11');
    reportCash.getRange('C15').setFormula('=C8-C12-C13-C14');

    // Inflows & Outflows
    reportCash.getRange('C20').setFormula('=F8');
    reportCash.getRange('E25').setFormula('=C27-SUM(E19:E24)');
    reportCash.getRange('C27').setFormula('=SUM(C19:C24)');
    reportCash.getRange('E27').setFormula('=SUM(E19:E25)');
    reportCash.getRange('F27').setFormula('=IF(ROUND(C27,2)=ROUND(E27,2),"BALANCED ✓","MISMATCH ✗")');

    // Denominations (Rows 31 to 39)
    for (let r = 31; r <= 39; r++) {
      reportCash.getRange(`E${r}`).setFormula(`=C${r}*D${r}`);
    }
    reportCash.getRange('D40').setFormula('=SUM(D31:D39)');
    reportCash.getRange('E40').setFormula('=SUM(E31:E39)');
    reportCash.getRange('C41').setFormula('=E25');
    reportCash.getRange('D41').setFormula('="Variance: ₹" & TEXT(E40-E25,"#,##0")');
    reportCash.getRange('F41').setFormula('=IF(ROUND(E40-E25,2)=0,"MATCHED & BALANCED ✓","DISCREPANCY: ₹" & TEXT(E40-E25,"#,##0"))');

    // Dues Register (Rows 46 to 49)
    reportCash.getRange('E46').setFormula('=C13+C14');
    reportCash.getRange('E47').setFormula(`='${salesSheetName}'!J59`);
    reportCash.getRange('E49').setFormula('=E45+E46-E47');
    reportCash.getRange('F49').setFormula('=IF(E49=(E45+E46-E47),"RECONCILED C/F ✓","AUDIT MISMATCH ✗")');
  }

  // 4. Sheet: REPORT_STOCK (Cylinder Stock)
  if (reportStock) {
    reportStock.getRange('B2').setFormula(`='${vendorSheetName}'!H2`);

    // Stock rows (5 to 9)
    for (let r = 5; r <= 9; r++) {
      reportStock.getRange(`E${r}`).setFormula(`=SUM(C${r}:D${r})`);
      if (r === 5) {
        // 14.2 KG Domestic sold pulls directly from COLLECTION SUMMARY Grand Total (C22)
        reportStock.getRange(`F${r}`).setFormula(`='${vendorSheetName}'!C22`);
      }
      reportStock.getRange(`H${r}`).setFormula(`=E${r}-F${r}+N(G${r})`);
      reportStock.getRange(`L${r}`).setFormula(`=SUM(I${r}:K${r})`);
      reportStock.getRange(`N${r}`).setFormula(`=L${r}-M${r}`);
    }

    // Total Row 10
    const cols = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
    for (const c of cols) {
      reportStock.getRange(`${c}10`).setFormula(`=SUM(${c}5:${c}9)`);
    }
  }

  Logger.log("Formulas successfully verified and bound across all 4 report sheets.");
}

/**
 * ============================================================================
 * SELF-TEST SUITE
 * ============================================================================
 */

function runTests() {
  const testDate = '9999-12-31';
  Logger.log("Starting Rojnamcha system test for date: " + testDate);

  // 1. Verify Meta Data
  const meta = handleGetMeta();
  if (!meta.ok || !meta.data.rates.length) {
    throw new Error("TEST FAILED: Meta rates returned empty.");
  }
  Logger.log("✓ Meta data test passed.");

  // 2. Add Test Entries
  const adminUser = { username: 'test_runner', role: 'admin' };
  const entry1 = handleAddEntry({
    date: testDate,
    category: 'SALE',
    item: '19KG Commercial',
    qty: 2,
    rate: 3049,
    amount: 6098,
    payMode: 'UPI',
    party: 'Test Hotel'
  }, adminUser);

  if (!entry1.ok) throw new Error("TEST FAILED: Adding test entry failed: " + entry1.error);
  Logger.log("✓ Add entry test passed.");

  // 3. Test Vendor Log Save
  const testVendors = [
    { vendor: 'MONU', gasGiven: 10, cash: 10420, upi: 0, hpPay: 0, dues: 0 },
    { vendor: 'GODOWN', gasGiven: 5, cash: 5210, upi: 0, hpPay: 0, dues: 0 }
  ];
  const vSave = handleSaveVendorLog(testDate, testVendors, adminUser);
  if (!vSave.ok) throw new Error("TEST FAILED: Vendor log save failed: " + vSave.error);
  Logger.log("✓ Vendor log save test passed.");

  // 4. Test Cash Book Save
  const cbSave = handleSaveCashbook(testDate, {
    openingCash: 500,
    bankDeposit: 10000,
    cashSentMadhubani: 5000,
    cashTransferThakurJi: 0,
    pettyExpenses: 130,
    d500: 1,
    closingCash: 500
  }, adminUser);
  if (!cbSave.ok) throw new Error("TEST FAILED: Cash book save failed: " + cbSave.error);
  Logger.log("✓ Cashbook save test passed.");

  // 5. Test Dashboard Retrieval
  const dash = handleGetDashboard(testDate);
  if (!dash.ok) throw new Error("TEST FAILED: Dashboard retrieval failed: " + dash.error);
  Logger.log("✓ Dashboard calculation test passed.");

  // 6. Cleanup test data
  const entrySheet = getSheet(SHEETS.ENTRY);
  const eData = entrySheet.getDataRange().getValues();
  for (let r = eData.length - 1; r >= 1; r--) {
    if (formatDateObj(eData[r][1]) === testDate) {
      entrySheet.deleteRow(r + 1);
    }
  }

  const vSheet = getSheet(SHEETS.VENDOR_LOG);
  const vData = vSheet.getDataRange().getValues();
  for (let r = vData.length - 1; r >= 1; r--) {
    if (formatDateObj(vData[r][1]) === testDate) {
      vSheet.deleteRow(r + 1);
    }
  }

  const cbSheet = getSheet(SHEETS.CASHBOOK);
  const cbData = cbSheet.getDataRange().getValues();
  for (let r = cbData.length - 1; r >= 1; r--) {
    if (formatDateObj(cbData[r][0]) === testDate) {
      cbSheet.deleteRow(r + 1);
    }
  }

  Logger.log("==========================================");
  Logger.log("ALL ROJNAMCHA TESTS PASSED SUCCESSFULLY! ✓");
  Logger.log("==========================================");
  return { ok: true, message: "All Rojnamcha self-tests passed successfully." };
}

/**
 * ============================================================================
 * UTILITY HELPERS
 * ============================================================================
 */

function sanitizeDate(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return Utilities.formatDate(dateVal, CONFIG.TIMEZONE, CONFIG.DEFAULT_DATE_FORMAT);
  }
  const str = String(dateVal).trim();
  // If DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(str)) {
    const parts = str.split(/[\/-]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  return str;
}

function formatDateObj(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, CONFIG.TIMEZONE, CONFIG.DEFAULT_DATE_FORMAT);
  }
  return String(val).trim();
}

function getTodayDateString() {
  return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DEFAULT_DATE_FORMAT);
}
