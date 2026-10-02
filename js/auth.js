/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)
 * Login, Logout, Password Change, Session State, and Permission Evaluation
 * ============================================================================
 */

import { CONFIG } from './config.js';
import { api } from './api.js';
import { ui } from './ui.js';

export const Auth = {
  state: {
    token: localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN) || null,
    user: JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER) || 'null'),
    permissions: []
  },

  isAuthenticated() {
    return !!this.state.token && !!this.state.user;
  },

  getUser() {
    return this.state.user;
  },

  getRole() {
    return this.state.user?.role || 'VIEWER';
  },

  /**
   * Evaluates if active user has permission to perform action
   * Backend strictly validates all operations; frontend guards UI elements
   */
  can(action, module = '') {
    if (!this.isAuthenticated()) return false;
    const role = this.getRole().toUpperCase();
    if (role === 'ADMIN') return true; // Full administrative control

    // Role Matrix defaults
    if (role === 'MANAGER') {
      if (action === 'deleteCompany' || action === 'writeOffDue') return false;
      return true;
    }

    if (role === 'CASHIER') {
      const allowedModules = ['billing', 'pos', 'dues', 'cashbook', 'customers', 'dispatch'];
      return allowedModules.includes(module.toLowerCase());
    }

    if (role === 'DELIVERY') {
      return module === 'dispatch';
    }

    return action === 'read';
  },

  async login(username, password) {
    if (!username || !password) {
      ui.toast('Please enter both username and password.', 'warning');
      return false;
    }

    try {
      const data = await api('login', { username, password }, { loadingText: 'Verifying credentials...' });
      
      this.state.token = data.token;
      this.state.user = {
        userId: data.userId || 'usr_1',
        username: data.username,
        role: data.role || 'CASHIER',
        mustChangePassword: data.mustChangePassword || false
      };

      localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, this.state.token);
      localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(this.state.user));

      ui.success(`Welcome back, ${data.username}!`);
      this.applyAuthUI(true);

      if (data.mustChangePassword) {
        ui.warn('Password Change Required', 'Please change your temporary password to continue.');
      }

      return true;
    } catch (err) {
      return false;
    }
  },

  async logout() {
    const confirmed = await ui.confirm('Sign Out of ERP System?', 'Your active session tokens will be revoked.');
    if (confirmed) {
      try {
        if (this.state.token) {
          await api('logout', {}, { showLoading: false });
        }
      } catch (e) {}

      this.state.token = null;
      this.state.user = null;
      localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
      localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);

      this.applyAuthUI(false);
      ui.toast('Logged out successfully.', 'info');
      window.location.hash = '#login';
    }
  },

  async changePassword(oldPassword, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      ui.toast('New password must be at least 6 characters long.', 'warning');
      return false;
    }
    await api('changePassword', { oldPassword, newPassword }, { loadingText: 'Updating security credentials...' });
    ui.success('Password Updated', 'Your security password has been changed successfully.');
    if (this.state.user) {
      this.state.user.mustChangePassword = false;
      localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(this.state.user));
    }
    return true;
  },

  applyAuthUI(isLoggedIn) {
    const userRoleEl = document.getElementById('sidebarUserRole');
    const userNameEl = document.getElementById('sidebarUserName');
    const userAvatarEl = document.getElementById('sidebarAvatar');

    if (isLoggedIn && this.state.user) {
      document.body.classList.remove('user-logged-out');
      document.body.classList.add('user-logged-in');

      if (userNameEl) userNameEl.textContent = this.state.user.username;
      if (userRoleEl) userRoleEl.textContent = this.state.user.role.toUpperCase();
      if (userAvatarEl) userAvatarEl.textContent = this.state.user.username.charAt(0).toUpperCase();

      // Guard role-specific sidebar items
      document.querySelectorAll('.admin-only-item').forEach(el => {
        el.style.display = (this.getRole() === 'ADMIN') ? 'flex' : 'none';
      });
    } else {
      document.body.classList.remove('user-logged-in');
      document.body.classList.add('user-logged-out');
    }
  }
};
