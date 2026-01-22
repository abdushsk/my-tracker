/**
 * Quick Add Floating Action Button (US-068)
 * Quick add form for rapid goal creation
 */

import { state, SCREENS, SCREEN_IDS } from '../state.js';
import {
  GOAL_TYPES,
  TIMEFRAMES,
  createGoal
} from '../../utils/models.js';
import { saveGoals } from '../../utils/storage.js';
import { playSound, SOUNDS } from '../../utils/sounds.js';

// =============================================================================
// Callback Registration
// =============================================================================

/**
 * Registered callbacks for cross-module communication
 */
const callbacks = {
  showSuccessFeedback: null,
  showFormError: null,
  openGoalFormScreen: null,
  setGoalFormScreenType: null,
  renderViewGoalsScreen: null
};

/**
 * Register callbacks from the main popup module
 * @param {Object} cbs - Callback functions
 */
export function registerQuickAddCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// =============================================================================
// Quick Add State
// =============================================================================

/**
 * State for quick add form
 */
const quickAddState = {
  isOpen: false,
  selectedType: 'timer'
};

// =============================================================================
// Quick Add FAB Rendering
// =============================================================================

/**
 * Render the Quick Add FAB and form
 * @returns {string} HTML string for the FAB and quick-add form
 */
export function renderQuickAddFAB() {
  return `
    <div class="quick-add-container" id="quick-add-container">
      <!-- Quick Add Form (hidden by default) -->
      <div class="quick-add-form ${quickAddState.isOpen ? 'open' : ''}" id="quick-add-form" role="dialog" aria-labelledby="quick-add-title" aria-modal="true">
        <div class="quick-add-header">
          <h3 id="quick-add-title">Quick Add Goal</h3>
          <button type="button" class="quick-add-close" data-action="close-quick-add" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="quick-add-body">
          <div class="quick-add-field">
            <input
              type="text"
              id="quick-add-title-input"
              class="quick-add-input"
              placeholder="Goal title..."
              autocomplete="off"
              maxlength="100"
            >
          </div>
          <div class="quick-add-type-selector">
            <button type="button" class="quick-add-type-btn ${quickAddState.selectedType === 'timer' ? 'active' : ''}" data-quick-type="timer" title="Timer goal">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Timer</span>
            </button>
            <button type="button" class="quick-add-type-btn ${quickAddState.selectedType === 'counter' ? 'active' : ''}" data-quick-type="counter" title="Counter goal">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              <span>Counter</span>
            </button>
            <button type="button" class="quick-add-type-btn ${quickAddState.selectedType === 'checkbox' ? 'active' : ''}" data-quick-type="checkbox" title="Checkbox goal">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <polyline points="9 11 12 14 22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              <span>Checkbox</span>
            </button>
          </div>
        </div>
        <div class="quick-add-footer">
          <button type="button" class="quick-add-more-link" data-action="more-options">
            More options
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <button type="button" class="btn btn-primary quick-add-save" data-action="save-quick-add">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Save
          </button>
        </div>
      </div>

      <!-- FAB Button -->
      <button type="button" class="quick-add-fab ${quickAddState.isOpen ? 'open' : ''}" id="quick-add-fab" aria-label="Quick add goal" title="Quick add goal">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="fab-icon-plus" width="24" height="24">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="fab-icon-close" width="24" height="24">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;
}

// =============================================================================
// Quick Add Event Handlers
// =============================================================================

/**
 * Attach event listeners for Quick Add FAB
 * @param {HTMLElement} screen - The screen element
 */
export function attachQuickAddFABListeners(screen) {
  // FAB toggle
  const fab = screen.querySelector('#quick-add-fab');
  if (fab) {
    fab.addEventListener('click', toggleQuickAddForm);
  }

  // Close button
  const closeBtn = screen.querySelector('[data-action="close-quick-add"]');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeQuickAddForm);
  }

  // Type selector buttons
  const typeButtons = screen.querySelectorAll('.quick-add-type-btn');
  typeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const type = btn.getAttribute('data-quick-type');
      if (type) {
        setQuickAddType(type);
      }
    });
  });

  // Save button
  const saveBtn = screen.querySelector('[data-action="save-quick-add"]');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleQuickAddSave);
  }

  // More options button
  const moreOptionsBtn = screen.querySelector('[data-action="more-options"]');
  if (moreOptionsBtn) {
    moreOptionsBtn.addEventListener('click', handleQuickAddMoreOptions);
  }

  // Title input - Enter key to save
  const titleInput = screen.querySelector('#quick-add-title-input');
  if (titleInput) {
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleQuickAddSave();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeQuickAddForm();
      }
    });
  }

  // Close on backdrop click
  const quickAddForm = screen.querySelector('#quick-add-form');
  if (quickAddForm) {
    screen.addEventListener('click', (e) => {
      if (quickAddState.isOpen &&
          !quickAddForm.contains(e.target) &&
          !fab.contains(e.target)) {
        closeQuickAddForm();
      }
    });
  }
}

/**
 * Toggle the quick add form visibility
 */
function toggleQuickAddForm() {
  if (quickAddState.isOpen) {
    closeQuickAddForm();
  } else {
    openQuickAddForm();
  }
}

/**
 * Open the quick add form
 */
function openQuickAddForm() {
  quickAddState.isOpen = true;

  const container = document.getElementById('quick-add-container');
  if (!container) return;

  const form = container.querySelector('#quick-add-form');
  const fab = container.querySelector('#quick-add-fab');

  if (form) form.classList.add('open');
  if (fab) fab.classList.add('open');

  // Focus the title input
  const titleInput = container.querySelector('#quick-add-title-input');
  if (titleInput) {
    setTimeout(() => titleInput.focus(), 100);
  }

  // Play open sound
  playSound(SOUNDS.CLICK);

  console.log('[QuickAdd] Form opened');
}

/**
 * Close the quick add form
 */
function closeQuickAddForm() {
  quickAddState.isOpen = false;

  const container = document.getElementById('quick-add-container');
  if (!container) return;

  const form = container.querySelector('#quick-add-form');
  const fab = container.querySelector('#quick-add-fab');
  const titleInput = container.querySelector('#quick-add-title-input');

  if (form) form.classList.remove('open');
  if (fab) fab.classList.remove('open');
  if (titleInput) titleInput.value = '';

  console.log('[QuickAdd] Form closed');
}

/**
 * Set the quick add type
 * @param {string} type - The goal type
 */
function setQuickAddType(type) {
  quickAddState.selectedType = type;

  const container = document.getElementById('quick-add-container');
  if (!container) return;

  const typeButtons = container.querySelectorAll('.quick-add-type-btn');
  typeButtons.forEach(btn => {
    const btnType = btn.getAttribute('data-quick-type');
    btn.classList.toggle('active', btnType === type);
  });

  // Play a tick sound
  playSound(SOUNDS.TICK);
}

/**
 * Handle saving the quick add goal
 */
async function handleQuickAddSave() {
  const container = document.getElementById('quick-add-container');
  if (!container) return;

  const titleInput = container.querySelector('#quick-add-title-input');
  const title = titleInput?.value?.trim();

  // Validate title
  if (!title) {
    // Shake the input to indicate error
    if (titleInput) {
      titleInput.classList.add('shake');
      titleInput.focus();
      setTimeout(() => titleInput.classList.remove('shake'), 500);
    }
    return;
  }

  const type = quickAddState.selectedType;

  // Set default target based on type
  let target;
  if (type === GOAL_TYPES.TIMER) {
    target = 3600; // 1 hour default
  } else if (type === GOAL_TYPES.COUNTER) {
    target = 10; // 10 count default
  } else {
    target = 1; // Checkbox
  }

  // Create the goal with defaults
  const newGoal = createGoal({
    title,
    type,
    target,
    timeframe: TIMEFRAMES.DAILY, // Default to daily
    category: null,
    order: state.goals.length
  });

  try {
    // Save to storage
    const updatedGoals = [...state.goals, newGoal];
    const success = await saveGoals(updatedGoals);

    if (success) {
      state.goals = updatedGoals;
      console.log('[QuickAdd] Goal created:', newGoal);

      // Play success sound
      playSound(SOUNDS.COMPLETE);

      // Show success feedback
      if (callbacks.showSuccessFeedback) {
        callbacks.showSuccessFeedback('Goal created!');
      }

      // Close the form
      closeQuickAddForm();

      // Re-render the view goals screen
      if (callbacks.renderViewGoalsScreen) {
        callbacks.renderViewGoalsScreen();
      }
    } else {
      console.error('[QuickAdd] Failed to save goal');
      if (callbacks.showFormError) {
        callbacks.showFormError('Failed to save goal');
      }
    }
  } catch (error) {
    console.error('[QuickAdd] Error saving goal:', error);
    if (callbacks.showFormError) {
      callbacks.showFormError('Error saving goal');
    }
  }
}

/**
 * Handle "More options" click - navigate to full goal form
 */
function handleQuickAddMoreOptions() {
  const container = document.getElementById('quick-add-container');
  if (!container) return;

  const titleInput = container.querySelector('#quick-add-title-input');
  const title = titleInput?.value?.trim() || '';
  const type = quickAddState.selectedType;

  // Close the quick add form
  closeQuickAddForm();

  // Navigate to the full goal form screen
  if (callbacks.openGoalFormScreen) {
    callbacks.openGoalFormScreen('add');
  }

  // Pre-fill the title and type in the full form after a short delay
  setTimeout(() => {
    const formScreen = document.getElementById(SCREEN_IDS[SCREENS.GOAL_FORM]);
    if (formScreen) {
      // Pre-fill title
      const formTitleInput = formScreen.querySelector('#goal-form-title');
      if (formTitleInput && title) {
        formTitleInput.value = title;
      }

      // Pre-fill type
      if (type && callbacks.setGoalFormScreenType) {
        callbacks.setGoalFormScreenType(formScreen, type);
      }
    }
  }, 100);
}
