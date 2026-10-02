/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - VALIDATION ENGINE
 * Client-side schema validation for mobile, Aadhaar last-4, GSTIN, and payments
 * ============================================================================
 */

import { toPaise } from './utils.js';

export const Validation = {
  /**
   * Validates Indian 10-digit mobile number
   */
  isValidMobile(mobile) {
    if (!mobile) return false;
    const clean = String(mobile).replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(clean);
  },

  /**
   * Validates optional email address
   */
  isValidEmail(email) {
    if (!email) return true; // Optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
  },

  /**
   * Security Rule: Validate ONLY last 4 digits of Aadhaar
   */
  isValidAadhaarLast4(aadhaar) {
    if (!aadhaar) return true; // Optional
    const clean = String(aadhaar).trim();
    return /^\d{4}$/.test(clean);
  },

  /**
   * Validates positive integer / quantity
   */
  isPositiveNumber(val, allowZero = false) {
    const num = Number(val);
    if (isNaN(num)) return false;
    return allowZero ? num >= 0 : num > 0;
  },

  /**
   * Zero-tolerance POS payment balance check using integer paise
   */
  validateSettlement(totalAmount, settlements) {
    const totalPaise = toPaise(totalAmount);
    const sumPaise =
      toPaise(settlements.cash || 0) +
      toPaise(settlements.upi || 0) +
      toPaise(settlements.hpPay || 0) +
      toPaise(settlements.dues || 0) +
      toPaise(settlements.other || 0);

    const diffPaise = totalPaise - sumPaise;

    return {
      isValid: diffPaise === 0,
      diffPaise: diffPaise,
      diffAmount: diffPaise / 100,
      totalPaise,
      sumPaise
    };
  }
};
