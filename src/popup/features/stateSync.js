/**
 * State Synchronization Module
 * US-023: Enables real-time synchronization across all views
 *
 * This module handles storage change detection and triggers appropriate UI updates
 * when goals are modified from the floating widget or other extension views.
 */

import { state, SCREENS } from '../state.js';
import { STORAGE_KEYS } from '../../utils/storage.js';

// =============================================================================
// Module State
// =============================================================================

/**
 * Callbacks for rendering and updates
 * Registered by popup.js during initialization
 */
let callbacks = {
  renderCurrentScreen: null,
  loadData: null
};

/**
 * Debounce timer for re-renders
 * Prevents rapid consecutive re-renders
 */
let renderDebounceTimer = null;

/**
 * Flag to track if we're currently updating storage
 * Used to prevent re-render loops when the popup itself updates storage
 */
let isLocalUpdate = false;

/**
 * Timestamp of last local update
 * Used to filter out our own storage changes
 */
let lastLocalUpdateTime = 0;

// =============================================================================
// Callback Registration
// =============================================================================

/**
 * Register callbacks from popup.js
 * @param {Object} cbs - Callback functions
 */
export function registerStateSyncCallbacks(cbs) {
  callbacks = { ...callbacks, ...cbs };
}

// =============================================================================
// Local Update Tracking
// =============================================================================

/**
 * Mark that a local update is happening
 * Call this before updating storage from popup.js
 */
export function markLocalUpdate() {
  isLocalUpdate = true;
  lastLocalUpdateTime = Date.now();
  // Reset flag after a short delay
  setTimeout(() => {
    isLocalUpdate = false;
  }, 100);
}

/**
 * Check if a storage change is from a local update
 * @returns {boolean} True if this is a local update we should ignore
 */
function isFromLocalUpdate() {
  // If within 100ms of our last update, treat as local
  return isLocalUpdate || (Date.now() - lastLocalUpdateTime < 100);
}

// =============================================================================
// Debounced Render
// =============================================================================

/**
 * Debounced render function
 * Waits for rapid changes to settle before re-rendering
 * @param {number} delay - Delay in milliseconds (default 50ms)
 */
function debouncedRender(delay = 50) {
  if (renderDebounceTimer) {
    clearTimeout(renderDebounceTimer);
  }

  renderDebounceTimer = setTimeout(() => {
    renderDebounceTimer = null;
    if (callbacks.renderCurrentScreen) {
      console.log('[StateSync] Rendering current screen after debounce');
      callbacks.renderCurrentScreen();
    }
  }, delay);
}

// =============================================================================
// Storage Change Handler
// =============================================================================

/**
 * Handle changes detected in chrome.storage
 * @param {Object} changes - Object containing changed keys with oldValue and newValue
 * @param {string} namespace - Storage namespace ('local' or 'sync')
 */
function handleStorageChanges(changes, namespace) {
  // Only handle local storage changes
  if (namespace !== 'local') return;

  // Skip if this is from a local update to prevent loops
  if (isFromLocalUpdate()) {
    console.log('[StateSync] Skipping storage change from local update');
    return;
  }

  let needsRender = false;
  let goalsChanged = false;
  let timersChanged = false;
  let settingsChanged = false;

  // Check what changed
  if (changes[STORAGE_KEYS.GOALS]) {
    const newGoals = changes[STORAGE_KEYS.GOALS].newValue || [];
    const oldGoals = state.goals;

    // Check if goals actually changed (not just a reference update)
    const goalsAreDifferent = JSON.stringify(newGoals) !== JSON.stringify(oldGoals);

    if (goalsAreDifferent) {
      console.log('[StateSync] Goals changed externally:', {
        oldCount: oldGoals.length,
        newCount: newGoals.length
      });

      // Update state
      state.goals = newGoals;
      goalsChanged = true;
      needsRender = true;
    }
  }

  if (changes[STORAGE_KEYS.ACTIVE_TIMERS]) {
    const newTimers = changes[STORAGE_KEYS.ACTIVE_TIMERS].newValue || {};
    const oldTimers = state.activeTimers;

    // Check if timers actually changed
    const timersAreDifferent = JSON.stringify(newTimers) !== JSON.stringify(oldTimers);

    if (timersAreDifferent) {
      console.log('[StateSync] Active timers changed externally');
      state.activeTimers = newTimers;
      timersChanged = true;
      needsRender = true;
    }
  }

  if (changes[STORAGE_KEYS.SETTINGS]) {
    const newSettings = changes[STORAGE_KEYS.SETTINGS].newValue || {};
    const oldSettings = state.settings;

    // Check if settings actually changed
    const settingsAreDifferent = JSON.stringify(newSettings) !== JSON.stringify(oldSettings);

    if (settingsAreDifferent) {
      console.log('[StateSync] Settings changed externally');
      state.settings = newSettings;
      settingsChanged = true;
      needsRender = true;
    }
  }

  // Handle achievement changes
  if (changes[STORAGE_KEYS.ACHIEVEMENTS]) {
    const newAchievements = changes[STORAGE_KEYS.ACHIEVEMENTS].newValue || [];
    state.achievements = newAchievements;
    // Only render if on achievements screen
    if (state.currentScreen === SCREENS.ACHIEVEMENTS) {
      needsRender = true;
    }
  }

  // Handle XP data changes
  if (changes[STORAGE_KEYS.XP_DATA]) {
    const newXPData = changes[STORAGE_KEYS.XP_DATA].newValue;
    if (newXPData) {
      state.xpData = newXPData;
      // Re-render view goals to update XP display
      if (state.currentScreen === SCREENS.VIEW_GOALS) {
        needsRender = true;
      }
    }
  }

  // Handle daily challenge changes
  if (changes[STORAGE_KEYS.DAILY_CHALLENGES]) {
    const newChallenges = changes[STORAGE_KEYS.DAILY_CHALLENGES].newValue;
    if (newChallenges) {
      state.dailyChallenges = newChallenges;
      // Re-render view goals to update challenge card
      if (state.currentScreen === SCREENS.VIEW_GOALS) {
        needsRender = true;
      }
    }
  }

  // Handle pomodoro state changes
  if (changes[STORAGE_KEYS.POMODORO_STATES]) {
    const newPomodoroStates = changes[STORAGE_KEYS.POMODORO_STATES].newValue || {};
    state.pomodoroStates = newPomodoroStates;
    // Only render if showing goals
    if (state.currentScreen === SCREENS.VIEW_GOALS || state.currentScreen === SCREENS.FOCUS_MODE) {
      needsRender = true;
    }
  }

  // Trigger debounced render if needed
  if (needsRender) {
    console.log('[StateSync] Triggering debounced render', {
      goalsChanged,
      timersChanged,
      settingsChanged,
      currentScreen: state.currentScreen
    });
    debouncedRender();
  }
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize the storage listener for state synchronization
 * Should be called once during popup initialization
 */
export function initStateSync() {
  // Set up the storage change listener
  chrome.storage.onChanged.addListener(handleStorageChanges);

  console.log('[StateSync] Storage listener initialized');
}

/**
 * Clean up the storage listener
 * Call this if needed (e.g., during testing)
 */
export function cleanupStateSync() {
  chrome.storage.onChanged.removeListener(handleStorageChanges);

  if (renderDebounceTimer) {
    clearTimeout(renderDebounceTimer);
    renderDebounceTimer = null;
  }

  console.log('[StateSync] Storage listener cleaned up');
}

// =============================================================================
// Exports
// =============================================================================

export {
  debouncedRender
};
