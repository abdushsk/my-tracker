/**
 * Data Management Module (US-070)
 * Export/Import functionality for backup and restore
 */

import {
  exportAllData,
  validateImportData,
  importAllData,
  clearAllData
} from '../../utils/storage.js';
import { getTodayDateString } from '../../utils/models.js';
import { playSound } from '../../utils/sounds.js';

// =============================================================================
// Callbacks
// =============================================================================

let callbacks = {
  loadData: null,
  renderSettingsScreen: null
};

/**
 * Register callbacks from settings module
 * @param {Object} cbs - Callback functions
 */
export function registerDataManagementCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// =============================================================================
// Exported Functions
// =============================================================================

/**
 * US-070: Attach data management listeners (export/import)
 * @param {HTMLElement} screen - The settings screen element
 */
export function attachDataManagementListeners(screen) {
  // Export button
  const exportBtn = screen.querySelector('#export-data-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', handleExportData);
  }

  // Import button
  const importBtn = screen.querySelector('#import-data-btn');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const fileInput = screen.querySelector('#import-file-input');
      if (fileInput) {
        fileInput.click();
      }
    });
  }

  // File input change handler
  const fileInput = screen.querySelector('#import-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', handleImportFileSelect);
  }

  // US-038: Reset button
  const resetBtn = screen.querySelector('#reset-data-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', handleResetData);
  }
}

/**
 * US-070: Handle export data button click
 * Exports all data as a JSON file download
 */
export async function handleExportData() {
  try {
    // Show loading state
    const exportBtn = document.querySelector('#export-data-btn');
    if (exportBtn) {
      exportBtn.disabled = true;
      exportBtn.querySelector('span').textContent = 'Exporting...';
    }

    // Get all data
    const exportData = await exportAllData();

    // Create blob and download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-goals-tracker-backup-${getTodayDateString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up
    URL.revokeObjectURL(url);

    // Show success feedback
    showDataManagementFeedback('success', 'Data exported successfully!');

    // Play sound
    playSound('tick');

    console.log('[Export] Data exported successfully');
  } catch (error) {
    console.error('[Export] Error exporting data:', error);
    showDataManagementFeedback('error', 'Failed to export data. Please try again.');
  } finally {
    // Reset button state
    const exportBtn = document.querySelector('#export-data-btn');
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.querySelector('span').textContent = 'Export Data';
    }
  }
}

// =============================================================================
// Internal Functions
// =============================================================================

/**
 * US-070: Handle file selection for import
 * @param {Event} e - File input change event
 */
async function handleImportFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Reset input for future selections
  e.target.value = '';

  try {
    // Read file
    const text = await file.text();
    let importData;

    try {
      importData = JSON.parse(text);
    } catch (parseError) {
      showDataManagementFeedback('error', 'Invalid JSON file. Please select a valid backup file.');
      return;
    }

    // Validate data
    const validation = validateImportData(importData);
    if (!validation.valid) {
      const errorMsg = validation.errors.slice(0, 3).join(', ');
      showDataManagementFeedback('error', `Invalid backup file: ${errorMsg}`);
      return;
    }

    // Show import options dialog
    showImportOptionsDialog(importData);
  } catch (error) {
    console.error('[Import] Error reading file:', error);
    showDataManagementFeedback('error', 'Failed to read file. Please try again.');
  }
}

/**
 * US-070: Show import options dialog (merge vs replace)
 * @param {Object} importData - The validated import data
 */
function showImportOptionsDialog(importData) {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'import-modal-overlay';
  overlay.innerHTML = `
    <div class="import-modal">
      <div class="import-modal-header">
        <h3>Import Data</h3>
        <button class="import-modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="import-modal-body">
        <p class="import-modal-info">
          Backup from: ${new Date(importData.exportedAt).toLocaleDateString()}<br>
          Contains: ${importData.data.goals?.length || 0} goals, ${importData.data.categories?.length || 0} categories
        </p>
        <p class="import-modal-question">How would you like to import this data?</p>
        <div class="import-options">
          <button class="btn btn-secondary import-option-btn" data-mode="merge">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            <span class="import-option-label">Merge</span>
            <span class="import-option-desc">Add new items, keep existing</span>
          </button>
          <button class="btn btn-danger import-option-btn" data-mode="replace">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
            <span class="import-option-label">Replace</span>
            <span class="import-option-desc">Replace all existing data</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
  });

  // Close handlers
  const closeModal = () => {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('.import-modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Import option handlers
  overlay.querySelectorAll('.import-option-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const mode = btn.getAttribute('data-mode');

      if (mode === 'replace') {
        if (!confirm('This will replace ALL your existing data. This action cannot be undone. Are you sure?')) {
          return;
        }
      }

      closeModal();

      // Perform import
      await performImport(importData, mode);
    });
  });
}

/**
 * US-070: Perform the actual data import
 * @param {Object} importData - The validated import data
 * @param {string} mode - 'merge' or 'replace'
 */
async function performImport(importData, mode) {
  try {
    // Show loading feedback
    showDataManagementFeedback('loading', 'Importing data...');

    // Perform import
    const result = await importAllData(importData, mode);

    if (result.success) {
      // Reload all state data
      if (callbacks.loadData) {
        await callbacks.loadData();
      }

      // Build success message
      let message = mode === 'replace' ? 'Data replaced successfully!' : 'Data merged successfully!';
      if (result.stats.goalsImported > 0) {
        message += ` ${result.stats.goalsImported} goals imported.`;
      }

      showDataManagementFeedback('success', message);
      playSound('complete');

      // Re-render settings screen
      if (callbacks.renderSettingsScreen) {
        callbacks.renderSettingsScreen();
      }

      console.log('[Import] Import completed:', result);
    } else {
      showDataManagementFeedback('error', result.message);
    }
  } catch (error) {
    console.error('[Import] Error during import:', error);
    showDataManagementFeedback('error', 'Import failed. Please try again.');
  }
}

/**
 * US-070: Show feedback message for data management operations
 * @param {string} type - 'success', 'error', or 'loading'
 * @param {string} message - The message to display
 */
export function showDataManagementFeedback(type, message) {
  // Remove existing feedback
  const existingFeedback = document.querySelector('.data-management-feedback');
  if (existingFeedback) {
    existingFeedback.remove();
  }

  // Create feedback element
  const feedback = document.createElement('div');
  feedback.className = `data-management-feedback feedback-${type}`;

  const icon = type === 'success' ?
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' :
    type === 'error' ?
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' :
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" class="spin"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';

  feedback.innerHTML = `${icon}<span>${message}</span>`;

  // Insert at top of settings content
  const settingsContent = document.querySelector('.settings-content');
  if (settingsContent) {
    settingsContent.insertBefore(feedback, settingsContent.firstChild);
  }

  // Auto-remove after delay (except loading)
  if (type !== 'loading') {
    setTimeout(() => {
      feedback.classList.add('fade-out');
      setTimeout(() => feedback.remove(), 300);
    }, 4000);
  }
}

/**
 * US-038: Handle reset data button click
 * Shows confirmation dialog before clearing all extension data
 */
async function handleResetData() {
  showResetConfirmationDialog();
}

/**
 * US-038: Show reset confirmation dialog
 * Requires user to confirm by typing "RESET" to prevent accidental data loss
 */
function showResetConfirmationDialog() {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'import-modal-overlay';
  overlay.innerHTML = `
    <div class="import-modal reset-modal">
      <div class="import-modal-header">
        <h3>Reset All Data</h3>
        <button class="import-modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="import-modal-body">
        <div class="reset-warning">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="32" height="32">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p><strong>Warning:</strong> This will permanently delete ALL your data including:</p>
        </div>
        <ul class="reset-items-list">
          <li>All goals and their progress</li>
          <li>Activity history and streaks</li>
          <li>Achievements and XP</li>
          <li>Categories</li>
          <li>All settings and preferences</li>
        </ul>
        <p class="reset-confirm-text">Type <strong>RESET</strong> to confirm:</p>
        <input type="text" class="reset-confirm-input" placeholder="Type RESET here" autocomplete="off">
        <div class="reset-actions">
          <button class="btn btn-secondary reset-cancel-btn">Cancel</button>
          <button class="btn btn-danger reset-confirm-btn" disabled>Reset Everything</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
  });

  // Get elements
  const confirmInput = overlay.querySelector('.reset-confirm-input');
  const confirmBtn = overlay.querySelector('.reset-confirm-btn');
  const cancelBtn = overlay.querySelector('.reset-cancel-btn');
  const closeBtn = overlay.querySelector('.import-modal-close');

  // Close handlers
  const closeModal = () => {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 200);
  };

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Enable confirm button only when "RESET" is typed
  confirmInput.addEventListener('input', () => {
    const isValid = confirmInput.value.trim().toUpperCase() === 'RESET';
    confirmBtn.disabled = !isValid;
  });

  // Handle reset confirmation
  confirmBtn.addEventListener('click', async () => {
    closeModal();
    await performReset();
  });

  // Focus the input
  setTimeout(() => confirmInput.focus(), 100);
}

/**
 * US-038: Perform the actual data reset
 * Clears all storage and reloads the extension
 */
async function performReset() {
  try {
    // Show loading feedback
    showDataManagementFeedback('loading', 'Resetting all data...');

    // Clear all data
    const success = await clearAllData();

    if (success) {
      showDataManagementFeedback('success', 'All data has been reset. Reloading...');
      playSound('complete');

      // Reload after a short delay to show the success message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      showDataManagementFeedback('error', 'Failed to reset data. Please try again.');
    }
  } catch (error) {
    console.error('[Reset] Error resetting data:', error);
    showDataManagementFeedback('error', 'An error occurred while resetting data.');
  }
}
