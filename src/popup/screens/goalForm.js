/**
 * Goal Form Screen (US-058)
 * Full-page add/edit form for goals
 */

import { state, SCREENS, SCREEN_IDS } from '../state.js';
import { escapeHtml } from '../utils/formatting.js';
import {
  GOAL_TYPES,
  TIMEFRAMES,
  createGoal
} from '../../utils/models.js';
import {
  saveGoals,
  updateGoal
} from '../../utils/storage.js';
import {
  setGoalFormScreenType,
  setGoalFormScreenTimeframe,
  setGoalFormScreenCategory,
  prefillGoalFormScreen
} from './goalFormFields.js';

// Re-export for external use
export { setGoalFormScreenType } from './goalFormFields.js';

// =============================================================================
// Callback Registration
// =============================================================================

/**
 * Registered callbacks for cross-module communication
 */
const callbacks = {
  showScreen: null,
  showSuccessFeedback: null,
  showFormError: null,
  showInputError: null,
  clearInputError: null
};

/**
 * Register callbacks from the main popup module
 * @param {Object} cbs - Callback functions
 */
export function registerGoalFormCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// =============================================================================
// Goal Form State
// =============================================================================

/**
 * State for goal form screen
 * @type {Object}
 */
const goalFormState = {
  mode: 'add', // 'add' or 'edit'
  editingGoalId: null
};

// =============================================================================
// Goal Form Screen Rendering
// =============================================================================

/**
 * Open goal form screen for adding or editing a goal
 * @param {string} mode - 'add' for new goal, 'edit' for editing existing
 * @param {Object|null} goal - The goal to edit (null for add mode)
 */
export function openGoalFormScreen(mode = 'add', goal = null) {
  goalFormState.mode = mode;
  goalFormState.editingGoalId = goal ? goal.id : null;

  // Navigate to the goal form screen
  if (callbacks.showScreen) {
    callbacks.showScreen(SCREENS.GOAL_FORM);
  }
}

/**
 * Render the Goal Form screen (full-page add/edit)
 * US-058: Full-page layout with header, form, and footer
 */
export function renderGoalFormScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.GOAL_FORM]);
  if (!screen) return;

  const isEditMode = goalFormState.mode === 'edit';
  const editingGoal = isEditMode ? state.goals.find(g => g.id === goalFormState.editingGoalId) : null;

  // If editing but goal not found, go back
  if (isEditMode && !editingGoal) {
    console.error('[GoalForm] Goal not found for editing');
    if (callbacks.showScreen) {
      callbacks.showScreen(SCREENS.MANAGE_GOALS);
    }
    return;
  }

  const title = isEditMode ? 'Edit Goal' : 'Add New Goal';

  screen.innerHTML = `
    <div class="goal-form-screen">
      <header class="screen-header goal-form-header">
        <button class="back-btn" id="goal-form-back-btn" title="Back to Manage Goals">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="back-icon">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <h1 class="goal-form-title">${title}</h1>
        <div class="header-spacer"></div>
      </header>
      <main class="goal-form-content">
        <form id="goal-form-page" class="goal-form" novalidate>
          <!-- Title Input -->
          <div class="form-group">
            <label for="goal-form-title" class="form-label">Goal Title <span class="required-indicator">*</span></label>
            <input
              type="text"
              id="goal-form-title"
              name="title"
              class="form-input"
              placeholder="e.g., Study for exam"
              required
              maxlength="100"
              autocomplete="off"
            >
            <span class="form-error" id="goal-form-title-error" role="alert" aria-live="polite"></span>
          </div>

          <!-- Type Selector -->
          <div class="form-group">
            <label class="form-label">Goal Type <span class="required-indicator">*</span></label>
            <div class="type-selector" role="radiogroup" aria-label="Select goal type">
              <button type="button" class="type-option active" data-type="timer" role="radio" aria-checked="true" title="Timer - Track time spent on a goal">
                <span class="type-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                <span class="type-option-label">Timer</span>
              </button>
              <button type="button" class="type-option" data-type="counter" role="radio" aria-checked="false" title="Counter - Track a count towards a target">
                <span class="type-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </span>
                <span class="type-option-label">Counter</span>
              </button>
              <button type="button" class="type-option" data-type="checkbox" role="radio" aria-checked="false" title="Checkbox - Simple yes/no completion">
                <span class="type-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <polyline points="9 11 12 14 22 4"/>
                  </svg>
                </span>
                <span class="type-option-label">Checkbox</span>
              </button>
            </div>
            <input type="hidden" id="goal-form-type" name="type" value="timer">
          </div>

          <!-- Timer Target Input -->
          <div class="form-group target-input-group" id="goal-form-timer-target-group">
            <label for="goal-form-timer-hours" class="form-label">Target Time <span class="required-indicator">*</span></label>
            <div class="timer-target-inputs">
              <div class="time-input-field">
                <input
                  type="number"
                  id="goal-form-timer-hours"
                  name="timer-hours"
                  class="form-input time-input"
                  placeholder="0"
                  min="0"
                  max="23"
                  value="1"
                  autocomplete="off"
                >
                <span class="time-input-label">hours</span>
              </div>
              <span class="time-separator">:</span>
              <div class="time-input-field">
                <input
                  type="number"
                  id="goal-form-timer-minutes"
                  name="timer-minutes"
                  class="form-input time-input"
                  placeholder="0"
                  min="0"
                  max="59"
                  value="0"
                  autocomplete="off"
                >
                <span class="time-input-label">minutes</span>
              </div>
            </div>
            <span class="form-error" id="goal-form-timer-error" role="alert" aria-live="polite"></span>
            <p class="form-hint">Set the duration you want to track (e.g., 1 hour 30 minutes)</p>
          </div>

          <!-- Counter Target Input -->
          <div class="form-group target-input-group hidden" id="goal-form-counter-target-group">
            <label for="goal-form-counter-target" class="form-label">Target Count <span class="required-indicator">*</span></label>
            <input
              type="number"
              id="goal-form-counter-target"
              name="counter-target"
              class="form-input counter-target-input"
              placeholder="e.g., 10"
              min="1"
              value="10"
              autocomplete="off"
            >
            <span class="form-error" id="goal-form-counter-error" role="alert" aria-live="polite"></span>
            <p class="form-hint">Set the target count you want to reach (minimum 1)</p>
          </div>

          <!-- US-087: Avoidance Settings -->
          <div class="form-group target-input-group hidden" id="goal-form-avoidance-settings-group">
            <label class="form-label">Avoidance Settings</label>
            <div class="avoidance-settings">
              <label class="toggle-setting">
                <input type="checkbox" id="goal-form-forgiveness" name="forgiveness">
                <span class="toggle-slider"></span>
                <span class="toggle-label">Enable forgiveness mode</span>
              </label>
              <p class="form-hint">With forgiveness mode, one slip-up per week won't reset your streak.</p>
            </div>
            <div class="avoidance-info-box">
              <div class="avoidance-info-icon">&#128737;</div>
              <div class="avoidance-info-text">
                <strong>How avoidance goals work:</strong>
                <ul>
                  <li>Your streak automatically increases each day</li>
                  <li>Mark "Slipped" when you break your goal</li>
                  <li>Without forgiveness, slip-ups reset to day 0</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Timeframe Selector -->
          <div class="form-group">
            <label class="form-label">Reset Schedule <span class="required-indicator">*</span></label>
            <div class="timeframe-selector" role="radiogroup" aria-label="Select reset schedule">
              <button type="button" class="timeframe-option active" data-timeframe="daily" role="radio" aria-checked="true" title="Goal resets at midnight every day">
                <span class="timeframe-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                </span>
                <span class="timeframe-option-label">Daily</span>
              </button>
              <button type="button" class="timeframe-option" data-timeframe="weekly" role="radio" aria-checked="false" title="Goal resets at midnight on Monday">
                <span class="timeframe-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </span>
                <span class="timeframe-option-label">Weekly</span>
              </button>
              <button type="button" class="timeframe-option" data-timeframe="monthly" role="radio" aria-checked="false" title="Goal resets at midnight on the 1st of each month">
                <span class="timeframe-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                    <text x="12" y="18" text-anchor="middle" font-size="8" font-weight="bold" fill="currentColor" stroke="none">1</text>
                  </svg>
                </span>
                <span class="timeframe-option-label">Monthly</span>
              </button>
              <button type="button" class="timeframe-option" data-timeframe="yearly" role="radio" aria-checked="false" title="Goal resets at midnight on January 1st">
                <span class="timeframe-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 10"/>
                    <path d="M12 2 L12 4"/>
                    <path d="M12 20 L12 22"/>
                  </svg>
                </span>
                <span class="timeframe-option-label">Yearly</span>
              </button>
            </div>
            <input type="hidden" id="goal-form-timeframe" name="timeframe" value="daily">
            <p class="form-hint timeframe-hint" id="goal-form-timeframe-hint">
              <span class="hint-daily">Resets at midnight every day</span>
              <span class="hint-weekly" style="display:none;">Resets at midnight on Monday</span>
              <span class="hint-monthly" style="display:none;">Resets at midnight on the 1st of each month</span>
              <span class="hint-yearly" style="display:none;">Resets at midnight on January 1st</span>
            </p>
          </div>

          <!-- US-065: Category Selector -->
          <div class="form-group">
            <label class="form-label">Category <span class="optional-indicator">(optional)</span></label>
            <div class="category-selector" role="radiogroup" aria-label="Select goal category">
              <button type="button" class="category-option active" data-category="none" role="radio" aria-checked="true" title="No category">
                <span class="category-option-icon"></span>
                <span class="category-option-label">None</span>
              </button>
              ${state.categories.map(cat => `
                <button type="button" class="category-option" data-category="${cat.id}" role="radio" aria-checked="false" title="${escapeHtml(cat.name)}">
                  <span class="category-option-icon" style="background-color: ${cat.color}"></span>
                  <span class="category-option-label">${escapeHtml(cat.name)}</span>
                </button>
              `).join('')}
            </div>
            <input type="hidden" id="goal-form-category" name="category" value="">
          </div>

          <!-- US-074: Goal Notes/Description -->
          <div class="form-group">
            <label for="goal-form-notes" class="form-label">Notes <span class="optional-indicator">(optional)</span></label>
            <textarea
              id="goal-form-notes"
              name="notes"
              class="form-input form-textarea"
              placeholder="Add context, instructions, or motivation for this goal..."
              maxlength="500"
              rows="3"
            ></textarea>
            <div class="notes-char-count">
              <span id="goal-form-notes-count">0</span>/500 characters
            </div>
            <p class="form-hint">Notes will appear on your goal card. Supports **bold** and [links](url).</p>
          </div>

        </form>
      </main>
      <footer class="goal-form-footer">
        <button type="button" class="btn btn-secondary btn-compact" id="goal-form-cancel-btn">Cancel</button>
        <button type="submit" form="goal-form-page" class="btn btn-primary btn-compact" id="goal-form-save-btn">${isEditMode ? 'Update' : 'Save'}</button>
      </footer>
    </div>
  `;

  // Attach event listeners
  attachGoalFormScreenListeners(screen, editingGoal);

  // If editing, pre-fill the form
  if (isEditMode && editingGoal) {
    prefillGoalFormScreen(screen, editingGoal);
  }

  // Focus the title input
  const titleInput = screen.querySelector('#goal-form-title');
  if (titleInput) {
    setTimeout(() => titleInput.focus(), 100);
  }

  console.log(`[GoalForm] Rendered in ${goalFormState.mode} mode`);
}

// =============================================================================
// Goal Form Event Handlers
// =============================================================================

/**
 * Attach event listeners for goal form screen
 * @param {HTMLElement} screen - The screen element
 * @param {Object|null} editingGoal - The goal being edited (null for add mode)
 */
function attachGoalFormScreenListeners(screen, editingGoal) {
  // Back button
  const backBtn = screen.querySelector('#goal-form-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (callbacks.showScreen) {
        callbacks.showScreen(SCREENS.MANAGE_GOALS);
      }
    });
  }

  // Cancel button
  const cancelBtn = screen.querySelector('#goal-form-cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (callbacks.showScreen) {
        callbacks.showScreen(SCREENS.MANAGE_GOALS);
      }
    });
  }

  // Form submission
  const form = screen.querySelector('#goal-form-page');
  if (form) {
    form.addEventListener('submit', handleGoalFormScreenSubmit);
  }

  // Type selector buttons
  const typeOptions = screen.querySelectorAll('.type-selector .type-option');
  typeOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      const type = option.getAttribute('data-type');
      setGoalFormScreenType(screen, type);
    });

    // Keyboard support
    option.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const type = option.getAttribute('data-type');
        setGoalFormScreenType(screen, type);
      }
    });
  });

  // Timeframe selector buttons
  const timeframeOptions = screen.querySelectorAll('.timeframe-selector .timeframe-option');
  timeframeOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      const timeframe = option.getAttribute('data-timeframe');
      setGoalFormScreenTimeframe(screen, timeframe);
    });

    // Keyboard support
    option.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const timeframe = option.getAttribute('data-timeframe');
        setGoalFormScreenTimeframe(screen, timeframe);
      }
    });
  });

  // US-065: Category selector buttons
  const categoryOptions = screen.querySelectorAll('.category-selector .category-option');
  categoryOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      const category = option.getAttribute('data-category');
      setGoalFormScreenCategory(screen, category);
    });

    // Keyboard support
    option.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const category = option.getAttribute('data-category');
        setGoalFormScreenCategory(screen, category);
      }
    });
  });

  // US-074: Notes textarea character count
  const notesTextarea = screen.querySelector('#goal-form-notes');
  const notesCount = screen.querySelector('#goal-form-notes-count');
  if (notesTextarea && notesCount) {
    notesTextarea.addEventListener('input', () => {
      const length = notesTextarea.value.length;
      notesCount.textContent = length;
      // Add warning class if near limit
      if (length >= 450) {
        notesCount.parentElement.classList.add('near-limit');
      } else {
        notesCount.parentElement.classList.remove('near-limit');
      }
    });
  }

}

// =============================================================================
// Goal Form Submission
// =============================================================================

/**
 * Handle goal form screen submission
 * @param {Event} e - Submit event
 */
async function handleGoalFormScreenSubmit(e) {
  e.preventDefault();

  const screen = document.getElementById(SCREEN_IDS[SCREENS.GOAL_FORM]);
  if (!screen) return;

  const isEditMode = goalFormState.mode === 'edit';
  const goalId = goalFormState.editingGoalId;

  // Validate title
  const titleInput = screen.querySelector('#goal-form-title');
  const titleError = screen.querySelector('#goal-form-title-error');
  const title = titleInput?.value?.trim() || '';

  if (!title) {
    if (titleInput && titleError && callbacks.showInputError) {
      callbacks.showInputError(titleInput, titleError, 'Goal title is required');
      titleInput.focus();
    }
    return;
  } else if (titleInput && titleError && callbacks.clearInputError) {
    callbacks.clearInputError(titleInput, titleError);
  }

  // Get type
  const typeInput = screen.querySelector('#goal-form-type');
  const type = typeInput?.value || GOAL_TYPES.TIMER;

  // Validate and get target based on type
  let target;

  if (type === GOAL_TYPES.TIMER) {
    const hoursInput = screen.querySelector('#goal-form-timer-hours');
    const minutesInput = screen.querySelector('#goal-form-timer-minutes');
    const timerError = screen.querySelector('#goal-form-timer-error');

    const hours = parseInt(hoursInput?.value, 10) || 0;
    const minutes = parseInt(minutesInput?.value, 10) || 0;

    if (hours === 0 && minutes === 0) {
      if (hoursInput && timerError && callbacks.showInputError) {
        callbacks.showInputError(hoursInput, timerError, 'Please set a target time');
        hoursInput.focus();
      }
      return;
    }

    if (hoursInput && timerError && callbacks.clearInputError) {
      callbacks.clearInputError(hoursInput, timerError);
    }

    target = (hours * 3600) + (minutes * 60);
  } else if (type === GOAL_TYPES.COUNTER) {
    const counterInput = screen.querySelector('#goal-form-counter-target');
    const counterError = screen.querySelector('#goal-form-counter-error');
    const count = parseInt(counterInput?.value, 10);

    if (!count || count < 1) {
      if (counterInput && counterError && callbacks.showInputError) {
        callbacks.showInputError(counterInput, counterError, 'Please set a target count (minimum 1)');
        counterInput.focus();
      }
      return;
    }

    if (counterInput && counterError && callbacks.clearInputError) {
      callbacks.clearInputError(counterInput, counterError);
    }

    target = count;
  } else if (type === GOAL_TYPES.AVOIDANCE) {
    // US-087: Avoidance goal - target is 1 (we track streak in progress)
    target = 1;
  } else {
    // Checkbox
    target = 1;
  }

  // Get timeframe (avoidance always uses daily)
  const timeframeInput = screen.querySelector('#goal-form-timeframe');
  const timeframe = type === GOAL_TYPES.AVOIDANCE ? TIMEFRAMES.DAILY : (timeframeInput?.value || TIMEFRAMES.DAILY);

  // US-087: Get forgiveness setting for avoidance goals
  const forgivenessCheckbox = screen.querySelector('#goal-form-forgiveness');
  const forgivenessEnabled = type === GOAL_TYPES.AVOIDANCE ? (forgivenessCheckbox?.checked || false) : false;

  // US-065: Get category (null if 'none' or empty)
  const categoryInput = screen.querySelector('#goal-form-category');
  const category = categoryInput?.value || null;

  // US-074: Get notes (null if empty, max 500 chars enforced by maxlength)
  const notesTextarea = screen.querySelector('#goal-form-notes');
  const notes = notesTextarea?.value?.trim() || null;

  console.log(`[GoalForm] Submitting in ${isEditMode ? 'edit' : 'add'} mode:`, { title, type, target, timeframe, category, notes, forgivenessEnabled });

  try {
    if (isEditMode && goalId) {
      // Edit mode: update existing goal
      const existingGoal = state.goals.find(g => g.id === goalId);

      // US-087: Include avoidance-specific properties in update
      const updateData = {
        title,
        type,
        target,
        timeframe,
        category,
        notes
      };

      // Add avoidance-specific fields if changing to avoidance type
      if (type === GOAL_TYPES.AVOIDANCE) {
        updateData.forgivenessEnabled = forgivenessEnabled;
        // Preserve existing avoidance data if already avoidance type
        if (existingGoal?.type !== GOAL_TYPES.AVOIDANCE) {
          updateData.slipUpsThisWeek = 0;
          updateData.longestAvoidanceStreak = 0;
          updateData.lastStreakIncrementDate = null;
        }
      }

      const success = await updateGoal(goalId, updateData);

      if (success) {
        // Update the goal in local state
        const goalIndex = state.goals.findIndex(g => g.id === goalId);
        if (goalIndex !== -1) {
          state.goals[goalIndex] = {
            ...state.goals[goalIndex],
            ...updateData
          };
        }
        console.log(`[GoalForm] Goal ${goalId} updated successfully`);
        if (callbacks.showSuccessFeedback) {
          callbacks.showSuccessFeedback('Goal updated successfully!');
        }
      } else {
        console.error('[GoalForm] Failed to update goal');
        if (callbacks.showFormError) {
          callbacks.showFormError('Failed to update goal. Please try again.');
        }
        return;
      }
    } else {
      // Add mode: create new goal
      const newGoal = createGoal({
        title,
        type,
        target,
        timeframe,
        category,
        notes,
        forgivenessEnabled, // US-087: Avoidance forgiveness setting
        order: state.goals.length
      });

      // Save to storage
      const updatedGoals = [...state.goals, newGoal];
      const success = await saveGoals(updatedGoals);

      if (success) {
        state.goals = updatedGoals;
        console.log(`[GoalForm] New goal created:`, newGoal);
        if (callbacks.showSuccessFeedback) {
          callbacks.showSuccessFeedback('Goal created successfully!');
        }
      } else {
        console.error('[GoalForm] Failed to save new goal');
        if (callbacks.showFormError) {
          callbacks.showFormError('Failed to save goal. Please try again.');
        }
        return;
      }
    }

    // Navigate back to Manage Goals on success
    if (callbacks.showScreen) {
      callbacks.showScreen(SCREENS.MANAGE_GOALS);
    }

  } catch (error) {
    console.error('[GoalForm] Error saving goal:', error);
    if (callbacks.showFormError) {
      callbacks.showFormError('An error occurred while saving. Please try again.');
    }
  }
}
