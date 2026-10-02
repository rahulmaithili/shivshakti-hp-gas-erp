/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - VENDORS & SUPPLIERS MODULE
 * Vendor Master CRUD, Plant Bottling Supplies, Transporters
 * ============================================================================
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { escapeHtml } from '../utils.js';

export const VendorsModule = {
  vendors: [],

  async load() {
    try {
      const data = await api('listVendors', {}, { loadingText: 'Loading vendor registers...' });
      this.vendors = data.vendors || [];
      this.render();
    } catch (e) {}
  },

  render() {
    const tbody = document.getElementById('vendorsTableBody');
    if (!tbody) return;

    if (!this.vendors || this.vendors.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:1.5rem;">No suppliers or vendors registered.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.vendors.map((v, i) => `
      <tr>
        <td class="text-center font-bold">${i + 1}</td>
        <td><strong>${escapeHtml(v.vendorName)}</strong></td>
        <td class="font-mono">${escapeHtml(v.mobile || '—')}</td>
        <td>${escapeHtml(v.gstin || '—')}</td>
        <td>${escapeHtml(v.contactPerson || '—')}</td>
        <td class="text-center">
          <div class="btn-group-cluster" style="justify-content:center;">
            <button class="btn-erp-outline btn-sm" onclick="VendorsModule.edit('${v.vendorId}')" title="Edit Vendor"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="btn-erp-danger btn-sm" onclick="VendorsModule.delete('${v.vendorId}', '${v.vendorName}')" title="Delete Vendor"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  async save(formEl) {
    const payload = {
      vendorId: formEl.vendorId?.value || '',
      vendorName: formEl.vendorName?.value.trim(),
      mobile: formEl.vendorMobile?.value.trim() || '',
      address: formEl.vendorAddress?.value.trim() || '',
      gstin: formEl.vendorGstin?.value.trim() || '',
      contactPerson: formEl.vendorContactPerson?.value.trim() || ''
    };

    if (!payload.vendorName) {
      ui.warn('Required Field', 'Please enter supplier or vendor name.');
      return;
    }

    try {
      await api('saveVendor', { vendor: payload }, { loadingText: 'Saving vendor profile...' });
      ui.success('Vendor Saved', `Supplier "${payload.vendorName}" saved successfully.`);
      formEl.reset();
      document.getElementById('modalAddVendor')?.classList.add('hidden');
      await this.load();
    } catch (e) {}
  },

  async delete(vendorId, name) {
    const confirmed = await ui.confirm(`Delete Vendor "${name}"?`, 'Supplier profile will be removed.');
    if (confirmed) {
      try {
        await api('deleteVendor', { vendorId }, { loadingText: 'Removing vendor...' });
        ui.success('Vendor Removed', `Supplier ${name} deleted.`);
        await this.load();
      } catch (e) {}
    }
  }
};

window.VendorsModule = VendorsModule;
