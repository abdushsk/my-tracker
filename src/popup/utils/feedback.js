/**
 * Feedback Utilities (US-028)
 * Toast notifications and form error display functions
 */

import { escapeHtml } from './formatting.js';

// =============================================================================
// Success Toast Notification
// =============================================================================

/**
 * Show success feedback to the user (brief toast notification)
 * @param {string} message - The success message to display
 */
export function showSuccessFeedback(message) {
  // Create toast element if it doesn't exist
  let toast = document.getElementById('feedback-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'feedback-toast';
    toast.className = 'feedback-toast';
    document.body.appendChild(toast);
  }

  // Set success styling and message
  toast.className = 'feedback-toast success';
  toast.innerHTML = `
    <span class="toast-icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  // Show the toast
  toast.classList.add('visible');

  // Auto-hide after 2.5 seconds
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 2500);

  console.log(`[Feedback] Success: ${message}`);
}

// =============================================================================
// Form Error Banner
// =============================================================================

/**
 * Show error feedback in the form (general form error)
 * @param {string} message - The error message to display
 */
export function showFormError(message) {
  // Create or update form error element
  let formError = document.getElementById('goal-form-error');
  if (!formError) {
    formError = document.createElement('div');
    formError.id = 'goal-form-error';
    formError.className = 'form-error-banner';
    formError.setAttribute('role', 'alert');
    formError.setAttribute('aria-live', 'polite');

    // Insert at the top of the modal body
    const modalBody = document.querySelector('.modal-body');
    if (modalBody) {
      modalBody.insertBefore(formError, modalBody.firstChild);
    }
  }

  formError.innerHTML = `
    <span class="error-icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </span>
    <span class="error-message">${escapeHtml(message)}</span>
  `;

  formError.classList.add('visible');

  // Auto-hide after 5 seconds
  setTimeout(() => {
    formError.classList.remove('visible');
  }, 5000);

  console.log(`[Feedback] Error: ${message}`);
}

/**
 * Clear any form error banner
 */
export function clearFormError() {
  const formError = document.getElementById('goal-form-error');
  if (formError) {
    formError.classList.remove('visible');
    formError.textContent = '';
  }
}

// =============================================================================
// Input Field Error States
// =============================================================================

/**
 * Show error state for an input field
 * @param {HTMLInputElement} input - The input element
 * @param {HTMLElement} errorElement - The error message element
 * @param {string} message - The error message to display
 */
export function showInputError(input, errorElement, message) {
  input.classList.add('has-error');
  input.classList.remove('is-valid');
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', errorElement.id);

  errorElement.textContent = message;
  errorElement.classList.add('visible');
}

/**
 * Clear error state for an input field
 * @param {HTMLInputElement} input - The input element
 * @param {HTMLElement} errorElement - The error message element
 */
export function clearInputError(input, errorElement) {
  input.classList.remove('has-error');
  input.setAttribute('aria-invalid', 'false');

  errorElement.textContent = '';
  errorElement.classList.remove('visible');
}
