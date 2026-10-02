/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - HUMAN RESOURCES & EMPLOYEE MANAGEMENT MODULE
 * Staff directory, Delivery Staff, Cashiers, Base Salary, Delivery Rate
 * ============================================================================
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { formatINR, formatDisplayDate, escapeHtml } from '../utils.js';

export const EmployeesModule = {
  employees: [],

  async load() {
    try {
      const data = await api('listEmployees', {}, { loadingText: 'Loading employee personnel...' });
      this.employees = data.employees || [];
      this.render();
    } catch (e) {}
  },

  render() {
    const tbody = document.getElementById('employeesTableBody');
    if (!tbody) return;

    if (!this.employees || this.employees.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center" style="padding: 2rem;">
            <div class="empty-state">
              <i class="fa-solid fa-user-tie empty-state-icon"></i>
              <strong class="empty-state-title">No Staff Members Found</strong>
              <p class="empty-state-desc">Add staff members, delivery hawkers, and cashiers.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.employees.map((e, idx) => `
      <tr>
        <td class="text-center font-bold">${idx + 1}</td>
        <td>
          <strong>${escapeHtml(e.name)}</strong>
          <small class="text-muted block">ID: ${escapeHtml(e.empId)}</small>
        </td>
        <td class="font-mono">${escapeHtml(e.mobile)}</td>
        <td><span class="badge-pill info">${escapeHtml(e.role || 'Delivery')}</span></td>
        <td class="text-right font-mono">${formatINR(e.salary || 0)}</td>
        <td class="text-right font-mono text-emerald">₹${Number(e.perDeliveryRate || 0).toFixed(2)}/cyl</td>
        <td class="text-center">
          <div class="btn-group-cluster" style="justify-content:center;">
            <button class="btn-erp-outline btn-sm" onclick="EmployeesModule.edit('${e.empId}')" title="Edit Staff">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-erp-danger btn-sm" onclick="EmployeesModule.delete('${e.empId}', '${e.name}')" title="Delete Staff">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  async save(formEl) {
    const payload = {
      empId: formEl.empId?.value || '',
      name: formEl.empName?.value.trim(),
      mobile: formEl.empMobile?.value.trim(),
      role: formEl.empRole?.value || 'DELIVERY',
      salary: Number(formEl.empSalary?.value) || 0,
      perDeliveryRate: Number(formEl.empDeliveryRate?.value) || 0,
      emergencyContact: formEl.empEmergencyContact?.value.trim() || '',
      address: formEl.empAddress?.value.trim() || ''
    };

    if (!payload.name || !payload.mobile) {
      ui.warn('Required Fields', 'Please specify employee name and mobile number.');
      return;
    }

    try {
      await api('saveEmployee', { employee: payload }, { loadingText: 'Saving employee record...' });
      ui.success('Employee Saved', `Staff record for "${payload.name}" updated successfully.`);
      formEl.reset();
      document.getElementById('modalAddEmployee')?.classList.add('hidden');
      await this.load();
    } catch (e) {}
  },

  async delete(empId, empName) {
    const confirmed = await ui.confirm(`Delete Employee "${empName}"?`, 'This will soft-delete the employee profile.');
    if (confirmed) {
      try {
        await api('deleteEmployee', { empId }, { loadingText: 'Removing employee profile...' });
        ui.success('Employee Removed', `Staff member ${empName} has been removed.`);
        await this.load();
      } catch (e) {}
    }
  }
};

window.EmployeesModule = EmployeesModule;
