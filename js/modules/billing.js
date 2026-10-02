/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - POS BILLING & NEW CONNECTION PACKAGE MODULE
 * Multi-item Cart, 5 Payment Modes, Zero-Tolerance Paise Balance Guard, SV Bundle
 * ============================================================================
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { Validation } from '../validation.js';
import { formatINR, toPaise, fromPaise, escapeHtml } from '../utils.js';
import { PrintEngine } from './print.js';

export const BillingModule = {
  cart: [],
  catalog: [],

  init(masterCatalog = []) {
    this.catalog = masterCatalog;
  },

  addItemRow(itemData = {}) {
    const rowId = 'row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const item = {
      rowId,
      itemId: itemData.id || '',
      item: itemData.item || '',
      category: itemData.category || 'SALE',
      rate: Number(itemData.rate) || 0,
      qty: Number(itemData.qty) || 1,
      amount: (Number(itemData.rate) || 0) * (Number(itemData.qty) || 1)
    };
    this.cart.push(item);
    this.renderCart();
  },

  removeItemRow(rowId) {
    this.cart = this.cart.filter(r => r.rowId !== rowId);
    if (this.cart.length === 0) {
      this.addItemRow();
    } else {
      this.renderCart();
    }
  },

  updateRow(rowId, field, value) {
    const row = this.cart.find(r => r.rowId === rowId);
    if (!row) return;

    if (field === 'itemSelect') {
      const selected = this.catalog.find(c => c.item === value);
      if (selected) {
        row.itemId = selected.id || '';
        row.item = selected.item;
        row.category = selected.category;
        row.rate = Number(selected.rate) || 0;
      } else {
        row.item = value;
      }
    } else if (field === 'qty') {
      row.qty = Math.max(1, Number(value) || 1);
    } else if (field === 'rate') {
      row.rate = Math.max(0, Number(value) || 0);
    }

    row.amount = row.qty * row.rate;
    this.renderCart();
  },

  calculateTotal() {
    return this.cart.reduce((sum, r) => sum + (r.amount || 0), 0);
  },

  renderCart() {
    const tbody = document.getElementById('posLineItemsBody');
    if (!tbody) return;

    let html = '';
    this.cart.forEach((row, idx) => {
      let optionsHtml = '<option value="">Select Product...</option>';
      this.catalog.forEach(catItem => {
        const isSel = catItem.item === row.item ? 'selected' : '';
        optionsHtml += `<option value="${escapeHtml(catItem.item)}" ${isSel}>${escapeHtml(catItem.item)} (₹${catItem.rate})</option>`;
      });

      html += `
        <tr data-row-id="${row.rowId}">
          <td class="text-center font-bold" style="width:40px;">${idx + 1}</td>
          <td>
            <select class="input-modern pos-item-select" onchange="BillingModule.updateRow('${row.rowId}', 'itemSelect', this.value)">
              ${optionsHtml}
            </select>
          </td>
          <td><span class="badge-pill info">${row.category}</span></td>
          <td style="width:130px;">
            <input type="number" class="input-modern text-right font-mono" min="0" step="0.01" value="${row.rate}" onchange="BillingModule.updateRow('${row.rowId}', 'rate', this.value)" />
          </td>
          <td style="width:100px;">
            <input type="number" class="input-modern text-center font-mono" min="1" step="1" value="${row.qty}" onchange="BillingModule.updateRow('${row.rowId}', 'qty', this.value)" />
          </td>
          <td class="text-right font-mono font-bold" style="width:140px;">
            ${formatINR(row.amount)}
          </td>
          <td class="text-center" style="width:50px;">
            <button type="button" class="btn-erp-danger btn-sm" onclick="BillingModule.removeItemRow('${row.rowId}')" title="Delete Row">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    const total = this.calculateTotal();
    const grandTotalEl = document.getElementById('posGrandTotalDisplay');
    const totalRequiredEl = document.getElementById('posTotalRequired');
    if (grandTotalEl) grandTotalEl.textContent = formatINR(total);
    if (totalRequiredEl) totalRequiredEl.textContent = formatINR(total);

    this.checkSettlementBalance();
  },

  checkSettlementBalance() {
    const total = this.calculateTotal();
    const settlements = {
      cash: Number(document.getElementById('posSettleCash')?.value) || 0,
      upi: Number(document.getElementById('posSettleUpi')?.value) || 0,
      hpPay: Number(document.getElementById('posSettleHpPay')?.value) || 0,
      dues: Number(document.getElementById('posSettleDues')?.value) || 0,
      other: Number(document.getElementById('posSettleOther')?.value) || 0
    };

    const check = Validation.validateSettlement(total, settlements);
    const badge = document.getElementById('posStatusBadge');
    const statusText = document.getElementById('posStatusText');
    const totalGivenEl = document.getElementById('posTotalGiven');

    if (totalGivenEl) totalGivenEl.textContent = formatINR(check.sumPaise / 100);

    if (check.isValid) {
      if (badge) badge.className = 'pos-settle-badge balanced';
      if (statusText) statusText.textContent = 'Balanced & Reconciled ✓';
    } else {
      if (badge) badge.className = 'pos-settle-badge mismatch';
      const diffStr = formatINR(Math.abs(check.diffAmount));
      if (statusText) {
        statusText.textContent = check.diffAmount > 0 ? `Short by ${diffStr}` : `Excess by ${diffStr}`;
      }
    }

    return check;
  },

  applyPreset(mode) {
    const total = this.calculateTotal();
    const cashEl = document.getElementById('posSettleCash');
    const upiEl = document.getElementById('posSettleUpi');
    const hpPayEl = document.getElementById('posSettleHpPay');
    const duesEl = document.getElementById('posSettleDues');
    const otherEl = document.getElementById('posSettleOther');

    if (cashEl) cashEl.value = mode === 'CASH' ? total : 0;
    if (upiEl) upiEl.value = mode === 'UPI' ? total : 0;
    if (hpPayEl) hpPayEl.value = mode === 'HP_PAY' ? total : 0;
    if (duesEl) duesEl.value = mode === 'DUES' ? total : 0;
    if (otherEl) otherEl.value = mode === 'OTHER' ? total : 0;

    this.checkSettlementBalance();
  },

  async submitBill(formEl, dateStr) {
    if (this.cart.length === 0 || !this.cart.some(r => r.item)) {
      ui.warn('Empty Cart', 'Please add at least one valid item to the bill.');
      return;
    }

    const check = this.checkSettlementBalance();
    if (!check.isValid) {
      ui.error('Payment Mismatch', `The payment breakdown does not equal the invoice total of ${formatINR(this.calculateTotal())}. Variance: ${formatINR(check.diffAmount)}.`);
      return;
    }

    const duesAmount = Number(document.getElementById('posSettleDues')?.value) || 0;
    const consumerName = document.getElementById('entryConsumerName')?.value.trim();
    const consumerMobile = document.getElementById('entryConsumerMobile')?.value.trim();

    if (duesAmount > 0 && !consumerName) {
      ui.warn('Customer Name Required', 'Transactions with unpaid Dues must specify the Customer / Consumer name.');
      return;
    }

    const payload = {
      date: dateStr,
      consumerName: consumerName || 'Cash Sale',
      consumerMobile: consumerMobile || '',
      consumerNo: document.getElementById('entryConsumerNo')?.value.trim() || '',
      category: document.getElementById('entryCategory')?.value || 'SALE',
      remarks: document.getElementById('entryRemarks')?.value.trim() || '',
      items: this.cart,
      totalAmount: this.calculateTotal(),
      settlements: {
        cash: Number(document.getElementById('posSettleCash')?.value) || 0,
        upi: Number(document.getElementById('posSettleUpi')?.value) || 0,
        hpPay: Number(document.getElementById('posSettleHpPay')?.value) || 0,
        dues: duesAmount,
        other: Number(document.getElementById('posSettleOther')?.value) || 0
      }
    };

    try {
      const res = await api('addEntry', { entry: payload }, { loadingText: 'Registering POS bill transaction...' });
      ui.success('Invoice Created', `Bill #${res.billNo || 'OK'} registered successfully.`);
      
      // Reset form
      this.cart = [];
      this.addItemRow();
      formEl.reset();
      this.applyPreset('CASH');

      // Prompt to Print
      const printChoice = await ui.confirm('Print Bill Receipt?', 'Would you like to print this invoice now?', 'Print A4 / Thermal', 'No, Later');
      if (printChoice) {
        PrintEngine.preview(PrintEngine.generateThermalReceipt(res), '80mm');
      }

      window.dispatchEvent(new CustomEvent('billCreated'));
    } catch (e) {}
  },

  async cancelBill(billId) {
    const reason = await ui.prompt('Mandatory Cancellation Reason', 'Enter audit reason for cancelling this bill:');
    if (!reason) return;

    try {
      await api('cancelBill', { billId, reason }, { loadingText: 'Reversing bill transactions...' });
      ui.success('Bill Cancelled', 'Stock, dues, and payment balances reversed successfully.');
      window.dispatchEvent(new CustomEvent('billCancelled'));
    } catch (e) {}
  }
};

window.BillingModule = BillingModule;
