/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - SETTINGS & THEMES MODULE
 * System Preferences, Theme Palettes (6 Pre-sets), Day/Dark Toggle, Storage Sync
 * ============================================================================
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { CONFIG } from '../config.js';

export const SettingsModule = {
  palettes: {
    navy: {
      '--navy-primary': '#001f3f',
      '--navy-dark': '#001529',
      '--navy-light': '#003366',
      '--navy-accent': '#0074D9',
      '--navy-hover': '#002a52',
      '--bg-sidebar': '#001529',
      '--bg-sidebar-active': '#0074D9',
      '--primary': '#0074D9',
      '--border-focus': '#0074D9'
    },
    sapphire: {
      '--navy-primary': '#1e3a8a',
      '--navy-dark': '#172554',
      '--navy-light': '#2563eb',
      '--navy-accent': '#3b82f6',
      '--navy-hover': '#1d4ed8',
      '--bg-sidebar': '#0f172a',
      '--bg-sidebar-active': '#2563eb',
      '--primary': '#2563eb',
      '--border-focus': '#2563eb'
    },
    emerald: {
      '--navy-primary': '#064e3b',
      '--navy-dark': '#022c22',
      '--navy-light': '#047857',
      '--navy-accent': '#10b981',
      '--navy-hover': '#059669',
      '--bg-sidebar': '#062820',
      '--bg-sidebar-active': '#059669',
      '--primary': '#059669',
      '--border-focus': '#059669'
    },
    charcoal: {
      '--navy-primary': '#18181b',
      '--navy-dark': '#09090b',
      '--navy-light': '#27272a',
      '--navy-accent': '#52525b',
      '--navy-hover': '#3f3f46',
      '--bg-sidebar': '#18181b',
      '--bg-sidebar-active': '#3f3f46',
      '--primary': '#3f3f46',
      '--border-focus': '#71717a'
    },
    crimson: {
      '--navy-primary': '#881337',
      '--navy-dark': '#4c0519',
      '--navy-light': '#be123c',
      '--navy-accent': '#e11d48',
      '--navy-hover': '#9f1239',
      '--bg-sidebar': '#2e020d',
      '--bg-sidebar-active': '#be123c',
      '--primary': '#be123c',
      '--border-focus': '#e11d48'
    },
    amber: {
      '--navy-primary': '#78350f',
      '--navy-dark': '#451a03',
      '--navy-light': '#b45309',
      '--navy-accent': '#d97706',
      '--navy-hover': '#92400e',
      '--bg-sidebar': '#291205',
      '--bg-sidebar-active': '#d97706',
      '--primary': '#d97706',
      '--border-focus': '#d97706'
    }
  },

  initTheme() {
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const savedVars = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME_VARS);
    if (savedVars) {
      try {
        const parsed = JSON.parse(savedVars);
        Object.keys(parsed).forEach(k => {
          document.documentElement.style.setProperty(k, parsed[k]);
        });
      } catch (e) {}
    }
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, next);
    ui.toast(`${next === 'dark' ? 'Night / Dark' : 'Day / Light'} mode activated`, 'info');
  },

  applyPalette(name) {
    const vars = this.palettes[name] || this.palettes.navy;
    Object.keys(vars).forEach(k => {
      document.documentElement.style.setProperty(k, vars[k]);
    });
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME_VARS, JSON.stringify(vars));
    ui.success('Palette Applied', `Active theme changed to ${name.toUpperCase()}.`);
  },

  resetPalette() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.THEME_VARS);
    this.applyPalette('navy');
    ui.toast('Reset to default Enterprise Navy', 'info');
  }
};

window.SettingsModule = SettingsModule;
