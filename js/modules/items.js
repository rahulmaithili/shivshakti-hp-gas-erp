/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - ITEMS & MASTER RATES MODULE
 * Product Catalog CRUD, Rate History, Category Mapping, POS Sync
 * ============================================================================
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { Auth } from '../auth.js';
import { formatINR, escapeHtml } from '../utils.js';

export const ItemsModule = {
  items: [],

  async load() {
    try {
      const data = await api('getMeta', {}, { loadingText: 'Loading items & rates catalog...' });
      this.items = data.rates || [];
      this.render();
    } catch (e) {}
  },

  render() {
    const tbody = document.getElementById('adminRatesBody');
    if (!tbody) return;

    tbody.innerHTML = this.items.map((r, i) => `
      <tr>
        <td class="text-center font-bold row-idx" style="width:40px;">${i + 1}</td>
        <td>
          <input type="text" class="input-modern admin-rate-item-name font-bold" value="${escapeHtml(r.item)}" />
        </td>
        <td style="width:190px;">
          <select class="input-modern admin-rate-category">
            <option value="SALE" ${r.category === 'SALE' ? 'selected' : ''}>SALE (Refills & Acc.)</option>
            <option value="SECURITY_DEPOSIT" ${r.category === 'SECURITY_DEPOSIT' ? 'selected' : ''}>SECURITY_DEPOSIT (SV)</option>
            <option value="SERVICE" ${r.category === 'SERVICE' ? 'selected' : ''}>SERVICE (Fees)</option>
            <option value="SD_REFUND" ${r.category === 'SD_REFUND' ? 'selected' : ''}>SD_REFUND (Surrender)</option>
            <option value="RETURN" ${r.category === 'RETURN' ? 'selected' : ''}>RETURN (Defective)</option>
            <option value="DUES_RECEIVED" ${r.category === 'DUES_RECEIVED' ? 'selected' : ''}>DUES_RECEIVED</option>
          </select>
        </td>
        <td style="width:140px;">
          <input type="number" class="input-modern text-right font-mono admin-rate-price" min="0" step="0.01" value="${r.rate}" />
        </td>
        <td class="text-center" style="width:60px;">
          <button type="button" class="btn-erp-danger btn-sm" onclick="ItemsModule.deleteRow(this)" title="Delete Product">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `).join('');
  },

  addRow() {
    const tbody = document.getElementById('adminRatesBody');
    if (!tbody) return;

    const tr = document.createElement('tr');
    const idx = tbody.children.length + 1;
    tr.innerHTML = `
      <td class="text-center font-bold row-idx" style="width:40px;">${idx}</td>
      <td><input type="text" class="input-modern admin-rate-item-name font-bold" placeholder="Product / Item Name..." /></td>
      <td style="width:190px;">
        <select class="input-modern admin-rate-category">
          <option value="SALE" selected>SALE (Refills & Acc.)</option>
          <option value="SECURITY_DEPOSIT">SECURITY_DEPOSIT (SV)</option>
          <option value="SERVICE">SERVICE (Fees)</option>
          <option value="SD_REFUND">SD_REFUND (Surrender)</option>
          <option value="RETURN">RETURN (Defective)</option>
          <option value="DUES_RECEIVED">DUES_RECEIVED</option>
        </select>
      </td>
      <td style="width:140px;"><input type="number" class="input-modern text-right font-mono admin-rate-price" min="0" step="0.01" value="0.00" /></td>
      <td class="text-center" style="width:60px;">
        <button type="button" class="btn-erp-danger btn-sm" onclick="ItemsModule.deleteRow(this)" title="Delete Product"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
    tr.querySelector('.admin-rate-item-name')?.focus();
  },

  async deleteRow(btn) {
    const tr = btn.closest('tr');
    if (!tr) return;

    const itemName = tr.querySelector('.admin-rate-item-name')?.value.trim() || 'this item';
    const confirmed = await ui.confirm(`Delete "${itemName}"?`, 'Item will be removed from your catalog once saved.');
    if (confirmed) {
      tr.remove();
      document.querySelectorAll('#adminRatesBody tr').forEach((row, i) => {
        const idxCell = row.querySelector('.row-idx');
        if (idxCell) idxCell.textContent = i + 1;
      });
      ui.toast(`Removed "${itemName}". Click Save to persist.`, 'warning');
    }
  },

  async save() {
    const rows = document.querySelectorAll('#adminRatesBody tr');
    const updatedRates = [];
    rows.forEach(tr => {
      const item = (tr.querySelector('.admin-rate-item-name')?.value || '').trim();
      const category = tr.querySelector('.admin-rate-category')?.value || 'SALE';
      const rate = Number(tr.querySelector('.admin-rate-price')?.value) || 0;
      if (item) {
        updatedRates.push({ item, category, rate });
      }
    });

    try {
      await api('adminUpdateRates', { rates: updatedRates }, { loadingText: 'Saving items & master rates catalog...' });
      this.items = updatedRates;
      ui.success('Master Catalog Updated', `${updatedRates.length} product rates saved successfully.`);
      window.dispatchEvent(new CustomEvent('catalogUpdated', { detail: { rates: updatedRates } }));
    } catch (e) {}
  }
};

window.ItemsModule = ItemsModule;
