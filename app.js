/**
 * ============================================================================
 * SHIV SHAKTI HP GAS AGENCY - ROJNAMCHA & BILLING ERP (Vanilla JS)
 * High-End CRM & POS Interface: Multi-Color Metrics, Desktop Sidebar Collapse
 * 100% Clean English SaaS Aesthetics
 * ============================================================================
 */

// Global State
const state = {
  token: localStorage.getItem('ss_token') || null,
  user: JSON.parse(localStorage.getItem('ss_user') || 'null'),
  apiUrl: localStorage.getItem('ss_api_url') || '/api',
  theme: localStorage.getItem('ss_theme') || 'light',
  sidebarCollapsed: localStorage.getItem('ss_sidebar_collapsed') === 'true',
  currentDate: getTodayDateString(),
  meta: {
    rates: [],
    vendors: [],
    categories: [],
    payModes: [],
    cylinderTypes: []
  },
  todayEntries: [],
  duesList: [],
  stockList: []
};

// Screen Titles (100% Clean English)
const SCREEN_TITLES = {
  'screen-login': 'Agency Portal Login',
  'screen-dashboard': 'Dashboard Overview',
  'screen-entry': 'POS Invoicing & Billing',
  'screen-vendors': 'Hawkers & Godown Dispatch',
  'screen-cashbook': 'Cash Book & Till Reconciliation',
  'screen-dues': 'Customer Dues & Credit Ledger',
  'screen-stock': 'Cylinder Inventory & Stock',
  'screen-report': 'Daily Report Sheet (A4 Print)',
  'screen-archive': 'Google Drive Cloud Archives',
  'screen-admin': 'System Administration & Masters'
};

// Default Master Rates Fallback
const DEFAULT_RATES = [
  { item: '14.2KG Domestic', category: 'SALE', rate: 1042 },
  { item: '19KG Commercial', category: 'SALE', rate: 3049 },
  { item: 'Suraksha Hose Pipe', category: 'SALE', rate: 190 },
  { item: 'Domestic Regulator (Leak/Defective)', category: 'SALE', rate: 100 },
  { item: 'Domestic Pass Book', category: 'SALE', rate: 59 },
  { item: 'PMUY Pass Book', category: 'SALE', rate: 50 },
  { item: '5 Kg Nd Rfl', category: 'SALE', rate: 845 },
  { item: 'Ftl Rgulator', category: 'SALE', rate: 350 },
  { item: '14.2KG Domestic (Defective / Leaking)', category: 'RETURN', rate: 1042 },
  { item: '19KG Commercial (Return / Exchange)', category: 'RETURN', rate: 3049 },
  { item: 'Domestic Regulator / Pipe (Return)', category: 'RETURN', rate: 0 },
  { item: '19KG Commercial (SD)', category: 'SECURITY_DEPOSIT', rate: 2400 },
  { item: '5 Kg ftl Security Refund', category: 'SD_REFUND', rate: 800 },
  { item: 'Name change (Death)', category: 'SERVICE', rate: 118 },
  { item: 'Truck Opening Charges', category: 'SERVICE', rate: 200 },
  { item: 'Administration Charge', category: 'SERVICE', rate: 118 },
  { item: 'Safety inspection', category: 'SERVICE', rate: 236 }
];

const DEFAULT_VENDORS = [
  'MONU', 'SAROJ', 'BHOGENDRA', 'RAVI PRAKASH', 'GENA LAL',
  'BECHAN', 'DINESH', 'MANTUN', 'BAJRANGI', 'SUJIT',
  'SANJAY', 'Raja Faiyazi', 'Faiyaz'
];

const DEFAULT_CYLINDER_TYPES = [
  '14.2 KG Domestic',
  '19 KG Commercial',
  '5 KG Commercial',
  '5 KG Domestic',
  '2 KG Commercial'
];

/**
 * ============================================================================
 * INITIALIZATION & AUTH LIFECYCLE
 * ============================================================================
 */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSidebarState();
  initDatePicker();
  initApiConfig();

  if (state.token && state.user) {
    applyAuthUI(true);
    fetchMetadata().then(() => {
      switchTab('screen-dashboard');
    });
  } else {
    applyAuthUI(false);
    switchTab('screen-login');
  }
});

/* Theme Controller (Day / Dark Mode) */
function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('ss_theme', state.theme);
  showToast(`${state.theme === 'dark' ? 'Night / Dark Theme' : 'Day / Light Theme'} activated`, 'info');
}

/* Sidebar Desktop Collapse & Mobile Drawer */
function initSidebarState() {
  const layout = document.getElementById('appLayout');
  if (layout && state.sidebarCollapsed && window.innerWidth > 768) {
    layout.classList.add('sidebar-collapsed');
  }
}

function toggleDesktopSidebar() {
  const layout = document.getElementById('appLayout');
  if (!layout) return;

  layout.classList.toggle('sidebar-collapsed');
  state.sidebarCollapsed = layout.classList.contains('sidebar-collapsed');
  localStorage.setItem('ss_sidebar_collapsed', state.sidebarCollapsed);
}

function toggleSidebar(forceState) {
  const sidebar = document.getElementById('appSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar) return;

  const shouldOpen = forceState !== undefined ? forceState : !sidebar.classList.contains('open');
  if (shouldOpen) {
    sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  } else {
    sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  }
}

function initDatePicker() {
  const picker = document.getElementById('globalDatePicker');
  if (picker) {
    picker.value = state.currentDate;
  }
}

function initApiConfig() {
  const customUrl = localStorage.getItem('ss_api_url');
  const input = document.getElementById('customApiUrl');
  if (input && customUrl) {
    input.value = customUrl;
  }
}

function onDateChanged() {
  const picker = document.getElementById('globalDatePicker');
  if (picker && picker.value) {
    state.currentDate = picker.value;
    loadDashboardData();
    loadTodayEntries();
    loadVendorLogData();
    loadCashbookData();
    loadStockData();
    showToast(`Date changed to ${formatDisplayDate(state.currentDate)}`, 'info');
  }
}

function applyAuthUI(isLoggedIn) {
  const bottomNav = document.getElementById('bottomNav');
  const sidebarAdminItem = document.getElementById('navSidebarAdmin');
  const sidebarUserName = document.getElementById('sidebarUserName');
  const sidebarUserRole = document.getElementById('sidebarUserRole');
  const sidebarAvatar = document.getElementById('sidebarAvatar');

  if (isLoggedIn && state.user) {
    document.body.classList.remove('user-logged-out');
    document.body.classList.add('user-logged-in');

    // Only show bottomNav on mobile (<= 768px)
    if (bottomNav && window.innerWidth <= 768) {
      bottomNav.style.display = 'flex';
    } else if (bottomNav) {
      bottomNav.style.display = 'none';
    }
    if (sidebarUserName) sidebarUserName.textContent = state.user.username;
    if (sidebarUserRole) sidebarUserRole.textContent = (state.user.role || 'cashier').toUpperCase();
    if (sidebarAvatar) sidebarAvatar.textContent = (state.user.username || 'U').charAt(0).toUpperCase();

    if (sidebarAdminItem) {
      sidebarAdminItem.style.display = (state.user.role === 'admin') ? 'flex' : 'none';
    }
  } else {
    document.body.classList.remove('user-logged-in');
    document.body.classList.add('user-logged-out');
    if (bottomNav) bottomNav.style.display = 'none';
  }
}

/**
 * ============================================================================
 * API CLIENT (POST text/plain WITH ERROR HANDLING & REDIRECT FOLLOW)
 * ============================================================================
 */
async function apiCall(action, payload = {}, showLoading = true) {
  if (showLoading) showSpinner();

  try {
    const requestBody = JSON.stringify({
      action: action,
      token: state.token,
      ...payload
    });

    const response = await fetch(state.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: requestBody,
      redirect: 'follow'
    });

    const result = await response.json();

    if (!result.ok) {
      if (result.error && (result.error.includes('Session expired') || result.error.includes('Authentication failed'))) {
        handleSessionExpired();
      }
      throw new Error(result.error || 'Server reported an error.');
    }

    return result.data;
  } catch (err) {
    showToast(err.message, 'error');
    console.error('API Error:', err);
    throw err;
  } finally {
    if (showLoading) hideSpinner();
  }
}

function handleSessionExpired() {
  localStorage.removeItem('ss_token');
  localStorage.removeItem('ss_user');
  state.token = null;
  state.user = null;
  applyAuthUI(false);
  switchTab('screen-login');
  showToast('Session expired. Please log in again.', 'warning');
}

/**
 * ============================================================================
 * AUTHENTICATION (LOGIN & LOGOUT)
 * ============================================================================
 */
async function handleLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const submitBtn = document.getElementById('btnLoginSubmit');

  if (!username || !password) {
    showToast('Please enter username and password.', 'warning');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>Verifying credentials...</span>';

  try {
    const data = await apiCall('login', { username, password });
    state.token = data.token;
    state.user = { username: data.username, role: data.role };

    localStorage.setItem('ss_token', state.token);
    localStorage.setItem('ss_user', JSON.stringify(state.user));

    applyAuthUI(true);
    showToast(`Welcome back, ${data.username}!`, 'success');
    await fetchMetadata();
    switchTab('screen-dashboard');
  } catch (err) {
    // Handled in apiCall
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <span>Sign In to System</span>
      <svg viewBox="0 0 24 24" class="svg-icon"><path d="M14 5l7 7m0 0l-7 7m7-7H3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    `;
  }
}

async function handleLogoutClick() {
  if (confirm('Are you sure you want to log out?')) {
    try {
      if (state.token) {
        await apiCall('logout', {}, false);
      }
    } catch (e) {}
    localStorage.removeItem('ss_token');
    localStorage.removeItem('ss_user');
    state.token = null;
    state.user = null;

    const uInput = document.getElementById('loginUsername');
    const pInput = document.getElementById('loginPassword');
    if (uInput) uInput.value = '';
    if (pInput) pInput.value = '';

    applyAuthUI(false);
    switchTab('screen-login');
    showToast('Logged out successfully.', 'info');
  }
}

/**
 * ============================================================================
 * METADATA
 * ============================================================================
 */
async function fetchMetadata() {
  try {
    const data = await apiCall('getMeta', {}, false);
    state.meta = {
      rates: (data && data.rates && data.rates.length) ? data.rates : DEFAULT_RATES,
      vendors: (data && data.vendors && data.vendors.length) ? data.vendors : DEFAULT_VENDORS,
      categories: data.categories || ['SALE', 'RETURN', 'SECURITY_DEPOSIT', 'SD_REFUND', 'SERVICE', 'DUES_RECEIVED'],
      payModes: data.payModes || ['CASH', 'UPI', 'HP_PAY', 'DUES', 'NEFT', 'OTHER'],
      cylinderTypes: data.cylinderTypes || DEFAULT_CYLINDER_TYPES
    };
  } catch (e) {
    state.meta = {
      rates: DEFAULT_RATES,
      vendors: DEFAULT_VENDORS,
      categories: ['SALE', 'RETURN', 'SECURITY_DEPOSIT', 'SD_REFUND', 'SERVICE', 'DUES_RECEIVED'],
      payModes: ['CASH', 'UPI', 'HP_PAY', 'DUES', 'NEFT', 'OTHER'],
      cylinderTypes: DEFAULT_CYLINDER_TYPES
    };
  }
  initPosLineItems();
}

/**
 * ============================================================================
 * TAB NAVIGATION
 * ============================================================================
 */
function switchTab(screenId) {
  if (!state.token && screenId !== 'screen-login') {
    screenId = 'screen-login';
  }

  if (screenId === 'screen-login') {
    document.body.classList.remove('user-logged-in');
    document.body.classList.add('user-logged-out');
  } else if (state.token) {
    document.body.classList.remove('user-logged-out');
    document.body.classList.add('user-logged-in');
  }

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) targetScreen.classList.add('active');

  // Update Topbar Heading
  const headingEl = document.getElementById('currentScreenTitle');
  if (headingEl && SCREEN_TITLES[screenId]) {
    headingEl.textContent = SCREEN_TITLES[screenId];
  }

  // Update Sidebar Active Link
  document.querySelectorAll('.app-sidebar .nav-link').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(screenId));
  });

  // Update Bottom Nav Active Link
  document.querySelectorAll('.mobile-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(screenId));
  });

  // Close drawer on mobile
  if (window.innerWidth <= 768) {
    toggleSidebar(false);
  }

  // Screen Data Loaders
  if (screenId === 'screen-dashboard') {
    loadDashboardData();
  } else if (screenId === 'screen-entry') {
    initPosLineItems();
    loadTodayEntries();
  } else if (screenId === 'screen-vendors') {
    loadVendorLogData();
  } else if (screenId === 'screen-cashbook') {
    loadCashbookData();
  } else if (screenId === 'screen-dues') {
    loadDuesData('PENDING');
  } else if (screenId === 'screen-stock') {
    loadStockData();
  } else if (screenId === 'screen-report') {
    loadReportData();
  } else if (screenId === 'screen-archive') {
    loadArchivesList();
  } else if (screenId === 'screen-admin') {
    loadAdminUsers();
    loadAdminRates();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * ============================================================================
 * 2. DASHBOARD
 * ============================================================================
 */
async function loadDashboardData() {
  try {
    const data = await apiCall('getDashboard', { date: state.currentDate });

    document.getElementById('kpiTotalBilling').textContent = formatINR(data.cards.totalBilling);
    document.getElementById('kpiNetCash').textContent = formatINR(data.cards.netCashInflow);
    document.getElementById('kpiDigital').textContent = formatINR(data.cards.digitalCollections);
    document.getElementById('kpiDues').textContent = formatINR(data.cards.outstandingDues);
    document.getElementById('kpiCylinders').textContent = `${data.cards.cylindersSold} Pcs`;

    const closingVal = data.cashBook ? data.cashBook.closingCash : 0;
    document.getElementById('kpiClosingCash').textContent = formatINR(closingVal);

    // Audit reconciliation banner
    const banner = document.getElementById('reconciliationBanner');
    const icon = document.getElementById('reconIcon');
    const title = document.getElementById('reconStatusTitle');
    const desc = document.getElementById('reconStatusDetail');

    if (data.reconciliation.isBalanced) {
      banner.className = 'audit-banner balanced';
      icon.textContent = '✓';
      title.textContent = 'Accounts Balanced & Reconciled';
      desc.textContent = 'Billing receipts, physical counter cash, and delivery stocks reconcile with master books.';
    } else {
      banner.className = 'audit-banner mismatch';
      icon.textContent = '⚠️';
      title.textContent = 'Audit Difference Detected';
      desc.textContent = data.reconciliation.statusText;
    }
  } catch (e) {}
}

/**
 * ============================================================================
 * 3. POS INVOICING & BILLING
 * ============================================================================
 */
/**
 * ============================================================================
 * 3. POS INVOICING & MULTI-ITEM BILLING COUNTER
 * ============================================================================
 */
const MASTER_ITEM_CATALOG = [
  // 1. Refills & Commercial Cylinders
  { id: '142_gd', item: '14.2KG Domestic (Godown)', label: '14.2 KG REFILLING GD (Godown)', category: 'SALE', rate: 1042 },
  { id: '142_hd', item: '14.2KG Domestic (Home Delivery)', label: '14.2 KG REFILLING HD (Home Delivery)', category: 'SALE', rate: 1042 },
  { id: '19_nd', item: '19KG Commercial', label: '19 KG ND REFILL (Commercial)', category: 'SALE', rate: 3049 },
  { id: '5_nd', item: '5 Kg Nd Rfl', label: '5 KG ND REFILL', category: 'SALE', rate: 845 },
  { id: '2_ftl', item: '2 Kg Nd FTL', label: '2 KG ND FTL', category: 'SALE', rate: 450 },
  { id: '142_refill', item: '14.2KG Domestic Gas Refill', label: '14.2KG Domestic Gas Refill', category: 'SALE', rate: 903 },

  // 2. Security Deposits (New Connection / SV)
  { id: 'sd_cyl', item: '14.2KG Domestic', label: '14.2 KG ND SECURITY DEPOSIT (Cylinder)', category: 'SECURITY_DEPOSIT', rate: 2200 },
  { id: 'sd_reg', item: 'Regulator', label: 'Regulator Security Deposit (A-065767)', category: 'SECURITY_DEPOSIT', rate: 250 },
  { id: 'sd_19', item: '19KG Commercial', label: '19 KG ND SECURITY DEPOSIT', category: 'SECURITY_DEPOSIT', rate: 2400 },

  // 3. Accessories & Appliances
  { id: 'pipe', item: 'Suraksha Hose Pipe', label: 'Suraksha Hose Pipe (Rubber Tube)', category: 'SALE', rate: 190 },
  { id: 'reg_leak', item: 'Domestic Regulator (Leak/Defective)', label: 'Domestic Regulator (Leak / Replacement)', category: 'SALE', rate: 100 },
  { id: 'reg_ftl', item: 'Ftl Rgulator', label: 'FTL Regulator', category: 'SALE', rate: 350 },
  { id: 'dgc', item: 'Domestic Pass Book', label: 'Domestic Pass Book (D.G.C.)', category: 'SALE', rate: 59 },
  { id: 'pmuy_pb', item: 'PMUY Pass Book', label: 'PMUY Pass Book', category: 'SALE', rate: 25 },
  { id: 'stove', item: 'Hot Plate', label: 'Hot Plate (Gas Stove)', category: 'SALE', rate: 2350 },

  // 4. Service Charges & Administrative Fees
  { id: 'srv_adm', item: 'Administration Charge', label: 'Administration Charge / Connection Fee', category: 'SERVICE', rate: 118 },
  { id: 'srv_name', item: 'Name change (Death)', label: 'Name Change (Transfer / Death)', category: 'SERVICE', rate: 118 },
  { id: 'srv_truck', item: 'Truck Opening Charges', label: 'Truck Opening Charges (Handling)', category: 'SERVICE', rate: 200 },
  { id: 'srv_safe', item: 'Safety inspection', label: 'Safety Inspection / Mechanic Visit', category: 'SERVICE', rate: 236 },

  // 5. Refunds & Deposit Outflows
  { id: 'rfnd_tv', item: 'TV Out / Deposit Refund', label: 'TV Out / Deposit Refund (14.2KG)', category: 'SD_REFUND', rate: 0 },
  { id: 'rfnd_5k', item: '5 Kg ftl Security Refund', label: '5 KG FTL Security Refund', category: 'SD_REFUND', rate: 800 },

  // 6. Defective Returns / Exchanges
  { id: 'ret_142', item: '14.2KG Domestic (Defective / Leaking)', label: '14.2KG Defective / Leaking (Return)', category: 'RETURN', rate: 1042 },
  { id: 'ret_19', item: '19KG Commercial (Return / Exchange)', label: '19KG Commercial Return / Exchange', category: 'RETURN', rate: 3049 },
  { id: 'ret_acc', item: 'Domestic Regulator / Pipe (Return)', label: 'Regulator / Pipe Return (Defect)', category: 'RETURN', rate: 0 },

  // 7. Previous Outstanding Dues Recovered
  { id: 'dues_rec', item: 'Previous Outstanding Dues Received', label: 'Previous Outstanding Dues Recovered', category: 'DUES_RECEIVED', rate: 0 }
];

let posRowCounter = 0;

function selectQuickCategory(category, btn) {
  document.querySelectorAll('.category-pill-bar .cat-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const catSelect = document.getElementById('entryCategory');
  if (catSelect) catSelect.value = category;
  onCategoryChanged();
}

function onCategoryChanged() {
  const category = document.getElementById('entryCategory')?.value;
  const ncBanner = document.getElementById('ncQuickBanner');
  if (ncBanner) {
    if (category === 'SECURITY_DEPOSIT') {
      ncBanner.classList.remove('hidden');
    } else {
      ncBanner.classList.add('hidden');
    }
  }
}

function initPosLineItems() {
  const tbody = document.getElementById('posLineItemsBody');
  if (tbody && tbody.children.length === 0) {
    addPosItemRow();
  }
}

function buildItemOptionsHtml(selectedItem = '') {
  let html = '<option value="">Select or type details...</option>';

  const groups = [
    { label: 'Cylinder Refills & Commercial', cat: ['SALE'], filter: it => it.category === 'SALE' && (it.item.includes('KG') || it.item.includes('Refill') || it.item.includes('Rfl')) },
    { label: 'Security Deposits (New Connection / SV)', cat: ['SECURITY_DEPOSIT'], filter: it => it.category === 'SECURITY_DEPOSIT' },
    { label: 'Accessories & Appliances', cat: ['SALE'], filter: it => it.category === 'SALE' && !(it.item.includes('KG') || it.item.includes('Refill') || it.item.includes('Rfl')) },
    { label: 'Service Charges & Handling Fees', cat: ['SERVICE'], filter: it => it.category === 'SERVICE' },
    { label: 'Defective Returns & Refunds', cat: ['RETURN', 'SD_REFUND'], filter: it => it.category === 'RETURN' || it.category === 'SD_REFUND' },
    { label: 'Dues Recovery', cat: ['DUES_RECEIVED'], filter: it => it.category === 'DUES_RECEIVED' }
  ];

  groups.forEach(g => {
    const items = MASTER_ITEM_CATALOG.filter(g.filter);
    if (items.length > 0) {
      html += `<optgroup label="${g.label}">`;
      items.forEach(it => {
        const isSel = (selectedItem === it.item || selectedItem === it.label) ? 'selected' : '';
        html += `<option value="${escapeHtml(it.item)}" data-rate="${it.rate}" data-category="${it.category}" data-sheetitem="${escapeHtml(it.item)}" ${isSel}>${escapeHtml(it.label)} (₹${it.rate.toFixed(2)})</option>`;
      });
      html += `</optgroup>`;
    }
  });

  return html;
}

function addPosItemRow(prefill = null) {
  const tbody = document.getElementById('posLineItemsBody');
  if (!tbody) return;

  posRowCounter++;
  const rowId = `pos_row_${posRowCounter}`;
  const tr = document.createElement('tr');
  tr.id = rowId;

  const itemVal = prefill ? (prefill.sheetItem || prefill.item) : '';
  const rateVal = prefill ? (prefill.rate !== undefined ? prefill.rate : 0) : 0;
  const qtyVal = prefill ? (prefill.qty !== undefined ? prefill.qty : 1) : 1;
  const amtVal = Math.round(rateVal * qtyVal * 100) / 100;

  tr.innerHTML = `
    <td>
      <select class="row-item-select" onchange="onPosItemSelect(this)">
        ${buildItemOptionsHtml(itemVal)}
      </select>
    </td>
    <td>
      <input type="number" class="row-rate input-modern font-mono text-right" step="0.01" min="0" value="${rateVal.toFixed(2)}" oninput="onPosRowValueChange(this)">
    </td>
    <td>
      <input type="number" class="row-qty input-modern font-mono text-center" min="1" step="1" value="${qtyVal}" oninput="onPosRowValueChange(this)">
    </td>
    <td class="text-right">
      <span class="row-amount font-mono font-bold">${formatINR(amtVal)}</span>
    </td>
    <td class="text-center">
      <button type="button" class="btn-row-del" onclick="deletePosItemRow(this)" title="Delete Row">🗑</button>
    </td>
  `;

  tbody.appendChild(tr);

  if (prefill && itemVal) {
    const sel = tr.querySelector('.row-item-select');
    if (sel) sel.value = itemVal;
  }

  calculatePosTotal();
}

function onPosItemSelect(selectEl) {
  const tr = selectEl.closest('tr');
  if (!tr) return;

  const opt = selectEl.options[selectEl.selectedIndex];
  const rateInput = tr.querySelector('.row-rate');
  const qtyInput = tr.querySelector('.row-qty');
  const amtSpan = tr.querySelector('.row-amount');

  if (opt && opt.value) {
    const rate = parseFloat(opt.dataset.rate) || 0;
    if (rateInput) rateInput.value = rate.toFixed(2);
    const qty = parseFloat(qtyInput?.value) || 1;
    if (amtSpan) amtSpan.textContent = formatINR(rate * qty);
  } else {
    if (rateInput) rateInput.value = '0.00';
    if (amtSpan) amtSpan.textContent = '₹0.00';
  }

  calculatePosTotal();
}

function onPosRowValueChange(inputEl) {
  const tr = inputEl.closest('tr');
  if (!tr) return;

  const rate = parseFloat(tr.querySelector('.row-rate')?.value) || 0;
  const qty = parseFloat(tr.querySelector('.row-qty')?.value) || 0;
  const amtSpan = tr.querySelector('.row-amount');

  if (amtSpan) {
    amtSpan.textContent = formatINR(rate * qty);
  }

  calculatePosTotal();
}

function deletePosItemRow(btnEl) {
  const tr = btnEl.closest('tr');
  if (!tr) return;

  tr.remove();

  const tbody = document.getElementById('posLineItemsBody');
  if (tbody && tbody.children.length === 0) {
    addPosItemRow();
  }

  calculatePosTotal();
}

function resetPosItemRows() {
  const tbody = document.getElementById('posLineItemsBody');
  if (tbody) tbody.innerHTML = '';
  addPosItemRow();
  calculatePosTotal();
}

function loadNewConnectionBundleToTable() {
  const tbody = document.getElementById('posLineItemsBody');
  if (tbody) tbody.innerHTML = '';

  const bundleItems = [
    { sheetItem: '14.2KG Domestic', label: '14.2 KG ND SECURITY DEPOSIT (Cylinder)', category: 'SECURITY_DEPOSIT', rate: 2200, qty: 1 },
    { sheetItem: 'Regulator', label: 'Regulator Security Deposit (A-065767)', category: 'SECURITY_DEPOSIT', rate: 250, qty: 1 },
    { sheetItem: 'Administration Charge', label: 'Administration Charge / Connection Fee', category: 'SERVICE', rate: 118, qty: 1 },
    { sheetItem: 'Suraksha Hose Pipe', label: 'Suraksha Hose Pipe (Rubber Tube)', category: 'SALE', rate: 190, qty: 1 },
    { sheetItem: 'Domestic Pass Book', label: 'Domestic Pass Book (D.G.C.)', category: 'SALE', rate: 59, qty: 1 },
    { sheetItem: 'Hot Plate', label: 'Hot Plate (Gas Stove)', category: 'SALE', rate: 2350, qty: 1 },
    { sheetItem: '14.2KG Domestic Gas Refill', label: '14.2KG Domestic Gas Refill', category: 'SALE', rate: 903, qty: 1 }
  ];

  bundleItems.forEach(item => {
    addPosItemRow(item);
  });

  calculatePosTotal();
  applyPresetSettlement('CASH');
  showToast('✨ 14.2KG New Connection Package (7 items, ₹6,070.00) loaded into table!', 'success');
}

function calculatePosTotal() {
  let total = 0;
  const rows = document.querySelectorAll('#posLineItemsBody tr');

  rows.forEach(tr => {
    const sel = tr.querySelector('.row-item-select');
    if (sel && sel.value) {
      const rate = parseFloat(tr.querySelector('.row-rate')?.value) || 0;
      const qty = parseFloat(tr.querySelector('.row-qty')?.value) || 0;
      total += (rate * qty);
    }
  });

  total = Math.round(total * 100) / 100;

  const totalDisp = document.getElementById('posLineItemsTotal');
  const entryAmt = document.getElementById('entryAmount');
  if (totalDisp) totalDisp.textContent = formatINR(total);
  if (entryAmt) entryAmt.value = total.toFixed(2);

  // Auto preset Cash if others are zero
  const upi = parseFloat(document.getElementById('settleUpi')?.value) || 0;
  const hpPay = parseFloat(document.getElementById('settleHpPay')?.value) || 0;
  const dues = parseFloat(document.getElementById('settleDues')?.value) || 0;
  const other = parseFloat(document.getElementById('settleOther')?.value) || 0;

  if (upi === 0 && hpPay === 0 && dues === 0 && other === 0) {
    const cashEl = document.getElementById('settleCash');
    if (cashEl) cashEl.value = total.toFixed(2);
  }

  validateSettlement();
}

function applyPresetSettlement(mode) {
  const total = parseFloat(document.getElementById('entryAmount')?.value) || 0;

  const cashEl = document.getElementById('settleCash');
  const upiEl = document.getElementById('settleUpi');
  const hpEl = document.getElementById('settleHpPay');
  const duesEl = document.getElementById('settleDues');
  const otherEl = document.getElementById('settleOther');

  if (cashEl) cashEl.value = mode === 'CASH' ? total.toFixed(2) : '0';
  if (upiEl) upiEl.value = mode === 'UPI' ? total.toFixed(2) : '0';
  if (hpEl) hpEl.value = mode === 'HP_PAY' ? total.toFixed(2) : '0';
  if (duesEl) duesEl.value = mode === 'DUES' ? total.toFixed(2) : '0';
  if (otherEl) otherEl.value = mode === 'OTHER' ? total.toFixed(2) : '0';

  if (mode === 'DUES') {
    const partyEl = document.getElementById('entryParty');
    if (partyEl && !partyEl.value.trim()) {
      partyEl.focus();
      showToast('Please specify Customer / Party name for Dues credit billing.', 'info');
    }
  }

  validateSettlement();
}

function onSettlementInputChanged() {
  validateSettlement();
}

function validateSettlement() {
  const totalAmount = parseFloat(document.getElementById('entryAmount')?.value) || 0;
  const cash = parseFloat(document.getElementById('settleCash')?.value) || 0;
  const upi = parseFloat(document.getElementById('settleUpi')?.value) || 0;
  const hpPay = parseFloat(document.getElementById('settleHpPay')?.value) || 0;
  const dues = parseFloat(document.getElementById('settleDues')?.value) || 0;
  const other = parseFloat(document.getElementById('settleOther')?.value) || 0;

  const totalSettled = Math.round((cash + upi + hpPay + dues + other) * 100) / 100;

  const reqEl = document.getElementById('settleTotalRequired');
  const givenEl = document.getElementById('settleTotalGiven');
  const badgeEl = document.getElementById('settleStatusBadge');
  const textEl = document.getElementById('settleStatusText');
  const iconEl = badgeEl?.querySelector('.status-indicator');

  if (reqEl) reqEl.textContent = formatINR(totalAmount);
  if (givenEl) givenEl.textContent = formatINR(totalSettled);

  const diff = Math.round((totalAmount - totalSettled) * 100) / 100;
  const isBalanced = Math.abs(diff) < 0.01;

  if (badgeEl && textEl) {
    if (isBalanced) {
      badgeEl.className = 'pos-settle-badge balanced';
      if (iconEl) iconEl.textContent = '✓';
      textEl.textContent = 'Balanced & Reconciled';
    } else {
      badgeEl.className = 'pos-settle-badge mismatch';
      if (iconEl) iconEl.textContent = '⚠️';
      if (diff > 0) {
        textEl.textContent = `Short: ₹${diff.toFixed(2)} needed`;
      } else {
        textEl.textContent = `Excess: ₹${Math.abs(diff).toFixed(2)} over`;
      }
    }
  }

  return {
    isBalanced,
    totalAmount,
    totalSettled,
    diff,
    payments: {
      CASH: cash,
      UPI: upi,
      HP_PAY: hpPay,
      DUES: dues,
      OTHER: other
    }
  };
}

async function handleEntrySubmit(e) {
  if (e) e.preventDefault();
  await submitEntryData(false);
}

async function saveAndAddAnother(e) {
  if (e) e.preventDefault();
  await submitEntryData(true);
}

async function submitEntryData(isAddAnother = false) {
  const rows = document.querySelectorAll('#posLineItemsBody tr');
  const validItems = [];

  rows.forEach(tr => {
    const sel = tr.querySelector('.row-item-select');
    if (!sel || !sel.value) return;
    const opt = sel.options[sel.selectedIndex];
    const rate = parseFloat(tr.querySelector('.row-rate')?.value) || 0;
    const qty = parseFloat(tr.querySelector('.row-qty')?.value) || 0;
    const amount = Math.round(rate * qty * 100) / 100;
    const sheetItem = opt.dataset.sheetitem || sel.value;
    const category = opt.dataset.category || 'SALE';
    const label = opt.textContent;

    validItems.push({
      item: sheetItem,
      label: label,
      category: category,
      rate: rate,
      qty: qty,
      amount: amount
    });
  });

  if (validItems.length === 0) {
    showToast('Please select at least one item from the details dropdown.', 'warning');
    return;
  }

  const settlement = validateSettlement();
  if (!settlement.isBalanced) {
    if (settlement.diff > 0) {
      showToast(`Settlement mismatch: Please allocate ₹${settlement.diff.toFixed(2)} across payment modes.`, 'error');
    } else {
      showToast(`Settlement mismatch: Over-allocated by ₹${Math.abs(settlement.diff).toFixed(2)}.`, 'error');
    }
    return;
  }

  const party = (document.getElementById('entryParty')?.value || '').trim();
  const note = (document.getElementById('entryNote')?.value || '').trim();

  if (settlement.payments.DUES > 0 && !party) {
    showToast('Customer / Party name is required when billing on Dues (credit account).', 'warning');
    document.getElementById('entryParty')?.focus();
    return;
  }

  const saveBtn = document.getElementById('btnSaveEntry');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span>Saving...</span>';

  try {
    const packagePayload = {
      date: state.currentDate,
      party: party,
      svNumber: note,
      items: validItems,
      payments: settlement.payments
    };

    await apiCall('issueNewConnectionPackage', { packageData: packagePayload });
    showToast(`Bill saved successfully (${validItems.length} items, ₹${settlement.totalAmount.toFixed(2)})!`, 'success');

    if (isAddAnother) {
      resetPosItemRows();
      const pInput = document.getElementById('entryParty');
      if (pInput) pInput.value = '';
      const nInput = document.getElementById('entryNote');
      if (nInput) nInput.value = '';
    } else {
      resetEntryForm();
    }

    await loadTodayEntries();
    await loadDashboardData();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Failed to save bill.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<span>Save Bill</span>';
  }
}

function resetEntryForm() {
  const form = document.getElementById('entryForm');
  if (form) form.reset();
  const pInput = document.getElementById('entryParty');
  if (pInput) pInput.value = '';
  const nInput = document.getElementById('entryNote');
  if (nInput) nInput.value = '';

  const cashEl = document.getElementById('settleCash');
  const upiEl = document.getElementById('settleUpi');
  const hpEl = document.getElementById('settleHpPay');
  const duesEl = document.getElementById('settleDues');
  const otherEl = document.getElementById('settleOther');

  if (cashEl) cashEl.value = '0';
  if (upiEl) upiEl.value = '0';
  if (hpEl) hpEl.value = '0';
  if (duesEl) duesEl.value = '0';
  if (otherEl) otherEl.value = '0';

  resetPosItemRows();
}

async function loadTodayEntries() {
  try {
    const data = await apiCall('listEntries', { date: state.currentDate }, false);
    state.todayEntries = data.entries || [];
    renderTodayEntriesTable(state.todayEntries);
  } catch (e) {}
}

function renderTodayEntriesTable(entries) {
  const tbody = document.getElementById('entriesTableBody');
  const countBadge = document.getElementById('entriesCountBadge');
  countBadge.textContent = `${entries.length} bills`;

  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-state">No bills recorded for ${formatDisplayDate(state.currentDate)}.</td></tr>`;
    return;
  }

  tbody.innerHTML = entries.map(e => `
    <tr>
      <td><small class="font-mono">${e.time || '--'}</small></td>
      <td><span class="badge-pill bg-purple-soft">${e.category}</span></td>
      <td><strong>${escapeHtml(e.item)}</strong></td>
      <td class="text-center font-mono">${e.qty}</td>
      <td class="text-right font-mono">₹${e.rate}</td>
      <td class="text-right font-mono font-bold">${formatINR(e.amount)}</td>
      <td><span class="variance-chip">${e.payMode}</span></td>
      <td>${escapeHtml(e.party || '-')}</td>
      <td><small>${escapeHtml(e.enteredBy)}</small></td>
      <td class="text-center">
        <button class="btn-erp-outline btn-sm text-danger" onclick="deleteEntryClick('${e.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

async function deleteEntryClick(id) {
  if (confirm('Are you sure you want to delete this bill entry?')) {
    try {
      await apiCall('deleteEntry', { id });
      showToast('Bill deleted successfully.', 'success');
      loadTodayEntries();
      loadDashboardData();
    } catch (e) {}
  }
}

/**
 * ============================================================================
 * 3.1. NEW CONNECTION 14.2KG PACKAGE (SV BUNDLE)
 * ============================================================================
 */
const NC_BUNDLE_CONFIG = [
  { id: 'cyl', item: '14.2KG Domestic', label: 'Cylinder security (14.2 Kg)', category: 'SECURITY_DEPOSIT', rate: 2200 },
  { id: 'reg', item: 'Regulator', label: 'Regulator (A-065767)', category: 'SECURITY_DEPOSIT', rate: 250 },
  { id: 'adm', item: 'Administration Charge', label: 'Administration Charge', category: 'SERVICE', rate: 118 },
  { id: 'pipe', item: 'Suraksha Hose Pipe', label: 'Suraksha Hose Pipe', category: 'SALE', rate: 190 },
  { id: 'dgc', item: 'Domestic Pass Book', label: 'D.G.C. (Domestic Pass Book)', category: 'SALE', rate: 59 },
  { id: 'stove', item: 'Hot Plate', label: 'Hot Plate (Gas Stove)', category: 'SALE', rate: 2350 },
  { id: 'gas', item: '14.2KG Domestic Gas Refill', label: 'Gas (14.2KG Refill Gas)', category: 'SALE', rate: 903 }
];

function openNewConnectionModal() {
  const partyInput = document.getElementById('entryParty');
  const ncParty = document.getElementById('ncCustomerName');
  if (partyInput && ncParty && partyInput.value.trim()) {
    ncParty.value = partyInput.value.trim();
  }

  // Ensure all 7 items are checked by default
  NC_BUNDLE_CONFIG.forEach(cfg => {
    const cb = document.getElementById(`ncItem_${cfg.id}`);
    if (cb) cb.checked = true;
  });

  calculatePackageTotal();
  applyNcPresetSettlement('CASH');
  openModal('modalNewConnectionPackage');
}

function calculatePackageTotal() {
  let total = 0;
  NC_BUNDLE_CONFIG.forEach(cfg => {
    const cb = document.getElementById(`ncItem_${cfg.id}`);
    const isChecked = cb ? cb.checked : true;
    if (isChecked) {
      total += cfg.rate;
    }
  });

  const dispEl = document.getElementById('ncPackageTotalDisplay');
  const reqEl = document.getElementById('ncTotalRequired');
  if (dispEl) dispEl.textContent = formatINR(total);
  if (reqEl) reqEl.textContent = formatINR(total);

  onNcSettlementChanged();
}

function applyNcPresetSettlement(mode) {
  let total = 0;
  NC_BUNDLE_CONFIG.forEach(cfg => {
    const cb = document.getElementById(`ncItem_${cfg.id}`);
    if (cb && cb.checked) total += cfg.rate;
  });

  const cashEl = document.getElementById('ncSettleCash');
  const upiEl = document.getElementById('ncSettleUpi');
  const hpEl = document.getElementById('ncSettleHpPay');
  const duesEl = document.getElementById('ncSettleDues');
  const otherEl = document.getElementById('ncSettleOther');

  if (cashEl) cashEl.value = mode === 'CASH' ? total.toFixed(2) : '0';
  if (upiEl) upiEl.value = mode === 'UPI' ? total.toFixed(2) : '0';
  if (hpEl) hpEl.value = mode === 'HP_PAY' ? total.toFixed(2) : '0';
  if (duesEl) duesEl.value = mode === 'DUES' ? total.toFixed(2) : '0';
  if (otherEl) otherEl.value = mode === 'OTHER' ? total.toFixed(2) : '0';

  onNcSettlementChanged();
}

function onNcSettlementChanged() {
  let packageTotal = 0;
  NC_BUNDLE_CONFIG.forEach(cfg => {
    const cb = document.getElementById(`ncItem_${cfg.id}`);
    if (cb && cb.checked) packageTotal += cfg.rate;
  });

  const cash = parseFloat(document.getElementById('ncSettleCash')?.value) || 0;
  const upi = parseFloat(document.getElementById('ncSettleUpi')?.value) || 0;
  const hpPay = parseFloat(document.getElementById('ncSettleHpPay')?.value) || 0;
  const dues = parseFloat(document.getElementById('ncSettleDues')?.value) || 0;
  const other = parseFloat(document.getElementById('ncSettleOther')?.value) || 0;

  const totalSettled = Math.round((cash + upi + hpPay + dues + other) * 100) / 100;

  const reqEl = document.getElementById('ncTotalRequired');
  const givenEl = document.getElementById('ncTotalGiven');
  const badgeEl = document.getElementById('ncStatusBadge');
  const textEl = document.getElementById('ncStatusText');
  const iconEl = badgeEl?.querySelector('.status-indicator');

  if (reqEl) reqEl.textContent = formatINR(packageTotal);
  if (givenEl) givenEl.textContent = formatINR(totalSettled);

  const diff = Math.round((packageTotal - totalSettled) * 100) / 100;
  const isBalanced = Math.abs(diff) < 0.01;

  if (badgeEl && textEl) {
    if (isBalanced) {
      badgeEl.className = 'pos-settle-badge balanced';
      if (iconEl) iconEl.textContent = '✓';
      textEl.textContent = 'Balanced & Reconciled';
    } else {
      badgeEl.className = 'pos-settle-badge mismatch';
      if (iconEl) iconEl.textContent = '⚠️';
      if (diff > 0) {
        textEl.textContent = `Short: ₹${diff.toFixed(2)} needed`;
      } else {
        textEl.textContent = `Excess: ₹${Math.abs(diff).toFixed(2)} over`;
      }
    }
  }

  return {
    isBalanced,
    packageTotal,
    totalSettled,
    diff,
    payments: {
      CASH: cash,
      UPI: upi,
      HP_PAY: hpPay,
      DUES: dues,
      OTHER: other
    }
  };
}

async function handleNewConnectionSubmit(e) {
  if (e) e.preventDefault();

  const party = (document.getElementById('ncCustomerName')?.value || '').trim();
  const svNumber = (document.getElementById('ncSvNumber')?.value || '').trim();

  const settlement = onNcSettlementChanged();
  if (settlement.payments.DUES > 0 && !party) {
    showToast('Customer / Party name is required when billing on Dues (credit account).', 'warning');
    document.getElementById('ncCustomerName')?.focus();
    return;
  }

  const activeItems = [];
  NC_BUNDLE_CONFIG.forEach(cfg => {
    const cb = document.getElementById(`ncItem_${cfg.id}`);
    if (cb && cb.checked) {
      activeItems.push({
        id: cfg.id,
        item: cfg.item,
        label: cfg.label,
        category: cfg.category,
        rate: cfg.rate,
        qty: 1,
        amount: cfg.rate
      });
    }
  });

  if (activeItems.length === 0) {
    showToast('Please select at least one item in the connection package.', 'warning');
    return;
  }

  settlement = onNcSettlementChanged();
  if (!settlement.isBalanced) {
    if (settlement.diff > 0) {
      showToast(`Settlement mismatch: Please allocate ₹${settlement.diff.toFixed(2)} across payment modes.`, 'error');
    } else {
      showToast(`Settlement mismatch: Over-allocated by ₹${Math.abs(settlement.diff).toFixed(2)}.`, 'error');
    }
    return;
  }

  const submitBtn = document.getElementById('btnIssuePackageSubmit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Saving 7 Items to Ledger...</span>';
  }

  try {
    const packagePayload = {
      date: state.currentDate,
      party: party,
      svNumber: svNumber,
      items: activeItems,
      payments: settlement.payments
    };

    await apiCall('issueNewConnectionPackage', { packageData: packagePayload });
    showToast(`New Connection Package (${activeItems.length} items, ₹${settlement.packageTotal.toFixed(2)}) issued successfully!`, 'success');
    closeModal('modalNewConnectionPackage');

    // Reset customer name in modal
    const custInput = document.getElementById('ncCustomerName');
    if (custInput) custInput.value = '';
    const svInput = document.getElementById('ncSvNumber');
    if (svInput) svInput.value = '';

    // Refresh all views & dashboard
    await loadTodayEntries();
    await loadDashboardData();
  } catch (err) {
    console.error('Error issuing new connection package:', err);
    showToast(err.message || 'Failed to issue new connection package.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Issue Connection & Save 7 Items</span>';
    }
  }
}

/**
 * ============================================================================
 * 4. VENDOR DISPATCH
 * ============================================================================
 */
async function loadVendorLogData() {
  const vendors = state.meta.vendors.filter(v => v !== 'GODOWN');
  const tbody = document.getElementById('vendorTableBody');
  const tfoot = document.getElementById('vendorTableFoot');

  tbody.innerHTML = vendors.map((v, idx) => `
    <tr data-vendor="${v}">
      <td class="text-center font-mono">${idx + 1}</td>
      <td><strong>${v}</strong></td>
      <td class="text-center"><input type="number" class="v-gas font-mono" value="0" min="0" oninput="calculateVendorRow(this)"></td>
      <td class="text-center"><input type="number" class="v-cash font-mono" value="0" min="0" oninput="calculateVendorRow(this)"></td>
      <td class="text-center"><input type="number" class="v-upi font-mono" value="0" min="0" oninput="calculateVendorRow(this)"></td>
      <td class="text-center"><input type="number" class="v-hp font-mono" value="0" min="0" oninput="calculateVendorRow(this)"></td>
      <td class="text-center"><input type="number" class="v-dues font-mono" value="0" min="0" oninput="calculateVendorRow(this)"></td>
      <td class="v-status text-center"><span class="variance-chip">Balanced</span></td>
    </tr>
  `).join('');

  tfoot.innerHTML = `
    <tr class="table-info font-bold">
      <td colspan="2">DELIVERY TOTAL</td>
      <td id="footDelivGas" class="text-center font-mono">0</td>
      <td id="footDelivCash" class="text-center font-mono">0</td>
      <td id="footDelivUpi" class="text-center font-mono">0</td>
      <td id="footDelivHp" class="text-center font-mono">0</td>
      <td id="footDelivDues" class="text-center font-mono">0</td>
      <td id="footDelivStatus" class="text-center"><span class="variance-chip">Balanced</span></td>
    </tr>
    <tr data-vendor="GODOWN" class="font-bold">
      <td colspan="2">GODOWN COUNTER</td>
      <td class="text-center"><input type="number" class="v-gas font-mono" id="godownGas" value="0" min="0" oninput="calculateVendorTotals()"></td>
      <td class="text-center"><input type="number" class="v-cash font-mono" id="godownCash" value="0" min="0" oninput="calculateVendorTotals()"></td>
      <td class="text-center"><input type="number" class="v-upi font-mono" id="godownUpi" value="0" min="0" oninput="calculateVendorTotals()"></td>
      <td class="text-center"><input type="number" class="v-hp font-mono" id="godownHp" value="0" min="0" oninput="calculateVendorTotals()"></td>
      <td class="text-center"><input type="number" class="v-dues font-mono" id="godownDues" value="0" min="0" oninput="calculateVendorTotals()"></td>
      <td id="godownStatus" class="text-center"><span class="variance-chip">Balanced</span></td>
    </tr>
    <tr class="table-primary font-bold" style="font-size: 0.95rem;">
      <td colspan="2">GRAND TOTAL</td>
      <td id="footGrandGas" class="text-center font-mono text-primary">0</td>
      <td id="footGrandCash" class="text-center font-mono text-emerald">0</td>
      <td id="footGrandUpi" class="text-center font-mono text-purple">0</td>
      <td id="footGrandHp" class="text-center font-mono">0</td>
      <td id="footGrandDues" class="text-center font-mono text-amber">0</td>
      <td id="footGrandStatus" class="text-center"><span class="variance-chip">Balanced</span></td>
    </tr>
  `;

  calculateVendorTotals();
}

function calculateVendorRow(input) {
  const tr = input.closest('tr');
  const gas = parseFloat(tr.querySelector('.v-gas').value) || 0;
  const cash = parseFloat(tr.querySelector('.v-cash').value) || 0;
  const upi = parseFloat(tr.querySelector('.v-upi').value) || 0;
  const hp = parseFloat(tr.querySelector('.v-hp').value) || 0;
  const dues = parseFloat(tr.querySelector('.v-dues').value) || 0;

  const totalSettled = cash + upi + hp + dues;
  const statusCell = tr.querySelector('.v-status');

  if (gas === totalSettled) {
    statusCell.innerHTML = `<span class="variance-chip">Balanced</span>`;
  } else {
    statusCell.innerHTML = `<span class="variance-chip mismatch">Diff: ${gas - totalSettled}</span>`;
  }

  calculateVendorTotals();
}

function calculateVendorTotals() {
  let delivGas = 0, delivCash = 0, delivUpi = 0, delivHp = 0, delivDues = 0;

  document.querySelectorAll('#vendorTableBody tr').forEach(tr => {
    delivGas += parseFloat(tr.querySelector('.v-gas').value) || 0;
    delivCash += parseFloat(tr.querySelector('.v-cash').value) || 0;
    delivUpi += parseFloat(tr.querySelector('.v-upi').value) || 0;
    delivHp += parseFloat(tr.querySelector('.v-hp').value) || 0;
    delivDues += parseFloat(tr.querySelector('.v-dues').value) || 0;
  });

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('footDelivGas', delivGas);
  setEl('footDelivCash', delivCash);
  setEl('footDelivUpi', delivUpi);
  setEl('footDelivHp', delivHp);
  setEl('footDelivDues', delivDues);

  const godownGas = parseFloat(document.getElementById('godownGas')?.value) || 0;
  const godownCash = parseFloat(document.getElementById('godownCash')?.value) || 0;
  const godownUpi = parseFloat(document.getElementById('godownUpi')?.value) || 0;
  const godownHp = parseFloat(document.getElementById('godownHp')?.value) || 0;
  const godownDues = parseFloat(document.getElementById('godownDues')?.value) || 0;

  const grandGas = delivGas + godownGas;
  const grandCash = delivCash + godownCash;
  const grandUpi = delivUpi + godownUpi;
  const grandHp = delivHp + godownHp;
  const grandDues = delivDues + godownDues;

  setEl('footGrandGas', grandGas);
  setEl('footGrandCash', grandCash);
  setEl('footGrandUpi', grandUpi);
  setEl('footGrandHp', grandHp);
  setEl('footGrandDues', grandDues);

  setEl('vendorSumDelivery', `${delivGas} Cylinders`);
  setEl('vendorSumGodown', `${godownGas} Cylinders`);
  setEl('vendorSumGrand', `${grandGas} Cylinders`);
}

async function saveVendorLogData() {
  const rows = [];
  document.querySelectorAll('#vendorLogTable tr[data-vendor]').forEach(tr => {
    rows.push({
      vendor: tr.dataset.vendor,
      gasGiven: parseFloat(tr.querySelector('.v-gas').value) || 0,
      cash: parseFloat(tr.querySelector('.v-cash').value) || 0,
      upi: parseFloat(tr.querySelector('.v-upi').value) || 0,
      hpPay: parseFloat(tr.querySelector('.v-hp').value) || 0,
      dues: parseFloat(tr.querySelector('.v-dues').value) || 0
    });
  });

  try {
    await apiCall('saveVendorLog', { date: state.currentDate, logs: rows });
    showToast('Vendor dispatch log saved successfully!', 'success');
    loadDashboardData();
  } catch (e) {}
}

/**
 * ============================================================================
 * 5. CASH BOOK & TILL RECONCILIATION
 * ============================================================================
 */
async function loadCashbookData() {
  try {
    const dash = await apiCall('getDashboard', { date: state.currentDate }, false);
    const cb = dash.cashBook;

    document.getElementById('cbCashFromSales').value = dash.cards.netCashInflow || 0;

    if (cb) {
      document.getElementById('cbOpeningCash').value = cb.openingCash;
      document.getElementById('cbBankDeposit').value = cb.bankDeposit;
      document.getElementById('cbCashMadhubani').value = cb.cashSentMadhubani;
      document.getElementById('cbCashThakurJi').value = cb.cashTransferThakurJi;
      document.getElementById('cbPettyExpenses').value = cb.pettyExpenses;

      document.getElementById('note500').value = cb.d500 || 0;
      document.getElementById('note200').value = cb.d200 || 0;
      document.getElementById('note100').value = cb.d100 || 0;
      document.getElementById('note50').value = cb.d50 || 0;
      document.getElementById('note20').value = cb.d20 || 0;
      document.getElementById('note10').value = cb.d10 || 0;
      document.getElementById('note5').value = cb.d5 || 0;
      document.getElementById('note2').value = cb.d2 || 0;
      document.getElementById('note1').value = cb.d1 || 0;
    }

    calculateCashBook();
    calculateDenominations();
  } catch (e) {}
}

function calculateCashBook() {
  const opening = parseFloat(document.getElementById('cbOpeningCash').value) || 0;
  const salesCash = parseFloat(document.getElementById('cbCashFromSales').value) || 0;
  const totalInflow = opening + salesCash;

  const bankDeposit = parseFloat(document.getElementById('cbBankDeposit').value) || 0;
  const madhubani = parseFloat(document.getElementById('cbCashMadhubani').value) || 0;
  const thakurJi = parseFloat(document.getElementById('cbCashThakurJi').value) || 0;
  const petty = parseFloat(document.getElementById('cbPettyExpenses').value) || 0;

  const totalOutflowBefore = bankDeposit + madhubani + thakurJi + petty;
  const computedClosing = totalInflow - totalOutflowBefore;

  document.getElementById('cbTotalInflow').textContent = formatINR(totalInflow);
  document.getElementById('cbTotalOutflowBefore').textContent = formatINR(totalOutflowBefore);
  document.getElementById('cbComputedClosing').textContent = formatINR(computedClosing);

  verifyDenominationsVsBook(computedClosing);
}

function calculateDenominations() {
  const denominations = [
    { id: 'note500', valId: 'val500', mult: 500 },
    { id: 'note200', valId: 'val200', mult: 200 },
    { id: 'note100', valId: 'val100', mult: 100 },
    { id: 'note50',  valId: 'val50',  mult: 50 },
    { id: 'note20',  valId: 'val20',  mult: 20 },
    { id: 'note10',  valId: 'val10',  mult: 10 },
    { id: 'note5',   valId: 'val5',   mult: 5 },
    { id: 'note2',   valId: 'val2',   mult: 2 },
    { id: 'note1',   valId: 'val1',   mult: 1 }
  ];

  let totalCount = 0;
  let totalVal = 0;

  denominations.forEach(d => {
    const count = parseInt(document.getElementById(d.id).value) || 0;
    const subtotal = count * d.mult;
    document.getElementById(d.valId).textContent = formatINR(subtotal);
    totalCount += count;
    totalVal += subtotal;
  });

  document.getElementById('totalNotesCount').textContent = `${totalCount} Pcs`;
  document.getElementById('totalPhysicalVal').textContent = formatINR(totalVal);

  const opening = parseFloat(document.getElementById('cbOpeningCash').value) || 0;
  const salesCash = parseFloat(document.getElementById('cbCashFromSales').value) || 0;
  const totalInflow = opening + salesCash;
  const bankDeposit = parseFloat(document.getElementById('cbBankDeposit').value) || 0;
  const madhubani = parseFloat(document.getElementById('cbCashMadhubani').value) || 0;
  const thakurJi = parseFloat(document.getElementById('cbCashThakurJi').value) || 0;
  const petty = parseFloat(document.getElementById('cbPettyExpenses').value) || 0;
  const computedClosing = totalInflow - (bankDeposit + madhubani + thakurJi + petty);

  verifyDenominationsVsBook(computedClosing);
}

function verifyDenominationsVsBook(bookClosing) {
  const physicalCash = getPhysicalCashTotal();
  const variance = physicalCash - bookClosing;

  const badge = document.getElementById('denomVarianceBadge');
  const verdictBox = document.getElementById('denomVerdictBox');
  const verdictIcon = document.getElementById('denomVerdictIcon');
  const verdictText = document.getElementById('denomVerdictText');

  badge.textContent = `Variance: ${formatINR(variance)}`;

  if (Math.abs(variance) < 0.01) {
    badge.className = 'variance-chip';
    verdictBox.className = 'verdict-card';
    verdictIcon.textContent = '✓';
    verdictText.textContent = 'Physical till notes match book closing balance perfectly!';
  } else {
    badge.className = 'variance-chip mismatch';
    verdictBox.className = 'verdict-card mismatch';
    verdictIcon.textContent = '⚠️';
    verdictText.textContent = `Till Discrepancy: Physical cash differs from book by ${formatINR(variance)}!`;
  }
}

function getPhysicalCashTotal() {
  const d500 = (parseInt(document.getElementById('note500').value) || 0) * 500;
  const d200 = (parseInt(document.getElementById('note200').value) || 0) * 200;
  const d100 = (parseInt(document.getElementById('note100').value) || 0) * 100;
  const d50 = (parseInt(document.getElementById('note50').value) || 0) * 50;
  const d20 = (parseInt(document.getElementById('note20').value) || 0) * 20;
  const d10 = (parseInt(document.getElementById('note10').value) || 0) * 10;
  const d5 = (parseInt(document.getElementById('note5').value) || 0) * 5;
  const d2 = (parseInt(document.getElementById('note2').value) || 0) * 2;
  const d1 = (parseInt(document.getElementById('note1').value) || 0) * 1;
  return d500 + d200 + d100 + d50 + d20 + d10 + d5 + d2 + d1;
}

async function saveCashbookData() {
  const opening = parseFloat(document.getElementById('cbOpeningCash').value) || 0;
  const bankDeposit = parseFloat(document.getElementById('cbBankDeposit').value) || 0;
  const madhubani = parseFloat(document.getElementById('cbCashMadhubani').value) || 0;
  const thakurJi = parseFloat(document.getElementById('cbCashThakurJi').value) || 0;
  const petty = parseFloat(document.getElementById('cbPettyExpenses').value) || 0;
  const salesCash = parseFloat(document.getElementById('cbCashFromSales').value) || 0;
  const computedClosing = (opening + salesCash) - (bankDeposit + madhubani + thakurJi + petty);

  const payload = {
    openingCash: opening,
    bankDeposit: bankDeposit,
    cashSentMadhubani: madhubani,
    cashTransferThakurJi: thakurJi,
    pettyExpenses: petty,
    d500: parseInt(document.getElementById('note500').value) || 0,
    d200: parseInt(document.getElementById('note200').value) || 0,
    d100: parseInt(document.getElementById('note100').value) || 0,
    d50: parseInt(document.getElementById('note50').value) || 0,
    d20: parseInt(document.getElementById('note20').value) || 0,
    d10: parseInt(document.getElementById('note10').value) || 0,
    d5: parseInt(document.getElementById('note5').value) || 0,
    d2: parseInt(document.getElementById('note2').value) || 0,
    d1: parseInt(document.getElementById('note1').value) || 0,
    closingCash: computedClosing
  };

  try {
    await apiCall('saveCashbook', { date: state.currentDate, data: payload });
    showToast('Cash Book saved successfully!', 'success');
    loadDashboardData();
  } catch (e) {}
}

/**
 * ============================================================================
 * 6. DUES & CREDIT LEDGER
 * ============================================================================
 */
async function loadDuesData(filterStatus = 'PENDING') {
  try {
    const data = await apiCall('listDues', { status: filterStatus === 'ALL' ? null : filterStatus });
    state.duesList = data.dues || [];
    renderDuesTable(state.duesList);
  } catch (e) {}
}

function filterDuesTable(status, btn) {
  document.querySelectorAll('#screen-dues .filter-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadDuesData(status);
}

function renderDuesTable(dues) {
  const tbody = document.getElementById('duesTableBody');
  if (!dues.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No dues records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = dues.map(d => `
    <tr>
      <td class="font-mono">${formatDisplayDate(d.date)}</td>
      <td><strong>${escapeHtml(d.party)}</strong></td>
      <td class="font-mono">${formatDisplayDate(d.billDate)}</td>
      <td class="text-right font-mono font-bold text-danger">${formatINR(d.amount)}</td>
      <td>
        <span class="variance-chip ${d.status === 'RECOVERED' ? '' : 'mismatch'}">${d.status}</span>
      </td>
      <td class="font-mono">${d.recoveredDate ? formatDisplayDate(d.recoveredDate) : '-'}</td>
      <td class="text-center">
        ${d.status === 'PENDING' ? `
          <button class="btn-erp-primary btn-sm" onclick="openRecoverDueModal('${d.rowId}', '${escapeHtml(d.party)}', ${d.amount})">
            Collect Payment
          </button>
        ` : '<span>✓ Settled</span>'}
      </td>
    </tr>
  `).join('');
}

function openAddDueModal() {
  document.getElementById('dueParty').value = '';
  document.getElementById('dueAmount').value = '';
  document.getElementById('dueBillDate').value = state.currentDate;
  openModal('modalAddDue');
}

async function handleAddDueSubmit(e) {
  e.preventDefault();
  const party = document.getElementById('dueParty').value.trim();
  const amount = parseFloat(document.getElementById('dueAmount').value) || 0;
  const billDate = document.getElementById('dueBillDate').value;

  try {
    await apiCall('addDue', {
      due: { date: state.currentDate, party, amount, billDate }
    });
    closeModal('modalAddDue');
    showToast('Customer due record added successfully.', 'success');
    loadDuesData('PENDING');
  } catch (e) {}
}

function openRecoverDueModal(rowId, party, amount) {
  document.getElementById('recoverDueRowId').value = rowId;
  document.getElementById('recoverPartyName').value = party;
  document.getElementById('recoverAmount').value = amount;
  openModal('modalRecoverDue');
}

async function handleRecoverDueSubmit(e) {
  e.preventDefault();
  const rowId = document.getElementById('recoverDueRowId').value;
  const payMode = document.getElementById('recoverPayMode').value;

  try {
    await apiCall('recoverDue', {
      dueId: rowId,
      recoveredDate: state.currentDate,
      payMode: payMode
    });
    closeModal('modalRecoverDue');
    showToast('Due recovered and credited to daily sales!', 'success');
    loadDuesData('PENDING');
    loadDashboardData();
  } catch (e) {}
}

/**
 * ============================================================================
 * 7. CYLINDER STOCK & INVENTORY
 * ============================================================================
 */
async function loadStockData() {
  const tbody = document.getElementById('stockTableBody');
  const tfoot = document.getElementById('stockTableFoot');

  tbody.innerHTML = state.meta.cylinderTypes.map(c => `
    <tr data-type="${c}">
      <td><strong>${c}</strong></td>
      <td><input type="number" class="st-op-fill input-modern font-mono text-center" value="0" min="0" oninput="calculateStockTotals()"></td>
      <td><input type="number" class="st-rec-hpcl input-modern font-mono text-center" value="0" min="0" oninput="calculateStockTotals()"></td>
      <td><input type="number" class="st-sold input-modern font-mono text-center" value="0" min="0" oninput="calculateStockTotals()"></td>
      <td><input type="number" class="st-adj input-modern font-mono text-center" value="0" oninput="calculateStockTotals()"></td>
      <td class="st-cl-fill text-center font-mono font-bold">0</td>
      <td><input type="number" class="st-op-emp input-modern font-mono text-center" value="0" min="0" oninput="calculateStockTotals()"></td>
      <td><input type="number" class="st-cust-emp input-modern font-mono text-center" value="0" min="0" oninput="calculateStockTotals()"></td>
      <td><input type="number" class="st-oth-emp input-modern font-mono text-center" value="0" min="0" oninput="calculateStockTotals()"></td>
      <td><input type="number" class="st-plant-emp input-modern font-mono text-center" value="0" min="0" oninput="calculateStockTotals()"></td>
      <td class="st-cl-emp text-center font-mono font-bold">0</td>
    </tr>
  `).join('');

  tfoot.innerHTML = `
    <tr class="table-primary font-bold">
      <td>TOTAL</td>
      <td id="totOpFill" class="text-center font-mono">0</td>
      <td id="totRecHpcl" class="text-center font-mono">0</td>
      <td id="totSold" class="text-center font-mono">0</td>
      <td id="totAdj" class="text-center font-mono">0</td>
      <td id="totClFill" class="text-center font-mono text-primary">0</td>
      <td id="totOpEmp" class="text-center font-mono">0</td>
      <td id="totCustEmp" class="text-center font-mono">0</td>
      <td id="totOthEmp" class="text-center font-mono">0</td>
      <td id="totPlantEmp" class="text-center font-mono">0</td>
      <td id="totClEmp" class="text-center font-mono text-danger">0</td>
    </tr>
  `;

  calculateStockTotals();
}

function calculateStockTotals() {
  let totOpFill = 0, totRecHpcl = 0, totSold = 0, totAdj = 0, totClFill = 0;
  let totOpEmp = 0, totCustEmp = 0, totOthEmp = 0, totPlantEmp = 0, totClEmp = 0;

  document.querySelectorAll('#stockTableBody tr').forEach(tr => {
    const opFill = parseFloat(tr.querySelector('.st-op-fill').value) || 0;
    const recHpcl = parseFloat(tr.querySelector('.st-rec-hpcl').value) || 0;
    const sold = parseFloat(tr.querySelector('.st-sold').value) || 0;
    const adj = parseFloat(tr.querySelector('.st-adj').value) || 0;
    const clFill = (opFill + recHpcl) - sold + adj;
    tr.querySelector('.st-cl-fill').textContent = clFill;

    const opEmp = parseFloat(tr.querySelector('.st-op-emp').value) || 0;
    const custEmp = parseFloat(tr.querySelector('.st-cust-emp').value) || 0;
    const othEmp = parseFloat(tr.querySelector('.st-oth-emp').value) || 0;
    const plantEmp = parseFloat(tr.querySelector('.st-plant-emp').value) || 0;
    const clEmp = (opEmp + custEmp + othEmp) - plantEmp;
    tr.querySelector('.st-cl-emp').textContent = clEmp;

    totOpFill += opFill;
    totRecHpcl += recHpcl;
    totSold += sold;
    totAdj += adj;
    totClFill += clFill;

    totOpEmp += opEmp;
    totCustEmp += custEmp;
    totOthEmp += othEmp;
    totPlantEmp += plantEmp;
    totClEmp += clEmp;
  });

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('totOpFill', totOpFill);
  setEl('totRecHpcl', totRecHpcl);
  setEl('totSold', totSold);
  setEl('totAdj', totAdj);
  setEl('totClFill', totClFill);

  setEl('totOpEmp', totOpEmp);
  setEl('totCustEmp', totCustEmp);
  setEl('totOthEmp', totOthEmp);
  setEl('totPlantEmp', totPlantEmp);
  setEl('totClEmp', totClEmp);
}

async function saveStockData() {
  const stockRows = [];
  document.querySelectorAll('#stockTableBody tr').forEach(tr => {
    stockRows.push({
      cylinderType: tr.dataset.type,
      openingFilled: parseFloat(tr.querySelector('.st-op-fill').value) || 0,
      receivedHPCL: parseFloat(tr.querySelector('.st-rec-hpcl').value) || 0,
      soldDelivered: parseFloat(tr.querySelector('.st-sold').value) || 0,
      adjustment: parseFloat(tr.querySelector('.st-adj').value) || 0,
      openingEmpty: parseFloat(tr.querySelector('.st-op-emp').value) || 0,
      emptyReceived: parseFloat(tr.querySelector('.st-cust-emp').value) || 0,
      emptySentPlant: parseFloat(tr.querySelector('.st-plant-emp').value) || 0
    });
  });

  try {
    await apiCall('saveStock', { date: state.currentDate, data: stockRows });
    showToast('Cylinder stock inventory saved successfully!', 'success');
  } catch (e) {}
}

/**
 * ============================================================================
 * 8. REPORT PREVIEW & ARCHIVE GENERATION
 * ============================================================================
 */
async function loadReportData() {
  try {
    const data = await apiCall('getReportData', { date: state.currentDate });
    renderReportTable('report-view-sales', data.salesData);
    renderReportTable('report-view-cash', data.cashData);
    renderReportTable('report-view-vendor', data.vendorData);
    renderReportTable('report-view-stock', data.stockData);
  } catch (e) {}
}

function renderReportTable(containerId, gridData) {
  const container = document.getElementById(containerId);
  if (!gridData || !gridData.length) {
    container.innerHTML = '<p class="empty-state">No report data generated yet for this sheet.</p>';
    return;
  }

  let html = '<table class="table-modern table-bordered" style="font-size: 0.8rem;">';
  gridData.forEach((row, rIdx) => {
    if (row.some(c => c !== '')) {
      html += '<tr>';
      row.forEach(cell => {
        const isHeader = rIdx < 2 || cell.includes('TOTAL') || cell.includes('SHIV SHAKTI');
        const style = isHeader ? 'font-weight: bold; background: var(--bg-card-inner);' : '';
        html += `<td style="${style}">${escapeHtml(cell)}</td>`;
      });
      html += '</tr>';
    }
  });
  html += '</table>';
  container.innerHTML = html;
}

function switchReportTab(viewId, btn) {
  document.querySelectorAll('#screen-report .filter-pill').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.report-view').forEach(v => v.classList.remove('active'));

  btn.classList.add('active');
  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');
}

async function generateDailyArchive() {
  if (confirm(`Generate and archive official PDF + Excel for ${formatDisplayDate(state.currentDate)} to Google Drive?`)) {
    try {
      const res = await apiCall('generateArchive', { date: state.currentDate });
      showToast('Daily Report archived to Google Drive successfully!', 'success');
      if (res.pdfUrl) {
        window.open(res.pdfUrl, '_blank');
      }
    } catch (e) {}
  }
}

function printReport() {
  window.print();
}

/**
 * ============================================================================
 * 9. ARCHIVES LIST
 * ============================================================================
 */
async function loadArchivesList() {
  try {
    const data = await apiCall('listArchives');
    const tbody = document.getElementById('archivesTableBody');

    if (!data.archives || !data.archives.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No archives found. Click "Export PDF & Excel" in Report view.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.archives.map(a => `
      <tr>
        <td class="font-mono"><strong>${formatDisplayDate(a.date)}</strong></td>
        <td>${escapeHtml(a.fileName)}</td>
        <td><small class="font-mono">${a.createdAt || '-'}</small></td>
        <td><small>${escapeHtml(a.generatedBy || '-')}</small></td>
        <td class="text-center">
          <a href="${a.pdfUrl}" target="_blank" class="btn-erp-primary btn-sm">PDF</a>
          ${a.xlsxUrl ? `<a href="${a.xlsxUrl}" target="_blank" class="btn-erp-outline btn-sm">Excel</a>` : ''}
        </td>
      </tr>
    `).join('');
  } catch (e) {}
}

/**
 * ============================================================================
 * 10. ADMIN MANAGEMENT
 * ============================================================================
 */
function switchAdminTab(tabId, btn) {
  document.querySelectorAll('#screen-admin .filter-pill').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));

  btn.classList.add('active');
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
}

async function loadAdminUsers() {
  try {
    const data = await apiCall('adminListUsers', {}, false);
    const tbody = document.getElementById('adminUsersBody');

    tbody.innerHTML = (data.users || []).map(u => `
      <tr>
        <td><strong>${escapeHtml(u.username)}</strong></td>
        <td><span class="badge-pill bg-purple-soft">${u.role.toUpperCase()}</span></td>
        <td>
          <span class="variance-chip ${u.active ? '' : 'mismatch'}">
            ${u.active ? 'Active' : 'Disabled'}
          </span>
        </td>
        <td><small class="font-mono">${u.createdAt || '-'}</small></td>
        <td class="text-center">
          <button class="btn-erp-outline btn-sm" onclick="toggleUserActive('${u.username}', ${!u.active})">
            ${u.active ? 'Disable' : 'Enable'}
          </button>
          <button class="btn-erp-outline btn-sm" onclick="resetUserPasswordPrompt('${u.username}')">
            Reset Password
          </button>
        </td>
      </tr>
    `).join('');
  } catch (e) {}
}

function openCreateUserModal() {
  document.getElementById('newUsername').value = '';
  document.getElementById('newPassword').value = '';
  openModal('modalCreateUser');
}

async function handleCreateUserSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('newUsername').value.trim();
  const password = document.getElementById('newPassword').value;
  const role = document.getElementById('newRole').value;

  try {
    await apiCall('adminCreateUser', { userData: { username, password, role } });
    closeModal('modalCreateUser');
    showToast(`Staff user '${username}' created.`, 'success');
    loadAdminUsers();
  } catch (e) {}
}

async function toggleUserActive(username, newState) {
  try {
    await apiCall('adminSetActive', { username, active: newState });
    showToast('User status updated.', 'success');
    loadAdminUsers();
  } catch (e) {}
}

async function resetUserPasswordPrompt(username) {
  const newPass = prompt(`Enter new password for '${username}':`);
  if (newPass) {
    try {
      await apiCall('adminResetPassword', { username, newPassword: newPass });
      showToast(`Password for '${username}' reset successfully.`, 'success');
    } catch (e) {}
  }
}

function openRatesManager() {
  switchTab('screen-admin');
  const ratesPill = document.querySelector('.filter-tab-bar button:nth-child(2)');
  if (ratesPill) {
    switchAdminTab('admin-tab-rates', ratesPill);
  } else {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('admin-tab-rates')?.classList.add('active');
  }
  loadAdminRates();
}

async function loadAdminRates() {
  const tbody = document.getElementById('adminRatesBody');
  if (!tbody) return;

  const categories = ['SALE', 'SECURITY_DEPOSIT', 'SERVICE', 'RETURN', 'SD_REFUND', 'DUES_RECEIVED'];
  const ratesList = state.meta.rates && state.meta.rates.length ? state.meta.rates : DEFAULT_RATES;

  tbody.innerHTML = ratesList.map((r, idx) => `
    <tr>
      <td class="text-center font-mono text-muted row-idx">${idx + 1}</td>
      <td>
        <input type="text" class="input-modern admin-rate-item-name" value="${escapeHtml(r.item)}" placeholder="Product / Service Name" style="height: 36px; font-weight: 700;" required>
      </td>
      <td>
        <select class="input-modern admin-rate-category" style="height: 36px;">
          ${categories.map(cat => `<option value="${cat}" ${r.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
        </select>
      </td>
      <td>
        <input type="number" class="input-modern font-mono text-right admin-rate-input" value="${r.rate}" step="0.01" min="0" style="height: 36px;" required>
      </td>
      <td class="text-center">
        <input type="checkbox" class="admin-rate-active" ${r.active !== false ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
      </td>
      <td class="text-center">
        <button type="button" class="btn-row-del" onclick="deleteAdminRateRow(this)" title="Delete Product">🗑</button>
      </td>
    </tr>
  `).join('');
}

function addAdminRateRow() {
  const tbody = document.getElementById('adminRatesBody');
  if (!tbody) return;

  const categories = ['SALE', 'SECURITY_DEPOSIT', 'SERVICE', 'RETURN', 'SD_REFUND', 'DUES_RECEIVED'];
  const newIdx = tbody.querySelectorAll('tr').length + 1;
  const tr = document.createElement('tr');

  tr.innerHTML = `
    <td class="text-center font-mono text-muted row-idx">${newIdx}</td>
    <td>
      <input type="text" class="input-modern admin-rate-item-name" value="" placeholder="e.g. 5 KG FTL Cylinder / Safety Cap" style="height: 36px; font-weight: 700;" required>
    </td>
    <td>
      <select class="input-modern admin-rate-category" style="height: 36px;">
        ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
      </select>
    </td>
    <td>
      <input type="number" class="input-modern font-mono text-right admin-rate-input" value="0.00" step="0.01" min="0" style="height: 36px;" required>
    </td>
    <td class="text-center">
      <input type="checkbox" class="admin-rate-active" checked style="width: 18px; height: 18px; cursor: pointer;">
    </td>
    <td class="text-center">
      <button type="button" class="btn-row-del" onclick="deleteAdminRateRow(this)" title="Delete Product">🗑</button>
    </td>
  `;

  tbody.appendChild(tr);
  tr.querySelector('.admin-rate-item-name')?.focus();
  showToast('New product row added. Enter name & rate then click Save.', 'info');
}

function deleteAdminRateRow(btn) {
  const tr = btn.closest('tr');
  if (!tr) return;

  const itemName = tr.querySelector('.admin-rate-item-name')?.value.trim() || 'this item';
  if (confirm(`Are you sure you want to delete "${itemName}"?`)) {
    tr.remove();
    document.querySelectorAll('#adminRatesBody tr').forEach((row, i) => {
      const idxCell = row.querySelector('.row-idx');
      if (idxCell) idxCell.textContent = i + 1;
    });
    showToast(`Removed "${itemName}". Click "Save Items & Rates" to persist changes.`, 'warning');
  }
}

async function saveAdminRates() {
  const updatedRates = [];
  const rows = document.querySelectorAll('#adminRatesBody tr');

  rows.forEach(tr => {
    const item = (tr.querySelector('.admin-rate-item-name')?.value || '').trim();
    const category = tr.querySelector('.admin-rate-category')?.value || 'SALE';
    const rate = parseFloat(tr.querySelector('.admin-rate-input')?.value) || 0;
    const active = tr.querySelector('.admin-rate-active')?.checked !== false;

    if (item) {
      updatedRates.push({ item, category, rate, active });
    }
  });

  if (updatedRates.length === 0) {
    showToast('Cannot save empty rates list.', 'warning');
    return;
  }

  try {
    await apiCall('adminUpdateRates', { rates: updatedRates });
    showToast(`Catalog saved: ${updatedRates.length} products updated successfully!`, 'success');
    state.meta.rates = updatedRates;

    // Sync newly added/updated items to MASTER_ITEM_CATALOG
    updatedRates.forEach(r => {
      const existing = MASTER_ITEM_CATALOG.find(m => m.item.toLowerCase() === r.item.toLowerCase());
      if (existing) {
        existing.rate = r.rate;
        existing.category = r.category;
      } else {
        MASTER_ITEM_CATALOG.push({
          id: 'custom_' + Math.random().toString(36).substring(7),
          item: r.item,
          label: r.item,
          category: r.category,
          rate: r.rate
        });
      }
    });

    // Refresh POS Billing items dropdown
    resetPosItemRows();
  } catch (e) {
    showToast('Failed to save rates catalog: ' + (e.message || e), 'error');
  }
}

/**
 * ============================================================================
 * MODALS, TOASTS & UTILITIES
 * ============================================================================
 */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

function openApiConfigModal() {
  document.getElementById('customApiUrl').value = state.apiUrl;
  openModal('modalApiConfig');
}

function saveApiConfig() {
  const val = document.getElementById('customApiUrl').value.trim();
  if (val) {
    state.apiUrl = val;
    localStorage.setItem('ss_api_url', val);
    showToast('Custom Web App URL saved.', 'success');
  } else {
    state.apiUrl = '/api';
    localStorage.removeItem('ss_api_url');
    showToast('Reset to default Netlify proxy (/api).', 'info');
  }
  closeModal('modalApiConfig');
}

let toastTimer = null;
function showToast(message, type = 'info') {
  const toast = document.getElementById('toastNotification');
  const msgEl = document.getElementById('toastMessage');
  const iconEl = document.getElementById('toastIcon');

  msgEl.textContent = message;
  toast.className = `toast ${type}`;

  if (type === 'success') iconEl.textContent = '✓';
  else if (type === 'error') iconEl.textContent = '✗';
  else if (type === 'warning') iconEl.textContent = '⚠️';
  else iconEl.textContent = 'ℹ️';

  toast.classList.remove('hidden');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    hideToast();
  }, 4500);
}

function hideToast() {
  const toast = document.getElementById('toastNotification');
  if (toast) toast.classList.add('hidden');
}

function showSpinner(text = 'Processing transaction...') {
  const overlay = document.getElementById('loadingOverlay');
  const txt = document.getElementById('loadingText');
  if (txt) txt.textContent = text;
  if (overlay) overlay.classList.remove('hidden');
}

function hideSpinner() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.add('hidden');
}

function formatINR(val) {
  const num = Number(val) || 0;
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
