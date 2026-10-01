/**
 * ============================================================================
 * SHIV SHAKTI HP GAS AGENCY - ROJNAMCHA FRONTEND (Vanilla JS)
 * Enterprise ERP: Collapsible Sidebar, Theme Switcher, Real-time Accounting
 * ============================================================================
 */

// Global State
const state = {
  token: localStorage.getItem('ss_token') || null,
  user: JSON.parse(localStorage.getItem('ss_user') || 'null'),
  apiUrl: localStorage.getItem('ss_api_url') || '/api',
  theme: localStorage.getItem('ss_theme') || 'light',
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

// Screen Headings Mapping
const SCREEN_TITLES = {
  'screen-login': 'Login & Authentication',
  'screen-dashboard': 'Daily Overview [डैशबोर्ड]',
  'screen-entry': 'Billing & Transactions [बिक्री]',
  'screen-vendors': 'Delivery Vendors & Godown [हॉकर संग्रह]',
  'screen-cashbook': 'Cash Book & Note Counter [रोकड़ बही]',
  'screen-dues': 'Outstanding Dues Register [बकाया]',
  'screen-stock': 'Cylinder Stock Inventory [स्टॉक]',
  'screen-report': 'Official Daily Report [रिपोर्ट]',
  'screen-archive': 'Google Drive Archives [फ़ाइलें]',
  'screen-admin': 'Administration & Masters [प्रशासन]'
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
  showToast(`${state.theme === 'dark' ? 'Night / Dark Mode 🌙' : 'Day / Light Mode ☀️'} activated`, 'info');
}

/* Sidebar Controller */
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
    if (bottomNav) bottomNav.style.display = 'flex';
    if (sidebarUserName) sidebarUserName.textContent = state.user.username;
    if (sidebarUserRole) sidebarUserRole.textContent = (state.user.role || 'cashier').toUpperCase();
    if (sidebarAvatar) sidebarAvatar.textContent = (state.user.username || 'U').charAt(0).toUpperCase();

    if (sidebarAdminItem) {
      sidebarAdminItem.style.display = (state.user.role === 'admin') ? 'flex' : 'none';
    }
  } else {
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
    showToast('Please enter both username and password.', 'warning');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>Verifying... [सत्यापन जारी]</span>';

  try {
    const data = await apiCall('login', { username, password });
    state.token = data.token;
    state.user = { username: data.username, role: data.role };

    localStorage.setItem('ss_token', state.token);
    localStorage.setItem('ss_user', JSON.stringify(state.user));

    applyAuthUI(true);
    showToast(`Welcome back, ${data.username}! [सफल लॉगिन]`, 'success');
    await fetchMetadata();
    switchTab('screen-dashboard');
  } catch (err) {
    // Error handled in apiCall
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <span>Secure Login [लॉगिन करें]</span>
      <svg viewBox="0 0 24 24" class="svg-icon"><path d="M14 5l7 7m0 0l-7 7m7-7H3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    `;
  }
}

async function handleLogoutClick() {
  if (confirm('Are you sure you want to log out? [क्या आप लॉगआउट करना चाहते हैं?]')) {
    try {
      if (state.token) {
        await apiCall('logout', {}, false);
      }
    } catch (e) {
      // Ignore
    }
    localStorage.removeItem('ss_token');
    localStorage.removeItem('ss_user');
    state.token = null;
    state.user = null;
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
  populateEntryItems();
}

/**
 * ============================================================================
 * TAB NAVIGATION
 * ============================================================================
 */
function switchTab(screenId) {
  // If not logged in and not heading to login
  if (!state.token && screenId !== 'screen-login') {
    screenId = 'screen-login';
  }

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) targetScreen.classList.add('active');

  // Update Topbar Heading
  const headingEl = document.getElementById('currentScreenTitle');
  if (headingEl && SCREEN_TITLES[screenId]) {
    headingEl.textContent = SCREEN_TITLES[screenId];
  }

  // Update Sidebar Active state
  document.querySelectorAll('.app-sidebar .nav-link').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(screenId));
  });

  // Update Bottom Nav Active state
  document.querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(screenId));
  });

  // Close sidebar drawer on mobile
  if (window.innerWidth <= 900) {
    toggleSidebar(false);
  }

  // Screen data loading
  if (screenId === 'screen-dashboard') {
    loadDashboardData();
  } else if (screenId === 'screen-entry') {
    loadTodayEntries();
    populateEntryItems();
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
 * 2. DASHBOARD (TODAY)
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

    // Reconciliation banner
    const banner = document.getElementById('reconciliationBanner');
    const icon = document.getElementById('reconIcon');
    const title = document.getElementById('reconStatusTitle');
    const desc = document.getElementById('reconStatusDetail');

    if (data.reconciliation.isBalanced) {
      banner.className = 'status-banner-premium balanced';
      icon.textContent = '✓';
      title.textContent = 'Accounts Balanced & Reconciled [खाता संतुलित है]';
      desc.textContent = 'Billing, digital collections, counter cash and stock reconcile with master figures.';
    } else {
      banner.className = 'status-banner-premium mismatch';
      icon.textContent = '⚠️';
      title.textContent = 'Audit Difference Detected [खाते में अंतर]';
      desc.textContent = data.reconciliation.statusText;
    }
  } catch (e) {}
}

/**
 * ============================================================================
 * 3. ADD ENTRY & TODAY ENTRIES LIST
 * ============================================================================
 */
function onCategoryChanged() {
  populateEntryItems();
}

function populateEntryItems() {
  const category = document.getElementById('entryCategory').value;
  const itemSelect = document.getElementById('entryItem');
  itemSelect.innerHTML = '<option value="">-- Select Item --</option>';

  const filteredRates = state.meta.rates.filter(r => r.category === category);
  filteredRates.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.item;
    opt.textContent = `${r.item} (₹${r.rate})`;
    opt.dataset.rate = r.rate;
    itemSelect.appendChild(opt);
  });

  onItemChanged();
}

function onItemChanged() {
  const itemSelect = document.getElementById('entryItem');
  const selectedOpt = itemSelect.options[itemSelect.selectedIndex];
  const rateInput = document.getElementById('entryRate');

  if (selectedOpt && selectedOpt.dataset.rate !== undefined) {
    rateInput.value = selectedOpt.dataset.rate;
  }
  calculateEntryAmount();
}

function calculateEntryAmount() {
  const qty = parseFloat(document.getElementById('entryQty').value) || 0;
  const rate = parseFloat(document.getElementById('entryRate').value) || 0;
  const total = qty * rate;
  document.getElementById('entryAmount').value = total.toFixed(2);
  updateSplitTotal();
}

function onPayModeChanged() {
  const mode = document.getElementById('entryPayMode').value;
  const splitBox = document.getElementById('splitPaymentContainer');
  if (mode === 'SPLIT') {
    splitBox.classList.remove('hidden');
    updateSplitTotal();
  } else {
    splitBox.classList.add('hidden');
  }
}

function updateSplitTotal() {
  const mode = document.getElementById('entryPayMode').value;
  if (mode !== 'SPLIT') return;

  const totalAmount = parseFloat(document.getElementById('entryAmount').value) || 0;
  const cash = parseFloat(document.getElementById('splitCash').value) || 0;
  const upi = parseFloat(document.getElementById('splitUpi').value) || 0;
  const hpPay = parseFloat(document.getElementById('splitHpPay').value) || 0;
  const dues = parseFloat(document.getElementById('splitDues').value) || 0;
  const other = parseFloat(document.getElementById('splitOther').value) || 0;

  const splitSum = cash + upi + hpPay + dues + other;
  const msgEl = document.getElementById('splitValidationMsg');

  if (Math.abs(splitSum - totalAmount) < 0.01) {
    msgEl.style.color = 'var(--success)';
    msgEl.textContent = `✓ Perfectly Balanced: Settled ${formatINR(splitSum)} of ${formatINR(totalAmount)}`;
  } else {
    msgEl.style.color = 'var(--danger)';
    msgEl.textContent = `⚠️ Mismatch: Settled ${formatINR(splitSum)} / Required ${formatINR(totalAmount)} (Diff: ${formatINR(totalAmount - splitSum)})`;
  }
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
  const category = document.getElementById('entryCategory').value;
  const item = document.getElementById('entryItem').value;
  const qty = parseFloat(document.getElementById('entryQty').value) || 0;
  const rate = parseFloat(document.getElementById('entryRate').value) || 0;
  const amount = parseFloat(document.getElementById('entryAmount').value) || 0;
  const payMode = document.getElementById('entryPayMode').value;
  const party = document.getElementById('entryParty').value.trim();
  const note = document.getElementById('entryNote').value.trim();
  const saveBtn = document.getElementById('btnSaveEntry');

  if (!item) {
    showToast('Please select an item [कृपया वस्तु चुनें]', 'warning');
    return;
  }
  if (qty <= 0 && category !== 'RETURN' && category !== 'DUES_RECEIVED') {
    showToast('Quantity must be greater than zero.', 'warning');
    return;
  }

  if (payMode === 'SPLIT') {
    const cash = parseFloat(document.getElementById('splitCash').value) || 0;
    const upi = parseFloat(document.getElementById('splitUpi').value) || 0;
    const hpPay = parseFloat(document.getElementById('splitHpPay').value) || 0;
    const dues = parseFloat(document.getElementById('splitDues').value) || 0;
    const other = parseFloat(document.getElementById('splitOther').value) || 0;
    const splitSum = cash + upi + hpPay + dues + other;

    if (Math.abs(splitSum - amount) >= 0.01) {
      showToast('Split amounts must equal Total Bill Amount.', 'error');
      return;
    }
  }

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span>Saving...</span>';

  try {
    const entryPayload = {
      date: state.currentDate,
      category: category,
      item: item,
      qty: qty,
      rate: rate,
      amount: amount,
      payMode: payMode,
      party: party,
      note: note
    };

    await apiCall('addEntry', { entry: entryPayload });
    showToast('Entry saved successfully! [प्रविष्टि सहेजी गई]', 'success');

    if (isAddAnother) {
      document.getElementById('entryQty').value = '1';
      document.getElementById('entryParty').value = '';
      document.getElementById('entryNote').value = '';
      calculateEntryAmount();
    } else {
      resetEntryForm();
    }

    loadTodayEntries();
    loadDashboardData();
  } catch (err) {
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<span>Save Entry [सेव करें]</span>';
  }
}

function resetEntryForm() {
  document.getElementById('entryForm').reset();
  document.getElementById('entryQty').value = '1';
  document.getElementById('splitPaymentContainer').classList.add('hidden');
  populateEntryItems();
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
  countBadge.textContent = `${entries.length} entries`;

  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-state">No entries recorded for ${formatDisplayDate(state.currentDate)}.</td></tr>`;
    return;
  }

  tbody.innerHTML = entries.map(e => `
    <tr>
      <td><small class="mono-font">${e.time || '--'}</small></td>
      <td><span class="count-pill">${e.category}</span></td>
      <td><strong>${escapeHtml(e.item)}</strong></td>
      <td class="text-center mono-font">${e.qty}</td>
      <td class="text-right mono-font">₹${e.rate}</td>
      <td class="text-right mono-font font-weight-bold">${formatINR(e.amount)}</td>
      <td><span class="variance-badge">${e.payMode}</span></td>
      <td>${escapeHtml(e.party || '-')}</td>
      <td><small>${escapeHtml(e.enteredBy)}</small></td>
      <td class="text-center">
        <button class="btn-outline-theme btn-sm text-danger" onclick="deleteEntryClick('${e.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

async function deleteEntryClick(id) {
  if (confirm('Are you sure you want to delete this entry? [क्या आप यह प्रविष्टि हटाना चाहते हैं?]')) {
    try {
      await apiCall('deleteEntry', { id });
      showToast('Entry deleted successfully.', 'success');
      loadTodayEntries();
      loadDashboardData();
    } catch (e) {}
  }
}

/**
 * ============================================================================
 * 4. VENDOR LOG (COLLECTION SUMMARY)
 * ============================================================================
 */
async function loadVendorLogData() {
  const vendors = state.meta.vendors.filter(v => v !== 'GODOWN');
  const tbody = document.getElementById('vendorTableBody');
  const tfoot = document.getElementById('vendorTableFoot');

  tbody.innerHTML = vendors.map((v, idx) => `
    <tr data-vendor="${v}">
      <td class="text-center mono-font">${idx + 1}</td>
      <td><strong>${v}</strong></td>
      <td class="text-center"><input type="number" class="v-gas mono-font" value="0" min="0" oninput="calculateVendorRow(this)"></td>
      <td class="text-center"><input type="number" class="v-cash mono-font" value="0" min="0" oninput="calculateVendorRow(this)"></td>
      <td class="text-center"><input type="number" class="v-upi mono-font" value="0" min="0" oninput="calculateVendorRow(this)"></td>
      <td class="text-center"><input type="number" class="v-hp mono-font" value="0" min="0" oninput="calculateVendorRow(this)"></td>
      <td class="text-center"><input type="number" class="v-dues mono-font" value="0" min="0" oninput="calculateVendorRow(this)"></td>
      <td class="v-status text-center"><span class="variance-badge">Balanced</span></td>
    </tr>
  `).join('');

  tfoot.innerHTML = `
    <tr class="table-info font-weight-bold">
      <td colspan="2">DELIVERY TOTAL</td>
      <td id="footDelivGas" class="text-center mono-font">0</td>
      <td id="footDelivCash" class="text-center mono-font">0</td>
      <td id="footDelivUpi" class="text-center mono-font">0</td>
      <td id="footDelivHp" class="text-center mono-font">0</td>
      <td id="footDelivDues" class="text-center mono-font">0</td>
      <td id="footDelivStatus" class="text-center"><span class="variance-badge">Balanced</span></td>
    </tr>
    <tr data-vendor="GODOWN" class="font-weight-bold">
      <td colspan="2">GODOWN [गोदाम काउंटर]</td>
      <td class="text-center"><input type="number" class="v-gas mono-font" id="godownGas" value="0" min="0" oninput="calculateVendorTotals()"></td>
      <td class="text-center"><input type="number" class="v-cash mono-font" id="godownCash" value="0" min="0" oninput="calculateVendorTotals()"></td>
      <td class="text-center"><input type="number" class="v-upi mono-font" id="godownUpi" value="0" min="0" oninput="calculateVendorTotals()"></td>
      <td class="text-center"><input type="number" class="v-hp mono-font" id="godownHp" value="0" min="0" oninput="calculateVendorTotals()"></td>
      <td class="text-center"><input type="number" class="v-dues mono-font" id="godownDues" value="0" min="0" oninput="calculateVendorTotals()"></td>
      <td id="godownStatus" class="text-center"><span class="variance-badge">Balanced</span></td>
    </tr>
    <tr class="table-primary font-weight-bold" style="font-size: 0.95rem;">
      <td colspan="2">GRAND TOTAL</td>
      <td id="footGrandGas" class="text-center mono-font text-primary">0</td>
      <td id="footGrandCash" class="text-center mono-font text-success">0</td>
      <td id="footGrandUpi" class="text-center mono-font text-info">0</td>
      <td id="footGrandHp" class="text-center mono-font">0</td>
      <td id="footGrandDues" class="text-center mono-font text-warning">0</td>
      <td id="footGrandStatus" class="text-center"><span class="variance-badge">Balanced</span></td>
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
    statusCell.innerHTML = `<span class="variance-badge">Balanced</span>`;
  } else {
    statusCell.innerHTML = `<span class="variance-badge mismatch">Diff: ${gas - totalSettled}</span>`;
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
    showToast('Vendor logs saved successfully! [हॉकर विवरण सहेजा गया]', 'success');
    loadDashboardData();
  } catch (e) {}
}

/**
 * ============================================================================
 * 5. CASH BOOK & DENOMINATION COUNTER
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
    badge.className = 'variance-badge';
    verdictBox.className = 'verdict-banner-premium';
    verdictIcon.textContent = '✓';
    verdictText.textContent = 'Physical notes match book closing balance perfectly! [भौतिक नकद पूर्ण रूप से सही है]';
  } else {
    badge.className = 'variance-badge mismatch';
    verdictBox.className = 'verdict-banner-premium mismatch';
    verdictIcon.textContent = '⚠️';
    verdictText.textContent = `Cash Discrepancy: Physical cash differs from book by ${formatINR(variance)}!`;
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
    showToast('Cash Book saved successfully! [रोकड़ बही सुरक्षित की गई]', 'success');
    loadDashboardData();
  } catch (e) {}
}

/**
 * ============================================================================
 * 6. DUES MANAGEMENT
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
  document.querySelectorAll('#screen-dues .sub-pill-btn').forEach(b => b.classList.remove('active'));
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
      <td class="mono-font">${formatDisplayDate(d.date)}</td>
      <td><strong>${escapeHtml(d.party)}</strong></td>
      <td class="mono-font">${formatDisplayDate(d.billDate)}</td>
      <td class="text-right mono-font font-weight-bold text-danger">${formatINR(d.amount)}</td>
      <td>
        <span class="variance-badge ${d.status === 'RECOVERED' ? '' : 'mismatch'}">${d.status}</span>
      </td>
      <td class="mono-font">${d.recoveredDate ? formatDisplayDate(d.recoveredDate) : '-'}</td>
      <td class="text-center">
        ${d.status === 'PENDING' ? `
          <button class="btn-gradient-primary btn-sm" onclick="openRecoverDueModal('${d.rowId}', '${escapeHtml(d.party)}', ${d.amount})">
            Recover [वसूलें]
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
    showToast('Due record added successfully.', 'success');
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
    showToast('Due recovered and credited to today\'s sales!', 'success');
    loadDuesData('PENDING');
    loadDashboardData();
  } catch (e) {}
}

/**
 * ============================================================================
 * 7. STOCK MANAGEMENT
 * ============================================================================
 */
async function loadStockData() {
  const tbody = document.getElementById('stockTableBody');
  const tfoot = document.getElementById('stockTableFoot');

  tbody.innerHTML = state.meta.cylinderTypes.map(c => `
    <tr data-type="${c}">
      <td><strong>${c}</strong></td>
      <td><input type="number" class="st-op-fill form-control-premium mono-font text-center" value="0" min="0" oninput="calculateStockTotals()"></td>
      <td><input type="number" class="st-rec-hpcl form-control-premium mono-font text-center" value="0" min="0" oninput="calculateStockTotals()"></td>
      <td><input type="number" class="st-sold form-control-premium mono-font text-center" value="0" min="0" oninput="calculateStockTotals()"></td>
      <td><input type="number" class="st-adj form-control-premium mono-font text-center" value="0" oninput="calculateStockTotals()"></td>
      <td class="st-cl-fill text-center mono-font font-weight-bold">0</td>
      <td><input type="number" class="st-op-emp form-control-premium mono-font text-center" value="0" min="0" oninput="calculateStockTotals()"></td>
      <td><input type="number" class="st-cust-emp form-control-premium mono-font text-center" value="0" min="0" oninput="calculateStockTotals()"></td>
      <td><input type="number" class="st-oth-emp form-control-premium mono-font text-center" value="0" min="0" oninput="calculateStockTotals()"></td>
      <td><input type="number" class="st-plant-emp form-control-premium mono-font text-center" value="0" min="0" oninput="calculateStockTotals()"></td>
      <td class="st-cl-emp text-center mono-font font-weight-bold">0</td>
    </tr>
  `).join('');

  tfoot.innerHTML = `
    <tr class="table-primary font-weight-bold">
      <td>TOTAL</td>
      <td id="totOpFill" class="text-center mono-font">0</td>
      <td id="totRecHpcl" class="text-center mono-font">0</td>
      <td id="totSold" class="text-center mono-font">0</td>
      <td id="totAdj" class="text-center mono-font">0</td>
      <td id="totClFill" class="text-center mono-font text-primary">0</td>
      <td id="totOpEmp" class="text-center mono-font">0</td>
      <td id="totCustEmp" class="text-center mono-font">0</td>
      <td id="totOthEmp" class="text-center mono-font">0</td>
      <td id="totPlantEmp" class="text-center mono-font">0</td>
      <td id="totClEmp" class="text-center mono-font text-danger">0</td>
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
    showToast('Stock balance saved successfully! [सिलेंडर स्टॉक सुरक्षित किया गया]', 'success');
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

  let html = '<table class="table-premium table-bordered table-sm" style="font-size: 0.8rem;">';
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
  document.querySelectorAll('#screen-report .sub-pill-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.report-view').forEach(v => v.classList.remove('active'));

  btn.classList.add('active');
  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');
}

async function generateDailyArchive() {
  if (confirm(`Generate and archive official PDF + Excel for ${formatDisplayDate(state.currentDate)} to Google Drive?`)) {
    try {
      const res = await apiCall('generateArchive', { date: state.currentDate });
      showToast('Daily Report archived to Drive successfully!', 'success');
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
        <td class="mono-font"><strong>${formatDisplayDate(a.date)}</strong></td>
        <td>${escapeHtml(a.fileName)}</td>
        <td><small class="mono-font">${a.createdAt || '-'}</small></td>
        <td><small>${escapeHtml(a.generatedBy || '-')}</small></td>
        <td class="text-center">
          <a href="${a.pdfUrl}" target="_blank" class="btn-gradient-primary btn-sm">PDF</a>
          ${a.xlsxUrl ? `<a href="${a.xlsxUrl}" target="_blank" class="btn-outline-theme btn-sm">Excel</a>` : ''}
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
  document.querySelectorAll('#screen-admin .sub-pill-btn').forEach(b => b.classList.remove('active'));
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
        <td><span class="count-pill">${u.role.toUpperCase()}</span></td>
        <td>
          <span class="variance-badge ${u.active ? '' : 'mismatch'}">
            ${u.active ? 'Active' : 'Disabled'}
          </span>
        </td>
        <td><small class="mono-font">${u.createdAt || '-'}</small></td>
        <td class="text-center">
          <button class="btn-outline-theme btn-sm" onclick="toggleUserActive('${u.username}', ${!u.active})">
            ${u.active ? 'Disable' : 'Enable'}
          </button>
          <button class="btn-outline-theme btn-sm" onclick="resetUserPasswordPrompt('${u.username}')">
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
    showToast(`User status updated.`, 'success');
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

async function loadAdminRates() {
  const tbody = document.getElementById('adminRatesBody');
  tbody.innerHTML = state.meta.rates.map(r => `
    <tr data-item="${escapeHtml(r.item)}">
      <td><strong>${escapeHtml(r.item)}</strong></td>
      <td><span class="count-pill">${r.category}</span></td>
      <td>
        <input type="number" class="form-control-premium mono-font admin-rate-input" value="${r.rate}" step="0.01" style="width: 110px; height: 36px;">
      </td>
      <td class="text-center">
        <input type="checkbox" class="admin-rate-active" checked style="width: 18px; height: 18px;">
      </td>
    </tr>
  `).join('');
}

async function saveAdminRates() {
  const updatedRates = [];
  document.querySelectorAll('#adminRatesBody tr').forEach(tr => {
    const item = tr.dataset.item;
    const rate = parseFloat(tr.querySelector('.admin-rate-input').value) || 0;
    const active = tr.querySelector('.admin-rate-active').checked;
    const orig = state.meta.rates.find(r => r.item === item);

    updatedRates.push({
      item: item,
      category: orig ? orig.category : 'SALE',
      rate: rate,
      active: active
    });
  });

  try {
    await apiCall('adminUpdateRates', { rates: updatedRates });
    showToast('Catalog rates updated successfully! [दर सूची अद्यतन की गई]', 'success');
    await fetchMetadata();
  } catch (e) {}
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
