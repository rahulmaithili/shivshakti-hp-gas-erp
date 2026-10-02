/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - CASH REGISTER & DAY CLOSING ENGINE
 * Sheet: Cash Report
 * ============================================================================
 */

function getCashbook(dateStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetDate = dateStr || getTodayISO();
  
  // 1. Calculate live daily receipts from Daily Sales, Vendor Dispatch, Due Payments
  let liveBillingCash = 0;
  const salesSheet = ss.getSheetByName('Daily Sales');
  if (salesSheet && salesSheet.getLastRow() > 1) {
    const sData = salesSheet.getDataRange().getValues();
    for (let i = 1; i < sData.length; i++) {
      if (sData[i][18] === true) continue; // IsDeleted
      if (formatDateString(sData[i][0]) === targetDate) {
        liveBillingCash += Number(sData[i][6]) || 0; // Cash column
      }
    }
  }

  let liveHawkerCash = 0;
  const dispSheet = ss.getSheetByName('Vendor Dispatch');
  if (dispSheet && dispSheet.getLastRow() > 1) {
    const dData = dispSheet.getDataRange().getValues();
    for (let i = 1; i < dData.length; i++) {
      if (dData[i][11] === true) continue; // IsDeleted
      if (formatDateString(dData[i][0]) === targetDate) {
        liveHawkerCash += Number(dData[i][5]) || 0; // Cash column
      }
    }
  }

  let liveDuesCash = 0;
  const duePaySheet = ss.getSheetByName('Due Payments');
  if (duePaySheet && duePaySheet.getLastRow() > 1) {
    const pData = duePaySheet.getDataRange().getValues();
    for (let i = 1; i < pData.length; i++) {
      if (pData[i][8] === true) continue; // IsDeleted
      if (formatDateString(pData[i][2]) === targetDate && String(pData[i][4]).toUpperCase() === 'CASH') {
        liveDuesCash += Number(pData[i][3]) || 0; // Amount
      }
    }
  }

  // 2. Fetch or create Cash Report row
  const cashSheet = ss.getSheetByName('Cash Report');
  let rowIdx = -1;
  let cashRecord = null;

  if (cashSheet && cashSheet.getLastRow() > 1) {
    const cData = cashSheet.getDataRange().getValues();
    for (let i = 1; i < cData.length; i++) {
      if (cData[i][21] === true) continue; // IsDeleted
      if (formatDateString(cData[i][0]) === targetDate) {
        rowIdx = i + 1;
        cashRecord = {
          date: targetDate,
          openingCash: Number(cData[i][1]) || 0,
          billingCash: Number(cData[i][2]) || liveBillingCash,
          hawkerCash: Number(cData[i][3]) || liveHawkerCash,
          duesRecoveredCash: Number(cData[i][4]) || liveDuesCash,
          expenseOut: Number(cData[i][5]) || 0,
          refundOut: Number(cData[i][6]) || 0,
          systemClosing: Number(cData[i][7]) || 0,
          physicalTill: Number(cData[i][8]) || 0,
          variance: Number(cData[i][9]) || 0,
          n500: Number(cData[i][10]) || 0,
          n200: Number(cData[i][11]) || 0,
          n100: Number(cData[i][12]) || 0,
          n50: Number(cData[i][13]) || 0,
          n20: Number(cData[i][14]) || 0,
          n10: Number(cData[i][15]) || 0,
          coins: Number(cData[i][16]) || 0,
          isClosed: Boolean(cData[i][17]),
          closedBy: cData[i][18] || '',
          closedAt: cData[i][19] || ''
        };
        break;
      }
    }
  }

  // If no record exists yet, get yesterday's physical till or closing cash as opening cash
  if (!cashRecord) {
    let opening = 0;
    if (cashSheet && cashSheet.getLastRow() > 1) {
      const cData = cashSheet.getDataRange().getValues();
      for (let i = cData.length - 1; i >= 1; i--) {
        if (!cData[i][21] && formatDateString(cData[i][0]) < targetDate) {
          opening = Number(cData[i][8]) || Number(cData[i][7]) || 0; // Physical till or system closing
          break;
        }
      }
    }
    const systemClosing = opening + liveBillingCash + liveHawkerCash + liveDuesCash;
    cashRecord = {
      date: targetDate,
      openingCash: opening,
      billingCash: liveBillingCash,
      hawkerCash: liveHawkerCash,
      duesRecoveredCash: liveDuesCash,
      expenseOut: 0,
      refundOut: 0,
      systemClosing: systemClosing,
      physicalTill: 0,
      variance: -systemClosing,
      n500: 0, n200: 0, n100: 0, n50: 0, n20: 0, n10: 0, coins: 0,
      isClosed: false,
      closedBy: '',
      closedAt: ''
    };
  } else {
    // Refresh live cash totals if day is not closed
    if (!cashRecord.isClosed) {
      cashRecord.billingCash = liveBillingCash;
      cashRecord.hawkerCash = liveHawkerCash;
      cashRecord.duesRecoveredCash = liveDuesCash;
      cashRecord.systemClosing = cashRecord.openingCash + liveBillingCash + liveHawkerCash + liveDuesCash - cashRecord.expenseOut - cashRecord.refundOut;
      cashRecord.variance = cashRecord.physicalTill - cashRecord.systemClosing;
    }
  }

  return successResponse(cashRecord, 'Cash report loaded');
}

function saveCashbook(payload, user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cashSheet = ss.getSheetByName('Cash Report');
  if (!cashSheet) return errorResponse('Cash Report sheet not found', 'NOT_FOUND');

  const targetDate = payload.date || getTodayISO();
  const cData = cashSheet.getDataRange().getValues();
  let rowIdx = -1;

  for (let i = 1; i < cData.length; i++) {
    if (cData[i][21] === true) continue;
    if (formatDateString(cData[i][0]) === targetDate) {
      rowIdx = i + 1;
      if (cData[i][17] === true && user.role !== 'ADMIN') {
        return errorResponse('Day is closed. Admin unlock required to modify cash.', 'DAY_CLOSED');
      }
      break;
    }
  }

  const n500 = Number(payload.n500) || 0;
  const n200 = Number(payload.n200) || 0;
  const n100 = Number(payload.n100) || 0;
  const n50  = Number(payload.n50) || 0;
  const n20  = Number(payload.n20) || 0;
  const n10  = Number(payload.n10) || 0;
  const coins = Number(payload.coins) || 0;

  const physicalTill = (n500 * 500) + (n200 * 200) + (n100 * 100) + (n50 * 50) + (n20 * 20) + (n10 * 10) + coins;
  const openingCash = Number(payload.openingCash) || 0;
  const billingCash = Number(payload.billingCash) || 0;
  const hawkerCash  = Number(payload.hawkerCash) || 0;
  const duesCash    = Number(payload.duesRecoveredCash) || 0;
  const expenseOut  = Number(payload.expenseOut) || 0;
  const refundOut   = Number(payload.refundOut) || 0;

  const systemClosing = openingCash + billingCash + hawkerCash + duesCash - expenseOut - refundOut;
  const variance = physicalTill - systemClosing;

  if (rowIdx > -1) {
    cashSheet.getRange(rowIdx, 2, 1, 16).setValues([[
      openingCash, billingCash, hawkerCash, duesCash, expenseOut, refundOut,
      systemClosing, physicalTill, variance,
      n500, n200, n100, n50, n20, n10, coins
    ]]);
  } else {
    cashSheet.appendRow([
      targetDate, openingCash, billingCash, hawkerCash, duesCash, expenseOut, refundOut,
      systemClosing, physicalTill, variance,
      n500, n200, n100, n50, n20, n10, coins,
      false, '', '', new Date().toISOString(), false
    ]);
  }

  writeAuditLog(user, 'SAVE_CASHBOOK', 'Cash Report', targetDate, `Physical Till ₹${physicalTill}, Variance ₹${variance}`);
  return successResponse({ physicalTill: physicalTill, systemClosing: systemClosing, variance: variance }, 'Cash register saved successfully');
}

function closeDay(payload, user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cashSheet = ss.getSheetByName('Cash Report');
  if (!cashSheet) return errorResponse('Cash Report sheet not found', 'NOT_FOUND');

  const targetDate = payload.date || getTodayISO();
  const cData = cashSheet.getDataRange().getValues();
  let rowIdx = -1;

  for (let i = 1; i < cData.length; i++) {
    if (cData[i][21] === true) continue;
    if (formatDateString(cData[i][0]) === targetDate) {
      rowIdx = i + 1;
      break;
    }
  }

  if (rowIdx === -1) {
    return errorResponse('Please enter cash denominations and save till count before closing day.', 'VALIDATION');
  }

  const nowIso = new Date().toISOString();
  cashSheet.getRange(rowIdx, 18, 1, 3).setValues([[true, user.username, nowIso]]);

  writeAuditLog(user, 'CLOSE_DAY', 'Cash Report', targetDate, `Day closed by ${user.username} at ${nowIso}`);
  return successResponse({ date: targetDate, closedAt: nowIso }, 'Day closed successfully. Register locked.');
}

function unlockDay(payload, user) {
  if (user.role !== 'ADMIN') {
    return errorResponse('Admin authorization required to unlock day.', 'FORBIDDEN');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cashSheet = ss.getSheetByName('Cash Report');
  if (!cashSheet) return errorResponse('Cash Report sheet not found', 'NOT_FOUND');

  const targetDate = payload.date || getTodayISO();
  const reason = payload.reason || 'Admin unlocked day for adjustments';
  const cData = cashSheet.getDataRange().getValues();
  let rowIdx = -1;

  for (let i = 1; i < cData.length; i++) {
    if (cData[i][21] === true) continue;
    if (formatDateString(cData[i][0]) === targetDate) {
      rowIdx = i + 1;
      break;
    }
  }

  if (rowIdx === -1) {
    return errorResponse('Record for date not found', 'NOT_FOUND');
  }

  cashSheet.getRange(rowIdx, 18, 1, 3).setValues([[false, '', '']]);
  writeAuditLog(user, 'UNLOCK_DAY', 'Cash Report', targetDate, `Day unlocked by ${user.username}. Reason: ${reason}`);

  return successResponse({ date: targetDate }, 'Day unlocked successfully');
}
