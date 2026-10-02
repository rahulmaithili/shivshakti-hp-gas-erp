/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - CUSTOMER DUES & CREDIT RECOVERY MODULE
 * Ageing Buckets (0-7, 8-30, 31-60, 60+), Dues Recovery, Admin Write-Off
 * ============================================================================
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { Auth } from '../auth.js';
import { formatINR, formatDisplayDate, escapeHtml } from '../utils.js';

export const DuesModule = {
  dues: [],
  currentFilter: 'PENDING',

  async load(filter = 'PENDING') {
    this.currentFilter = filter;
    try {
      const data = await api('listDues', { status: filter }, { loadingText: 'Loading credit ledger...' });
      this.dues = data.dues || [];
      this.renderTable(this.dues);
      this.renderAgeing(data.ageing || {});
    } catch (e) {}
  },

  renderAgeing(ageing) {
    const el0_7 = document.getElementById('dueAge0_7');
    const el8_30 = document.getElementById('dueAge8_30');
    const el31_60 = document.getElementById('dueAge31_60');
    const el60Plus = document.getElementById('dueAge60Plus');

    if (el0_7) el0_7.textContent = formatINR(ageing.bucket0_7 || 0);
    if (el8_30) el8_30.textContent = formatINR(ageing.bucket8_30 || 0);
    if (el31_60) el31_60.textContent = formatINR(ageing.bucket31_60 || 0);
    if (el60Plus) el60Plus.textContent = formatINR(ageing.bucket60Plus || 0);
  },

  renderTable(list) {
    const tbody = document.getElementById('duesTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center" style="padding: 2rem;">
            <div class="empty-state">
              <i class="fa-solid fa-file-invoice-dollar empty-state-icon"></i>
              <strong class="empty-state-title">No Unpaid Dues Found</strong>
              <p class="empty-state-desc">All customer credit accounts are settled for this filter.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map((d, i) => `
      <tr>
        <td class="text-center font-bold">${i + 1}</td>
        <td>${formatDisplayDate(d.date)}</td>
        <td>
          <strong>${escapeHtml(d.consumerName)}</strong>
          <small class="text-muted block">Bill No: ${escapeHtml(d.billNo || 'N/A')}</small>
        </td>
        <td class="font-mono">${escapeHtml(d.phone || '—')}</td>
        <td class="text-right font-mono">${formatINR(d.totalDue)}</td>
        <td class="text-right font-mono text-emerald">${formatINR(d.recoveredAmount || 0)}</td>
        <td class="text-right font-mono font-bold text-amber">${formatINR(d.balance)}</td>
        <td class="text-center">
          <div class="btn-group-cluster" style="justify-content:center;">
            <button class="btn-erp-success btn-sm" onclick="DuesModule.openRecoverModal('${d.dueId}', '${d.consumerName}', ${d.balance})" title="Recover Due">
              <i class="fa-solid fa-hand-holding-dollar"></i> Recover
            </button>
            ${Auth.can('writeOffDue', 'dues') ? `
              <button class="btn-erp-danger btn-sm" onclick="DuesModule.writeOff('${d.dueId}', '${d.consumerName}', ${d.balance})" title="Admin Write-Off">
                <i class="fa-solid fa-ban"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  async openRecoverModal(dueId, consumerName, balance) {
    const { value: formValues } = await Swal.fire({
      title: `Recover Due: ${consumerName}`,
      html: `
        <div style="text-align:left; font-size:0.88rem;">
          <p style="margin-bottom:8px;">Current Outstanding: <strong>${formatINR(balance)}</strong></p>
          <label style="display:block; font-weight:700; margin-bottom:4px;">Recovery Amount (₹):</label>
          <input id="swalRecoverAmount" type="number" class="swal2-input" style="width:100%; margin:0 0 10px;" value="${balance}" max="${balance}" min="1" step="0.01" />
          <label style="display:block; font-weight:700; margin-bottom:4px;">Payment Mode:</label>
          <select id="swalRecoverMode" class="swal2-input" style="width:100%; margin:0 0 10px;">
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="BANK">Bank / RTGS</option>
          </select>
          <label style="display:block; font-weight:700; margin-bottom:4px;">Remarks:</label>
          <input id="swalRecoverRemarks" type="text" class="swal2-input" style="width:100%; margin:0;" placeholder="Payment reference or notes" />
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Confirm Recovery',
      preConfirm: () => {
        const amount = Number(document.getElementById('swalRecoverAmount').value);
        if (!amount || amount <= 0 || amount > balance) {
          Swal.showValidationMessage('Enter a valid amount between ₹1 and current balance.');
          return false;
        }
        return {
          amount,
          payMode: document.getElementById('swalRecoverMode').value,
          remarks: document.getElementById('swalRecoverRemarks').value
        };
      }
    });

    if (formValues) {
      try {
        await api('recoverDue', {
          dueId,
          ...formValues
        }, { loadingText: 'Recording due recovery payment...' });
        ui.success('Due Recovered', `Payment of ${formatINR(formValues.amount)} recorded for ${consumerName}.`);
        await this.load(this.currentFilter);
      } catch (e) {}
    }
  },

  async writeOff(dueId, consumerName, balance) {
    if (!Auth.can('writeOffDue', 'dues')) {
      ui.error('Access Denied', 'Only authorized Administrator can write off customer dues.');
      return;
    }

    const reason = await ui.prompt(
      `Admin Write-Off for ${consumerName} (${formatINR(balance)})`,
      'Enter mandatory audit justification for write-off:'
    );

    if (reason) {
      const confirmed = await ui.confirm('Confirm Write-Off?', `Amount of ${formatINR(balance)} will be permanently written off from books.`);
      if (confirmed) {
        try {
          await api('writeOffDue', { dueId, reason }, { loadingText: 'Processing audit write-off...' });
          ui.success('Due Written Off', `Amount ${formatINR(balance)} written off under audit log.`);
          await this.load(this.currentFilter);
        } catch (e) {}
      }
    }
  }
};

window.DuesModule = DuesModule;
