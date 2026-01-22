/**
 * Undo/Redo Feature (US-079)
 * Provides undo/redo functionality for goal progress changes
 */

import { state, UNDO_ACTION_TYPES, UNDO_STACK_MAX_SIZE, UNDO_TOAST_DURATION } from '../state.js';
import { escapeHtml } from '../utils/formatting.js';
import { updateGoal, saveActiveTimers } from '../../utils/storage.js';
import { playSound, SOUNDS } from '../../utils/sounds.js';

// =============================================================================
// Callback Registration
// =============================================================================

/**
 * Registered callbacks for cross-module communication
 * These are set by popup.js during initialization
 */
const callbacks = {
  renderCurrentScreen: null,
  startTimerUpdateInterval: null,
  sendToServiceWorker: null,
  showSuccessFeedback: null
};

/**
 * Register callbacks from the main popup module
 * @param {Object} cbs - Callback functions
 */
export function registerUndoRedoCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// =============================================================================
// Undo/Redo Functions
// =============================================================================

/**
 * Push an undoable action to the stack
 * @param {Object} action - The action to push
 * @param {string} action.type - The type of action (from UNDO_ACTION_TYPES)
 * @param {string} action.goalId - The ID of the goal affected
 * @param {*} action.previousValue - The value before the action
 * @param {*} action.newValue - The value after the action
 * @param {string} action.goalTitle - The title of the goal (for display)
 * @param {Object} [action.extraData] - Extra data needed for undo (e.g., timer state)
 */
export function pushUndoAction(action) {
  // Add timestamp to action
  action.timestamp = Date.now();

  // Push to stack
  state.undoStack.push(action);

  // Limit stack size to UNDO_STACK_MAX_SIZE
  if (state.undoStack.length > UNDO_STACK_MAX_SIZE) {
    state.undoStack.shift(); // Remove oldest action
  }

  // Clear redo stack when a new action is performed
  state.redoStack = [];

  // Show undo toast
  showUndoToast(action);

  console.log(`[Undo] Action pushed: ${action.type} for "${action.goalTitle}"`);
}

/**
 * Get a human-readable description of an undo action
 * @param {Object} action - The action
 * @returns {string} Human-readable description
 */
export function getUndoActionDescription(action) {
  const goalTitle = action.goalTitle.length > 20
    ? action.goalTitle.substring(0, 20) + '...'
    : action.goalTitle;

  switch (action.type) {
    case UNDO_ACTION_TYPES.COUNTER_INCREMENT:
      return `Incremented "${goalTitle}"`;
    case UNDO_ACTION_TYPES.COUNTER_DECREMENT:
      return `Decremented "${goalTitle}"`;
    case UNDO_ACTION_TYPES.CHECKBOX_TOGGLE:
      return action.newValue >= 1 ? `Completed "${goalTitle}"` : `Uncompleted "${goalTitle}"`;
    case UNDO_ACTION_TYPES.TIMER_START:
      return `Started "${goalTitle}"`;
    case UNDO_ACTION_TYPES.TIMER_STOP:
      return `Paused "${goalTitle}"`;
    case UNDO_ACTION_TYPES.AVOIDANCE_SLIP:
      return `Recorded slip-up for "${goalTitle}"`;
    default:
      return `Changed "${goalTitle}"`;
  }
}

/**
 * Show the undo toast notification (disabled - no toast notifications)
 * @param {Object} action - The action that can be undone
 */
export function showUndoToast(action) {
  // Disabled - no toast notifications shown
  console.log(`[Undo] Action available: ${action.type} for "${action.goalTitle}"`);
}

/**
 * Hide the undo toast notification
 */
export function hideUndoToast() {
  // Clear timeout
  if (state.undoToastTimeoutId) {
    clearTimeout(state.undoToastTimeoutId);
    state.undoToastTimeoutId = null;
  }

  const toast = document.getElementById('undo-toast');
  if (toast) {
    toast.classList.remove('visible');
  }
}

/**
 * Perform undo action
 * Reverts the most recent action in the undo stack
 * @returns {Promise<boolean>} True if undo was performed, false if stack was empty
 */
export async function performUndo() {
  if (state.undoStack.length === 0) {
    console.log('[Undo] Stack is empty, nothing to undo');
    return false;
  }

  // Pop the most recent action
  const action = state.undoStack.pop();

  // Find the goal
  const goal = state.goals.find(g => g.id === action.goalId);
  if (!goal) {
    console.error('[Undo] Goal not found:', action.goalId);
    return false;
  }

  console.log(`[Undo] Undoing: ${action.type} for "${action.goalTitle}"`);

  // Perform the undo based on action type
  switch (action.type) {
    case UNDO_ACTION_TYPES.COUNTER_INCREMENT:
    case UNDO_ACTION_TYPES.COUNTER_DECREMENT:
      // Revert counter progress
      goal.progress = action.previousValue;
      await updateGoal(action.goalId, { progress: action.previousValue });
      break;

    case UNDO_ACTION_TYPES.CHECKBOX_TOGGLE:
      // Revert checkbox progress
      goal.progress = action.previousValue;
      await updateGoal(action.goalId, { progress: action.previousValue });
      break;

    case UNDO_ACTION_TYPES.TIMER_START:
      // Revert timer start - stop the timer
      goal.isActive = false;
      await updateGoal(action.goalId, { isActive: false });

      // Remove from active timers
      if (state.activeTimers[action.goalId]) {
        delete state.activeTimers[action.goalId];
        await saveActiveTimers(state.activeTimers);
      }

      // Notify service worker
      if (callbacks.sendToServiceWorker) {
        callbacks.sendToServiceWorker({
          type: 'TIMER_PAUSE',
          goalId: action.goalId
        });
      }
      break;

    case UNDO_ACTION_TYPES.TIMER_STOP:
      // Revert timer stop - restart the timer from where it was
      goal.isActive = true;
      goal.progress = action.previousValue;
      await updateGoal(action.goalId, { isActive: true, progress: action.previousValue });

      // Restore active timer
      const now = Date.now();
      state.activeTimers[action.goalId] = {
        startTime: now,
        goalId: action.goalId
      };
      await saveActiveTimers(state.activeTimers);

      // Start timer interval
      if (callbacks.startTimerUpdateInterval) {
        callbacks.startTimerUpdateInterval();
      }

      // Notify service worker
      if (callbacks.sendToServiceWorker) {
        callbacks.sendToServiceWorker({
          type: 'TIMER_START',
          goalId: action.goalId,
          startTime: now
        });
      }
      break;

    case UNDO_ACTION_TYPES.AVOIDANCE_SLIP:
      // Revert avoidance slip-up
      goal.progress = action.previousValue;
      if (action.extraData && action.extraData.previousSlipUps !== undefined) {
        goal.slipUpsThisWeek = action.extraData.previousSlipUps;
      }
      await updateGoal(action.goalId, {
        progress: action.previousValue,
        slipUpsThisWeek: goal.slipUpsThisWeek
      });
      break;
  }

  // Push to redo stack (create reverse action)
  const redoAction = {
    ...action,
    previousValue: action.newValue,
    newValue: action.previousValue,
    timestamp: Date.now()
  };
  state.redoStack.push(redoAction);

  // Hide undo toast and show success feedback
  hideUndoToast();
  if (callbacks.showSuccessFeedback) {
    callbacks.showSuccessFeedback('Action undone');
  }

  // Play tick sound for feedback
  playSound(SOUNDS.TICK);

  // Re-render
  if (callbacks.renderCurrentScreen) {
    callbacks.renderCurrentScreen();
  }

  return true;
}

/**
 * Perform redo action
 * Re-applies the most recently undone action
 * @returns {Promise<boolean>} True if redo was performed, false if stack was empty
 */
export async function performRedo() {
  if (state.redoStack.length === 0) {
    console.log('[Redo] Stack is empty, nothing to redo');
    return false;
  }

  // Pop the most recent redo action
  const action = state.redoStack.pop();

  // Find the goal
  const goal = state.goals.find(g => g.id === action.goalId);
  if (!goal) {
    console.error('[Redo] Goal not found:', action.goalId);
    return false;
  }

  console.log(`[Redo] Redoing: ${action.type} for "${action.goalTitle}"`);

  // Perform the redo (same as original action, swapped values)
  switch (action.type) {
    case UNDO_ACTION_TYPES.COUNTER_INCREMENT:
    case UNDO_ACTION_TYPES.COUNTER_DECREMENT:
      // Apply counter progress change
      goal.progress = action.previousValue; // After redo swap, previousValue is the target
      await updateGoal(action.goalId, { progress: action.previousValue });
      break;

    case UNDO_ACTION_TYPES.CHECKBOX_TOGGLE:
      // Apply checkbox progress change
      goal.progress = action.previousValue;
      await updateGoal(action.goalId, { progress: action.previousValue });
      break;

    case UNDO_ACTION_TYPES.TIMER_START:
      // Redo timer start - stop it (since undo started it, redo stops it)
      goal.isActive = false;
      await updateGoal(action.goalId, { isActive: false });

      if (state.activeTimers[action.goalId]) {
        delete state.activeTimers[action.goalId];
        await saveActiveTimers(state.activeTimers);
      }

      if (callbacks.sendToServiceWorker) {
        callbacks.sendToServiceWorker({
          type: 'TIMER_PAUSE',
          goalId: action.goalId
        });
      }
      break;

    case UNDO_ACTION_TYPES.TIMER_STOP:
      // Redo timer stop - restart it (since undo stopped it, redo starts it)
      goal.isActive = true;
      await updateGoal(action.goalId, { isActive: true });

      const now = Date.now();
      state.activeTimers[action.goalId] = {
        startTime: now,
        goalId: action.goalId
      };
      await saveActiveTimers(state.activeTimers);

      if (callbacks.startTimerUpdateInterval) {
        callbacks.startTimerUpdateInterval();
      }

      if (callbacks.sendToServiceWorker) {
        callbacks.sendToServiceWorker({
          type: 'TIMER_START',
          goalId: action.goalId,
          startTime: now
        });
      }
      break;

    case UNDO_ACTION_TYPES.AVOIDANCE_SLIP:
      // Redo avoidance slip-up
      goal.progress = action.previousValue;
      if (action.extraData && action.extraData.newSlipUps !== undefined) {
        goal.slipUpsThisWeek = action.extraData.newSlipUps;
      }
      await updateGoal(action.goalId, {
        progress: action.previousValue,
        slipUpsThisWeek: goal.slipUpsThisWeek
      });
      break;
  }

  // Show success feedback
  if (callbacks.showSuccessFeedback) {
    callbacks.showSuccessFeedback('Action redone');
  }

  // Play tick sound for feedback
  playSound(SOUNDS.TICK);

  // Re-render
  if (callbacks.renderCurrentScreen) {
    callbacks.renderCurrentScreen();
  }

  return true;
}

/**
 * Check if there are actions that can be undone
 * @returns {boolean} True if undo is available
 */
export function canUndo() {
  return state.undoStack.length > 0;
}

/**
 * Check if there are actions that can be redone
 * @returns {boolean} True if redo is available
 */
export function canRedo() {
  return state.redoStack.length > 0;
}

/**
 * Clear the undo/redo stacks
 * Called when major state changes occur (e.g., loading data)
 */
export function clearUndoHistory() {
  state.undoStack = [];
  state.redoStack = [];
  hideUndoToast();
}
