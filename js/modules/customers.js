/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - CUSTOMER CRM & CONSUMER 360 MODULE
 * Customer Master CRUD, Customer 360 Profile, Refill Gap, Interactions & Followups
 * ============================================================================
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { Validation } from '../validation.js';
import { formatINR, formatDisplayDate, escapeHtml } from '../utils.js';

export const CustomersModule = {
  customers: [],

  async load() {
    try {
      const data = await api('listCustomers', {}, { loadingText: 'Loading CRM customer database...' });
      this.customers = data.customers || [];
      this.renderTable(this.customers);
    } catch (e) {}
  },

  renderTable(list) {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center" style="padding: 2rem;">
            <div class="empty-state">
              <i class="fa-solid fa-users empty-state-icon"></i>
              <strong class="empty-state-title">No Customers Found</strong>
              <p class="empty-state-desc">Add consumer profiles or import customer lists.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map((c, i) => `
      <tr>
        <td class="text-center font-bold">${i + 1}</td>
        <td>
          <strong>${escapeHtml(c.name)}</strong>
          <small class="text-muted block">${c.consumerNo ? 'SV / Consumer: ' + escapeHtml(c.consumerNo) : 'Retail'}</small>
        </td>
        <td class="font-mono">${escapeHtml(c.mobile)}</td>
        <td>${escapeHtml(c.village || c.area || 'Pandaul')}</td>
        <td><span class="badge-pill info">${escapeHtml(c.connectionType || '14.2KG Domestic')}</span></td>
        <td class="text-right font-mono font-bold ${Number(c.dues) > 0 ? 'text-amber' : 'text-emerald'}">
          ${formatINR(c.dues || 0)}
        </td>
        <td class="text-center">
          <div class="btn-group-cluster" style="justify-content:center;">
            <button class="btn-erp-outline btn-sm" onclick="CustomersModule.view360('${c.customerId}')" title="Customer 360 View">
              <i class="fa-solid fa-id-card"></i> 360°
            </button>
            <button class="btn-erp-secondary btn-sm" onclick="CustomersModule.editCustomer('${c.customerId}')" title="Edit Customer">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  async saveCustomer(formEl) {
    const mobile = formEl.customerMobile?.value.trim();
    if (!Validation.isValidMobile(mobile)) {
      ui.error('Invalid Mobile Number', 'Please enter a valid 10-digit Indian mobile number starting with 6-9.');
      return;
    }

    const aadhaarLast4 = formEl.customerAadhaarLast4?.value.trim();
    if (aadhaarLast4 && !Validation.isValidAadhaarLast4(aadhaarLast4)) {
      ui.error('Security Rule', 'Only the last 4 digits of Aadhaar are permitted.');
      return;
    }

    const payload = {
      customerId: formEl.customerId?.value || '',
      name: formEl.customerName?.value.trim(),
      mobile: mobile,
      altMobile: formEl.customerAltMobile?.value.trim() || '',
      consumerNo: formEl.customerConsumerNo?.value.trim() || '',
      lpgId: formEl.customerLpgId?.value.trim() || '',
      address: formEl.customerAddress?.value.trim() || '',
      area: formEl.customerArea?.value.trim() || '',
      village: formEl.customerVillage?.value.trim() || '',
      connectionType: formEl.customerConnectionType?.value || '14.2KG Domestic',
      cylinderType: formEl.customerCylinderType?.value || '14.2 KG Domestic',
      aadhaarLast4: aadhaarLast4 || '',
      notes: formEl.customerNotes?.value.trim() || ''
    };

    try {
      await api('saveCustomer', { customer: payload }, { loadingText: 'Saving customer record...' });
      ui.success('Customer Saved', `Consumer profile for "${payload.name}" saved.`);
      formEl.reset();
      document.getElementById('modalAddCustomer')?.classList.add('hidden');
      await this.load();
    } catch (e) {}
  },

  async view360(customerId) {
    try {
      const data = await api('getCustomer360', { customerId }, { loadingText: 'Aggregating Customer 360 Data...' });
      const c = data.customer || {};

      const content = `
        <div style="padding: 10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:10px; margin-bottom:14px;">
            <div>
              <h3 style="margin:0; font-size:1.2rem;">${escapeHtml(c.name)}</h3>
              <span class="text-muted" style="font-size:0.82rem;">Consumer No: ${escapeHtml(c.consumerNo || 'N/A')} | Mobile: ${c.mobile}</span>
            </div>
            <div>
              <span class="badge-pill ${Number(c.dues) > 0 ? 'warning' : 'success'}" style="font-size:0.85rem;">
                Dues: ${formatINR(c.dues || 0)}
              </span>
            </div>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:16px;">
            <div style="background:var(--bg-card-inner); padding:10px; border-radius:8px; text-align:center;">
              <small class="text-muted" style="display:block; font-size:0.7rem;">TOTAL REFILLS</small>
              <strong style="font-size:1.2rem;">${data.refillCount || 0}</strong>
            </div>
            <div style="background:var(--bg-card-inner); padding:10px; border-radius:8px; text-align:center;">
              <small class="text-muted" style="display:block; font-size:0.7rem;">LIFETIME VALUE</small>
              <strong style="font-size:1.2rem; color:var(--c-green);">${formatINR(data.lifetimeValue || 0)}</strong>
            </div>
            <div style="background:var(--bg-card-inner); padding:10px; border-radius:8px; text-align:center;">
              <small class="text-muted" style="display:block; font-size:0.7rem;">LAST REFILL</small>
              <strong>${formatDisplayDate(data.lastRefillDate) || 'None'}</strong>
            </div>
            <div style="background:var(--bg-card-inner); padding:10px; border-radius:8px; text-align:center;">
              <small class="text-muted" style="display:block; font-size:0.7rem;">AVG REFILL GAP</small>
              <strong>${data.averageRefillGap || 32} Days</strong>
            </div>
          </div>

          <h4 style="font-size:0.95rem; margin-bottom:8px;">Recent Transactions</h4>
          <table class="erp-table" style="font-size:0.8rem; margin-bottom:12px;">
            <thead>
              <tr>
                <th>Date</th>
                <th>Bill No</th>
                <th>Item / Refill</th>
                <th class="text-right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${(data.recentBills || []).map(b => `
                <tr>
                  <td>${formatDisplayDate(b.date)}</td>
                  <td>${b.billNo}</td>
                  <td>${b.item}</td>
                  <td class="text-right font-mono">${formatINR(b.amount)}</td>
                  <td><span class="badge-pill success">Settled</span></td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="text-center text-muted">No prior bills recorded.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;

      Swal.fire({
        title: 'Customer 360° Profile',
        html: content,
        width: '680px',
        showConfirmButton: true,
        confirmButtonText: 'Close Profile'
      });
    } catch (e) {}
  }
};

window.CustomersModule = CustomersModule;
