/**
 * Data Models Module
 * Defines data structures and factory functions for the Daily Goals Tracker
 */

// =============================================================================
// Constants
// =============================================================================

/**
 * Goal types
 * @readonly
 * @enum {string}
 */
const GOAL_TYPES = {
  TIMER: 'timer',
  COUNTER: 'counter',
  CHECKBOX: 'checkbox'
};

/**
 * Timeframe options for goals
 * @readonly
 * @enum {string}
 */
const TIMEFRAMES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
};

/**
 * Activity action types for logging
 * @readonly
 * @enum {string}
 */
const ACTIVITY_ACTIONS = {
  START: 'start',
  PAUSE: 'pause',
  INCREMENT: 'increment',
  DECREMENT: 'decrement',
  TOGGLE: 'toggle',
  RESET: 'reset',
  COMPLETE: 'complete'
};

// =============================================================================
// Utility Functions
// =============================================================================

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

// =============================================================================
// Goal Model
// =============================================================================

/**
 * @typedef {Object} Goal
 * @property {string} id - Unique identifier (UUID)
 * @property {string} title - The goal title/name
 * @property {'timer'|'counter'|'checkbox'} type - The type of goal
 * @property {number} target - Target value (seconds for timer, count for counter, 1 for checkbox)
 * @property {number} progress - Current progress value
 * @property {'daily'|'weekly'|'monthly'|'yearly'} timeframe - When the goal resets
 * @property {string|null} category - Optional category for organization
 * @property {boolean} isActive - Whether the goal is currently active (mainly for timers)
 * @property {number} createdAt - Timestamp when the goal was created
 * @property {number} lastResetAt - Timestamp of the last reset
 * @property {number} order - Display order for sorting goals
 */

/**
 * Create a new Goal object with default values
 * @param {Object} data - Goal data to create from
 * @param {string} data.title - The goal title (required)
 * @param {'timer'|'counter'|'checkbox'} [data.type='timer'] - The type of goal
 * @param {number} [data.target] - Target value (defaults based on type)
 * @param {number} [data.progress=0] - Initial progress value
 * @param {'daily'|'weekly'|'monthly'|'yearly'} [data.timeframe='daily'] - Reset timeframe
 * @param {string|null} [data.category=null] - Optional category
 * @param {boolean} [data.isActive=false] - Whether currently active
 * @param {number} [data.order=0] - Display order
 * @returns {Goal} A new goal object with all required fields
 */
function createGoal(data) {
  if (!data || !data.title) {
    throw new Error('Goal title is required');
  }

  const now = Date.now();
  const type = data.type || GOAL_TYPES.TIMER;

  // Determine default target based on type
  let defaultTarget;
  switch (type) {
    case GOAL_TYPES.TIMER:
      defaultTarget = 3600; // 1 hour in seconds
      break;
    case GOAL_TYPES.COUNTER:
      defaultTarget = 10;
      break;
    case GOAL_TYPES.CHECKBOX:
      defaultTarget = 1;
      break;
    default:
      defaultTarget = 1;
  }

  return {
    id: data.id || generateId(),
    title: data.title.trim(),
    type: type,
    target: data.target !== undefined ? data.target : defaultTarget,
    progress: data.progress !== undefined ? data.progress : 0,
    timeframe: data.timeframe || TIMEFRAMES.DAILY,
    category: data.category || null,
    isActive: data.isActive !== undefined ? data.isActive : false,
    createdAt: data.createdAt || now,
    lastResetAt: data.lastResetAt || now,
    order: data.order !== undefined ? data.order : 0
  };
}

/**
 * Check if a goal is completed (progress >= target)
 * @param {Goal} goal - The goal to check
 * @returns {boolean} True if the goal is completed
 */
function isGoalCompleted(goal) {
  return goal.progress >= goal.target;
}

/**
 * Calculate completion percentage for a goal
 * @param {Goal} goal - The goal to calculate percentage for
 * @returns {number} Completion percentage (0-100)
 */
function getGoalCompletionPercentage(goal) {
  if (goal.target <= 0) return 100;
  const percentage = (goal.progress / goal.target) * 100;
  return Math.min(100, Math.max(0, percentage));
}

/**
 * Reset a goal's progress to zero
 * @param {Goal} goal - The goal to reset
 * @returns {Goal} A new goal object with reset progress
 */
function resetGoalProgress(goal) {
  return {
    ...goal,
    progress: 0,
    isActive: false,
    lastResetAt: Date.now()
  };
}

// =============================================================================
// History Entry Model
// =============================================================================

/**
 * @typedef {Object} HistoryEntry
 * @property {string} id - Unique identifier (UUID)
 * @property {string} goalId - The ID of the goal this history relates to
 * @property {string} date - Date string in YYYY-MM-DD format (the period this entry covers)
 * @property {number} progress - The progress value at the time of archiving
 * @property {number} target - The target value at the time of archiving
 * @property {boolean} completed - Whether the goal was completed (progress >= target)
 * @property {'daily'|'weekly'|'monthly'|'yearly'} timeframe - The goal's timeframe
 * @property {string} title - The goal title at the time of archiving
 * @property {'timer'|'counter'|'checkbox'} type - The goal type
 * @property {number} archivedAt - Timestamp when this entry was archived
 */

/**
 * Create a new HistoryEntry for archiving goal progress
 * @param {Object} data - History entry data
 * @param {string} data.goalId - The goal ID (required)
 * @param {string} data.date - The date string for this history entry (required, YYYY-MM-DD format)
 * @param {number} data.progress - The progress value (required)
 * @param {number} data.target - The target value (required)
 * @param {'daily'|'weekly'|'monthly'|'yearly'} data.timeframe - The goal's timeframe (required)
 * @param {string} data.title - The goal title (required)
 * @param {'timer'|'counter'|'checkbox'} data.type - The goal type (required)
 * @param {string} [data.id] - Optional ID (auto-generated if not provided)
 * @param {boolean} [data.completed] - Optional completed flag (auto-calculated if not provided)
 * @param {number} [data.archivedAt] - Optional archive timestamp (defaults to current time)
 * @returns {HistoryEntry} A new history entry object
 */
function createHistoryEntry(data) {
  if (!data || !data.goalId) {
    throw new Error('History entry requires a goalId');
  }
  if (!data.date) {
    throw new Error('History entry requires a date');
  }
  if (data.progress === undefined) {
    throw new Error('History entry requires progress');
  }
  if (data.target === undefined) {
    throw new Error('History entry requires target');
  }
  if (!data.timeframe) {
    throw new Error('History entry requires timeframe');
  }
  if (!data.title) {
    throw new Error('History entry requires title');
  }
  if (!data.type) {
    throw new Error('History entry requires type');
  }

  return {
    id: data.id || generateId(),
    goalId: data.goalId,
    date: data.date,
    progress: data.progress,
    target: data.target,
    completed: data.completed !== undefined ? data.completed : data.progress >= data.target,
    timeframe: data.timeframe,
    title: data.title,
    type: data.type,
    archivedAt: data.archivedAt || Date.now()
  };
}

/**
 * Create a HistoryEntry from a Goal object
 * Convenience function that extracts relevant fields from a goal
 * @param {Goal} goal - The goal to create a history entry from
 * @param {string} date - The date string for this history entry (YYYY-MM-DD format)
 * @returns {HistoryEntry} A new history entry object
 */
function createHistoryEntryFromGoal(goal, date) {
  if (!goal || !goal.id) {
    throw new Error('Valid goal object is required');
  }
  if (!date) {
    throw new Error('Date is required');
  }

  return createHistoryEntry({
    goalId: goal.id,
    date: date,
    progress: goal.progress,
    target: goal.target,
    timeframe: goal.timeframe,
    title: goal.title,
    type: goal.type
  });
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Today's date string
 */
function getTodayDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Get a date string for N days ago in YYYY-MM-DD format
 * @param {number} daysAgo - Number of days ago (0 = today)
 * @returns {string} Date string in YYYY-MM-DD format
 */
function getDateStringDaysAgo(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

/**
 * Get the start of the current week (Monday) in YYYY-MM-DD format
 * @returns {string} Monday's date string for the current week
 */
function getWeekStartDateString() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  // dayOfWeek: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // We want Monday as the start of the week
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToSubtract);
  return monday.toISOString().split('T')[0];
}

/**
 * Get the start of the current month in YYYY-MM-DD format
 * @returns {string} First day of the current month
 */
function getMonthStartDateString() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  return firstDay.toISOString().split('T')[0];
}

/**
 * Filter history entries by date range
 * @param {HistoryEntry[]} history - Array of history entries
 * @param {string} startDate - Start date (inclusive, YYYY-MM-DD format)
 * @param {string} endDate - End date (inclusive, YYYY-MM-DD format)
 * @returns {HistoryEntry[]} Filtered history entries
 */
function filterHistoryByDateRange(history, startDate, endDate) {
  return history.filter(entry => entry.date >= startDate && entry.date <= endDate);
}

/**
 * Filter history entries by goal ID
 * @param {HistoryEntry[]} history - Array of history entries
 * @param {string} goalId - The goal ID to filter by
 * @returns {HistoryEntry[]} Filtered history entries
 */
function filterHistoryByGoalId(history, goalId) {
  return history.filter(entry => entry.goalId === goalId);
}

/**
 * Group history entries by date
 * @param {HistoryEntry[]} history - Array of history entries
 * @returns {Object} Object with date strings as keys and arrays of entries as values
 */
function groupHistoryByDate(history) {
  return history.reduce((groups, entry) => {
    const date = entry.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {});
}

// =============================================================================
// Activity Log Model
// =============================================================================

/**
 * @typedef {Object} ActivityLog
 * @property {string} id - Unique identifier (UUID)
 * @property {string} goalId - The ID of the goal this activity relates to
 * @property {number} timestamp - Unix timestamp when the action occurred
 * @property {'start'|'pause'|'increment'|'decrement'|'toggle'|'reset'|'complete'} action - The type of action performed
 * @property {number|null} value - Optional value associated with the action (e.g., elapsed time for pause, count for increment)
 */

/**
 * Create a new ActivityLog entry
 * @param {Object} data - Activity log data
 * @param {string} data.goalId - The ID of the goal (required)
 * @param {'start'|'pause'|'increment'|'decrement'|'toggle'|'reset'|'complete'} data.action - The action type (required)
 * @param {number|null} [data.value=null] - Optional value associated with the action
 * @param {number} [data.timestamp] - Optional timestamp (defaults to current time)
 * @param {string} [data.id] - Optional ID (auto-generated if not provided)
 * @returns {ActivityLog} A new activity log entry
 */
function createActivityLog(data) {
  if (!data || !data.goalId) {
    throw new Error('Activity log requires a goalId');
  }

  if (!data.action) {
    throw new Error('Activity log requires an action');
  }

  // Validate action type
  const validActions = Object.values(ACTIVITY_ACTIONS);
  if (!validActions.includes(data.action)) {
    throw new Error(`Invalid action type: ${data.action}. Must be one of: ${validActions.join(', ')}`);
  }

  return {
    id: data.id || generateId(),
    goalId: data.goalId,
    timestamp: data.timestamp || Date.now(),
    action: data.action,
    value: data.value !== undefined ? data.value : null
  };
}

// =============================================================================
// Exports
// =============================================================================

export {
  // Constants
  GOAL_TYPES,
  TIMEFRAMES,
  ACTIVITY_ACTIONS,
  // Utility functions
  generateId,
  getTodayDateString,
  getDateStringDaysAgo,
  getWeekStartDateString,
  getMonthStartDateString,
  // Goal functions
  createGoal,
  isGoalCompleted,
  getGoalCompletionPercentage,
  resetGoalProgress,
  // History Entry functions
  createHistoryEntry,
  createHistoryEntryFromGoal,
  filterHistoryByDateRange,
  filterHistoryByGoalId,
  groupHistoryByDate,
  // Activity Log functions
  createActivityLog
};
