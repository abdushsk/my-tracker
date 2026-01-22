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
  ACTIVE_TIMERS: 'activeTimers',
  HISTORY: 'history'
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

/**
 * Get history from storage
 * @returns {Promise<Array>} Array of history entries
 */
async function getHistory() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    return result[STORAGE_KEYS.HISTORY] || [];
  } catch (error) {
    console.error('[Service Worker] Error getting history:', error);
    return [];
  }
}

/**
 * Save history to storage
 * @param {Array} history - Array of history entries
 * @returns {Promise<boolean>} Success status
 */
async function saveHistory(history) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history });
    return true;
  } catch (error) {
    console.error('[Service Worker] Error saving history:', error);
    return false;
  }
}

// ============================================
// US-040: Alarm Names Constants
// ============================================

const ALARM_NAMES = {
  DAILY_RESET: 'daily-reset',
  WEEKLY_RESET: 'weekly-reset',
  MONTHLY_RESET: 'monthly-reset',
  YEARLY_RESET: 'yearly-reset'
};

// ============================================
// Installation Handler
// ============================================

/**
 * Fires when the extension is first installed, updated, or
 * when Chrome is updated.
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Service Worker] Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    console.log('[Service Worker] First time installation - initializing...');
    // Future: Initialize default settings, welcome the user, etc.
  } else if (details.reason === 'update') {
    console.log('[Service Worker] Extension updated from version:', details.previousVersion);
    // Future: Handle any migration or cleanup needed
  }

  // US-040: Set up alarms for scheduled resets
  await setupResetAlarms();

  // US-053: Update badge on install/update
  await updateBadge();
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
      // US-053: Update the extension badge with goal count
      console.log('[Service Worker] Badge update requested');
      updateBadge()
        .then(() => sendResponse({ success: true, message: 'Badge updated' }))
        .catch(error => sendResponse({ success: false, error: error.message }));
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

    case 'RESET_TIMES_CHANGED':
      // US-075: Reset times settings changed - reschedule all alarms
      console.log('[Service Worker] Reset times changed, rescheduling alarms');
      setupResetAlarms()
        .then(() => sendResponse({ success: true, message: 'Alarms rescheduled' }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;

    case 'GET_NEXT_RESET_TIMES':
      // US-075: Get the next scheduled reset times for display
      handleGetNextResetTimes()
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
// US-041: Auto Reset - Reset Logic
// ============================================

/**
 * Generate a unique identifier using crypto.randomUUID()
 * Falls back to a custom implementation if crypto.randomUUID is not available
 * @returns {string} A unique UUID string
 */
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Create a history entry for archiving goal progress before reset
 * @param {Object} goal - The goal object
 * @param {string} date - The date string for this history entry (YYYY-MM-DD format)
 * @returns {Object} A history entry object
 */
function createHistoryEntry(goal, date) {
  return {
    id: generateId(),
    goalId: goal.id,
    date: date,
    progress: goal.progress,
    target: goal.target,
    completed: goal.progress >= goal.target,
    timeframe: goal.timeframe,
    title: goal.title,
    type: goal.type,
    archivedAt: Date.now()
  };
}

/**
 * Get the date string (YYYY-MM-DD) for archiving history
 * For daily: yesterday's date
 * For weekly: the start of the week that just ended
 * For monthly: the start of the month that just ended
 * For yearly: the start of the year that just ended
 * @param {string} timeframe - The timeframe that triggered the reset
 * @returns {string} Date string in YYYY-MM-DD format
 */
function getArchiveDate(timeframe) {
  const now = new Date();
  let archiveDate;

  switch (timeframe) {
    case 'daily':
      // Archive as yesterday (the day that just ended)
      archiveDate = new Date(now);
      archiveDate.setDate(archiveDate.getDate() - 1);
      break;
    case 'weekly':
      // Archive as the start of the week that just ended (last Monday)
      archiveDate = new Date(now);
      archiveDate.setDate(archiveDate.getDate() - 7);
      break;
    case 'monthly':
      // Archive as the first day of the previous month
      archiveDate = new Date(now);
      archiveDate.setMonth(archiveDate.getMonth() - 1);
      archiveDate.setDate(1);
      break;
    case 'yearly':
      // Archive as January 1st of the previous year
      archiveDate = new Date(now);
      archiveDate.setFullYear(archiveDate.getFullYear() - 1);
      archiveDate.setMonth(0);
      archiveDate.setDate(1);
      break;
    default:
      archiveDate = new Date(now);
      archiveDate.setDate(archiveDate.getDate() - 1);
  }

  // Format as YYYY-MM-DD
  const year = archiveDate.getFullYear();
  const month = String(archiveDate.getMonth() + 1).padStart(2, '0');
  const day = String(archiveDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Perform goal reset for a specific timeframe.
 * Archives progress to history and resets goals matching the timeframe.
 * @param {string} timeframe - The timeframe to reset ('daily', 'weekly', 'monthly', 'yearly')
 * @returns {Promise<Object>} Result object with counts
 */
async function performGoalReset(timeframe) {
  console.log(`[Service Worker] Performing ${timeframe} goal reset...`);

  try {
    // Get all goals
    const goals = await getGoals();

    if (goals.length === 0) {
      console.log('[Service Worker] No goals to reset');
      return { success: true, resetCount: 0, archivedCount: 0 };
    }

    // Get current history
    const history = await getHistory();

    // Get archive date for this timeframe
    const archiveDate = getArchiveDate(timeframe);

    // Track counts
    let resetCount = 0;
    let archivedCount = 0;

    // Process each goal
    const updatedGoals = goals.map(goal => {
      // Check if this goal's timeframe matches the reset being performed
      if (goal.timeframe !== timeframe) {
        return goal; // No change for goals with different timeframes
      }

      // Archive current progress to history (only if there's any progress or activity)
      if (goal.progress > 0 || goal.isActive) {
        const historyEntry = createHistoryEntry(goal, archiveDate);
        history.push(historyEntry);
        archivedCount++;
        console.log(`[Service Worker] Archived goal "${goal.title}": ${goal.progress}/${goal.target} (${historyEntry.completed ? 'completed' : 'incomplete'})`);
      }

      // Reset the goal progress
      resetCount++;
      const now = Date.now();

      // If this was an active timer, we need to stop it
      if (goal.isActive && goal.type === 'timer') {
        console.log(`[Service Worker] Stopping active timer for goal "${goal.title}" during reset`);
      }

      return {
        ...goal,
        progress: 0,
        isActive: false,
        lastResetAt: now
      };
    });

    // Save the updated goals
    await saveGoals(updatedGoals);

    // Save the updated history
    await saveHistory(history);

    // Clean up any active timers for the reset goals
    if (resetCount > 0) {
      const activeTimers = await getActiveTimers();
      let timersUpdated = false;

      for (const goal of goals) {
        if (goal.timeframe === timeframe && activeTimers[goal.id]) {
          delete activeTimers[goal.id];
          timersUpdated = true;
          console.log(`[Service Worker] Removed active timer for goal "${goal.title}" during reset`);
        }
      }

      if (timersUpdated) {
        await saveActiveTimers(activeTimers);
      }
    }

    console.log(`[Service Worker] ${timeframe} reset complete: ${resetCount} goals reset, ${archivedCount} entries archived`);

    // US-053: Update badge after goals reset (all will be incomplete now)
    if (resetCount > 0) {
      await updateBadge();
    }

    return {
      success: true,
      resetCount,
      archivedCount,
      timeframe,
      archiveDate
    };
  } catch (error) {
    console.error(`[Service Worker] Error performing ${timeframe} reset:`, error);
    return {
      success: false,
      error: error.message,
      resetCount: 0,
      archivedCount: 0
    };
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
 *
 * US-040: Alarm handlers set up for automatic goal resets
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('[Service Worker] Alarm fired:', alarm.name);

  switch (alarm.name) {
    case ALARM_NAMES.DAILY_RESET:
      // US-041: Daily check at midnight - reset daily goals
      console.log('[Service Worker] Daily reset triggered');
      await performGoalReset('daily');
      // Note: This alarm repeats automatically via periodInMinutes
      break;

    case ALARM_NAMES.WEEKLY_RESET:
      // US-041: Weekly check at Monday midnight - reset weekly goals
      console.log('[Service Worker] Weekly reset triggered');
      await performGoalReset('weekly');
      // Note: This alarm repeats automatically via periodInMinutes
      break;

    case ALARM_NAMES.MONTHLY_RESET:
      // US-041: Monthly check at 1st midnight - reset monthly goals
      console.log('[Service Worker] Monthly reset triggered');
      await performGoalReset('monthly');
      // Reschedule for next month (since months vary in length)
      await rescheduleMonthlyAlarm();
      break;

    case ALARM_NAMES.YEARLY_RESET:
      // US-041: Yearly check at Jan 1st midnight - reset yearly goals
      console.log('[Service Worker] Yearly reset triggered');
      await performGoalReset('yearly');
      // Reschedule for next year
      await rescheduleYearlyAlarm();
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
// US-040: Auto Reset - Alarm Setup
// US-075: Updated to support custom reset times
// ============================================

/**
 * Parse time string (HH:MM format) into hours and minutes
 * @param {string} timeString - Time in HH:MM format (e.g., "09:30")
 * @returns {{hours: number, minutes: number}} Parsed hours and minutes
 */
function parseTimeString(timeString) {
  const [hours, minutes] = (timeString || '00:00').split(':').map(Number);
  return {
    hours: isNaN(hours) ? 0 : Math.max(0, Math.min(23, hours)),
    minutes: isNaN(minutes) ? 0 : Math.max(0, Math.min(59, minutes))
  };
}

/**
 * Get settings from storage (for service worker)
 * @returns {Promise<Object>} Settings object
 */
async function getSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    return result.settings || {
      dailyResetTime: '00:00',
      weeklyResetTime: '00:00',
      monthlyResetTime: '00:00',
      yearlyResetTime: '00:00'
    };
  } catch (error) {
    console.error('[Service Worker] Error getting settings:', error);
    return {
      dailyResetTime: '00:00',
      weeklyResetTime: '00:00',
      monthlyResetTime: '00:00',
      yearlyResetTime: '00:00'
    };
  }
}

/**
 * Calculate the next daily reset timestamp from now
 * US-075: Now supports custom reset time
 * @param {string} resetTime - Time in HH:MM format (default: '00:00')
 * @returns {number} Timestamp of next reset in milliseconds
 */
function getNextDailyReset(resetTime = '00:00') {
  const { hours, minutes } = parseTimeString(resetTime);
  const now = new Date();
  const resetDate = new Date(now);

  // Set the reset time
  resetDate.setHours(hours, minutes, 0, 0);

  // If this time has already passed today, move to tomorrow
  if (resetDate.getTime() <= now.getTime()) {
    resetDate.setDate(resetDate.getDate() + 1);
  }

  return resetDate.getTime();
}

/**
 * Calculate the next Monday reset timestamp
 * US-075: Now supports custom reset time
 * @param {string} resetTime - Time in HH:MM format (default: '00:00')
 * @returns {number} Timestamp of next Monday at reset time in milliseconds
 */
function getNextMondayReset(resetTime = '00:00') {
  const { hours, minutes } = parseTimeString(resetTime);
  const now = new Date();
  const monday = new Date(now);

  // Get days until next Monday (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = now.getDay();
  let daysUntilMonday = (8 - dayOfWeek) % 7 || 7;

  // Check if today is Monday and if the reset time hasn't passed yet
  if (dayOfWeek === 1) {
    const todayReset = new Date(now);
    todayReset.setHours(hours, minutes, 0, 0);
    if (now.getTime() < todayReset.getTime()) {
      daysUntilMonday = 0; // Today is Monday and reset time hasn't passed
    }
  }

  monday.setDate(monday.getDate() + daysUntilMonday);
  monday.setHours(hours, minutes, 0, 0);
  return monday.getTime();
}

/**
 * Calculate the next 1st of month reset timestamp
 * US-075: Now supports custom reset time
 * @param {string} resetTime - Time in HH:MM format (default: '00:00')
 * @returns {number} Timestamp of next 1st at reset time in milliseconds
 */
function getNextFirstOfMonthReset(resetTime = '00:00') {
  const { hours, minutes } = parseTimeString(resetTime);
  const now = new Date();
  const firstOfMonth = new Date(now);

  // Check if today is the 1st and reset time hasn't passed
  if (now.getDate() === 1) {
    const todayReset = new Date(now);
    todayReset.setHours(hours, minutes, 0, 0);
    if (now.getTime() < todayReset.getTime()) {
      firstOfMonth.setHours(hours, minutes, 0, 0);
      return firstOfMonth.getTime();
    }
  }

  // Move to first of next month
  firstOfMonth.setMonth(firstOfMonth.getMonth() + 1);
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(hours, minutes, 0, 0);
  return firstOfMonth.getTime();
}

/**
 * Calculate the next January 1st reset timestamp
 * US-075: Now supports custom reset time
 * @param {string} resetTime - Time in HH:MM format (default: '00:00')
 * @returns {number} Timestamp of next January 1st at reset time in milliseconds
 */
function getNextJanuaryFirstReset(resetTime = '00:00') {
  const { hours, minutes } = parseTimeString(resetTime);
  const now = new Date();
  const january = new Date(now);

  // Check if today is January 1st and reset time hasn't passed
  if (now.getMonth() === 0 && now.getDate() === 1) {
    const todayReset = new Date(now);
    todayReset.setHours(hours, minutes, 0, 0);
    if (now.getTime() < todayReset.getTime()) {
      january.setHours(hours, minutes, 0, 0);
      return january.getTime();
    }
  }

  // Move to January 1st of next year
  january.setFullYear(january.getFullYear() + 1);
  january.setMonth(0);
  january.setDate(1);
  january.setHours(hours, minutes, 0, 0);
  return january.getTime();
}

// Legacy functions for backward compatibility (still used internally)
function getNextMidnight() {
  return getNextDailyReset('00:00');
}

function getNextMondayMidnight() {
  return getNextMondayReset('00:00');
}

function getNextFirstOfMonth() {
  return getNextFirstOfMonthReset('00:00');
}

function getNextJanuaryFirst() {
  return getNextJanuaryFirstReset('00:00');
}

/**
 * US-075: Get the next scheduled reset times for all timeframes
 * Used to display "Next reset at X" in the UI
 * @returns {Promise<Object>} Object with next reset timestamps
 */
async function handleGetNextResetTimes() {
  try {
    const settings = await getSettings();

    const nextResetTimes = {
      daily: {
        time: settings.dailyResetTime || '00:00',
        nextReset: getNextDailyReset(settings.dailyResetTime || '00:00')
      },
      weekly: {
        time: settings.weeklyResetTime || '00:00',
        nextReset: getNextMondayReset(settings.weeklyResetTime || '00:00')
      },
      monthly: {
        time: settings.monthlyResetTime || '00:00',
        nextReset: getNextFirstOfMonthReset(settings.monthlyResetTime || '00:00')
      },
      yearly: {
        time: settings.yearlyResetTime || '00:00',
        nextReset: getNextJanuaryFirstReset(settings.yearlyResetTime || '00:00')
      }
    };

    return { success: true, nextResetTimes };
  } catch (error) {
    console.error('[Service Worker] Error getting next reset times:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Set up all reset alarms for automatic goal resets.
 * US-075: Now uses custom reset times from settings.
 * Creates alarms for:
 * - Daily reset at configured time every day
 * - Weekly reset at configured time on Monday
 * - Monthly reset at configured time on the 1st
 * - Yearly reset at configured time on January 1st
 *
 * Alarms persist across browser restarts (Chrome manages this).
 * @returns {Promise<void>}
 */
async function setupResetAlarms() {
  console.log('[Service Worker] Setting up reset alarms...');

  try {
    // US-075: Get custom reset times from settings
    const settings = await getSettings();
    const dailyResetTime = settings.dailyResetTime || '00:00';
    const weeklyResetTime = settings.weeklyResetTime || '00:00';
    const monthlyResetTime = settings.monthlyResetTime || '00:00';
    const yearlyResetTime = settings.yearlyResetTime || '00:00';

    console.log('[Service Worker] Using reset times:', {
      daily: dailyResetTime,
      weekly: weeklyResetTime,
      monthly: monthlyResetTime,
      yearly: yearlyResetTime
    });

    // Clear any existing reset alarms first to avoid duplicates
    await chrome.alarms.clear(ALARM_NAMES.DAILY_RESET);
    await chrome.alarms.clear(ALARM_NAMES.WEEKLY_RESET);
    await chrome.alarms.clear(ALARM_NAMES.MONTHLY_RESET);
    await chrome.alarms.clear(ALARM_NAMES.YEARLY_RESET);

    const now = Date.now();

    // Create daily alarm - fires at configured time, repeats every 24 hours (1440 minutes)
    const nextDaily = getNextDailyReset(dailyResetTime);
    await chrome.alarms.create(ALARM_NAMES.DAILY_RESET, {
      when: nextDaily,
      periodInMinutes: 24 * 60 // 1440 minutes = 24 hours
    });
    console.log(`[Service Worker] Daily reset alarm set for ${new Date(nextDaily).toLocaleString()}`);

    // Create weekly alarm - fires at configured time on Monday, repeats every 7 days (10080 minutes)
    const nextMonday = getNextMondayReset(weeklyResetTime);
    await chrome.alarms.create(ALARM_NAMES.WEEKLY_RESET, {
      when: nextMonday,
      periodInMinutes: 7 * 24 * 60 // 10080 minutes = 7 days
    });
    console.log(`[Service Worker] Weekly reset alarm set for ${new Date(nextMonday).toLocaleString()}`);

    // Create monthly alarm - fires at configured time on 1st of month
    // Note: Month length varies, so we only set the first occurrence here
    // The alarm handler will reschedule for the next month when it fires
    const nextFirst = getNextFirstOfMonthReset(monthlyResetTime);
    await chrome.alarms.create(ALARM_NAMES.MONTHLY_RESET, {
      when: nextFirst
      // No periodInMinutes - we'll reschedule when it fires since months vary
    });
    console.log(`[Service Worker] Monthly reset alarm set for ${new Date(nextFirst).toLocaleString()}`);

    // Create yearly alarm - fires at configured time on January 1st
    const nextJanuary = getNextJanuaryFirstReset(yearlyResetTime);
    await chrome.alarms.create(ALARM_NAMES.YEARLY_RESET, {
      when: nextJanuary
      // No periodInMinutes - we'll reschedule when it fires
    });
    console.log(`[Service Worker] Yearly reset alarm set for ${new Date(nextJanuary).toLocaleString()}`);

    // Log all alarms for debugging
    const allAlarms = await chrome.alarms.getAll();
    console.log('[Service Worker] All alarms set up:', allAlarms.map(a => ({
      name: a.name,
      scheduledTime: new Date(a.scheduledTime).toLocaleString(),
      periodInMinutes: a.periodInMinutes
    })));

  } catch (error) {
    console.error('[Service Worker] Error setting up reset alarms:', error);
  }
}

/**
 * Reschedule the monthly alarm for the next month.
 * Called after the monthly alarm fires since months have varying lengths.
 * US-075: Now uses custom reset time from settings.
 * @returns {Promise<void>}
 */
async function rescheduleMonthlyAlarm() {
  try {
    const settings = await getSettings();
    const monthlyResetTime = settings.monthlyResetTime || '00:00';
    const nextFirst = getNextFirstOfMonthReset(monthlyResetTime);
    await chrome.alarms.create(ALARM_NAMES.MONTHLY_RESET, {
      when: nextFirst
    });
    console.log(`[Service Worker] Monthly alarm rescheduled for ${new Date(nextFirst).toLocaleString()}`);
  } catch (error) {
    console.error('[Service Worker] Error rescheduling monthly alarm:', error);
  }
}

/**
 * Reschedule the yearly alarm for next year.
 * Called after the yearly alarm fires.
 * US-075: Now uses custom reset time from settings.
 * @returns {Promise<void>}
 */
async function rescheduleYearlyAlarm() {
  try {
    const settings = await getSettings();
    const yearlyResetTime = settings.yearlyResetTime || '00:00';
    const nextJanuary = getNextJanuaryFirstReset(yearlyResetTime);
    await chrome.alarms.create(ALARM_NAMES.YEARLY_RESET, {
      when: nextJanuary
    });
    console.log(`[Service Worker] Yearly alarm rescheduled for ${new Date(nextJanuary).toLocaleString()}`);
  } catch (error) {
    console.error('[Service Worker] Error rescheduling yearly alarm:', error);
  }
}

// ============================================
// Extension Startup
// ============================================

/**
 * Fires when the extension starts (e.g., browser startup, extension enabled).
 * Note: This event also fires on service worker wake-up.
 * US-031: Check for completed timers on startup
 * US-040: Verify alarms are still set up
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Service Worker] Extension started');

  // US-031: Check for any timers that may have completed
  await checkForCompletedTimers();

  // US-040: Verify alarms are still set up (they should persist, but verify)
  await verifyAlarmsSetup();

  // US-053: Update badge on browser startup
  await updateBadge();
});

/**
 * US-040: Verify that all reset alarms are properly set up.
 * If any are missing, recreate them. This handles edge cases where
 * alarms might have been cleared for some reason.
 * @returns {Promise<void>}
 */
async function verifyAlarmsSetup() {
  console.log('[Service Worker] Verifying alarm setup...');

  try {
    const alarms = await chrome.alarms.getAll();
    const alarmNames = alarms.map(a => a.name);

    let needsSetup = false;

    // Check if each required alarm exists
    if (!alarmNames.includes(ALARM_NAMES.DAILY_RESET)) {
      console.log('[Service Worker] Daily reset alarm missing');
      needsSetup = true;
    }
    if (!alarmNames.includes(ALARM_NAMES.WEEKLY_RESET)) {
      console.log('[Service Worker] Weekly reset alarm missing');
      needsSetup = true;
    }
    if (!alarmNames.includes(ALARM_NAMES.MONTHLY_RESET)) {
      console.log('[Service Worker] Monthly reset alarm missing');
      needsSetup = true;
    }
    if (!alarmNames.includes(ALARM_NAMES.YEARLY_RESET)) {
      console.log('[Service Worker] Yearly reset alarm missing');
      needsSetup = true;
    }

    if (needsSetup) {
      console.log('[Service Worker] Recreating missing alarms...');
      await setupResetAlarms();
    } else {
      console.log('[Service Worker] All alarms verified');
    }
  } catch (error) {
    console.error('[Service Worker] Error verifying alarms:', error);
    // Try to set up alarms anyway
    await setupResetAlarms();
  }
}

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

// ============================================
// US-053: Browser Badge - Goal Count
// ============================================

/**
 * Badge color constants
 */
const BADGE_COLORS = {
  ALL_COMPLETE: '#22c55e', // Green when all goals done
  INCOMPLETE: '#f97316',   // Orange when there are incomplete goals
  NO_GOALS: '#94a3b8'      // Gray when no goals exist (badge will be cleared)
};

/**
 * Update the extension badge to show incomplete goals count.
 * - Shows count of incomplete goals when there are some
 * - Shows green background when all goals are complete
 * - Shows orange background when there are incomplete goals
 * - Clears the badge when there are no goals
 * @returns {Promise<void>}
 */
async function updateBadge() {
  console.log('[Service Worker] Updating badge...');

  try {
    const goals = await getGoals();

    if (goals.length === 0) {
      // No goals - clear the badge
      await chrome.action.setBadgeText({ text: '' });
      console.log('[Service Worker] Badge cleared - no goals');
      return;
    }

    // Count incomplete goals (progress < target)
    const incompleteCount = goals.filter(goal => goal.progress < goal.target).length;
    const totalCount = goals.length;
    const allComplete = incompleteCount === 0;

    if (allComplete) {
      // All goals complete - show checkmark or empty with green background
      await chrome.action.setBadgeText({ text: '✓' });
      await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.ALL_COMPLETE });
      console.log('[Service Worker] Badge updated - all goals complete');
    } else {
      // Show incomplete count with orange background
      const badgeText = incompleteCount.toString();
      await chrome.action.setBadgeText({ text: badgeText });
      await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.INCOMPLETE });
      console.log(`[Service Worker] Badge updated - ${incompleteCount}/${totalCount} incomplete`);
    }
  } catch (error) {
    console.error('[Service Worker] Error updating badge:', error);
  }
}

// ============================================
// US-053: Storage Change Listener for Badge Updates
// ============================================

/**
 * Listen for changes to storage to update badge when goals change.
 * This ensures the badge stays in sync even when changes come from
 * other parts of the extension (popup, content scripts).
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[STORAGE_KEYS.GOALS]) {
    console.log('[Service Worker] Goals changed in storage - updating badge');
    updateBadge();
  }
});

// Log that service worker has loaded
console.log('[Service Worker] Daily Goals Tracker service worker loaded');

// US-053: Initial badge update when service worker loads
updateBadge();
