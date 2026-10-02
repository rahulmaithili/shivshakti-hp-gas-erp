/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - CLIENT-SIDE SCREEN ROUTER
 * Hash-based routing with RBAC guards, automatic title updates, and screen loading
 * ============================================================================
 */

import { Auth } from './auth.js';

export const SCREEN_TITLES = {
  'screen-login': 'Agency Portal Login',
  'screen-dashboard': 'Executive Dashboard & Audit Overview',
  'screen-billing': 'POS Invoicing & Refill Billing Counter',
  'screen-customers': 'Customer CRM & Consumer 360',
  'screen-dues': 'Customer Dues & Credit Ledger',
  'screen-dispatch': 'Hawkers & Godown Daily Dispatch',
  'screen-stock': 'Cylinder Inventory & Movement Register',
  'screen-cashbook': 'Cash Book & Drawer Till Reconciliation',
  'screen-employees': 'Human Resources & Staff Management',
  'screen-attendance': 'Employee Attendance Register',
  'screen-salary': 'Payroll & Salary Disbursements',
  'screen-vendors': 'Suppliers & Purchases Register',
  'screen-items': 'Products, Items & Master Rates Catalog',
  'screen-reports': 'Master Rojnamcha & Official Daily Reports',
  'screen-archive': 'Google Drive Cloud PDF & XLSX Archives',
  'screen-company': 'Company & Agency Profile',
  'screen-users': 'User Management & Access Control',
  'screen-audit': 'System Security & Audit Logs',
  'screen-settings': 'Enterprise ERP Settings'
};

export const Router = {
  currentScreen: 'screen-dashboard',

  init() {
    window.addEventListener('hashchange', () => this.handleHashChange());
    this.handleHashChange();
  },

  handleHashChange() {
    let hash = window.location.hash.replace('#', '') || 'dashboard';
    
    // Auth gatekeeper
    if (!Auth.isAuthenticated()) {
      hash = 'login';
    } else if (hash === 'login') {
      hash = 'dashboard';
    }

    const screenId = `screen-${hash}`;
    this.navigate(screenId, false);
  },

  navigate(screenId, updateHash = true) {
    if (!Auth.isAuthenticated() && screenId !== 'screen-login') {
      screenId = 'screen-login';
    }

    // Normalize screen aliases
    if (screenId === 'screen-entry') screenId = 'screen-billing';
    if (screenId === 'screen-report') screenId = 'screen-reports';
    if (screenId === 'screen-admin') screenId = 'screen-users';

    this.currentScreen = screenId;
    if (updateHash) {
      const hashName = screenId.replace('screen-', '');
      window.location.hash = hashName;
    }

    // Toggle Screen Elements
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
    }

    // Update Topbar Title
    const titleEl = document.getElementById('currentScreenTitle');
    if (titleEl && SCREEN_TITLES[screenId]) {
      titleEl.textContent = SCREEN_TITLES[screenId];
    }

    // Update Sidebar Navigation Link
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
      const targetHash = link.getAttribute('data-screen');
      link.classList.toggle('active', targetHash === screenId);
    });

    // Update Bottom Nav Item
    document.querySelectorAll('.bottom-nav-mobile .mobile-nav-item').forEach(btn => {
      const targetHash = btn.getAttribute('data-screen');
      btn.classList.toggle('active', targetHash === screenId);
    });

    // Auto close mobile drawer
    const sidebar = document.getElementById('appSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
    }

    // Trigger Screen Data Event
    window.dispatchEvent(new CustomEvent('screenLoaded', { detail: { screenId } }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};
