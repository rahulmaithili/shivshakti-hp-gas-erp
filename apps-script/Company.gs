/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - BACKEND COMPANY PROFILE & LOGO ENGINE
 * Company metadata, Base64 logo storage, Agency settings
 * ============================================================================
 */

function handleGetCompany() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Companies');
  if (!sheet || sheet.getLastRow() <= 1) {
    return { ok: true, data: { company: null } };
  }

  const row = sheet.getRange(2, 1, 1, 24).getValues()[0];
  const company = {
    companyId: row[0],
    companyName: row[1],
    legalName: row[2],
    agencyName: row[3],
    distributorCode: row[4],
    hpclCode: row[5],
    addressLine1: row[6],
    addressLine2: row[7],
    district: row[8],
    state: row[9],
    pin: row[10],
    phone: row[11],
    email: row[12],
    gstin: row[13],
    pan: row[14],
    bankName: row[15],
    bankAccount: row[16],
    ifsc: row[17],
    upi: row[18],
    logoBase64: row[19] || null,
    logoMimeType: row[20] || null
  };

  return { ok: true, data: { company: company } };
}

function handleSaveCompany(comp, user) {
  if (user.role !== 'ADMIN') {
    return { ok: false, error: { code: 'FORBIDDEN', message: 'Only Administrator can modify company details.' } };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Companies');
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName('Companies');
  }

  const rowData = [
    comp.companyId || 'comp_1',
    comp.companyName || '',
    comp.legalName || '',
    comp.agencyName || '',
    comp.distributorCode || '',
    comp.hpclCode || '',
    comp.addressLine1 || '',
    comp.addressLine2 || '',
    comp.district || '',
    comp.state || '',
    comp.pin || '',
    comp.phone || '',
    comp.email || '',
    comp.gstin || '',
    comp.pan || '',
    comp.bankName || '',
    comp.bankAccount || '',
    comp.ifsc || '',
    comp.upi || '',
    comp.logoBase64 || '',
    comp.logoMimeType || '',
    new Date().toISOString(),
    new Date().toISOString(),
    false
  ];

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  writeAudit(user.userId, user.username, 'UPDATE_COMPANY', 'COMPANY', comp.companyId, 'Updated company profile details', '');
  return { ok: true, message: 'Company profile updated successfully.' };
}

function handleUploadLogo(base64, mimeType, user) {
  if (user.role !== 'ADMIN') {
    return { ok: false, error: { code: 'FORBIDDEN', message: 'Only Administrator can update company logo.' } };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Companies');
  if (!sheet || sheet.getLastRow() <= 1) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Company record not initialized.' } };
  }

  sheet.getRange(2, 20).setValue(base64);
  sheet.getRange(2, 21).setValue(mimeType);
  sheet.getRange(2, 23).setValue(new Date().toISOString());

  writeAudit(user.userId, user.username, 'UPLOAD_LOGO', 'COMPANY', 'comp_1', 'Uploaded new agency logo', '');
  return { ok: true, message: 'Agency logo saved.' };
}

function handleRemoveLogo(user) {
  if (user.role !== 'ADMIN') {
    return { ok: false, error: { code: 'FORBIDDEN', message: 'Only Administrator can remove company logo.' } };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Companies');
  if (sheet && sheet.getLastRow() > 1) {
    sheet.getRange(2, 20).setValue('');
    sheet.getRange(2, 21).setValue('');
    sheet.getRange(2, 23).setValue(new Date().toISOString());
  }

  writeAudit(user.userId, user.username, 'REMOVE_LOGO', 'COMPANY', 'comp_1', 'Removed agency logo', '');
  return { ok: true, message: 'Logo removed.' };
}
