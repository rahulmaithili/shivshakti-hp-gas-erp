/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - VENDOR & PURCHASE INVENTORY ENGINE
 * Sheets: Vendors, Purchases
 * ============================================================================
 */

function listVendors() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const vSheet = ss.getSheetByName('Vendors');
  if (!vSheet || vSheet.getLastRow() <= 1) {
    return successResponse([], 'No vendors found');
  }

  const data = vSheet.getDataRange().getValues();
  const vendors = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][8] === true) continue; // IsDeleted
    vendors.push({
      vendorId: data[i][0],
      name: data[i][1],
      mobile: data[i][2],
      address: data[i][3],
      gstin: data[i][4],
      contactPerson: data[i][5],
      createdAt: data[i][6]
    });
  }

  return successResponse(vendors, 'Vendors fetched');
}

function saveVendor(payload, user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const vSheet = ss.getSheetByName('Vendors');
  if (!vSheet) return errorResponse('Vendors sheet not found', 'NOT_FOUND');

  const vendorId = payload.vendorId || ('vnd_' + Utilities.getUuid().slice(0, 8));
  const name = String(payload.name || '').trim();
  if (!name) return errorResponse('Vendor name is required', 'VALIDATION');

  const mobile = String(payload.mobile || '').trim();
  const address = String(payload.address || '').trim();
  const gstin = String(payload.gstin || '').trim();
  const contactPerson = String(payload.contactPerson || '').trim();

  const data = vSheet.getDataRange().getValues();
  let foundRow = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][8] === true) continue;
    if (data[i][0] === vendorId) {
      foundRow = i + 1;
      break;
    }
  }

  const nowIso = new Date().toISOString();

  if (foundRow > -1) {
    vSheet.getRange(foundRow, 2, 1, 6).setValues([[
      name, mobile, address, gstin, contactPerson, data[foundRow - 1][6]
    ]]);
    vSheet.getRange(foundRow, 8).setValue(nowIso);
    writeAuditLog(user, 'UPDATE_VENDOR', 'Vendors', vendorId, `Updated vendor ${name}`);
  } else {
    vSheet.appendRow([
      vendorId, name, mobile, address, gstin, contactPerson, nowIso, nowIso, false
    ]);
    writeAuditLog(user, 'CREATE_VENDOR', 'Vendors', vendorId, `Created vendor ${name}`);
  }

  return successResponse({ vendorId: vendorId, name: name }, 'Vendor saved successfully');
}

function deleteVendor(payload, user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const vSheet = ss.getSheetByName('Vendors');
  if (!vSheet) return errorResponse('Vendors sheet not found', 'NOT_FOUND');

  const vendorId = payload.vendorId;
  const data = vSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === vendorId) {
      vSheet.getRange(i + 1, 9).setValue(true); // IsDeleted
      writeAuditLog(user, 'DELETE_VENDOR', 'Vendors', vendorId, `Deleted vendor ${data[i][1]}`);
      return successResponse({ vendorId: vendorId }, 'Vendor deleted successfully');
    }
  }

  return errorResponse('Vendor not found', 'NOT_FOUND');
}

function listPurchases(filters) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pSheet = ss.getSheetByName('Purchases');
  if (!pSheet || pSheet.getLastRow() <= 1) {
    return successResponse([], 'No purchases found');
  }

  const data = pSheet.getDataRange().getValues();
  const purchases = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][10] === true) continue; // IsDeleted
    purchases.push({
      purchaseId: data[i][0],
      date: formatDateString(data[i][1]),
      vendorName: data[i][2],
      invoiceNo: data[i][3],
      item: data[i][4],
      qty: Number(data[i][5]) || 0,
      rate: Number(data[i][6]) || 0,
      totalAmount: Number(data[i][7]) || 0,
      createdAt: data[i][8],
      createdBy: data[i][9]
    });
  }

  return successResponse(purchases.reverse(), 'Purchases fetched');
}

function savePurchase(payload, user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pSheet = ss.getSheetByName('Purchases');
  if (!pSheet) return errorResponse('Purchases sheet not found', 'NOT_FOUND');

  const purchaseId = payload.purchaseId || ('pur_' + Utilities.getUuid().slice(0, 8));
  const date = payload.date || getTodayISO();
  const vendorName = String(payload.vendorName || '').trim();
  const invoiceNo = String(payload.invoiceNo || '').trim();
  const item = String(payload.item || '').trim();
  const qty = Number(payload.qty) || 0;
  const rate = Number(payload.rate) || 0;
  const totalAmount = qty * rate;

  if (!vendorName || !item || qty <= 0) {
    return errorResponse('Vendor, item, and valid qty are required', 'VALIDATION');
  }

  pSheet.appendRow([
    purchaseId, date, vendorName, invoiceNo, item, qty, rate, totalAmount,
    new Date().toISOString(), user.username, false
  ]);

  writeAuditLog(user, 'CREATE_PURCHASE', 'Purchases', purchaseId, `Purchase from ${vendorName} for ${item} x ${qty} (₹${totalAmount})`);
  return successResponse({ purchaseId: purchaseId, totalAmount: totalAmount }, 'Purchase recorded successfully');
}
