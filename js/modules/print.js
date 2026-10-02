/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - CENTRALIZED PRINT ENGINE & PREVIEW SYSTEM
 * Supports: A4 Invoice, 80mm Thermal Slip, Daily Rojnamcha, Payslips, Statements
 * ============================================================================
 */

import { CompanyModule } from './company.js';
import { formatINR, formatDisplayDate } from '../utils.js';

export const PrintEngine = {
  currentHtml: '',
  currentDocType: 'a4',

  /**
   * Generates standard printable header
   */
  getHeaderHtml(docTitle, docNumber = '', docDate = '') {
    const comp = CompanyModule.data;
    const logoHtml = comp.logoBase64
      ? `<img src="${comp.logoBase64}" class="print-header-logo" alt="Logo" />`
      : `<div style="width:50px;height:50px;background:#e11d48;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;border-radius:4px;">HP</div>`;

    return `
      <div class="print-header">
        <div>${logoHtml}</div>
        <div class="print-header-info">
          <div class="print-agency-name">${comp.agencyName || comp.companyName}</div>
          <div class="print-agency-details">
            ${comp.addressLine1}, ${comp.addressLine2 ? comp.addressLine2 + ', ' : ''}${comp.district}, ${comp.state} - ${comp.pin}<br/>
            Phone: ${comp.phone} | GSTIN: ${comp.gstin || 'N/A'} | Code: ${comp.distributorCode}
          </div>
          <div style="font-weight:800; font-size:12pt; margin-top:4px; text-decoration:underline;">${docTitle}</div>
        </div>
        <div style="font-size:8.5pt; text-align:right;">
          ${docNumber ? `<strong>Doc No:</strong> ${docNumber}<br/>` : ''}
          <strong>Date:</strong> ${formatDisplayDate(docDate) || formatDisplayDate(new Date())}<br/>
          <strong>Print:</strong> ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    `;
  },

  /**
   * Generates standard printable footer
   */
  getFooterHtml(signLabel = 'Authorized Signatory') {
    return `
      <div class="print-footer-signatures">
        <div>
          <span>Customer / Receiver Sign: ________________</span>
        </div>
        <div>
          <span>For ${CompanyModule.data.agencyName || 'Shiv Shakti HP Gas'}:</span><br/><br/>
          <span>${signLabel}</span>
        </div>
      </div>
      <div style="text-align:center; font-size:7.5pt; color:#666; margin-top:8px;">
        This is a computer generated document. Thank you for using HP Gas! Safe Domestic Cooking.
      </div>
    `;
  },

  /**
   * Open Print Preview Modal
   */
  preview(contentHtml, docType = 'a4') {
    this.currentHtml = contentHtml;
    this.currentDocType = docType;

    const modal = document.getElementById('modalPrintPreview');
    const container = document.getElementById('printPreviewContent');
    if (!modal || !container) return;

    container.className = `print-document-wrap ${docType === '80mm' ? 'print-mode-thermal' : ''}`;
    container.innerHTML = contentHtml;
    modal.classList.remove('hidden');
  },

  /**
   * Triggers actual physical print
   */
  print() {
    if (this.currentDocType === '80mm') {
      document.body.classList.add('print-mode-thermal');
    } else {
      document.body.classList.remove('print-mode-thermal');
    }
    window.print();
  },

  /**
   * Generates 80mm Thermal POS Receipt HTML
   */
  generateThermalReceipt(bill) {
    const comp = CompanyModule.data;
    let itemsRows = '';
    (bill.items || []).forEach(it => {
      itemsRows += `
        <tr>
          <td style="border-bottom:1px dashed #999; padding:2px 0;">${it.item} x${it.qty}</td>
          <td style="border-bottom:1px dashed #999; text-align:right; padding:2px 0;">${formatINR(it.amount)}</td>
        </tr>
      `;
    });

    return `
      <div style="font-family:'JetBrains Mono', monospace; font-size:9pt; width:72mm; margin:0 auto; line-height:1.2;">
        <div style="text-align:center; border-bottom:1px dashed #000; padding-bottom:4px; margin-bottom:4px;">
          <strong style="font-size:11pt;">${comp.agencyName}</strong><br/>
          ${comp.addressLine1}, ${comp.district}<br/>
          Phone: ${comp.phone}<br/>
          GSTIN: ${comp.gstin || 'N/A'}<br/>
          ** CASH / RETAIL INVOICE **
        </div>
        <div style="font-size:8pt; margin-bottom:4px;">
          Bill No: <strong>${bill.billNo || 'POS-REC'}</strong><br/>
          Date: ${formatDisplayDate(bill.date)} ${bill.time || ''}<br/>
          Customer: ${bill.consumerName || 'Counter Cash Sale'}<br/>
          ${bill.mobile ? 'Mobile: ' + bill.mobile + '<br/>' : ''}
        </div>
        <table style="width:100%; border-collapse:collapse; margin:4px 0; font-size:8.5pt;">
          <thead>
            <tr style="border-bottom:1px solid #000;">
              <th style="text-align:left;">Item / Qty</th>
              <th style="text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
        <div style="border-top:1px solid #000; padding-top:4px; font-weight:800; display:flex; justify-content:space-between;">
          <span>TOTAL AMOUNT:</span>
          <span>${formatINR(bill.totalAmount)}</span>
        </div>
        <div style="font-size:8pt; margin:4px 0; border-top:1px dashed #999; padding-top:4px;">
          Payment: Cash: ${formatINR(bill.cash || 0)} | UPI: ${formatINR(bill.upi || 0)} | Dues: ${formatINR(bill.dues || 0)}
        </div>
        <div style="text-align:center; font-size:7.5pt; margin-top:8px; border-top:1px dashed #000; padding-top:4px;">
          Thank you for ordering with HP Gas!<br/>
          Emergency / Leakage Helpline: 1906
        </div>
      </div>
    `;
  }
};
