/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - COMPANY & LOGO MANAGEMENT MODULE
 * Handles Company Profile CRUD, Base64 Logo Upload, and companyRenderer()
 * ============================================================================
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { fileToBase64 } from '../utils.js';
import { CONFIG } from '../config.js';

export const CompanyModule = {
  data: {
    companyId: 'comp_1',
    companyName: 'Shiv Shakti HP Gas',
    legalName: 'Shiv Shakti Gas Service',
    agencyName: 'Shiv Shakti HP Gas (Pandaul)',
    distributorCode: 'HP-124908',
    hpclCode: 'HPCL-BIH-PAN-01',
    addressLine1: 'Near Main Market, Station Road',
    addressLine2: 'Pandaul, Madhubani',
    district: 'Madhubani',
    state: 'Bihar',
    pin: '847234',
    phone: '+91 94312 00000',
    email: 'shivshaktihpgas@gmail.com',
    gstin: '10AAACR1234F1Z5',
    pan: 'AAACR1234F',
    bankName: 'State Bank of India',
    bankAccount: '300012345678',
    ifsc: 'SBIN0001234',
    upi: 'shivshakti@sbi',
    logoBase64: null,
    logoMimeType: null
  },

  async init() {
    await this.loadCompany();
  },

  async loadCompany() {
    try {
      const res = await api('getCompany', {}, { showLoading: false });
      if (res && res.company) {
        this.data = { ...this.data, ...res.company };
        localStorage.setItem(CONFIG.STORAGE_KEYS.COMPANY, JSON.stringify(this.data));
      }
    } catch (e) {
      // Use cached or fallback
      const cached = localStorage.getItem(CONFIG.STORAGE_KEYS.COMPANY);
      if (cached) {
        this.data = JSON.parse(cached);
      }
    }
    this.companyRenderer();
  },

  /**
   * Reusable companyRenderer() that updates company profile everywhere
   */
  companyRenderer() {
    const nameEls = document.querySelectorAll('.company-name-text');
    nameEls.forEach(el => { el.textContent = this.data.agencyName || this.data.companyName; });

    const addrEls = document.querySelectorAll('.company-address-text');
    addrEls.forEach(el => {
      el.textContent = `${this.data.addressLine1}, ${this.data.addressLine2 || ''}, ${this.data.district}, ${this.data.state} - ${this.data.pin}`;
    });

    const phoneEls = document.querySelectorAll('.company-phone-text');
    phoneEls.forEach(el => { el.textContent = this.data.phone; });

    const gstinEls = document.querySelectorAll('.company-gstin-text');
    gstinEls.forEach(el => { el.textContent = this.data.gstin || 'N/A'; });

    // Render Logo or Initials Everywhere
    this.renderCompanyLogo();
  },

  renderCompanyLogo() {
    const logoContainers = document.querySelectorAll('.agency-logo-render');
    logoContainers.forEach(container => {
      if (this.data.logoBase64) {
        container.innerHTML = `<img src="${this.data.logoBase64}" alt="${this.data.companyName}" style="width:100%; height:100%; object-fit:contain; border-radius:inherit;" />`;
      } else {
        container.innerHTML = `<span style="font-weight:900; font-size:1.1rem; color:#fff;">HP</span>`;
      }
    });
  },

  async saveCompany(formValues) {
    try {
      const updated = await api('saveCompany', { company: formValues }, { loadingText: 'Saving company profile...' });
      this.data = { ...this.data, ...formValues };
      localStorage.setItem(CONFIG.STORAGE_KEYS.COMPANY, JSON.stringify(this.data));
      this.companyRenderer();
      ui.success('Company Profile Saved', 'Agency details updated successfully.');
    } catch (err) {
      // Handled by central api
    }
  },

  async uploadLogo(file) {
    try {
      const base64Data = await fileToBase64(file);
      await api('uploadCompanyLogo', {
        logoBase64: base64Data.base64,
        logoMimeType: base64Data.mimeType
      }, { loadingText: 'Uploading logo...' });

      this.data.logoBase64 = base64Data.base64;
      this.data.logoMimeType = base64Data.mimeType;
      localStorage.setItem(CONFIG.STORAGE_KEYS.COMPANY, JSON.stringify(this.data));
      this.companyRenderer();
      ui.success('Logo Uploaded', 'Agency logo updated successfully across all documents.');
    } catch (err) {
      ui.error('Logo Upload Failed', err.message);
    }
  },

  async removeLogo() {
    const confirmed = await ui.confirm('Remove Agency Logo?', 'The system will revert to the default initials emblem.');
    if (confirmed) {
      try {
        await api('removeCompanyLogo', {}, { loadingText: 'Removing logo...' });
        this.data.logoBase64 = null;
        this.data.logoMimeType = null;
        localStorage.setItem(CONFIG.STORAGE_KEYS.COMPANY, JSON.stringify(this.data));
        this.companyRenderer();
        ui.success('Logo Removed', 'Reverted to default emblem.');
      } catch (e) {}
    }
  }
};
