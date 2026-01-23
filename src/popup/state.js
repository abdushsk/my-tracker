/**
 * Shared Application State
 * Central state management for the My Tracker popup
 */

// =============================================================================
// Application State
// =============================================================================

/**
 * Global application state
 * @type {Object}
 */
export const state = {
  goals: [],
  settings: null,
  activeTimers: {},
  streakData: null,
  categories: [], // US-065: Goal categories with color coding
  categoryFilter: 'all', // US-065: Current category filter for View Goals
  templates: [], // US-066: Goal templates
  focusedGoalId: null, // US-067: Currently focused goal ID for Focus Mode
  archivedGoals: [], // US-069: Archived goals
  statisticsGoalId: null, // US-071: Goal ID for viewing statistics
  achievements: [], // US-080: Achievement progress data
  pendingAchievementUnlock: null, // US-080: Achievement waiting to be shown
  dailyChallenges: null, // US-081: Daily challenges data
  xpData: null, // US-083: Level and XP system data
  pendingLevelUp: null, // US-083: Level-up waiting to be shown
  currentScreen: 'viewGoals',
  isLoading: true,
  timerIntervalId: null, // Interval ID for updating timer display
  justCompletedGoals: new Set(), // Track goals that just completed for animation (US-019)
  animatedIcons: new Set(), // US-019: Track icons that have already played their animation
  expandedCompletedGoals: new Set(), // Track which completed goals are expanded to show controls
  keyboardSelectedGoalIndex: -1, // US-078: Currently selected goal index for keyboard navigation
  keyboardShortcutsHelpVisible: false, // US-078: Whether keyboard shortcuts help overlay is visible
  // US-079: Undo/Redo state management
  undoStack: [], // Stack of undoable actions (max 5)
  redoStack: [], // Stack of redoable actions
  undoToastTimeoutId: null, // Timeout ID for auto-dismissing undo toast
  // US-085: Pomodoro Timer Mode state
  pomodoroStates: {}, // Map of goalId -> PomodoroState for each timer goal in Pomodoro mode
  pomodoroSettings: null, // Global Pomodoro settings
  // US-086: Break Reminders state
  breakReminderState: null, // Break reminder state
  breakReminderVisible: false, // Whether break reminder overlay is visible
  breakReminderCheckTimeoutId: null, // Timeout for periodic break reminder check
  compactMode: false // Compact Mode: shows only goals, hides navigation and extras
};

// =============================================================================
// Screen Names
// =============================================================================

/**
 * Available screen names
 * @readonly
 * @enum {string}
 */
export const SCREENS = {
  VIEW_GOALS: 'viewGoals',
  MANAGE_GOALS: 'manageGoals',
  GOAL_FORM: 'goalForm',
  TEMPLATE_GALLERY: 'templateGallery', // US-066: Template gallery screen
  FOCUS_MODE: 'focusMode', // US-067: Focus Mode screen
  ARCHIVE: 'archive', // US-069: Archive screen
  GOAL_STATISTICS: 'goalStatistics', // US-071: Individual Goal Statistics screen
  WEEKLY_REVIEW: 'weeklyReview', // US-072: Weekly Review screen
  ACHIEVEMENTS: 'achievements', // US-080: Achievements and Badges screen
  REPORTS: 'reports',
  SETTINGS: 'settings'
};

/**
 * Mapping of screen names to DOM element IDs
 */
export const SCREEN_IDS = {
  [SCREENS.VIEW_GOALS]: 'screen-view-goals',
  [SCREENS.MANAGE_GOALS]: 'screen-manage-goals',
  [SCREENS.GOAL_FORM]: 'screen-goal-form',
  [SCREENS.TEMPLATE_GALLERY]: 'screen-template-gallery', // US-066
  [SCREENS.FOCUS_MODE]: 'screen-focus-mode', // US-067
  [SCREENS.ARCHIVE]: 'screen-archive', // US-069
  [SCREENS.GOAL_STATISTICS]: 'screen-goal-statistics', // US-071
  [SCREENS.WEEKLY_REVIEW]: 'screen-weekly-review', // US-072
  [SCREENS.ACHIEVEMENTS]: 'screen-achievements', // US-080
  [SCREENS.REPORTS]: 'screen-reports',
  [SCREENS.SETTINGS]: 'screen-settings'
};

// =============================================================================
// Undo/Redo Constants
// =============================================================================

/**
 * Maximum number of undo actions to keep in the stack
 * @constant {number}
 */
export const UNDO_STACK_MAX_SIZE = 5;

/**
 * Duration in milliseconds for the undo toast to remain visible
 * @constant {number}
 */
export const UNDO_TOAST_DURATION = 5000;

/**
 * Action types for undo/redo
 * @readonly
 * @enum {string}
 */
export const UNDO_ACTION_TYPES = {
  COUNTER_INCREMENT: 'counterIncrement',
  COUNTER_DECREMENT: 'counterDecrement',
  CHECKBOX_TOGGLE: 'checkboxToggle',
  TIMER_START: 'timerStart',
  TIMER_STOP: 'timerStop',
  AVOIDANCE_SLIP: 'avoidanceSlip'  // US-087: Avoidance goal slip-up
};
