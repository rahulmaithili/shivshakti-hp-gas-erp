/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - GOOGLE DRIVE ARCHIVE & DATABASE BACKUP MODULE
 * Automated Cloud PDF / Excel Exports, Drive Folder Hierarchy, Spreadsheet Backup
 * ============================================================================
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { formatDisplayDate, escapeHtml } from '../utils.js';

export const ArchiveModule = {
  archives: [],

  async load() {
    try {
      const data = await api('listArchives', {}, { loadingText: 'Loading Drive archives...' });
      this.archives = data.archives || [];
      this.render();
    } catch (e) {}
  },

  render() {
    const tbody = document.getElementById('archivesTableBody');
    if (!tbody) return;

    if (!this.archives || this.archives.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:1.5rem;">No cloud archives found in Google Drive.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.archives.map((a, i) => `
      <tr>
        <td class="text-center font-bold">${i + 1}</td>
        <td><strong>${escapeHtml(a.fileName)}</strong></td>
        <td>${formatDisplayDate(a.date)}</td>
        <td><span class="badge-pill info">${escapeHtml(a.fileType || 'PDF')}</span></td>
        <td class="text-center">
          <a href="${a.url}" target="_blank" class="btn-erp-outline btn-sm">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Open in Drive
          </a>
        </td>
      </tr>
    `).join('');
  },

  async generate(dateStr) {
    const confirmed = await ui.confirm('Archive Daily Report to Google Drive?', `Official PDF and Excel snapshots for ${formatDisplayDate(dateStr)} will be generated and saved in Drive.`);
    if (confirmed) {
      try {
        const res = await api('generateArchive', { date: dateStr }, { loadingText: 'Exporting PDF & XLSX to Drive...' });
        ui.success('Archive Complete', 'Daily Rojnamcha archived to Google Drive successfully.');
        if (res.pdfUrl) {
          window.open(res.pdfUrl, '_blank');
        }
        await this.load();
      } catch (e) {}
    }
  },

  async backupDatabase() {
    const confirmed = await ui.confirm('Create Full Database Backup?', 'A complete snapshot copy of the master Google Spreadsheet will be created in your Drive backup folder.');
    if (confirmed) {
      try {
        const res = await api('backupDatabase', {}, { loadingText: 'Creating Drive spreadsheet backup...' });
        ui.success('Backup Successful', `Master database snapshot created: ${res.backupName || 'Success'}.`);
        await this.load();
      } catch (e) {}
    }
  }
};

window.ArchiveModule = ArchiveModule;
