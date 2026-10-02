/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - AUDIT LOG & COMPLIANCE MODULE
 * Immutable tracking of logins, password resets, write-offs, day closings
 * ============================================================================
 */

import { api } from '../api.js';
import { formatDisplayDate, escapeHtml } from '../utils.js';

export const AuditModule = {
  logs: [],

  async load() {
    try {
      const data = await api('listAudit', {}, { loadingText: 'Loading system audit logs...' });
      this.logs = data.logs || [];
      this.render();
    } catch (e) {}
  },

  render() {
    const tbody = document.getElementById('auditLogsTableBody');
    if (!tbody) return;

    if (!this.logs || this.logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:1.5rem;">No security audit events recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.logs.map((log, i) => `
      <tr>
        <td class="text-center font-bold">${i + 1}</td>
        <td class="font-mono">${escapeHtml(log.timestamp || '')}</td>
        <td><strong>${escapeHtml(log.username || log.userId || 'System')}</strong></td>
        <td><span class="badge-pill info font-bold">${escapeHtml(log.action)}</span></td>
        <td>${escapeHtml(log.module || 'CORE')}</td>
        <td><small>${escapeHtml(log.reason || log.details || '—')}</small></td>
      </tr>
    `).join('');
  }
};

window.AuditModule = AuditModule;
