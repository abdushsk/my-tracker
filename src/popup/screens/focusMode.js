/**
 * Focus Mode Screen (US-067)
 * Dedicated distraction-free view for working on a single goal
 */

import { state, SCREENS, SCREEN_IDS } from '../state.js';
import { escapeHtml, formatTime } from '../utils/formatting.js';
import {
  GOAL_TYPES,
  isGoalCompleted,
  getGoalCompletionPercentage
} from '../../utils/models.js';
import {
  saveFocusedGoalId,
  clearFocusedGoalId
} from '../../utils/storage.js';

// =============================================================================
// Callback Registration
// =============================================================================

/**
 * Registered callbacks for cross-module communication
 */
const callbacks = {
  showScreen: null,
  handleTimerToggle: null,
  handleCounterIncrement: null,
  handleCounterDecrement: null,
  handleCheckboxToggle: null,
  startTimerUpdateInterval: null,
  getGoalTypeIcon: null,
  capitalizeFirst: null
};

/**
 * Register callbacks from the main popup module
 * @param {Object} cbs - Callback functions
 */
export function registerFocusModeCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// =============================================================================
// Focus Mode Navigation
// =============================================================================

/**
 * Enter focus mode for a specific goal
 * @param {string} goalId - The ID of the goal to focus on
 */
export async function enterFocusMode(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) {
    console.error('[FocusMode] Goal not found:', goalId);
    return;
  }

  state.focusedGoalId = goalId;

  // Persist focus mode to storage so it can be restored on reopen
  await saveFocusedGoalId(goalId);

  if (callbacks.showScreen) {
    callbacks.showScreen(SCREENS.FOCUS_MODE);
  }
  console.log('[FocusMode] Entered focus mode for goal:', goal.title);
}

/**
 * Exit focus mode and return to View Goals screen
 */
export async function exitFocusMode() {
  state.focusedGoalId = null;

  // Clear focus mode from storage
  await clearFocusedGoalId();

  if (callbacks.showScreen) {
    callbacks.showScreen(SCREENS.VIEW_GOALS);
  }
  console.log('[FocusMode] Exited focus mode');
}

// =============================================================================
// Focus Mode Screen Rendering
// =============================================================================

/**
 * Render the Focus Mode screen
 * Shows a single goal with large, prominent timer/counter/checkbox display
 */
export function renderFocusModeScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.FOCUS_MODE]);
  if (!screen) return;

  const goal = state.goals.find(g => g.id === state.focusedGoalId);
  if (!goal) {
    console.error('[FocusMode] Goal not found for focus mode, returning to view goals');
    exitFocusMode();
    return;
  }

  const progressPercent = getGoalCompletionPercentage(goal);
  const isCompleted = isGoalCompleted(goal);
  const typeIcon = callbacks.getGoalTypeIcon ? callbacks.getGoalTypeIcon(goal.type) : '';
  const timeframeLabel = callbacks.capitalizeFirst ? callbacks.capitalizeFirst(goal.timeframe) : goal.timeframe;

  // Get category info for display
  const categoryInfo = goal.category ? state.categories.find(c => c.id === goal.category) : null;

  screen.innerHTML = `
    <div class="focus-mode-screen ${isCompleted ? 'focus-completed' : ''}">
      <header class="focus-mode-header">
        <button class="focus-exit-btn" id="focus-exit-btn" title="Exit Focus Mode (Esc)">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </header>
      <main class="focus-mode-content">
        <div class="focus-goal-info">
          <div class="focus-goal-meta">
            ${categoryInfo ? `<span class="focus-category-badge" style="background-color: ${categoryInfo.light}; color: ${categoryInfo.color}"><span class="category-color-dot" style="background-color: ${categoryInfo.color}"></span>${categoryInfo.name}</span>` : ''}
            <span class="focus-timeframe-badge timeframe-${goal.timeframe}">${timeframeLabel}</span>
          </div>
          <div class="focus-goal-title-row">
            <span class="focus-type-indicator">${typeIcon}</span>
            <h1 class="focus-goal-title">${escapeHtml(goal.title)}</h1>
          </div>
        </div>

        <div class="focus-progress-section">
          ${renderFocusModeDisplay(goal)}
        </div>

        <div class="focus-progress-bar-container">
          <div class="focus-progress-bar">
            <div class="focus-progress-fill ${isCompleted ? 'completed' : ''}" style="width: ${progressPercent}%"></div>
          </div>
          <span class="focus-progress-percent">${Math.round(progressPercent)}%</span>
        </div>

        <div class="focus-controls-section">
          ${renderFocusModeControls(goal)}
        </div>
      </main>
    </div>
  `;

  // Attach event listeners
  attachFocusModeListeners(screen);

  // Ensure timer updates if this is an active timer goal
  if (goal.type === GOAL_TYPES.TIMER && goal.isActive && callbacks.startTimerUpdateInterval) {
    callbacks.startTimerUpdateInterval();
  }

  console.log('[FocusMode] Rendered focus mode for:', goal.title);
}

// =============================================================================
// Focus Mode Display Components
// =============================================================================

/**
 * Render the main display for focus mode based on goal type
 * @param {Object} goal - The goal object
 * @returns {string} HTML string for the display
 */
function renderFocusModeDisplay(goal) {
  switch (goal.type) {
    case GOAL_TYPES.TIMER:
      return renderFocusTimerDisplay(goal);
    case GOAL_TYPES.COUNTER:
      return renderFocusCounterDisplay(goal);
    case GOAL_TYPES.CHECKBOX:
      return renderFocusCheckboxDisplay(goal);
    default:
      return '';
  }
}

/**
 * Render large timer display for focus mode
 * @param {Object} goal - The timer goal object
 * @returns {string} HTML string
 */
function renderFocusTimerDisplay(goal) {
  const isActive = goal.isActive;
  const activeTimer = state.activeTimers[goal.id];

  // Calculate current elapsed time for display (allow overtime)
  let displayProgress = goal.progress;
  if (isActive && activeTimer && activeTimer.startTime) {
    const elapsedSinceStart = Math.floor((Date.now() - activeTimer.startTime) / 1000);
    displayProgress = goal.progress + elapsedSinceStart;
  }

  const timeRemaining = Math.max(0, goal.target - displayProgress);
  const isOvertime = displayProgress > goal.target;

  return `
    <div class="focus-timer-display ${isActive ? 'active' : ''} ${isOvertime ? 'overtime' : ''}" data-goal-id="${goal.id}">
      <div class="focus-timer-main">
        <span class="focus-timer-value">${formatTime(displayProgress)}</span>
      </div>
      <div class="focus-timer-target">
        <span class="focus-timer-label">of ${formatTime(goal.target)}</span>
      </div>
    </div>
  `;
}

/**
 * Render large counter display for focus mode
 * @param {Object} goal - The counter goal object
 * @returns {string} HTML string
 */
function renderFocusCounterDisplay(goal) {
  return `
    <div class="focus-counter-display" data-goal-id="${goal.id}">
      <div class="focus-counter-main">
        <span class="focus-counter-value">${goal.progress}</span>
        <span class="focus-counter-separator">/</span>
        <span class="focus-counter-target">${goal.target}</span>
      </div>
    </div>
  `;
}

/**
 * Render large checkbox display for focus mode
 * @param {Object} goal - The checkbox goal object
 * @returns {string} HTML string
 */
function renderFocusCheckboxDisplay(goal) {
  const isChecked = isGoalCompleted(goal);

  return `
    <div class="focus-checkbox-display ${isChecked ? 'checked' : ''}" data-goal-id="${goal.id}">
      <div class="focus-checkbox-icon">
        ${isChecked
          ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            </svg>`
        }
      </div>
      <div class="focus-checkbox-status">
        ${isChecked ? 'Completed' : 'Not completed'}
      </div>
    </div>
  `;
}

// =============================================================================
// Focus Mode Controls
// =============================================================================

/**
 * Render controls for focus mode based on goal type
 * @param {Object} goal - The goal object
 * @returns {string} HTML string for controls
 */
function renderFocusModeControls(goal) {
  switch (goal.type) {
    case GOAL_TYPES.TIMER:
      return renderFocusTimerControls(goal);
    case GOAL_TYPES.COUNTER:
      return renderFocusCounterControls(goal);
    case GOAL_TYPES.CHECKBOX:
      return renderFocusCheckboxControls(goal);
    default:
      return '';
  }
}

/**
 * Render timer controls for focus mode
 * @param {Object} goal - The timer goal object
 * @returns {string} HTML string
 */
function renderFocusTimerControls(goal) {
  const isActive = goal.isActive;
  const playIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  const pauseIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

  return `
    <div class="focus-controls focus-timer-controls">
      <button class="focus-timer-icon-btn ${isActive ? 'is-active' : ''}"
              data-action="timer-toggle"
              data-goal-id="${goal.id}"
              title="${isActive ? 'Pause' : 'Start'}">
        ${isActive ? pauseIcon : playIcon}
      </button>
    </div>
  `;
}

/**
 * Render counter controls for focus mode
 * @param {Object} goal - The counter goal object
 * @returns {string} HTML string
 */
function renderFocusCounterControls(goal) {
  const isAtMinimum = goal.progress <= 0;

  return `
    <div class="focus-controls focus-counter-controls">
      <button class="focus-control-btn focus-decrement-btn ${isAtMinimum ? 'disabled' : ''}"
              data-action="decrement"
              data-goal-id="${goal.id}"
              title="Decrease"
              ${isAtMinimum ? 'disabled' : ''}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <button class="focus-control-btn focus-increment-btn"
              data-action="increment"
              data-goal-id="${goal.id}"
              title="Increase">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  `;
}

/**
 * Render checkbox controls for focus mode
 * @param {Object} goal - The checkbox goal object
 * @returns {string} HTML string
 */
function renderFocusCheckboxControls(goal) {
  const isChecked = isGoalCompleted(goal);

  return `
    <div class="focus-controls focus-checkbox-controls">
      <button class="focus-control-btn focus-toggle-btn ${isChecked ? 'checked' : ''}"
              data-action="checkbox-toggle"
              data-goal-id="${goal.id}"
              title="${isChecked ? 'Mark as not done' : 'Mark as done'}">
        <span class="focus-toggle-label">${isChecked ? 'Mark as not done' : 'Mark as done'}</span>
      </button>
    </div>
  `;
}

// =============================================================================
// Focus Mode Event Handlers
// =============================================================================

/**
 * Attach event listeners for Focus Mode screen
 * @param {HTMLElement} container - The container element
 */
function attachFocusModeListeners(container) {
  // Exit button
  const exitBtn = container.querySelector('#focus-exit-btn');
  if (exitBtn) {
    exitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      exitFocusMode();
    });
  }

  // Timer toggle
  const timerToggleBtns = container.querySelectorAll('[data-action="timer-toggle"]');
  timerToggleBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId && callbacks.handleTimerToggle) {
        await callbacks.handleTimerToggle(goalId);
        // Re-render focus mode to update display
        renderFocusModeScreen();
      }
    });
  });

  // Counter increment
  const incrementBtns = container.querySelectorAll('[data-action="increment"]');
  incrementBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId && callbacks.handleCounterIncrement) {
        await callbacks.handleCounterIncrement(goalId);
        renderFocusModeScreen();
      }
    });
  });

  // Counter decrement
  const decrementBtns = container.querySelectorAll('[data-action="decrement"]');
  decrementBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId && callbacks.handleCounterDecrement) {
        await callbacks.handleCounterDecrement(goalId);
        renderFocusModeScreen();
      }
    });
  });

  // Checkbox toggle
  const checkboxToggleBtns = container.querySelectorAll('[data-action="checkbox-toggle"]');
  checkboxToggleBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId && callbacks.handleCheckboxToggle) {
        await callbacks.handleCheckboxToggle(goalId);
        renderFocusModeScreen();
      }
    });
  });

  // Keyboard shortcut to exit (Escape key)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && state.currentScreen === SCREENS.FOCUS_MODE) {
      exitFocusMode();
    }
  };
  document.addEventListener('keydown', handleKeyDown);

  // Store the handler for cleanup
  container._focusModeKeyHandler = handleKeyDown;
}

// =============================================================================
// Focus Mode Timer Updates
// =============================================================================

/**
 * Update focus mode timer display (called from timer update interval)
 */
export function updateFocusModeTimerDisplay() {
  if (state.currentScreen !== SCREENS.FOCUS_MODE || !state.focusedGoalId) {
    return;
  }

  const goal = state.goals.find(g => g.id === state.focusedGoalId);
  if (!goal || goal.type !== GOAL_TYPES.TIMER) {
    return;
  }

  const activeTimer = state.activeTimers[goal.id];
  if (!goal.isActive || !activeTimer) {
    return;
  }

  const now = Date.now();
  const elapsedSinceStart = Math.floor((now - activeTimer.startTime) / 1000);
  // Allow overtime - don't cap at target
  const currentProgress = goal.progress + elapsedSinceStart;
  const timeRemaining = Math.max(0, goal.target - currentProgress);
  // Cap visual progress at 100%
  const progressPercent = goal.target > 0 ? Math.min(100, (currentProgress / goal.target) * 100) : 100;

  // Update timer display
  const timerValue = document.querySelector('.focus-timer-value');
  if (timerValue) {
    timerValue.textContent = formatTime(currentProgress);
  }

  // Update remaining time
  const remainingValue = document.querySelector('.focus-remaining-value');
  if (remainingValue) {
    remainingValue.textContent = formatTime(timeRemaining);
  }

  // Update progress bar
  const progressFill = document.querySelector('.focus-progress-fill');
  if (progressFill) {
    progressFill.style.width = `${progressPercent}%`;
  }

  // Update progress percent
  const progressPercentEl = document.querySelector('.focus-progress-percent');
  if (progressPercentEl) {
    progressPercentEl.textContent = `${Math.round(progressPercent)}%`;
  }

  // Check for completion
  if (currentProgress >= goal.target && !isGoalCompleted(goal)) {
    // Re-render to show completion state
    renderFocusModeScreen();
  }
}
