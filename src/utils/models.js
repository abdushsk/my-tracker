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
  CHECKBOX: 'checkbox',
  AVOIDANCE: 'avoidance'  // US-087: Negative/avoidance goals - things to avoid
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
  COMPLETE: 'complete',
  SLIP_UP: 'slip_up'  // US-087: When user breaks an avoidance streak
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
 * Chain status for linked goals (US-084)
 * @readonly
 * @enum {string}
 */
const CHAIN_STATUS = {
  UNLOCKED: 'unlocked',
  LOCKED: 'locked'
};

/**
 * @typedef {Object} Goal
 * @property {string} id - Unique identifier (UUID)
 * @property {string} title - The goal title/name
 * @property {'timer'|'counter'|'checkbox'|'avoidance'} type - The type of goal
 * @property {number} target - Target value (seconds for timer, count for counter, 1 for checkbox/avoidance)
 * @property {number} progress - Current progress value (for avoidance: current streak in days)
 * @property {'daily'|'weekly'|'monthly'|'yearly'} timeframe - When the goal resets
 * @property {string|null} category - Optional category for organization
 * @property {boolean} isActive - Whether the goal is currently active (mainly for timers)
 * @property {number} createdAt - Timestamp when the goal was created
 * @property {number} lastResetAt - Timestamp of the last reset
 * @property {number} order - Display order for sorting goals
 * @property {string|null} chainParentId - US-084: ID of the goal that must be completed to unlock this goal
 * @property {'unlocked'|'locked'} chainStatus - US-084: Whether this goal is unlocked or locked (based on chain parent completion)
 * @property {boolean} forgivenessEnabled - US-087: Allow 1 slip-up per week without breaking streak
 * @property {number} slipUpsThisWeek - US-087: Number of slip-ups this week (resets weekly)
 * @property {number} longestAvoidanceStreak - US-087: Personal record for longest streak
 * @property {number|null} lastStreakIncrementDate - US-087: Date string of last daily increment (YYYY-MM-DD)
 */

/**
 * Create a new Goal object with default values
 * @param {Object} data - Goal data to create from
 * @param {string} data.title - The goal title (required)
 * @param {'timer'|'counter'|'checkbox'|'avoidance'} [data.type='timer'] - The type of goal
 * @param {number} [data.target] - Target value (defaults based on type)
 * @param {number} [data.progress=0] - Initial progress value
 * @param {'daily'|'weekly'|'monthly'|'yearly'} [data.timeframe='daily'] - Reset timeframe
 * @param {string|null} [data.category=null] - Optional category
 * @param {boolean} [data.isActive=false] - Whether currently active
 * @param {number} [data.order=0] - Display order
 * @param {boolean} [data.forgivenessEnabled=false] - US-087: Allow 1 slip-up per week
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
    case GOAL_TYPES.AVOIDANCE:
      defaultTarget = 1; // For avoidance, target is 1 (we track streak days in progress)
      break;
    default:
      defaultTarget = 1;
  }

  // US-087: For avoidance goals, the timeframe should always be 'daily'
  // since the streak increments daily automatically
  const effectiveTimeframe = type === GOAL_TYPES.AVOIDANCE
    ? TIMEFRAMES.DAILY
    : (data.timeframe || TIMEFRAMES.DAILY);

  const goal = {
    id: data.id || generateId(),
    title: data.title.trim(),
    type: type,
    target: data.target !== undefined ? data.target : defaultTarget,
    progress: data.progress !== undefined ? data.progress : 0,
    timeframe: effectiveTimeframe,
    category: data.category || null,
    color: data.color || null, // US-073: Custom goal color (hex string or null)
    notes: data.notes || null, // US-074: Optional notes/description (max 500 chars)
    customResetTime: data.customResetTime || null, // US-075: Per-goal custom reset time override (HH:MM format or null for global default)
    chainParentId: data.chainParentId || null, // US-084: ID of goal that must be completed to unlock this goal
    chainStatus: data.chainParentId ? CHAIN_STATUS.LOCKED : CHAIN_STATUS.UNLOCKED, // US-084: Locked by default if has parent
    isActive: data.isActive !== undefined ? data.isActive : false,
    createdAt: data.createdAt || now,
    lastResetAt: data.lastResetAt || now,
    order: data.order !== undefined ? data.order : 0
  };

  // US-087: Add avoidance-specific properties
  if (type === GOAL_TYPES.AVOIDANCE) {
    goal.forgivenessEnabled = data.forgivenessEnabled !== undefined ? data.forgivenessEnabled : false;
    goal.slipUpsThisWeek = data.slipUpsThisWeek !== undefined ? data.slipUpsThisWeek : 0;
    goal.longestAvoidanceStreak = data.longestAvoidanceStreak !== undefined ? data.longestAvoidanceStreak : 0;
    goal.lastStreakIncrementDate = data.lastStreakIncrementDate || null;
  }

  return goal;
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
// US-084: Habit Chain Functions
// =============================================================================

/**
 * Check if a goal is part of a chain (has a parent or has children)
 * @param {Goal} goal - The goal to check
 * @param {Goal[]} allGoals - All goals array
 * @returns {boolean} True if the goal is part of a chain
 */
function isGoalInChain(goal, allGoals) {
  // Has a parent
  if (goal.chainParentId) return true;
  // Has children (other goals depend on this one)
  return allGoals.some(g => g.chainParentId === goal.id);
}

/**
 * Get the parent goal of a chain link
 * @param {Goal} goal - The child goal
 * @param {Goal[]} allGoals - All goals array
 * @returns {Goal|null} The parent goal or null if no parent
 */
function getChainParent(goal, allGoals) {
  if (!goal.chainParentId) return null;
  return allGoals.find(g => g.id === goal.chainParentId) || null;
}

/**
 * Get all child goals that depend on a given goal
 * @param {Goal} goal - The parent goal
 * @param {Goal[]} allGoals - All goals array
 * @returns {Goal[]} Array of child goals
 */
function getChainChildren(goal, allGoals) {
  return allGoals.filter(g => g.chainParentId === goal.id);
}

/**
 * Get the entire chain for a goal (all linked goals in order)
 * @param {Goal} goal - Any goal in the chain
 * @param {Goal[]} allGoals - All goals array
 * @returns {Goal[]} Array of goals in the chain, ordered from root to leaves
 */
function getFullChain(goal, allGoals) {
  // First, find the root of the chain
  let root = goal;
  while (root.chainParentId) {
    const parent = allGoals.find(g => g.id === root.chainParentId);
    if (!parent) break;
    root = parent;
  }

  // Build the chain from root
  const chain = [root];
  const visited = new Set([root.id]);

  // BFS to get all children in order
  let queue = [root];
  while (queue.length > 0) {
    const current = queue.shift();
    const children = allGoals.filter(g => g.chainParentId === current.id && !visited.has(g.id));
    for (const child of children) {
      chain.push(child);
      visited.add(child.id);
      queue.push(child);
    }
  }

  return chain;
}

/**
 * Check if a goal is locked (chain parent not completed)
 * @param {Goal} goal - The goal to check
 * @param {Goal[]} allGoals - All goals array
 * @returns {boolean} True if the goal is locked
 */
function isGoalLocked(goal, allGoals) {
  if (!goal.chainParentId) return false;
  if (goal.chainStatus === CHAIN_STATUS.UNLOCKED) return false;

  const parent = allGoals.find(g => g.id === goal.chainParentId);
  if (!parent) return false; // Parent not found, treat as unlocked

  return !isGoalCompleted(parent);
}

/**
 * Get goals that should be unlocked when a goal is completed
 * @param {Goal} completedGoal - The goal that was just completed
 * @param {Goal[]} allGoals - All goals array
 * @returns {Goal[]} Array of goals to unlock
 */
function getGoalsToUnlock(completedGoal, allGoals) {
  return allGoals.filter(g =>
    g.chainParentId === completedGoal.id &&
    g.chainStatus === CHAIN_STATUS.LOCKED
  );
}

/**
 * Check if an entire chain is completed
 * @param {Goal} anyGoalInChain - Any goal in the chain
 * @param {Goal[]} allGoals - All goals array
 * @returns {boolean} True if all goals in the chain are completed
 */
function isChainCompleted(anyGoalInChain, allGoals) {
  const chain = getFullChain(anyGoalInChain, allGoals);
  return chain.every(g => isGoalCompleted(g));
}

/**
 * Get chain completion progress (how many goals completed / total in chain)
 * @param {Goal} anyGoalInChain - Any goal in the chain
 * @param {Goal[]} allGoals - All goals array
 * @returns {{ completed: number, total: number, percentage: number }}
 */
function getChainProgress(anyGoalInChain, allGoals) {
  const chain = getFullChain(anyGoalInChain, allGoals);
  const completed = chain.filter(g => isGoalCompleted(g)).length;
  const total = chain.length;
  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  };
}

/**
 * Check if a goal can be set as a chain parent (prevent circular chains)
 * @param {Goal} potentialChild - The goal that wants to set a parent
 * @param {Goal} potentialParent - The goal being considered as parent
 * @param {Goal[]} allGoals - All goals array
 * @returns {boolean} True if it's safe to create this chain link
 */
function canSetChainParent(potentialChild, potentialParent, allGoals) {
  // Can't chain to self
  if (potentialChild.id === potentialParent.id) return false;

  // Check if setting this parent would create a cycle
  // Walk up from potentialParent and check if we hit potentialChild
  let current = potentialParent;
  const visited = new Set();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.chainParentId === potentialChild.id) {
      return false; // Would create a cycle
    }
    current = allGoals.find(g => g.id === current.chainParentId);
  }

  // Also check descendants of potentialChild - parent can't be one of its descendants
  const descendants = [];
  const queue = [potentialChild];
  while (queue.length > 0) {
    const curr = queue.shift();
    const children = allGoals.filter(g => g.chainParentId === curr.id);
    for (const child of children) {
      if (child.id === potentialParent.id) return false; // Would create cycle
      descendants.push(child);
      queue.push(child);
    }
  }

  return true;
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
 * Format a date object to YYYY-MM-DD string using local timezone
 * @param {Date} date - Date object to format
 * @returns {string} Date string in YYYY-MM-DD format (local time)
 */
function formatDateToLocalString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 * @returns {string} Today's date string
 */
function getTodayDateString() {
  return formatDateToLocalString(new Date());
}

/**
 * Get a date string for N days ago in YYYY-MM-DD format (local timezone)
 * @param {number} daysAgo - Number of days ago (0 = today)
 * @returns {string} Date string in YYYY-MM-DD format
 */
function getDateStringDaysAgo(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return formatDateToLocalString(date);
}

/**
 * Get the start of the current week (Monday) in YYYY-MM-DD format (local timezone)
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
  return formatDateToLocalString(monday);
}

/**
 * Get the start of the current month in YYYY-MM-DD format (local timezone)
 * @returns {string} First day of the current month
 */
function getMonthStartDateString() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  return formatDateToLocalString(firstDay);
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
// Activity Timeline Functions
// =============================================================================

/**
 * @typedef {Object} HourlyActivityData
 * @property {number} hour - The hour (0-23)
 * @property {number} count - Number of activities in this hour
 * @property {number} duration - Total duration in seconds (for timer goals)
 * @property {ActivityLog[]} activities - Array of activity log entries for this hour
 */

/**
 * Get a date string (YYYY-MM-DD) from a timestamp (local timezone)
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Date string in YYYY-MM-DD format
 */
function getDateFromTimestamp(timestamp) {
  const date = new Date(timestamp);
  return formatDateToLocalString(date);
}

/**
 * Get the hour (0-23) from a timestamp
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {number} Hour of the day (0-23)
 */
function getHourFromTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.getHours();
}

/**
 * Filter activity logs by goal ID and date
 * @param {ActivityLog[]} activityLog - Array of activity log entries
 * @param {string|null} goalId - Goal ID to filter by (null for all goals)
 * @param {string} date - Date string in YYYY-MM-DD format
 * @returns {ActivityLog[]} Filtered activity log entries
 */
function filterActivityByGoalAndDate(activityLog, goalId, date) {
  return activityLog.filter(entry => {
    const entryDate = getDateFromTimestamp(entry.timestamp);
    const dateMatches = entryDate === date;
    const goalMatches = goalId === null || entry.goalId === goalId;
    return dateMatches && goalMatches;
  });
}

/**
 * Filter activity logs by goal ID and date range
 * @param {ActivityLog[]} activityLog - Array of activity log entries
 * @param {string|null} goalId - Goal ID to filter by (null for all goals)
 * @param {string} startDate - Start date (inclusive, YYYY-MM-DD format)
 * @param {string} endDate - End date (inclusive, YYYY-MM-DD format)
 * @returns {ActivityLog[]} Filtered activity log entries
 */
function filterActivityByGoalAndDateRange(activityLog, goalId, startDate, endDate) {
  return activityLog.filter(entry => {
    const entryDate = getDateFromTimestamp(entry.timestamp);
    const dateInRange = entryDate >= startDate && entryDate <= endDate;
    const goalMatches = goalId === null || entry.goalId === goalId;
    return dateInRange && goalMatches;
  });
}

/**
 * Get activity data grouped by hour for a specific goal and date
 * Returns an array of 24 values for hours 0-23
 * @param {ActivityLog[]} activityLog - Array of activity log entries
 * @param {string|null} goalId - Goal ID to filter by (null for all goals)
 * @param {string} date - Date string in YYYY-MM-DD format
 * @returns {HourlyActivityData[]} Array of 24 hourly activity data objects
 */
function getActivityByHour(activityLog, goalId, date) {
  // Initialize array with 24 empty hour entries
  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0,
    duration: 0,
    activities: []
  }));

  // Filter activities by goal and date
  const filteredActivities = filterActivityByGoalAndDate(activityLog, goalId, date);

  // Group activities by hour
  filteredActivities.forEach(activity => {
    const hour = getHourFromTimestamp(activity.timestamp);
    hourlyData[hour].activities.push(activity);
    hourlyData[hour].count++;

    // Add duration for pause actions (timer goals store elapsed time in value)
    if (activity.action === ACTIVITY_ACTIONS.PAUSE && activity.value !== null) {
      hourlyData[hour].duration += activity.value;
    }
  });

  return hourlyData;
}

/**
 * Get activity data grouped by hour for a specific goal over a date range
 * Returns an object keyed by date with arrays of 24 hourly values
 * @param {ActivityLog[]} activityLog - Array of activity log entries
 * @param {string|null} goalId - Goal ID to filter by (null for all goals)
 * @param {string} startDate - Start date (inclusive, YYYY-MM-DD format)
 * @param {string} endDate - End date (inclusive, YYYY-MM-DD format)
 * @returns {Object<string, HourlyActivityData[]>} Object with date strings as keys and hourly data arrays as values
 */
function getActivityByHourForDateRange(activityLog, goalId, startDate, endDate) {
  const result = {};

  // Generate all dates in the range using local timezone
  // Parse dates by adding T12:00:00 to avoid timezone edge cases when parsing
  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDateToLocalString(d);
    result[dateStr] = getActivityByHour(activityLog, goalId, dateStr);
  }

  return result;
}

/**
 * Get aggregated activity counts by hour across a date range
 * Useful for finding "most productive hours"
 * @param {ActivityLog[]} activityLog - Array of activity log entries
 * @param {string|null} goalId - Goal ID to filter by (null for all goals)
 * @param {string} startDate - Start date (inclusive, YYYY-MM-DD format)
 * @param {string} endDate - End date (inclusive, YYYY-MM-DD format)
 * @returns {HourlyActivityData[]} Array of 24 hourly activity data objects with aggregated counts
 */
function getAggregatedActivityByHour(activityLog, goalId, startDate, endDate) {
  // Initialize array with 24 empty hour entries
  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0,
    duration: 0,
    activities: []
  }));

  // Filter activities by goal and date range
  const filteredActivities = filterActivityByGoalAndDateRange(activityLog, goalId, startDate, endDate);

  // Aggregate activities by hour across all dates
  filteredActivities.forEach(activity => {
    const hour = getHourFromTimestamp(activity.timestamp);
    hourlyData[hour].activities.push(activity);
    hourlyData[hour].count++;

    // Add duration for pause actions (timer goals store elapsed time in value)
    if (activity.action === ACTIVITY_ACTIONS.PAUSE && activity.value !== null) {
      hourlyData[hour].duration += activity.value;
    }
  });

  return hourlyData;
}

/**
 * Find the most productive hours based on activity count or duration
 * @param {HourlyActivityData[]} hourlyData - Array of 24 hourly activity data objects
 * @param {number} topN - Number of top hours to return (default 3)
 * @param {'count'|'duration'} sortBy - Sort by count or duration (default 'count')
 * @returns {HourlyActivityData[]} Top N most productive hours
 */
function getMostProductiveHours(hourlyData, topN = 3, sortBy = 'count') {
  return [...hourlyData]
    .sort((a, b) => b[sortBy] - a[sortBy])
    .slice(0, topN);
}

// =============================================================================
// US-080: Achievement Model
// =============================================================================

/**
 * Achievement categories
 * @readonly
 * @enum {string}
 */
const ACHIEVEMENT_CATEGORIES = {
  STREAKS: 'streaks',
  COMPLETIONS: 'completions',
  MILESTONES: 'milestones',
  SPECIAL: 'special'
};

/**
 * Achievement definitions
 * At least 20 different achievements as per US-080 requirements
 * @type {Array<Object>}
 */
const ACHIEVEMENT_DEFINITIONS = [
  // Milestones category
  {
    id: 'first-step',
    title: 'First Step',
    description: 'Complete your first goal',
    icon: '👣',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    condition: { type: 'total_completions', target: 1 }
  },
  {
    id: 'first-goal-created',
    title: 'Goal Setter',
    description: 'Create your first goal',
    icon: '🎯',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    condition: { type: 'total_goals_created', target: 1 }
  },
  {
    id: 'five-goals',
    title: 'Getting Organized',
    description: 'Create 5 goals',
    icon: '📋',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    condition: { type: 'total_goals_created', target: 5 }
  },
  {
    id: 'ten-goals',
    title: 'Planner',
    description: 'Create 10 goals',
    icon: '📝',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    condition: { type: 'total_goals_created', target: 10 }
  },

  // Streaks category
  {
    id: 'streak-3',
    title: 'Getting Started',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    category: ACHIEVEMENT_CATEGORIES.STREAKS,
    condition: { type: 'streak', target: 3 }
  },
  {
    id: 'streak-7',
    title: 'Consistent',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    category: ACHIEVEMENT_CATEGORIES.STREAKS,
    condition: { type: 'streak', target: 7 }
  },
  {
    id: 'streak-14',
    title: 'Committed',
    description: 'Maintain a 14-day streak',
    icon: '💪',
    category: ACHIEVEMENT_CATEGORIES.STREAKS,
    condition: { type: 'streak', target: 14 }
  },
  {
    id: 'streak-30',
    title: 'Dedicated',
    description: 'Maintain a 30-day streak',
    icon: '⚡',
    category: ACHIEVEMENT_CATEGORIES.STREAKS,
    condition: { type: 'streak', target: 30 }
  },
  {
    id: 'streak-60',
    title: 'Determined',
    description: 'Maintain a 60-day streak',
    icon: '🌟',
    category: ACHIEVEMENT_CATEGORIES.STREAKS,
    condition: { type: 'streak', target: 60 }
  },
  {
    id: 'streak-100',
    title: 'Unstoppable',
    description: 'Maintain a 100-day streak',
    icon: '🏆',
    category: ACHIEVEMENT_CATEGORIES.STREAKS,
    condition: { type: 'streak', target: 100 }
  },

  // Completions category
  {
    id: 'completions-10',
    title: 'Making Progress',
    description: 'Complete 10 goals total',
    icon: '✅',
    category: ACHIEVEMENT_CATEGORIES.COMPLETIONS,
    condition: { type: 'total_completions', target: 10 }
  },
  {
    id: 'completions-50',
    title: 'Achiever',
    description: 'Complete 50 goals total',
    icon: '🎖️',
    category: ACHIEVEMENT_CATEGORIES.COMPLETIONS,
    condition: { type: 'total_completions', target: 50 }
  },
  {
    id: 'completions-100',
    title: 'Centurion',
    description: 'Complete 100 goals total',
    icon: '💯',
    category: ACHIEVEMENT_CATEGORIES.COMPLETIONS,
    condition: { type: 'total_completions', target: 100 }
  },
  {
    id: 'completions-500',
    title: 'Goal Master',
    description: 'Complete 500 goals total',
    icon: '👑',
    category: ACHIEVEMENT_CATEGORIES.COMPLETIONS,
    condition: { type: 'total_completions', target: 500 }
  },
  {
    id: 'perfectionist',
    title: 'Perfectionist',
    description: 'Complete all goals in a single day',
    icon: '💎',
    category: ACHIEVEMENT_CATEGORIES.COMPLETIONS,
    condition: { type: 'all_goals_completed_day', target: 1 }
  },
  {
    id: 'perfect-week',
    title: 'Perfect Week',
    description: 'Complete all goals every day for a week',
    icon: '🌈',
    category: ACHIEVEMENT_CATEGORIES.COMPLETIONS,
    condition: { type: 'perfect_days', target: 7 }
  },

  // Special category
  {
    id: 'early-bird',
    title: 'Early Bird',
    description: 'Complete a goal before 8 AM',
    icon: '🌅',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    condition: { type: 'complete_before_hour', target: 8 }
  },
  {
    id: 'night-owl',
    title: 'Night Owl',
    description: 'Complete a goal after 10 PM',
    icon: '🦉',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    condition: { type: 'complete_after_hour', target: 22 }
  },
  {
    id: 'marathon',
    title: 'Marathon',
    description: 'Log 10 hours on a single timer goal',
    icon: '⏱️',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    condition: { type: 'timer_hours', target: 10 }
  },
  {
    id: 'counter-100',
    title: 'Counter Champion',
    description: 'Reach 100 on a counter goal',
    icon: '🔢',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    condition: { type: 'counter_target', target: 100 }
  },
  {
    id: 'variety',
    title: 'Variety',
    description: 'Complete all three goal types in one day',
    icon: '🎨',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    condition: { type: 'all_types_completed_day', target: 1 }
  },
  {
    id: 'category-explorer',
    title: 'Category Explorer',
    description: 'Complete goals in 4 different categories',
    icon: '🗂️',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    condition: { type: 'categories_used', target: 4 }
  }
];

/**
 * @typedef {Object} AchievementProgress
 * @property {string} id - Achievement ID
 * @property {number} progress - Current progress towards achievement
 * @property {number|null} unlockedAt - Timestamp when unlocked, null if not unlocked
 */

/**
 * Create default achievement progress for all defined achievements
 * @returns {Array<AchievementProgress>} Array of achievement progress objects
 */
function createDefaultAchievementProgress() {
  return ACHIEVEMENT_DEFINITIONS.map(achievement => ({
    id: achievement.id,
    progress: 0,
    unlockedAt: null
  }));
}

/**
 * Get achievement definition by ID
 * @param {string} achievementId - The achievement ID
 * @returns {Object|null} Achievement definition or null if not found
 */
function getAchievementDefinition(achievementId) {
  return ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId) || null;
}

/**
 * Check if an achievement is unlocked
 * @param {AchievementProgress} achievementProgress - The achievement progress object
 * @returns {boolean} True if unlocked
 */
function isAchievementUnlocked(achievementProgress) {
  return achievementProgress.unlockedAt !== null;
}

/**
 * Get achievement progress percentage
 * @param {string} achievementId - The achievement ID
 * @param {number} currentProgress - Current progress value
 * @returns {number} Progress percentage (0-100)
 */
function getAchievementProgressPercentage(achievementId, currentProgress) {
  const definition = getAchievementDefinition(achievementId);
  if (!definition || !definition.condition || !definition.condition.target) {
    return 0;
  }
  const percentage = (currentProgress / definition.condition.target) * 100;
  return Math.min(100, Math.max(0, percentage));
}

// =============================================================================
// US-083: Level and XP System Model
// =============================================================================

/**
 * XP configuration constants
 * @type {Object}
 */
const XP_CONFIG = {
  // Base XP rewards
  GOAL_COMPLETION: 10,        // Base XP for completing any goal
  TIMER_COMPLETION_BONUS: 5,  // Additional XP for timer goals (focus-intensive)
  COUNTER_COMPLETION_BONUS: 3, // Additional XP for counter goals

  // Bonus XP
  PERFECT_DAY: 25,            // Bonus XP for completing ALL goals in a day
  STREAK_BONUS_PER_DAY: 2,    // Additional XP per day of current streak
  ACHIEVEMENT_UNLOCK: 15,     // XP for unlocking any achievement
  CHALLENGE_EASY: 5,          // XP for completing easy daily challenge
  CHALLENGE_MEDIUM: 10,       // XP for completing medium daily challenge
  CHALLENGE_HARD: 15,         // XP for completing hard daily challenge
  FIRST_GOAL_BONUS: 50,       // One-time bonus for first goal completion
  AVOIDANCE_BONUS: 5,         // US-087: Bonus XP for avoidance goals (discipline-intensive)
  AVOIDANCE_STREAK_MILESTONE: 10, // US-087: Bonus XP for avoidance streak milestones (7, 30, 100 days)

  // Level calculation
  BASE_XP_PER_LEVEL: 100,     // XP needed for level 2
  XP_MULTIPLIER: 1.15,        // Each level needs 15% more XP than previous
  MAX_LEVEL: 50               // Maximum level cap
};

/**
 * XP source types for history tracking
 * @readonly
 * @enum {string}
 */
const XP_SOURCES = {
  GOAL_COMPLETION: 'goal_completion',
  TIMER_BONUS: 'timer_bonus',
  COUNTER_BONUS: 'counter_bonus',
  PERFECT_DAY: 'perfect_day',
  STREAK_BONUS: 'streak_bonus',
  ACHIEVEMENT: 'achievement',
  CHALLENGE: 'challenge',
  FIRST_GOAL: 'first_goal',
  AVOIDANCE_BONUS: 'avoidance_bonus',  // US-087
  AVOIDANCE_STREAK_MILESTONE: 'avoidance_streak_milestone'  // US-087
};

/**
 * @typedef {Object} XPHistoryEntry
 * @property {string} id - Unique identifier
 * @property {string} source - XP source type (from XP_SOURCES)
 * @property {number} amount - XP amount earned
 * @property {number} timestamp - When XP was earned
 * @property {string|null} description - Human-readable description
 * @property {Object|null} context - Additional context (goalId, achievementId, etc.)
 */

/**
 * @typedef {Object} XPData
 * @property {number} totalXP - Total XP earned lifetime
 * @property {number} currentLevel - Current level (1-50)
 * @property {Array<{level: number, timestamp: number, trigger: string}>} levelUpHistory - History of level-ups
 * @property {Array<XPHistoryEntry>} xpHistory - Recent XP earning history (last 50 entries)
 * @property {number} lastUpdated - Timestamp of last XP change
 * @property {boolean} firstGoalBonusAwarded - Whether first goal bonus was given
 */

/**
 * Get default XP data structure
 * @returns {XPData} Default XP data
 */
function getDefaultXPData() {
  return {
    totalXP: 0,
    currentLevel: 1,
    levelUpHistory: [],
    xpHistory: [],
    lastUpdated: Date.now(),
    firstGoalBonusAwarded: false
  };
}

/**
 * Calculate XP required to reach a specific level
 * Uses progressive formula: Level N requires BASE * MULTIPLIER^(N-2) XP from previous level
 * @param {number} level - Target level (1-50)
 * @returns {number} Total XP required to reach that level
 */
function getXPForLevel(level) {
  if (level <= 1) return 0;
  if (level > XP_CONFIG.MAX_LEVEL) level = XP_CONFIG.MAX_LEVEL;

  let totalXP = 0;
  for (let i = 2; i <= level; i++) {
    const xpForThisLevel = Math.floor(
      XP_CONFIG.BASE_XP_PER_LEVEL * Math.pow(XP_CONFIG.XP_MULTIPLIER, i - 2)
    );
    totalXP += xpForThisLevel;
  }
  return totalXP;
}

/**
 * Calculate current level from total XP
 * @param {number} totalXP - Total XP earned
 * @returns {number} Current level
 */
function getLevelFromXP(totalXP) {
  let level = 1;
  while (level < XP_CONFIG.MAX_LEVEL && getXPForLevel(level + 1) <= totalXP) {
    level++;
  }
  return level;
}

/**
 * Get XP progress within current level
 * @param {number} totalXP - Total XP earned
 * @returns {{currentLevelXP: number, xpForNextLevel: number, percentage: number}} Progress info
 */
function getLevelProgress(totalXP) {
  const currentLevel = getLevelFromXP(totalXP);

  if (currentLevel >= XP_CONFIG.MAX_LEVEL) {
    return {
      currentLevelXP: totalXP - getXPForLevel(XP_CONFIG.MAX_LEVEL),
      xpForNextLevel: 0,
      percentage: 100
    };
  }

  const xpForCurrentLevel = getXPForLevel(currentLevel);
  const xpForNextLevel = getXPForLevel(currentLevel + 1);
  const xpWithinLevel = totalXP - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;

  return {
    currentLevelXP: xpWithinLevel,
    xpForNextLevel: xpNeededForLevel,
    percentage: Math.floor((xpWithinLevel / xpNeededForLevel) * 100)
  };
}

/**
 * Calculate XP to award for a goal completion
 * @param {Object} goal - The completed goal
 * @param {number} currentStreak - Current streak days
 * @param {boolean} isFirstGoal - Whether this is the user's first ever goal completion
 * @returns {{baseXP: number, bonuses: Array<{type: string, amount: number, description: string}>, totalXP: number}}
 */
function calculateGoalCompletionXP(goal, currentStreak = 0, isFirstGoal = false) {
  const bonuses = [];
  let baseXP = XP_CONFIG.GOAL_COMPLETION;

  // Type-specific bonuses
  if (goal.type === 'timer') {
    bonuses.push({
      type: XP_SOURCES.TIMER_BONUS,
      amount: XP_CONFIG.TIMER_COMPLETION_BONUS,
      description: 'Timer goal bonus'
    });
  } else if (goal.type === 'counter') {
    bonuses.push({
      type: XP_SOURCES.COUNTER_BONUS,
      amount: XP_CONFIG.COUNTER_BONUS,
      description: 'Counter goal bonus'
    });
  } else if (goal.type === 'avoidance') {
    // US-087: Avoidance goals get a discipline bonus
    bonuses.push({
      type: XP_SOURCES.AVOIDANCE_BONUS,
      amount: XP_CONFIG.AVOIDANCE_BONUS,
      description: 'Avoidance discipline bonus'
    });

    // US-087: Check for avoidance streak milestones (7, 30, 100 days)
    const avoidanceStreak = goal.progress || 0;
    const milestones = [7, 30, 100, 365];
    for (const milestone of milestones) {
      if (avoidanceStreak === milestone) {
        bonuses.push({
          type: XP_SOURCES.AVOIDANCE_STREAK_MILESTONE,
          amount: XP_CONFIG.AVOIDANCE_STREAK_MILESTONE,
          description: `${milestone} day avoidance milestone!`
        });
        break;
      }
    }
  }

  // Streak bonus
  if (currentStreak > 0) {
    const streakBonus = currentStreak * XP_CONFIG.STREAK_BONUS_PER_DAY;
    bonuses.push({
      type: XP_SOURCES.STREAK_BONUS,
      amount: streakBonus,
      description: `${currentStreak} day streak bonus`
    });
  }

  // First goal bonus
  if (isFirstGoal) {
    bonuses.push({
      type: XP_SOURCES.FIRST_GOAL,
      amount: XP_CONFIG.FIRST_GOAL_BONUS,
      description: 'First goal bonus!'
    });
  }

  const totalBonusXP = bonuses.reduce((sum, b) => sum + b.amount, 0);

  return {
    baseXP,
    bonuses,
    totalXP: baseXP + totalBonusXP
  };
}

/**
 * Calculate XP for a perfect day (all goals completed)
 * @returns {number} XP for perfect day
 */
function getPerfectDayXP() {
  return XP_CONFIG.PERFECT_DAY;
}

/**
 * Calculate XP for achievement unlock
 * @returns {number} XP for achievement
 */
function getAchievementXP() {
  return XP_CONFIG.ACHIEVEMENT_UNLOCK;
}

/**
 * Calculate XP for completing a daily challenge
 * @param {string} difficulty - Challenge difficulty (easy, medium, hard)
 * @returns {number} XP for challenge
 */
function getChallengeXP(difficulty) {
  switch (difficulty) {
    case 'easy': return XP_CONFIG.CHALLENGE_EASY;
    case 'medium': return XP_CONFIG.CHALLENGE_MEDIUM;
    case 'hard': return XP_CONFIG.CHALLENGE_HARD;
    default: return XP_CONFIG.CHALLENGE_EASY;
  }
}

/**
 * Create an XP history entry
 * @param {string} source - XP source type
 * @param {number} amount - XP amount
 * @param {string} description - Description
 * @param {Object|null} context - Additional context
 * @returns {XPHistoryEntry} XP history entry
 */
function createXPHistoryEntry(source, amount, description, context = null) {
  return {
    id: generateId(),
    source,
    amount,
    timestamp: Date.now(),
    description,
    context
  };
}

/**
 * Get level title/badge name based on level
 * @param {number} level - Current level
 * @returns {{title: string, icon: string}} Level title and icon
 */
function getLevelTitle(level) {
  if (level >= 50) return { title: 'Legend', icon: '👑' };
  if (level >= 45) return { title: 'Master', icon: '🏆' };
  if (level >= 40) return { title: 'Expert', icon: '💎' };
  if (level >= 35) return { title: 'Champion', icon: '🌟' };
  if (level >= 30) return { title: 'Pro', icon: '⭐' };
  if (level >= 25) return { title: 'Veteran', icon: '🎯' };
  if (level >= 20) return { title: 'Skilled', icon: '💪' };
  if (level >= 15) return { title: 'Dedicated', icon: '🔥' };
  if (level >= 10) return { title: 'Committed', icon: '✨' };
  if (level >= 5) return { title: 'Apprentice', icon: '🌱' };
  return { title: 'Beginner', icon: '🎈' };
}

// =============================================================================
// US-081: Daily Challenges Model
// =============================================================================

/**
 * Challenge difficulty levels
 * @readonly
 * @enum {string}
 */
const CHALLENGE_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
};

/**
 * Daily Challenge definitions pool
 * Contains 20+ different challenges of varying difficulty
 * @type {Array<Object>}
 */
const DAILY_CHALLENGE_DEFINITIONS = [
  // Easy challenges
  {
    id: 'challenge-complete-one',
    title: 'Quick Win',
    description: 'Complete at least 1 goal today',
    icon: '🎯',
    difficulty: CHALLENGE_DIFFICULTY.EASY,
    condition: { type: 'goals_completed', target: 1 },
    reward: 'Warm-up complete!'
  },
  {
    id: 'challenge-complete-three',
    title: 'Triple Threat',
    description: 'Complete 3 goals today',
    icon: '🌟',
    difficulty: CHALLENGE_DIFFICULTY.EASY,
    condition: { type: 'goals_completed', target: 3 },
    reward: 'Three down!'
  },
  {
    id: 'challenge-morning-start',
    title: 'Morning Momentum',
    description: 'Complete a goal before 10 AM',
    icon: '🌅',
    difficulty: CHALLENGE_DIFFICULTY.EASY,
    condition: { type: 'complete_before_hour', target: 10 },
    reward: 'Early starter!'
  },
  {
    id: 'challenge-timer-15min',
    title: 'Quick Focus',
    description: 'Log 15 minutes on any timer goal',
    icon: '⏰',
    difficulty: CHALLENGE_DIFFICULTY.EASY,
    condition: { type: 'timer_minutes', target: 15 },
    reward: 'Focused mind!'
  },
  {
    id: 'challenge-counter-5',
    title: 'Count It Up',
    description: 'Add 5 to any counter goal',
    icon: '🔢',
    difficulty: CHALLENGE_DIFFICULTY.EASY,
    condition: { type: 'counter_increments', target: 5 },
    reward: 'Numbers climbing!'
  },
  {
    id: 'challenge-checkbox-one',
    title: 'Check It Off',
    description: 'Complete a checkbox goal',
    icon: '✅',
    difficulty: CHALLENGE_DIFFICULTY.EASY,
    condition: { type: 'checkbox_completed', target: 1 },
    reward: 'Done and dusted!'
  },

  // Medium challenges
  {
    id: 'challenge-complete-five',
    title: 'High Five',
    description: 'Complete 5 goals today',
    icon: '🖐️',
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
    condition: { type: 'goals_completed', target: 5 },
    reward: 'Five star performance!'
  },
  {
    id: 'challenge-timer-30min',
    title: 'Half Hour Hero',
    description: 'Log 30 minutes on any timer goal',
    icon: '⏱️',
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
    condition: { type: 'timer_minutes', target: 30 },
    reward: 'Time well spent!'
  },
  {
    id: 'challenge-timer-1hr',
    title: 'Hour of Power',
    description: 'Log 1 hour on any timer goal',
    icon: '💪',
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
    condition: { type: 'timer_minutes', target: 60 },
    reward: 'Powerful progress!'
  },
  {
    id: 'challenge-counter-10',
    title: 'Double Digits',
    description: 'Add 10 to any counter goal',
    icon: '🔟',
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
    condition: { type: 'counter_increments', target: 10 },
    reward: 'Numbers soaring!'
  },
  {
    id: 'challenge-variety-2types',
    title: 'Mix It Up',
    description: 'Complete goals of 2 different types',
    icon: '🎨',
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
    condition: { type: 'goal_types_completed', target: 2 },
    reward: 'Versatile achiever!'
  },
  {
    id: 'challenge-afternoon-productivity',
    title: 'Afternoon Achiever',
    description: 'Complete 2 goals between 12 PM and 5 PM',
    icon: '☀️',
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
    condition: { type: 'goals_completed_between', startHour: 12, endHour: 17, target: 2 },
    reward: 'Afternoon champion!'
  },
  {
    id: 'challenge-evening-finish',
    title: 'Evening Excellence',
    description: 'Complete a goal after 6 PM',
    icon: '🌆',
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
    condition: { type: 'complete_after_hour', target: 18 },
    reward: 'Strong finish!'
  },
  {
    id: 'challenge-two-categories',
    title: 'Category Crosser',
    description: 'Complete goals in 2 different categories',
    icon: '🗂️',
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
    condition: { type: 'categories_completed', target: 2 },
    reward: 'Well-rounded day!'
  },

  // Hard challenges
  {
    id: 'challenge-all-goals',
    title: 'Clean Sweep',
    description: 'Complete ALL your goals today',
    icon: '🧹',
    difficulty: CHALLENGE_DIFFICULTY.HARD,
    condition: { type: 'all_goals_completed', target: 1 },
    reward: 'Perfect day!'
  },
  {
    id: 'challenge-timer-2hr',
    title: 'Endurance Expert',
    description: 'Log 2 hours total on timer goals',
    icon: '🏃',
    difficulty: CHALLENGE_DIFFICULTY.HARD,
    condition: { type: 'timer_minutes', target: 120 },
    reward: 'Marathon mindset!'
  },
  {
    id: 'challenge-variety-3types',
    title: 'Triple Variety',
    description: 'Complete all 3 goal types today',
    icon: '🏆',
    difficulty: CHALLENGE_DIFFICULTY.HARD,
    condition: { type: 'goal_types_completed', target: 3 },
    reward: 'Master of all!'
  },
  {
    id: 'challenge-early-bird',
    title: 'Dawn Patrol',
    description: 'Complete 2 goals before 9 AM',
    icon: '🐦',
    difficulty: CHALLENGE_DIFFICULTY.HARD,
    condition: { type: 'goals_completed_before', hour: 9, target: 2 },
    reward: 'Early bird champion!'
  },
  {
    id: 'challenge-counter-20',
    title: 'Counter Master',
    description: 'Add 20 to any counter goal',
    icon: '📊',
    difficulty: CHALLENGE_DIFFICULTY.HARD,
    condition: { type: 'counter_increments', target: 20 },
    reward: 'Numbers king!'
  },
  {
    id: 'challenge-focus-session',
    title: 'Deep Focus',
    description: 'Complete a 45-minute uninterrupted timer session',
    icon: '🧘',
    difficulty: CHALLENGE_DIFFICULTY.HARD,
    condition: { type: 'continuous_timer_minutes', target: 45 },
    reward: 'Zen master!'
  },
  {
    id: 'challenge-multi-category',
    title: 'Category Champion',
    description: 'Complete goals in 3+ different categories',
    icon: '🎖️',
    difficulty: CHALLENGE_DIFFICULTY.HARD,
    condition: { type: 'categories_completed', target: 3 },
    reward: 'Balanced excellence!'
  },
  {
    id: 'challenge-night-owl',
    title: 'Night Warrior',
    description: 'Complete 3 goals after 8 PM',
    icon: '🦉',
    difficulty: CHALLENGE_DIFFICULTY.HARD,
    condition: { type: 'goals_completed_after', hour: 20, target: 3 },
    reward: 'Night champion!'
  }
];

/**
 * @typedef {Object} DailyChallengeState
 * @property {string} id - Challenge definition ID
 * @property {string} date - Date string (YYYY-MM-DD) when challenge was assigned
 * @property {number} progress - Current progress towards challenge
 * @property {boolean} completed - Whether challenge was completed
 * @property {number|null} completedAt - Timestamp when completed, null if not completed
 * @property {boolean} skipped - Whether challenge was skipped
 * @property {number} skipsUsedToday - Number of skips used today (max 1 per day)
 */

/**
 * @typedef {Object} DailyChallengeData
 * @property {DailyChallengeState|null} currentChallenge - Today's active challenge
 * @property {Array<DailyChallengeState>} history - Past challenge records
 * @property {number} totalCompleted - Total challenges completed
 * @property {number} currentChallengeStreak - Current consecutive days completing challenges
 * @property {number} bestChallengeStreak - Best consecutive days completing challenges
 */

/**
 * Get default daily challenge data structure
 * @returns {DailyChallengeData} Default challenge data
 */
function getDefaultDailyChallengeData() {
  return {
    currentChallenge: null,
    history: [],
    totalCompleted: 0,
    currentChallengeStreak: 0,
    bestChallengeStreak: 0
  };
}

/**
 * Get a challenge definition by ID
 * @param {string} challengeId - The challenge ID
 * @returns {Object|null} Challenge definition or null if not found
 */
function getChallengeDefinition(challengeId) {
  return DAILY_CHALLENGE_DEFINITIONS.find(c => c.id === challengeId) || null;
}

/**
 * Select a random challenge for today
 * Considers difficulty distribution and avoids recently completed challenges
 * @param {Array<DailyChallengeState>} history - Past challenge history
 * @param {string} [preferredDifficulty] - Optional preferred difficulty
 * @returns {Object} Selected challenge definition
 */
function selectDailyChallenge(history = [], preferredDifficulty = null) {
  // Get IDs of challenges completed in the last 7 days to avoid repetition
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 7);
  const recentDateStr = recentDate.toISOString().split('T')[0];

  const recentChallengeIds = new Set(
    history
      .filter(h => h.date >= recentDateStr && h.completed)
      .map(h => h.id)
  );

  // Filter out recently completed challenges
  let availableChallenges = DAILY_CHALLENGE_DEFINITIONS.filter(
    c => !recentChallengeIds.has(c.id)
  );

  // If all challenges were recently used, use all of them
  if (availableChallenges.length === 0) {
    availableChallenges = [...DAILY_CHALLENGE_DEFINITIONS];
  }

  // If preferred difficulty specified, filter by it
  if (preferredDifficulty) {
    const filteredByDifficulty = availableChallenges.filter(
      c => c.difficulty === preferredDifficulty
    );
    if (filteredByDifficulty.length > 0) {
      availableChallenges = filteredByDifficulty;
    }
  }

  // Random weighted selection (easy: 40%, medium: 40%, hard: 20%)
  if (!preferredDifficulty) {
    const random = Math.random();
    let targetDifficulty;
    if (random < 0.4) {
      targetDifficulty = CHALLENGE_DIFFICULTY.EASY;
    } else if (random < 0.8) {
      targetDifficulty = CHALLENGE_DIFFICULTY.MEDIUM;
    } else {
      targetDifficulty = CHALLENGE_DIFFICULTY.HARD;
    }

    const filteredByDifficulty = availableChallenges.filter(
      c => c.difficulty === targetDifficulty
    );
    if (filteredByDifficulty.length > 0) {
      availableChallenges = filteredByDifficulty;
    }
  }

  // Select random challenge from available pool
  const randomIndex = Math.floor(Math.random() * availableChallenges.length);
  return availableChallenges[randomIndex];
}

/**
 * Create a new daily challenge state for today
 * @param {string} challengeId - The challenge definition ID
 * @returns {DailyChallengeState} New challenge state
 */
function createDailyChallengeState(challengeId) {
  return {
    id: challengeId,
    date: getTodayDateString(),
    progress: 0,
    completed: false,
    completedAt: null,
    skipped: false,
    skipsUsedToday: 0
  };
}

/**
 * Check if a challenge is completed based on its condition
 * @param {DailyChallengeState} challengeState - Current challenge state
 * @returns {boolean} True if challenge is completed
 */
function isChallengeCompleted(challengeState) {
  const definition = getChallengeDefinition(challengeState.id);
  if (!definition) return false;
  return challengeState.progress >= definition.condition.target;
}

/**
 * Get challenge progress percentage
 * @param {DailyChallengeState} challengeState - Current challenge state
 * @returns {number} Progress percentage (0-100)
 */
function getChallengeProgressPercentage(challengeState) {
  const definition = getChallengeDefinition(challengeState.id);
  if (!definition || !definition.condition || !definition.condition.target) {
    return 0;
  }
  const percentage = (challengeState.progress / definition.condition.target) * 100;
  return Math.min(100, Math.max(0, percentage));
}

// =============================================================================
// US-085: Pomodoro Timer Mode Model
// =============================================================================

/**
 * Pomodoro phases
 * @readonly
 * @enum {string}
 */
const POMODORO_PHASES = {
  WORK: 'work',
  BREAK: 'break',
  LONG_BREAK: 'long_break',
  IDLE: 'idle'
};

/**
 * Default Pomodoro configuration (in seconds)
 * @type {Object}
 */
const POMODORO_DEFAULTS = {
  WORK_DURATION: 25 * 60,      // 25 minutes
  BREAK_DURATION: 5 * 60,       // 5 minutes
  LONG_BREAK_DURATION: 15 * 60, // 15 minutes
  SESSIONS_BEFORE_LONG_BREAK: 4 // Long break after 4 work sessions
};

/**
 * @typedef {Object} PomodoroSettings
 * @property {number} workDuration - Work session duration in seconds (default 25 min)
 * @property {number} breakDuration - Short break duration in seconds (default 5 min)
 * @property {number} longBreakDuration - Long break duration in seconds (default 15 min)
 * @property {number} sessionsBeforeLongBreak - Number of work sessions before long break (default 4)
 * @property {boolean} autoStartBreaks - Whether to auto-start breaks after work (default false)
 * @property {boolean} autoStartWork - Whether to auto-start work after breaks (default false)
 */

/**
 * @typedef {Object} PomodoroState
 * @property {boolean} enabled - Whether Pomodoro mode is enabled for this timer goal
 * @property {'work'|'break'|'long_break'|'idle'} phase - Current phase
 * @property {number} sessionsCompleted - Number of work sessions completed (resets after long break)
 * @property {number} totalSessionsToday - Total Pomodoro sessions completed today
 * @property {number|null} phaseStartTime - Timestamp when current phase started
 * @property {number} phaseProgress - Seconds elapsed in current phase
 * @property {boolean} isRunning - Whether the timer is currently running
 */

/**
 * Get default Pomodoro settings
 * @returns {PomodoroSettings} Default Pomodoro settings
 */
function getDefaultPomodoroSettings() {
  return {
    workDuration: POMODORO_DEFAULTS.WORK_DURATION,
    breakDuration: POMODORO_DEFAULTS.BREAK_DURATION,
    longBreakDuration: POMODORO_DEFAULTS.LONG_BREAK_DURATION,
    sessionsBeforeLongBreak: POMODORO_DEFAULTS.SESSIONS_BEFORE_LONG_BREAK,
    autoStartBreaks: false,
    autoStartWork: false
  };
}

/**
 * Get default Pomodoro state for a goal
 * @returns {PomodoroState} Default Pomodoro state
 */
function getDefaultPomodoroState() {
  return {
    enabled: false,
    phase: POMODORO_PHASES.IDLE,
    sessionsCompleted: 0,
    totalSessionsToday: 0,
    phaseStartTime: null,
    phaseProgress: 0,
    isRunning: false
  };
}

/**
 * Get the duration for a given Pomodoro phase
 * @param {'work'|'break'|'long_break'} phase - The phase
 * @param {PomodoroSettings} settings - Pomodoro settings
 * @returns {number} Duration in seconds
 */
function getPomodoroPhaseDuration(phase, settings) {
  switch (phase) {
    case POMODORO_PHASES.WORK:
      return settings.workDuration || POMODORO_DEFAULTS.WORK_DURATION;
    case POMODORO_PHASES.BREAK:
      return settings.breakDuration || POMODORO_DEFAULTS.BREAK_DURATION;
    case POMODORO_PHASES.LONG_BREAK:
      return settings.longBreakDuration || POMODORO_DEFAULTS.LONG_BREAK_DURATION;
    default:
      return 0;
  }
}

/**
 * Determine the next Pomodoro phase after current phase completes
 * @param {PomodoroState} state - Current Pomodoro state
 * @param {PomodoroSettings} settings - Pomodoro settings
 * @returns {'work'|'break'|'long_break'} Next phase
 */
function getNextPomodoroPhase(state, settings) {
  if (state.phase === POMODORO_PHASES.WORK) {
    // After work, check if it's time for a long break
    const sessionsForLongBreak = settings.sessionsBeforeLongBreak || POMODORO_DEFAULTS.SESSIONS_BEFORE_LONG_BREAK;
    // sessionsCompleted will be incremented when work phase ends, so we check current + 1
    if ((state.sessionsCompleted + 1) % sessionsForLongBreak === 0) {
      return POMODORO_PHASES.LONG_BREAK;
    }
    return POMODORO_PHASES.BREAK;
  }
  // After any break, next phase is work
  return POMODORO_PHASES.WORK;
}

/**
 * Get human-readable phase name
 * @param {'work'|'break'|'long_break'|'idle'} phase - The phase
 * @returns {string} Human-readable name
 */
function getPomodoroPhaseDisplayName(phase) {
  switch (phase) {
    case POMODORO_PHASES.WORK:
      return 'Work';
    case POMODORO_PHASES.BREAK:
      return 'Break';
    case POMODORO_PHASES.LONG_BREAK:
      return 'Long Break';
    case POMODORO_PHASES.IDLE:
    default:
      return 'Ready';
  }
}

/**
 * Calculate remaining time in current Pomodoro phase
 * @param {PomodoroState} state - Current state
 * @param {PomodoroSettings} settings - Settings
 * @returns {number} Remaining seconds in current phase
 */
function getPomodoroRemainingTime(state, settings) {
  if (state.phase === POMODORO_PHASES.IDLE) return 0;

  const phaseDuration = getPomodoroPhaseDuration(state.phase, settings);
  const elapsed = state.phaseProgress;
  return Math.max(0, phaseDuration - elapsed);
}

/**
 * Check if current Pomodoro phase is complete
 * @param {PomodoroState} state - Current state
 * @param {PomodoroSettings} settings - Settings
 * @returns {boolean} True if phase is complete
 */
function isPomodoroPhaseComplete(state, settings) {
  if (state.phase === POMODORO_PHASES.IDLE) return false;

  const phaseDuration = getPomodoroPhaseDuration(state.phase, settings);
  return state.phaseProgress >= phaseDuration;
}

/**
 * Calculate progress percentage for current Pomodoro phase
 * @param {PomodoroState} state - Current state
 * @param {PomodoroSettings} settings - Settings
 * @returns {number} Progress percentage (0-100)
 */
function getPomodoroProgressPercentage(state, settings) {
  if (state.phase === POMODORO_PHASES.IDLE) return 0;

  const phaseDuration = getPomodoroPhaseDuration(state.phase, settings);
  if (phaseDuration === 0) return 100;

  const percentage = (state.phaseProgress / phaseDuration) * 100;
  return Math.min(100, Math.max(0, percentage));
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
  getDateFromTimestamp,
  getHourFromTimestamp,
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
  createActivityLog,
  // Activity Timeline functions
  filterActivityByGoalAndDate,
  filterActivityByGoalAndDateRange,
  getActivityByHour,
  getActivityByHourForDateRange,
  getAggregatedActivityByHour,
  getMostProductiveHours,
  // US-080: Achievement functions
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_DEFINITIONS,
  createDefaultAchievementProgress,
  getAchievementDefinition,
  isAchievementUnlocked,
  getAchievementProgressPercentage,
  // US-081: Daily Challenge functions
  CHALLENGE_DIFFICULTY,
  DAILY_CHALLENGE_DEFINITIONS,
  getDefaultDailyChallengeData,
  getChallengeDefinition,
  selectDailyChallenge,
  createDailyChallengeState,
  isChallengeCompleted,
  getChallengeProgressPercentage,
  // US-083: Level and XP System functions
  XP_CONFIG,
  XP_SOURCES,
  getDefaultXPData,
  getXPForLevel,
  getLevelFromXP,
  getLevelProgress,
  calculateGoalCompletionXP,
  getPerfectDayXP,
  getAchievementXP,
  getChallengeXP,
  createXPHistoryEntry,
  getLevelTitle,
  // US-085: Pomodoro Timer Mode functions
  POMODORO_PHASES,
  POMODORO_DEFAULTS,
  getDefaultPomodoroSettings,
  getDefaultPomodoroState,
  getPomodoroPhaseDuration,
  getNextPomodoroPhase,
  getPomodoroPhaseDisplayName,
  getPomodoroRemainingTime,
  isPomodoroPhaseComplete,
  getPomodoroProgressPercentage
};
