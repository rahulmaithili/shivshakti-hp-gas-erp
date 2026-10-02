/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - CENTRAL UI & SWEETALERT2 WRAPPER
 * Standardized interface notifications, toasts, prompts, and modal loaders
 * ============================================================================
 */

export const ui = {
  /**
   * Top-right non-blocking toast
   */
  toast(message, type = 'info') {
    if (window.Swal) {
      const icon = type === 'error' ? 'error' : (type === 'warning' ? 'warning' : (type === 'success' ? 'success' : 'info'));
      return Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.onmouseenter = Swal.stopTimer;
          toast.onmouseleave = Swal.resumeTimer;
        }
      }).fire({
        icon,
        title: message
      });
    }
    // Minimal fallback
    console.log(`[Toast ${type}]: ${message}`);
  },

  /**
   * Success notification modal
   */
  success(title, text = '') {
    if (window.Swal) {
      return Swal.fire({
        icon: 'success',
        title,
        text,
        timer: 2400,
        showConfirmButton: false
      });
    }
    this.toast(title, 'success');
  },

  /**
   * Error notification modal
   */
  error(title, text = '') {
    if (window.Swal) {
      return Swal.fire({
        icon: 'error',
        title,
        text,
        confirmButtonText: 'Understood'
      });
    }
    this.toast(`${title}: ${text}`, 'error');
  },

  /**
   * Warning notification modal
   */
  warn(title, text = '') {
    if (window.Swal) {
      return Swal.fire({
        icon: 'warning',
        title,
        text,
        confirmButtonText: 'OK'
      });
    }
    this.toast(`${title}: ${text}`, 'warning');
  },

  /**
   * Confirmation dialog with promise (replaces native window.confirm)
   */
  async confirm(title, text = '', confirmButtonText = 'Yes, Proceed', cancelButtonText = 'Cancel') {
    if (window.Swal) {
      const result = await Swal.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText,
        cancelButtonText,
        reverseButtons: true,
        focusCancel: true
      });
      return result.isConfirmed;
    }
    return window.confirm(`${title}\n${text}`);
  },

  /**
   * Single input prompt dialog (replaces native window.prompt)
   */
  async prompt(title, inputPlaceholder = '', inputType = 'text', confirmButtonText = 'Submit') {
    if (window.Swal) {
      const result = await Swal.fire({
        title,
        input: inputType,
        inputPlaceholder,
        showCancelButton: true,
        confirmButtonText,
        cancelButtonText: 'Cancel',
        inputValidator: (value) => {
          if (!value) {
            return 'This field is required!';
          }
        }
      });
      return result.isConfirmed ? result.value : null;
    }
    return window.prompt(title);
  },

  /**
   * Global action loader overlay
   */
  loading(text = 'Processing transaction...') {
    const loader = document.getElementById('actionLoader');
    const txt = document.getElementById('actionLoaderText');
    const bar = document.getElementById('topLoadBar');
    if (bar) bar.className = 'top-loadbar loading';
    if (txt) txt.textContent = text;
    if (loader) loader.classList.remove('hidden');
  },

  /**
   * Close global action loader
   */
  close() {
    const loader = document.getElementById('actionLoader');
    const bar = document.getElementById('topLoadBar');
    if (bar) {
      bar.className = 'top-loadbar finish';
      setTimeout(() => { bar.className = 'top-loadbar'; }, 300);
    }
    if (loader) loader.classList.add('hidden');
    if (window.Swal && Swal.isVisible()) {
      // Don't auto-close modals if Swal is open unless explicit
    }
  }
};
