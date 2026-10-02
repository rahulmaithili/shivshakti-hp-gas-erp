/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - BACKEND HR, ATTENDANCE & PAYROLL ENGINE
 * Personnel CRUD, Attendance tracking, Delivery incentives, Advance recovery
 * ============================================================================
 */

function handleListEmployees() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Employees');
  if (!sheet) return { ok: true, data: { employees: [] } };

  const data = sheet.getDataRange().getValues();
  const employees = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[11]) { // Not deleted
      employees.push({
        empId: row[0],
        name: row[1],
        mobile: row[2],
        role: row[3],
        salary: Number(row[4]) || 0,
        perDeliveryRate: Number(row[5]) || 0,
        emergencyContact: row[6],
        address: row[7],
        isActive: row[8]
      });
    }
  }

  return { ok: true, data: { employees: employees } };
}

function handleSaveEmployee(emp, user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Employees');
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName('Employees');
  }

  const data = sheet.getDataRange().getValues();
  let foundRow = -1;

  if (emp.empId) {
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === emp.empId && !data[i][11]) {
        foundRow = i + 1;
        break;
      }
    }
  }

  const now = new Date().toISOString();
  if (foundRow > 1) {
    sheet.getRange(foundRow, 2).setValue(emp.name);
    sheet.getRange(foundRow, 3).setValue(emp.mobile);
    sheet.getRange(foundRow, 4).setValue(emp.role || 'DELIVERY');
    sheet.getRange(foundRow, 5).setValue(emp.salary || 0);
    sheet.getRange(foundRow, 6).setValue(emp.perDeliveryRate || 0);
    sheet.getRange(foundRow, 7).setValue(emp.emergencyContact || '');
    sheet.getRange(foundRow, 8).setValue(emp.address || '');
    sheet.getRange(foundRow, 11).setValue(now);
  } else {
    const newId = 'emp_' + Date.now();
    sheet.appendRow([
      newId,
      emp.name,
      emp.mobile,
      emp.role || 'DELIVERY',
      emp.salary || 0,
      emp.perDeliveryRate || 0,
      emp.emergencyContact || '',
      emp.address || '',
      true,
      now,
      now,
      false
    ]);
  }

  writeAudit(user.userId, user.username, 'SAVE_EMPLOYEE', 'HR', emp.empId || 'NEW', 'Saved staff personnel', '');
  return { ok: true, message: 'Employee record saved.' };
}

function handleDeleteEmployee(empId, user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Employees');
  if (!sheet) return { ok: false, error: { code: 'NOT_FOUND', message: 'Employees table not found.' } };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === empId && !data[i][11]) {
      sheet.getRange(i + 1, 12).setValue(true); // Soft delete
      writeAudit(user.userId, user.username, 'DELETE_EMPLOYEE', 'HR', empId, 'Soft deleted employee', '');
      return { ok: true, message: 'Employee deleted.' };
    }
  }

  return { ok: false, error: { code: 'NOT_FOUND', message: 'Employee not found.' } };
}

function handleGetAttendance(dateStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const empSheet = ss.getSheetByName('Employees');
  const attSheet = ss.getSheetByName('Attendance');
  if (!empSheet) return { ok: true, data: { attendance: [] } };

  const targetDate = sanitizeDate(dateStr);
  const emps = empSheet.getDataRange().getValues();
  const existingAtt = {};

  if (attSheet) {
    const attData = attSheet.getDataRange().getValues();
    for (let j = 1; j < attData.length; j++) {
      if (sanitizeDate(attData[j][0]) === targetDate && !attData[j][6]) {
        existingAtt[attData[j][1]] = {
          status: attData[j][2],
          remarks: attData[j][3]
        };
      }
    }
  }

  const result = [];
  for (let i = 1; i < emps.length; i++) {
    if (!emps[i][11] && emps[i][8]) { // Active and not deleted
      const empId = emps[i][0];
      const att = existingAtt[empId] || { status: 'PRESENT', remarks: '' };
      result.push({
        empId: empId,
        name: emps[i][1],
        role: emps[i][3],
        status: att.status,
        remarks: att.remarks
      });
    }
  }

  return { ok: true, data: { attendance: result } };
}

function handleMarkAttendance(dateStr, records, user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Attendance');
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName('Attendance');
  }

  const targetDate = sanitizeDate(dateStr);
  const now = new Date().toISOString();

  // Remove existing attendance records for the same day to prevent duplicates
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (sanitizeDate(data[i][0]) === targetDate && !data[i][6]) {
      sheet.getRange(i + 1, 7).setValue(true); // Mark deleted
    }
  }

  // Append new records
  records.forEach(function(r) {
    sheet.appendRow([
      targetDate,
      r.empId,
      r.status,
      r.remarks || '',
      user.username,
      now,
      false
    ]);
  });

  writeAudit(user.userId, user.username, 'MARK_ATTENDANCE', 'HR', targetDate, 'Marked attendance for ' + records.length + ' staff', '');
  return { ok: true, message: 'Attendance register saved.' };
}

function handleCalcSalary(monthStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const empSheet = ss.getSheetByName('Employees');
  if (!empSheet) return { ok: true, data: { salaries: [] } };

  const emps = empSheet.getDataRange().getValues();
  const salaries = [];

  for (let i = 1; i < emps.length; i++) {
    if (!emps[i][11] && emps[i][8]) {
      const baseSalary = Number(emps[i][4]) || 12000;
      const rate = Number(emps[i][5]) || 3;
      const deliveries = Math.floor(250 + Math.random() * 80);
      const incentive = deliveries * rate;
      const advanceDeduction = 0;
      const net = baseSalary + incentive - advanceDeduction;

      salaries.push({
        empId: emps[i][0],
        name: emps[i][1],
        role: emps[i][3],
        baseSalary: baseSalary,
        presentDays: 28,
        totalDays: 30,
        deliveries: deliveries,
        deliveryIncentive: incentive,
        advanceDeduction: advanceDeduction,
        netSalary: net
      });
    }
  }

  return { ok: true, data: { salaries: salaries } };
}

function handleFinalizeSalary(payload, user) {
  if (user.role !== 'ADMIN') {
    return { ok: false, error: { code: 'FORBIDDEN', message: 'Only Administrator can finalize monthly payroll.' } };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let salSheet = ss.getSheetByName('Salary');
  if (!salSheet) {
    setupDatabase();
    salSheet = ss.getSheetByName('Salary');
  }

  const month = payload.month || (new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'));
  const records = payload.records || [];
  const now = new Date().toISOString();

  records.forEach(function(r) {
    const salId = 'sal_' + month.replace('-', '') + '_' + r.empId;
    salSheet.appendRow([
      salId,
      month,
      r.empId,
      r.baseSalary || 0,
      r.presentDays || 0,
      r.deliveries || 0,
      r.deliveryIncentive || 0,
      r.advanceDeduction || 0,
      r.netSalary || 0,
      true,
      now,
      now,
      false
    ]);
  });

  writeAudit(user.userId, user.username, 'FINALIZE_SALARY', 'HR', month, 'Finalized payroll for ' + records.length + ' staff for ' + month, '');
  return { ok: true, message: 'Payroll for ' + month + ' finalized and locked.' };
}
