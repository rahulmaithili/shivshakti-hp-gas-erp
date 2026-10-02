/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - CASH BOOK & DRAWER TILL RECONCILIATION MODULE
 * Cash in hand, Denominations Counter (500, 200, 100, 50, 20, 10, Coins), Day Close
 * ============================================================================
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { Auth } from '../auth.js';
import { formatINR } from '../utils.js';

export const CashbookModule = {
  data: {},

  async load(dateStr) {
    try {
      const res = await api('getCashbook', { date: dateStr }, { loadingText: 'Reconciling drawer cash till...' });
      this.data = res.cashBook || {};
      this.populate();
    } catch (e) {}
  },

  populate() {
    const cb = this.data;
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val !== undefined ? val : 0;
    };
    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = formatINR(val || 0);
    };

    setVal('cbOpeningCash', cb.openingCash);
    setTxt('cbBillingCash', cb.billingCash);
    setTxt('cbHawkerCash', cb.hawkerCash);
    setTxt('cbRecoveredCash', cb.duesRecoveredCash);
    setVal('cbExpenseOut', cb.expenseOut);
    setVal('cbRefundOut', cb.refundOut);

    // Denominations
    const d = cb.denominations || {};
    setVal('denom500', d.n500 || 0);
    setVal('denom200', d.n200 || 0);
    setVal('denom100', d.n100 || 0);
    setVal('denom50', d.n50 || 0);
    setVal('denom20', d.n20 || 0);
    setVal('denom10', d.n10 || 0);
    setVal('denomCoins', d.coins || 0);

    this.recalculate();
  },

  recalculate() {
    const opening = Number(document.getElementById('cbOpeningCash')?.value) || 0;
    const billing = Number(this.data.billingCash) || 0;
    const hawker = Number(this.data.hawkerCash) || 0;
    const dues = Number(this.data.duesRecoveredCash) || 0;
    const expenses = Number(document.getElementById('cbExpenseOut')?.value) || 0;
    const refunds = Number(document.getElementById('cbRefundOut')?.value) || 0;

    const systemClosing = opening + billing + hawker + dues - expenses - refunds;

    // Physical Till calculation
    const n500 = (Number(document.getElementById('denom500')?.value) || 0) * 500;
    const n200 = (Number(document.getElementById('denom200')?.value) || 0) * 200;
    const n100 = (Number(document.getElementById('denom100')?.value) || 0) * 100;
    const n50 = (Number(document.getElementById('denom50')?.value) || 0) * 50;
    const n20 = (Number(document.getElementById('denom20')?.value) || 0) * 20;
    const n10 = (Number(document.getElementById('denom10')?.value) || 0) * 10;
    const coins = Number(document.getElementById('denomCoins')?.value) || 0;

    const physicalTill = n500 + n200 + n100 + n50 + n20 + n10 + coins;
    const variance = physicalTill - systemClosing;

    const sysEl = document.getElementById('cbSystemClosing');
    const physEl = document.getElementById('cbPhysicalTill');
    const varEl = document.getElementById('cbTillVariance');

    if (sysEl) sysEl.textContent = formatINR(systemClosing);
    if (physEl) physEl.textContent = formatINR(physicalTill);
    if (varEl) {
      varEl.textContent = formatINR(variance);
      varEl.className = variance === 0 ? 'font-mono text-emerald font-bold' : 'font-mono text-rose font-bold';
    }

    return { systemClosing, physicalTill, variance };
  },

  async save(dateStr) {
    const calcs = this.recalculate();
    const payload = {
      date: dateStr,
      openingCash: Number(document.getElementById('cbOpeningCash')?.value) || 0,
      expenseOut: Number(document.getElementById('cbExpenseOut')?.value) || 0,
      refundOut: Number(document.getElementById('cbRefundOut')?.value) || 0,
      systemClosing: calcs.systemClosing,
      physicalTill: calcs.physicalTill,
      variance: calcs.variance,
      denominations: {
        n500: Number(document.getElementById('denom500')?.value) || 0,
        n200: Number(document.getElementById('denom200')?.value) || 0,
        n100: Number(document.getElementById('denom100')?.value) || 0,
        n50: Number(document.getElementById('denom50')?.value) || 0,
        n20: Number(document.getElementById('denom20')?.value) || 0,
        n10: Number(document.getElementById('denom10')?.value) || 0,
        coins: Number(document.getElementById('denomCoins')?.value) || 0
      }
    };

    try {
      await api('saveCashbook', { cashBook: payload }, { loadingText: 'Saving till reconciliation...' });
      ui.success('Till Saved', 'Drawer cash counts reconciled and saved.');
    } catch (e) {}
  },

  async closeDay(dateStr) {
    const calcs = this.recalculate();
    if (calcs.variance !== 0) {
      const proceed = await ui.confirm('Cash Discrepancy Detected', `Physical cash differs from system expected cash by ${formatINR(calcs.variance)}. Proceed with Day Close?`);
      if (!proceed) return;
    }

    const confirmed = await ui.confirm('Finalize & Close Business Day?', `Once closed, transactions for ${dateStr} cannot be edited without Administrator authorization.`);
    if (confirmed) {
      try {
        await api('closeDay', { date: dateStr }, { loadingText: 'Closing business day...' });
        ui.success('Day Closed', `Accounts finalized for ${dateStr}. Day is now locked.`);
      } catch (e) {}
    }
  },

  async unlockDay(dateStr) {
    if (!Auth.can('unlockDay', 'cashbook')) {
      ui.error('Access Denied', 'Only Administrator can unlock a closed day.');
      return;
    }

    const reason = await ui.prompt('Admin Day Unlock', 'Enter mandatory audit justification for unlocking this day:');
    if (reason) {
      try {
        await api('unlockDay', { date: dateStr, reason }, { loadingText: 'Unlocking business day...' });
        ui.success('Day Unlocked', `Day ${dateStr} is unlocked for modifications.`);
      } catch (e) {}
    }
  }
};

window.CashbookModule = CashbookModule;
