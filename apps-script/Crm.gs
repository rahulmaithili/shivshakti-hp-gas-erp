/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - BACKEND CRM, CUSTOMER 360 & DUES LEDGER ENGINE
 * Customer master CRUD, Lifetime Value, Dues ageing, Recovery, Write-off
 * ============================================================================
 */

function handleListCustomers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Customers');
  if (!sheet) return { ok: true, data: { customers: [] } };

  const data = sheet.getDataRange().getValues();
  const customers = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[18]) { // Not deleted
      customers.push({
        customerId: row[0],
        name: row[1],
        mobile: row[2],
        consumerNo: row[4],
        village: row[8],
        connectionType: row[9],
        dues: Number(row[15]) || 0
      });
    }
  }

  return { ok: true, data: { customers: customers } };
}

function handleGetCustomer360(customerId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const custSheet = ss.getSheetByName('Customers');
  const salesSheet = ss.getSheetByName('Daily Sales');
  if (!custSheet) return { ok: false, error: { code: 'NOT_FOUND', message: 'Customer sheet not found.' } };

  const custData = custSheet.getDataRange().getValues();
  let customer = null;

  for (let i = 1; i < custData.length; i++) {
    if (custData[i][0] === customerId && !custData[i][18]) {
      customer = {
        customerId: custData[i][0],
        name: custData[i][1],
        mobile: custData[i][2],
        consumerNo: custData[i][4],
        address: custData[i][6],
        village: custData[i][8],
        connectionType: custData[i][9],
        dues: Number(custData[i][15]) || 0
      };
      break;
    }
  }

  if (!customer) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Customer not found.' } };
  }

  // Aggregate past transactions from Daily Sales
  const recentBills = [];
  let refillCount = 0;
  let lifetimeValue = 0;
  let lastRefillDate = null;

  if (salesSheet) {
    const salesData = salesSheet.getDataRange().getValues();
    for (let j = salesData.length - 1; j >= 1; j--) {
      const sRow = salesData[j];
      if ((sRow[13] === customer.name || sRow[14] === customer.mobile) && !sRow[18]) {
        lifetimeValue += Number(sRow[5]) || 0;
        if (String(sRow[1]).includes('14.2') || String(sRow[1]).includes('Refill')) {
          refillCount++;
          if (!lastRefillDate) lastRefillDate = sRow[0];
        }
        if (recentBills.length < 8) {
          recentBills.push({
            date: sRow[0],
            billNo: sRow[12],
            item: sRow[1],
            amount: Number(sRow[5]) || 0
          });
        }
      }
    }
  }

  return {
    ok: true,
    data: {
      customer: customer,
      refillCount: refillCount,
      lifetimeValue: lifetimeValue,
      lastRefillDate: lastRefillDate,
      averageRefillGap: 34,
      recentBills: recentBills
    }
  };
}

function handleSaveCustomer(cust, user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Customers');
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName('Customers');
  }

  const data = sheet.getDataRange().getValues();
  let foundRow = -1;

  if (cust.customerId) {
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === cust.customerId && !data[i][18]) {
        foundRow = i + 1;
        break;
      }
    }
  }

  const now = new Date().toISOString();
  if (foundRow > 1) {
    // Update existing customer
    sheet.getRange(foundRow, 2).setValue(cust.name);
    sheet.getRange(foundRow, 3).setValue(cust.mobile);
    sheet.getRange(foundRow, 5).setValue(cust.consumerNo || '');
    sheet.getRange(foundRow, 7).setValue(cust.address || '');
    sheet.getRange(foundRow, 9).setValue(cust.village || '');
    sheet.getRange(foundRow, 10).setValue(cust.connectionType || '14.2KG Domestic');
    sheet.getRange(foundRow, 18).setValue(now);
  } else {
    // Insert new customer
    const newId = 'cust_' + Date.now();
    sheet.appendRow([
      newId,
      cust.name,
      cust.mobile,
      cust.altMobile || '',
      cust.consumerNo || '',
      cust.lpgId || '',
      cust.address || '',
      cust.area || '',
      cust.village || '',
      cust.connectionType || '14.2KG Domestic',
      cust.cylinderType || '14.2 KG Domestic',
      cust.aadhaarLast4 || '',
      'ACTIVE',
      cust.notes || '',
      0,
      0,
      now,
      now,
      false
    ]);
  }

  writeAudit(user.userId, user.username, 'SAVE_CUSTOMER', 'CRM', cust.customerId || 'NEW', 'Saved customer profile', '');
  return { ok: true, message: 'Customer record saved.' };
}

function handleListDues(statusFilter) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Customer Dues');
  if (!sheet) return { ok: true, data: { dues: [], ageing: {} } };

  const data = sheet.getDataRange().getValues();
  const dues = [];
  const now = new Date();
  const ageing = { bucket0_7: 0, bucket8_30: 0, bucket31_60: 0, bucket60Plus: 0 };

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[11]) { // Not deleted
      const balance = Number(row[7]) || 0;
      const status = row[8] || 'PENDING';

      if (statusFilter === 'ALL' || (statusFilter === 'PENDING' && balance > 0) || (statusFilter === 'CLEARED' && balance === 0)) {
        dues.push({
          dueId: row[0],
          date: row[1],
          consumerName: row[2],
          phone: row[3],
          billNo: row[4],
          totalDue: Number(row[5]) || 0,
          recoveredAmount: Number(row[6]) || 0,
          balance: balance,
          status: status
        });

        if (balance > 0) {
          const daysOld = Math.floor((now - new Date(row[1])) / (1000 * 60 * 60 * 24));
          if (daysOld <= 7) ageing.bucket0_7 += balance;
          else if (daysOld <= 30) ageing.bucket8_30 += balance;
          else if (daysOld <= 60) ageing.bucket31_60 += balance;
          else ageing.bucket60Plus += balance;
        }
      }
    }
  }

  return { ok: true, data: { dues: dues, ageing: ageing } };
}

function handleRecoverDue(dueId, amount, payMode, remarks, user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const duesSheet = ss.getSheetByName('Customer Dues');
  const paySheet = ss.getSheetByName('Due Payments');
  if (!duesSheet) return { ok: false, error: { code: 'NOT_FOUND', message: 'Dues table not found.' } };

  const data = duesSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === dueId && !data[i][11]) {
      const currentRecovered = Number(data[i][6]) || 0;
      const totalDue = Number(data[i][5]) || 0;
      const newRecovered = currentRecovered + amount;
      const newBalance = Math.max(0, totalDue - newRecovered);
      const newStatus = newBalance === 0 ? 'CLEARED' : 'PARTIAL';

      duesSheet.getRange(i + 1, 7).setValue(newRecovered);
      duesSheet.getRange(i + 1, 8).setValue(newBalance);
      duesSheet.getRange(i + 1, 9).setValue(newStatus);

      // Log in Due Payments table
      if (paySheet) {
        paySheet.appendRow([
          'pmt_' + Date.now(),
          dueId,
          getTodayDateString(),
          amount,
          payMode || 'CASH',
          remarks || '',
          user.username,
          new Date().toISOString(),
          false
        ]);
      }

      writeAudit(user.userId, user.username, 'RECOVER_DUE', 'DUES', dueId, 'Recovered ₹' + amount, 'Mode: ' + payMode);
      return { ok: true, message: 'Dues payment recorded successfully.' };
    }
  }

  return { ok: false, error: { code: 'NOT_FOUND', message: 'Due record not found.' } };
}

function handleWriteOffDue(dueId, reason, user) {
  if (user.role !== 'ADMIN') {
    return { ok: false, error: { code: 'FORBIDDEN', message: 'Only Administrator can write off customer dues.' } };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const duesSheet = ss.getSheetByName('Customer Dues');
  if (!duesSheet) return { ok: false, error: { code: 'NOT_FOUND', message: 'Dues table not found.' } };

  const data = duesSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === dueId && !data[i][11]) {
      duesSheet.getRange(i + 1, 8).setValue(0); // Balance = 0
      duesSheet.getRange(i + 1, 9).setValue('WRITTEN_OFF');

      writeAudit(user.userId, user.username, 'WRITE_OFF_DUE', 'DUES', dueId, reason, 'Admin write-off');
      return { ok: true, message: 'Due record written off successfully.' };
    }
  }

  return { ok: false, error: { code: 'NOT_FOUND', message: 'Due record not found.' } };
}
