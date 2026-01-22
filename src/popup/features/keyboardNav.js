/**
 * Keyboard Navigation Feature (US-078)
 * Provides keyboard shortcuts and navigation for goal management
 */

import { state, SCREENS } from '../state.js';
import { GOAL_TYPES } from '../../utils/models.js';
import { performUndo, performRedo } from './undoRedo.js';

// =============================================================================
// Callback Registration
// =============================================================================

/**
 * Registered callbacks for cross-module communication
 */
const callbacks = {
  handleTimerToggle: null,
  handleCheckboxToggle: null,
  handleCounterIncrement: null,
  handleCounterDecrement: null,
  openGoalFormScreen: null
};

/**
 * Register callbacks from the main popup module
 * @param {Object} cbs - Callback functions
 */
export function registerKeyboardNavCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// =============================================================================
// Goal Selection
// =============================================================================

/**
 * Get the list of visible goals for keyboard navigation
 * @returns {Array} Array of goals that are currently visible
 */
export function getVisibleGoals() {
  // Sort goals by order property, then by createdAt (same as renderGoalsList)
  let sortedGoals = [...state.goals].sort((a, b) => {
    if (a.order !== b.order) {
      return (a.order || 0) - (b.order || 0);
    }
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  // Apply category filter if active
  if (state.categoryFilter && state.categoryFilter !== 'all') {
    sortedGoals = sortedGoals.filter(goal => goal.category === state.categoryFilter);
  }

  return sortedGoals;
}

/**
 * Update the visual selection indicator for keyboard navigation
 */
export function updateKeyboardSelectionVisual() {
  // Remove previous selection
  document.querySelectorAll('.goal-card.keyboard-selected').forEach(card => {
    card.classList.remove('keyboard-selected');
  });

  // If no selection or invalid index, done
  const visibleGoals = getVisibleGoals();
  if (state.keyboardSelectedGoalIndex < 0 || state.keyboardSelectedGoalIndex >= visibleGoals.length) {
    return;
  }

  // Add selection to current goal
  const selectedGoal = visibleGoals[state.keyboardSelectedGoalIndex];
  const selectedCard = document.querySelector(`.goal-card[data-goal-id="${selectedGoal.id}"]`);
  if (selectedCard) {
    selectedCard.classList.add('keyboard-selected');
    // Scroll into view if needed
    selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Select a goal by index for keyboard navigation
 * @param {number} index - The index to select
 */
export function selectGoalByIndex(index) {
  const visibleGoals = getVisibleGoals();
  if (visibleGoals.length === 0) {
    state.keyboardSelectedGoalIndex = -1;
    return;
  }

  // Clamp index to valid range
  if (index < 0) {
    index = visibleGoals.length - 1; // Wrap to end
  } else if (index >= visibleGoals.length) {
    index = 0; // Wrap to start
  }

  state.keyboardSelectedGoalIndex = index;
  updateKeyboardSelectionVisual();
}

/**
 * Move keyboard selection up (previous goal)
 */
export function selectPreviousGoal() {
  const visibleGoals = getVisibleGoals();
  if (visibleGoals.length === 0) return;

  if (state.keyboardSelectedGoalIndex < 0) {
    // Start from the last goal if nothing selected
    selectGoalByIndex(visibleGoals.length - 1);
  } else {
    selectGoalByIndex(state.keyboardSelectedGoalIndex - 1);
  }
}

/**
 * Move keyboard selection down (next goal)
 */
export function selectNextGoal() {
  const visibleGoals = getVisibleGoals();
  if (visibleGoals.length === 0) return;

  if (state.keyboardSelectedGoalIndex < 0) {
    // Start from the first goal if nothing selected
    selectGoalByIndex(0);
  } else {
    selectGoalByIndex(state.keyboardSelectedGoalIndex + 1);
  }
}

/**
 * Get the currently selected goal (if any)
 * @returns {Object|null} The selected goal or null
 */
export function getSelectedGoal() {
  const visibleGoals = getVisibleGoals();
  if (state.keyboardSelectedGoalIndex < 0 || state.keyboardSelectedGoalIndex >= visibleGoals.length) {
    return null;
  }
  return visibleGoals[state.keyboardSelectedGoalIndex];
}

/**
 * Reset keyboard selection (e.g., when navigating away from View Goals)
 */
export function resetKeyboardSelection() {
  state.keyboardSelectedGoalIndex = -1;
  updateKeyboardSelectionVisual();
}

// =============================================================================
// Goal Actions
// =============================================================================

/**
 * Perform the primary action on the selected goal
 * - Timer: toggle play/pause
 * - Counter: increment
 * - Checkbox: toggle completion
 */
export function performPrimaryActionOnSelectedGoal() {
  const goal = getSelectedGoal();
  if (!goal) return;

  switch (goal.type) {
    case GOAL_TYPES.TIMER:
      if (callbacks.handleTimerToggle) {
        callbacks.handleTimerToggle(goal.id);
      }
      break;
    case GOAL_TYPES.CHECKBOX:
      if (callbacks.handleCheckboxToggle) {
        callbacks.handleCheckboxToggle(goal.id);
      }
      break;
    case GOAL_TYPES.COUNTER:
      // For counter, Space increments (consistent with being the "primary" action)
      if (callbacks.handleCounterIncrement) {
        callbacks.handleCounterIncrement(goal.id);
      }
      break;
  }
}

/**
 * Increment the selected counter goal
 */
export function incrementSelectedGoal() {
  const goal = getSelectedGoal();
  if (!goal || goal.type !== GOAL_TYPES.COUNTER) return;
  if (callbacks.handleCounterIncrement) {
    callbacks.handleCounterIncrement(goal.id);
  }
}

/**
 * Decrement the selected counter goal
 */
export function decrementSelectedGoal() {
  const goal = getSelectedGoal();
  if (!goal || goal.type !== GOAL_TYPES.COUNTER) return;
  if (callbacks.handleCounterDecrement) {
    callbacks.handleCounterDecrement(goal.id);
  }
}

/**
 * Edit the currently selected goal
 */
export function editSelectedGoal() {
  const goal = getSelectedGoal();
  if (!goal) return;
  if (callbacks.openGoalFormScreen) {
    callbacks.openGoalFormScreen('edit', goal);
  }
}

// =============================================================================
// Keyboard Shortcuts Help Overlay
// =============================================================================

/**
 * Render the keyboard shortcuts help overlay
 * @returns {string} HTML string for the help overlay
 */
export function renderKeyboardShortcutsHelp() {
  return `
    <div class="keyboard-shortcuts-overlay" id="keyboard-shortcuts-overlay">
      <div class="keyboard-shortcuts-modal">
        <div class="keyboard-shortcuts-header">
          <h2 class="keyboard-shortcuts-title">Keyboard Shortcuts</h2>
          <button class="keyboard-shortcuts-close" id="keyboard-shortcuts-close" title="Close (Escape)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="keyboard-shortcuts-content">
          <div class="shortcut-section">
            <h3 class="shortcut-section-title">Navigation</h3>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>↑</kbd> / <kbd>↓</kbd></span>
              <span class="shortcut-description">Navigate between goals</span>
            </div>
          </div>
          <div class="shortcut-section">
            <h3 class="shortcut-section-title">Goal Actions</h3>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Space</kbd></span>
              <span class="shortcut-description">Toggle timer / checkbox, or increment counter</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>+</kbd> / <kbd>=</kbd></span>
              <span class="shortcut-description">Increment selected counter</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>-</kbd></span>
              <span class="shortcut-description">Decrement selected counter</span>
            </div>
          </div>
          <div class="shortcut-section">
            <h3 class="shortcut-section-title">Quick Actions</h3>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>N</kbd></span>
              <span class="shortcut-description">Create new goal</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>E</kbd></span>
              <span class="shortcut-description">Edit selected goal</span>
            </div>
          </div>
          <div class="shortcut-section">
            <h3 class="shortcut-section-title">Undo / Redo</h3>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>Z</kbd></span>
              <span class="shortcut-description">Undo last action</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>Y</kbd></span>
              <span class="shortcut-description">Redo last undone action</span>
            </div>
          </div>
          <div class="shortcut-section">
            <h3 class="shortcut-section-title">General</h3>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>?</kbd></span>
              <span class="shortcut-description">Show this help</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-keys"><kbd>Escape</kbd></span>
              <span class="shortcut-description">Close dialogs / Exit focus mode</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Show the keyboard shortcuts help overlay
 */
export function showKeyboardShortcutsHelp() {
  // Don't show if already visible
  if (state.keyboardShortcutsHelpVisible) return;

  state.keyboardShortcutsHelpVisible = true;

  // Create and append the overlay
  const overlay = document.createElement('div');
  overlay.innerHTML = renderKeyboardShortcutsHelp();
  document.body.appendChild(overlay.firstElementChild);

  // Attach close button listener
  const closeBtn = document.getElementById('keyboard-shortcuts-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', hideKeyboardShortcutsHelp);
  }

  // Close on overlay background click
  const overlayEl = document.getElementById('keyboard-shortcuts-overlay');
  if (overlayEl) {
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) {
        hideKeyboardShortcutsHelp();
      }
    });
  }
}

/**
 * Hide the keyboard shortcuts help overlay
 */
export function hideKeyboardShortcutsHelp() {
  state.keyboardShortcutsHelpVisible = false;

  const overlay = document.getElementById('keyboard-shortcuts-overlay');
  if (overlay) {
    overlay.remove();
  }
}

// =============================================================================
// Global Keyboard Handler
// =============================================================================

/**
 * Check if an input element is focused (to avoid triggering shortcuts while typing)
 * @returns {boolean} True if an input/textarea is focused
 */
function isInputFocused() {
  const activeEl = document.activeElement;
  if (!activeEl) return false;

  const tagName = activeEl.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || activeEl.isContentEditable;
}

/**
 * Global keyboard event handler for shortcuts
 * @param {KeyboardEvent} e - The keyboard event
 */
function handleGlobalKeyboardShortcut(e) {
  // Don't handle if typing in an input field
  if (isInputFocused()) return;

  // US-079: Handle Ctrl+Z for undo (works globally, not just on View Goals)
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    performUndo();
    return;
  }

  // US-079: Handle Ctrl+Y or Ctrl+Shift+Z for redo (works globally)
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey) || (e.key === 'Z' && e.shiftKey))) {
    e.preventDefault();
    performRedo();
    return;
  }

  // Handle Escape key globally (close help overlay, modals, or exit focus mode)
  if (e.key === 'Escape') {
    if (state.keyboardShortcutsHelpVisible) {
      e.preventDefault();
      hideKeyboardShortcutsHelp();
      return;
    }
    // Focus mode escape is handled elsewhere
    return;
  }

  // Handle ? for help (shift+/ on US keyboards)
  if (e.key === '?' || (e.shiftKey && e.key === '/')) {
    e.preventDefault();
    if (state.keyboardShortcutsHelpVisible) {
      hideKeyboardShortcutsHelp();
    } else {
      showKeyboardShortcutsHelp();
    }
    return;
  }

  // The remaining shortcuts only work on the View Goals screen
  if (state.currentScreen !== SCREENS.VIEW_GOALS) return;

  // Don't handle if help is visible (except for escape which is handled above)
  if (state.keyboardShortcutsHelpVisible) return;

  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault();
      selectPreviousGoal();
      break;

    case 'ArrowDown':
      e.preventDefault();
      selectNextGoal();
      break;

    case ' ': // Space
      e.preventDefault();
      performPrimaryActionOnSelectedGoal();
      break;

    case '+':
    case '=': // Allow = as alias for + (no need to press shift)
      e.preventDefault();
      incrementSelectedGoal();
      break;

    case '-':
      e.preventDefault();
      decrementSelectedGoal();
      break;

    case 'n':
    case 'N':
      e.preventDefault();
      if (callbacks.openGoalFormScreen) {
        callbacks.openGoalFormScreen('add');
      }
      break;

    case 'e':
    case 'E':
      e.preventDefault();
      editSelectedGoal();
      break;
  }
}

/**
 * Initialize keyboard shortcuts system
 * Should be called once during app initialization
 */
export function initKeyboardShortcuts() {
  document.addEventListener('keydown', handleGlobalKeyboardShortcut);
}
