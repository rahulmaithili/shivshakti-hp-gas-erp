/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - USER MANAGEMENT & ACCESS CONTROL MODULE
 * Admin User CRUD, Roles (ADMIN, MANAGER, CASHIER, DELIVERY, VIEWER), Password Reset
 * ============================================================================
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { escapeHtml } from '../utils.js';

export const UsersModule = {
  users: [],

  async load() {
    try {
      const data = await api('listUsers', {}, { loadingText: 'Loading system operators...' });
      this.users = data.users || [];
      this.render();
    } catch (e) {}
  },

  render() {
    const tbody = document.getElementById('adminUsersBody');
    if (!tbody) return;

    if (!this.users || this.users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:1.5rem;">No operator accounts found.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.users.map((u, i) => `
      <tr>
        <td class="text-center font-bold">${i + 1}</td>
        <td><strong>${escapeHtml(u.username)}</strong></td>
        <td><span class="badge-pill info font-bold">${escapeHtml(u.role)}</span></td>
        <td>
          <span class="badge-pill ${u.isActive ? 'success' : 'danger'}">
            ${u.isActive ? 'Active' : 'Disabled'}
          </span>
        </td>
        <td>${escapeHtml(u.lastLogin || 'Never')}</td>
        <td class="text-center">
          <div class="btn-group-cluster" style="justify-content:center;">
            <button class="btn-erp-outline btn-sm" onclick="UsersModule.resetPassword('${u.userId}', '${u.username}')" title="Reset Password">
              <i class="fa-solid fa-key"></i>
            </button>
            <button class="btn-erp-secondary btn-sm" onclick="UsersModule.toggleActive('${u.userId}', ${!u.isActive})" title="Toggle Active">
              <i class="fa-solid fa-power-off"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  async createUser(formEl) {
    const username = formEl.adminNewUsername?.value.trim();
    const password = formEl.adminNewPassword?.value;
    const role = formEl.adminNewRole?.value || 'CASHIER';

    if (!username || !password) {
      ui.warn('Missing Fields', 'Please enter username and initial password.');
      return;
    }

    try {
      await api('saveUser', { user: { username, password, role } }, { loadingText: 'Creating operator account...' });
      ui.success('User Created', `Operator account "${username}" with role [${role}] created.`);
      formEl.reset();
      document.getElementById('modalAddUser')?.classList.add('hidden');
      await this.load();
    } catch (e) {}
  },

  async resetPassword(userId, username) {
    const newPass = await ui.prompt(`Reset Password for ${username}`, 'Enter new temporary password:');
    if (newPass) {
      try {
        await api('resetPassword', { userId, newPassword: newPass }, { loadingText: 'Resetting credentials...' });
        ui.success('Password Reset', `Password for "${username}" has been updated.`);
      } catch (e) {}
    }
  },

  async toggleActive(userId, newActiveState) {
    try {
      await api('saveUser', { user: { userId, isActive: newActiveState } }, { loadingText: 'Updating status...' });
      ui.success('Status Updated', `User status updated to ${newActiveState ? 'Active' : 'Disabled'}.`);
      await this.load();
    } catch (e) {}
  }
};

window.UsersModule = UsersModule;
