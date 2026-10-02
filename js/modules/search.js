/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - 360° GLOBAL SEARCH MODULE
 * 300ms Debounced search across Bills, Customers, Hawkers, Products, and Dues
 * ============================================================================
 */

import { debounce, escapeHtml, formatINR } from '../utils.js';
import { Router } from '../router.js';

export const SearchModule = {
  dataCache: {
    bills: [],
    customers: [],
    hawkers: [],
    items: []
  },

  init(cache = {}) {
    this.dataCache = { ...this.dataCache, ...cache };
    const input = document.getElementById('globalSearchInput');
    if (input) {
      input.addEventListener('input', debounce((e) => this.handleSearch(e.target.value), 300));
    }
  },

  handleSearch(query) {
    const dropdown = document.getElementById('globalSearchResults');
    const clearBtn = document.getElementById('globalSearchClear');
    if (!dropdown) return;

    const q = (query || '').trim().toLowerCase();
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', q.length === 0);
    }

    if (q.length < 2) {
      dropdown.classList.add('hidden');
      dropdown.innerHTML = '';
      return;
    }

    let html = '';

    // 1. Search in Bills
    const billMatches = (this.dataCache.bills || []).filter(b =>
      (b.consumerName && b.consumerName.toLowerCase().includes(q)) ||
      (b.item && b.item.toLowerCase().includes(q)) ||
      (b.billNo && b.billNo.toLowerCase().includes(q))
    ).slice(0, 4);

    if (billMatches.length > 0) {
      html += '<div class="search-group-title"><i class="fa-solid fa-receipt"></i> Bills & Transactions</div>';
      billMatches.forEach(b => {
        html += `
          <div class="search-result-item" onclick="Router.navigate('screen-billing'); SearchModule.clear();">
            <div>
              <strong>${escapeHtml(b.consumerName || 'Cash Sale')}</strong>
              <small class="text-muted"> • ${escapeHtml(b.item)} (${formatINR(b.amount)})</small>
            </div>
            <span class="badge-tag">${b.payMode || 'CASH'}</span>
          </div>
        `;
      });
    }

    // 2. Search in Customers
    const customerMatches = (this.dataCache.customers || []).filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.mobile && c.mobile.includes(q))
    ).slice(0, 4);

    if (customerMatches.length > 0) {
      html += '<div class="search-group-title"><i class="fa-solid fa-users"></i> Customers (CRM)</div>';
      customerMatches.forEach(c => {
        html += `
          <div class="search-result-item" onclick="Router.navigate('screen-customers'); SearchModule.clear();">
            <div><strong>${escapeHtml(c.name)}</strong> <small class="text-muted">• ${c.mobile}</small></div>
            <span class="badge-tag">Customer</span>
          </div>
        `;
      });
    }

    // 3. Search in Master Catalog Items
    const itemMatches = (this.dataCache.items || []).filter(it =>
      (it.item && it.item.toLowerCase().includes(q))
    ).slice(0, 4);

    if (itemMatches.length > 0) {
      html += '<div class="search-group-title"><i class="fa-solid fa-box"></i> Products & Catalog</div>';
      itemMatches.forEach(it => {
        html += `
          <div class="search-result-item" onclick="Router.navigate('screen-items'); SearchModule.clear();">
            <div><strong>${escapeHtml(it.item)}</strong> <small class="text-muted">• ${formatINR(it.rate)}</small></div>
            <span class="badge-tag">${it.category}</span>
          </div>
        `;
      });
    }

    if (!html) {
      html = '<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">No matching records found.</div>';
    }

    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');
  },

  clear() {
    const input = document.getElementById('globalSearchInput');
    const dropdown = document.getElementById('globalSearchResults');
    const clearBtn = document.getElementById('globalSearchClear');
    if (input) input.value = '';
    if (dropdown) {
      dropdown.innerHTML = '';
      dropdown.classList.add('hidden');
    }
    if (clearBtn) clearBtn.classList.add('hidden');
  }
};

window.SearchModule = SearchModule;
