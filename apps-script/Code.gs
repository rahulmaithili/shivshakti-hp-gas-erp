/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - CENTRAL API ROUTER & DISPATCH CONTROLLER
 * Apps Script Web App Entrypoint: doGet(e), doPost(e)
 * ============================================================================
 */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    message: 'Shiv Shakti HP Gas ERP API is active and operational.',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return sendError('VALIDATION', 'Empty request payload.');
    }

    let request;
    try {
      request = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return sendError('VALIDATION', 'Malformed JSON payload: ' + parseErr.message);
    }

    const action = request.action;
    const token = request.token;
    const payload = request.payload || {};

    if (!action) {
      return sendError('VALIDATION', 'Missing required parameter: action');
    }

    // 1. PUBLIC ACTIONS (No token required)
    if (action === 'ping') {
      return sendSuccess({ status: 'ONLINE', time: new Date().toISOString() }, 'Pong');
    }

    if (action === 'setupDatabase') {
      const setupResult = setupDatabase();
      return sendSuccess(setupResult, 'Database initialized');
    }

    if (action === 'login') {
      const loginResult = handleLogin(payload.username, payload.password);
      return returnResult(loginResult);
    }

    // 2. SESSION AUTHENTICATION GUARD
    const sessionUser = verifySession(token);
    if (!sessionUser) {
      return sendError('AUTH', 'Session expired or invalid. Please sign in again.');
    }

    // 3. PROTECTED ACTIONS DISPATCH ROUTER
    let result;

    switch (action) {
      // --- AUTHENTICATION ---
      case 'logout':
        result = handleLogout(token);
        break;

      case 'changePassword':
        result = handleChangePassword(sessionUser.userId, payload.oldPassword, payload.newPassword);
        break;

      // --- COMPANY PROFILE ---
      case 'getCompany':
        result = handleGetCompany();
        break;

      case 'saveCompany':
        result = handleSaveCompany(payload, sessionUser);
        break;

      case 'uploadLogo':
        result = handleUploadLogo(payload.logoBase64, payload.logoMimeType, sessionUser);
        break;

      case 'deleteLogo':
        result = handleRemoveLogo(sessionUser);
        break;

      // --- DASHBOARD & REPORTS ---
      case 'getDashboardKPIs':
      case 'getReconciliation':
        result = handleGetDashboard(payload.date);
        break;

      case 'getRojnamcha':
        result = handleGetReportData(payload.date);
        break;

      // --- POS BILLING & CONNECTION ---
      case 'listDailySales':
        result = handleListEntries(payload.date);
        break;

      case 'saveSale':
        result = handleAddEntry(payload, sessionUser);
        break;

      case 'cancelSale':
        result = handleCancelBill(payload.billId, payload.reason, sessionUser);
        break;

      case 'issueNewConnectionPackage':
        result = handleIssueNewConnectionPackage(payload, sessionUser);
        break;

      // --- ITEMS & RATES MASTER ---
      case 'getItemRates':
        result = getItemRates();
        break;

      case 'saveItemRate':
        result = saveItemRate(payload, sessionUser);
        break;

      case 'deleteItemRate':
        result = deleteItemRate(payload, sessionUser);
        break;

      // --- CUSTOMERS & CRM ---
      case 'listCustomers':
        result = handleListCustomers();
        break;

      case 'saveCustomer':
        result = handleSaveCustomer(payload, sessionUser);
        break;

      case 'getCustomer360':
        result = handleGetCustomer360(payload.customerId);
        break;

      // --- CUSTOMER DUES ---
      case 'listCustomerDues':
        result = handleListDues(payload.status || 'ALL');
        break;

      case 'recoverDuePayment':
        result = handleRecoverDue(payload.dueId, payload.amount, payload.payMode, payload.remarks, sessionUser);
        break;

      case 'writeOffDue':
        result = handleWriteOffDue(payload.dueId, payload.reason, sessionUser);
        break;

      // --- HAWKER DISPATCH ---
      case 'listHawkerDispatches':
        result = listHawkerDispatches(payload);
        break;

      case 'saveHawkerDispatch':
        result = saveHawkerDispatch(payload, sessionUser);
        break;

      // --- CASH REGISTER & CLOSING ---
      case 'getCashbook':
        result = getCashbook(payload.date);
        break;

      case 'saveCashbook':
        result = saveCashbook(payload, sessionUser);
        break;

      case 'closeDay':
        result = closeDay(payload, sessionUser);
        break;

      case 'unlockDay':
        result = unlockDay(payload, sessionUser);
        break;

      // --- CYLINDER STOCK ---
      case 'getStock':
        result = getStock(payload.date);
        break;

      case 'saveStock':
        result = saveStock(payload, sessionUser);
        break;

      // --- HR, ATTENDANCE & PAYROLL ---
      case 'listEmployees':
        result = handleListEmployees();
        break;

      case 'saveEmployee':
        result = handleSaveEmployee(payload, sessionUser);
        break;

      case 'deleteEmployee':
        result = handleDeleteEmployee(payload.empId, sessionUser);
        break;

      case 'getAttendance':
        result = handleGetAttendance(payload.date);
        break;

      case 'saveAttendance':
        result = handleMarkAttendance(payload.date, payload.records, sessionUser);
        break;

      case 'getSalarySheet':
        result = handleCalcSalary(payload.month);
        break;

      case 'finalizeSalary':
        result = handleFinalizeSalary(payload, sessionUser);
        break;

      // --- VENDORS & PURCHASES ---
      case 'listVendors':
        result = listVendors();
        break;

      case 'saveVendor':
        result = saveVendor(payload, sessionUser);
        break;

      case 'deleteVendor':
        result = deleteVendor(payload, sessionUser);
        break;

      case 'listPurchases':
        result = listPurchases(payload);
        break;

      case 'savePurchase':
        result = savePurchase(payload, sessionUser);
        break;

      // --- GOOGLE DRIVE ARCHIVE & BACKUP ---
      case 'listArchives':
        result = listArchives();
        break;

      case 'generateArchive':
        result = generateArchive(payload, sessionUser);
        break;

      case 'backupDatabase':
        result = backupDatabase(payload, sessionUser);
        break;

      // --- USER MANAGEMENT & AUDIT ---
      case 'listUsers':
        result = listUsers(sessionUser);
        break;

      case 'saveUser':
        result = saveUser(payload, sessionUser);
        break;

      case 'resetPassword':
        result = resetUserPassword(payload, sessionUser);
        break;

      case 'listAudit':
        result = listAudit(payload);
        break;

      case 'getSystemHealth':
        result = getSystemHealth();
        break;

      default:
        return sendError('VALIDATION', 'Unrecognized API action: ' + action);
    }

    return returnResult(result);

  } catch (globalErr) {
    console.error('API Error: ' + globalErr.toString());
    return sendError('SERVER', 'Server runtime exception: ' + globalErr.message);
  }
}

function returnResult(res) {
  if (!res) {
    return sendSuccess({}, 'Completed');
  }
  // If already a TextOutput object
  if (typeof res.getContent === 'function') {
    return res;
  }
  if (res.ok === false) {
    const errCode = (res.error && res.error.code) ? res.error.code : 'SERVER';
    const errMsg = (res.error && res.error.message) ? res.error.message : (res.message || 'Operation failed');
    return sendError(errCode, errMsg);
  }
  return sendSuccess(res.data !== undefined ? res.data : res, res.message || 'Success');
}
