/**
 * Goal Form Screen (US-058)
 * Full-page add/edit form for goals
 */

import { state, SCREENS, SCREEN_IDS } from '../state.js';
import { escapeHtml } from '../utils/formatting.js';
import {
  GOAL_TYPES,
  TIMEFRAMES,
  createGoal,
  isGoalCompleted,
  CHAIN_STATUS
} from '../../utils/models.js';
import {
  saveGoals,
  updateGoal
} from '../../utils/storage.js';
import {
  renderChainParentOptions
} from '../features/habitChains.js';

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
          <span class="back-label">Back</span>
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
              <button type="button" class="type-option" data-type="avoidance" role="radio" aria-checked="false" title="Avoidance - Track days without doing something">
                <span class="type-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <line x1="4" y1="4" x2="20" y2="20"/>
                  </svg>
                </span>
                <span class="type-option-label">Avoidance</span>
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

          <!-- US-073: Custom Goal Color -->
          <div class="form-group">
            <label class="form-label">Goal Color <span class="optional-indicator">(optional)</span></label>
            <div class="goal-color-picker" role="radiogroup" aria-label="Select goal color">
              <button type="button" class="color-option active" data-color="none" role="radio" aria-checked="true" title="No custom color">
                <span class="color-option-swatch color-none"></span>
              </button>
              <button type="button" class="color-option" data-color="#F44336" role="radio" aria-checked="false" title="Red">
                <span class="color-option-swatch" style="background-color: #F44336"></span>
              </button>
              <button type="button" class="color-option" data-color="#E91E63" role="radio" aria-checked="false" title="Pink">
                <span class="color-option-swatch" style="background-color: #E91E63"></span>
              </button>
              <button type="button" class="color-option" data-color="#9C27B0" role="radio" aria-checked="false" title="Purple">
                <span class="color-option-swatch" style="background-color: #9C27B0"></span>
              </button>
              <button type="button" class="color-option" data-color="#673AB7" role="radio" aria-checked="false" title="Deep Purple">
                <span class="color-option-swatch" style="background-color: #673AB7"></span>
              </button>
              <button type="button" class="color-option" data-color="#3F51B5" role="radio" aria-checked="false" title="Indigo">
                <span class="color-option-swatch" style="background-color: #3F51B5"></span>
              </button>
              <button type="button" class="color-option" data-color="#2196F3" role="radio" aria-checked="false" title="Blue">
                <span class="color-option-swatch" style="background-color: #2196F3"></span>
              </button>
              <button type="button" class="color-option" data-color="#00BCD4" role="radio" aria-checked="false" title="Cyan">
                <span class="color-option-swatch" style="background-color: #00BCD4"></span>
              </button>
              <button type="button" class="color-option" data-color="#009688" role="radio" aria-checked="false" title="Teal">
                <span class="color-option-swatch" style="background-color: #009688"></span>
              </button>
              <button type="button" class="color-option" data-color="#4CAF50" role="radio" aria-checked="false" title="Green">
                <span class="color-option-swatch" style="background-color: #4CAF50"></span>
              </button>
              <button type="button" class="color-option" data-color="#FF9800" role="radio" aria-checked="false" title="Orange">
                <span class="color-option-swatch" style="background-color: #FF9800"></span>
              </button>
              <button type="button" class="color-option" data-color="#795548" role="radio" aria-checked="false" title="Brown">
                <span class="color-option-swatch" style="background-color: #795548"></span>
              </button>
              <button type="button" class="color-option" data-color="#607D8B" role="radio" aria-checked="false" title="Blue Grey">
                <span class="color-option-swatch" style="background-color: #607D8B"></span>
              </button>
            </div>
            <div class="custom-color-input-group">
              <label for="goal-form-custom-color" class="custom-color-label">Or enter custom hex:</label>
              <div class="custom-color-wrapper">
                <span class="custom-color-hash">#</span>
                <input
                  type="text"
                  id="goal-form-custom-color"
                  name="custom-color"
                  class="form-input custom-color-input"
                  placeholder="FF5733"
                  maxlength="6"
                  pattern="[0-9A-Fa-f]{6}"
                  autocomplete="off"
                >
                <button type="button" class="btn btn-sm custom-color-apply" id="goal-form-apply-custom-color">Apply</button>
              </div>
            </div>
            <input type="hidden" id="goal-form-color" name="color" value="">
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

          <!-- US-084: Habit Chain Linking -->
          <div class="form-group">
            <label class="form-label">Chain After <span class="optional-indicator">(optional)</span></label>
            <div class="chain-selector">
              <select id="goal-form-chain-parent" name="chain-parent" class="form-input form-select">
                <option value="">None - This goal is independent</option>
                ${renderChainParentOptions(editingGoal)}
              </select>
              <div class="chain-link-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
            </div>
            <p class="form-hint chain-hint">
              Link this goal to complete after another goal. The goal will be <strong>locked</strong> until the parent goal is completed.
            </p>
            <div class="chain-info" id="goal-form-chain-info" style="display: none;">
              <div class="chain-visualization">
                <span class="chain-parent-name" id="chain-parent-display"></span>
                <span class="chain-arrow">&#8594;</span>
                <span class="chain-current-name">This Goal</span>
              </div>
            </div>
          </div>
        </form>
      </main>
      <footer class="goal-form-footer">
        <button type="button" class="btn btn-secondary" id="goal-form-cancel-btn">Cancel</button>
        <button type="submit" form="goal-form-page" class="btn btn-primary" id="goal-form-save-btn">Save Goal</button>
      </footer>
    </div>
  `;

  // Attach event listeners
  attachGoalFormScreenListeners(screen, editingGoal);

  // If editing, pre-fill the form
  if (isEditMode && editingGoal) {
    prefillGoalFormScreen(editingGoal);
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

  // US-073: Color picker buttons
  const colorOptions = screen.querySelectorAll('.goal-color-picker .color-option');
  colorOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      const color = option.getAttribute('data-color');
      setGoalFormScreenColor(screen, color);
    });

    // Keyboard support
    option.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const color = option.getAttribute('data-color');
        setGoalFormScreenColor(screen, color);
      }
    });
  });

  // US-073: Custom color input
  const customColorInput = screen.querySelector('#goal-form-custom-color');
  const applyCustomColorBtn = screen.querySelector('#goal-form-apply-custom-color');

  if (applyCustomColorBtn && customColorInput) {
    applyCustomColorBtn.addEventListener('click', (e) => {
      e.preventDefault();
      applyCustomColorFromInput(screen, customColorInput);
    });

    // Also apply on Enter key
    customColorInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyCustomColorFromInput(screen, customColorInput);
      }
    });
  }

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

  // US-084: Chain parent selector
  const chainParentSelect = screen.querySelector('#goal-form-chain-parent');
  const chainInfo = screen.querySelector('#goal-form-chain-info');
  const chainParentDisplay = screen.querySelector('#chain-parent-display');

  if (chainParentSelect) {
    chainParentSelect.addEventListener('change', () => {
      const selectedParentId = chainParentSelect.value;
      if (selectedParentId && chainInfo && chainParentDisplay) {
        const parentGoal = state.goals.find(g => g.id === selectedParentId);
        if (parentGoal) {
          chainParentDisplay.textContent = parentGoal.title;
          chainInfo.style.display = 'block';
        }
      } else if (chainInfo) {
        chainInfo.style.display = 'none';
      }
    });
  }
}

// =============================================================================
// Goal Form Type/Timeframe/Category/Color Setters
// =============================================================================

/**
 * Set the type in the goal form screen
 * @param {HTMLElement} screen - The screen element
 * @param {string} type - The goal type
 */
export function setGoalFormScreenType(screen, type) {
  // Update hidden input
  const typeInput = screen.querySelector('#goal-form-type');
  if (typeInput) {
    typeInput.value = type;
  }

  // Update button states
  const typeOptions = screen.querySelectorAll('.type-selector .type-option');
  typeOptions.forEach(option => {
    const isSelected = option.getAttribute('data-type') === type;
    option.classList.toggle('active', isSelected);
    option.setAttribute('aria-checked', isSelected ? 'true' : 'false');
  });

  // Show/hide target input groups
  const timerGroup = screen.querySelector('#goal-form-timer-target-group');
  const counterGroup = screen.querySelector('#goal-form-counter-target-group');
  const avoidanceGroup = screen.querySelector('#goal-form-avoidance-settings-group');

  if (timerGroup && counterGroup) {
    if (type === GOAL_TYPES.TIMER) {
      timerGroup.classList.remove('hidden');
      counterGroup.classList.add('hidden');
      if (avoidanceGroup) avoidanceGroup.classList.add('hidden');
    } else if (type === GOAL_TYPES.COUNTER) {
      timerGroup.classList.add('hidden');
      counterGroup.classList.remove('hidden');
      if (avoidanceGroup) avoidanceGroup.classList.add('hidden');
    } else if (type === GOAL_TYPES.AVOIDANCE) {
      // US-087: Avoidance - hide timer/counter, show avoidance settings
      timerGroup.classList.add('hidden');
      counterGroup.classList.add('hidden');
      if (avoidanceGroup) avoidanceGroup.classList.remove('hidden');
    } else {
      // Checkbox - hide all
      timerGroup.classList.add('hidden');
      counterGroup.classList.add('hidden');
      if (avoidanceGroup) avoidanceGroup.classList.add('hidden');
    }
  }

  // US-087: Hide timeframe selector for avoidance goals (always daily)
  const timeframeGroup = screen.querySelector('.timeframe-selector')?.closest('.form-group');
  if (timeframeGroup) {
    if (type === GOAL_TYPES.AVOIDANCE) {
      timeframeGroup.style.display = 'none';
    } else {
      timeframeGroup.style.display = '';
    }
  }
}

/**
 * Set the timeframe in the goal form screen
 * @param {HTMLElement} screen - The screen element
 * @param {string} timeframe - The timeframe
 */
function setGoalFormScreenTimeframe(screen, timeframe) {
  // Update hidden input
  const timeframeInput = screen.querySelector('#goal-form-timeframe');
  if (timeframeInput) {
    timeframeInput.value = timeframe;
  }

  // Update button states
  const timeframeOptions = screen.querySelectorAll('.timeframe-selector .timeframe-option');
  timeframeOptions.forEach(option => {
    const isSelected = option.getAttribute('data-timeframe') === timeframe;
    option.classList.toggle('active', isSelected);
    option.setAttribute('aria-checked', isSelected ? 'true' : 'false');
  });

  // Update hint text
  const hintContainer = screen.querySelector('#goal-form-timeframe-hint');
  if (hintContainer) {
    const hints = hintContainer.querySelectorAll('span');
    hints.forEach(hint => {
      hint.style.display = 'none';
    });
    const activeHint = hintContainer.querySelector(`.hint-${timeframe}`);
    if (activeHint) {
      activeHint.style.display = 'inline';
    }
  }
}

/**
 * US-065: Set the category in the goal form screen
 * @param {HTMLElement} screen - The screen element
 * @param {string} category - The category ID (or 'none' for no category)
 */
function setGoalFormScreenCategory(screen, category) {
  // Update hidden input - 'none' means null/empty category
  const categoryInput = screen.querySelector('#goal-form-category');
  if (categoryInput) {
    categoryInput.value = category === 'none' ? '' : category;
  }

  // Update button states
  const categoryOptions = screen.querySelectorAll('.category-selector .category-option');
  categoryOptions.forEach(option => {
    const isSelected = option.getAttribute('data-category') === category;
    option.classList.toggle('active', isSelected);
    option.setAttribute('aria-checked', isSelected ? 'true' : 'false');
  });
}

/**
 * US-073: Set the color in the goal form screen
 * @param {HTMLElement} screen - The screen element
 * @param {string} color - The color hex value (or 'none' for no custom color)
 */
function setGoalFormScreenColor(screen, color) {
  // Update hidden input - 'none' means null/empty color
  const colorInput = screen.querySelector('#goal-form-color');
  if (colorInput) {
    colorInput.value = color === 'none' ? '' : color;
  }

  // Update button states
  const colorOptions = screen.querySelectorAll('.goal-color-picker .color-option');
  colorOptions.forEach(option => {
    const optionColor = option.getAttribute('data-color');
    const isSelected = optionColor === color;
    option.classList.toggle('active', isSelected);
    option.setAttribute('aria-checked', isSelected ? 'true' : 'false');
  });

  // Clear custom color input if selecting a preset
  const customColorInput = screen.querySelector('#goal-form-custom-color');
  if (customColorInput && color !== 'custom') {
    // Only clear if not a custom color (i.e., it's a preset)
    const presetColors = ['none', '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#00BCD4', '#009688', '#4CAF50', '#FF9800', '#795548', '#607D8B'];
    if (presetColors.includes(color)) {
      customColorInput.value = '';
    }
  }
}

/**
 * US-073: Apply custom color from input field
 * @param {HTMLElement} screen - The screen element
 * @param {HTMLInputElement} input - The custom color input element
 */
function applyCustomColorFromInput(screen, input) {
  const value = input.value.trim().toUpperCase();

  // Validate hex color (6 characters, 0-9 and A-F)
  if (!/^[0-9A-F]{6}$/.test(value)) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 500);
    return;
  }

  const color = `#${value}`;

  // Update hidden input
  const colorInput = screen.querySelector('#goal-form-color');
  if (colorInput) {
    colorInput.value = color;
  }

  // Deselect all preset color options
  const colorOptions = screen.querySelectorAll('.goal-color-picker .color-option');
  colorOptions.forEach(option => {
    option.classList.remove('active');
    option.setAttribute('aria-checked', 'false');
  });

  // Mark as custom color applied
  input.classList.add('applied');
  setTimeout(() => input.classList.remove('applied'), 300);
}

// =============================================================================
// Goal Form Pre-fill
// =============================================================================

/**
 * Pre-fill the goal form screen with existing goal data
 * @param {Object} goal - The goal to pre-fill
 */
function prefillGoalFormScreen(goal) {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.GOAL_FORM]);
  if (!screen || !goal) return;

  // Set title
  const titleInput = screen.querySelector('#goal-form-title');
  if (titleInput) {
    titleInput.value = goal.title || '';
  }

  // Set type
  setGoalFormScreenType(screen, goal.type);

  // Set timeframe
  setGoalFormScreenTimeframe(screen, goal.timeframe);

  // Set timer target (if timer type)
  if (goal.type === GOAL_TYPES.TIMER && goal.target) {
    const hours = Math.floor(goal.target / 3600);
    const minutes = Math.floor((goal.target % 3600) / 60);

    const hoursInput = screen.querySelector('#goal-form-timer-hours');
    const minutesInput = screen.querySelector('#goal-form-timer-minutes');

    if (hoursInput) hoursInput.value = hours;
    if (minutesInput) minutesInput.value = minutes;
  }

  // Set counter target (if counter type)
  if (goal.type === GOAL_TYPES.COUNTER && goal.target) {
    const counterInput = screen.querySelector('#goal-form-counter-target');
    if (counterInput) {
      counterInput.value = goal.target;
    }
  }

  // US-087: Set avoidance settings (if avoidance type)
  if (goal.type === GOAL_TYPES.AVOIDANCE) {
    const forgivenessCheckbox = screen.querySelector('#goal-form-forgiveness');
    if (forgivenessCheckbox) {
      forgivenessCheckbox.checked = goal.forgivenessEnabled || false;
    }
  }

  // US-065: Set category
  const categoryValue = goal.category || 'none';
  setGoalFormScreenCategory(screen, categoryValue);

  // US-073: Set color
  if (goal.color) {
    // Check if it's a preset color
    const presetColors = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#00BCD4', '#009688', '#4CAF50', '#FF9800', '#795548', '#607D8B'];
    if (presetColors.includes(goal.color.toUpperCase())) {
      setGoalFormScreenColor(screen, goal.color.toUpperCase());
    } else {
      // It's a custom color - fill in the custom color input
      const customColorInput = screen.querySelector('#goal-form-custom-color');
      if (customColorInput) {
        customColorInput.value = goal.color.replace('#', '').toUpperCase();
      }
      // Update hidden input
      const colorInput = screen.querySelector('#goal-form-color');
      if (colorInput) {
        colorInput.value = goal.color;
      }
      // Deselect all preset color options
      const colorOptions = screen.querySelectorAll('.goal-color-picker .color-option');
      colorOptions.forEach(option => {
        option.classList.remove('active');
        option.setAttribute('aria-checked', 'false');
      });
    }
  } else {
    setGoalFormScreenColor(screen, 'none');
  }

  // US-074: Set notes
  const notesTextarea = screen.querySelector('#goal-form-notes');
  const notesCount = screen.querySelector('#goal-form-notes-count');
  if (notesTextarea) {
    notesTextarea.value = goal.notes || '';
    // Update character count
    if (notesCount) {
      notesCount.textContent = (goal.notes || '').length;
    }
  }

  // US-084: Set chain parent
  const chainParentSelect = screen.querySelector('#goal-form-chain-parent');
  const chainInfo = screen.querySelector('#goal-form-chain-info');
  const chainParentDisplay = screen.querySelector('#chain-parent-display');

  if (chainParentSelect && goal.chainParentId) {
    chainParentSelect.value = goal.chainParentId;

    // Show chain info visualization
    if (chainInfo && chainParentDisplay) {
      const parentGoal = state.goals.find(g => g.id === goal.chainParentId);
      if (parentGoal) {
        chainParentDisplay.textContent = parentGoal.title;
        chainInfo.style.display = 'block';
      }
    }
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

  // US-073: Get color (null if empty)
  const colorInput = screen.querySelector('#goal-form-color');
  const color = colorInput?.value || null;

  // US-074: Get notes (null if empty, max 500 chars enforced by maxlength)
  const notesTextarea = screen.querySelector('#goal-form-notes');
  const notes = notesTextarea?.value?.trim() || null;

  // US-084: Get chain parent (null if 'none' or empty)
  const chainParentSelect = screen.querySelector('#goal-form-chain-parent');
  const chainParentId = chainParentSelect?.value || null;

  console.log(`[GoalForm] Submitting in ${isEditMode ? 'edit' : 'add'} mode:`, { title, type, target, timeframe, category, color, notes, chainParentId, forgivenessEnabled });

  try {
    if (isEditMode && goalId) {
      // Edit mode: update existing goal
      // US-084: Determine chain status based on chain parent
      const existingGoal = state.goals.find(g => g.id === goalId);
      let chainStatus = CHAIN_STATUS.UNLOCKED;
      if (chainParentId) {
        const parentGoal = state.goals.find(g => g.id === chainParentId);
        chainStatus = (parentGoal && isGoalCompleted(parentGoal)) ? CHAIN_STATUS.UNLOCKED : CHAIN_STATUS.LOCKED;
      }

      // US-087: Include avoidance-specific properties in update
      const updateData = {
        title,
        type,
        target,
        timeframe,
        category,
        color,
        notes,
        chainParentId,
        chainStatus
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
        color,
        notes,
        chainParentId, // US-084: Add chain parent
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
