/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - BACKEND POS BILLING & CONNECTION BUNDLE ENGINE
 * Atomic transactions, ScriptLock, Zero-tolerance paise checks, Bill cancellation
 * ============================================================================
 */

function handleAddEntry(entry, user) {
  if (!entry || !entry.items || entry.items.length === 0) {
    return { ok: false, error: { code: 'VALIDATION', message: 'Bill must contain at least one product.' } };
  }

  // 1. Zero-Tolerance Paise Balance Guard
  const totalPaise = toPaise(entry.totalAmount);
  const settlements = entry.settlements || {};
  const cashPaise = toPaise(settlements.cash || 0);
  const upiPaise = toPaise(settlements.upi || 0);
  const hpPayPaise = toPaise(settlements.hpPay || 0);
  const duesPaise = toPaise(settlements.dues || 0);
  const otherPaise = toPaise(settlements.other || 0);

  const sumPaise = cashPaise + upiPaise + hpPayPaise + duesPaise + otherPaise;
  if (totalPaise !== sumPaise) {
    return { ok: false, error: { code: 'VALIDATION', message: 'Payment breakdown does not equal invoice total in paise.' } };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const salesSheet = ss.getSheetByName('Daily Sales');
  const duesSheet = ss.getSheetByName('Customer Dues');
  if (!salesSheet) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Daily Sales sheet not found.' } };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    const date = sanitizeDate(entry.date);
    const billNo = 'BILL-' + date.replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);
    const consumerName = entry.consumerName || 'Cash Sale';
    const consumerMobile = entry.consumerMobile || '';

    // Proportionally allocate settlements across multi-line items
    const itemCount = entry.items.length;
    entry.items.forEach(function(it, index) {
      // First line item carries bulk settlement, or apportion
      const lineCash = index === 0 ? settlements.cash || 0 : 0;
      const lineUpi = index === 0 ? settlements.upi || 0 : 0;
      const lineHpPay = index === 0 ? settlements.hpPay || 0 : 0;
      const lineDues = index === 0 ? settlements.dues || 0 : 0;
      const lineOther = index === 0 ? settlements.other || 0 : 0;
      const lineSettled = index === 0 ? (lineCash + lineUpi + lineHpPay + lineDues + lineOther) : it.amount;

      salesSheet.appendRow([
        date,
        it.item,
        it.category || 'SALE',
        it.rate,
        it.qty,
        it.amount,
        lineCash,
        lineUpi,
        lineHpPay,
        lineDues,
        lineOther,
        lineSettled,
        billNo,
        consumerName,
        consumerMobile,
        entry.remarks || '',
        new Date().toISOString(),
        user.username,
        false
      ]);
    });

    // If Dues were registered, log in Customer Dues table
    if (duesPaise > 0 && duesSheet) {
      const dueId = 'due_' + Date.now();
      duesSheet.appendRow([
        dueId,
        date,
        consumerName,
        consumerMobile,
        billNo,
        settlements.dues,
        0, // Recovered amount
        settlements.dues, // Balance
        'PENDING',
        new Date().toISOString(),
        user.username,
        false
      ]);
    }

    writeAudit(user.userId, user.username, 'CREATE_BILL', 'BILLING', billNo, 'Created invoice with ' + itemCount + ' items', '');

    return {
      ok: true,
      data: {
        billNo: billNo,
        date: date,
        consumerName: consumerName,
        mobile: consumerMobile,
        totalAmount: entry.totalAmount,
        cash: settlements.cash || 0,
        upi: settlements.upi || 0,
        dues: settlements.dues || 0,
        items: entry.items
      },
      message: 'Invoice created successfully.'
    };
  } finally {
    lock.releaseLock();
  }
}

function handleListEntries(dateStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Daily Sales');
  if (!sheet) return { ok: true, data: { entries: [] } };

  const targetDate = sanitizeDate(dateStr);
  const data = sheet.getDataRange().getValues();
  const entries = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowDate = sanitizeDate(row[0]);
    if (rowDate === targetDate && !row[18]) {
      entries.push({
        id: i + 1,
        date: rowDate,
        item: row[1],
        category: row[2],
        rate: Number(row[3]) || 0,
        qty: Number(row[4]) || 0,
        amount: Number(row[5]) || 0,
        cash: Number(row[6]) || 0,
        upi: Number(row[7]) || 0,
        hpPay: Number(row[8]) || 0,
        dues: Number(row[9]) || 0,
        other: Number(row[10]) || 0,
        totalSettled: Number(row[11]) || 0,
        billNo: row[12],
        consumerName: row[13],
        mobile: row[14],
        payMode: Number(row[6]) > 0 ? 'CASH' : (Number(row[7]) > 0 ? 'UPI' : (Number(row[9]) > 0 ? 'DUES' : 'OTHER'))
      });
    }
  }

  return { ok: true, data: { entries: entries } };
}

function handleCancelBill(billId, reason, user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const salesSheet = ss.getSheetByName('Daily Sales');
  const duesSheet = ss.getSheetByName('Customer Dues');
  if (!salesSheet) return { ok: false, error: { code: 'NOT_FOUND', message: 'Daily Sales table not found.' } };

  const data = salesSheet.getDataRange().getValues();
  let cancelledBillNo = '';

  for (let i = 1; i < data.length; i++) {
    if (data[i][12] === billId && !data[i][18]) {
      salesSheet.getRange(i + 1, 19).setValue(true); // IsDeleted = true
      cancelledBillNo = data[i][12];
    }
  }

  // Reverse Dues if applicable
  if (duesSheet && cancelledBillNo) {
    const duesData = duesSheet.getDataRange().getValues();
    for (let j = 1; j < duesData.length; j++) {
      if (duesData[j][4] === cancelledBillNo && !duesData[j][11]) {
        duesSheet.getRange(j + 1, 12).setValue(true);
      }
    }
  }

  writeAudit(user.userId, user.username, 'CANCEL_BILL', 'BILLING', billId, reason, 'Cancelled bill');
  return { ok: true, message: 'Bill has been cancelled and reversed.' };
}

function handleIssueNewConnectionPackage(payload, user) {
  const data = (payload && payload.packageData) ? payload.packageData : (payload || {});
  const date = sanitizeDate(data.date);
  const items = data.items || [];
  const consumer = data.consumer || {};
  const party = data.party || consumer.name || 'New SV Connection';
  const svNumber = data.svNumber || consumer.consumerNo || '';
  const mobile = consumer.mobile || '';

  // Extract settlements
  let settlements = data.settlements;
  if (!settlements && data.payments) {
    settlements = {
      cash: Number(data.payments.cash) || 0,
      upi: Number(data.payments.upi) || 0,
      hpPay: Number(data.payments.hpPay || data.payments.hppay) || 0,
      dues: Number(data.payments.dues) || 0,
      other: Number(data.payments.other) || 0
    };
  }
  settlements = settlements || {};

  // Compute total amount if not explicitly passed
  let totalAmount = Number(data.totalAmount || data.packageTotal) || 0;
  if (!totalAmount) {
    items.forEach(function(it) {
      totalAmount += (Number(it.amount) || ((Number(it.rate) || 0) * (Number(it.qty) || 1)));
    });
  }

  // Auto-create customer in Customers table if provided
  if (party && mobile) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const custSheet = ss.getSheetByName('Customers');
    if (custSheet) {
      custSheet.appendRow([
        'cust_' + Date.now(),
        party,
        mobile,
        '',
        svNumber,
        '',
        consumer.address || '',
        'Pandaul',
        'Pandaul',
        '14.2KG Domestic',
        '14.2 KG Domestic',
        '',
        'ACTIVE',
        'Issued via SV New Connection Package',
        1,
        totalAmount,
        new Date().toISOString(),
        new Date().toISOString(),
        false
      ]);
    }
  }

  return handleAddEntry({
    date: date,
    consumerName: party,
    consumerMobile: mobile,
    consumerNo: svNumber,
    category: 'SECURITY_DEPOSIT',
    remarks: 'New Connection 14.2KG SV Package Issue (' + (svNumber ? 'SV: ' + svNumber : 'Direct') + ')',
    items: items,
    totalAmount: totalAmount,
    settlements: settlements
  }, user);
}
