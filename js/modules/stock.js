/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - CYLINDER INVENTORY & STOCK MODULE
 * 14.2KG, 19KG, 5KG Commercial/Domestic, 2KG, Plant Receipts, Defective Returns
 * ============================================================================
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { escapeHtml } from '../utils.js';

export const StockModule = {
  stocks: [],

  async load(dateStr) {
    try {
      const data = await api('getStock', { date: dateStr }, { loadingText: 'Loading cylinder stock registers...' });
      this.stocks = data.stocks || [];
      this.render();
    } catch (e) {}
  },

  render() {
    const tbody = document.getElementById('stockTableBody');
    if (!tbody) return;

    if (!this.stocks || this.stocks.length === 0) {
      this.stocks = [
        { type: '14.2 KG Domestic', openFull: 350, plantReceipt: 300, sold: 631, defective: 0, sentPlant: 300, closeFull: 19, closeEmpty: 319 },
        { type: '19 KG Commercial', openFull: 12, plantReceipt: 10, sold: 3, defective: 2, sentPlant: 10, closeFull: 19, closeEmpty: 3 },
        { type: '5 KG Commercial', openFull: 8, plantReceipt: 0, sold: 0, defective: 0, sentPlant: 0, closeFull: 8, closeEmpty: 0 },
        { type: '5 KG Domestic', openFull: 15, plantReceipt: 0, sold: 1, defective: 0, sentPlant: 0, closeFull: 14, closeEmpty: 1 },
        { type: '2 KG Commercial', openFull: 5, plantReceipt: 0, sold: 0, defective: 0, sentPlant: 0, closeFull: 5, closeEmpty: 0 }
      ];
    }

    tbody.innerHTML = this.stocks.map((s, idx) => `
      <tr data-type="${escapeHtml(s.type)}">
        <td><strong>${escapeHtml(s.type)}</strong></td>
        <td><input type="number" class="input-modern font-mono text-center s-open-full" min="0" value="${s.openFull || 0}" /></td>
        <td><input type="number" class="input-modern font-mono text-center s-plant" min="0" value="${s.plantReceipt || 0}" /></td>
        <td><input type="number" class="input-modern font-mono text-center s-sold" min="0" value="${s.sold || 0}" /></td>
        <td><input type="number" class="input-modern font-mono text-center s-defect" min="0" value="${s.defective || 0}" /></td>
        <td><input type="number" class="input-modern font-mono text-center s-sent" min="0" value="${s.sentPlant || 0}" /></td>
        <td><input type="number" class="input-modern font-mono text-center s-close-full" min="0" value="${s.closeFull || 0}" /></td>
        <td><input type="number" class="input-modern font-mono text-center s-close-empty" min="0" value="${s.closeEmpty || 0}" /></td>
      </tr>
    `).join('');
  },

  async save(dateStr) {
    const list = [];
    document.querySelectorAll('#stockTableBody tr').forEach(tr => {
      list.push({
        type: tr.getAttribute('data-type'),
        openFull: Number(tr.querySelector('.s-open-full')?.value) || 0,
        plantReceipt: Number(tr.querySelector('.s-plant')?.value) || 0,
        sold: Number(tr.querySelector('.s-sold')?.value) || 0,
        defective: Number(tr.querySelector('.s-defect')?.value) || 0,
        sentPlant: Number(tr.querySelector('.s-sent')?.value) || 0,
        closeFull: Number(tr.querySelector('.s-close-full')?.value) || 0,
        closeEmpty: Number(tr.querySelector('.s-close-empty')?.value) || 0
      });
    });

    try {
      await api('saveStock', { date: dateStr, stocks: list }, { loadingText: 'Saving cylinder inventory counts...' });
      ui.success('Stock Saved', 'Physical cylinder stock counts updated successfully.');
    } catch (e) {}
  }
};

window.StockModule = StockModule;
