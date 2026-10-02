/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - PAYROLL & SALARY DISBURSEMENT MODULE
 * Attendance adjustment, Delivery incentive, Advance recovery, Payslips
 * ============================================================================
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { formatINR, escapeHtml } from '../utils.js';
import { PrintEngine } from './print.js';

export const SalaryModule = {
  list: [],

  async load(monthStr) {
    try {
      const data = await api('calcSalary', { month: monthStr }, { loadingText: 'Calculating payroll...' });
      this.list = data.salaries || [];
      this.render();
    } catch (e) {}
  },

  render() {
    const tbody = document.getElementById('salaryTableBody');
    if (!tbody) return;

    if (!this.list || this.list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding:1.5rem;">No payroll records generated for this month.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.list.map((s, idx) => `
      <tr>
        <td class="text-center font-bold">${idx + 1}</td>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td class="text-right font-mono">${formatINR(s.baseSalary)}</td>
        <td class="text-center font-mono">${s.presentDays} / ${s.totalDays}</td>
        <td class="text-right font-mono text-emerald">+${formatINR(s.deliveryIncentive || 0)}</td>
        <td class="text-right font-mono text-rose">-${formatINR(s.advanceDeduction || 0)}</td>
        <td class="text-right font-mono font-bold">${formatINR(s.netSalary)}</td>
        <td class="text-center">
          <button class="btn-erp-outline btn-sm" onclick="SalaryModule.printSlip('${s.empId}')" title="Print Payslip">
            <i class="fa-solid fa-print"></i> Payslip
          </button>
        </td>
      </tr>
    `).join('');
  },

  printSlip(empId) {
    const emp = this.list.find(s => s.empId === empId);
    if (!emp) return;

    const header = PrintEngine.getHeaderHtml('EMPLOYEE SALARY PAYSLIP', `PAY-${emp.empId}`, new Date());
    const content = `
      ${header}
      <div style="margin: 15px 0; border: 1px solid #000; padding: 12px; font-size: 10pt;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
          <tr>
            <td style="padding: 4px;"><strong>Employee Name:</strong> ${escapeHtml(emp.name)}</td>
            <td style="padding: 4px;"><strong>Employee ID:</strong> ${escapeHtml(emp.empId)}</td>
          </tr>
          <tr>
            <td style="padding: 4px;"><strong>Department / Role:</strong> ${escapeHtml(emp.role || 'Delivery')}</td>
            <td style="padding: 4px;"><strong>Attendance Days:</strong> ${emp.presentDays} Days</td>
          </tr>
        </table>

        <table class="print-table" style="width: 100%;">
          <thead>
            <tr>
              <th>Earnings / Inflow</th>
              <th style="text-align: right;">Amount (₹)</th>
              <th>Deductions / Recoveries</th>
              <th style="text-align: right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic Fixed Salary</td>
              <td style="text-align: right;" class="font-mono">${formatINR(emp.baseSalary)}</td>
              <td>Advance Recovery</td>
              <td style="text-align: right;" class="font-mono text-rose">${formatINR(emp.advanceDeduction || 0)}</td>
            </tr>
            <tr>
              <td>Delivery Incentive (${emp.deliveries || 0} cyls)</td>
              <td style="text-align: right;" class="font-mono text-emerald">${formatINR(emp.deliveryIncentive || 0)}</td>
              <td>Other Deductions / Shortages</td>
              <td style="text-align: right;" class="font-mono">₹0.00</td>
            </tr>
            <tr style="font-weight: 800; background: #f8fafc;">
              <td>TOTAL EARNINGS</td>
              <td style="text-align: right;" class="font-mono">${formatINR(emp.baseSalary + (emp.deliveryIncentive || 0))}</td>
              <td>TOTAL DEDUCTIONS</td>
              <td style="text-align: right;" class="font-mono">${formatINR(emp.advanceDeduction || 0)}</td>
            </tr>
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding: 10px; background: #f1f5f9; border: 1px solid #cbd5e1; font-weight: 900; font-size: 11pt;">
          <span>NET PAYABLE DISBURSEMENT:</span>
          <span style="font-size: 13pt;">${formatINR(emp.netSalary)}</span>
        </div>
      </div>
      ${PrintEngine.getFooterHtml('Employee Acknowledgment')}
    `;

    PrintEngine.preview(content, 'a4');
  }
};

window.SalaryModule = SalaryModule;
