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
// Exports
// =============================================================================

export {
  // Constants
  GOAL_TYPES,
  TIMEFRAMES,
  // Utility functions
  generateId,
  // Goal functions
  createGoal,
  isGoalCompleted,
  getGoalCompletionPercentage,
  resetGoalProgress
};
