/**
 * My Tracker - Service Worker
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

    // US-076: Notification message handlers
    case 'NOTIFICATION_SETTINGS_CHANGED':
    case 'TEST_NOTIFICATION':
    case 'REQUEST_NOTIFICATION_PERMISSION':
      return handleNotificationMessage(message, sendResponse);

    // US-024: Open popup from widget
    case 'OPEN_POPUP':
      handleOpenPopup()
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
    const todayDateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const updatedGoals = goals.map(goal => {
      // Check if this goal's timeframe matches the reset being performed
      if (goal.timeframe !== timeframe) {
        return goal; // No change for goals with different timeframes
      }

      const now = Date.now();

      // US-087: Avoidance goals get special handling - streak increments instead of reset
      if (goal.type === 'avoidance') {
        // Only increment if we haven't already incremented today
        const lastIncrement = goal.lastStreakIncrementDate;
        if (lastIncrement !== todayDateStr) {
          const newProgress = (goal.progress || 0) + 1;
          const newLongestStreak = Math.max(goal.longestAvoidanceStreak || 0, newProgress);

          console.log(`[Service Worker] Avoidance goal "${goal.title}": streak increased to ${newProgress} days (record: ${newLongestStreak})`);

          // Archive the successful day
          const historyEntry = createHistoryEntry({
            ...goal,
            progress: 1,
            target: 1
          }, archiveDate);
          historyEntry.completed = true;
          history.push(historyEntry);
          archivedCount++;

          return {
            ...goal,
            progress: newProgress,
            longestAvoidanceStreak: newLongestStreak,
            lastStreakIncrementDate: todayDateStr,
            lastResetAt: now
          };
        }
        return goal; // Already incremented today
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

/**
 * US-087: Reset weekly slip-up counters for avoidance goals
 * Called on weekly reset to restore forgiveness for all avoidance goals
 */
async function resetAvoidanceSlipUpCounters() {
  try {
    const goals = await getGoals();

    const avoidanceGoals = goals.filter(g => g.type === 'avoidance');
    if (avoidanceGoals.length === 0) {
      console.log('[Service Worker] No avoidance goals to reset slip-up counters');
      return;
    }

    let resetCount = 0;
    const updatedGoals = goals.map(goal => {
      if (goal.type === 'avoidance' && goal.slipUpsThisWeek > 0) {
        resetCount++;
        console.log(`[Service Worker] Reset slip-up counter for avoidance goal "${goal.title}"`);
        return {
          ...goal,
          slipUpsThisWeek: 0
        };
      }
      return goal;
    });

    if (resetCount > 0) {
      await saveGoals(updatedGoals);
      console.log(`[Service Worker] Reset ${resetCount} avoidance goal slip-up counters`);
    }
  } catch (error) {
    console.error('[Service Worker] Error resetting avoidance slip-up counters:', error);
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
      // US-087: Reset avoidance slip-up counters weekly
      await resetAvoidanceSlipUpCounters();
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
      // Legacy reminder (kept for backwards compatibility)
      console.log('[Service Worker] Legacy reminder notification triggered');
      break;

    // US-076: Notification alarm handlers
    case NOTIFICATION_ALARM_NAMES.DAILY_REMINDER:
      console.log('[Service Worker] Daily reminder alarm triggered');
      await showDailyReminderNotification();
      break;

    default:
      // Check if it's a timer-related alarm (e.g., 'timer-{goalId}')
      if (alarm.name.startsWith('timer-')) {
        const goalId = alarm.name.replace('timer-', '');
        console.log('[Service Worker] Timer alarm for goal:', goalId);
        // Future: Handle timer completion or update
      }
      // US-076: Check if it's a snooze alarm
      else if (alarm.name.startsWith(NOTIFICATION_ALARM_NAMES.SNOOZE_PREFIX)) {
        const notificationId = alarm.name.replace(NOTIFICATION_ALARM_NAMES.SNOOZE_PREFIX, '');
        console.log('[Service Worker] Snooze alarm triggered for:', notificationId);
        if (notificationId === NOTIFICATION_IDS.DAILY_REMINDER) {
          await showDailyReminderNotification();
        }
      }
      else {
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

  // US-076: Initialize notification alarms
  await initializeNotificationAlarms();
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

// ============================================
// US-076: Browser Notifications for Reminders
// ============================================

/**
 * Notification IDs for tracking active notifications
 */
const NOTIFICATION_IDS = {
  DAILY_REMINDER: 'daily-reminder',
  GOAL_REMINDER_PREFIX: 'goal-reminder-',
  SNOOZE_PREFIX: 'snooze-'
};

/**
 * Alarm names for notification scheduling
 */
const NOTIFICATION_ALARM_NAMES = {
  DAILY_REMINDER: 'notification-daily-reminder',
  SNOOZE_PREFIX: 'notification-snooze-'
};

/**
 * Check if the current time is within quiet hours
 * @param {Object} settings - The settings object
 * @returns {boolean} True if currently in quiet hours
 */
function isInQuietHours(settings) {
  if (!settings.quietHoursEnabled) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const { hours: startHours, minutes: startMinutes } = parseTimeString(settings.quietHoursStart || '22:00');
  const { hours: endHours, minutes: endMinutes } = parseTimeString(settings.quietHoursEnd || '07:00');

  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (startTotalMinutes > endTotalMinutes) {
    // Quiet hours span midnight
    return currentMinutes >= startTotalMinutes || currentMinutes < endTotalMinutes;
  } else {
    // Quiet hours within same day
    return currentMinutes >= startTotalMinutes && currentMinutes < endTotalMinutes;
  }
}

/**
 * Show a browser notification for goal reminders
 * @param {string} id - Unique notification ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} options - Additional notification options
 * @returns {Promise<string>} The notification ID
 */
async function showNotification(id, title, message, options = {}) {
  try {
    const settings = await getSettings();

    // Check quiet hours
    if (isInQuietHours(settings)) {
      console.log('[Service Worker] Notification suppressed - quiet hours active');
      return null;
    }

    const notificationOptions = {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('src/assets/icons/icon-128.png'),
      title: title,
      message: message,
      priority: 2,
      requireInteraction: false,
      silent: false,
      ...options
    };

    // Add buttons if specified
    if (options.buttons) {
      notificationOptions.buttons = options.buttons;
    }

    await chrome.notifications.create(id, notificationOptions);
    console.log(`[Service Worker] Notification created: ${id}`);
    return id;
  } catch (error) {
    console.error('[Service Worker] Error showing notification:', error);
    return null;
  }
}

/**
 * Show daily reminder notification with incomplete goals summary
 */
async function showDailyReminderNotification() {
  console.log('[Service Worker] Showing daily reminder notification');

  try {
    const goals = await getGoals();
    const incompleteGoals = goals.filter(g => g.progress < g.target);
    const completeCount = goals.length - incompleteGoals.length;

    if (goals.length === 0) {
      // No goals to track
      await showNotification(
        NOTIFICATION_IDS.DAILY_REMINDER,
        'Daily Goals Reminder',
        'You have no goals set up. Click to add some goals!',
        {
          buttons: [
            { title: 'Open App' }
          ]
        }
      );
      return;
    }

    if (incompleteGoals.length === 0) {
      // All goals complete!
      await showNotification(
        NOTIFICATION_IDS.DAILY_REMINDER,
        'Great Job! All Goals Complete! ✓',
        `You've completed all ${goals.length} goals today. Keep up the great work!`,
        {
          buttons: [
            { title: 'View Progress' }
          ]
        }
      );
      return;
    }

    // Some goals incomplete
    const topIncomplete = incompleteGoals.slice(0, 3).map(g => g.title).join(', ');
    const message = incompleteGoals.length <= 3
      ? `Pending: ${topIncomplete}`
      : `${incompleteGoals.length} goals pending including: ${topIncomplete}`;

    await showNotification(
      NOTIFICATION_IDS.DAILY_REMINDER,
      `Daily Goals: ${completeCount}/${goals.length} Complete`,
      message,
      {
        buttons: [
          { title: 'Open App' },
          { title: 'Snooze 1hr' }
        ]
      }
    );
  } catch (error) {
    console.error('[Service Worker] Error showing daily reminder:', error);
  }
}

/**
 * Schedule the daily reminder alarm based on settings
 * @param {Object} settings - Settings object
 */
async function scheduleDailyReminderAlarm(settings) {
  // Clear existing daily reminder alarm
  await chrome.alarms.clear(NOTIFICATION_ALARM_NAMES.DAILY_REMINDER);

  if (!settings.dailyReminderEnabled) {
    console.log('[Service Worker] Daily reminder disabled - alarm cleared');
    return;
  }

  const reminderTime = settings.dailyReminderTime || '09:00';
  const { hours, minutes } = parseTimeString(reminderTime);

  const now = new Date();
  const nextReminder = new Date(now);
  nextReminder.setHours(hours, minutes, 0, 0);

  // If this time has already passed today, schedule for tomorrow
  if (nextReminder.getTime() <= now.getTime()) {
    nextReminder.setDate(nextReminder.getDate() + 1);
  }

  await chrome.alarms.create(NOTIFICATION_ALARM_NAMES.DAILY_REMINDER, {
    when: nextReminder.getTime(),
    periodInMinutes: 24 * 60 // Repeat every 24 hours
  });

  console.log(`[Service Worker] Daily reminder scheduled for ${nextReminder.toLocaleString()}`);
}

/**
 * Schedule a snooze alarm to show the notification again later
 * @param {string} notificationId - The notification ID to snooze
 * @param {number} delayMinutes - Minutes to snooze
 */
async function scheduleSnoozeAlarm(notificationId, delayMinutes = 60) {
  const alarmName = `${NOTIFICATION_ALARM_NAMES.SNOOZE_PREFIX}${notificationId}`;

  await chrome.alarms.create(alarmName, {
    delayInMinutes: delayMinutes
  });

  console.log(`[Service Worker] Snooze alarm scheduled for ${delayMinutes} minutes: ${alarmName}`);
}

/**
 * Handle notification button clicks
 */
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  console.log(`[Service Worker] Notification button clicked: ${notificationId}, button ${buttonIndex}`);

  if (notificationId === NOTIFICATION_IDS.DAILY_REMINDER) {
    if (buttonIndex === 0) {
      // "Open App" or "View Progress" - open the popup
      // Note: We can't directly open the popup, but clicking the notification will
      chrome.notifications.clear(notificationId);
    } else if (buttonIndex === 1) {
      // "Snooze 1hr"
      chrome.notifications.clear(notificationId);
      await scheduleSnoozeAlarm(NOTIFICATION_IDS.DAILY_REMINDER, 60);
      console.log('[Service Worker] Daily reminder snoozed for 1 hour');
    }
  }
});

/**
 * Handle notification click (body click)
 */
chrome.notifications.onClicked.addListener(async (notificationId) => {
  console.log(`[Service Worker] Notification clicked: ${notificationId}`);

  // Clear the notification
  chrome.notifications.clear(notificationId);

  // The click will naturally focus the browser - user can then click the extension icon
});

// ============================================
// US-024: Open Popup Handler
// ============================================

/**
 * Handle request to open the extension popup from the widget
 * Uses chrome.action.openPopup() which is available in Chrome 127+
 * @returns {Promise<Object>} Response object
 */
async function handleOpenPopup() {
  console.log('[Service Worker] Open popup requested from widget');

  try {
    // chrome.action.openPopup() is available in Chrome 127+
    // It opens the extension's popup programmatically
    await chrome.action.openPopup();
    console.log('[Service Worker] Popup opened successfully');
    return { success: true };
  } catch (error) {
    console.error('[Service Worker] Error opening popup:', error);
    // If openPopup fails (e.g., older Chrome version), return error
    // The widget will handle this gracefully
    throw new Error('Unable to open popup. Please click the extension icon in your toolbar.');
  }
}

/**
 * Handle notification closed
 */
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  console.log(`[Service Worker] Notification closed: ${notificationId}, by user: ${byUser}`);
});

/**
 * Handle message types for notifications
 */
function handleNotificationMessage(message, sendResponse) {
  switch (message.type) {
    case 'NOTIFICATION_SETTINGS_CHANGED':
      // Settings changed - update notification scheduling
      handleNotificationSettingsChanged(message.settings)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'TEST_NOTIFICATION':
      // Show a test notification
      showNotification(
        'test-notification',
        'Test Notification',
        'This is a test notification from My Tracker!',
        { requireInteraction: false }
      )
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'REQUEST_NOTIFICATION_PERMISSION':
      // Check and report notification permission status
      // Note: Chrome extensions with "notifications" permission don't need to request
      sendResponse({ success: true, granted: true });
      return true;

    default:
      return false;
  }
}

/**
 * Handle notification settings changed
 * @param {Object} settings - New settings object
 */
async function handleNotificationSettingsChanged(settings) {
  console.log('[Service Worker] Notification settings changed:', settings);

  // Reschedule daily reminder alarm based on new settings
  await scheduleDailyReminderAlarm(settings);
}

/**
 * Initialize notification alarms on startup
 */
async function initializeNotificationAlarms() {
  console.log('[Service Worker] Initializing notification alarms');

  try {
    const settings = await getSettings();

    // Set up daily reminder if enabled
    if (settings.dailyReminderEnabled) {
      await scheduleDailyReminderAlarm(settings);
    }
  } catch (error) {
    console.error('[Service Worker] Error initializing notification alarms:', error);
  }
}

// Log that service worker has loaded
console.log('[Service Worker] My Tracker service worker loaded');

// US-053: Initial badge update when service worker loads
updateBadge();

// US-076: Initialize notification alarms when service worker loads
initializeNotificationAlarms();
