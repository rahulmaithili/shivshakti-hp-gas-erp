/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - STAFF ATTENDANCE MODULE
 * Daily Attendance Register, Bulk Mark Present, Status (P, A, HD, L)
 * ============================================================================
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { escapeHtml } from '../utils.js';

export const AttendanceModule = {
  list: [],

  async load(dateStr) {
    try {
      const data = await api('getAttendance', { date: dateStr }, { loadingText: 'Loading staff attendance...' });
      this.list = data.attendance || [];
      this.render();
    } catch (e) {}
  },

  render() {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;

    if (!this.list || this.list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:1.5rem;">No staff registered for attendance.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.list.map((a, idx) => `
      <tr data-emp="${escapeHtml(a.empId)}">
        <td class="text-center font-bold">${idx + 1}</td>
        <td><strong>${escapeHtml(a.name)}</strong></td>
        <td><span class="badge-pill info">${escapeHtml(a.role || 'Staff')}</span></td>
        <td style="width:200px;">
          <select class="input-modern att-status font-bold">
            <option value="PRESENT" ${a.status === 'PRESENT' ? 'selected' : ''}>🟢 Present</option>
            <option value="ABSENT" ${a.status === 'ABSENT' ? 'selected' : ''}>🔴 Absent</option>
            <option value="HALF_DAY" ${a.status === 'HALF_DAY' ? 'selected' : ''}>🟡 Half Day</option>
            <option value="LEAVE" ${a.status === 'LEAVE' ? 'selected' : ''}>🔵 Approved Leave</option>
          </select>
        </td>
        <td>
          <input type="text" class="input-modern att-remarks" value="${escapeHtml(a.remarks || '')}" placeholder="Optional notes" />
        </td>
      </tr>
    `).join('');
  },

  markAll(status = 'PRESENT') {
    document.querySelectorAll('#attendanceTableBody .att-status').forEach(sel => {
      sel.value = status;
    });
    ui.toast(`Marked all staff as ${status}`, 'info');
  },

  async save(dateStr) {
    const records = [];
    document.querySelectorAll('#attendanceTableBody tr').forEach(tr => {
      records.push({
        empId: tr.getAttribute('data-emp'),
        status: tr.querySelector('.att-status')?.value || 'PRESENT',
        remarks: tr.querySelector('.att-remarks')?.value.trim() || ''
      });
    });

    try {
      await api('markAttendance', { date: dateStr, attendance: records }, { loadingText: 'Saving attendance register...' });
      ui.success('Attendance Saved', `Attendance for ${dateStr} saved successfully.`);
    } catch (e) {}
  }
};

window.AttendanceModule = AttendanceModule;
