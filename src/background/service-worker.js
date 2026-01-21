/**
 * Daily Goals Tracker - Service Worker
 *
 * Background service worker for Chrome extension (Manifest V3).
 * Handles:
 * - Extension installation/updates
 * - Persistent timers (continue when popup closed)
 * - Scheduled goal resets via chrome.alarms
 * - Message passing with popup
 * - Badge updates
 */

// ============================================
// US-031: Storage Keys and Helpers
// ============================================

const STORAGE_KEYS = {
  GOALS: 'goals',
  ACTIVE_TIMERS: 'activeTimers'
};

/**
 * Get active timers from storage
 * @returns {Promise<Object>} Object mapping goalId to timer state
 */
async function getActiveTimers() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_TIMERS);
    return result[STORAGE_KEYS.ACTIVE_TIMERS] || {};
  } catch (error) {
    console.error('[Service Worker] Error getting active timers:', error);
    return {};
  }
}

/**
 * Save active timers to storage
 * @param {Object} timers - Object mapping goalId to timer state
 * @returns {Promise<boolean>} Success status
 */
async function saveActiveTimers(timers) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_TIMERS]: timers });
    return true;
  } catch (error) {
    console.error('[Service Worker] Error saving active timers:', error);
    return false;
  }
}

/**
 * Get all goals from storage
 * @returns {Promise<Array>} Array of goal objects
 */
async function getGoals() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.GOALS);
    return result[STORAGE_KEYS.GOALS] || [];
  } catch (error) {
    console.error('[Service Worker] Error getting goals:', error);
    return [];
  }
}

/**
 * Save goals to storage
 * @param {Array} goals - Array of goal objects
 * @returns {Promise<boolean>} Success status
 */
async function saveGoals(goals) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.GOALS]: goals });
    return true;
  } catch (error) {
    console.error('[Service Worker] Error saving goals:', error);
    return false;
  }
}

/**
 * Update a single goal in storage
 * @param {string} goalId - The goal ID to update
 * @param {Object} updates - Object with properties to update
 * @returns {Promise<boolean>} Success status
 */
async function updateGoal(goalId, updates) {
  try {
    const goals = await getGoals();
    const index = goals.findIndex(goal => goal.id === goalId);
    if (index === -1) {
      console.error('[Service Worker] Goal not found:', goalId);
      return false;
    }
    goals[index] = { ...goals[index], ...updates };
    return await saveGoals(goals);
  } catch (error) {
    console.error('[Service Worker] Error updating goal:', error);
    return false;
  }
}

// ============================================
// Installation Handler
// ============================================

/**
 * Fires when the extension is first installed, updated, or
 * when Chrome is updated.
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Service Worker] Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    console.log('[Service Worker] First time installation - initializing...');
    // Future: Initialize default settings, welcome the user, etc.
  } else if (details.reason === 'update') {
    console.log('[Service Worker] Extension updated from version:', details.previousVersion);
    // Future: Handle any migration or cleanup needed
  }

  // Future: Set up alarms for scheduled resets
  // setupResetAlarms();
});

// ============================================
// Message Listener
// ============================================

/**
 * Handles messages from the popup and content scripts.
 * Used for communication between popup UI and background tasks.
 * US-031: Implemented timer start/pause handling with persistence
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Service Worker] Message received:', message);

  // Handle different message types
  switch (message.type) {
    case 'TIMER_START':
      // US-031: Handle timer start - store startTime in activeTimers
      handleTimerStart(message.goalId, message.startTime)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;

    case 'TIMER_PAUSE':
      // US-031: Handle timer pause - calculate elapsed, save progress, remove from activeTimers
      handleTimerPause(message.goalId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;

    case 'UPDATE_BADGE':
      // Future: Update the extension badge with goal count
      console.log('[Service Worker] Badge update requested:', message.data);
      sendResponse({ success: true, message: 'Badge updated' });
      break;

    case 'GET_ACTIVE_TIMERS':
      // US-031: Return list of currently active timers with elapsed time calculated
      handleGetActiveTimers()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;

    case 'SYNC_TIMER_PROGRESS':
      // US-031: Sync timer progress from popup - used when popup calculated elapsed time
      handleSyncTimerProgress(message.goalId, message.progress, message.isActive)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;

    default:
      console.log('[Service Worker] Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  // Return true to indicate async response (required for sendResponse to work)
  return true;
});

// ============================================
// US-031: Timer Background Tracking Handlers
// ============================================

/**
 * Handle timer start - stores start time for background tracking
 * @param {string} goalId - The ID of the goal
 * @param {number} startTime - The timestamp when timer started
 * @returns {Promise<Object>} Response object
 */
async function handleTimerStart(goalId, startTime) {
  console.log(`[Service Worker] Starting timer for goal ${goalId} at ${new Date(startTime).toLocaleTimeString()}`);

  try {
    // Get current active timers
    const activeTimers = await getActiveTimers();

    // Store the timer start time
    activeTimers[goalId] = {
      startTime: startTime,
      goalId: goalId
    };

    // Save to storage
    await saveActiveTimers(activeTimers);

    // Update goal isActive status
    await updateGoal(goalId, { isActive: true });

    console.log(`[Service Worker] Timer started and stored for goal ${goalId}`);

    return { success: true, message: 'Timer started', startTime: startTime };
  } catch (error) {
    console.error('[Service Worker] Error starting timer:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle timer pause - calculates elapsed time and updates progress
 * @param {string} goalId - The ID of the goal
 * @returns {Promise<Object>} Response object
 */
async function handleTimerPause(goalId) {
  console.log(`[Service Worker] Pausing timer for goal ${goalId}`);

  try {
    // Get current active timers
    const activeTimers = await getActiveTimers();
    const timerData = activeTimers[goalId];

    if (!timerData || !timerData.startTime) {
      console.log(`[Service Worker] No active timer found for goal ${goalId}`);
      return { success: true, message: 'No active timer to pause' };
    }

    // Calculate elapsed time
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - timerData.startTime) / 1000);

    // Get the goal and update progress
    const goals = await getGoals();
    const goalIndex = goals.findIndex(g => g.id === goalId);

    if (goalIndex !== -1) {
      const goal = goals[goalIndex];
      const newProgress = Math.min(goal.progress + elapsedSeconds, goal.target);

      goals[goalIndex] = {
        ...goal,
        progress: newProgress,
        isActive: false
      };

      await saveGoals(goals);
      console.log(`[Service Worker] Updated goal progress: +${elapsedSeconds}s, total: ${newProgress}s`);
    }

    // Remove from active timers
    delete activeTimers[goalId];
    await saveActiveTimers(activeTimers);

    console.log(`[Service Worker] Timer paused for goal ${goalId}`);

    return { success: true, message: 'Timer paused', elapsedSeconds: elapsedSeconds };
  } catch (error) {
    console.error('[Service Worker] Error pausing timer:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle get active timers request - returns timers with calculated elapsed time
 * @returns {Promise<Object>} Response object with timers
 */
async function handleGetActiveTimers() {
  console.log('[Service Worker] Getting active timers');

  try {
    const activeTimers = await getActiveTimers();
    const goals = await getGoals();
    const now = Date.now();

    // Calculate current elapsed time for each active timer
    const timersWithElapsed = {};
    for (const [goalId, timerData] of Object.entries(activeTimers)) {
      const goal = goals.find(g => g.id === goalId);
      if (goal && timerData.startTime) {
        const elapsedSinceStart = Math.floor((now - timerData.startTime) / 1000);
        const currentProgress = Math.min(goal.progress + elapsedSinceStart, goal.target);

        timersWithElapsed[goalId] = {
          ...timerData,
          elapsedSinceStart: elapsedSinceStart,
          currentProgress: currentProgress,
          baseProgress: goal.progress,
          target: goal.target
        };
      }
    }

    console.log('[Service Worker] Active timers:', Object.keys(timersWithElapsed).length);

    return { success: true, timers: timersWithElapsed };
  } catch (error) {
    console.error('[Service Worker] Error getting active timers:', error);
    return { success: false, error: error.message, timers: {} };
  }
}

/**
 * Handle sync timer progress - syncs progress calculated by popup
 * @param {string} goalId - The ID of the goal
 * @param {number} progress - The current progress value
 * @param {boolean} isActive - Whether the timer is still active
 * @returns {Promise<Object>} Response object
 */
async function handleSyncTimerProgress(goalId, progress, isActive) {
  console.log(`[Service Worker] Syncing timer progress for goal ${goalId}: ${progress}s, active: ${isActive}`);

  try {
    // Update goal progress
    await updateGoal(goalId, { progress: progress, isActive: isActive });

    // If not active, remove from active timers
    if (!isActive) {
      const activeTimers = await getActiveTimers();
      if (activeTimers[goalId]) {
        delete activeTimers[goalId];
        await saveActiveTimers(activeTimers);
      }
    }

    return { success: true, message: 'Progress synced' };
  } catch (error) {
    console.error('[Service Worker] Error syncing progress:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// Alarm Listener
// ============================================

/**
 * Handles Chrome alarms for scheduled tasks.
 * Used for:
 * - Daily/weekly/monthly/yearly goal resets
 * - Reminder notifications
 * - Break reminders for long timer sessions
 */
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('[Service Worker] Alarm fired:', alarm.name);

  switch (alarm.name) {
    case 'daily-reset':
      // Future: Reset all daily goals at midnight
      console.log('[Service Worker] Daily reset triggered');
      // resetGoalsByTimeframe('daily');
      break;

    case 'weekly-reset':
      // Future: Reset all weekly goals on Monday midnight
      console.log('[Service Worker] Weekly reset triggered');
      // resetGoalsByTimeframe('weekly');
      break;

    case 'monthly-reset':
      // Future: Reset all monthly goals on 1st midnight
      console.log('[Service Worker] Monthly reset triggered');
      // resetGoalsByTimeframe('monthly');
      break;

    case 'yearly-reset':
      // Future: Reset all yearly goals on Jan 1st midnight
      console.log('[Service Worker] Yearly reset triggered');
      // resetGoalsByTimeframe('yearly');
      break;

    case 'reminder':
      // Future: Show reminder notification
      console.log('[Service Worker] Reminder notification triggered');
      // showReminderNotification();
      break;

    default:
      // Check if it's a timer-related alarm (e.g., 'timer-{goalId}')
      if (alarm.name.startsWith('timer-')) {
        const goalId = alarm.name.replace('timer-', '');
        console.log('[Service Worker] Timer alarm for goal:', goalId);
        // Future: Handle timer completion or update
      } else {
        console.log('[Service Worker] Unknown alarm:', alarm.name);
      }
  }
});

// ============================================
// Extension Startup
// ============================================

/**
 * Fires when the extension starts (e.g., browser startup, extension enabled).
 * Note: This event also fires on service worker wake-up.
 * US-031: Check for completed timers on startup
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Service Worker] Extension started');

  // US-031: Check for any timers that may have completed
  await checkForCompletedTimers();

  // Future: Verify alarms are still set up
  // Future: Update badge with current goal count
});

/**
 * US-031: Check for timers that completed while browser was closed
 * Handles the case where a timer was running, browser was closed, and when
 * reopened the timer should be marked as complete if it exceeded its target
 */
async function checkForCompletedTimers() {
  console.log('[Service Worker] Checking for completed timers...');

  try {
    const activeTimers = await getActiveTimers();
    const goals = await getGoals();
    const now = Date.now();
    let updated = false;

    for (const [goalId, timerData] of Object.entries(activeTimers)) {
      const goal = goals.find(g => g.id === goalId);

      if (!goal) {
        // Goal was deleted - clean up timer
        delete activeTimers[goalId];
        updated = true;
        continue;
      }

      if (goal.type === 'timer' && timerData.startTime) {
        const elapsedSinceStart = Math.floor((now - timerData.startTime) / 1000);
        const currentProgress = goal.progress + elapsedSinceStart;

        if (currentProgress >= goal.target) {
          // Timer completed while browser was closed
          console.log(`[Service Worker] Timer ${goalId} completed while closed`);

          goal.progress = goal.target;
          goal.isActive = false;

          // Remove from active timers
          delete activeTimers[goalId];
          updated = true;
        }
      }
    }

    if (updated) {
      await saveActiveTimers(activeTimers);
      await saveGoals(goals);
      console.log('[Service Worker] Updated completed timers');
    }
  } catch (error) {
    console.error('[Service Worker] Error checking for completed timers:', error);
  }
}

// Log that service worker has loaded
console.log('[Service Worker] Daily Goals Tracker service worker loaded');
