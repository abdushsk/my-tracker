/**
 * Goal Form Field Management
 * Type, timeframe, category, and color selector handlers
 */

import { GOAL_TYPES } from '../../utils/models.js';

// =============================================================================
// Type Selector
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

// =============================================================================
// Timeframe Selector
// =============================================================================

/**
 * Set the timeframe in the goal form screen
 * @param {HTMLElement} screen - The screen element
 * @param {string} timeframe - The timeframe
 */
export function setGoalFormScreenTimeframe(screen, timeframe) {
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

// =============================================================================
// Category Selector
// =============================================================================

/**
 * US-065: Set the category in the goal form screen
 * @param {HTMLElement} screen - The screen element
 * @param {string} category - The category ID (or 'none' for no category)
 */
export function setGoalFormScreenCategory(screen, category) {
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

// =============================================================================
// Color Picker
// =============================================================================

/**
 * US-073: Set the color in the goal form screen
 * @param {HTMLElement} screen - The screen element
 * @param {string} color - The color hex value (or 'none' for no custom color)
 */
export function setGoalFormScreenColor(screen, color) {
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
export function applyCustomColorFromInput(screen, input) {
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
// Form Prefill
// =============================================================================

/**
 * Pre-fill the goal form screen with existing goal data
 * @param {HTMLElement} screen - The screen element
 * @param {Object} goal - The goal to pre-fill
 */
export function prefillGoalFormScreen(screen, goal) {
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

}
