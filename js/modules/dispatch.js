/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - HAWKERS & GODOWN DISPATCH MODULE
 * Delivery tracking, empty returns, collection reconciliation, shortage/excess
 * ============================================================================
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { formatINR, escapeHtml } from '../utils.js';

export const DispatchModule = {
  hawkers: [
    'MONU', 'SAROJ', 'BHOGENDRA', 'RAVI PRAKASH', 'GENA LAL',
    'BECHAN', 'DINESH', 'MANTUN', 'BAJRANGI', 'SUJIT',
    'SANJAY', 'Raja Faiyazi', 'Faiyaz'
  ],
  logs: [],

  async load(dateStr) {
    try {
      const data = await api('listVendorLog', { date: dateStr }, { loadingText: 'Loading hawker dispatch registers...' });
      this.logs = data.logs || [];
      if (data.hawkers && data.hawkers.length > 0) {
        this.hawkers = data.hawkers;
      }
      this.render();
    } catch (e) {}
  },

  render() {
    const tbody = document.getElementById('vendorLogTableBody');
    if (!tbody) return;

    let html = '';
    // Row 1: Godown Counter
    const gdLog = this.logs.find(l => l.name === 'Godown') || { name: 'Godown Counter (Retail GD)', loaded: 257, returnEmpty: 257, netSold: 257, cash: 247996, upi: 15630, dues: 4168 };
    html += this.buildRowHtml('Godown', 'Godown Counter (Retail GD)', gdLog, true);

    // Delivery Hawkers
    this.hawkers.forEach(hName => {
      const hLog = this.logs.find(l => l.name === hName) || { name: hName, loaded: 0, returnEmpty: 0, netSold: 0, cash: 0, upi: 0, dues: 0 };
      html += this.buildRowHtml(hName, hName, hLog, false);
    });

    tbody.innerHTML = html;
    this.recalcTotals();
  },

  buildRowHtml(id, displayName, log, isGodown = false) {
    return `
      <tr data-vendor="${escapeHtml(id)}">
        <td><strong>${escapeHtml(displayName)}</strong> ${isGodown ? '<span class="badge-pill info">Counter</span>' : ''}</td>
        <td><input type="number" class="input-modern font-mono text-center v-loaded" min="0" value="${log.loaded || 0}" oninput="DispatchModule.recalcTotals()" /></td>
        <td><input type="number" class="input-modern font-mono text-center v-empty" min="0" value="${log.returnEmpty || 0}" oninput="DispatchModule.recalcTotals()" /></td>
        <td class="text-center font-mono font-bold v-sold">${log.netSold || 0}</td>
        <td><input type="number" class="input-modern font-mono text-right v-cash" min="0" step="0.01" value="${log.cash || 0}" oninput="DispatchModule.recalcTotals()" /></td>
        <td><input type="number" class="input-modern font-mono text-right v-upi" min="0" step="0.01" value="${log.upi || 0}" oninput="DispatchModule.recalcTotals()" /></td>
        <td><input type="number" class="input-modern font-mono text-right v-dues" min="0" step="0.01" value="${log.dues || 0}" oninput="DispatchModule.recalcTotals()" /></td>
        <td class="text-right font-mono font-bold v-total-settled">₹0.00</td>
      </tr>
    `;
  },

  recalcTotals() {
    let totLoaded = 0, totEmpty = 0, totSold = 0, totCash = 0, totUpi = 0, totDues = 0;

    document.querySelectorAll('#vendorLogTableBody tr').forEach(tr => {
      const loaded = Number(tr.querySelector('.v-loaded')?.value) || 0;
      const empty = Number(tr.querySelector('.v-empty')?.value) || 0;
      const sold = loaded; // cylinders delivered
      const cash = Number(tr.querySelector('.v-cash')?.value) || 0;
      const upi = Number(tr.querySelector('.v-upi')?.value) || 0;
      const dues = Number(tr.querySelector('.v-dues')?.value) || 0;

      const soldCell = tr.querySelector('.v-sold');
      const settledCell = tr.querySelector('.v-total-settled');
      if (soldCell) soldCell.textContent = sold;
      if (settledCell) settledCell.textContent = formatINR(cash + upi + dues);

      totLoaded += loaded;
      totEmpty += empty;
      totSold += sold;
      totCash += cash;
      totUpi += upi;
      totDues += dues;
    });

    const totCylEl = document.getElementById('vendorTotCyl');
    const totCashEl = document.getElementById('vendorTotCash');
    const totUpiEl = document.getElementById('vendorTotUpi');
    const totDuesEl = document.getElementById('vendorTotDues');

    if (totCylEl) totCylEl.textContent = `${totSold} Pcs`;
    if (totCashEl) totCashEl.textContent = formatINR(totCash);
    if (totUpiEl) totUpiEl.textContent = formatINR(totUpi);
    if (totDuesEl) totDuesEl.textContent = formatINR(totDues);
  },

  async save(dateStr) {
    const records = [];
    document.querySelectorAll('#vendorLogTableBody tr').forEach(tr => {
      records.push({
        name: tr.getAttribute('data-vendor'),
        loaded: Number(tr.querySelector('.v-loaded')?.value) || 0,
        returnEmpty: Number(tr.querySelector('.v-empty')?.value) || 0,
        netSold: Number(tr.querySelector('.v-sold')?.textContent) || 0,
        cash: Number(tr.querySelector('.v-cash')?.value) || 0,
        upi: Number(tr.querySelector('.v-upi')?.value) || 0,
        dues: Number(tr.querySelector('.v-dues')?.value) || 0
      });
    });

    try {
      await api('saveVendorLog', { date: dateStr, logs: records }, { loadingText: 'Updating hawker dispatch registers...' });
      ui.success('Dispatch Saved', 'Hawker registers updated and synced with Daily Sales Report.');
    } catch (e) {}
  }
};

window.DispatchModule = DispatchModule;
