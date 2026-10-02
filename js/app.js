/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - MAIN APPLICATION CONTROLLER
 * ES6 Module Architecture Orchestrator uniting all 24 Business Modules
 * ============================================================================
 */

import { CONFIG } from './config.js';
import { api } from './api.js';
import { Auth } from './auth.js';
import { Router } from './router.js';
import { ui } from './ui.js';
import { formatDisplayDate, getTodayDateString } from './utils.js';

// Module Imports
import { CompanyModule } from './modules/company.js';
import { DashboardModule } from './modules/dashboard.js';
import { BillingModule } from './modules/billing.js';
import { CustomersModule } from './modules/customers.js';
import { DuesModule } from './modules/dues.js';
import { DispatchModule } from './modules/dispatch.js';
import { StockModule } from './modules/stock.js';
import { CashbookModule } from './modules/cashbook.js';
import { EmployeesModule } from './modules/employees.js';
import { AttendanceModule } from './modules/attendance.js';
import { SalaryModule } from './modules/salary.js';
import { VendorsModule } from './modules/vendors.js';
import { ItemsModule } from './modules/items.js';
import { ReportsModule } from './modules/reports.js';
import { ArchiveModule } from './modules/archive.js';
import { UsersModule } from './modules/users.js';
import { SettingsModule } from './modules/settings.js';
import { SearchModule } from './modules/search.js';
import { PrintEngine } from './modules/print.js';

// Application State
export const App = {
  currentDate: getTodayDateString(),
  meta: {},

  async init() {
    // 1. Initialize Visual Themes & Settings
    SettingsModule.initTheme();
    this.initSidebar();
    this.initDatePicker();

    // 2. Initialize Company Profile & Logo Rendering
    await CompanyModule.init();

    // 3. Routing & Screen Load Handler
    window.addEventListener('screenLoaded', (e) => this.onScreenLoaded(e.detail.screenId));
    Router.init();

    // 4. Initial Auth Evaluation
    if (Auth.isAuthenticated()) {
      Auth.applyAuthUI(true);
      await this.loadInitialMetadata();
      Router.navigate('screen-dashboard');
    } else {
      Auth.applyAuthUI(false);
      Router.navigate('screen-login');
    }

    this.bindEvents();
  },

  initSidebar() {
    const layout = document.getElementById('appLayout');
    const isCollapsed = localStorage.getItem(CONFIG.STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true';
    if (layout && isCollapsed && window.innerWidth > 768) {
      layout.classList.add('sidebar-collapsed');
    }
  },

  initDatePicker() {
    const picker = document.getElementById('globalDatePicker');
    if (picker) {
      picker.value = this.currentDate;
    }
  },

  async loadInitialMetadata() {
    try {
      const data = await api('getMeta', {}, { showLoading: false });
      this.meta = data;
      BillingModule.init(data.rates || []);
      SearchModule.init({ items: data.rates || [], hawkers: data.vendors || [] });
    } catch (e) {}
  },

  async onScreenLoaded(screenId) {
    if (!Auth.isAuthenticated()) return;

    switch (screenId) {
      case 'screen-dashboard':
        await DashboardModule.load(this.currentDate);
        break;
      case 'screen-billing':
        if (BillingModule.cart.length === 0) {
          BillingModule.addItemRow();
        }
        break;
      case 'screen-customers':
        await CustomersModule.load();
        break;
      case 'screen-dues':
        await DuesModule.load('PENDING');
        break;
      case 'screen-dispatch':
        await DispatchModule.load(this.currentDate);
        break;
      case 'screen-stock':
        await StockModule.load(this.currentDate);
        break;
      case 'screen-cashbook':
        await CashbookModule.load(this.currentDate);
        break;
      case 'screen-employees':
        await EmployeesModule.load();
        break;
      case 'screen-attendance':
        await AttendanceModule.load(this.currentDate);
        break;
      case 'screen-salary':
        await SalaryModule.load(this.currentDate.substring(0, 7));
        break;
      case 'screen-vendors':
        await VendorsModule.load();
        break;
      case 'screen-items':
        await ItemsModule.load();
        break;
      case 'screen-reports':
        await ReportsModule.load(this.currentDate);
        break;
      case 'screen-archive':
        await ArchiveModule.load();
        break;
      case 'screen-users':
        await UsersModule.load();
        break;
      case 'screen-company':
        await CompanyModule.loadCompany();
        break;
      case 'screen-audit':
        await (await import('./modules/audit.js')).AuditModule.load();
        break;
    }
  },

  onDateChanged(newDate) {
    this.currentDate = newDate;
    ui.toast(`Date changed to ${formatDisplayDate(newDate)}`, 'info');
    this.onScreenLoaded(Router.currentScreen);
  },

  bindEvents() {
    // Global Date Picker
    document.getElementById('globalDatePicker')?.addEventListener('change', (e) => {
      this.onDateChanged(e.target.value);
    });

    // Login Form Submit
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = document.getElementById('loginUsername')?.value.trim();
      const p = document.getElementById('loginPassword')?.value;
      const success = await Auth.login(u, p);
      if (success) {
        await this.loadInitialMetadata();
        Router.navigate('screen-dashboard');
      }
    });

    // POS Form Submit
    document.getElementById('posBillingForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await BillingModule.submitBill(e.target, this.currentDate);
    });
  }
};

// Global Exposure for HTML inline handlers
window.App = App;
window.Auth = Auth;
window.Router = Router;
window.ui = ui;
window.CompanyModule = CompanyModule;
window.BillingModule = BillingModule;
window.CustomersModule = CustomersModule;
window.DuesModule = DuesModule;
window.DispatchModule = DispatchModule;
window.StockModule = StockModule;
window.CashbookModule = CashbookModule;
window.EmployeesModule = EmployeesModule;
window.AttendanceModule = AttendanceModule;
window.SalaryModule = SalaryModule;
window.VendorsModule = VendorsModule;
window.ItemsModule = ItemsModule;
window.ReportsModule = ReportsModule;
window.ArchiveModule = ArchiveModule;
window.UsersModule = UsersModule;
window.SettingsModule = SettingsModule;
window.SearchModule = SearchModule;
window.PrintEngine = PrintEngine;

// Global helper bridges for UI templates & shortcuts
window.switchTab = (id) => Router.navigate(id);
window.toggleSidebar = (force) => {
  const sidebar = document.getElementById('appSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar) sidebar.classList.toggle('open', force);
  if (backdrop) backdrop.classList.toggle('open', force);
};
window.toggleDesktopSidebar = () => {
  const layout = document.getElementById('appLayout');
  if (layout) {
    layout.classList.toggle('sidebar-collapsed');
    localStorage.setItem(CONFIG.STORAGE_KEYS.SIDEBAR_COLLAPSED, layout.classList.contains('sidebar-collapsed'));
  }
};
window.toggleTheme = () => SettingsModule.toggleTheme();
window.openThemePaletteModal = () => ui.modal('modalThemePalette', true);
window.closeModal = (id) => ui.modal(id, false);
window.openApiConfigModal = () => ui.modal('modalApiConfig', true);
window.saveApiConfig = () => SettingsModule.saveApiConfig();
window.handleLogout = () => Auth.logout();
window.openRatesManager = () => Router.navigate('screen-items');

// Boot on DOM Ready
document.addEventListener('DOMContentLoaded', () => App.init());

