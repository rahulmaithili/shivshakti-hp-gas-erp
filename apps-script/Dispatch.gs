/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - VENDOR DISPATCH & ITEM RATES MASTER ENGINE
 * Sheets: Vendor Dispatch, Item Rates
 * ============================================================================
 */

function listHawkerDispatches(filters) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dSheet = ss.getSheetByName('Vendor Dispatch');
  if (!dSheet || dSheet.getLastRow() <= 1) {
    return successResponse([], 'No dispatch entries found');
  }

  const targetDate = (filters && filters.date) ? formatDateString(filters.date) : getTodayISO();
  const data = dSheet.getDataRange().getValues();
  const entries = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][11] === true) continue; // IsDeleted
    const rowDate = formatDateString(data[i][0]);
    if (!filters || !filters.date || rowDate === targetDate) {
      entries.push({
        id: i + 1,
        date: rowDate,
        name: data[i][1],
        loaded: Number(data[i][2]) || 0,
        returnEmpty: Number(data[i][3]) || 0,
        netSold: Number(data[i][4]) || 0,
        cash: Number(data[i][5]) || 0,
        upi: Number(data[i][6]) || 0,
        dues: Number(data[i][7]) || 0,
        totalSettled: Number(data[i][8]) || 0,
        remarks: data[i][9] || '',
        createdAt: data[i][10]
      });
    }
  }

  return successResponse(entries, 'Hawker dispatches retrieved');
}

function saveHawkerDispatch(payload, user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let dSheet = ss.getSheetByName('Vendor Dispatch');
  if (!dSheet) {
    setupDatabase();
    dSheet = ss.getSheetByName('Vendor Dispatch');
  }

  const date = formatDateString(payload.date || getTodayISO());
  const name = String(payload.name || '').trim();
  const loaded = Number(payload.loaded) || 0;
  const returnEmpty = Number(payload.returnEmpty) || 0;
  const netSold = Number(payload.netSold) || Math.max(0, loaded - returnEmpty);
  const cash = Number(payload.cash) || 0;
  const upi = Number(payload.upi) || 0;
  const dues = Number(payload.dues) || 0;
  const totalSettled = Number(payload.totalSettled) || (cash + upi + dues);
  const remarks = String(payload.remarks || '');

  if (!name || loaded <= 0) {
    return errorResponse('Hawker name and valid loaded cylinder count required', 'VALIDATION');
  }

  dSheet.appendRow([
    date,
    name,
    loaded,
    returnEmpty,
    netSold,
    cash,
    upi,
    dues,
    totalSettled,
    remarks,
    new Date().toISOString(),
    user.username,
    false
  ]);

  writeAuditLog(user, 'SAVE_DISPATCH', 'Vendor Dispatch', name, `Dispatched ${loaded} cyls to ${name}, Net Sold ${netSold}, Cash ₹${cash}`);
  return successResponse({ date: date, name: name, netSold: netSold }, 'Hawker dispatch recorded successfully');
}

function getItemRates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let rSheet = ss.getSheetByName('Item Rates');
  if (!rSheet || rSheet.getLastRow() <= 1) {
    setupDatabase();
    rSheet = ss.getSheetByName('Item Rates');
  }

  const data = rSheet.getDataRange().getValues();
  const items = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][7] === true) continue; // IsDeleted
    items.push({
      id: i + 1,
      item: data[i][0],
      category: data[i][1],
      rate: Number(data[i][2]) || 0,
      unit: data[i][3] || 'Nos',
      isActive: Boolean(data[i][4])
    });
  }

  return successResponse(items, 'Item rates retrieved');
}

function saveItemRate(payload, user) {
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
    return errorResponse('Admin or Manager role required to edit item rates', 'FORBIDDEN');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rSheet = ss.getSheetByName('Item Rates');
  if (!rSheet) return errorResponse('Item Rates sheet not found', 'NOT_FOUND');

  const item = String(payload.item || '').trim();
  const category = String(payload.category || 'SALE').trim();
  const rate = Number(payload.rate);
  const unit = String(payload.unit || 'Nos').trim();
  const isActive = payload.isActive !== false;

  if (!item || isNaN(rate) || rate < 0) {
    return errorResponse('Valid item name and rate are required', 'VALIDATION');
  }

  const data = rSheet.getDataRange().getValues();
  let foundRow = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][7] === true) continue;
    if (String(data[i][0]).toLowerCase() === item.toLowerCase()) {
      foundRow = i + 1;
      break;
    }
  }

  const nowIso = new Date().toISOString();

  if (foundRow > -1) {
    rSheet.getRange(foundRow, 1, 1, 7).setValues([[
      item, category, rate, unit, isActive, data[foundRow - 1][5], nowIso
    ]]);
    writeAuditLog(user, 'UPDATE_RATE', 'Item Rates', item, `Updated rate for ${item} to ₹${rate}`);
  } else {
    rSheet.appendRow([
      item, category, rate, unit, isActive, nowIso, nowIso, false
    ]);
    writeAuditLog(user, 'CREATE_RATE', 'Item Rates', item, `Created item ${item} at ₹${rate}`);
  }

  return successResponse({ item: item, rate: rate }, 'Item rate saved successfully');
}

function deleteItemRate(payload, user) {
  if (user.role !== 'ADMIN') {
    return errorResponse('Admin role required to delete items', 'FORBIDDEN');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rSheet = ss.getSheetByName('Item Rates');
  if (!rSheet) return errorResponse('Item Rates sheet not found', 'NOT_FOUND');

  const item = String(payload.item || '').trim();
  const data = rSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === item.toLowerCase()) {
      rSheet.getRange(i + 1, 8).setValue(true); // IsDeleted
      writeAuditLog(user, 'DELETE_RATE', 'Item Rates', item, `Deleted item ${item}`);
      return successResponse({ item: item }, 'Item rate deleted');
    }
  }

  return errorResponse('Item not found', 'NOT_FOUND');
}
