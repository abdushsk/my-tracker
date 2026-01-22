/**
 * Storage Utility Module
 * Helper functions for Chrome storage API operations
 * Uses chrome.storage.local for persistent storage
 */

// Storage keys
const STORAGE_KEYS = {
  GOALS: 'goals',
  ACTIVITY_LOG: 'activityLog',
  SETTINGS: 'settings',
  HISTORY: 'history',
  ACTIVE_TIMERS: 'activeTimers',
  STREAK_DATA: 'streakData'
};

/**
 * Get all goals from storage
 * @returns {Promise<Array>} Array of goal objects
 */
async function getGoals() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.GOALS);
    return result[STORAGE_KEYS.GOALS] || [];
  } catch (error) {
    console.error('Error getting goals:', error);
    return [];
  }
}

/**
 * Save goals to storage
 * @param {Array} goals - Array of goal objects to save
 * @returns {Promise<boolean>} Success status
 */
async function saveGoals(goals) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.GOALS]: goals });
    return true;
  } catch (error) {
    console.error('Error saving goals:', error);
    return false;
  }
}

/**
 * Get activity log from storage
 * @returns {Promise<Array>} Array of activity log entries
 */
async function getActivityLog() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ACTIVITY_LOG);
    return result[STORAGE_KEYS.ACTIVITY_LOG] || [];
  } catch (error) {
    console.error('Error getting activity log:', error);
    return [];
  }
}

/**
 * Save activity log to storage
 * @param {Array} log - Array of activity log entries to save
 * @returns {Promise<boolean>} Success status
 */
async function saveActivityLog(log) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVITY_LOG]: log });
    return true;
  } catch (error) {
    console.error('Error saving activity log:', error);
    return false;
  }
}

/**
 * Get settings from storage
 * @returns {Promise<Object>} Settings object
 */
async function getSettings() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return result[STORAGE_KEYS.SETTINGS] || getDefaultSettings();
  } catch (error) {
    console.error('Error getting settings:', error);
    return getDefaultSettings();
  }
}

/**
 * Save settings to storage
 * @param {Object} settings - Settings object to save
 * @returns {Promise<boolean>} Success status
 */
async function saveSettings(settings) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
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
    console.error('Error getting history:', error);
    return [];
  }
}

/**
 * Save history to storage
 * @param {Array} history - Array of history entries to save
 * @returns {Promise<boolean>} Success status
 */
async function saveHistory(history) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history });
    return true;
  } catch (error) {
    console.error('Error saving history:', error);
    return false;
  }
}

/**
 * Get active timers from storage
 * @returns {Promise<Object>} Object mapping goalId to timer state
 */
async function getActiveTimers() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_TIMERS);
    return result[STORAGE_KEYS.ACTIVE_TIMERS] || {};
  } catch (error) {
    console.error('Error getting active timers:', error);
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
    console.error('Error saving active timers:', error);
    return false;
  }
}

/**
 * Add a single activity log entry
 * @param {Object} entry - Activity log entry to add
 * @returns {Promise<boolean>} Success status
 */
async function addActivityLogEntry(entry) {
  try {
    const log = await getActivityLog();
    log.push(entry);
    return await saveActivityLog(log);
  } catch (error) {
    console.error('Error adding activity log entry:', error);
    return false;
  }
}

/**
 * Get a single goal by ID
 * @param {string} goalId - The goal ID to find
 * @returns {Promise<Object|null>} The goal object or null if not found
 */
async function getGoalById(goalId) {
  try {
    const goals = await getGoals();
    return goals.find(goal => goal.id === goalId) || null;
  } catch (error) {
    console.error('Error getting goal by ID:', error);
    return null;
  }
}

/**
 * Update a single goal
 * @param {string} goalId - The goal ID to update
 * @param {Object} updates - Object with properties to update
 * @returns {Promise<boolean>} Success status
 */
async function updateGoal(goalId, updates) {
  try {
    const goals = await getGoals();
    const index = goals.findIndex(goal => goal.id === goalId);
    if (index === -1) {
      console.error('Goal not found:', goalId);
      return false;
    }
    goals[index] = { ...goals[index], ...updates };
    return await saveGoals(goals);
  } catch (error) {
    console.error('Error updating goal:', error);
    return false;
  }
}

/**
 * Delete a goal by ID
 * @param {string} goalId - The goal ID to delete
 * @returns {Promise<boolean>} Success status
 */
async function deleteGoal(goalId) {
  try {
    const goals = await getGoals();
    const filteredGoals = goals.filter(goal => goal.id !== goalId);
    return await saveGoals(filteredGoals);
  } catch (error) {
    console.error('Error deleting goal:', error);
    return false;
  }
}

/**
 * Clear all storage data
 * @returns {Promise<boolean>} Success status
 */
async function clearAllData() {
  try {
    await chrome.storage.local.clear();
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
}

/**
 * Get default settings object
 * @returns {Object} Default settings
 */
function getDefaultSettings() {
  return {
    soundEnabled: true,
    soundVolume: 0.5,
    theme: 'auto', // 'light', 'dark', 'auto'
    notificationsEnabled: true,
    reminderTime: '09:00',
    compactViewEnabled: false // US-056: Compact view mode for Daily Goals
  };
}

/**
 * Get streak data from storage
 * @returns {Promise<Object>} Streak data object with currentStreak, bestStreak, lastCompletionDate
 */
async function getStreakData() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.STREAK_DATA);
    return result[STORAGE_KEYS.STREAK_DATA] || getDefaultStreakData();
  } catch (error) {
    console.error('Error getting streak data:', error);
    return getDefaultStreakData();
  }
}

/**
 * Save streak data to storage
 * @param {Object} streakData - Streak data object to save
 * @returns {Promise<boolean>} Success status
 */
async function saveStreakData(streakData) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.STREAK_DATA]: streakData });
    return true;
  } catch (error) {
    console.error('Error saving streak data:', error);
    return false;
  }
}

/**
 * Get default streak data object
 * @returns {Object} Default streak data
 */
function getDefaultStreakData() {
  return {
    currentStreak: 0,
    bestStreak: 0,
    lastCompletionDate: null
  };
}

// Export functions for use in other modules
export {
  STORAGE_KEYS,
  getGoals,
  saveGoals,
  getActivityLog,
  saveActivityLog,
  getSettings,
  saveSettings,
  getHistory,
  saveHistory,
  getActiveTimers,
  saveActiveTimers,
  addActivityLogEntry,
  getGoalById,
  updateGoal,
  deleteGoal,
  clearAllData,
  getDefaultSettings,
  getStreakData,
  saveStreakData,
  getDefaultStreakData
};
