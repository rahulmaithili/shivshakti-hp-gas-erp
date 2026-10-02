/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - USER MANAGEMENT, AUDIT & SYSTEM HEALTH
 * Sheets: Users, AuditLog, Settings
 * ============================================================================
 */

function listUsers(user) {
  if (user.role !== 'ADMIN') {
    return errorResponse('Admin access required', 'FORBIDDEN');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const uSheet = ss.getSheetByName('Users');
  if (!uSheet || uSheet.getLastRow() <= 1) {
    return successResponse([], 'No users found');
  }

  const data = uSheet.getDataRange().getValues();
  const users = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][12] === true) continue; // IsDeleted
    users.push({
      userId: data[i][0],
      username: data[i][1],
      role: data[i][4],
      isActive: Boolean(data[i][5]),
      mustChangePassword: Boolean(data[i][6]),
      failedAttempts: Number(data[i][7]) || 0,
      lockUntil: data[i][8] || '',
      lastLogin: data[i][9] || '',
      createdAt: data[i][10]
    });
  }

  return successResponse(users, 'Users loaded');
}

function saveUser(payload, currentUser) {
  if (currentUser.role !== 'ADMIN') {
    return errorResponse('Admin access required', 'FORBIDDEN');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const uSheet = ss.getSheetByName('Users');
  if (!uSheet) return errorResponse('Users sheet not found', 'NOT_FOUND');

  const username = String(payload.username || '').trim().toLowerCase();
  const role = String(payload.role || 'CASHIER').toUpperCase();
  const isActive = payload.isActive !== false;
  const password = payload.password;

  if (!username) return errorResponse('Username is required', 'VALIDATION');

  const data = uSheet.getDataRange().getValues();
  let foundRow = -1;
  let targetUserId = payload.userId;

  for (let i = 1; i < data.length; i++) {
    if (data[i][12] === true) continue;
    if (data[i][0] === targetUserId || data[i][1] === username) {
      foundRow = i + 1;
      targetUserId = data[i][0];
      break;
    }
  }

  const nowIso = new Date().toISOString();

  if (foundRow > -1) {
    uSheet.getRange(foundRow, 2).setValue(username);
    uSheet.getRange(foundRow, 5).setValue(role);
    uSheet.getRange(foundRow, 6).setValue(isActive);
    uSheet.getRange(foundRow, 12).setValue(nowIso);

    if (password) {
      const salt = generateSalt();
      const hash = hashPassword(password, salt);
      uSheet.getRange(foundRow, 3, 1, 2).setValues([[salt, hash]]);
      uSheet.getRange(foundRow, 7).setValue(true); // Must change on reset
    }

    writeAuditLog(currentUser, 'UPDATE_USER', 'Users', targetUserId, `Updated user ${username} (${role})`);
  } else {
    if (!password) return errorResponse('Password required for new user', 'VALIDATION');
    const salt = generateSalt();
    const hash = hashPassword(password, salt);
    targetUserId = 'usr_' + Utilities.getUuid().slice(0, 8);

    uSheet.appendRow([
      targetUserId, username, salt, hash, role, isActive,
      true, 0, '', '', nowIso, nowIso, false
    ]);

    writeAuditLog(currentUser, 'CREATE_USER', 'Users', targetUserId, `Created user ${username} (${role})`);
  }

  return successResponse({ userId: targetUserId, username: username, role: role }, 'User saved successfully');
}

function resetUserPassword(payload, currentUser) {
  if (currentUser.role !== 'ADMIN') {
    return errorResponse('Admin access required', 'FORBIDDEN');
  }

  const targetUserId = payload.userId;
  const newPassword = payload.newPassword;
  if (!targetUserId || !newPassword) {
    return errorResponse('User ID and new password are required', 'VALIDATION');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const uSheet = ss.getSheetByName('Users');
  if (!uSheet) return errorResponse('Users sheet not found', 'NOT_FOUND');

  const data = uSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === targetUserId) {
      const salt = generateSalt();
      const hash = hashPassword(newPassword, salt);
      uSheet.getRange(i + 1, 3, 1, 2).setValues([[salt, hash]]);
      uSheet.getRange(i + 1, 7).setValue(true); // Must change password
      uSheet.getRange(i + 1, 8, 1, 2).setValues([[0, '']]); // Clear lockout
      writeAuditLog(currentUser, 'RESET_PASSWORD', 'Users', targetUserId, `Reset password for ${data[i][1]}`);
      return successResponse({ userId: targetUserId }, 'Password reset successfully');
    }
  }

  return errorResponse('User not found', 'NOT_FOUND');
}

function listAudit(filters) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aSheet = ss.getSheetByName('AuditLog');
  if (!aSheet || aSheet.getLastRow() <= 1) {
    return successResponse([], 'No audit entries');
  }

  const data = aSheet.getDataRange().getValues();
  const logs = [];
  const limit = (filters && filters.limit) ? Number(filters.limit) : 100;

  for (let i = data.length - 1; i >= 1 && logs.length < limit; i--) {
    if (data[i][9] === true) continue;
    logs.push({
      auditId: data[i][0],
      timestamp: data[i][1],
      userId: data[i][2],
      username: data[i][3],
      action: data[i][4],
      module: data[i][5],
      recordId: data[i][6],
      reason: data[i][7],
      details: data[i][8]
    });
  }

  return successResponse(logs, 'Audit logs retrieved');
}

function getSystemHealth() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const sheetStats = [];

  sheets.forEach(function(s) {
    sheetStats.push({
      name: s.getName(),
      rows: s.getLastRow(),
      cols: s.getLastColumn()
    });
  });

  const aSheet = ss.getSheetByName('Archives');
  let lastBackup = 'None';
  if (aSheet && aSheet.getLastRow() > 1) {
    const data = aSheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][3] === 'SHEET_BACKUP') {
        lastBackup = data[i][5];
        break;
      }
    }
  }

  return successResponse({
    status: 'ONLINE',
    spreadsheetId: ss.getId(),
    sheetsCount: sheets.length,
    sheets: sheetStats,
    lastBackup: lastBackup,
    serverTime: new Date().toISOString(),
    timezone: 'Asia/Kolkata'
  }, 'System healthy');
}
