/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - BACKEND DATABASE SETUP & SEEDING ENGINE
 * Idempotent setupDatabase() - creates missing sheets, headers, admin, rates
 * ============================================================================
 */

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const requiredSheets = [
    {
      name: 'Companies',
      headers: ['CompanyID', 'CompanyName', 'LegalName', 'AgencyName', 'DistributorCode', 'HPCLCode', 'AddressLine1', 'AddressLine2', 'District', 'State', 'PIN', 'Phone', 'Email', 'GSTIN', 'PAN', 'BankName', 'BankAccount', 'IFSC', 'UPI', 'LogoBase64', 'LogoMimeType', 'CreatedAt', 'UpdatedAt', 'IsDeleted']
    },
    {
      name: 'Users',
      headers: ['UserID', 'Username', 'Salt', 'PasswordHash', 'Role', 'IsActive', 'MustChangePassword', 'FailedAttempts', 'LockUntil', 'LastLogin', 'CreatedAt', 'UpdatedAt', 'IsDeleted']
    },
    {
      name: 'Item Rates',
      headers: ['Item', 'Category', 'Rate', 'Unit', 'IsActive', 'CreatedAt', 'UpdatedAt', 'IsDeleted']
    },
    {
      name: 'Daily Sales',
      headers: ['Date', 'Item', 'Category', 'Rate', 'Qty', 'TotalAmount', 'Cash', 'UPI', 'HPPay', 'Dues', 'Others', 'TotalSettled', 'BillNo', 'ConsumerName', 'ConsumerMobile', 'Remarks', 'CreatedAt', 'CreatedBy', 'IsDeleted']
    },
    {
      name: 'Customers',
      headers: ['CustomerID', 'Name', 'Mobile', 'AltMobile', 'ConsumerNo', 'LPGID', 'Address', 'Area', 'Village', 'ConnectionType', 'CylinderType', 'AadhaarLast4', 'Status', 'Notes', 'TotalBills', 'LifetimeValue', 'CreatedAt', 'UpdatedAt', 'IsDeleted']
    },
    {
      name: 'Customer Dues',
      headers: ['DueID', 'Date', 'ConsumerName', 'Phone', 'BillNo', 'TotalDue', 'RecoveredAmount', 'Balance', 'Status', 'CreatedAt', 'CreatedBy', 'IsDeleted']
    },
    {
      name: 'Due Payments',
      headers: ['PaymentID', 'DueID', 'Date', 'Amount', 'PayMode', 'Remarks', 'CreatedBy', 'CreatedAt', 'IsDeleted']
    },
    {
      name: 'Vendor Dispatch',
      headers: ['Date', 'Name', 'Loaded', 'ReturnEmpty', 'NetSold', 'Cash', 'UPI', 'Dues', 'TotalSettled', 'Remarks', 'CreatedAt', 'CreatedBy', 'IsDeleted']
    },
    {
      name: 'Cash Report',
      headers: ['Date', 'OpeningCash', 'BillingCash', 'HawkerCash', 'DuesRecoveredCash', 'ExpenseOut', 'RefundOut', 'SystemClosing', 'PhysicalTill', 'Variance', 'N500', 'N200', 'N100', 'N50', 'N20', 'N10', 'Coins', 'IsClosed', 'ClosedBy', 'ClosedAt', 'CreatedAt', 'IsDeleted']
    },
    {
      name: 'Cylinder Stock',
      headers: ['Date', 'Type', 'OpenFull', 'PlantReceipt', 'Sold', 'Defective', 'SentPlant', 'CloseFull', 'CloseEmpty', 'CreatedAt', 'CreatedBy', 'IsDeleted']
    },
    {
      name: 'Employees',
      headers: ['EmpID', 'Name', 'Mobile', 'Role', 'Salary', 'PerDeliveryRate', 'EmergencyContact', 'Address', 'IsActive', 'CreatedAt', 'UpdatedAt', 'IsDeleted']
    },
    {
      name: 'Attendance',
      headers: ['Date', 'EmpID', 'Status', 'Remarks', 'RecordedBy', 'CreatedAt', 'IsDeleted']
    },
    {
      name: 'Salary',
      headers: ['SalaryID', 'Month', 'EmpID', 'BaseSalary', 'PresentDays', 'Deliveries', 'Incentive', 'AdvanceDeduction', 'NetSalary', 'IsFinalized', 'FinalizedAt', 'CreatedAt', 'IsDeleted']
    },
    {
      name: 'Vendors',
      headers: ['VendorID', 'VendorName', 'Mobile', 'Address', 'GSTIN', 'ContactPerson', 'CreatedAt', 'UpdatedAt', 'IsDeleted']
    },
    {
      name: 'Purchases',
      headers: ['PurchaseID', 'Date', 'VendorName', 'InvoiceNo', 'Item', 'Qty', 'Rate', 'TotalAmount', 'CreatedAt', 'CreatedBy', 'IsDeleted']
    },
    {
      name: 'AuditLog',
      headers: ['AuditID', 'Timestamp', 'UserID', 'Username', 'Action', 'Module', 'RecordID', 'Reason', 'Details', 'IsDeleted']
    },
    {
      name: 'Archives',
      headers: ['ArchiveID', 'Date', 'FileName', 'FileType', 'DriveUrl', 'CreatedAt', 'CreatedBy', 'IsDeleted']
    },
    {
      name: 'Settings',
      headers: ['SettingKey', 'SettingValue', 'Category', 'UpdatedAt', 'IsDeleted']
    }
  ];

  // 1. Create Sheets and Set Headers
  requiredSheets.forEach(function(spec) {
    let sheet = ss.getSheetByName(spec.name);
    if (!sheet) {
      sheet = ss.insertSheet(spec.name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(spec.headers);
      sheet.getRange(1, 1, 1, spec.headers.length).setFontWeight('bold').setBackground('#f1f5f9');
      sheet.setFrozenRows(1);
    }
  });

  // 2. Seed Default Company Profile
  const compSheet = ss.getSheetByName('Companies');
  if (compSheet && compSheet.getLastRow() <= 1) {
    compSheet.appendRow([
      'comp_1',
      'Shiv Shakti HP Gas',
      'Shiv Shakti Gas Service',
      'Shiv Shakti HP Gas (Pandaul)',
      'HP-124908',
      'HPCL-BIH-PAN-01',
      'Station Road, Near Main Market',
      'Pandaul, Madhubani',
      'Madhubani',
      'Bihar',
      '847234',
      '9431200000',
      'shivshaktihpgas@gmail.com',
      '10AAACR1234F1Z5',
      'AAACR1234F',
      'State Bank of India',
      '300012345678',
      'SBIN0001234',
      'shivshakti@sbi',
      '',
      '',
      new Date().toISOString(),
      new Date().toISOString(),
      false
    ]);
  }

  // 3. Seed Default Admin User: admin / admin123
  const userSheet = ss.getSheetByName('Users');
  if (userSheet && userSheet.getLastRow() <= 1) {
    const salt = generateSalt();
    const hash = hashPassword('admin123', salt);
    userSheet.appendRow([
      'usr_admin',
      'admin',
      salt,
      hash,
      'ADMIN',
      true,
      true, // Must change password on first login
      0,
      '',
      '',
      new Date().toISOString(),
      new Date().toISOString(),
      false
    ]);
  }

  // 4. Seed Default Rates Master
  const ratesSheet = ss.getSheetByName('Item Rates');
  if (ratesSheet && ratesSheet.getLastRow() <= 1) {
    const defaultRates = [
      ['14.2KG Domestic (Godown)', 'SALE', 1042, 'Cyl', true],
      ['14.2KG Domestic (Home Delivery)', 'SALE', 1042, 'Cyl', true],
      ['19KG Commercial', 'SALE', 3049, 'Cyl', true],
      ['5 Kg Nd Rfl', 'SALE', 845, 'Cyl', true],
      ['2 Kg Nd FTL', 'SALE', 450, 'Cyl', true],
      ['14.2KG Domestic Gas Refill', 'SALE', 903, 'Cyl', true],
      ['14.2KG Domestic (Cylinder SD)', 'SECURITY_DEPOSIT', 2200, 'Nos', true],
      ['Regulator Security Deposit (A-065767)', 'SECURITY_DEPOSIT', 250, 'Nos', true],
      ['19KG Commercial (SD)', 'SECURITY_DEPOSIT', 2400, 'Nos', true],
      ['Suraksha Hose Pipe', 'SALE', 190, 'Pcs', true],
      ['Domestic Regulator (Leak/Defective)', 'SALE', 100, 'Pcs', true],
      ['Ftl Rgulator', 'SALE', 350, 'Pcs', true],
      ['Domestic Pass Book (D.G.C.)', 'SALE', 59, 'Nos', true],
      ['PMUY Pass Book', 'SALE', 50, 'Nos', true],
      ['Hot Plate (Gas Stove)', 'SALE', 2350, 'Nos', true],
      ['Administration Charge', 'SERVICE', 118, 'Job', true],
      ['Name change (Death)', 'SERVICE', 118, 'Job', true],
      ['Truck Opening Charges', 'SERVICE', 200, 'Job', true],
      ['Safety inspection', 'SERVICE', 236, 'Job', true],
      ['5 Kg ftl Security Refund', 'SD_REFUND', 800, 'Nos', true],
      ['14.2KG Domestic (Defective / Leaking)', 'RETURN', 1042, 'Cyl', true],
      ['19KG Commercial (Return / Exchange)', 'RETURN', 3049, 'Cyl', true]
    ];
    defaultRates.forEach(function(r) {
      ratesSheet.appendRow([r[0], r[1], r[2], r[3], r[4], new Date().toISOString(), new Date().toISOString(), false]);
    });
  }

  return { ok: true, message: 'Database setup and seeding completed successfully.' };
}
