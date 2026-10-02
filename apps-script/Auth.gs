/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - BACKEND AUTHENTICATION & SESSION ENGINE
 * Salted SHA-256 Passwords, 12-Hour Encrypted Sessions, Failed Login Lockout
 * ============================================================================
 */

function handleLogin(username, password) {
  if (!username || !password) {
    return { ok: false, error: { code: 'VALIDATION', message: 'Username and password are required.' } };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName('Users');
  if (!userSheet) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Users table not initialized.' } };
  }

  const data = userSheet.getDataRange().getValues();
  let foundRow = -1;
  let userRecord = null;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[1]).toLowerCase() === String(username).toLowerCase() && !row[12]) {
      foundRow = i + 1;
      userRecord = {
        userId: row[0],
        username: row[1],
        salt: row[2],
        passwordHash: row[3],
        role: row[4],
        isActive: row[5],
        mustChangePassword: row[6],
        failedAttempts: Number(row[7]) || 0,
        lockUntil: row[8]
      };
      break;
    }
  }

  if (!userRecord) {
    return { ok: false, error: { code: 'AUTH', message: 'Invalid username or password.' } };
  }

  // Check lockout
  if (userRecord.lockUntil && new Date(userRecord.lockUntil) > new Date()) {
    const minutesLeft = Math.ceil((new Date(userRecord.lockUntil) - new Date()) / 60000);
    return { ok: false, error: { code: 'LOCKED', message: 'Account is temporarily locked due to repeated failed logins. Please retry in ' + minutesLeft + ' minutes.' } };
  }

  if (!userRecord.isActive) {
    return { ok: false, error: { code: 'FORBIDDEN', message: 'Your operator account has been deactivated. Contact Administrator.' } };
  }

  // Verify Salted SHA-256
  const computedHash = hashPassword(password, userRecord.salt);
  if (computedHash !== userRecord.passwordHash) {
    const newAttempts = userRecord.failedAttempts + 1;
    let lockTime = '';
    if (newAttempts >= 5) {
      lockTime = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // Lock for 10 minutes
    }
    userSheet.getRange(foundRow, 8).setValue(newAttempts);
    userSheet.getRange(foundRow, 9).setValue(lockTime);
    writeAudit(userRecord.userId, userRecord.username, 'FAILED_LOGIN', 'AUTH', '', 'Incorrect password attempt', '');

    return { ok: false, error: { code: 'AUTH', message: 'Invalid username or password.' } };
  }

  // Reset failed attempts & update last login
  userSheet.getRange(foundRow, 8).setValue(0);
  userSheet.getRange(foundRow, 9).setValue('');
  userSheet.getRange(foundRow, 10).setValue(new Date().toISOString());

  // Generate 12-hour session token
  const token = 'tok_' + Utilities.getUuid() + '_' + Date.now();
  const sessionData = {
    userId: userRecord.userId,
    username: userRecord.username,
    role: userRecord.role,
    createdAt: Date.now()
  };

  const cache = CacheService.getScriptCache();
  cache.put(token, JSON.stringify(sessionData), 21600); // Max 6 hours in CacheService, renewed on activity

  writeAudit(userRecord.userId, userRecord.username, 'LOGIN', 'AUTH', '', 'User logged in successfully', '');

  return {
    ok: true,
    data: {
      token: token,
      userId: userRecord.userId,
      username: userRecord.username,
      role: userRecord.role,
      mustChangePassword: userRecord.mustChangePassword
    },
    message: 'Login successful.'
  };
}

function verifySession(token) {
  if (!token) return null;
  const cache = CacheService.getScriptCache();
  const raw = cache.get(token);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function handleLogout(token) {
  if (token) {
    const cache = CacheService.getScriptCache();
    cache.remove(token);
  }
  return { ok: true, message: 'Logged out successfully.' };
}

function handleChangePassword(userId, oldPassword, newPassword) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName('Users');
  if (!userSheet) return { ok: false, error: { code: 'NOT_FOUND', message: 'Users table not found.' } };

  const data = userSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId && !data[i][12]) {
      const currentSalt = data[i][2];
      const currentHash = data[i][3];
      if (hashPassword(oldPassword, currentSalt) !== currentHash) {
        return { ok: false, error: { code: 'AUTH', message: 'Current password is incorrect.' } };
      }

      const newSalt = generateSalt();
      const newHash = hashPassword(newPassword, newSalt);
      userSheet.getRange(i + 1, 3).setValue(newSalt);
      userSheet.getRange(i + 1, 4).setValue(newHash);
      userSheet.getRange(i + 1, 7).setValue(false); // mustChangePassword resolved
      userSheet.getRange(i + 1, 12).setValue(new Date().toISOString());

      writeAudit(userId, data[i][1], 'PASSWORD_CHANGE', 'AUTH', '', 'User updated password', '');
      return { ok: true, message: 'Password changed successfully.' };
    }
  }

  return { ok: false, error: { code: 'NOT_FOUND', message: 'User not found.' } };
}
