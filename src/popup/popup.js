/**
 * Popup JavaScript Entry Point
 * Main entry point for the Daily Goals Tracker Chrome extension popup
 */

// =============================================================================
// Imports
// =============================================================================

import {
  getGoals,
  saveGoals,
  getSettings,
  saveSettings,
  getActiveTimers,
  getStreakData,
  saveStreakData,
  saveActiveTimers,
  updateGoal,
  deleteGoal,
  addActivityLogEntry,
  getHistory,
  getActivityLog,
  getCategories,
  saveCategories,
  addCategory,
  deleteCategory,
  DEFAULT_CATEGORIES,
  // US-066: Template imports
  getTemplates,
  addTemplate,
  deleteTemplate,
  BUILT_IN_TEMPLATES,
  // US-069: Archive imports
  getArchivedGoals,
  archiveGoal,
  restoreArchivedGoal,
  deleteArchivedGoal,
  // US-070: Export/Import imports
  exportAllData,
  validateImportData,
  importAllData
} from '../utils/storage.js';
import {
  GOAL_TYPES,
  TIMEFRAMES,
  ACTIVITY_ACTIONS,
  isGoalCompleted,
  getGoalCompletionPercentage,
  createActivityLog,
  createGoal,
  getTodayDateString,
  getDateStringDaysAgo,
  getWeekStartDateString,
  getMonthStartDateString,
  filterHistoryByDateRange,
  filterHistoryByGoalId, // US-071: For individual goal statistics
  groupHistoryByDate,
  getActivityByHourForDateRange
} from '../utils/models.js';
import {
  initSounds,
  playSound,
  loadSoundSettings,
  setVolume,
  setMuted,
  SOUNDS
} from '../utils/sounds.js';

// =============================================================================
// Application State
// =============================================================================

/**
 * Global application state
 * @type {Object}
 */
const state = {
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
  currentScreen: 'viewGoals',
  isLoading: true,
  timerIntervalId: null, // Interval ID for updating timer display
  justCompletedGoals: new Set() // Track goals that just completed for animation (US-019)
};

// =============================================================================
// Screen Names
// =============================================================================

/**
 * Available screen names
 * @readonly
 * @enum {string}
 */
const SCREENS = {
  VIEW_GOALS: 'viewGoals',
  MANAGE_GOALS: 'manageGoals',
  GOAL_FORM: 'goalForm',
  TEMPLATE_GALLERY: 'templateGallery', // US-066: Template gallery screen
  FOCUS_MODE: 'focusMode', // US-067: Focus Mode screen
  ARCHIVE: 'archive', // US-069: Archive screen
  GOAL_STATISTICS: 'goalStatistics', // US-071: Individual Goal Statistics screen
  WEEKLY_REVIEW: 'weeklyReview', // US-072: Weekly Review screen
  REPORTS: 'reports',
  SETTINGS: 'settings'
};

/**
 * Mapping of screen names to DOM element IDs
 */
const SCREEN_IDS = {
  [SCREENS.VIEW_GOALS]: 'screen-view-goals',
  [SCREENS.MANAGE_GOALS]: 'screen-manage-goals',
  [SCREENS.GOAL_FORM]: 'screen-goal-form',
  [SCREENS.TEMPLATE_GALLERY]: 'screen-template-gallery', // US-066
  [SCREENS.FOCUS_MODE]: 'screen-focus-mode', // US-067
  [SCREENS.ARCHIVE]: 'screen-archive', // US-069
  [SCREENS.GOAL_STATISTICS]: 'screen-goal-statistics', // US-071
  [SCREENS.WEEKLY_REVIEW]: 'screen-weekly-review', // US-072
  [SCREENS.REPORTS]: 'screen-reports',
  [SCREENS.SETTINGS]: 'screen-settings'
};

// =============================================================================
// Screen Navigation
// =============================================================================

/**
 * Show a specific screen and hide all others
 * @param {string} screenName - The name of the screen to show (from SCREENS enum)
 */
function showScreen(screenName) {
  // Validate screen name
  if (!SCREEN_IDS[screenName]) {
    console.error(`Invalid screen name: ${screenName}`);
    return;
  }

  // Update state
  state.currentScreen = screenName;

  // Hide all screens
  Object.values(SCREEN_IDS).forEach(id => {
    const screenElement = document.getElementById(id);
    if (screenElement) {
      screenElement.classList.remove('active');
    }
  });

  // Show the requested screen
  const targetScreen = document.getElementById(SCREEN_IDS[screenName]);
  if (targetScreen) {
    targetScreen.classList.add('active');
    console.log(`Navigated to screen: ${screenName}`);
  } else {
    console.error(`Screen element not found: ${SCREEN_IDS[screenName]}`);
  }

  // Render the screen content
  renderCurrentScreen();
}

// =============================================================================
// Screen Rendering
// =============================================================================

/**
 * Render the current screen's content
 */
function renderCurrentScreen() {
  switch (state.currentScreen) {
    case SCREENS.VIEW_GOALS:
      renderViewGoalsScreen();
      break;
    case SCREENS.MANAGE_GOALS:
      renderManageGoalsScreen();
      break;
    case SCREENS.GOAL_FORM:
      renderGoalFormScreen();
      break;
    case SCREENS.TEMPLATE_GALLERY:
      renderTemplateGalleryScreen(); // US-066
      break;
    case SCREENS.FOCUS_MODE:
      renderFocusModeScreen(); // US-067
      break;
    case SCREENS.ARCHIVE:
      renderArchiveScreen(); // US-069
      break;
    case SCREENS.GOAL_STATISTICS:
      renderGoalStatisticsScreen(); // US-071
      break;
    case SCREENS.WEEKLY_REVIEW:
      renderWeeklyReviewScreen(); // US-072
      break;
    case SCREENS.REPORTS:
      renderReportsScreen();
      break;
    case SCREENS.SETTINGS:
      renderSettingsScreen();
      break;
    default:
      console.error(`Unknown screen: ${state.currentScreen}`);
  }
}

/**
 * Render the View Goals screen
 * This is the main/default screen showing goal progress
 */
function renderViewGoalsScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.VIEW_GOALS]);
  if (!screen) return;

  const completedCount = getCompletedCount();
  const totalCount = state.goals.length;
  const currentStreak = state.streakData?.currentStreak || 0;

  // US-056: Check compact view setting
  const isCompactView = state.settings?.compactViewEnabled || false;

  screen.innerHTML = `
    <div class="view-goals-screen">
      <header class="screen-header view-goals-header">
        <div class="header-main">
          <h1 class="app-title">Daily Goals</h1>
          <div class="header-actions">
            <button class="view-toggle-btn ${isCompactView ? 'compact-active' : ''}" id="compact-view-toggle" aria-label="${isCompactView ? 'Switch to expanded view' : 'Switch to compact view'}" title="${isCompactView ? 'Expanded view' : 'Compact view'}">
              ${isCompactView
                ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="3" y1="15" x2="21" y2="15"/>
                  </svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>`
              }
            </button>
            <button class="settings-btn" data-screen="${SCREENS.SETTINGS}" aria-label="Settings">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="header-stats">
          <div class="stat-item completed-stat">
            <span class="stat-icon">&#10003;</span>
            <span class="stat-value">${completedCount}/${totalCount}</span>
            <span class="stat-label">completed</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item streak-stat ${currentStreak > 0 ? 'active-streak' : ''}">
            <span class="stat-icon streak-icon">&#128293;</span>
            <span class="stat-value">${currentStreak}</span>
            <span class="stat-label">day streak</span>
          </div>
        </div>
        ${renderCategoryFilterBar()}
      </header>
      <main class="goals-list-container">
        ${state.goals.length === 0 ? renderEmptyState() : renderGoalsList()}
      </main>
      <footer class="screen-footer">
        <button class="nav-btn" data-screen="${SCREENS.MANAGE_GOALS}">
          <span class="nav-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </span>
          <span class="nav-label">Manage Goals</span>
        </button>
        <button class="nav-btn" data-screen="${SCREENS.REPORTS}">
          <span class="nav-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </span>
          <span class="nav-label">Reports</span>
        </button>
      </footer>
      ${renderQuickAddFAB()}
    </div>
  `;

  // Attach navigation event listeners
  attachNavigationListeners(screen);

  // Attach goal control listeners (timer play/pause, etc.)
  attachGoalControlListeners(screen);

  // US-056: Attach compact view toggle listener
  attachCompactViewToggleListener(screen);

  // US-065: Attach category filter listeners
  attachCategoryFilterListeners(screen);

  // US-068: Attach quick add FAB listeners
  attachQuickAddFABListeners(screen);

  // Start timer update interval if there are active timers
  if (Object.keys(state.activeTimers).length > 0) {
    startTimerUpdateInterval();
  }
}

/**
 * Get count of completed goals
 * @returns {number} Number of completed goals
 */
function getCompletedCount() {
  return state.goals.filter(goal => isGoalCompleted(goal)).length;
}

/**
 * US-065: Render category filter bar
 * @returns {string} HTML string for category filter bar
 */
function renderCategoryFilterBar() {
  // Only show filter bar if there are goals with categories
  const hasGoalsWithCategories = state.goals.some(goal => goal.category);
  if (!hasGoalsWithCategories && state.categoryFilter === 'all') {
    return ''; // Don't show filter bar if no goals have categories
  }

  const activeFilter = state.categoryFilter || 'all';

  return `
    <div class="category-filter-bar" role="group" aria-label="Filter by category">
      <button class="category-filter-chip ${activeFilter === 'all' ? 'active' : ''}" data-category="all">
        All
      </button>
      ${state.categories.map(cat => `
        <button class="category-filter-chip ${activeFilter === cat.id ? 'active' : ''}" data-category="${cat.id}">
          <span class="filter-dot" style="background-color: ${cat.color}"></span>
          ${cat.name}
        </button>
      `).join('')}
    </div>
  `;
}

/**
 * Render empty state when no goals exist
 * @returns {string} HTML string for empty state
 */
function renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-illustration">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" class="empty-svg">
          <!-- Target/bullseye circle -->
          <circle cx="60" cy="50" r="40" fill="none" stroke="var(--border)" stroke-width="2"/>
          <circle cx="60" cy="50" r="28" fill="none" stroke="var(--border)" stroke-width="2"/>
          <circle cx="60" cy="50" r="16" fill="none" stroke="var(--primary-light)" stroke-width="2"/>
          <circle cx="60" cy="50" r="6" fill="var(--primary)" />
          <!-- Arrow pointing to target -->
          <line x1="15" y1="85" x2="48" y2="58" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round"/>
          <polygon points="52,54 44,56 48,64" fill="var(--primary)"/>
          <!-- Decorative elements -->
          <circle cx="100" cy="25" r="3" fill="var(--warning)" opacity="0.6"/>
          <circle cx="25" cy="30" r="2" fill="var(--secondary)" opacity="0.6"/>
          <circle cx="95" cy="70" r="2" fill="var(--success)" opacity="0.6"/>
        </svg>
      </div>
      <h2 class="empty-message">No goals yet</h2>
      <p class="empty-submessage">Set your first goal and start building better habits today!</p>
      <button class="btn btn-primary btn-lg add-first-goal" data-screen="${SCREENS.MANAGE_GOALS}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-icon">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Your First Goal
      </button>
    </div>
  `;
}

/**
 * Render the goals list
 * @returns {string} HTML string for goals list
 */
function renderGoalsList() {
  // Sort goals by order property, then by createdAt
  let sortedGoals = [...state.goals].sort((a, b) => {
    if (a.order !== b.order) {
      return (a.order || 0) - (b.order || 0);
    }
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  // US-065: Filter by category if a filter is active
  if (state.categoryFilter && state.categoryFilter !== 'all') {
    sortedGoals = sortedGoals.filter(goal => goal.category === state.categoryFilter);
  }

  // US-056: Check compact view setting
  const isCompactView = state.settings?.compactViewEnabled || false;

  // Show empty message if no goals match the filter
  if (sortedGoals.length === 0 && state.categoryFilter !== 'all') {
    return `
      <div class="goals-list ${isCompactView ? 'compact-view' : ''}">
        <div class="empty-filter-state">
          <p class="empty-filter-message">No goals in this category</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="goals-list ${isCompactView ? 'compact-view' : ''}">
      ${sortedGoals.map(goal => renderGoalCard(goal)).join('')}
    </div>
  `;
}

// =============================================================================
// US-015: Goal Card Base Component
// =============================================================================

/**
 * Get the icon SVG for a goal type
 * @param {string} type - The goal type (timer, counter, checkbox)
 * @returns {string} SVG HTML string
 */
function getGoalTypeIcon(type) {
  switch (type) {
    case GOAL_TYPES.TIMER:
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="goal-type-icon">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>`;
    case GOAL_TYPES.COUNTER:
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="goal-type-icon">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>`;
    case GOAL_TYPES.CHECKBOX:
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="goal-type-icon">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <polyline points="9 11 12 14 22 4"/>
      </svg>`;
    default:
      return '';
  }
}

/**
 * Format timer progress as HH:MM:SS
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format progress display based on goal type
 * @param {Object} goal - The goal object
 * @returns {string} Formatted progress string
 */
function formatProgressDisplay(goal) {
  switch (goal.type) {
    case GOAL_TYPES.TIMER:
      return `${formatTime(goal.progress)} / ${formatTime(goal.target)}`;
    case GOAL_TYPES.COUNTER:
      return `${goal.progress} / ${goal.target}`;
    case GOAL_TYPES.CHECKBOX:
      return goal.progress >= goal.target ? 'Completed' : 'Not completed';
    default:
      return `${goal.progress} / ${goal.target}`;
  }
}

/**
 * Render a goal card component
 * @param {Object} goal - The goal object to render
 * @returns {string} HTML string for the goal card
 */
function renderGoalCard(goal) {
  const progressPercent = getGoalCompletionPercentage(goal);
  const isCompleted = isGoalCompleted(goal);
  const typeIcon = getGoalTypeIcon(goal.type);
  const progressDisplay = formatProgressDisplay(goal);

  // Build CSS classes for the card
  // US-019: Check if goal just completed for celebration animation
  const justCompleted = state.justCompletedGoals.has(goal.id);
  // US-056: Check compact view setting
  const isCompactView = state.settings?.compactViewEnabled || false;
  const cardClasses = [
    'goal-card',
    `goal-type-${goal.type}`,
    isCompleted ? 'goal-completed' : '',
    // Add active class for running timers (US-016)
    goal.type === GOAL_TYPES.TIMER && goal.isActive ? 'goal-timer-active' : '',
    // US-019: Add just-completed class for celebration animation
    justCompleted ? 'just-completed' : '',
    // US-056: Add compact class for compact view mode
    isCompactView ? 'compact' : ''
  ].filter(Boolean).join(' ');

  // US-065: Get category info for badge display
  const categoryInfo = goal.category ? state.categories.find(c => c.id === goal.category) : null;
  const categoryDataAttr = goal.category ? `data-category="${goal.category}"` : '';

  // US-073: Custom goal color for accent stripe
  const goalColorStyle = goal.color ? `style="--goal-custom-color: ${goal.color}"` : '';
  const hasCustomColor = goal.color ? 'has-custom-color' : '';

  return `
    <div class="${cardClasses} ${hasCustomColor}" data-goal-id="${goal.id}" ${categoryDataAttr} ${goalColorStyle} draggable="true">
      <div class="goal-card-header">
        <div class="drag-handle" title="Drag to reorder">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <circle cx="9" cy="6" r="1.5"/>
            <circle cx="15" cy="6" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/>
            <circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="18" r="1.5"/>
            <circle cx="15" cy="18" r="1.5"/>
          </svg>
        </div>
        <div class="goal-card-title-row">
          <span class="goal-type-indicator">${typeIcon}</span>
          <h3 class="goal-title">${escapeHtml(goal.title)}</h3>
        </div>
        <div class="goal-header-actions">
          <button class="stats-btn" data-action="view-stats" data-goal-id="${goal.id}" title="View statistics for this goal" aria-label="View statistics for ${escapeHtml(goal.title)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </button>
          <button class="focus-btn" data-action="focus" data-goal-id="${goal.id}" title="Focus on this goal" aria-label="Focus on ${escapeHtml(goal.title)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          </button>
          <div class="goal-badges">
            ${categoryInfo ? `<span class="goal-category-badge" style="background-color: ${categoryInfo.light}; color: ${categoryInfo.color}"><span class="category-color-dot" style="background-color: ${categoryInfo.color}"></span>${categoryInfo.name}</span>` : ''}
            <span class="goal-timeframe-badge timeframe-${goal.timeframe}">${capitalizeFirst(goal.timeframe)}</span>
          </div>
        </div>
      </div>
      <div class="goal-card-body">
        ${goal.notes ? renderGoalNotes(goal) : ''}
        <div class="goal-progress-section">
          <div class="goal-progress-info">
            <span class="goal-progress-text">${progressDisplay}</span>
            <span class="goal-progress-percent">${Math.round(progressPercent)}%</span>
          </div>
          <div class="goal-progress-bar">
            <div class="goal-progress-fill" style="width: ${progressPercent}%"></div>
          </div>
        </div>
        ${renderGoalControls(goal)}
      </div>
      ${isCompleted ? '<div class="goal-completed-indicator"><span class="completed-checkmark">&#10003;</span></div>' : ''}
    </div>
  `;
}

/**
 * US-074: Render goal notes with truncation and expand/collapse
 * Supports basic markdown: **bold** and [links](url)
 * @param {Object} goal - The goal object
 * @returns {string} HTML string for goal notes section
 */
function renderGoalNotes(goal) {
  if (!goal.notes) return '';

  const notes = goal.notes;
  const MAX_PREVIEW_LENGTH = 100;
  const needsTruncation = notes.length > MAX_PREVIEW_LENGTH;

  // Process basic markdown (bold and links)
  const processedNotes = formatNotesMarkdown(notes);
  const truncatedNotes = needsTruncation
    ? formatNotesMarkdown(notes.substring(0, MAX_PREVIEW_LENGTH) + '...')
    : processedNotes;

  return `
    <div class="goal-notes-section" data-goal-id="${goal.id}">
      <div class="goal-notes-content collapsed">
        <span class="goal-notes-text truncated">${truncatedNotes}</span>
        <span class="goal-notes-text full" style="display: none;">${processedNotes}</span>
      </div>
      ${needsTruncation ? `
        <button class="goal-notes-toggle" data-action="toggle-notes" data-goal-id="${goal.id}" title="Show more">
          <span class="toggle-text">Show more</span>
          <svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      ` : ''}
    </div>
  `;
}

/**
 * US-074: Format notes with basic markdown support
 * Supports: **bold** and [links](url)
 * @param {string} text - The text to format
 * @returns {string} HTML formatted text
 */
function formatNotesMarkdown(text) {
  // Escape HTML first to prevent XSS
  let formatted = escapeHtml(text);

  // Convert **bold** to <strong>
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convert [text](url) to links - only allow http/https URLs
  formatted = formatted.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="notes-link">$1</a>'
  );

  return formatted;
}

/**
 * US-074: Toggle goal notes expand/collapse state
 * @param {string} goalId - The goal ID
 * @param {HTMLElement} button - The toggle button element
 */
function toggleGoalNotes(goalId, button) {
  const notesSection = document.querySelector(`.goal-notes-section[data-goal-id="${goalId}"]`);
  if (!notesSection) return;

  const content = notesSection.querySelector('.goal-notes-content');
  const truncatedText = notesSection.querySelector('.goal-notes-text.truncated');
  const fullText = notesSection.querySelector('.goal-notes-text.full');
  const toggleText = button.querySelector('.toggle-text');
  const toggleIcon = button.querySelector('.toggle-icon');

  if (content.classList.contains('collapsed')) {
    // Expand
    content.classList.remove('collapsed');
    content.classList.add('expanded');
    if (truncatedText) truncatedText.style.display = 'none';
    if (fullText) fullText.style.display = 'inline';
    if (toggleText) toggleText.textContent = 'Show less';
    if (toggleIcon) toggleIcon.style.transform = 'rotate(180deg)';
    button.title = 'Show less';
  } else {
    // Collapse
    content.classList.remove('expanded');
    content.classList.add('collapsed');
    if (truncatedText) truncatedText.style.display = 'inline';
    if (fullText) fullText.style.display = 'none';
    if (toggleText) toggleText.textContent = 'Show more';
    if (toggleIcon) toggleIcon.style.transform = 'rotate(0deg)';
    button.title = 'Show more';
  }
}

/**
 * Render goal-specific controls
 * US-016: Timer Type Controls
 * US-017: Counter Type Controls (placeholder)
 * US-018: Checkbox Type Controls (placeholder)
 * @param {Object} goal - The goal object
 * @returns {string} HTML string for goal controls
 */
function renderGoalControls(goal) {
  switch (goal.type) {
    case GOAL_TYPES.TIMER:
      return renderTimerControls(goal);
    case GOAL_TYPES.COUNTER:
      // Add disabled class when progress is 0
      const isAtMinimum = goal.progress <= 0;
      return `
        <div class="goal-controls goal-controls-counter">
          <button class="goal-control-btn counter-decrement-btn ${isAtMinimum ? 'disabled' : ''}"
                  data-action="decrement"
                  data-goal-id="${goal.id}"
                  title="Decrease"
                  ${isAtMinimum ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <span class="counter-value">${goal.progress}</span>
          <button class="goal-control-btn counter-increment-btn"
                  data-action="increment"
                  data-goal-id="${goal.id}"
                  title="Increase">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      `;
    case GOAL_TYPES.CHECKBOX:
      return `
        <div class="goal-controls goal-controls-checkbox">
          <button class="goal-control-btn checkbox-toggle-btn ${isGoalCompleted(goal) ? 'checked' : ''}" data-action="checkbox-toggle" data-goal-id="${goal.id}" title="Toggle completion">
            <span class="checkbox-box">
              ${isGoalCompleted(goal)
                ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
                : ''
              }
            </span>
            <span class="checkbox-label">${isGoalCompleted(goal) ? 'Done!' : 'Mark as done'}</span>
          </button>
        </div>
      `;
    default:
      return '';
  }
}

// =============================================================================
// US-019: Goal Completion Celebration
// US-064: Enhanced Completion Confetti
// =============================================================================

/**
 * Confetti particle class for canvas-based animation
 */
class ConfettiParticle {
  constructor(canvas, colors, intensity = 'normal') {
    this.canvas = canvas;
    this.reset(colors, intensity, true);
  }

  reset(colors, intensity = 'normal', initial = false) {
    const speedMultiplier = intensity === 'high' ? 1.3 : intensity === 'low' ? 0.7 : 1;

    // Start position - spread across top of canvas with some randomness
    this.x = Math.random() * this.canvas.width;
    this.y = initial ? Math.random() * this.canvas.height * -0.5 : -10;

    // Size varies by shape
    this.size = Math.random() * 8 + 4;

    // Physics
    this.speedY = (Math.random() * 3 + 2) * speedMultiplier;
    this.speedX = (Math.random() - 0.5) * 4 * speedMultiplier;
    this.gravity = 0.1;
    this.drag = 0.02;
    this.wobble = Math.random() * 10;
    this.wobbleSpeed = Math.random() * 0.1 + 0.05;

    // Rotation
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 15;

    // Appearance
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.opacity = 1;
    this.shape = Math.random() > 0.5 ? 'rect' : Math.random() > 0.5 ? 'circle' : 'strip';
  }

  update() {
    // Apply gravity
    this.speedY += this.gravity;

    // Apply drag
    this.speedX *= (1 - this.drag);

    // Wobble effect
    this.wobble += this.wobbleSpeed;
    this.x += this.speedX + Math.sin(this.wobble) * 0.5;
    this.y += this.speedY;

    // Rotation
    this.rotation += this.rotationSpeed;

    // Fade out near bottom
    if (this.y > this.canvas.height * 0.7) {
      this.opacity = Math.max(0, 1 - (this.y - this.canvas.height * 0.7) / (this.canvas.height * 0.3));
    }

    return this.y < this.canvas.height + 20 && this.opacity > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;

    switch (this.shape) {
      case 'rect':
        ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'strip':
        ctx.fillRect(-this.size / 4, -this.size, this.size / 2, this.size * 2);
        break;
    }

    ctx.restore();
  }
}

/**
 * Get confetti colors based on current theme
 * @returns {string[]} Array of color hex codes
 */
function getConfettiColors() {
  // Get computed styles to use CSS variable values
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);

  return [
    computedStyle.getPropertyValue('--success').trim() || '#4CAF50',
    computedStyle.getPropertyValue('--gold-bright').trim() || '#FFD700',
    computedStyle.getPropertyValue('--secondary').trim() || '#2196F3',
    computedStyle.getPropertyValue('--warning').trim() || '#FF9800',
    computedStyle.getPropertyValue('--primary').trim() || '#4CAF50',
    '#FF6B6B', // Coral red for variety
    '#A78BFA', // Purple for variety
  ];
}

/**
 * Create and launch confetti animation
 * @param {Object} options - Configuration options
 * @param {string} options.intensity - 'low', 'normal', or 'high'
 * @param {number} options.duration - Animation duration in ms
 * @param {HTMLElement} options.container - Container element (defaults to #app)
 */
function launchConfetti(options = {}) {
  const {
    intensity = 'normal',
    duration = 2000,
    container = document.getElementById('app')
  } = options;

  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    console.log('[Confetti] Skipping animation due to reduced motion preference');
    return;
  }

  if (!container) {
    console.error('[Confetti] Container not found');
    return;
  }

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1000;
  `;

  // Ensure container has relative positioning
  const originalPosition = container.style.position;
  if (!originalPosition || originalPosition === 'static') {
    container.style.position = 'relative';
  }

  container.appendChild(canvas);

  // Set canvas size
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  const ctx = canvas.getContext('2d');
  const colors = getConfettiColors();

  // Determine particle count based on intensity
  const particleCount = intensity === 'high' ? 80 : intensity === 'low' ? 30 : 50;

  // Create particles
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push(new ConfettiParticle(canvas, colors, intensity));
  }

  // Animation variables
  let animationId;
  const startTime = Date.now();
  let particleSpawnDone = false;

  // Animation loop
  function animate() {
    const elapsed = Date.now() - startTime;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Stop spawning new particles after 1/3 of duration
    if (elapsed > duration / 3) {
      particleSpawnDone = true;
    }

    // Update and draw particles
    let activeParticles = 0;
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      if (particle.update()) {
        particle.draw(ctx);
        activeParticles++;
      } else if (!particleSpawnDone) {
        // Reset particle to top for continuous effect
        particle.reset(colors, intensity);
        activeParticles++;
      }
    }

    // Continue animation if there are active particles and time remaining
    if (activeParticles > 0 && elapsed < duration + 1000) {
      animationId = requestAnimationFrame(animate);
    } else {
      // Cleanup
      canvas.remove();
      if (!originalPosition || originalPosition === 'static') {
        container.style.position = originalPosition || '';
      }
      console.log('[Confetti] Animation completed');
    }
  }

  // Start animation
  animationId = requestAnimationFrame(animate);
  console.log(`[Confetti] Launched ${particleCount} particles with ${intensity} intensity`);

  // Safety cleanup after max duration
  setTimeout(() => {
    if (canvas.parentNode) {
      cancelAnimationFrame(animationId);
      canvas.remove();
      if (!originalPosition || originalPosition === 'static') {
        container.style.position = originalPosition || '';
      }
    }
  }, duration + 2000);
}

/**
 * Trigger completion celebration animation for a goal
 * @param {string} goalId - The ID of the completed goal
 * @param {Object} options - Optional celebration options
 * @param {string} options.intensity - 'low', 'normal', or 'high' confetti intensity
 */
function triggerCompletionCelebration(goalId, options = {}) {
  const { intensity = 'normal' } = options;

  // Add to just-completed set
  state.justCompletedGoals.add(goalId);

  // US-064: Launch enhanced confetti animation
  launchConfetti({
    intensity,
    duration: intensity === 'high' ? 2500 : 2000
  });

  // Schedule removal of the just-completed state after animation
  setTimeout(() => {
    state.justCompletedGoals.delete(goalId);

    // Remove the class from DOM if the element still exists
    const goalCard = document.querySelector(`.goal-card[data-goal-id="${goalId}"]`);
    if (goalCard) {
      goalCard.classList.remove('just-completed');
    }
  }, 2000); // Extended duration to match enhanced animation

  console.log(`[Celebration] Triggered completion celebration for goal ${goalId} with ${intensity} intensity`);
}

// =============================================================================
// US-016: Timer Type Controls
// =============================================================================

/**
 * Render timer-specific controls for a goal
 * @param {Object} goal - The timer goal object
 * @returns {string} HTML string for timer controls
 */
function renderTimerControls(goal) {
  const isActive = goal.isActive;
  const activeTimer = state.activeTimers[goal.id];

  // Calculate current elapsed time for display
  let displayProgress = goal.progress;
  if (isActive && activeTimer && activeTimer.startTime) {
    const elapsedSinceStart = Math.floor((Date.now() - activeTimer.startTime) / 1000);
    displayProgress = goal.progress + elapsedSinceStart;
  }

  // Cap display progress at target
  displayProgress = Math.min(displayProgress, goal.target);

  const playIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  const pauseIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

  return `
    <div class="goal-controls goal-controls-timer">
      <div class="timer-display" data-goal-id="${goal.id}">
        <span class="timer-current">${formatTime(displayProgress)}</span>
        <span class="timer-separator">/</span>
        <span class="timer-target">${formatTime(goal.target)}</span>
      </div>
      <button class="goal-control-btn timer-play-btn ${isActive ? 'is-active' : ''}"
              data-action="timer-toggle"
              data-goal-id="${goal.id}"
              title="${isActive ? 'Pause' : 'Play'}">
        ${isActive ? pauseIcon : playIcon}
      </button>
    </div>
  `;
}

/**
 * Handle timer play/pause toggle
 * @param {string} goalId - The ID of the timer goal
 */
async function handleTimerToggle(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal || goal.type !== GOAL_TYPES.TIMER) {
    console.error('Invalid goal for timer toggle:', goalId);
    return;
  }

  const isCurrentlyActive = goal.isActive;
  const now = Date.now();

  if (isCurrentlyActive) {
    // PAUSE: Calculate elapsed time and save progress
    const activeTimer = state.activeTimers[goalId];
    if (activeTimer && activeTimer.startTime) {
      const elapsedSinceStart = Math.floor((now - activeTimer.startTime) / 1000);
      const newProgress = Math.min(goal.progress + elapsedSinceStart, goal.target);

      // Update goal in state
      goal.progress = newProgress;
      goal.isActive = false;

      // Save goal to storage
      await updateGoal(goalId, { progress: newProgress, isActive: false });

      // Log the pause activity
      const activityLog = createActivityLog({
        goalId: goalId,
        action: ACTIVITY_ACTIONS.PAUSE,
        value: elapsedSinceStart
      });
      await addActivityLogEntry(activityLog);

      // Clear active timer
      delete state.activeTimers[goalId];
      await saveActiveTimers(state.activeTimers);

      // US-031: Notify service worker of pause
      sendToServiceWorker({
        type: 'TIMER_PAUSE',
        goalId: goalId
      });

      // US-039: Play pause sound
      playSound(SOUNDS.PAUSE);

      console.log(`[Timer] Paused goal ${goalId}: +${elapsedSinceStart}s, total progress: ${newProgress}s`);
    }
  } else {
    // PLAY: Start the timer
    goal.isActive = true;

    // US-039: Play start sound
    playSound(SOUNDS.START);

    // Update goal in storage
    await updateGoal(goalId, { isActive: true });

    // Store the start time
    state.activeTimers[goalId] = {
      startTime: now,
      goalId: goalId
    };
    await saveActiveTimers(state.activeTimers);

    // Log the start activity
    const activityLog = createActivityLog({
      goalId: goalId,
      action: ACTIVITY_ACTIONS.START,
      value: null
    });
    await addActivityLogEntry(activityLog);

    // Start the timer update interval if not already running
    startTimerUpdateInterval();

    // US-031: Notify service worker (for background tracking)
    sendToServiceWorker({
      type: 'TIMER_START',
      goalId: goalId,
      startTime: now
    }).then(response => {
      if (response && response.success) {
        console.log('[Timer] Service worker notified of timer start');
      }
    });

    console.log(`[Timer] Started goal ${goalId} at ${new Date(now).toLocaleTimeString()}`);
  }

  // Re-render to update UI
  renderCurrentScreen();
}

/**
 * Start the interval that updates timer displays every second
 */
function startTimerUpdateInterval() {
  // Don't start if already running
  if (state.timerIntervalId) {
    return;
  }

  state.timerIntervalId = setInterval(() => {
    updateTimerDisplays();
  }, 1000);

  console.log('[Timer] Started update interval');
}

/**
 * Stop the timer update interval
 */
function stopTimerUpdateInterval() {
  if (state.timerIntervalId) {
    clearInterval(state.timerIntervalId);
    state.timerIntervalId = null;
    console.log('[Timer] Stopped update interval');
  }
}

/**
 * Update all active timer displays without full re-render
 */
function updateTimerDisplays() {
  const activeTimerIds = Object.keys(state.activeTimers);

  // If no active timers, stop the interval
  if (activeTimerIds.length === 0) {
    stopTimerUpdateInterval();
    return;
  }

  const now = Date.now();

  activeTimerIds.forEach(goalId => {
    const goal = state.goals.find(g => g.id === goalId);
    const activeTimer = state.activeTimers[goalId];

    if (!goal || !activeTimer || goal.type !== GOAL_TYPES.TIMER) {
      return;
    }

    // Calculate current elapsed time
    const elapsedSinceStart = Math.floor((now - activeTimer.startTime) / 1000);
    const currentProgress = Math.min(goal.progress + elapsedSinceStart, goal.target);

    // Update the timer display in DOM
    const timerDisplay = document.querySelector(`.timer-display[data-goal-id="${goalId}"]`);
    if (timerDisplay) {
      const currentTimeElement = timerDisplay.querySelector('.timer-current');
      if (currentTimeElement) {
        currentTimeElement.textContent = formatTime(currentProgress);
      }
    }

    // Update progress bar
    const goalCard = document.querySelector(`.goal-card[data-goal-id="${goalId}"]`);
    if (goalCard) {
      const progressFill = goalCard.querySelector('.goal-progress-fill');
      const progressPercent = goalCard.querySelector('.goal-progress-percent');

      if (progressFill) {
        const percentage = goal.target > 0 ? Math.min(100, (currentProgress / goal.target) * 100) : 100;
        progressFill.style.width = `${percentage}%`;
      }

      if (progressPercent) {
        const percentage = goal.target > 0 ? Math.min(100, (currentProgress / goal.target) * 100) : 100;
        progressPercent.textContent = `${Math.round(percentage)}%`;
      }

      // Update progress text display
      const progressText = goalCard.querySelector('.goal-progress-text');
      if (progressText) {
        progressText.textContent = `${formatTime(currentProgress)} / ${formatTime(goal.target)}`;
      }
    }

    // Check if goal just completed
    if (currentProgress >= goal.target && !isGoalCompleted(goal)) {
      handleTimerCompletion(goalId);
    }
  });

  // US-067: Also update focus mode timer display if in focus mode
  updateFocusModeTimerDisplay();
}

/**
 * Handle timer completion (when progress reaches target)
 * @param {string} goalId - The ID of the completed timer goal
 */
async function handleTimerCompletion(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return;

  const activeTimer = state.activeTimers[goalId];
  const now = Date.now();

  // Calculate final progress
  let elapsedSinceStart = 0;
  if (activeTimer && activeTimer.startTime) {
    elapsedSinceStart = Math.floor((now - activeTimer.startTime) / 1000);
  }

  const finalProgress = goal.target; // Cap at target

  // Update goal
  goal.progress = finalProgress;
  goal.isActive = false;

  // Save to storage
  await updateGoal(goalId, { progress: finalProgress, isActive: false });

  // Log completion
  const completeLog = createActivityLog({
    goalId: goalId,
    action: ACTIVITY_ACTIONS.COMPLETE,
    value: finalProgress
  });
  await addActivityLogEntry(completeLog);

  // Clear active timer
  delete state.activeTimers[goalId];
  await saveActiveTimers(state.activeTimers);

  console.log(`[Timer] Goal ${goalId} completed! Final progress: ${finalProgress}s`);

  // US-039: Play completion sound
  playSound(SOUNDS.COMPLETE);

  // US-019: Trigger completion celebration animation
  triggerCompletionCelebration(goalId);

  // Re-render to show completion state
  renderCurrentScreen();
}

// =============================================================================
// US-017: Counter Type Controls
// =============================================================================

/**
 * Handle counter increment
 * @param {string} goalId - The ID of the counter goal
 */
async function handleCounterIncrement(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal || goal.type !== GOAL_TYPES.COUNTER) {
    console.error('Invalid goal for counter increment:', goalId);
    return;
  }

  // Calculate new progress (don't exceed target for visual purposes, but allow tracking beyond)
  const newProgress = goal.progress + 1;
  const wasCompleted = isGoalCompleted(goal);

  // Update goal in state
  goal.progress = newProgress;

  // Save to storage
  await updateGoal(goalId, { progress: newProgress });

  // Log the increment activity
  const activityLog = createActivityLog({
    goalId: goalId,
    action: ACTIVITY_ACTIONS.INCREMENT,
    value: newProgress
  });
  await addActivityLogEntry(activityLog);

  console.log(`[Counter] Incremented goal ${goalId}: progress now ${newProgress}/${goal.target}`);

  // Check if goal just completed
  const isNowCompleted = isGoalCompleted(goal);
  if (!wasCompleted && isNowCompleted) {
    // Log completion
    const completeLog = createActivityLog({
      goalId: goalId,
      action: ACTIVITY_ACTIONS.COMPLETE,
      value: newProgress
    });
    await addActivityLogEntry(completeLog);
    console.log(`[Counter] Goal ${goalId} completed!`);

    // US-039: Play completion sound (instead of tick for completion)
    playSound(SOUNDS.COMPLETE);

    // US-019: Trigger completion celebration animation
    triggerCompletionCelebration(goalId);
  } else {
    // US-039: Play tick sound for regular increment
    playSound(SOUNDS.TICK);
  }

  // Re-render to update UI
  renderCurrentScreen();
}

/**
 * Handle counter decrement
 * @param {string} goalId - The ID of the counter goal
 */
async function handleCounterDecrement(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal || goal.type !== GOAL_TYPES.COUNTER) {
    console.error('Invalid goal for counter decrement:', goalId);
    return;
  }

  // Cannot go below 0
  if (goal.progress <= 0) {
    console.log(`[Counter] Goal ${goalId} already at minimum (0)`);
    return;
  }

  // Calculate new progress
  const newProgress = goal.progress - 1;

  // Update goal in state
  goal.progress = newProgress;

  // Save to storage
  await updateGoal(goalId, { progress: newProgress });

  // Log the decrement activity
  const activityLog = createActivityLog({
    goalId: goalId,
    action: ACTIVITY_ACTIONS.DECREMENT,
    value: newProgress
  });
  await addActivityLogEntry(activityLog);

  console.log(`[Counter] Decremented goal ${goalId}: progress now ${newProgress}/${goal.target}`);

  // US-039: Play tick sound for decrement
  playSound(SOUNDS.TICK);

  // Re-render to update UI
  renderCurrentScreen();
}

// =============================================================================
// US-018: Checkbox Type Controls
// =============================================================================

/**
 * Handle checkbox toggle
 * @param {string} goalId - The ID of the checkbox goal
 */
async function handleCheckboxToggle(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal || goal.type !== GOAL_TYPES.CHECKBOX) {
    console.error('Invalid goal for checkbox toggle:', goalId);
    return;
  }

  const wasCompleted = isGoalCompleted(goal);
  // Toggle between 0 and 1 (target is always 1 for checkbox)
  const newProgress = goal.progress >= goal.target ? 0 : 1;

  // Update goal in state
  goal.progress = newProgress;

  // Save to storage
  await updateGoal(goalId, { progress: newProgress });

  // Log the toggle activity
  const activityLog = createActivityLog({
    goalId: goalId,
    action: ACTIVITY_ACTIONS.TOGGLE,
    value: newProgress
  });
  await addActivityLogEntry(activityLog);

  console.log(`[Checkbox] Toggled goal ${goalId}: progress now ${newProgress} (${newProgress >= goal.target ? 'completed' : 'not completed'})`);

  // Check if goal just completed
  const isNowCompleted = isGoalCompleted(goal);
  if (!wasCompleted && isNowCompleted) {
    // Log completion
    const completeLog = createActivityLog({
      goalId: goalId,
      action: ACTIVITY_ACTIONS.COMPLETE,
      value: newProgress
    });
    await addActivityLogEntry(completeLog);
    console.log(`[Checkbox] Goal ${goalId} completed!`);

    // US-039: Play completion sound (instead of tick for completion)
    playSound(SOUNDS.COMPLETE);

    // US-019: Trigger completion celebration animation
    triggerCompletionCelebration(goalId);
  } else {
    // US-039: Play tick sound for regular toggle
    playSound(SOUNDS.TICK);
  }

  // Re-render to update UI
  renderCurrentScreen();
}

/**
 * Attach goal control event listeners to the current screen
 * @param {HTMLElement} container - The container element
 */
function attachGoalControlListeners(container) {
  // Timer toggle buttons
  const timerToggleBtns = container.querySelectorAll('[data-action="timer-toggle"]');
  timerToggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        handleTimerToggle(goalId);
      }
    });
  });

  // Counter increment buttons (US-017)
  const incrementBtns = container.querySelectorAll('[data-action="increment"]');
  incrementBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        handleCounterIncrement(goalId);
      }
    });
  });

  // Counter decrement buttons (US-017)
  const decrementBtns = container.querySelectorAll('[data-action="decrement"]');
  decrementBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        handleCounterDecrement(goalId);
      }
    });
  });

  // Checkbox toggle buttons (US-018)
  const checkboxToggleBtns = container.querySelectorAll('[data-action="checkbox-toggle"]');
  checkboxToggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        handleCheckboxToggle(goalId);
      }
    });
  });

  // US-067: Focus mode buttons
  const focusBtns = container.querySelectorAll('[data-action="focus"]');
  focusBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        enterFocusMode(goalId);
      }
    });
  });

  // US-071: Goal statistics buttons
  const statsBtns = container.querySelectorAll('[data-action="view-stats"]');
  statsBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        openGoalStatistics(goalId);
      }
    });
  });

  // US-074: Toggle notes expand/collapse buttons
  const notesToggleBtns = container.querySelectorAll('[data-action="toggle-notes"]');
  notesToggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        toggleGoalNotes(goalId, btn);
      }
    });
  });

  // US-059: Attach drag and drop listeners for goal reordering
  attachDragDropListeners(container);
}

// =============================================================================
// US-059: Drag-to-Reorder Daily Goals
// =============================================================================

// Track the currently dragged element
let draggedGoalCard = null;
let draggedGoalId = null;
let dragPlaceholder = null;

/**
 * Attach drag and drop event listeners to goal cards
 * @param {HTMLElement} container - Container with goal cards
 */
function attachDragDropListeners(container) {
  const goalCards = container.querySelectorAll('.goal-card[draggable="true"]');

  goalCards.forEach(card => {
    // Dragstart - when user starts dragging
    card.addEventListener('dragstart', handleDragStart);

    // Dragend - when drag operation ends
    card.addEventListener('dragend', handleDragEnd);

    // Dragover - when dragging over another card
    card.addEventListener('dragover', handleDragOver);

    // Dragenter - when entering another card's space
    card.addEventListener('dragenter', handleDragEnter);

    // Dragleave - when leaving a card's space
    card.addEventListener('dragleave', handleDragLeave);

    // Drop - when dropping on a card
    card.addEventListener('drop', handleDrop);
  });

  // Also attach to the goals list container for drops at the end
  const goalsList = container.querySelector('.goals-list');
  if (goalsList) {
    goalsList.addEventListener('dragover', handleGoalsListDragOver);
    goalsList.addEventListener('drop', handleGoalsListDrop);
  }
}

/**
 * Handle drag start event
 * @param {DragEvent} e - The drag event
 */
function handleDragStart(e) {
  const card = e.target.closest('.goal-card');
  if (!card) return;

  draggedGoalCard = card;
  draggedGoalId = card.getAttribute('data-goal-id');

  // Set drag data
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedGoalId);

  // Add dragging class after a small delay for visual feedback
  setTimeout(() => {
    card.classList.add('dragging');
  }, 0);

  // Create placeholder element
  dragPlaceholder = document.createElement('div');
  dragPlaceholder.className = 'drag-placeholder';
  dragPlaceholder.style.height = `${card.offsetHeight}px`;
}

/**
 * Handle drag end event
 * @param {DragEvent} e - The drag event
 */
function handleDragEnd(e) {
  const card = e.target.closest('.goal-card');
  if (card) {
    card.classList.remove('dragging');
  }

  // Remove any drag-over classes from all cards
  document.querySelectorAll('.goal-card.drag-over').forEach(c => {
    c.classList.remove('drag-over');
  });

  // Remove placeholder if it exists
  if (dragPlaceholder && dragPlaceholder.parentNode) {
    dragPlaceholder.parentNode.removeChild(dragPlaceholder);
  }

  // Reset drag state
  draggedGoalCard = null;
  draggedGoalId = null;
  dragPlaceholder = null;
}

/**
 * Handle drag over event
 * @param {DragEvent} e - The drag event
 */
function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const card = e.target.closest('.goal-card');
  if (!card || card === draggedGoalCard) return;

  // Determine if we're in the top or bottom half of the card
  const rect = card.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;
  const isAbove = e.clientY < midpoint;

  // Update visual indicator
  card.classList.remove('drag-over-top', 'drag-over-bottom');
  card.classList.add(isAbove ? 'drag-over-top' : 'drag-over-bottom');
}

/**
 * Handle drag enter event
 * @param {DragEvent} e - The drag event
 */
function handleDragEnter(e) {
  e.preventDefault();
  const card = e.target.closest('.goal-card');
  if (card && card !== draggedGoalCard) {
    card.classList.add('drag-over');
  }
}

/**
 * Handle drag leave event
 * @param {DragEvent} e - The drag event
 */
function handleDragLeave(e) {
  const card = e.target.closest('.goal-card');
  if (!card) return;

  // Only remove class if we're actually leaving the card (not entering a child)
  const relatedTarget = e.relatedTarget;
  if (!card.contains(relatedTarget)) {
    card.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
  }
}

/**
 * Handle drop event on a goal card
 * @param {DragEvent} e - The drag event
 */
async function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();

  const targetCard = e.target.closest('.goal-card');
  if (!targetCard || !draggedGoalId) return;

  const targetGoalId = targetCard.getAttribute('data-goal-id');
  if (targetGoalId === draggedGoalId) return;

  // Determine drop position (above or below target)
  const rect = targetCard.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;
  const dropAbove = e.clientY < midpoint;

  // Reorder the goals
  await reorderGoals(draggedGoalId, targetGoalId, dropAbove);

  // Clean up
  targetCard.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
}

/**
 * Handle drag over event on the goals list container
 * @param {DragEvent} e - The drag event
 */
function handleGoalsListDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

/**
 * Handle drop event on the goals list container (for dropping at end)
 * @param {DragEvent} e - The drag event
 */
async function handleGoalsListDrop(e) {
  // Only handle if not dropped on a card
  if (e.target.closest('.goal-card')) return;

  e.preventDefault();

  if (!draggedGoalId) return;

  // Move to end of list
  await reorderGoals(draggedGoalId, null, false);
}

/**
 * Reorder goals array and persist to storage
 * @param {string} draggedId - ID of the dragged goal
 * @param {string|null} targetId - ID of the target goal (null for end of list)
 * @param {boolean} dropAbove - Whether to drop above or below the target
 */
async function reorderGoals(draggedId, targetId, dropAbove) {
  // Find the dragged goal
  const draggedIndex = state.goals.findIndex(g => g.id === draggedId);
  if (draggedIndex === -1) return;

  // Remove the dragged goal from array
  const [draggedGoal] = state.goals.splice(draggedIndex, 1);

  if (targetId === null) {
    // Move to end of list
    state.goals.push(draggedGoal);
  } else {
    // Find target index (after removal of dragged)
    let targetIndex = state.goals.findIndex(g => g.id === targetId);
    if (targetIndex === -1) {
      // Target not found, add to end
      state.goals.push(draggedGoal);
    } else {
      // Insert at correct position
      if (!dropAbove) {
        targetIndex++;
      }
      state.goals.splice(targetIndex, 0, draggedGoal);
    }
  }

  // Update order property for all goals
  state.goals.forEach((goal, index) => {
    goal.order = index;
  });

  // Persist to storage
  await saveGoals(state.goals);

  // Re-render the screen
  renderCurrentScreen();
}

/**
 * Capitalize the first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// =============================================================================
// US-020: Manage Goals Screen - Layout
// =============================================================================

/**
 * Get icon SVG for a goal type (for manage screen list)
 * @param {string} type - The goal type
 * @returns {string} SVG HTML string
 */
function getGoalTypeIconSmall(type) {
  switch (type) {
    case GOAL_TYPES.TIMER:
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="manage-goal-type-icon">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>`;
    case GOAL_TYPES.COUNTER:
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="manage-goal-type-icon">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>`;
    case GOAL_TYPES.CHECKBOX:
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="manage-goal-type-icon">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <polyline points="9 11 12 14 22 4"/>
      </svg>`;
    default:
      return '';
  }
}

/**
 * Render the Manage Goals screen
 * US-020: Full layout implementation
 */
function renderManageGoalsScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.MANAGE_GOALS]);
  if (!screen) return;

  // Sort goals by order property, then by createdAt
  const sortedGoals = [...state.goals].sort((a, b) => {
    if (a.order !== b.order) {
      return (a.order || 0) - (b.order || 0);
    }
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  screen.innerHTML = `
    <div class="manage-goals-screen">
      <header class="screen-header manage-goals-header">
        <button class="back-btn" data-screen="${SCREENS.VIEW_GOALS}" title="Back to Goals">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="back-icon">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          <span class="back-label">Back</span>
        </button>
        <h1 class="manage-title">Manage Goals</h1>
        <div class="header-spacer"></div>
      </header>
      <main class="manage-goals-content">
        <div class="manage-goals-actions">
          <button class="btn btn-primary btn-add-goal" id="add-goal-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-icon">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>Add Goal</span>
          </button>
          <button class="btn btn-secondary btn-from-template" id="from-template-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-icon">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            <span>From Template</span>
          </button>
          <button class="btn btn-ghost btn-view-archive" id="view-archive-btn" title="View archived goals">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-icon">
              <polyline points="21 8 21 21 3 21 3 8"/>
              <rect x="1" y="3" width="22" height="5"/>
              <line x1="10" y1="12" x2="14" y2="12"/>
            </svg>
            <span>Archive${state.archivedGoals.length > 0 ? ` (${state.archivedGoals.length})` : ''}</span>
          </button>
        </div>
        <div class="manage-goals-list-container">
          ${sortedGoals.length === 0
            ? renderManageGoalsEmptyState()
            : renderManageGoalsList(sortedGoals)}
        </div>
      </main>
    </div>
  `;

  // Attach navigation event listeners
  attachNavigationListeners(screen);

  // US-058: Attach Add Goal button click listener - navigate to full-page form
  const addGoalBtn = screen.querySelector('#add-goal-btn');
  if (addGoalBtn) {
    addGoalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openGoalFormScreen('add');
    });
  }

  // US-066: Attach From Template button click listener - navigate to template gallery
  const fromTemplateBtn = screen.querySelector('#from-template-btn');
  if (fromTemplateBtn) {
    fromTemplateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showScreen(SCREENS.TEMPLATE_GALLERY);
    });
  }

  // US-069: Attach View Archive button click listener - navigate to archive screen
  const viewArchiveBtn = screen.querySelector('#view-archive-btn');
  if (viewArchiveBtn) {
    viewArchiveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showScreen(SCREENS.ARCHIVE);
    });
  }

  // US-029: Attach Edit/Delete button listeners
  attachManageGoalsListeners(screen);
}

/**
 * Render empty state for Manage Goals screen
 * @returns {string} HTML string for empty state
 */
function renderManageGoalsEmptyState() {
  return `
    <div class="manage-empty-state">
      <div class="manage-empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
          <rect x="8" y="8" width="48" height="48" rx="8" fill="var(--background-secondary)" stroke="var(--border)" stroke-width="2"/>
          <line x1="20" y1="22" x2="44" y2="22" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round"/>
          <line x1="20" y1="32" x2="38" y2="32" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round"/>
          <line x1="20" y1="42" x2="32" y2="42" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <p class="manage-empty-message">No goals to manage yet</p>
      <p class="manage-empty-submessage">Click "Add Goal" above to create your first goal</p>
    </div>
  `;
}

/**
 * Render the goals list for Manage Goals screen
 * @param {Array} goals - Sorted array of goals
 * @returns {string} HTML string for goals list
 */
function renderManageGoalsList(goals) {
  return `
    <div class="manage-goals-list">
      ${goals.map(goal => renderManageGoalItem(goal)).join('')}
    </div>
  `;
}

// =============================================================================
// US-058: Goal Form Screen (Full-Page Add/Edit)
// =============================================================================

/**
 * State for goal form screen
 * @type {Object}
 */
const goalFormState = {
  mode: 'add', // 'add' or 'edit'
  editingGoalId: null
};

/**
 * Open goal form screen for adding or editing a goal
 * @param {string} mode - 'add' for new goal, 'edit' for editing existing
 * @param {Object|null} goal - The goal to edit (null for add mode)
 */
function openGoalFormScreen(mode = 'add', goal = null) {
  goalFormState.mode = mode;
  goalFormState.editingGoalId = goal ? goal.id : null;

  // Navigate to the goal form screen
  showScreen(SCREENS.GOAL_FORM);
}

/**
 * Render the Goal Form screen (full-page add/edit)
 * US-058: Full-page layout with header, form, and footer
 */
function renderGoalFormScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.GOAL_FORM]);
  if (!screen) return;

  const isEditMode = goalFormState.mode === 'edit';
  const editingGoal = isEditMode ? state.goals.find(g => g.id === goalFormState.editingGoalId) : null;

  // If editing but goal not found, go back
  if (isEditMode && !editingGoal) {
    console.error('[GoalForm] Goal not found for editing');
    showScreen(SCREENS.MANAGE_GOALS);
    return;
  }

  const title = isEditMode ? 'Edit Goal' : 'Add New Goal';

  screen.innerHTML = `
    <div class="goal-form-screen">
      <header class="screen-header goal-form-header">
        <button class="back-btn" id="goal-form-back-btn" title="Back to Manage Goals">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="back-icon">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          <span class="back-label">Back</span>
        </button>
        <h1 class="goal-form-title">${title}</h1>
        <div class="header-spacer"></div>
      </header>
      <main class="goal-form-content">
        <form id="goal-form-page" class="goal-form" novalidate>
          <!-- Title Input -->
          <div class="form-group">
            <label for="goal-form-title" class="form-label">Goal Title <span class="required-indicator">*</span></label>
            <input
              type="text"
              id="goal-form-title"
              name="title"
              class="form-input"
              placeholder="e.g., Study for exam"
              required
              maxlength="100"
              autocomplete="off"
            >
            <span class="form-error" id="goal-form-title-error" role="alert" aria-live="polite"></span>
          </div>

          <!-- Type Selector -->
          <div class="form-group">
            <label class="form-label">Goal Type <span class="required-indicator">*</span></label>
            <div class="type-selector" role="radiogroup" aria-label="Select goal type">
              <button type="button" class="type-option active" data-type="timer" role="radio" aria-checked="true" title="Timer - Track time spent on a goal">
                <span class="type-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                <span class="type-option-label">Timer</span>
              </button>
              <button type="button" class="type-option" data-type="counter" role="radio" aria-checked="false" title="Counter - Track a count towards a target">
                <span class="type-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </span>
                <span class="type-option-label">Counter</span>
              </button>
              <button type="button" class="type-option" data-type="checkbox" role="radio" aria-checked="false" title="Checkbox - Simple yes/no completion">
                <span class="type-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <polyline points="9 11 12 14 22 4"/>
                  </svg>
                </span>
                <span class="type-option-label">Checkbox</span>
              </button>
            </div>
            <input type="hidden" id="goal-form-type" name="type" value="timer">
          </div>

          <!-- Timer Target Input -->
          <div class="form-group target-input-group" id="goal-form-timer-target-group">
            <label for="goal-form-timer-hours" class="form-label">Target Time <span class="required-indicator">*</span></label>
            <div class="timer-target-inputs">
              <div class="time-input-field">
                <input
                  type="number"
                  id="goal-form-timer-hours"
                  name="timer-hours"
                  class="form-input time-input"
                  placeholder="0"
                  min="0"
                  max="23"
                  value="1"
                  autocomplete="off"
                >
                <span class="time-input-label">hours</span>
              </div>
              <span class="time-separator">:</span>
              <div class="time-input-field">
                <input
                  type="number"
                  id="goal-form-timer-minutes"
                  name="timer-minutes"
                  class="form-input time-input"
                  placeholder="0"
                  min="0"
                  max="59"
                  value="0"
                  autocomplete="off"
                >
                <span class="time-input-label">minutes</span>
              </div>
            </div>
            <span class="form-error" id="goal-form-timer-error" role="alert" aria-live="polite"></span>
            <p class="form-hint">Set the duration you want to track (e.g., 1 hour 30 minutes)</p>
          </div>

          <!-- Counter Target Input -->
          <div class="form-group target-input-group hidden" id="goal-form-counter-target-group">
            <label for="goal-form-counter-target" class="form-label">Target Count <span class="required-indicator">*</span></label>
            <input
              type="number"
              id="goal-form-counter-target"
              name="counter-target"
              class="form-input counter-target-input"
              placeholder="e.g., 10"
              min="1"
              value="10"
              autocomplete="off"
            >
            <span class="form-error" id="goal-form-counter-error" role="alert" aria-live="polite"></span>
            <p class="form-hint">Set the target count you want to reach (minimum 1)</p>
          </div>

          <!-- Timeframe Selector -->
          <div class="form-group">
            <label class="form-label">Reset Schedule <span class="required-indicator">*</span></label>
            <div class="timeframe-selector" role="radiogroup" aria-label="Select reset schedule">
              <button type="button" class="timeframe-option active" data-timeframe="daily" role="radio" aria-checked="true" title="Goal resets at midnight every day">
                <span class="timeframe-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                </span>
                <span class="timeframe-option-label">Daily</span>
              </button>
              <button type="button" class="timeframe-option" data-timeframe="weekly" role="radio" aria-checked="false" title="Goal resets at midnight on Monday">
                <span class="timeframe-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </span>
                <span class="timeframe-option-label">Weekly</span>
              </button>
              <button type="button" class="timeframe-option" data-timeframe="monthly" role="radio" aria-checked="false" title="Goal resets at midnight on the 1st of each month">
                <span class="timeframe-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                    <text x="12" y="18" text-anchor="middle" font-size="8" font-weight="bold" fill="currentColor" stroke="none">1</text>
                  </svg>
                </span>
                <span class="timeframe-option-label">Monthly</span>
              </button>
              <button type="button" class="timeframe-option" data-timeframe="yearly" role="radio" aria-checked="false" title="Goal resets at midnight on January 1st">
                <span class="timeframe-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 10"/>
                    <path d="M12 2 L12 4"/>
                    <path d="M12 20 L12 22"/>
                  </svg>
                </span>
                <span class="timeframe-option-label">Yearly</span>
              </button>
            </div>
            <input type="hidden" id="goal-form-timeframe" name="timeframe" value="daily">
            <p class="form-hint timeframe-hint" id="goal-form-timeframe-hint">
              <span class="hint-daily">Resets at midnight every day</span>
              <span class="hint-weekly" style="display:none;">Resets at midnight on Monday</span>
              <span class="hint-monthly" style="display:none;">Resets at midnight on the 1st of each month</span>
              <span class="hint-yearly" style="display:none;">Resets at midnight on January 1st</span>
            </p>
          </div>

          <!-- US-065: Category Selector -->
          <div class="form-group">
            <label class="form-label">Category <span class="optional-indicator">(optional)</span></label>
            <div class="category-selector" role="radiogroup" aria-label="Select goal category">
              <button type="button" class="category-option active" data-category="none" role="radio" aria-checked="true" title="No category">
                <span class="category-option-icon"></span>
                <span class="category-option-label">None</span>
              </button>
              ${state.categories.map(cat => `
                <button type="button" class="category-option" data-category="${cat.id}" role="radio" aria-checked="false" title="${cat.name}">
                  <span class="category-option-icon" style="background-color: ${cat.color}"></span>
                  <span class="category-option-label">${cat.name}</span>
                </button>
              `).join('')}
            </div>
            <input type="hidden" id="goal-form-category" name="category" value="">
          </div>

          <!-- US-073: Custom Goal Color -->
          <div class="form-group">
            <label class="form-label">Goal Color <span class="optional-indicator">(optional)</span></label>
            <div class="goal-color-picker" role="radiogroup" aria-label="Select goal color">
              <button type="button" class="color-option active" data-color="none" role="radio" aria-checked="true" title="No custom color">
                <span class="color-option-swatch color-none"></span>
              </button>
              <button type="button" class="color-option" data-color="#F44336" role="radio" aria-checked="false" title="Red">
                <span class="color-option-swatch" style="background-color: #F44336"></span>
              </button>
              <button type="button" class="color-option" data-color="#E91E63" role="radio" aria-checked="false" title="Pink">
                <span class="color-option-swatch" style="background-color: #E91E63"></span>
              </button>
              <button type="button" class="color-option" data-color="#9C27B0" role="radio" aria-checked="false" title="Purple">
                <span class="color-option-swatch" style="background-color: #9C27B0"></span>
              </button>
              <button type="button" class="color-option" data-color="#673AB7" role="radio" aria-checked="false" title="Deep Purple">
                <span class="color-option-swatch" style="background-color: #673AB7"></span>
              </button>
              <button type="button" class="color-option" data-color="#3F51B5" role="radio" aria-checked="false" title="Indigo">
                <span class="color-option-swatch" style="background-color: #3F51B5"></span>
              </button>
              <button type="button" class="color-option" data-color="#2196F3" role="radio" aria-checked="false" title="Blue">
                <span class="color-option-swatch" style="background-color: #2196F3"></span>
              </button>
              <button type="button" class="color-option" data-color="#00BCD4" role="radio" aria-checked="false" title="Cyan">
                <span class="color-option-swatch" style="background-color: #00BCD4"></span>
              </button>
              <button type="button" class="color-option" data-color="#009688" role="radio" aria-checked="false" title="Teal">
                <span class="color-option-swatch" style="background-color: #009688"></span>
              </button>
              <button type="button" class="color-option" data-color="#4CAF50" role="radio" aria-checked="false" title="Green">
                <span class="color-option-swatch" style="background-color: #4CAF50"></span>
              </button>
              <button type="button" class="color-option" data-color="#FF9800" role="radio" aria-checked="false" title="Orange">
                <span class="color-option-swatch" style="background-color: #FF9800"></span>
              </button>
              <button type="button" class="color-option" data-color="#795548" role="radio" aria-checked="false" title="Brown">
                <span class="color-option-swatch" style="background-color: #795548"></span>
              </button>
              <button type="button" class="color-option" data-color="#607D8B" role="radio" aria-checked="false" title="Blue Grey">
                <span class="color-option-swatch" style="background-color: #607D8B"></span>
              </button>
            </div>
            <div class="custom-color-input-group">
              <label for="goal-form-custom-color" class="custom-color-label">Or enter custom hex:</label>
              <div class="custom-color-wrapper">
                <span class="custom-color-hash">#</span>
                <input
                  type="text"
                  id="goal-form-custom-color"
                  name="custom-color"
                  class="form-input custom-color-input"
                  placeholder="FF5733"
                  maxlength="6"
                  pattern="[0-9A-Fa-f]{6}"
                  autocomplete="off"
                >
                <button type="button" class="btn btn-sm custom-color-apply" id="goal-form-apply-custom-color">Apply</button>
              </div>
            </div>
            <input type="hidden" id="goal-form-color" name="color" value="">
          </div>

          <!-- US-074: Goal Notes/Description -->
          <div class="form-group">
            <label for="goal-form-notes" class="form-label">Notes <span class="optional-indicator">(optional)</span></label>
            <textarea
              id="goal-form-notes"
              name="notes"
              class="form-input form-textarea"
              placeholder="Add context, instructions, or motivation for this goal..."
              maxlength="500"
              rows="3"
            ></textarea>
            <div class="notes-char-count">
              <span id="goal-form-notes-count">0</span>/500 characters
            </div>
            <p class="form-hint">Notes will appear on your goal card. Supports **bold** and [links](url).</p>
          </div>
        </form>
      </main>
      <footer class="goal-form-footer">
        <button type="button" class="btn btn-secondary" id="goal-form-cancel-btn">Cancel</button>
        <button type="submit" form="goal-form-page" class="btn btn-primary" id="goal-form-save-btn">Save Goal</button>
      </footer>
    </div>
  `;

  // Attach event listeners
  attachGoalFormScreenListeners(screen, editingGoal);

  // If editing, pre-fill the form
  if (isEditMode && editingGoal) {
    prefillGoalFormScreen(editingGoal);
  }

  // Focus the title input
  const titleInput = screen.querySelector('#goal-form-title');
  if (titleInput) {
    setTimeout(() => titleInput.focus(), 100);
  }

  console.log(`[GoalForm] Rendered in ${goalFormState.mode} mode`);
}

/**
 * Attach event listeners for goal form screen
 * @param {HTMLElement} screen - The screen element
 * @param {Object|null} editingGoal - The goal being edited (null for add mode)
 */
function attachGoalFormScreenListeners(screen, editingGoal) {
  // Back button
  const backBtn = screen.querySelector('#goal-form-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showScreen(SCREENS.MANAGE_GOALS);
    });
  }

  // Cancel button
  const cancelBtn = screen.querySelector('#goal-form-cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showScreen(SCREENS.MANAGE_GOALS);
    });
  }

  // Form submission
  const form = screen.querySelector('#goal-form-page');
  if (form) {
    form.addEventListener('submit', handleGoalFormScreenSubmit);
  }

  // Type selector buttons
  const typeOptions = screen.querySelectorAll('.type-selector .type-option');
  typeOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      const type = option.getAttribute('data-type');
      setGoalFormScreenType(screen, type);
    });

    // Keyboard support
    option.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const type = option.getAttribute('data-type');
        setGoalFormScreenType(screen, type);
      }
    });
  });

  // Timeframe selector buttons
  const timeframeOptions = screen.querySelectorAll('.timeframe-selector .timeframe-option');
  timeframeOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      const timeframe = option.getAttribute('data-timeframe');
      setGoalFormScreenTimeframe(screen, timeframe);
    });

    // Keyboard support
    option.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const timeframe = option.getAttribute('data-timeframe');
        setGoalFormScreenTimeframe(screen, timeframe);
      }
    });
  });

  // US-065: Category selector buttons
  const categoryOptions = screen.querySelectorAll('.category-selector .category-option');
  categoryOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      const category = option.getAttribute('data-category');
      setGoalFormScreenCategory(screen, category);
    });

    // Keyboard support
    option.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const category = option.getAttribute('data-category');
        setGoalFormScreenCategory(screen, category);
      }
    });
  });

  // US-073: Color picker buttons
  const colorOptions = screen.querySelectorAll('.goal-color-picker .color-option');
  colorOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      const color = option.getAttribute('data-color');
      setGoalFormScreenColor(screen, color);
    });

    // Keyboard support
    option.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const color = option.getAttribute('data-color');
        setGoalFormScreenColor(screen, color);
      }
    });
  });

  // US-073: Custom color input
  const customColorInput = screen.querySelector('#goal-form-custom-color');
  const applyCustomColorBtn = screen.querySelector('#goal-form-apply-custom-color');

  if (applyCustomColorBtn && customColorInput) {
    applyCustomColorBtn.addEventListener('click', (e) => {
      e.preventDefault();
      applyCustomColorFromInput(screen, customColorInput);
    });

    // Also apply on Enter key
    customColorInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyCustomColorFromInput(screen, customColorInput);
      }
    });
  }

  // US-074: Notes textarea character count
  const notesTextarea = screen.querySelector('#goal-form-notes');
  const notesCount = screen.querySelector('#goal-form-notes-count');
  if (notesTextarea && notesCount) {
    notesTextarea.addEventListener('input', () => {
      const length = notesTextarea.value.length;
      notesCount.textContent = length;
      // Add warning class if near limit
      if (length >= 450) {
        notesCount.parentElement.classList.add('near-limit');
      } else {
        notesCount.parentElement.classList.remove('near-limit');
      }
    });
  }
}

/**
 * Set the type in the goal form screen
 * @param {HTMLElement} screen - The screen element
 * @param {string} type - The goal type
 */
function setGoalFormScreenType(screen, type) {
  // Update hidden input
  const typeInput = screen.querySelector('#goal-form-type');
  if (typeInput) {
    typeInput.value = type;
  }

  // Update button states
  const typeOptions = screen.querySelectorAll('.type-selector .type-option');
  typeOptions.forEach(option => {
    const isSelected = option.getAttribute('data-type') === type;
    option.classList.toggle('active', isSelected);
    option.setAttribute('aria-checked', isSelected ? 'true' : 'false');
  });

  // Show/hide target input groups
  const timerGroup = screen.querySelector('#goal-form-timer-target-group');
  const counterGroup = screen.querySelector('#goal-form-counter-target-group');

  if (timerGroup && counterGroup) {
    if (type === GOAL_TYPES.TIMER) {
      timerGroup.classList.remove('hidden');
      counterGroup.classList.add('hidden');
    } else if (type === GOAL_TYPES.COUNTER) {
      timerGroup.classList.add('hidden');
      counterGroup.classList.remove('hidden');
    } else {
      // Checkbox - hide both
      timerGroup.classList.add('hidden');
      counterGroup.classList.add('hidden');
    }
  }
}

/**
 * Set the timeframe in the goal form screen
 * @param {HTMLElement} screen - The screen element
 * @param {string} timeframe - The timeframe
 */
function setGoalFormScreenTimeframe(screen, timeframe) {
  // Update hidden input
  const timeframeInput = screen.querySelector('#goal-form-timeframe');
  if (timeframeInput) {
    timeframeInput.value = timeframe;
  }

  // Update button states
  const timeframeOptions = screen.querySelectorAll('.timeframe-selector .timeframe-option');
  timeframeOptions.forEach(option => {
    const isSelected = option.getAttribute('data-timeframe') === timeframe;
    option.classList.toggle('active', isSelected);
    option.setAttribute('aria-checked', isSelected ? 'true' : 'false');
  });

  // Update hint text
  const hintContainer = screen.querySelector('#goal-form-timeframe-hint');
  if (hintContainer) {
    const hints = hintContainer.querySelectorAll('span');
    hints.forEach(hint => {
      hint.style.display = 'none';
    });
    const activeHint = hintContainer.querySelector(`.hint-${timeframe}`);
    if (activeHint) {
      activeHint.style.display = 'inline';
    }
  }
}

/**
 * US-065: Set the category in the goal form screen
 * @param {HTMLElement} screen - The screen element
 * @param {string} category - The category ID (or 'none' for no category)
 */
function setGoalFormScreenCategory(screen, category) {
  // Update hidden input - 'none' means null/empty category
  const categoryInput = screen.querySelector('#goal-form-category');
  if (categoryInput) {
    categoryInput.value = category === 'none' ? '' : category;
  }

  // Update button states
  const categoryOptions = screen.querySelectorAll('.category-selector .category-option');
  categoryOptions.forEach(option => {
    const isSelected = option.getAttribute('data-category') === category;
    option.classList.toggle('active', isSelected);
    option.setAttribute('aria-checked', isSelected ? 'true' : 'false');
  });
}

/**
 * US-073: Set the color in the goal form screen
 * @param {HTMLElement} screen - The screen element
 * @param {string} color - The color hex value (or 'none' for no custom color)
 */
function setGoalFormScreenColor(screen, color) {
  // Update hidden input - 'none' means null/empty color
  const colorInput = screen.querySelector('#goal-form-color');
  if (colorInput) {
    colorInput.value = color === 'none' ? '' : color;
  }

  // Update button states
  const colorOptions = screen.querySelectorAll('.goal-color-picker .color-option');
  colorOptions.forEach(option => {
    const optionColor = option.getAttribute('data-color');
    const isSelected = optionColor === color;
    option.classList.toggle('active', isSelected);
    option.setAttribute('aria-checked', isSelected ? 'true' : 'false');
  });

  // Clear custom color input if selecting a preset
  const customColorInput = screen.querySelector('#goal-form-custom-color');
  if (customColorInput && color !== 'custom') {
    // Only clear if not a custom color (i.e., it's a preset)
    const presetColors = ['none', '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#00BCD4', '#009688', '#4CAF50', '#FF9800', '#795548', '#607D8B'];
    if (presetColors.includes(color)) {
      customColorInput.value = '';
    }
  }
}

/**
 * US-073: Apply custom color from input field
 * @param {HTMLElement} screen - The screen element
 * @param {HTMLInputElement} input - The custom color input element
 */
function applyCustomColorFromInput(screen, input) {
  const value = input.value.trim().toUpperCase();

  // Validate hex color (6 characters, 0-9 and A-F)
  if (!/^[0-9A-F]{6}$/.test(value)) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 500);
    return;
  }

  const color = `#${value}`;

  // Update hidden input
  const colorInput = screen.querySelector('#goal-form-color');
  if (colorInput) {
    colorInput.value = color;
  }

  // Deselect all preset color options
  const colorOptions = screen.querySelectorAll('.goal-color-picker .color-option');
  colorOptions.forEach(option => {
    option.classList.remove('active');
    option.setAttribute('aria-checked', 'false');
  });

  // Mark as custom color applied
  input.classList.add('applied');
  setTimeout(() => input.classList.remove('applied'), 300);
}

/**
 * Pre-fill the goal form screen with existing goal data
 * @param {Object} goal - The goal to pre-fill
 */
function prefillGoalFormScreen(goal) {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.GOAL_FORM]);
  if (!screen || !goal) return;

  // Set title
  const titleInput = screen.querySelector('#goal-form-title');
  if (titleInput) {
    titleInput.value = goal.title || '';
  }

  // Set type
  setGoalFormScreenType(screen, goal.type);

  // Set timeframe
  setGoalFormScreenTimeframe(screen, goal.timeframe);

  // Set timer target (if timer type)
  if (goal.type === GOAL_TYPES.TIMER && goal.target) {
    const hours = Math.floor(goal.target / 3600);
    const minutes = Math.floor((goal.target % 3600) / 60);

    const hoursInput = screen.querySelector('#goal-form-timer-hours');
    const minutesInput = screen.querySelector('#goal-form-timer-minutes');

    if (hoursInput) hoursInput.value = hours;
    if (minutesInput) minutesInput.value = minutes;
  }

  // Set counter target (if counter type)
  if (goal.type === GOAL_TYPES.COUNTER && goal.target) {
    const counterInput = screen.querySelector('#goal-form-counter-target');
    if (counterInput) {
      counterInput.value = goal.target;
    }
  }

  // US-065: Set category
  const categoryValue = goal.category || 'none';
  setGoalFormScreenCategory(screen, categoryValue);

  // US-073: Set color
  if (goal.color) {
    // Check if it's a preset color
    const presetColors = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#00BCD4', '#009688', '#4CAF50', '#FF9800', '#795548', '#607D8B'];
    if (presetColors.includes(goal.color.toUpperCase())) {
      setGoalFormScreenColor(screen, goal.color.toUpperCase());
    } else {
      // It's a custom color - fill in the custom color input
      const customColorInput = screen.querySelector('#goal-form-custom-color');
      if (customColorInput) {
        customColorInput.value = goal.color.replace('#', '').toUpperCase();
      }
      // Update hidden input
      const colorInput = screen.querySelector('#goal-form-color');
      if (colorInput) {
        colorInput.value = goal.color;
      }
      // Deselect all preset color options
      const colorOptions = screen.querySelectorAll('.goal-color-picker .color-option');
      colorOptions.forEach(option => {
        option.classList.remove('active');
        option.setAttribute('aria-checked', 'false');
      });
    }
  } else {
    setGoalFormScreenColor(screen, 'none');
  }

  // US-074: Set notes
  const notesTextarea = screen.querySelector('#goal-form-notes');
  const notesCount = screen.querySelector('#goal-form-notes-count');
  if (notesTextarea) {
    notesTextarea.value = goal.notes || '';
    // Update character count
    if (notesCount) {
      notesCount.textContent = (goal.notes || '').length;
    }
  }
}

/**
 * Handle goal form screen submission
 * @param {Event} e - Submit event
 */
async function handleGoalFormScreenSubmit(e) {
  e.preventDefault();

  const screen = document.getElementById(SCREEN_IDS[SCREENS.GOAL_FORM]);
  if (!screen) return;

  const isEditMode = goalFormState.mode === 'edit';
  const goalId = goalFormState.editingGoalId;

  // Validate title
  const titleInput = screen.querySelector('#goal-form-title');
  const titleError = screen.querySelector('#goal-form-title-error');
  const title = titleInput?.value?.trim() || '';

  if (!title) {
    if (titleInput && titleError) {
      showInputError(titleInput, titleError, 'Goal title is required');
      titleInput.focus();
    }
    return;
  } else if (titleInput && titleError) {
    clearInputError(titleInput, titleError);
  }

  // Get type
  const typeInput = screen.querySelector('#goal-form-type');
  const type = typeInput?.value || GOAL_TYPES.TIMER;

  // Validate and get target based on type
  let target;

  if (type === GOAL_TYPES.TIMER) {
    const hoursInput = screen.querySelector('#goal-form-timer-hours');
    const minutesInput = screen.querySelector('#goal-form-timer-minutes');
    const timerError = screen.querySelector('#goal-form-timer-error');

    const hours = parseInt(hoursInput?.value, 10) || 0;
    const minutes = parseInt(minutesInput?.value, 10) || 0;

    if (hours === 0 && minutes === 0) {
      if (hoursInput && timerError) {
        showInputError(hoursInput, timerError, 'Please set a target time');
        hoursInput.focus();
      }
      return;
    }

    if (hoursInput && timerError) {
      clearInputError(hoursInput, timerError);
    }

    target = (hours * 3600) + (minutes * 60);
  } else if (type === GOAL_TYPES.COUNTER) {
    const counterInput = screen.querySelector('#goal-form-counter-target');
    const counterError = screen.querySelector('#goal-form-counter-error');
    const count = parseInt(counterInput?.value, 10);

    if (!count || count < 1) {
      if (counterInput && counterError) {
        showInputError(counterInput, counterError, 'Please set a target count (minimum 1)');
        counterInput.focus();
      }
      return;
    }

    if (counterInput && counterError) {
      clearInputError(counterInput, counterError);
    }

    target = count;
  } else {
    // Checkbox
    target = 1;
  }

  // Get timeframe
  const timeframeInput = screen.querySelector('#goal-form-timeframe');
  const timeframe = timeframeInput?.value || TIMEFRAMES.DAILY;

  // US-065: Get category (null if 'none' or empty)
  const categoryInput = screen.querySelector('#goal-form-category');
  const category = categoryInput?.value || null;

  // US-073: Get color (null if empty)
  const colorInput = screen.querySelector('#goal-form-color');
  const color = colorInput?.value || null;

  // US-074: Get notes (null if empty, max 500 chars enforced by maxlength)
  const notesTextarea = screen.querySelector('#goal-form-notes');
  const notes = notesTextarea?.value?.trim() || null;

  console.log(`[GoalForm] Submitting in ${isEditMode ? 'edit' : 'add'} mode:`, { title, type, target, timeframe, category, color, notes });

  try {
    if (isEditMode && goalId) {
      // Edit mode: update existing goal
      const success = await updateGoal(goalId, {
        title,
        type,
        target,
        timeframe,
        category,
        color,
        notes
      });

      if (success) {
        // Update the goal in local state
        const goalIndex = state.goals.findIndex(g => g.id === goalId);
        if (goalIndex !== -1) {
          state.goals[goalIndex] = {
            ...state.goals[goalIndex],
            title,
            type,
            target,
            timeframe,
            category,
            color,
            notes
          };
        }
        console.log(`[GoalForm] Goal ${goalId} updated successfully`);
        showSuccessFeedback('Goal updated successfully!');
      } else {
        console.error('[GoalForm] Failed to update goal');
        showFormError('Failed to update goal. Please try again.');
        return;
      }
    } else {
      // Add mode: create new goal
      const newGoal = createGoal({
        title,
        type,
        target,
        timeframe,
        category,
        color,
        notes,
        order: state.goals.length
      });

      // Save to storage
      const updatedGoals = [...state.goals, newGoal];
      const success = await saveGoals(updatedGoals);

      if (success) {
        state.goals = updatedGoals;
        console.log(`[GoalForm] New goal created:`, newGoal);
        showSuccessFeedback('Goal created successfully!');
      } else {
        console.error('[GoalForm] Failed to save new goal');
        showFormError('Failed to save goal. Please try again.');
        return;
      }
    }

    // Navigate back to Manage Goals on success
    showScreen(SCREENS.MANAGE_GOALS);

  } catch (error) {
    console.error('[GoalForm] Error saving goal:', error);
    showFormError('An error occurred while saving. Please try again.');
  }
}

// =============================================================================
// US-066: Template Gallery Screen
// =============================================================================

/**
 * Render the Template Gallery screen
 * Shows built-in and custom templates for quick goal creation
 */
function renderTemplateGalleryScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.TEMPLATE_GALLERY]);
  if (!screen) return;

  // Group templates by category
  const groupedTemplates = groupTemplatesByCategory(state.templates);
  const customTemplates = state.templates.filter(t => !t.isBuiltIn);

  screen.innerHTML = `
    <div class="template-gallery-screen">
      <header class="screen-header template-gallery-header">
        <button class="back-btn" id="template-gallery-back-btn" title="Back to Manage Goals">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="back-icon">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          <span class="back-label">Back</span>
        </button>
        <h1 class="template-gallery-title">Goal Templates</h1>
        <div class="header-spacer"></div>
      </header>
      <main class="template-gallery-content">
        <p class="template-gallery-intro">Choose a template to quickly create a new goal</p>

        ${Object.entries(groupedTemplates).map(([categoryId, templates]) => {
          const category = state.categories.find(c => c.id === categoryId);
          const categoryName = category ? category.name : 'Uncategorized';
          const categoryColor = category ? category.color : 'var(--text-muted)';
          return `
            <div class="template-category-section">
              <h2 class="template-category-title">
                <span class="template-category-dot" style="background-color: ${categoryColor}"></span>
                ${categoryName}
              </h2>
              <div class="template-grid">
                ${templates.map(template => renderTemplateCard(template)).join('')}
              </div>
            </div>
          `;
        }).join('')}

        ${customTemplates.length > 0 ? `
          <div class="template-category-section custom-templates-section">
            <h2 class="template-category-title">
              <span class="template-category-dot" style="background-color: var(--secondary)"></span>
              My Templates
            </h2>
            <div class="template-grid">
              ${customTemplates.map(template => renderTemplateCard(template, true)).join('')}
            </div>
          </div>
        ` : ''}
      </main>
    </div>
  `;

  // Attach event listeners
  attachTemplateGalleryListeners(screen);

  console.log('[TemplateGallery] Rendered with', state.templates.length, 'templates');
}

/**
 * Group templates by category
 * @param {Array} templates - Array of template objects
 * @returns {Object} Templates grouped by category ID
 */
function groupTemplatesByCategory(templates) {
  const builtInTemplates = templates.filter(t => t.isBuiltIn);
  const grouped = {};

  builtInTemplates.forEach(template => {
    const categoryId = template.category || 'uncategorized';
    if (!grouped[categoryId]) {
      grouped[categoryId] = [];
    }
    grouped[categoryId].push(template);
  });

  return grouped;
}

/**
 * Render a single template card
 * @param {Object} template - The template object
 * @param {boolean} isCustom - Whether this is a custom (user-created) template
 * @returns {string} HTML string for the template card
 */
function renderTemplateCard(template, isCustom = false) {
  const typeIcon = getGoalTypeIcon(template.type);
  const targetDisplay = formatTemplateTarget(template);
  const category = state.categories.find(c => c.id === template.category);

  return `
    <div class="template-card ${isCustom ? 'custom-template' : ''}" data-template-id="${template.id}">
      <div class="template-card-header">
        <span class="template-type-icon">${typeIcon}</span>
        <h3 class="template-title">${escapeHtml(template.title)}</h3>
      </div>
      <div class="template-card-body">
        <div class="template-details">
          <span class="template-target">${targetDisplay}</span>
          <span class="template-timeframe">${capitalizeFirst(template.timeframe)}</span>
        </div>
      </div>
      <div class="template-card-actions">
        <button class="btn btn-sm btn-primary template-use-btn" data-template-id="${template.id}" title="Create goal from this template">
          Use Template
        </button>
        ${isCustom ? `
          <button class="btn btn-sm btn-ghost template-delete-btn" data-template-id="${template.id}" title="Delete template">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Format template target for display
 * @param {Object} template - The template object
 * @returns {string} Formatted target string
 */
function formatTemplateTarget(template) {
  switch (template.type) {
    case GOAL_TYPES.TIMER:
      const hours = Math.floor(template.target / 3600);
      const minutes = Math.floor((template.target % 3600) / 60);
      if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`;
      } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      } else {
        return `${minutes} min`;
      }
    case GOAL_TYPES.COUNTER:
      return `Target: ${template.target.toLocaleString()}`;
    case GOAL_TYPES.CHECKBOX:
      return 'Complete once';
    default:
      return '';
  }
}

/**
 * Attach event listeners for template gallery
 * @param {HTMLElement} screen - The screen element
 */
function attachTemplateGalleryListeners(screen) {
  // Back button
  const backBtn = screen.querySelector('#template-gallery-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showScreen(SCREENS.MANAGE_GOALS);
    });
  }

  // Use template buttons
  const useButtons = screen.querySelectorAll('.template-use-btn');
  useButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const templateId = btn.getAttribute('data-template-id');
      if (templateId) {
        await createGoalFromTemplate(templateId);
      }
    });
  });

  // Delete template buttons (for custom templates)
  const deleteButtons = screen.querySelectorAll('.template-delete-btn');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const templateId = btn.getAttribute('data-template-id');
      if (templateId) {
        await handleDeleteTemplate(templateId);
      }
    });
  });
}

/**
 * Create a goal from a template
 * @param {string} templateId - The template ID
 */
async function createGoalFromTemplate(templateId) {
  const template = state.templates.find(t => t.id === templateId);
  if (!template) {
    console.error('[Template] Template not found:', templateId);
    showFormError('Template not found. Please try again.');
    return;
  }

  console.log('[Template] Creating goal from template:', template.title);

  try {
    // Create new goal from template
    const newGoal = createGoal({
      title: template.title,
      type: template.type,
      target: template.target,
      timeframe: template.timeframe,
      category: template.category,
      order: state.goals.length
    });

    // Save to storage
    const updatedGoals = [...state.goals, newGoal];
    const success = await saveGoals(updatedGoals);

    if (success) {
      state.goals = updatedGoals;
      console.log('[Template] Goal created from template:', newGoal);
      showSuccessFeedback(`Goal "${template.title}" created!`);
      // Navigate to Manage Goals to see the new goal
      showScreen(SCREENS.MANAGE_GOALS);
    } else {
      console.error('[Template] Failed to save new goal');
      showFormError('Failed to create goal. Please try again.');
    }
  } catch (error) {
    console.error('[Template] Error creating goal from template:', error);
    showFormError('An error occurred. Please try again.');
  }
}

/**
 * Handle deleting a custom template
 * @param {string} templateId - The template ID to delete
 */
async function handleDeleteTemplate(templateId) {
  const template = state.templates.find(t => t.id === templateId);
  if (!template) return;

  // Confirm deletion
  if (!confirm(`Delete the "${template.title}" template? This cannot be undone.`)) {
    return;
  }

  console.log('[Template] Deleting template:', templateId);

  try {
    const success = await deleteTemplate(templateId);
    if (success) {
      // Update local state
      state.templates = state.templates.filter(t => t.id !== templateId);
      console.log('[Template] Template deleted successfully');
      showSuccessFeedback('Template deleted');
      // Re-render the screen
      renderTemplateGalleryScreen();
    } else {
      showFormError('Failed to delete template. Please try again.');
    }
  } catch (error) {
    console.error('[Template] Error deleting template:', error);
    showFormError('An error occurred. Please try again.');
  }
}

/**
 * Handle saving a goal as a template
 * @param {string} goalId - The goal ID to save as template
 */
async function handleSaveAsTemplate(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) {
    console.error('[Template] Goal not found:', goalId);
    showFormError('Goal not found. Please try again.');
    return;
  }

  console.log('[Template] Saving goal as template:', goal.title);

  try {
    // Create template from goal
    const templateData = {
      title: goal.title,
      type: goal.type,
      target: goal.target,
      timeframe: goal.timeframe,
      category: goal.category
    };

    const success = await addTemplate(templateData);

    if (success) {
      // Reload templates to update state
      state.templates = await getTemplates();
      console.log('[Template] Goal saved as template:', goal.title);
      showSuccessFeedback(`"${goal.title}" saved as template!`);
    } else {
      showFormError('Failed to save template. Please try again.');
    }
  } catch (error) {
    console.error('[Template] Error saving goal as template:', error);
    showFormError('An error occurred. Please try again.');
  }
}

// =============================================================================
// US-069: Goal Archive System
// =============================================================================

/**
 * Handle archiving a goal
 * @param {string} goalId - The goal ID to archive
 */
async function handleArchiveGoal(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) {
    console.error('[Archive] Goal not found:', goalId);
    showFormError('Goal not found. Please try again.');
    return;
  }

  console.log('[Archive] Archiving goal:', goal.title);

  try {
    const success = await archiveGoal(goalId);

    if (success) {
      // Update local state
      state.goals = state.goals.filter(g => g.id !== goalId);
      state.archivedGoals = await getArchivedGoals();

      console.log('[Archive] Goal archived successfully:', goal.title);
      showSuccessFeedback(`"${goal.title}" archived!`);

      // Re-render the manage goals screen
      renderManageGoalsScreen();
    } else {
      showFormError('Failed to archive goal. Please try again.');
    }
  } catch (error) {
    console.error('[Archive] Error archiving goal:', error);
    showFormError('An error occurred. Please try again.');
  }
}

/**
 * Handle restoring an archived goal
 * @param {string} goalId - The archived goal ID to restore
 */
async function handleRestoreArchivedGoal(goalId) {
  const archivedGoal = state.archivedGoals.find(g => g.id === goalId);
  if (!archivedGoal) {
    console.error('[Archive] Archived goal not found:', goalId);
    showFormError('Goal not found. Please try again.');
    return;
  }

  console.log('[Archive] Restoring archived goal:', archivedGoal.title);

  try {
    const success = await restoreArchivedGoal(goalId);

    if (success) {
      // Update local state
      state.archivedGoals = state.archivedGoals.filter(g => g.id !== goalId);
      state.goals = await getGoals();

      console.log('[Archive] Goal restored successfully:', archivedGoal.title);
      showSuccessFeedback(`"${archivedGoal.title}" restored!`);

      // Re-render the archive screen
      renderArchiveScreen();
    } else {
      showFormError('Failed to restore goal. Please try again.');
    }
  } catch (error) {
    console.error('[Archive] Error restoring goal:', error);
    showFormError('An error occurred. Please try again.');
  }
}

/**
 * Handle permanently deleting an archived goal
 * @param {string} goalId - The archived goal ID to delete permanently
 */
async function handleDeleteArchivedGoal(goalId) {
  const archivedGoal = state.archivedGoals.find(g => g.id === goalId);
  if (!archivedGoal) {
    console.error('[Archive] Archived goal not found:', goalId);
    showFormError('Goal not found. Please try again.');
    return;
  }

  console.log('[Archive] Permanently deleting archived goal:', archivedGoal.title);

  try {
    const success = await deleteArchivedGoal(goalId);

    if (success) {
      // Update local state
      state.archivedGoals = state.archivedGoals.filter(g => g.id !== goalId);

      console.log('[Archive] Goal permanently deleted:', archivedGoal.title);
      showSuccessFeedback(`"${archivedGoal.title}" permanently deleted.`);

      // Re-render the archive screen
      renderArchiveScreen();
    } else {
      showFormError('Failed to delete goal. Please try again.');
    }
  } catch (error) {
    console.error('[Archive] Error deleting archived goal:', error);
    showFormError('An error occurred. Please try again.');
  }
}

/**
 * Render the Archive screen
 * US-069: Shows archived goals with restore and delete options
 */
function renderArchiveScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.ARCHIVE]);
  if (!screen) return;

  const archivedGoals = state.archivedGoals || [];

  screen.innerHTML = `
    <div class="archive-screen">
      <header class="screen-header archive-header">
        <button class="back-btn" data-screen="${SCREENS.MANAGE_GOALS}" title="Back to Manage Goals">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="back-icon">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          <span class="back-label">Back</span>
        </button>
        <h1 class="archive-title">Archived Goals</h1>
        <div class="header-spacer"></div>
      </header>
      <main class="archive-content">
        ${archivedGoals.length === 0
          ? renderArchiveEmptyState()
          : renderArchivedGoalsList(archivedGoals)}
      </main>
    </div>
  `;

  // Attach navigation event listeners
  attachNavigationListeners(screen);

  // Attach archive action listeners
  attachArchiveListeners(screen);
}

/**
 * Render empty state for Archive screen
 * @returns {string} HTML string for empty state
 */
function renderArchiveEmptyState() {
  return `
    <div class="archive-empty-state">
      <div class="archive-empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
          <rect x="6" y="14" width="52" height="44" rx="4" fill="var(--background-secondary)" stroke="var(--border)" stroke-width="2"/>
          <rect x="2" y="6" width="60" height="12" rx="2" fill="var(--background-secondary)" stroke="var(--border)" stroke-width="2"/>
          <line x1="26" y1="32" x2="38" y2="32" stroke="var(--text-muted)" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </div>
      <p class="archive-empty-message">No archived goals</p>
      <p class="archive-empty-submessage">Archive goals you want to keep but don't need active right now</p>
    </div>
  `;
}

/**
 * Render the archived goals list
 * @param {Array} archivedGoals - Array of archived goal objects
 * @returns {string} HTML string for the list
 */
function renderArchivedGoalsList(archivedGoals) {
  // Sort by archivedAt date, most recent first
  const sortedGoals = [...archivedGoals].sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));

  return `
    <div class="archived-goals-list">
      ${sortedGoals.map(goal => renderArchivedGoalItem(goal)).join('')}
    </div>
  `;
}

/**
 * Render a single archived goal item
 * @param {Object} goal - The archived goal object
 * @returns {string} HTML string for the goal item
 */
function renderArchivedGoalItem(goal) {
  const typeIcon = getGoalTypeIconSmall(goal.type);
  const typeLabel = getGoalTypeLabel(goal.type);
  const targetDisplay = formatTargetForManage(goal);
  const archivedDate = goal.archivedAt ? formatArchivedDate(goal.archivedAt) : 'Unknown date';

  return `
    <div class="archived-goal-item" data-goal-id="${goal.id}">
      <div class="archived-goal-info">
        <div class="archived-goal-type-indicator type-${goal.type}" title="${typeLabel}">
          ${typeIcon}
        </div>
        <div class="archived-goal-details">
          <span class="archived-goal-title">${escapeHtml(goal.title)}</span>
          <div class="archived-goal-meta">
            <span class="archived-goal-timeframe timeframe-${goal.timeframe}">${capitalizeFirst(goal.timeframe)}</span>
            <span class="archived-goal-target">${targetDisplay}</span>
            <span class="archived-goal-date">Archived ${archivedDate}</span>
          </div>
        </div>
      </div>
      <div class="archived-goal-actions">
        <button class="manage-action-btn restore-btn" data-action="restore" data-goal-id="${goal.id}" title="Restore goal" aria-label="Restore ${escapeHtml(goal.title)}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="action-icon">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
        </button>
        <button class="manage-action-btn delete-archived-btn" data-action="delete-archived" data-goal-id="${goal.id}" title="Delete permanently" aria-label="Permanently delete ${escapeHtml(goal.title)}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="action-icon">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

/**
 * Format archived date for display
 * @param {number} timestamp - The archived timestamp
 * @returns {string} Formatted date string
 */
function formatArchivedDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'today';
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

/**
 * Attach event listeners for Archive screen actions
 * @param {HTMLElement} container - The container element
 */
function attachArchiveListeners(container) {
  // Restore button click handlers
  const restoreButtons = container.querySelectorAll('[data-action="restore"]');
  restoreButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        await handleRestoreArchivedGoal(goalId);
      }
    });
  });

  // Delete permanently button click handlers
  const deleteButtons = container.querySelectorAll('[data-action="delete-archived"]');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        // Show confirmation before permanent deletion
        if (confirm('Are you sure you want to permanently delete this goal? This cannot be undone.')) {
          await handleDeleteArchivedGoal(goalId);
        }
      }
    });
  });
}

// =============================================================================
// US-071: Individual Goal Statistics
// =============================================================================

/**
 * Open the Goal Statistics screen for a specific goal
 * @param {string} goalId - The ID of the goal to view statistics for
 */
function openGoalStatistics(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) {
    console.error('[GoalStatistics] Goal not found:', goalId);
    return;
  }

  state.statisticsGoalId = goalId;
  showScreen(SCREENS.GOAL_STATISTICS);
  console.log('[GoalStatistics] Viewing statistics for goal:', goal.title);
}

/**
 * Render the Goal Statistics screen
 * Shows detailed statistics for a single goal
 */
function renderGoalStatisticsScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.GOAL_STATISTICS]);
  if (!screen) return;

  const goal = state.goals.find(g => g.id === state.statisticsGoalId);
  if (!goal) {
    console.error('[GoalStatistics] Goal not found for statistics, returning to view goals');
    showScreen(SCREENS.VIEW_GOALS);
    return;
  }

  const typeIcon = getGoalTypeIcon(goal.type);
  const categoryInfo = goal.category ? state.categories.find(c => c.id === goal.category) : null;

  screen.innerHTML = `
    <div class="goal-statistics-screen">
      <header class="screen-header goal-statistics-header">
        <button class="back-btn" data-screen="${SCREENS.VIEW_GOALS}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="back-icon">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span class="back-label">Back</span>
        </button>
        <h1 class="goal-statistics-title">Goal Statistics</h1>
        <div class="header-spacer"></div>
      </header>
      <main class="goal-statistics-content">
        <!-- Goal Info Section -->
        <section class="goal-statistics-section goal-info-section">
          <div class="goal-info-card">
            <div class="goal-info-header">
              <span class="goal-type-indicator type-${goal.type}">${typeIcon}</span>
              <h2 class="goal-info-title">${escapeHtml(goal.title)}</h2>
            </div>
            <div class="goal-info-badges">
              ${categoryInfo ? `<span class="goal-category-badge" style="background-color: ${categoryInfo.light}; color: ${categoryInfo.color}"><span class="category-color-dot" style="background-color: ${categoryInfo.color}"></span>${categoryInfo.name}</span>` : ''}
              <span class="goal-timeframe-badge timeframe-${goal.timeframe}">${capitalizeFirst(goal.timeframe)}</span>
            </div>
          </div>
        </section>

        <!-- Key Stats Cards -->
        <section class="goal-statistics-section key-stats-section">
          <h3 class="section-title">Key Statistics</h3>
          <div class="goal-stats-cards">
            <div class="goal-stat-card completion-rate-card">
              <div class="goal-stat-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div class="goal-stat-content">
                <span class="goal-stat-value" id="goal-completion-rate">--</span>
                <span class="goal-stat-label">Completion Rate</span>
              </div>
            </div>
            <div class="goal-stat-card best-streak-card">
              <div class="goal-stat-icon streak-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                </svg>
              </div>
              <div class="goal-stat-content">
                <span class="goal-stat-value" id="goal-best-streak">--</span>
                <span class="goal-stat-label">Best Streak</span>
              </div>
            </div>
            <div class="goal-stat-card total-accumulated-card">
              <div class="goal-stat-icon total-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                  <polyline points="17 6 23 6 23 12"/>
                </svg>
              </div>
              <div class="goal-stat-content">
                <span class="goal-stat-value" id="goal-total-accumulated">--</span>
                <span class="goal-stat-label">Total ${goal.type === 'timer' ? 'Time' : goal.type === 'counter' ? 'Count' : 'Completions'}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Comparison to Average -->
        <section class="goal-statistics-section average-section">
          <h3 class="section-title">Comparison</h3>
          <div class="comparison-card">
            <div class="comparison-item">
              <span class="comparison-label">Your average daily progress</span>
              <span class="comparison-value" id="goal-avg-progress">--</span>
            </div>
            <div class="comparison-item">
              <span class="comparison-label">Days tracked</span>
              <span class="comparison-value" id="goal-days-tracked">--</span>
            </div>
          </div>
        </section>

        <!-- 30-Day Progress Chart -->
        <section class="goal-statistics-section chart-section">
          <h3 class="section-title">Last 30 Days</h3>
          <div class="goal-progress-chart" id="goal-progress-chart">
            <div class="progress-chart-bars" id="progress-chart-bars">
              <!-- Bars will be rendered dynamically -->
            </div>
            <div class="progress-chart-labels" id="progress-chart-labels">
              <!-- Labels will be rendered dynamically -->
            </div>
          </div>
          <div class="chart-legend">
            <span class="legend-item">
              <span class="legend-color completed"></span>
              <span class="legend-text">Completed</span>
            </span>
            <span class="legend-item">
              <span class="legend-color partial"></span>
              <span class="legend-text">Partial</span>
            </span>
            <span class="legend-item">
              <span class="legend-color missed"></span>
              <span class="legend-text">Not started</span>
            </span>
          </div>
        </section>
      </main>
    </div>
  `;

  // Attach navigation event listeners
  attachNavigationListeners(screen);

  // Update stats with calculated data
  updateGoalStatistics(goal.id);
}

/**
 * Calculate and display statistics for a specific goal
 * @param {string} goalId - The ID of the goal
 */
async function updateGoalStatistics(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return;

  // Get history data for this goal
  const history = await getHistory();
  const goalHistory = filterHistoryByGoalId(history, goalId);

  // Calculate completion rate
  const completionRate = calculateGoalCompletionRate(goalHistory, goal);
  const completionRateEl = document.getElementById('goal-completion-rate');
  if (completionRateEl) {
    completionRateEl.textContent = completionRate !== null ? `${Math.round(completionRate)}%` : '--';
    // Color coding based on rate
    if (completionRate !== null) {
      completionRateEl.classList.remove('rate-excellent', 'rate-good', 'rate-moderate', 'rate-low');
      if (completionRate >= 80) {
        completionRateEl.classList.add('rate-excellent');
      } else if (completionRate >= 60) {
        completionRateEl.classList.add('rate-good');
      } else if (completionRate >= 40) {
        completionRateEl.classList.add('rate-moderate');
      } else {
        completionRateEl.classList.add('rate-low');
      }
    }
  }

  // Calculate best streak for this goal
  const bestStreak = calculateGoalBestStreak(goalHistory, goal);
  const bestStreakEl = document.getElementById('goal-best-streak');
  if (bestStreakEl) {
    bestStreakEl.textContent = bestStreak > 0 ? `${bestStreak} days` : '--';
  }

  // Calculate total accumulated
  const totalAccumulated = calculateGoalTotalAccumulated(goalHistory, goal);
  const totalAccumulatedEl = document.getElementById('goal-total-accumulated');
  if (totalAccumulatedEl) {
    totalAccumulatedEl.textContent = formatTotalAccumulated(totalAccumulated, goal.type);
  }

  // Calculate average daily progress
  const avgProgress = calculateGoalAverageProgress(goalHistory, goal);
  const avgProgressEl = document.getElementById('goal-avg-progress');
  if (avgProgressEl) {
    avgProgressEl.textContent = formatAverageProgress(avgProgress, goal);
  }

  // Calculate days tracked
  const daysTracked = goalHistory.length;
  const daysTrackedEl = document.getElementById('goal-days-tracked');
  if (daysTrackedEl) {
    daysTrackedEl.textContent = daysTracked > 0 ? `${daysTracked} days` : '--';
  }

  // Render 30-day progress chart
  renderGoal30DayChart(goalHistory, goal);
}

/**
 * Calculate completion rate for a specific goal
 * @param {Array} goalHistory - History entries for this goal
 * @param {Object} goal - The goal object
 * @returns {number|null} Completion rate (0-100) or null if no data
 */
function calculateGoalCompletionRate(goalHistory, goal) {
  if (goalHistory.length === 0) return null;

  const completed = goalHistory.filter(entry => entry.completed).length;
  return (completed / goalHistory.length) * 100;
}

/**
 * Calculate best streak for a specific goal
 * @param {Array} goalHistory - History entries for this goal (sorted by date)
 * @param {Object} goal - The goal object
 * @returns {number} Best consecutive completion streak
 */
function calculateGoalBestStreak(goalHistory, goal) {
  if (goalHistory.length === 0) return 0;

  // Sort by date ascending
  const sortedHistory = [...goalHistory].sort((a, b) => a.date.localeCompare(b.date));

  let bestStreak = 0;
  let currentStreak = 0;
  let lastDate = null;

  for (const entry of sortedHistory) {
    if (entry.completed) {
      // Check if this is consecutive to the last completed day
      if (lastDate) {
        const lastDateObj = new Date(lastDate);
        const currentDateObj = new Date(entry.date);
        const dayDiff = Math.floor((currentDateObj - lastDateObj) / (1000 * 60 * 60 * 24));

        if (dayDiff === 1) {
          // Consecutive day
          currentStreak++;
        } else {
          // Gap in days, start new streak
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }

      lastDate = entry.date;

      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
    } else {
      // Incomplete day breaks the streak
      currentStreak = 0;
      lastDate = entry.date;
    }
  }

  // Check if current goal is complete today and continues a streak
  const today = getTodayDateString();
  const todayInHistory = goalHistory.find(h => h.date === today);

  if (!todayInHistory && isGoalCompleted(goal)) {
    // Today is not in history yet but goal is complete
    if (lastDate) {
      const lastDateObj = new Date(lastDate);
      const todayObj = new Date(today);
      const dayDiff = Math.floor((todayObj - lastDateObj) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1 && sortedHistory.length > 0 && sortedHistory[sortedHistory.length - 1].completed) {
        currentStreak++;
        if (currentStreak > bestStreak) {
          bestStreak = currentStreak;
        }
      } else if (dayDiff <= 1) {
        bestStreak = Math.max(bestStreak, 1);
      }
    } else {
      bestStreak = Math.max(bestStreak, 1);
    }
  }

  return bestStreak;
}

/**
 * Calculate total accumulated progress for a specific goal
 * @param {Array} goalHistory - History entries for this goal
 * @param {Object} goal - The goal object
 * @returns {number} Total accumulated value
 */
function calculateGoalTotalAccumulated(goalHistory, goal) {
  // Sum up all progress from history
  const historyTotal = goalHistory.reduce((sum, entry) => sum + entry.progress, 0);

  // Add current progress if not yet in history for today
  const today = getTodayDateString();
  const todayInHistory = goalHistory.find(h => h.date === today);

  if (!todayInHistory) {
    return historyTotal + goal.progress;
  }

  return historyTotal;
}

/**
 * Calculate average daily progress for a specific goal
 * @param {Array} goalHistory - History entries for this goal
 * @param {Object} goal - The goal object
 * @returns {number} Average daily progress
 */
function calculateGoalAverageProgress(goalHistory, goal) {
  if (goalHistory.length === 0) {
    return goal.progress > 0 ? goal.progress : 0;
  }

  const totalProgress = goalHistory.reduce((sum, entry) => sum + entry.progress, 0);
  return totalProgress / goalHistory.length;
}

/**
 * Format total accumulated value based on goal type
 * @param {number} total - Total accumulated value
 * @param {string} type - Goal type
 * @returns {string} Formatted string
 */
function formatTotalAccumulated(total, type) {
  if (total === 0) return '--';

  switch (type) {
    case 'timer':
      // Format as hours and minutes
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    case 'counter':
      return total.toLocaleString();
    case 'checkbox':
      return `${total}x`;
    default:
      return total.toString();
  }
}

/**
 * Format average progress based on goal type
 * @param {number} avg - Average progress
 * @param {Object} goal - Goal object
 * @returns {string} Formatted string
 */
function formatAverageProgress(avg, goal) {
  if (avg === 0) return '--';

  switch (goal.type) {
    case 'timer':
      // Format as hours and minutes
      const hours = Math.floor(avg / 3600);
      const minutes = Math.floor((avg % 3600) / 60);
      if (hours > 0) {
        return `${hours}h ${minutes}m / day`;
      }
      return `${minutes}m / day`;
    case 'counter':
      return `${Math.round(avg * 10) / 10} / day`;
    case 'checkbox':
      return `${Math.round(avg * 100)}% / day`;
    default:
      return `${Math.round(avg * 10) / 10} / day`;
  }
}

/**
 * Render the 30-day progress chart for a specific goal
 * @param {Array} goalHistory - History entries for this goal
 * @param {Object} goal - The goal object
 */
function renderGoal30DayChart(goalHistory, goal) {
  const barsContainer = document.getElementById('progress-chart-bars');
  const labelsContainer = document.getElementById('progress-chart-labels');

  if (!barsContainer || !labelsContainer) return;

  // Generate data for last 30 days
  const chartData = [];
  const today = getTodayDateString();

  // Create a map of date -> history entry
  const historyByDate = {};
  goalHistory.forEach(entry => {
    historyByDate[entry.date] = entry;
  });

  // Generate 30 days of data
  for (let i = 29; i >= 0; i--) {
    const dateStr = getDateStringDaysAgo(i);
    const date = new Date(dateStr);
    const dayOfMonth = date.getDate();
    const isToday = dateStr === today;

    let progress = 0;
    let target = goal.target;
    let completed = false;
    let hasData = false;

    if (dateStr === today) {
      // Use current goal data for today
      progress = goal.progress;
      completed = isGoalCompleted(goal);
      hasData = progress > 0 || completed;
    } else if (historyByDate[dateStr]) {
      // Use history data
      const entry = historyByDate[dateStr];
      progress = entry.progress;
      target = entry.target;
      completed = entry.completed;
      hasData = true;
    }

    const percentage = target > 0 ? Math.min(100, (progress / target) * 100) : 0;

    chartData.push({
      date: dateStr,
      dayOfMonth,
      progress,
      target,
      percentage,
      completed,
      hasData,
      isToday
    });
  }

  // Render bars
  barsContainer.innerHTML = chartData.map(day => {
    const barHeight = day.hasData ? Math.max(5, day.percentage) : 0;

    let barClass = 'progress-bar';
    if (day.completed) {
      barClass += ' bar-completed';
    } else if (day.hasData && day.percentage > 0) {
      barClass += ' bar-partial';
    } else {
      barClass += ' bar-missed';
    }

    if (day.isToday) {
      barClass += ' bar-today';
    }

    const tooltipText = day.hasData
      ? `${day.date}: ${Math.round(day.percentage)}%${day.completed ? ' (Completed)' : ''}`
      : `${day.date}: No data`;

    return `
      <div class="progress-bar-container" title="${tooltipText}">
        <div class="${barClass}" style="height: ${barHeight}%"></div>
      </div>
    `;
  }).join('');

  // Render labels (show every 5th day and today)
  labelsContainer.innerHTML = chartData.map((day, index) => {
    // Show label for: first day, every 7th day, and today
    const showLabel = index === 0 || (index + 1) % 7 === 0 || day.isToday;

    return `<span class="progress-chart-label ${showLabel ? '' : 'hidden'} ${day.isToday ? 'label-today' : ''}">${day.dayOfMonth}</span>`;
  }).join('');
}

// =============================================================================
// US-072: Weekly Review Screen
// =============================================================================

/**
 * Render the Weekly Review screen
 * Shows a comprehensive summary of the user's weekly accomplishments
 */
function renderWeeklyReviewScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.WEEKLY_REVIEW]);
  if (!screen) return;

  // Get current streak data
  const currentStreak = state.streakData?.currentStreak || 0;
  const bestStreak = state.streakData?.bestStreak || 0;

  screen.innerHTML = `
    <div class="weekly-review-screen">
      <header class="screen-header weekly-review-header">
        <button class="back-btn" data-screen="${SCREENS.REPORTS}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="back-icon">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span class="back-label">Back</span>
        </button>
        <h1 class="weekly-review-title">Weekly Review</h1>
        <div class="header-spacer"></div>
      </header>
      <main class="weekly-review-content">
        <!-- Week Summary Header -->
        <section class="weekly-review-section summary-header-section">
          <div class="week-date-range" id="week-date-range">
            <!-- Week date range will be populated dynamically -->
          </div>
        </section>

        <!-- Goals Completed Section -->
        <section class="weekly-review-section completions-section">
          <h2 class="section-title">Goals Completed</h2>
          <div class="completions-card">
            <div class="completions-display">
              <span class="completions-value" id="weekly-completions-value">--</span>
              <span class="completions-label">/ <span id="weekly-completions-total">--</span></span>
            </div>
            <div class="completions-rate" id="weekly-completions-rate">--% completion rate</div>
          </div>
        </section>

        <!-- Time Tracked Section -->
        <section class="weekly-review-section time-section">
          <h2 class="section-title">Total Time Tracked</h2>
          <div class="time-card">
            <div class="time-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div class="time-display" id="weekly-time-display">-- hr -- min</div>
          </div>
        </section>

        <!-- Streaks Section -->
        <section class="weekly-review-section streaks-section">
          <h2 class="section-title">Streaks</h2>
          <div class="streak-cards-row">
            <div class="streak-card-mini ${currentStreak > 0 ? 'active' : ''}">
              <div class="streak-icon">🔥</div>
              <div class="streak-info">
                <span class="streak-value">${currentStreak}</span>
                <span class="streak-label">Current</span>
              </div>
            </div>
            <div class="streak-card-mini best">
              <div class="streak-icon">⭐</div>
              <div class="streak-info">
                <span class="streak-value">${bestStreak}</span>
                <span class="streak-label">Best</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Goals Performance Section -->
        <section class="weekly-review-section performance-section">
          <h2 class="section-title">Goal Performance</h2>
          <div class="performance-cards" id="performance-cards">
            <!-- Best/Worst performing goals will be populated dynamically -->
          </div>
        </section>

        <!-- Daily Breakdown Section -->
        <section class="weekly-review-section breakdown-section">
          <h2 class="section-title">Daily Breakdown</h2>
          <div class="daily-breakdown" id="daily-breakdown">
            <!-- Daily completion bars will be populated dynamically -->
          </div>
        </section>

        <!-- Comparison to Previous Week -->
        <section class="weekly-review-section comparison-section">
          <h2 class="section-title">vs. Previous Week</h2>
          <div class="comparison-card" id="comparison-card">
            <!-- Week-over-week comparison will be populated dynamically -->
          </div>
        </section>
      </main>
    </div>
  `;

  // Attach navigation event listeners
  attachNavigationListeners(screen);

  // Update with calculated data
  updateWeeklyReviewStats();
}

/**
 * Update the Weekly Review screen with calculated statistics
 */
async function updateWeeklyReviewStats() {
  const history = await getHistory();
  const activityLog = await getActivityLog();

  // Calculate week date range
  updateWeekDateRange();

  // Calculate and display weekly completions
  const weekStats = calculateWeekCompletionStats(history, state.goals);
  updateWeeklyCompletions(weekStats);

  // Calculate and display total time tracked this week
  updateWeeklyTimeTracked(activityLog);

  // Calculate and display goal performance (best/worst)
  updateGoalPerformance(history);

  // Render daily breakdown chart
  renderDailyBreakdown(history, state.goals);

  // Calculate and display comparison to previous week
  updateWeekComparison(history);
}

/**
 * Update the week date range display
 */
function updateWeekDateRange() {
  const dateRangeEl = document.getElementById('week-date-range');
  if (!dateRangeEl) return;

  const weekStart = getWeekStartDateString();
  const today = getTodayDateString();

  const startDate = new Date(weekStart + 'T00:00:00');
  const endDate = new Date(today + 'T00:00:00');

  const formatDate = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  dateRangeEl.innerHTML = `
    <span class="week-range-label">📅 ${formatDate(startDate)} - ${formatDate(endDate)}</span>
  `;
}

/**
 * Update the weekly completions display
 * @param {Object} weekStats - Object with completed and total counts
 */
function updateWeeklyCompletions(weekStats) {
  const completionsValueEl = document.getElementById('weekly-completions-value');
  const completionsTotalEl = document.getElementById('weekly-completions-total');
  const completionsRateEl = document.getElementById('weekly-completions-rate');

  if (completionsValueEl) {
    completionsValueEl.textContent = weekStats.completed;
  }

  if (completionsTotalEl) {
    completionsTotalEl.textContent = weekStats.total;
  }

  if (completionsRateEl) {
    const rate = weekStats.total > 0 ? Math.round((weekStats.completed / weekStats.total) * 100) : 0;
    completionsRateEl.textContent = `${rate}% completion rate`;

    // Apply color coding based on rate
    completionsRateEl.classList.remove('rate-excellent', 'rate-good', 'rate-moderate', 'rate-low');
    if (rate >= 80) {
      completionsRateEl.classList.add('rate-excellent');
    } else if (rate >= 60) {
      completionsRateEl.classList.add('rate-good');
    } else if (rate >= 40) {
      completionsRateEl.classList.add('rate-moderate');
    } else {
      completionsRateEl.classList.add('rate-low');
    }
  }
}

/**
 * Update the weekly time tracked display
 * @param {Array} activityLog - Activity log entries
 */
function updateWeeklyTimeTracked(activityLog) {
  const timeDisplayEl = document.getElementById('weekly-time-display');
  if (!timeDisplayEl) return;

  const weekStart = getWeekStartDateString();
  const today = getTodayDateString();
  const weekStartTimestamp = new Date(weekStart + 'T00:00:00').getTime();
  const todayEndTimestamp = new Date(today + 'T23:59:59').getTime();

  // Filter activity log to this week and timer-related actions
  const weekTimerActivity = activityLog.filter(entry => {
    const timestamp = entry.timestamp;
    return timestamp >= weekStartTimestamp &&
           timestamp <= todayEndTimestamp &&
           (entry.action === ACTIVITY_ACTIONS.START ||
            entry.action === ACTIVITY_ACTIONS.PAUSE ||
            entry.action === ACTIVITY_ACTIONS.COMPLETE);
  });

  // Calculate total time from timer goals
  // Sum up duration values from pause and complete actions
  let totalSeconds = 0;
  weekTimerActivity.forEach(entry => {
    if ((entry.action === ACTIVITY_ACTIONS.PAUSE || entry.action === ACTIVITY_ACTIONS.COMPLETE) && entry.duration) {
      totalSeconds += entry.duration;
    }
  });

  // Also add current progress from active timer goals
  state.goals.forEach(goal => {
    if (goal.type === GOAL_TYPES.TIMER && goal.progress > 0) {
      totalSeconds += goal.progress;
    }
  });

  // Format time display
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    timeDisplayEl.textContent = `${hours} hr ${minutes} min`;
  } else if (minutes > 0) {
    timeDisplayEl.textContent = `${minutes} min`;
  } else {
    timeDisplayEl.textContent = 'No time tracked';
  }
}

/**
 * Update the goal performance section with best and worst performing goals
 * @param {Array} history - History entries
 */
async function updateGoalPerformance(history) {
  const performanceCardsEl = document.getElementById('performance-cards');
  if (!performanceCardsEl) return;

  // Calculate completion rates per goal for the week
  const weekStart = getWeekStartDateString();
  const today = getTodayDateString();
  const weekHistory = filterHistoryByDateRange(history, weekStart, today);

  // Group by goal ID and calculate completion rate
  const goalPerformance = {};

  // Process historical data
  weekHistory.forEach(entry => {
    if (!goalPerformance[entry.goalId]) {
      goalPerformance[entry.goalId] = { completed: 0, total: 0 };
    }
    goalPerformance[entry.goalId].total++;
    if (entry.completed) {
      goalPerformance[entry.goalId].completed++;
    }
  });

  // Add today's data from current goals
  state.goals.forEach(goal => {
    if (!goalPerformance[goal.id]) {
      goalPerformance[goal.id] = { completed: 0, total: 0 };
    }
    goalPerformance[goal.id].total++;
    if (isGoalCompleted(goal)) {
      goalPerformance[goal.id].completed++;
    }
  });

  // Calculate rates and find best/worst
  const goalRates = [];
  Object.keys(goalPerformance).forEach(goalId => {
    const perf = goalPerformance[goalId];
    const rate = perf.total > 0 ? (perf.completed / perf.total) * 100 : 0;
    const goal = state.goals.find(g => g.id === goalId);
    if (goal) {
      goalRates.push({
        goal,
        rate,
        completed: perf.completed,
        total: perf.total
      });
    }
  });

  // Sort by rate
  goalRates.sort((a, b) => b.rate - a.rate);

  // Get best and worst performers
  const bestGoal = goalRates[0];
  const worstGoal = goalRates.length > 1 ? goalRates[goalRates.length - 1] : null;

  // Render performance cards
  let html = '';

  if (bestGoal) {
    html += `
      <div class="performance-card best-performer">
        <div class="performance-header">
          <span class="performance-badge best">🏆 Best</span>
        </div>
        <div class="performance-goal-title">${escapeHtml(bestGoal.goal.title)}</div>
        <div class="performance-rate">${Math.round(bestGoal.rate)}% completion</div>
        <div class="performance-detail">${bestGoal.completed}/${bestGoal.total} completed</div>
      </div>
    `;
  }

  if (worstGoal && worstGoal.rate < bestGoal.rate) {
    html += `
      <div class="performance-card needs-work">
        <div class="performance-header">
          <span class="performance-badge needs">📈 Needs Focus</span>
        </div>
        <div class="performance-goal-title">${escapeHtml(worstGoal.goal.title)}</div>
        <div class="performance-rate">${Math.round(worstGoal.rate)}% completion</div>
        <div class="performance-detail">${worstGoal.completed}/${worstGoal.total} completed</div>
      </div>
    `;
  }

  if (!html) {
    html = '<div class="no-performance-data">Not enough data for this week</div>';
  }

  performanceCardsEl.innerHTML = html;
}

/**
 * Render the daily breakdown chart for the week
 * @param {Array} history - History entries
 * @param {Array} currentGoals - Current goals array
 */
function renderDailyBreakdown(history, currentGoals) {
  const breakdownEl = document.getElementById('daily-breakdown');
  if (!breakdownEl) return;

  const today = getTodayDateString();
  const historyByDate = groupHistoryByDate(history);

  // Get data for last 7 days (Mon-Sun of current week)
  const weekStart = getWeekStartDateString();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  let html = '<div class="breakdown-bars">';

  // Generate 7 days from week start
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart + 'T00:00:00');
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const isFuture = dateStr > today;
    const isToday = dateStr === today;

    let completed = 0;
    let total = 0;
    let percentage = 0;

    if (isToday) {
      // Use current goals for today
      total = currentGoals.length;
      completed = currentGoals.filter(goal => isGoalCompleted(goal)).length;
    } else if (!isFuture) {
      // Use history for past days
      const dayHistory = historyByDate[dateStr] || [];
      total = dayHistory.length;
      completed = dayHistory.filter(entry => entry.completed).length;
    }

    percentage = total > 0 ? (completed / total) * 100 : 0;

    // Determine bar color class
    let barColorClass = 'bar-empty';
    if (!isFuture && total > 0) {
      if (percentage >= 80) {
        barColorClass = 'bar-excellent';
      } else if (percentage >= 50) {
        barColorClass = 'bar-good';
      } else if (percentage > 0) {
        barColorClass = 'bar-low';
      }
    }

    html += `
      <div class="breakdown-day ${isToday ? 'is-today' : ''} ${isFuture ? 'is-future' : ''}">
        <div class="breakdown-bar-wrapper">
          <div class="breakdown-bar ${barColorClass}" style="height: ${percentage}%"></div>
        </div>
        <span class="breakdown-label">${dayNames[i]}</span>
        ${!isFuture ? `<span class="breakdown-value">${Math.round(percentage)}%</span>` : ''}
      </div>
    `;
  }

  html += '</div>';
  breakdownEl.innerHTML = html;
}

/**
 * Update the week-over-week comparison
 * @param {Array} history - History entries
 */
function updateWeekComparison(history) {
  const comparisonCardEl = document.getElementById('comparison-card');
  if (!comparisonCardEl) return;

  // Calculate this week's stats
  const today = getTodayDateString();
  const thisWeekStart = getWeekStartDateString();
  const thisWeekHistory = filterHistoryByDateRange(history, thisWeekStart, today);
  const thisWeekPast = thisWeekHistory.filter(entry => entry.date !== today);

  let thisWeekCompleted = thisWeekPast.filter(entry => entry.completed).length;
  let thisWeekTotal = thisWeekPast.length;

  // Add today's data from current goals
  const todayCompleted = state.goals.filter(goal => isGoalCompleted(goal)).length;
  thisWeekCompleted += todayCompleted;
  thisWeekTotal += state.goals.length;

  // Calculate previous week's stats
  const prevWeekStart = new Date(thisWeekStart + 'T00:00:00');
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0];

  const prevWeekEnd = new Date(thisWeekStart + 'T00:00:00');
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
  const prevWeekEndStr = prevWeekEnd.toISOString().split('T')[0];

  const prevWeekHistory = filterHistoryByDateRange(history, prevWeekStartStr, prevWeekEndStr);
  const prevWeekCompleted = prevWeekHistory.filter(entry => entry.completed).length;
  const prevWeekTotal = prevWeekHistory.length;

  // Calculate rates
  const thisWeekRate = thisWeekTotal > 0 ? (thisWeekCompleted / thisWeekTotal) * 100 : 0;
  const prevWeekRate = prevWeekTotal > 0 ? (prevWeekCompleted / prevWeekTotal) * 100 : 0;

  // Calculate difference
  const rateDiff = thisWeekRate - prevWeekRate;
  const isImproved = rateDiff > 0;
  const isDeclined = rateDiff < 0;

  let comparisonHtml = '';

  if (prevWeekTotal === 0) {
    comparisonHtml = `
      <div class="comparison-content">
        <div class="comparison-message">No data from previous week</div>
      </div>
    `;
  } else {
    const diffIcon = isImproved ? '📈' : isDeclined ? '📉' : '➡️';
    const diffClass = isImproved ? 'improved' : isDeclined ? 'declined' : 'same';
    const diffText = isImproved
      ? `+${Math.round(Math.abs(rateDiff))}% improvement`
      : isDeclined
        ? `-${Math.round(Math.abs(rateDiff))}% from last week`
        : 'Same as last week';

    comparisonHtml = `
      <div class="comparison-content">
        <div class="comparison-icon">${diffIcon}</div>
        <div class="comparison-stats">
          <div class="comparison-diff ${diffClass}">${diffText}</div>
          <div class="comparison-detail">
            This week: ${Math.round(thisWeekRate)}% vs Last week: ${Math.round(prevWeekRate)}%
          </div>
        </div>
      </div>
    `;
  }

  comparisonCardEl.innerHTML = comparisonHtml;
}

// =============================================================================
// US-067: Focus Mode
// =============================================================================

/**
 * Enter focus mode for a specific goal
 * @param {string} goalId - The ID of the goal to focus on
 */
function enterFocusMode(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) {
    console.error('[FocusMode] Goal not found:', goalId);
    return;
  }

  state.focusedGoalId = goalId;
  showScreen(SCREENS.FOCUS_MODE);
  console.log('[FocusMode] Entered focus mode for goal:', goal.title);
}

/**
 * Exit focus mode and return to View Goals screen
 */
function exitFocusMode() {
  state.focusedGoalId = null;
  showScreen(SCREENS.VIEW_GOALS);
  console.log('[FocusMode] Exited focus mode');
}

/**
 * Render the Focus Mode screen
 * Shows a single goal with large, prominent timer/counter/checkbox display
 */
function renderFocusModeScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.FOCUS_MODE]);
  if (!screen) return;

  const goal = state.goals.find(g => g.id === state.focusedGoalId);
  if (!goal) {
    console.error('[FocusMode] Goal not found for focus mode, returning to view goals');
    exitFocusMode();
    return;
  }

  const progressPercent = getGoalCompletionPercentage(goal);
  const isCompleted = isGoalCompleted(goal);
  const typeIcon = getGoalTypeIcon(goal.type);

  // Get category info for display
  const categoryInfo = goal.category ? state.categories.find(c => c.id === goal.category) : null;

  screen.innerHTML = `
    <div class="focus-mode-screen ${isCompleted ? 'focus-completed' : ''}">
      <header class="focus-mode-header">
        <button class="focus-exit-btn" id="focus-exit-btn" title="Exit Focus Mode (Esc)">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </header>
      <main class="focus-mode-content">
        <div class="focus-goal-info">
          <div class="focus-goal-meta">
            ${categoryInfo ? `<span class="focus-category-badge" style="background-color: ${categoryInfo.light}; color: ${categoryInfo.color}"><span class="category-color-dot" style="background-color: ${categoryInfo.color}"></span>${categoryInfo.name}</span>` : ''}
            <span class="focus-timeframe-badge timeframe-${goal.timeframe}">${capitalizeFirst(goal.timeframe)}</span>
          </div>
          <div class="focus-goal-title-row">
            <span class="focus-type-indicator">${typeIcon}</span>
            <h1 class="focus-goal-title">${escapeHtml(goal.title)}</h1>
          </div>
        </div>

        <div class="focus-progress-section">
          ${renderFocusModeDisplay(goal)}
        </div>

        <div class="focus-progress-bar-container">
          <div class="focus-progress-bar">
            <div class="focus-progress-fill ${isCompleted ? 'completed' : ''}" style="width: ${progressPercent}%"></div>
          </div>
          <span class="focus-progress-percent">${Math.round(progressPercent)}%</span>
        </div>

        <div class="focus-controls-section">
          ${renderFocusModeControls(goal)}
        </div>

        ${isCompleted ? `
          <div class="focus-completed-message">
            <span class="focus-completed-icon">&#10003;</span>
            <span class="focus-completed-text">Goal Completed!</span>
          </div>
        ` : ''}
      </main>
    </div>
  `;

  // Attach event listeners
  attachFocusModeListeners(screen);

  // Ensure timer updates if this is an active timer goal
  if (goal.type === GOAL_TYPES.TIMER && goal.isActive) {
    startTimerUpdateInterval();
  }

  console.log('[FocusMode] Rendered focus mode for:', goal.title);
}

/**
 * Render the main display for focus mode based on goal type
 * @param {Object} goal - The goal object
 * @returns {string} HTML string for the display
 */
function renderFocusModeDisplay(goal) {
  switch (goal.type) {
    case GOAL_TYPES.TIMER:
      return renderFocusTimerDisplay(goal);
    case GOAL_TYPES.COUNTER:
      return renderFocusCounterDisplay(goal);
    case GOAL_TYPES.CHECKBOX:
      return renderFocusCheckboxDisplay(goal);
    default:
      return '';
  }
}

/**
 * Render large timer display for focus mode
 * @param {Object} goal - The timer goal object
 * @returns {string} HTML string
 */
function renderFocusTimerDisplay(goal) {
  const isActive = goal.isActive;
  const activeTimer = state.activeTimers[goal.id];

  // Calculate current elapsed time for display
  let displayProgress = goal.progress;
  if (isActive && activeTimer && activeTimer.startTime) {
    const elapsedSinceStart = Math.floor((Date.now() - activeTimer.startTime) / 1000);
    displayProgress = Math.min(goal.progress + elapsedSinceStart, goal.target);
  }

  const timeRemaining = Math.max(0, goal.target - displayProgress);

  return `
    <div class="focus-timer-display ${isActive ? 'active' : ''}" data-goal-id="${goal.id}">
      <div class="focus-timer-main">
        <span class="focus-timer-value">${formatTime(displayProgress)}</span>
      </div>
      <div class="focus-timer-target">
        <span class="focus-timer-label">of ${formatTime(goal.target)}</span>
      </div>
      ${timeRemaining > 0 ? `
        <div class="focus-timer-remaining">
          <span class="focus-remaining-value">${formatTime(timeRemaining)}</span>
          <span class="focus-remaining-label">remaining</span>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render large counter display for focus mode
 * @param {Object} goal - The counter goal object
 * @returns {string} HTML string
 */
function renderFocusCounterDisplay(goal) {
  const remaining = Math.max(0, goal.target - goal.progress);

  return `
    <div class="focus-counter-display" data-goal-id="${goal.id}">
      <div class="focus-counter-main">
        <span class="focus-counter-value">${goal.progress}</span>
        <span class="focus-counter-separator">/</span>
        <span class="focus-counter-target">${goal.target}</span>
      </div>
      ${remaining > 0 ? `
        <div class="focus-counter-remaining">
          <span class="focus-remaining-value">${remaining}</span>
          <span class="focus-remaining-label">to go</span>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render large checkbox display for focus mode
 * @param {Object} goal - The checkbox goal object
 * @returns {string} HTML string
 */
function renderFocusCheckboxDisplay(goal) {
  const isChecked = isGoalCompleted(goal);

  return `
    <div class="focus-checkbox-display ${isChecked ? 'checked' : ''}" data-goal-id="${goal.id}">
      <div class="focus-checkbox-icon">
        ${isChecked
          ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            </svg>`
        }
      </div>
      <div class="focus-checkbox-status">
        ${isChecked ? 'Completed' : 'Not completed'}
      </div>
    </div>
  `;
}

/**
 * Render controls for focus mode based on goal type
 * @param {Object} goal - The goal object
 * @returns {string} HTML string for controls
 */
function renderFocusModeControls(goal) {
  switch (goal.type) {
    case GOAL_TYPES.TIMER:
      return renderFocusTimerControls(goal);
    case GOAL_TYPES.COUNTER:
      return renderFocusCounterControls(goal);
    case GOAL_TYPES.CHECKBOX:
      return renderFocusCheckboxControls(goal);
    default:
      return '';
  }
}

/**
 * Render timer controls for focus mode
 * @param {Object} goal - The timer goal object
 * @returns {string} HTML string
 */
function renderFocusTimerControls(goal) {
  const isActive = goal.isActive;
  const playIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  const pauseIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

  return `
    <div class="focus-controls focus-timer-controls">
      <button class="focus-control-btn focus-play-btn ${isActive ? 'is-active' : ''}"
              data-action="timer-toggle"
              data-goal-id="${goal.id}"
              title="${isActive ? 'Pause' : 'Start'}">
        ${isActive ? pauseIcon : playIcon}
        <span class="focus-control-label">${isActive ? 'Pause' : 'Start'}</span>
      </button>
    </div>
  `;
}

/**
 * Render counter controls for focus mode
 * @param {Object} goal - The counter goal object
 * @returns {string} HTML string
 */
function renderFocusCounterControls(goal) {
  const isAtMinimum = goal.progress <= 0;

  return `
    <div class="focus-controls focus-counter-controls">
      <button class="focus-control-btn focus-decrement-btn ${isAtMinimum ? 'disabled' : ''}"
              data-action="decrement"
              data-goal-id="${goal.id}"
              title="Decrease"
              ${isAtMinimum ? 'disabled' : ''}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <button class="focus-control-btn focus-increment-btn"
              data-action="increment"
              data-goal-id="${goal.id}"
              title="Increase">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  `;
}

/**
 * Render checkbox controls for focus mode
 * @param {Object} goal - The checkbox goal object
 * @returns {string} HTML string
 */
function renderFocusCheckboxControls(goal) {
  const isChecked = isGoalCompleted(goal);

  return `
    <div class="focus-controls focus-checkbox-controls">
      <button class="focus-control-btn focus-toggle-btn ${isChecked ? 'checked' : ''}"
              data-action="checkbox-toggle"
              data-goal-id="${goal.id}"
              title="${isChecked ? 'Mark as not done' : 'Mark as done'}">
        <span class="focus-toggle-label">${isChecked ? 'Mark as not done' : 'Mark as done'}</span>
      </button>
    </div>
  `;
}

/**
 * Attach event listeners for Focus Mode screen
 * @param {HTMLElement} container - The container element
 */
function attachFocusModeListeners(container) {
  // Exit button
  const exitBtn = container.querySelector('#focus-exit-btn');
  if (exitBtn) {
    exitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      exitFocusMode();
    });
  }

  // Timer toggle
  const timerToggleBtns = container.querySelectorAll('[data-action="timer-toggle"]');
  timerToggleBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        await handleTimerToggle(goalId);
        // Re-render focus mode to update display
        renderFocusModeScreen();
      }
    });
  });

  // Counter increment
  const incrementBtns = container.querySelectorAll('[data-action="increment"]');
  incrementBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        await handleCounterIncrement(goalId);
        renderFocusModeScreen();
      }
    });
  });

  // Counter decrement
  const decrementBtns = container.querySelectorAll('[data-action="decrement"]');
  decrementBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        await handleCounterDecrement(goalId);
        renderFocusModeScreen();
      }
    });
  });

  // Checkbox toggle
  const checkboxToggleBtns = container.querySelectorAll('[data-action="checkbox-toggle"]');
  checkboxToggleBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        await handleCheckboxToggle(goalId);
        renderFocusModeScreen();
      }
    });
  });

  // Keyboard shortcut to exit (Escape key)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && state.currentScreen === SCREENS.FOCUS_MODE) {
      exitFocusMode();
    }
  };
  document.addEventListener('keydown', handleKeyDown);

  // Store the handler for cleanup
  container._focusModeKeyHandler = handleKeyDown;
}

/**
 * Update focus mode timer display (called from timer update interval)
 */
function updateFocusModeTimerDisplay() {
  if (state.currentScreen !== SCREENS.FOCUS_MODE || !state.focusedGoalId) {
    return;
  }

  const goal = state.goals.find(g => g.id === state.focusedGoalId);
  if (!goal || goal.type !== GOAL_TYPES.TIMER) {
    return;
  }

  const activeTimer = state.activeTimers[goal.id];
  if (!goal.isActive || !activeTimer) {
    return;
  }

  const now = Date.now();
  const elapsedSinceStart = Math.floor((now - activeTimer.startTime) / 1000);
  const currentProgress = Math.min(goal.progress + elapsedSinceStart, goal.target);
  const timeRemaining = Math.max(0, goal.target - currentProgress);
  const progressPercent = goal.target > 0 ? Math.min(100, (currentProgress / goal.target) * 100) : 100;

  // Update timer display
  const timerValue = document.querySelector('.focus-timer-value');
  if (timerValue) {
    timerValue.textContent = formatTime(currentProgress);
  }

  // Update remaining time
  const remainingValue = document.querySelector('.focus-remaining-value');
  if (remainingValue) {
    remainingValue.textContent = formatTime(timeRemaining);
  }

  // Update progress bar
  const progressFill = document.querySelector('.focus-progress-fill');
  if (progressFill) {
    progressFill.style.width = `${progressPercent}%`;
  }

  // Update progress percent
  const progressPercentEl = document.querySelector('.focus-progress-percent');
  if (progressPercentEl) {
    progressPercentEl.textContent = `${Math.round(progressPercent)}%`;
  }

  // Check for completion
  if (currentProgress >= goal.target && !isGoalCompleted(goal)) {
    // Re-render to show completion state
    renderFocusModeScreen();
  }
}

// =============================================================================
// US-068: Quick Add Floating Action Button (FAB)
// =============================================================================

/**
 * State for quick add form
 */
const quickAddState = {
  isOpen: false,
  selectedType: 'timer'
};

/**
 * Render the Quick Add FAB and form
 * @returns {string} HTML string for the FAB and quick-add form
 */
function renderQuickAddFAB() {
  return `
    <div class="quick-add-container" id="quick-add-container">
      <!-- Quick Add Form (hidden by default) -->
      <div class="quick-add-form ${quickAddState.isOpen ? 'open' : ''}" id="quick-add-form" role="dialog" aria-labelledby="quick-add-title" aria-modal="true">
        <div class="quick-add-header">
          <h3 id="quick-add-title">Quick Add Goal</h3>
          <button type="button" class="quick-add-close" data-action="close-quick-add" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="quick-add-body">
          <div class="quick-add-field">
            <input
              type="text"
              id="quick-add-title-input"
              class="quick-add-input"
              placeholder="Goal title..."
              autocomplete="off"
              maxlength="100"
            >
          </div>
          <div class="quick-add-type-selector">
            <button type="button" class="quick-add-type-btn ${quickAddState.selectedType === 'timer' ? 'active' : ''}" data-quick-type="timer" title="Timer goal">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Timer</span>
            </button>
            <button type="button" class="quick-add-type-btn ${quickAddState.selectedType === 'counter' ? 'active' : ''}" data-quick-type="counter" title="Counter goal">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              <span>Counter</span>
            </button>
            <button type="button" class="quick-add-type-btn ${quickAddState.selectedType === 'checkbox' ? 'active' : ''}" data-quick-type="checkbox" title="Checkbox goal">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <polyline points="9 11 12 14 22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              <span>Checkbox</span>
            </button>
          </div>
        </div>
        <div class="quick-add-footer">
          <button type="button" class="quick-add-more-link" data-action="more-options">
            More options
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <button type="button" class="btn btn-primary quick-add-save" data-action="save-quick-add">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Save
          </button>
        </div>
      </div>

      <!-- FAB Button -->
      <button type="button" class="quick-add-fab ${quickAddState.isOpen ? 'open' : ''}" id="quick-add-fab" aria-label="Quick add goal" title="Quick add goal">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="fab-icon-plus" width="24" height="24">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="fab-icon-close" width="24" height="24">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;
}

/**
 * Attach event listeners for Quick Add FAB
 * @param {HTMLElement} screen - The screen element
 */
function attachQuickAddFABListeners(screen) {
  const container = screen.querySelector('#quick-add-container');
  if (!container) return;

  const fab = container.querySelector('#quick-add-fab');
  const form = container.querySelector('#quick-add-form');
  const titleInput = container.querySelector('#quick-add-title-input');
  const closeBtn = container.querySelector('[data-action="close-quick-add"]');
  const saveBtn = container.querySelector('[data-action="save-quick-add"]');
  const moreOptionsBtn = container.querySelector('[data-action="more-options"]');
  const typeButtons = container.querySelectorAll('.quick-add-type-btn');

  // FAB click - toggle form
  if (fab) {
    fab.addEventListener('click', (e) => {
      e.preventDefault();
      toggleQuickAddForm();
    });
  }

  // Close button click
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeQuickAddForm();
    });
  }

  // Save button click
  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleQuickAddSave();
    });
  }

  // More options click - go to full form
  if (moreOptionsBtn) {
    moreOptionsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleQuickAddMoreOptions();
    });
  }

  // Type selector buttons
  typeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const type = btn.getAttribute('data-quick-type');
      setQuickAddType(type);
    });
  });

  // Handle Enter key in title input
  if (titleInput) {
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleQuickAddSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeQuickAddForm();
      }
    });
  }

  // Close form when clicking outside (on the backdrop area)
  document.addEventListener('click', handleQuickAddOutsideClick);
}

/**
 * Handle clicks outside the quick add form
 * @param {Event} e - Click event
 */
function handleQuickAddOutsideClick(e) {
  if (!quickAddState.isOpen) return;

  const container = document.getElementById('quick-add-container');
  if (!container) return;

  const form = container.querySelector('#quick-add-form');
  const fab = container.querySelector('#quick-add-fab');

  // Check if click is outside both the form and the FAB
  if (form && fab && !form.contains(e.target) && !fab.contains(e.target)) {
    closeQuickAddForm();
  }
}

/**
 * Toggle the quick add form visibility
 */
function toggleQuickAddForm() {
  if (quickAddState.isOpen) {
    closeQuickAddForm();
  } else {
    openQuickAddForm();
  }
}

/**
 * Open the quick add form
 */
function openQuickAddForm() {
  quickAddState.isOpen = true;

  const container = document.getElementById('quick-add-container');
  if (!container) return;

  const form = container.querySelector('#quick-add-form');
  const fab = container.querySelector('#quick-add-fab');
  const titleInput = container.querySelector('#quick-add-title-input');

  if (form) {
    form.classList.add('open');
  }
  if (fab) {
    fab.classList.add('open');
  }

  // Focus the title input after animation
  if (titleInput) {
    setTimeout(() => titleInput.focus(), 200);
  }

  // Play a subtle sound
  playSound(SOUNDS.TICK);
}

/**
 * Close the quick add form
 */
function closeQuickAddForm() {
  quickAddState.isOpen = false;

  const container = document.getElementById('quick-add-container');
  if (!container) return;

  const form = container.querySelector('#quick-add-form');
  const fab = container.querySelector('#quick-add-fab');
  const titleInput = container.querySelector('#quick-add-title-input');

  if (form) {
    form.classList.remove('open');
  }
  if (fab) {
    fab.classList.remove('open');
  }

  // Clear the input
  if (titleInput) {
    titleInput.value = '';
  }

  // Reset type to default
  quickAddState.selectedType = 'timer';
}

/**
 * Set the selected type in quick add form
 * @param {string} type - The goal type
 */
function setQuickAddType(type) {
  quickAddState.selectedType = type;

  const container = document.getElementById('quick-add-container');
  if (!container) return;

  const typeButtons = container.querySelectorAll('.quick-add-type-btn');
  typeButtons.forEach(btn => {
    const btnType = btn.getAttribute('data-quick-type');
    btn.classList.toggle('active', btnType === type);
  });

  // Play a tick sound
  playSound(SOUNDS.TICK);
}

/**
 * Handle saving the quick add goal
 */
async function handleQuickAddSave() {
  const container = document.getElementById('quick-add-container');
  if (!container) return;

  const titleInput = container.querySelector('#quick-add-title-input');
  const title = titleInput?.value?.trim();

  // Validate title
  if (!title) {
    // Shake the input to indicate error
    if (titleInput) {
      titleInput.classList.add('shake');
      titleInput.focus();
      setTimeout(() => titleInput.classList.remove('shake'), 500);
    }
    return;
  }

  const type = quickAddState.selectedType;

  // Set default target based on type
  let target;
  if (type === GOAL_TYPES.TIMER) {
    target = 3600; // 1 hour default
  } else if (type === GOAL_TYPES.COUNTER) {
    target = 10; // 10 count default
  } else {
    target = 1; // Checkbox
  }

  // Create the goal with defaults
  const newGoal = createGoal({
    title,
    type,
    target,
    timeframe: TIMEFRAMES.DAILY, // Default to daily
    category: null,
    order: state.goals.length
  });

  try {
    // Save to storage
    const updatedGoals = [...state.goals, newGoal];
    const success = await saveGoals(updatedGoals);

    if (success) {
      state.goals = updatedGoals;
      console.log('[QuickAdd] Goal created:', newGoal);

      // Play success sound
      playSound(SOUNDS.COMPLETE);

      // Show success feedback
      showSuccessFeedback('Goal created!');

      // Close the form
      closeQuickAddForm();

      // Re-render the view goals screen
      renderViewGoalsScreen();
    } else {
      console.error('[QuickAdd] Failed to save goal');
      showFormError('Failed to save goal');
    }
  } catch (error) {
    console.error('[QuickAdd] Error saving goal:', error);
    showFormError('Error saving goal');
  }
}

/**
 * Handle "More options" click - navigate to full goal form
 */
function handleQuickAddMoreOptions() {
  const container = document.getElementById('quick-add-container');
  if (!container) return;

  const titleInput = container.querySelector('#quick-add-title-input');
  const title = titleInput?.value?.trim() || '';
  const type = quickAddState.selectedType;

  // Close the quick add form
  closeQuickAddForm();

  // Navigate to the full goal form screen
  openGoalFormScreen('add');

  // Pre-fill the title and type in the full form after a short delay
  setTimeout(() => {
    const formScreen = document.getElementById(SCREEN_IDS[SCREENS.GOAL_FORM]);
    if (formScreen) {
      // Pre-fill title
      const formTitleInput = formScreen.querySelector('#goal-form-title');
      if (formTitleInput && title) {
        formTitleInput.value = title;
      }

      // Pre-fill type
      if (type) {
        setGoalFormScreenType(formScreen, type);
      }
    }
  }, 100);
}

// =============================================================================
// US-021: Manage Goals - Goal List Item
// =============================================================================

/**
 * Attach event listeners for Manage Goals screen actions (Edit/Delete/Save Template)
 * @param {HTMLElement} container - The container element
 */
function attachManageGoalsListeners(container) {
  // US-029: Edit button click handlers
  const editButtons = container.querySelectorAll('[data-action="edit"]');
  editButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        handleEditGoal(goalId);
      }
    });
  });

  // US-030: Delete button click handlers - show confirmation dialog
  const deleteButtons = container.querySelectorAll('[data-action="delete"]');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        openDeleteConfirmModal(goalId);
      }
    });
  });

  // US-066: Save as Template button click handlers
  const saveTemplateButtons = container.querySelectorAll('[data-action="save-template"]');
  saveTemplateButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        await handleSaveAsTemplate(goalId);
      }
    });
  });

  // US-069: Archive button click handlers
  const archiveButtons = container.querySelectorAll('[data-action="archive"]');
  archiveButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        await handleArchiveGoal(goalId);
      }
    });
  });
}

// =============================================================================
// US-029: Edit Goal - Pre-fill Form
// =============================================================================

/**
 * Handle Edit button click to open goal form screen with goal data
 * US-058: Updated to use full-page form instead of modal
 * @param {string} goalId - The ID of the goal to edit
 */
function handleEditGoal(goalId) {
  const goal = state.goals.find(g => g.id === goalId);

  if (!goal) {
    console.error(`[Edit] Goal not found: ${goalId}`);
    showFormError('Goal not found. Please refresh and try again.');
    return;
  }

  console.log(`[Edit] Opening edit screen for goal: ${goal.title} (${goalId})`);

  // US-058: Open the full-page form in edit mode with the goal data
  openGoalFormScreen('edit', goal);
}

// =============================================================================
// US-030: Delete Goal - Confirmation
// =============================================================================

/**
 * Goal ID pending deletion - stored while confirmation dialog is open
 * @type {string|null}
 */
let pendingDeleteGoalId = null;

/**
 * Open the delete confirmation modal
 * @param {string} goalId - The ID of the goal to potentially delete
 */
function openDeleteConfirmModal(goalId) {
  const goal = state.goals.find(g => g.id === goalId);

  if (!goal) {
    console.error(`[Delete] Goal not found: ${goalId}`);
    showFormError('Goal not found. Please refresh and try again.');
    return;
  }

  const modal = document.getElementById('delete-confirm-modal');
  if (!modal) {
    console.error('[Delete] Confirmation modal not found');
    return;
  }

  // Store the goal ID for deletion
  pendingDeleteGoalId = goalId;

  // Show the modal
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  // Attach event listeners
  attachDeleteConfirmListeners(modal);

  console.log(`[Delete] Opened confirmation dialog for goal: ${goal.title} (${goalId})`);
}

/**
 * Close the delete confirmation modal
 */
function closeDeleteConfirmModal() {
  const modal = document.getElementById('delete-confirm-modal');

  if (!modal) {
    return;
  }

  // Hide the modal
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');

  // Clear pending delete
  pendingDeleteGoalId = null;

  console.log('[Delete] Closed confirmation dialog');
}

/**
 * Attach event listeners to the delete confirmation modal
 * @param {HTMLElement} modal - The modal element
 */
function attachDeleteConfirmListeners(modal) {
  // Close button and overlay clicks
  const closeElements = modal.querySelectorAll('[data-action="close-delete-modal"]');
  closeElements.forEach(el => {
    // Remove existing listener to prevent duplicates
    el.removeEventListener('click', handleDeleteModalClose);
    el.addEventListener('click', handleDeleteModalClose);
  });

  // Confirm delete button
  const confirmBtn = modal.querySelector('[data-action="confirm-delete"]');
  if (confirmBtn) {
    confirmBtn.removeEventListener('click', handleConfirmDelete);
    confirmBtn.addEventListener('click', handleConfirmDelete);
  }

  // Handle Escape key to close modal
  document.removeEventListener('keydown', handleDeleteModalKeydown);
  document.addEventListener('keydown', handleDeleteModalKeydown);
}

/**
 * Handle close action for delete modal
 * @param {Event} e - Click event
 */
function handleDeleteModalClose(e) {
  e.preventDefault();
  e.stopPropagation();
  closeDeleteConfirmModal();
}

/**
 * Handle keydown events for delete modal (Escape to close)
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleDeleteModalKeydown(e) {
  const modal = document.getElementById('delete-confirm-modal');
  if (!modal || !modal.classList.contains('active')) {
    return;
  }

  if (e.key === 'Escape') {
    e.preventDefault();
    closeDeleteConfirmModal();
  }
}

/**
 * Handle confirm delete action
 * @param {Event} e - Click event
 */
async function handleConfirmDelete(e) {
  e.preventDefault();
  e.stopPropagation();

  if (!pendingDeleteGoalId) {
    console.error('[Delete] No goal ID pending for deletion');
    closeDeleteConfirmModal();
    return;
  }

  const goalId = pendingDeleteGoalId;
  const goal = state.goals.find(g => g.id === goalId);
  const goalTitle = goal ? goal.title : 'Goal';

  console.log(`[Delete] Confirming deletion of goal: ${goalTitle} (${goalId})`);

  try {
    // Delete goal from storage
    const success = await deleteGoal(goalId);

    if (success) {
      // Update local state
      state.goals = state.goals.filter(g => g.id !== goalId);

      // If this goal had an active timer, clean it up
      if (state.activeTimers[goalId]) {
        delete state.activeTimers[goalId];
        await saveActiveTimers(state.activeTimers);
      }

      console.log(`[Delete] Goal deleted successfully: ${goalTitle}`);

      // Close the confirmation modal
      closeDeleteConfirmModal();

      // Show success feedback
      showSuccessFeedback('Goal deleted successfully');

      // Refresh the current screen to show updated list
      renderCurrentScreen();
    } else {
      console.error('[Delete] Failed to delete goal from storage');
      closeDeleteConfirmModal();
      showFormError('Failed to delete goal. Please try again.');
    }
  } catch (error) {
    console.error('[Delete] Error deleting goal:', error);
    closeDeleteConfirmModal();
    showFormError('An error occurred while deleting. Please try again.');
  }
}

/**
 * Get the type label for display
 * @param {string} type - The goal type
 * @returns {string} Human-readable type label
 */
function getGoalTypeLabel(type) {
  switch (type) {
    case GOAL_TYPES.TIMER:
      return 'Timer';
    case GOAL_TYPES.COUNTER:
      return 'Counter';
    case GOAL_TYPES.CHECKBOX:
      return 'Checkbox';
    default:
      return 'Goal';
  }
}

/**
 * Format target display for manage screen
 * @param {Object} goal - The goal object
 * @returns {string} Formatted target string
 */
function formatTargetForManage(goal) {
  switch (goal.type) {
    case GOAL_TYPES.TIMER:
      const hours = Math.floor(goal.target / 3600);
      const mins = Math.floor((goal.target % 3600) / 60);
      if (hours > 0 && mins > 0) {
        return `${hours}h ${mins}m`;
      } else if (hours > 0) {
        return `${hours}h`;
      } else {
        return `${mins}m`;
      }
    case GOAL_TYPES.COUNTER:
      return `Target: ${goal.target}`;
    case GOAL_TYPES.CHECKBOX:
      return 'Complete once';
    default:
      return '';
  }
}

// =============================================================================
// US-022: Add Goal Form - Modal
// =============================================================================

/**
 * Open the goal form modal
 * @param {string} mode - 'add' for new goal, 'edit' for editing existing
 * @param {Object|null} goal - The goal to edit (null for add mode)
 */
function openGoalModal(mode = 'add', goal = null) {
  const modal = document.getElementById('goal-form-modal');
  const modalTitle = document.getElementById('modal-title');

  if (!modal || !modalTitle) {
    console.error('Modal elements not found');
    return;
  }

  // Reset the form before opening (clear any previous values/errors)
  resetGoalForm();

  // Set modal title based on mode
  modalTitle.textContent = mode === 'edit' ? 'Edit Goal' : 'Add New Goal';

  // Store the mode and goal ID in the modal for form submission
  modal.setAttribute('data-mode', mode);
  if (goal) {
    modal.setAttribute('data-goal-id', goal.id);
    // US-023: Pre-fill title for edit mode
    setFormTitle(goal.title);
  } else {
    modal.removeAttribute('data-goal-id');
  }

  // Show the modal
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  // Attach modal event listeners
  attachModalListeners(modal);

  // US-024: Attach type selector listeners
  attachTypeSelectorListeners();

  // US-027: Attach timeframe selector listeners
  attachTimeframeSelectorListeners();

  // US-024: Pre-fill type for edit mode
  if (goal && goal.type) {
    setFormType(goal.type);
  }

  // US-027: Pre-fill timeframe for edit mode
  if (goal && goal.timeframe) {
    setFormTimeframe(goal.timeframe);
  }

  // US-025: Pre-fill timer target for edit mode (if timer type)
  if (goal && goal.type === GOAL_TYPES.TIMER && goal.target) {
    setTimerTarget(goal.target);
  }

  // US-026: Pre-fill counter target for edit mode (if counter type)
  if (goal && goal.type === GOAL_TYPES.COUNTER && goal.target) {
    setCounterTarget(goal.target);
  }

  // US-023: Focus the title input for better UX
  focusTitleInput();

  console.log(`[Modal] Opened in ${mode} mode`);
}

/**
 * Close the goal form modal
 */
function closeGoalModal() {
  const modal = document.getElementById('goal-form-modal');

  if (!modal) {
    console.error('Modal not found');
    return;
  }

  // Hide the modal
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');

  // Clean up modal data attributes
  modal.removeAttribute('data-mode');
  modal.removeAttribute('data-goal-id');

  // US-023: Reset the form and clear any validation errors
  resetGoalForm();

  console.log('[Modal] Closed');
}

/**
 * Attach event listeners to the modal
 * @param {HTMLElement} modal - The modal element
 */
function attachModalListeners(modal) {
  // Close button and overlay clicks
  const closeElements = modal.querySelectorAll('[data-action="close-modal"]');
  closeElements.forEach(el => {
    // Remove existing listener to prevent duplicates
    el.removeEventListener('click', handleModalClose);
    el.addEventListener('click', handleModalClose);
  });

  // Handle Escape key to close modal
  document.removeEventListener('keydown', handleModalKeydown);
  document.addEventListener('keydown', handleModalKeydown);

  // Form submit handler (placeholder - will be enhanced in US-028)
  const form = document.getElementById('goal-form');
  if (form) {
    form.removeEventListener('submit', handleGoalFormSubmit);
    form.addEventListener('submit', handleGoalFormSubmit);
  }
}

/**
 * Handle modal close action
 * @param {Event} e - Click event
 */
function handleModalClose(e) {
  e.preventDefault();
  e.stopPropagation();
  closeGoalModal();
}

/**
 * Handle keydown events for modal (Escape to close)
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleModalKeydown(e) {
  const modal = document.getElementById('goal-form-modal');
  if (!modal || !modal.classList.contains('active')) {
    return;
  }

  if (e.key === 'Escape') {
    e.preventDefault();
    closeGoalModal();
  }
}

/**
 * Handle goal form submission
 * US-028: Full save logic implementation
 * @param {Event} e - Submit event
 */
async function handleGoalFormSubmit(e) {
  e.preventDefault();

  const modal = document.getElementById('goal-form-modal');
  const mode = modal?.getAttribute('data-mode') || 'add';
  const goalId = modal?.getAttribute('data-goal-id');

  // US-023: Validate title input
  const titleValid = validateTitleInput();

  if (!titleValid) {
    console.log('[Form] Validation failed - title is required');
    return;
  }

  // US-025: Validate timer target if timer type is selected
  const selectedType = getFormType();
  if (selectedType === GOAL_TYPES.TIMER) {
    const timerTargetValid = validateTimerTarget();
    if (!timerTargetValid) {
      console.log('[Form] Validation failed - timer target is invalid');
      return;
    }
  }

  // US-026: Validate counter target if counter type is selected
  if (selectedType === GOAL_TYPES.COUNTER) {
    const counterTargetValid = validateCounterTarget();
    if (!counterTargetValid) {
      console.log('[Form] Validation failed - counter target is invalid');
      return;
    }
  }

  // Gather form data
  const title = getFormTitle();
  const type = getFormType();
  const timeframe = getFormTimeframe();

  // Determine target based on type
  let target;
  switch (type) {
    case GOAL_TYPES.TIMER:
      target = getTimerTarget();
      break;
    case GOAL_TYPES.COUNTER:
      target = getCounterTarget();
      break;
    case GOAL_TYPES.CHECKBOX:
      target = 1; // Checkbox target is always 1
      break;
    default:
      target = 1;
  }

  console.log(`[Form] Submitting in ${mode} mode:`, { title, type, target, timeframe });

  try {
    if (mode === 'edit' && goalId) {
      // Edit mode: update existing goal
      const success = await updateGoal(goalId, {
        title,
        type,
        target,
        timeframe
      });

      if (success) {
        // Update the goal in local state
        const goalIndex = state.goals.findIndex(g => g.id === goalId);
        if (goalIndex !== -1) {
          state.goals[goalIndex] = {
            ...state.goals[goalIndex],
            title,
            type,
            target,
            timeframe
          };
        }
        console.log(`[Form] Goal ${goalId} updated successfully`);
        showSuccessFeedback('Goal updated successfully!');
      } else {
        console.error('[Form] Failed to update goal');
        showFormError('Failed to update goal. Please try again.');
        return;
      }
    } else {
      // Add mode: create new goal
      const newGoal = createGoal({
        title,
        type,
        target,
        timeframe,
        order: state.goals.length // Add at the end
      });

      // Save to storage
      const updatedGoals = [...state.goals, newGoal];
      const success = await saveGoals(updatedGoals);

      if (success) {
        // Update local state
        state.goals = updatedGoals;
        console.log(`[Form] New goal created:`, newGoal);
        showSuccessFeedback('Goal created successfully!');
      } else {
        console.error('[Form] Failed to save new goal');
        showFormError('Failed to save goal. Please try again.');
        return;
      }
    }

    // Close modal on success
    closeGoalModal();

    // Refresh the current screen to show updated goals
    renderCurrentScreen();

  } catch (error) {
    console.error('[Form] Error saving goal:', error);
    showFormError('An error occurred while saving. Please try again.');
  }
}

// =============================================================================
// US-023: Add Goal Form - Title Input
// =============================================================================

/**
 * Validate the title input field
 * @returns {boolean} True if valid, false otherwise
 */
function validateTitleInput() {
  const titleInput = document.getElementById('goal-title');
  const errorElement = document.getElementById('goal-title-error');

  if (!titleInput || !errorElement) {
    console.error('Title input or error element not found');
    return false;
  }

  const title = titleInput.value.trim();

  // Clear previous error state
  clearInputError(titleInput, errorElement);

  // Validation: Required field check
  if (!title) {
    showInputError(titleInput, errorElement, 'Goal title is required');
    titleInput.focus();
    return false;
  }

  // Validation passed
  return true;
}

/**
 * Show error state for an input field
 * @param {HTMLInputElement} input - The input element
 * @param {HTMLElement} errorElement - The error message element
 * @param {string} message - The error message to display
 */
function showInputError(input, errorElement, message) {
  input.classList.add('has-error');
  input.classList.remove('is-valid');
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', errorElement.id);

  errorElement.textContent = message;
  errorElement.classList.add('visible');
}

/**
 * Clear error state for an input field
 * @param {HTMLInputElement} input - The input element
 * @param {HTMLElement} errorElement - The error message element
 */
function clearInputError(input, errorElement) {
  input.classList.remove('has-error');
  input.setAttribute('aria-invalid', 'false');

  errorElement.textContent = '';
  errorElement.classList.remove('visible');
}

/**
 * Get the current title value from the form
 * @returns {string} The trimmed title value
 */
function getFormTitle() {
  const titleInput = document.getElementById('goal-title');
  return titleInput ? titleInput.value.trim() : '';
}

/**
 * Set the title value in the form (for edit mode)
 * @param {string} title - The title to set
 */
function setFormTitle(title) {
  const titleInput = document.getElementById('goal-title');
  if (titleInput) {
    titleInput.value = title || '';
  }
}

/**
 * Reset the form to its initial state
 */
function resetGoalForm() {
  const form = document.getElementById('goal-form');
  const titleInput = document.getElementById('goal-title');
  const titleError = document.getElementById('goal-title-error');

  if (form) {
    form.reset();
  }

  // Clear any validation errors
  if (titleInput && titleError) {
    clearInputError(titleInput, titleError);
  }

  // US-024: Reset type selector to default (Timer)
  resetTypeSelector();

  // US-025: Reset timer target to default values
  resetTimerTarget();

  // US-026: Reset counter target to default value
  resetCounterTarget();

  // US-027: Reset timeframe selector to default (Daily)
  resetTimeframeSelector();
}

/**
 * Focus the title input when modal opens
 */
function focusTitleInput() {
  const titleInput = document.getElementById('goal-title');
  if (titleInput) {
    // Slight delay to ensure modal animation completes
    setTimeout(() => {
      titleInput.focus();
    }, 100);
  }
}

// =============================================================================
// US-024: Add Goal Form - Type Selector
// =============================================================================

/**
 * Get the currently selected goal type from the form
 * @returns {string} The selected goal type ('timer', 'counter', or 'checkbox')
 */
function getFormType() {
  const typeInput = document.getElementById('goal-type');
  return typeInput ? typeInput.value : GOAL_TYPES.TIMER;
}

/**
 * Set the goal type in the form (for edit mode)
 * @param {string} type - The goal type to set
 */
function setFormType(type) {
  const typeInput = document.getElementById('goal-type');
  const typeSelector = document.querySelector('.type-selector');

  if (typeInput) {
    typeInput.value = type;
  }

  if (typeSelector) {
    // Remove active class from all options
    const options = typeSelector.querySelectorAll('.type-option');
    options.forEach(option => {
      option.classList.remove('active');
      option.setAttribute('aria-checked', 'false');
    });

    // Add active class to selected option
    const selectedOption = typeSelector.querySelector(`[data-type="${type}"]`);
    if (selectedOption) {
      selectedOption.classList.add('active');
      selectedOption.setAttribute('aria-checked', 'true');
    }
  }

  // Trigger target input visibility update (for US-025/US-026)
  updateTargetInputVisibility(type);
}

/**
 * Handle type option click in the type selector
 * @param {string} type - The selected type
 */
function handleTypeSelection(type) {
  console.log(`[Form] Type selected: ${type}`);
  setFormType(type);
}

/**
 * Update target input visibility based on selected type
 * US-025: Shows timer target input when Timer type is selected
 * US-026: Shows counter target input when Counter type is selected
 * @param {string} type - The selected goal type
 */
function updateTargetInputVisibility(type) {
  const timerTargetGroup = document.getElementById('timer-target-group');
  const counterTargetGroup = document.getElementById('counter-target-group');

  // Show/hide timer target input
  if (timerTargetGroup) {
    if (type === GOAL_TYPES.TIMER) {
      timerTargetGroup.classList.remove('hidden');
    } else {
      timerTargetGroup.classList.add('hidden');
    }
  }

  // US-026: Show/hide counter target input
  if (counterTargetGroup) {
    if (type === GOAL_TYPES.COUNTER) {
      counterTargetGroup.classList.remove('hidden');
    } else {
      counterTargetGroup.classList.add('hidden');
    }
  }

  console.log(`[Form] Target input visibility updated for type: ${type}`);
}

// =============================================================================
// US-025: Add Goal Form - Target Input (Timer)
// =============================================================================

/**
 * Get the timer target value from the form in seconds
 * @returns {number} The target time in seconds
 */
function getTimerTarget() {
  const hoursInput = document.getElementById('timer-target-hours');
  const minutesInput = document.getElementById('timer-target-minutes');

  const hours = parseInt(hoursInput?.value, 10) || 0;
  const minutes = parseInt(minutesInput?.value, 10) || 0;

  // Convert to seconds
  return (hours * 3600) + (minutes * 60);
}

/**
 * Set the timer target value in the form from seconds
 * @param {number} seconds - The target time in seconds
 */
function setTimerTarget(seconds) {
  const hoursInput = document.getElementById('timer-target-hours');
  const minutesInput = document.getElementById('timer-target-minutes');

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hoursInput) {
    hoursInput.value = hours;
  }
  if (minutesInput) {
    minutesInput.value = minutes;
  }
}

/**
 * Validate the timer target input
 * @returns {boolean} True if valid, false otherwise
 */
function validateTimerTarget() {
  const hoursInput = document.getElementById('timer-target-hours');
  const minutesInput = document.getElementById('timer-target-minutes');
  const errorElement = document.getElementById('timer-target-error');

  if (!hoursInput || !minutesInput || !errorElement) {
    console.error('Timer target input elements not found');
    return false;
  }

  // Clear previous errors
  clearTimerTargetError();

  const hours = parseInt(hoursInput.value, 10);
  const minutes = parseInt(minutesInput.value, 10);

  // Validate hours range (0-23)
  if (isNaN(hours) || hours < 0 || hours > 23) {
    showTimerTargetError('Hours must be between 0 and 23');
    hoursInput.classList.add('has-error');
    hoursInput.focus();
    return false;
  }

  // Validate minutes range (0-59)
  if (isNaN(minutes) || minutes < 0 || minutes > 59) {
    showTimerTargetError('Minutes must be between 0 and 59');
    minutesInput.classList.add('has-error');
    minutesInput.focus();
    return false;
  }

  // Validate that at least some time is set (not 0:00)
  if (hours === 0 && minutes === 0) {
    showTimerTargetError('Please set a target time greater than 0');
    hoursInput.classList.add('has-error');
    minutesInput.classList.add('has-error');
    hoursInput.focus();
    return false;
  }

  return true;
}

/**
 * Show error message for timer target
 * @param {string} message - The error message to display
 */
function showTimerTargetError(message) {
  const errorElement = document.getElementById('timer-target-error');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add('visible');
  }
}

/**
 * Clear error state for timer target inputs
 */
function clearTimerTargetError() {
  const hoursInput = document.getElementById('timer-target-hours');
  const minutesInput = document.getElementById('timer-target-minutes');
  const errorElement = document.getElementById('timer-target-error');

  if (hoursInput) {
    hoursInput.classList.remove('has-error');
  }
  if (minutesInput) {
    minutesInput.classList.remove('has-error');
  }
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.classList.remove('visible');
  }
}

/**
 * Reset the timer target inputs to default values
 */
function resetTimerTarget() {
  const hoursInput = document.getElementById('timer-target-hours');
  const minutesInput = document.getElementById('timer-target-minutes');

  if (hoursInput) {
    hoursInput.value = '1'; // Default to 1 hour
  }
  if (minutesInput) {
    minutesInput.value = '0';
  }

  clearTimerTargetError();
}

// =============================================================================
// US-026: Add Goal Form - Target Input (Counter)
// =============================================================================

/**
 * Get the counter target value from the form
 * @returns {number} The target count (minimum 1)
 */
function getCounterTarget() {
  const counterInput = document.getElementById('counter-target');
  const value = parseInt(counterInput?.value, 10);
  return isNaN(value) || value < 1 ? 1 : value;
}

/**
 * Set the counter target value in the form
 * @param {number} count - The target count to set
 */
function setCounterTarget(count) {
  const counterInput = document.getElementById('counter-target');
  if (counterInput) {
    counterInput.value = Math.max(1, count || 10);
  }
}

/**
 * Validate the counter target input
 * @returns {boolean} True if valid, false otherwise
 */
function validateCounterTarget() {
  const counterInput = document.getElementById('counter-target');
  const errorElement = document.getElementById('counter-target-error');

  if (!counterInput || !errorElement) {
    console.error('Counter target input elements not found');
    return false;
  }

  // Clear previous errors
  clearCounterTargetError();

  const value = parseInt(counterInput.value, 10);

  // Validate that a value is provided
  if (counterInput.value === '' || isNaN(value)) {
    showCounterTargetError('Please enter a target count');
    counterInput.classList.add('has-error');
    counterInput.focus();
    return false;
  }

  // Validate minimum value (1)
  if (value < 1) {
    showCounterTargetError('Target must be at least 1');
    counterInput.classList.add('has-error');
    counterInput.focus();
    return false;
  }

  // Validate it's a positive integer
  if (!Number.isInteger(value) || value <= 0) {
    showCounterTargetError('Please enter a positive whole number');
    counterInput.classList.add('has-error');
    counterInput.focus();
    return false;
  }

  return true;
}

/**
 * Show error message for counter target
 * @param {string} message - The error message to display
 */
function showCounterTargetError(message) {
  const errorElement = document.getElementById('counter-target-error');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add('visible');
  }
}

/**
 * Clear error state for counter target input
 */
function clearCounterTargetError() {
  const counterInput = document.getElementById('counter-target');
  const errorElement = document.getElementById('counter-target-error');

  if (counterInput) {
    counterInput.classList.remove('has-error');
  }
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.classList.remove('visible');
  }
}

/**
 * Reset the counter target input to default value
 */
function resetCounterTarget() {
  const counterInput = document.getElementById('counter-target');

  if (counterInput) {
    counterInput.value = '10'; // Default to 10
  }

  clearCounterTargetError();
}

/**
 * Attach type selector event listeners
 */
function attachTypeSelectorListeners() {
  const typeSelector = document.querySelector('.type-selector');

  if (!typeSelector) {
    return;
  }

  const typeOptions = typeSelector.querySelectorAll('.type-option');
  typeOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      const type = option.getAttribute('data-type');
      if (type) {
        handleTypeSelection(type);
      }
    });

    // Keyboard navigation support
    option.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const type = option.getAttribute('data-type');
        if (type) {
          handleTypeSelection(type);
        }
      }
    });
  });
}

/**
 * Reset the type selector to default (Timer)
 */
function resetTypeSelector() {
  setFormType(GOAL_TYPES.TIMER);
}

// =============================================================================
// US-027: Add Goal Form - Timeframe Selector
// =============================================================================

/**
 * Get the currently selected timeframe from the form
 * @returns {string} The selected timeframe ('daily', 'weekly', 'monthly', or 'yearly')
 */
function getFormTimeframe() {
  const timeframeInput = document.getElementById('goal-timeframe');
  return timeframeInput ? timeframeInput.value : TIMEFRAMES.DAILY;
}

/**
 * Set the timeframe in the form (for edit mode)
 * @param {string} timeframe - The timeframe to set
 */
function setFormTimeframe(timeframe) {
  const timeframeInput = document.getElementById('goal-timeframe');
  const timeframeSelector = document.querySelector('.timeframe-selector');

  if (timeframeInput) {
    timeframeInput.value = timeframe;
  }

  if (timeframeSelector) {
    // Remove active class from all options
    const options = timeframeSelector.querySelectorAll('.timeframe-option');
    options.forEach(option => {
      option.classList.remove('active');
      option.setAttribute('aria-checked', 'false');
    });

    // Add active class to selected option
    const selectedOption = timeframeSelector.querySelector(`[data-timeframe="${timeframe}"]`);
    if (selectedOption) {
      selectedOption.classList.add('active');
      selectedOption.setAttribute('aria-checked', 'true');
    }
  }

  // Update the hint text
  updateTimeframeHint(timeframe);
}

/**
 * Handle timeframe option click in the selector
 * @param {string} timeframe - The selected timeframe
 */
function handleTimeframeSelection(timeframe) {
  console.log(`[Form] Timeframe selected: ${timeframe}`);
  setFormTimeframe(timeframe);
}

/**
 * Update the timeframe hint text based on selection
 * @param {string} timeframe - The selected timeframe
 */
function updateTimeframeHint(timeframe) {
  const hintContainer = document.getElementById('timeframe-hint');
  if (!hintContainer) return;

  // Hide all hints
  const hints = hintContainer.querySelectorAll('span');
  hints.forEach(hint => {
    hint.style.display = 'none';
    hint.classList.remove('visible');
  });

  // Show the selected hint
  const selectedHint = hintContainer.querySelector(`.hint-${timeframe}`);
  if (selectedHint) {
    selectedHint.style.display = 'inline';
    selectedHint.classList.add('visible');
  }
}

/**
 * Attach timeframe selector event listeners
 */
function attachTimeframeSelectorListeners() {
  const timeframeSelector = document.querySelector('.timeframe-selector');

  if (!timeframeSelector) {
    return;
  }

  const timeframeOptions = timeframeSelector.querySelectorAll('.timeframe-option');
  timeframeOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      const timeframe = option.getAttribute('data-timeframe');
      if (timeframe) {
        handleTimeframeSelection(timeframe);
      }
    });

    // Keyboard navigation support
    option.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const timeframe = option.getAttribute('data-timeframe');
        if (timeframe) {
          handleTimeframeSelection(timeframe);
        }
      }
    });
  });
}

/**
 * Reset the timeframe selector to default (Daily)
 */
function resetTimeframeSelector() {
  setFormTimeframe(TIMEFRAMES.DAILY);
}

// =============================================================================
// US-028: Add Goal Form - Save Logic (Feedback Functions)
// =============================================================================

/**
 * Show success feedback to the user (brief toast notification)
 * @param {string} message - The success message to display
 */
function showSuccessFeedback(message) {
  // Create toast element if it doesn't exist
  let toast = document.getElementById('feedback-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'feedback-toast';
    toast.className = 'feedback-toast';
    document.body.appendChild(toast);
  }

  // Set success styling and message
  toast.className = 'feedback-toast success';
  toast.innerHTML = `
    <span class="toast-icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  // Show the toast
  toast.classList.add('visible');

  // Auto-hide after 2.5 seconds
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 2500);

  console.log(`[Feedback] Success: ${message}`);
}

/**
 * Show error feedback in the form (general form error)
 * @param {string} message - The error message to display
 */
function showFormError(message) {
  // Create or update form error element
  let formError = document.getElementById('goal-form-error');
  if (!formError) {
    formError = document.createElement('div');
    formError.id = 'goal-form-error';
    formError.className = 'form-error-banner';
    formError.setAttribute('role', 'alert');
    formError.setAttribute('aria-live', 'polite');

    // Insert at the top of the modal body
    const modalBody = document.querySelector('.modal-body');
    if (modalBody) {
      modalBody.insertBefore(formError, modalBody.firstChild);
    }
  }

  formError.innerHTML = `
    <span class="error-icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </span>
    <span class="error-message">${escapeHtml(message)}</span>
  `;

  formError.classList.add('visible');

  // Auto-hide after 5 seconds
  setTimeout(() => {
    formError.classList.remove('visible');
  }, 5000);

  console.log(`[Feedback] Error: ${message}`);
}

/**
 * Clear any form error banner
 */
function clearFormError() {
  const formError = document.getElementById('goal-form-error');
  if (formError) {
    formError.classList.remove('visible');
    formError.textContent = '';
  }
}

/**
 * Render a single goal item for the Manage Goals list
 * US-021: Shows title, type icon, timeframe badge, Edit and Delete buttons
 * Different from View Goals screen - no progress controls, management focused
 * @param {Object} goal - The goal object
 * @returns {string} HTML string for the goal list item
 */
function renderManageGoalItem(goal) {
  const typeIcon = getGoalTypeIconSmall(goal.type);
  const typeLabel = getGoalTypeLabel(goal.type);
  const targetDisplay = formatTargetForManage(goal);

  return `
    <div class="manage-goal-item" data-goal-id="${goal.id}">
      <div class="manage-goal-info">
        <div class="manage-goal-type-indicator type-${goal.type}" title="${typeLabel}">
          ${typeIcon}
        </div>
        <div class="manage-goal-details">
          <span class="manage-goal-title">${escapeHtml(goal.title)}</span>
          <div class="manage-goal-meta">
            <span class="manage-goal-timeframe timeframe-${goal.timeframe}">${capitalizeFirst(goal.timeframe)}</span>
            <span class="manage-goal-target">${targetDisplay}</span>
          </div>
        </div>
      </div>
      <div class="manage-goal-actions">
        <button class="manage-action-btn save-template-btn" data-action="save-template" data-goal-id="${goal.id}" title="Save as template" aria-label="Save ${escapeHtml(goal.title)} as template">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="action-icon">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
        </button>
        <button class="manage-action-btn archive-btn" data-action="archive" data-goal-id="${goal.id}" title="Archive goal" aria-label="Archive ${escapeHtml(goal.title)}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="action-icon">
            <polyline points="21 8 21 21 3 21 3 8"/>
            <rect x="1" y="3" width="22" height="5"/>
            <line x1="10" y1="12" x2="14" y2="12"/>
          </svg>
        </button>
        <button class="manage-action-btn edit-btn" data-action="edit" data-goal-id="${goal.id}" title="Edit goal" aria-label="Edit ${escapeHtml(goal.title)}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="action-icon">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="manage-action-btn delete-btn" data-action="delete" data-goal-id="${goal.id}" title="Delete goal" aria-label="Delete ${escapeHtml(goal.title)}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="action-icon">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

/**
 * Render the Reports screen
 * US-043: Reports Screen Layout
 */
function renderReportsScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.REPORTS]);
  if (!screen) return;

  // Get current streak data from state
  const currentStreak = state.streakData?.currentStreak || 0;
  const bestStreak = state.streakData?.bestStreak || 0;

  // US-043: Full Reports Screen Layout with all sections
  screen.innerHTML = `
    <div class="reports-screen">
      <header class="screen-header reports-header">
        <button class="back-btn" data-screen="${SCREENS.VIEW_GOALS}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="back-icon">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span class="back-label">Back</span>
        </button>
        <h1 class="reports-title">Reports</h1>
        <div class="header-spacer"></div>
      </header>
      <main class="reports-content">
        <!-- Discipline Score Section - Prominent display -->
        <section class="reports-section discipline-section">
          <div class="discipline-score-card">
            <div class="discipline-score-display">
              <span class="discipline-score-value" id="discipline-score-value">--</span>
              <span class="discipline-score-max">/100</span>
            </div>
            <div class="discipline-score-label">Discipline Score</div>
            <div class="discipline-score-description">Based on last 7 days</div>
          </div>
        </section>

        <!-- Streak Section -->
        <section class="reports-section streak-section">
          <div class="streak-cards">
            <div class="streak-card current-streak-card ${currentStreak > 0 ? 'active' : ''}">
              <div class="streak-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                </svg>
              </div>
              <div class="streak-info">
                <span class="streak-value" id="current-streak-value">${currentStreak}</span>
                <span class="streak-label">day streak</span>
              </div>
            </div>
            <div class="streak-card best-streak-card">
              <div class="streak-icon best">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <div class="streak-info">
                <span class="streak-value" id="best-streak-value">${bestStreak}</span>
                <span class="streak-label">best streak</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Stats Cards Section -->
        <section class="reports-section stats-section">
          <h2 class="section-title">Completion Stats</h2>
          <div class="stats-cards">
            <div class="stat-card">
              <div class="stat-card-icon today-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              </div>
              <div class="stat-card-content">
                <span class="stat-card-value" id="today-completed">--/--</span>
                <span class="stat-card-label">Today</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon week-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div class="stat-card-content">
                <span class="stat-card-value" id="week-completed">--/--</span>
                <span class="stat-card-label">This Week</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon month-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div class="stat-card-content">
                <span class="stat-card-value" id="month-completed">--/--</span>
                <span class="stat-card-label">This Month</span>
              </div>
            </div>
          </div>
        </section>

        <!-- US-047: Weekly Chart Section -->
        <section class="reports-section charts-section">
          <h2 class="section-title">Weekly Overview</h2>
          <div class="weekly-chart" id="weekly-chart-container">
            <div class="chart-bars" id="chart-bars">
              <!-- Bars will be rendered dynamically -->
            </div>
            <div class="chart-labels" id="chart-labels">
              <!-- Day labels will be rendered dynamically -->
            </div>
          </div>
        </section>

        <!-- US-049: Activity Timeline Heatmap Section -->
        <section class="reports-section heatmap-section">
          <h2 class="section-title">Activity Timeline</h2>
          <div class="activity-heatmap" id="activity-heatmap">
            <div class="heatmap-container">
              <div class="heatmap-hour-labels" id="heatmap-hour-labels">
                <!-- Hour labels will be rendered dynamically -->
              </div>
              <div class="heatmap-grid-wrapper">
                <div class="heatmap-day-labels" id="heatmap-day-labels">
                  <!-- Day labels will be rendered dynamically -->
                </div>
                <div class="heatmap-grid" id="heatmap-grid">
                  <!-- Heatmap cells will be rendered dynamically -->
                </div>
              </div>
            </div>
            <div class="heatmap-legend" id="heatmap-legend">
              <span class="legend-label">Less</span>
              <div class="legend-scale">
                <div class="legend-cell level-0"></div>
                <div class="legend-cell level-1"></div>
                <div class="legend-cell level-2"></div>
                <div class="legend-cell level-3"></div>
                <div class="legend-cell level-4"></div>
              </div>
              <span class="legend-label">More</span>
            </div>
          </div>
        </section>

        <!-- US-072: Weekly Review Navigation -->
        <section class="reports-section weekly-review-nav-section">
          <button class="weekly-review-nav-btn" data-screen="${SCREENS.WEEKLY_REVIEW}">
            <div class="weekly-review-nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <polyline points="9 16 12 13 15 16"/>
              </svg>
            </div>
            <div class="weekly-review-nav-content">
              <span class="weekly-review-nav-title">Weekly Review</span>
              <span class="weekly-review-nav-desc">See your weekly summary and achievements</span>
            </div>
            <div class="weekly-review-nav-arrow">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </button>
        </section>
      </main>
    </div>
  `;

  // Attach navigation event listeners
  attachNavigationListeners(screen);

  // Update stats with current data (placeholder values - will be calculated in US-044/US-046)
  updateReportsStats();
}

/**
 * Update the reports screen with calculated statistics
 * US-044: Implements discipline score calculation and display
 * US-046: Implements completion stats cards (Today, This Week, This Month)
 */
async function updateReportsStats() {
  // Get history data for week/month calculations
  const history = await getHistory();

  // Get today's completion count from current goals
  const totalGoals = state.goals.length;
  const completedGoals = state.goals.filter(goal => isGoalCompleted(goal)).length;

  // Update Today's stat (from current goal data)
  const todayCompletedEl = document.getElementById('today-completed');
  if (todayCompletedEl) {
    todayCompletedEl.textContent = `${completedGoals}/${totalGoals}`;
  }

  // US-046: Calculate week and month completion stats
  const weekStats = calculateWeekCompletionStats(history, state.goals);
  const monthStats = calculateMonthCompletionStats(history, state.goals);

  const weekCompletedEl = document.getElementById('week-completed');
  if (weekCompletedEl) {
    weekCompletedEl.textContent = `${weekStats.completed}/${weekStats.total}`;
  }

  const monthCompletedEl = document.getElementById('month-completed');
  if (monthCompletedEl) {
    monthCompletedEl.textContent = `${monthStats.completed}/${monthStats.total}`;
  }

  // US-044: Calculate and display discipline score
  await updateDisciplineScore();

  // US-045: Calculate and display streak data
  await updateStreakDisplay();

  // US-047: Render weekly chart
  renderWeeklyChart(history, state.goals);

  // US-049: Render activity heatmap
  await renderActivityHeatmap();
}

/**
 * Calculate and display the discipline score
 * US-044: Discipline Score Implementation
 *
 * Formula: (completed goals / total goals) * 100 averaged over last 7 days
 * Color coding: green (>80), yellow (>50), red (<50)
 */
async function updateDisciplineScore() {
  const disciplineScoreEl = document.getElementById('discipline-score-value');
  if (!disciplineScoreEl) return;

  // Get history data
  const history = await getHistory();

  // Calculate score based on last 7 days
  const score = calculateDisciplineScore(history, state.goals);

  // Update the display
  disciplineScoreEl.textContent = score === null ? '--' : Math.round(score);

  // Apply color coding
  // Remove any existing score classes
  disciplineScoreEl.classList.remove(
    'score-excellent',
    'score-good',
    'score-moderate',
    'score-needs-improvement'
  );

  // Apply appropriate color class based on score
  // Color coding per US-044: green (>80), yellow (>50), red (<50)
  if (score !== null) {
    if (score > 80) {
      disciplineScoreEl.classList.add('score-excellent'); // green
    } else if (score > 50) {
      disciplineScoreEl.classList.add('score-moderate'); // yellow/warning
    } else {
      disciplineScoreEl.classList.add('score-needs-improvement'); // red
    }
  }
}

/**
 * Calculate the discipline score from history data
 * US-044: Score calculation logic
 *
 * @param {Array} history - Array of history entries
 * @param {Array} currentGoals - Current goals array (used for today's data)
 * @returns {number|null} The discipline score (0-100) or null if insufficient data
 */
function calculateDisciplineScore(history, currentGoals) {
  const today = getTodayDateString();
  const sevenDaysAgo = getDateStringDaysAgo(6); // 6 days ago + today = 7 days

  // Get history for the last 7 days (excluding today which we'll calculate from current goals)
  const last7DaysHistory = filterHistoryByDateRange(history, sevenDaysAgo, today);

  // Group history by date
  const historyByDate = groupHistoryByDate(last7DaysHistory);

  // Calculate daily completion rates
  const dailyRates = [];

  // Process historical days (past 6 days)
  for (let i = 6; i >= 1; i--) {
    const dateStr = getDateStringDaysAgo(i);
    const dayEntries = historyByDate[dateStr] || [];

    if (dayEntries.length > 0) {
      const completedCount = dayEntries.filter(entry => entry.completed).length;
      const totalCount = dayEntries.length;
      const rate = (completedCount / totalCount) * 100;
      dailyRates.push(rate);
    }
    // If no history for a day, we don't include it in the calculation
    // This avoids penalizing users for days before they started using the extension
  }

  // Add today's completion rate from current goals
  if (currentGoals.length > 0) {
    const todayCompleted = currentGoals.filter(goal => isGoalCompleted(goal)).length;
    const todayRate = (todayCompleted / currentGoals.length) * 100;
    dailyRates.push(todayRate);
  }

  // If we have no data at all, return null
  if (dailyRates.length === 0) {
    return null;
  }

  // Calculate average
  const averageScore = dailyRates.reduce((sum, rate) => sum + rate, 0) / dailyRates.length;

  return averageScore;
}

/**
 * Calculate completion stats for the current week
 * US-046: Week completion stats calculation
 *
 * Counts total goals completed vs total goals from Monday to today
 * Combines history data (past days this week) with current goals (today)
 *
 * @param {Array} history - Array of history entries
 * @param {Array} currentGoals - Current goals array (for today's data)
 * @returns {Object} Object with completed and total counts
 */
function calculateWeekCompletionStats(history, currentGoals) {
  const today = getTodayDateString();
  const weekStart = getWeekStartDateString();

  // Get history for this week (excluding today)
  const weekHistory = filterHistoryByDateRange(history, weekStart, today);

  // Filter out today's history entries since we use currentGoals for today
  const pastDaysHistory = weekHistory.filter(entry => entry.date !== today);

  // Count completed and total from past days this week
  let completed = pastDaysHistory.filter(entry => entry.completed).length;
  let total = pastDaysHistory.length;

  // Add today's stats from current goals
  const todayCompleted = currentGoals.filter(goal => isGoalCompleted(goal)).length;
  completed += todayCompleted;
  total += currentGoals.length;

  return { completed, total };
}

/**
 * Calculate completion stats for the current month
 * US-046: Month completion stats calculation
 *
 * Counts total goals completed vs total goals from 1st of month to today
 * Combines history data (past days this month) with current goals (today)
 *
 * @param {Array} history - Array of history entries
 * @param {Array} currentGoals - Current goals array (for today's data)
 * @returns {Object} Object with completed and total counts
 */
function calculateMonthCompletionStats(history, currentGoals) {
  const today = getTodayDateString();
  const monthStart = getMonthStartDateString();

  // Get history for this month (excluding today)
  const monthHistory = filterHistoryByDateRange(history, monthStart, today);

  // Filter out today's history entries since we use currentGoals for today
  const pastDaysHistory = monthHistory.filter(entry => entry.date !== today);

  // Count completed and total from past days this month
  let completed = pastDaysHistory.filter(entry => entry.completed).length;
  let total = pastDaysHistory.length;

  // Add today's stats from current goals
  const todayCompleted = currentGoals.filter(goal => isGoalCompleted(goal)).length;
  completed += todayCompleted;
  total += currentGoals.length;

  return { completed, total };
}

/**
 * Render the weekly chart showing completion rates for the last 7 days
 * US-047: Weekly Chart Implementation
 *
 * @param {Array} history - Array of history entries
 * @param {Array} currentGoals - Current goals array (for today's data)
 */
function renderWeeklyChart(history, currentGoals) {
  const chartBarsContainer = document.getElementById('chart-bars');
  const chartLabelsContainer = document.getElementById('chart-labels');

  if (!chartBarsContainer || !chartLabelsContainer) return;

  // Calculate chart data for last 7 days
  const chartData = calculateWeeklyChartData(history, currentGoals);

  // Day abbreviations (Mon-Sun)
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Clear existing content
  chartBarsContainer.innerHTML = '';
  chartLabelsContainer.innerHTML = '';

  // Render bars and labels
  chartData.forEach((dayData, index) => {
    // Create bar container
    const barContainer = document.createElement('div');
    barContainer.className = 'chart-bar-container';

    // Create the bar
    const bar = document.createElement('div');
    bar.className = 'chart-bar';

    // Apply color class based on percentage
    if (dayData.percentage === 0) {
      bar.classList.add('chart-bar-empty');
    } else if (dayData.percentage >= 80) {
      bar.classList.add('chart-bar-excellent');
    } else if (dayData.percentage >= 50) {
      bar.classList.add('chart-bar-moderate');
    } else {
      bar.classList.add('chart-bar-low');
    }

    // Set bar height based on percentage (minimum 4px for visibility)
    const barHeight = dayData.percentage > 0 ? Math.max(4, dayData.percentage) : 0;
    bar.style.height = `${barHeight}%`;

    // Add tooltip with details
    bar.setAttribute('title', `${dayData.completed}/${dayData.total} completed (${Math.round(dayData.percentage)}%)`);
    bar.setAttribute('data-percentage', Math.round(dayData.percentage));

    barContainer.appendChild(bar);
    chartBarsContainer.appendChild(barContainer);

    // Create label
    const label = document.createElement('span');
    label.className = 'chart-label';
    label.textContent = dayNames[dayData.dayOfWeek];

    // Mark today's label
    if (dayData.isToday) {
      label.classList.add('chart-label-today');
    }

    chartLabelsContainer.appendChild(label);
  });
}

/**
 * Calculate chart data for the last 7 days
 * US-047: Data calculation for weekly chart
 *
 * @param {Array} history - Array of history entries
 * @param {Array} currentGoals - Current goals array (for today's data)
 * @returns {Array} Array of objects with completed, total, percentage, dayOfWeek, isToday
 */
function calculateWeeklyChartData(history, currentGoals) {
  const today = getTodayDateString();
  const chartData = [];

  // Group history by date for efficient lookup
  const historyByDate = groupHistoryByDate(history);

  // Get data for last 7 days (starting from 6 days ago to today)
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1; // Convert to Mon=0, Sun=6

    let completed = 0;
    let total = 0;

    if (dateStr === today) {
      // Use current goals for today
      total = currentGoals.length;
      completed = currentGoals.filter(goal => isGoalCompleted(goal)).length;
    } else {
      // Use history for past days
      const dayHistory = historyByDate[dateStr] || [];
      total = dayHistory.length;
      completed = dayHistory.filter(entry => entry.completed).length;
    }

    const percentage = total > 0 ? (completed / total) * 100 : 0;

    chartData.push({
      date: dateStr,
      dayOfWeek,
      completed,
      total,
      percentage,
      isToday: dateStr === today
    });
  }

  return chartData;
}

/**
 * Render the activity heatmap showing when user worked on goals
 * US-049: Activity Timeline - Heatmap
 *
 * Display grid: rows = days (last 7), columns = hours (0-23)
 * Cell color intensity = activity level
 * Focus on timer goals showing when user worked
 */
async function renderActivityHeatmap() {
  const gridContainer = document.getElementById('heatmap-grid');
  const hourLabelsContainer = document.getElementById('heatmap-hour-labels');
  const dayLabelsContainer = document.getElementById('heatmap-day-labels');

  if (!gridContainer || !hourLabelsContainer || !dayLabelsContainer) return;

  // Get activity log data
  const activityLog = await getActivityLog();

  // Calculate date range (last 7 days)
  const today = getTodayDateString();
  const startDate = getDateStringDaysAgo(6);

  // Get activity data grouped by date and hour
  const activityByDateAndHour = getActivityByHourForDateRange(activityLog, null, startDate, today);

  // Find max activity for normalization (for color intensity)
  let maxActivity = 0;
  Object.values(activityByDateAndHour).forEach(dayData => {
    dayData.forEach(hourData => {
      // For timer goals, use duration; for others, use count
      const activityLevel = hourData.duration > 0 ? hourData.duration / 60 : hourData.count;
      if (activityLevel > maxActivity) {
        maxActivity = activityLevel;
      }
    });
  });

  // Render hour labels (showing every 3rd hour for compact display)
  const hourLabels = [0, 3, 6, 9, 12, 15, 18, 21];
  hourLabelsContainer.innerHTML = hourLabels.map(hour => {
    const displayHour = hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`;
    return `<span class="heatmap-hour-label" style="grid-column: ${hour + 1}">${displayHour}</span>`;
  }).join('');

  // Generate list of dates for last 7 days (oldest to newest)
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    dates.push(getDateStringDaysAgo(i));
  }

  // Render day labels
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayLabelsContainer.innerHTML = dates.map(dateStr => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayName = dayNames[date.getDay()];
    const isToday = dateStr === today;
    return `<span class="heatmap-day-label${isToday ? ' heatmap-day-today' : ''}">${dayName}</span>`;
  }).join('');

  // Render heatmap grid (7 rows x 24 columns)
  let gridHTML = '';
  dates.forEach((dateStr, rowIndex) => {
    const dayData = activityByDateAndHour[dateStr] || [];

    for (let hour = 0; hour < 24; hour++) {
      const hourData = dayData[hour] || { count: 0, duration: 0 };

      // Calculate activity level (use duration for timers, count for others)
      const activityLevel = hourData.duration > 0 ? hourData.duration / 60 : hourData.count;

      // Normalize to 0-4 scale for color intensity
      const intensityLevel = maxActivity > 0
        ? Math.min(4, Math.ceil((activityLevel / maxActivity) * 4))
        : 0;

      // Format tooltip text
      const tooltipParts = [];
      if (hourData.count > 0) {
        tooltipParts.push(`${hourData.count} action${hourData.count !== 1 ? 's' : ''}`);
      }
      if (hourData.duration > 0) {
        const minutes = Math.round(hourData.duration / 60);
        tooltipParts.push(`${minutes} min`);
      }
      const tooltipText = tooltipParts.length > 0
        ? tooltipParts.join(', ')
        : 'No activity';

      const hourDisplay = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
      const date = new Date(dateStr + 'T00:00:00');
      const dayDisplay = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      gridHTML += `<div class="heatmap-cell level-${intensityLevel}"
        data-date="${dateStr}"
        data-hour="${hour}"
        data-tooltip="${dayDisplay}, ${hourDisplay}: ${tooltipText}"
        title="${dayDisplay}, ${hourDisplay}: ${tooltipText}"></div>`;
    }
  });

  gridContainer.innerHTML = gridHTML;
}

/**
 * Calculate and update streak data
 * US-045: Streak Counter Implementation
 *
 * Streak = consecutive days where ALL daily goals were completed
 * Breaks if any goal was missed on a day
 */
async function updateStreakDisplay() {
  const currentStreakEl = document.getElementById('current-streak-value');
  const bestStreakEl = document.getElementById('best-streak-value');
  const currentStreakCard = document.querySelector('.current-streak-card');

  if (!currentStreakEl || !bestStreakEl) return;

  // Get history data
  const history = await getHistory();

  // Calculate streak from history
  const { currentStreak, bestStreak } = calculateStreakFromHistory(history, state.goals);

  // Update the display
  currentStreakEl.textContent = currentStreak;
  bestStreakEl.textContent = bestStreak;

  // Update the active class on the current streak card
  if (currentStreakCard) {
    if (currentStreak > 0) {
      currentStreakCard.classList.add('active');
    } else {
      currentStreakCard.classList.remove('active');
    }
  }

  // Update state and save to storage if streak changed
  const storedStreakData = await getStreakData();
  if (storedStreakData.currentStreak !== currentStreak || storedStreakData.bestStreak !== bestStreak) {
    const newStreakData = {
      currentStreak,
      bestStreak,
      lastCompletionDate: currentStreak > 0 ? getTodayDateString() : storedStreakData.lastCompletionDate
    };
    state.streakData = newStreakData;
    await saveStreakData(newStreakData);
  }
}

/**
 * Calculate streak from history data
 * US-045: Core streak calculation logic
 *
 * @param {Array} history - Array of history entries
 * @param {Array} currentGoals - Current goals array (for today's data)
 * @returns {Object} Object with currentStreak and bestStreak numbers
 */
function calculateStreakFromHistory(history, currentGoals) {
  const today = getTodayDateString();

  // Group history by date
  const historyByDate = groupHistoryByDate(history);

  // Build list of all unique dates in history, sorted in descending order (most recent first)
  const allDates = [...new Set(history.map(entry => entry.date))].sort().reverse();

  // Calculate whether today is fully completed (all daily goals)
  const dailyGoals = currentGoals.filter(goal => goal.timeframe === 'daily');
  const todayFullyCompleted = dailyGoals.length > 0 &&
    dailyGoals.every(goal => isGoalCompleted(goal));

  // Build a map of date -> whether ALL daily goals were completed that day
  const completionByDate = {};

  // Process historical data
  for (const [date, entries] of Object.entries(historyByDate)) {
    // Only consider daily goals for streak calculation
    const dailyEntries = entries.filter(entry => entry.timeframe === 'daily');
    if (dailyEntries.length === 0) {
      // No daily goals on this day - skip it
      continue;
    }
    // All daily goals must be completed
    const allCompleted = dailyEntries.every(entry => entry.completed);
    completionByDate[date] = allCompleted;
  }

  // Add today's status if there are daily goals
  if (dailyGoals.length > 0) {
    completionByDate[today] = todayFullyCompleted;
  }

  // Calculate current streak (consecutive days from today or yesterday going backwards)
  let currentStreak = 0;
  let checkDate = new Date();

  // If today isn't fully completed yet, start checking from yesterday
  // This allows users to maintain streak even if they haven't finished today yet
  if (!todayFullyCompleted) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count consecutive completed days
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];

    // If we have data for this date and it was completed, increment streak
    if (completionByDate[dateStr] === true) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (completionByDate[dateStr] === false) {
      // Day exists in data but wasn't completed - streak breaks
      break;
    } else {
      // No data for this date - assume no daily goals existed, check previous day
      // But limit how far back we go (90 days max)
      const daysDiff = Math.floor((Date.now() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 90) {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // If today is fully completed, add it to the streak if we didn't count it yet
  if (todayFullyCompleted && !completionByDate[getDateStringDaysAgo(1)]) {
    // Today is the start of a new streak
    currentStreak = Math.max(currentStreak, 1);
  }

  // Calculate best streak ever
  // Go through all dates in order and find the longest consecutive run
  let bestStreak = currentStreak;
  let tempStreak = 0;

  // Get all dates with completion data, sorted ascending
  const sortedDates = Object.keys(completionByDate).sort();

  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i];
    if (completionByDate[date]) {
      // Check if this is consecutive with previous day
      if (i > 0) {
        const prevDate = sortedDates[i - 1];
        const currentDateObj = new Date(date);
        const prevDateObj = new Date(prevDate);
        const dayDiff = Math.floor((currentDateObj - prevDateObj) / (1000 * 60 * 60 * 24));

        if (dayDiff === 1 && completionByDate[prevDate]) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Also compare with stored best streak (in case history was cleared)
  const storedBestStreak = state.streakData?.bestStreak || 0;
  bestStreak = Math.max(bestStreak, storedBestStreak);

  return { currentStreak, bestStreak };
}

/**
 * Render the Settings screen
 * US-052: Full settings screen with sound toggle, volume slider, dark mode toggle, and about section
 */
function renderSettingsScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.SETTINGS]);
  if (!screen) return;

  // Get current settings
  const themeSetting = state.settings?.theme || 'auto';
  const themeDisplayText = getThemeDisplayText(themeSetting);
  const effectiveTheme = getEffectiveTheme(themeSetting);
  const soundEnabled = state.settings?.soundEnabled !== false; // Default to true
  const soundVolume = state.settings?.soundVolume ?? 50; // Default to 50

  // US-052: Full settings screen layout
  screen.innerHTML = `
    <div class="settings-screen">
      <header class="screen-header">
        <button class="back-btn" data-screen="${SCREENS.VIEW_GOALS}">
          <span>&#8592;</span> Back
        </button>
        <h1>Settings</h1>
      </header>
      <main class="settings-content">
        <!-- Sound Settings Section -->
        <div class="settings-section">
          <h2>Sound</h2>

          <!-- Sound Effects Toggle -->
          <div class="setting-item setting-item-row" id="sound-toggle-row">
            <div class="setting-info">
              <span class="setting-label">Sound Effects</span>
              <span class="setting-description">Play sounds on goal interactions</span>
            </div>
            <label class="toggle-switch" aria-label="Toggle sound effects">
              <input type="checkbox" id="sound-toggle" ${soundEnabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <!-- Volume Slider -->
          <div class="setting-item setting-item-volume ${!soundEnabled ? 'disabled' : ''}">
            <div class="setting-info">
              <span class="setting-label">Volume</span>
            </div>
            <div class="volume-control">
              <svg class="volume-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                ${soundVolume === 0 || !soundEnabled ?
                  '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>' :
                  soundVolume < 50 ?
                  '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' :
                  '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>'
                }
              </svg>
              <input
                type="range"
                id="volume-slider"
                min="0"
                max="100"
                value="${soundVolume}"
                class="volume-slider"
                ${!soundEnabled ? 'disabled' : ''}
                aria-label="Volume level"
              >
              <span class="volume-value" id="volume-value">${soundVolume}%</span>
            </div>
          </div>
        </div>

        <!-- Appearance Settings Section -->
        <div class="settings-section">
          <h2>Appearance</h2>
          <div class="setting-item setting-item-clickable" id="theme-toggle" role="button" tabindex="0" aria-label="Toggle theme">
            <div class="setting-info">
              <span class="setting-label">Theme</span>
              <span class="setting-description">${themeSetting === 'auto' ? `Auto (currently ${effectiveTheme})` : ''}</span>
            </div>
            <div class="theme-toggle-control">
              <span class="theme-value">${themeDisplayText}</span>
              <span class="theme-icon">
                ${themeSetting === 'dark' ?
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' :
                  themeSetting === 'light' ?
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' :
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
                }
              </span>
            </div>
          </div>
        </div>

        <!-- US-075: Reset Times Section -->
        <div class="settings-section">
          <h2>Reset Times</h2>
          <p class="settings-section-description">Configure when your goals reset for each timeframe</p>

          <div class="reset-times-list">
            <!-- Daily Reset Time -->
            <div class="reset-time-item">
              <div class="reset-time-info">
                <span class="reset-time-label">Daily Goals</span>
                <span class="reset-time-next" id="daily-next-reset">Loading...</span>
              </div>
              <input type="time" id="daily-reset-time" class="reset-time-input" value="${state.settings?.dailyResetTime || '00:00'}">
            </div>

            <!-- Weekly Reset Time -->
            <div class="reset-time-item">
              <div class="reset-time-info">
                <span class="reset-time-label">Weekly Goals</span>
                <span class="reset-time-description">(Resets on Monday)</span>
                <span class="reset-time-next" id="weekly-next-reset">Loading...</span>
              </div>
              <input type="time" id="weekly-reset-time" class="reset-time-input" value="${state.settings?.weeklyResetTime || '00:00'}">
            </div>

            <!-- Monthly Reset Time -->
            <div class="reset-time-item">
              <div class="reset-time-info">
                <span class="reset-time-label">Monthly Goals</span>
                <span class="reset-time-description">(Resets on the 1st)</span>
                <span class="reset-time-next" id="monthly-next-reset">Loading...</span>
              </div>
              <input type="time" id="monthly-reset-time" class="reset-time-input" value="${state.settings?.monthlyResetTime || '00:00'}">
            </div>

            <!-- Yearly Reset Time -->
            <div class="reset-time-item">
              <div class="reset-time-info">
                <span class="reset-time-label">Yearly Goals</span>
                <span class="reset-time-description">(Resets on January 1st)</span>
                <span class="reset-time-next" id="yearly-next-reset">Loading...</span>
              </div>
              <input type="time" id="yearly-reset-time" class="reset-time-input" value="${state.settings?.yearlyResetTime || '00:00'}">
            </div>
          </div>

          <p class="reset-times-note">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            Times are in your local timezone
          </p>
        </div>

        <!-- US-065: Categories Section -->
        <div class="settings-section">
          <h2>Categories</h2>
          <p class="settings-section-description">Organize your goals with color-coded categories</p>
          <div class="categories-list">
            ${state.categories.map(cat => {
              const isDefault = DEFAULT_CATEGORIES.some(dc => dc.id === cat.id);
              return `
                <div class="category-item" data-category-id="${cat.id}">
                  <span class="category-color-indicator" style="background-color: ${cat.color}"></span>
                  <span class="category-name">${cat.name}</span>
                  ${!isDefault ? `
                    <button class="category-delete-btn" data-action="delete-category" data-category-id="${cat.id}" title="Delete category">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  ` : '<span class="category-badge-default">Default</span>'}
                </div>
              `;
            }).join('')}
          </div>
          <button class="btn btn-secondary btn-sm add-category-btn" id="add-category-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Custom Category
          </button>
        </div>

        <!-- US-070: Data Management Section -->
        <div class="settings-section">
          <h2>Data Management</h2>
          <p class="settings-section-description">Export your data for backup or import from a previous backup</p>

          <div class="data-management-actions">
            <button class="btn btn-secondary data-action-btn" id="export-data-btn">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Export Data</span>
            </button>

            <button class="btn btn-secondary data-action-btn" id="import-data-btn">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span>Import Data</span>
            </button>
          </div>

          <!-- Hidden file input for import -->
          <input type="file" id="import-file-input" accept=".json" style="display: none;">
        </div>

        <!-- About Section -->
        <div class="settings-section about">
          <h2>About</h2>
          <p class="app-version">Daily Goals Tracker v1.0.0</p>
          <p class="app-description">Track your daily goals with timers, counters, and checkboxes. Build discipline through consistent progress.</p>
        </div>
      </main>
    </div>
  `;

  // Attach navigation event listeners
  attachNavigationListeners(screen);

  // US-052: Attach sound toggle listener
  const soundToggleCheckbox = screen.querySelector('#sound-toggle');
  if (soundToggleCheckbox) {
    soundToggleCheckbox.addEventListener('change', async (e) => {
      const enabled = e.target.checked;

      // Update state and audio system
      state.settings = {
        ...state.settings,
        soundEnabled: enabled
      };
      setMuted(!enabled);

      // Save to storage
      await saveSettings(state.settings);

      console.log(`[Settings] Sound effects: ${enabled ? 'enabled' : 'disabled'}`);

      // Re-render to update volume slider state
      renderSettingsScreen();
    });
  }

  // US-052: Attach volume slider listener
  const volumeSlider = screen.querySelector('#volume-slider');
  const volumeValue = screen.querySelector('#volume-value');
  if (volumeSlider) {
    // Update display and audio on input (while dragging)
    volumeSlider.addEventListener('input', (e) => {
      const volume = parseInt(e.target.value, 10);
      if (volumeValue) {
        volumeValue.textContent = `${volume}%`;
      }
      // Update audio system immediately for feedback
      setVolume(volume / 100);

      // Update the volume icon based on level
      updateVolumeIcon(screen, volume, state.settings?.soundEnabled !== false);
    });

    // Save to storage on change (when dragging stops)
    volumeSlider.addEventListener('change', async (e) => {
      const volume = parseInt(e.target.value, 10);

      // Update state
      state.settings = {
        ...state.settings,
        soundVolume: volume
      };

      // Save to storage
      await saveSettings(state.settings);

      console.log(`[Settings] Volume set to: ${volume}%`);
    });
  }

  // US-051: Attach theme toggle listener
  const themeToggle = screen.querySelector('#theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', async () => {
      await toggleTheme();
      // Re-render to update the display
      renderSettingsScreen();
    });

    // Also handle keyboard interaction (Enter/Space)
    themeToggle.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        await toggleTheme();
        renderSettingsScreen();
      }
    });
  }

  // US-075: Attach reset times listeners
  attachResetTimesListeners(screen);

  // US-065: Attach category management listeners
  attachCategoryManagementListeners(screen);

  // US-070: Attach data management listeners
  attachDataManagementListeners(screen);

  // US-075: Load and display next reset times
  loadNextResetTimes();
}

/**
 * Update the volume icon based on volume level
 * @param {HTMLElement} screen - The settings screen element
 * @param {number} volume - Volume level (0-100)
 * @param {boolean} enabled - Whether sound is enabled
 */
function updateVolumeIcon(screen, volume, enabled) {
  const volumeIcon = screen.querySelector('.volume-icon');
  if (!volumeIcon) return;

  let iconSvg;
  if (volume === 0 || !enabled) {
    // Muted/off icon
    iconSvg = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
  } else if (volume < 50) {
    // Low volume icon
    iconSvg = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>';
  } else {
    // High volume icon
    iconSvg = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>';
  }

  volumeIcon.innerHTML = iconSvg;
}

// ============================================
// US-075: Reset Times Settings Functions
// ============================================

/**
 * US-075: Attach reset times event listeners
 * @param {HTMLElement} screen - The settings screen element
 */
function attachResetTimesListeners(screen) {
  const timeInputs = [
    { id: 'daily-reset-time', setting: 'dailyResetTime' },
    { id: 'weekly-reset-time', setting: 'weeklyResetTime' },
    { id: 'monthly-reset-time', setting: 'monthlyResetTime' },
    { id: 'yearly-reset-time', setting: 'yearlyResetTime' }
  ];

  timeInputs.forEach(({ id, setting }) => {
    const input = screen.querySelector(`#${id}`);
    if (input) {
      input.addEventListener('change', async (e) => {
        const newTime = e.target.value;
        console.log(`[Settings] ${setting} changed to ${newTime}`);

        // Update state and save settings
        state.settings = {
          ...state.settings,
          [setting]: newTime
        };
        await saveSettings(state.settings);

        // Notify service worker to reschedule alarms
        try {
          await chrome.runtime.sendMessage({ type: 'RESET_TIMES_CHANGED' });
          console.log('[Settings] Service worker notified of reset time change');
        } catch (error) {
          console.error('[Settings] Error notifying service worker:', error);
        }

        // Update next reset time display
        loadNextResetTimes();

        // Play feedback sound
        playSound('click');
      });
    }
  });
}

/**
 * US-075: Load and display next reset times from service worker
 */
async function loadNextResetTimes() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_NEXT_RESET_TIMES' });

    if (response && response.success && response.nextResetTimes) {
      const { daily, weekly, monthly, yearly } = response.nextResetTimes;

      updateNextResetDisplay('daily-next-reset', daily.nextReset);
      updateNextResetDisplay('weekly-next-reset', weekly.nextReset);
      updateNextResetDisplay('monthly-next-reset', monthly.nextReset);
      updateNextResetDisplay('yearly-next-reset', yearly.nextReset);
    }
  } catch (error) {
    console.error('[Settings] Error loading next reset times:', error);
    // Set fallback display
    ['daily', 'weekly', 'monthly', 'yearly'].forEach(tf => {
      const element = document.getElementById(`${tf}-next-reset`);
      if (element) {
        element.textContent = 'Unable to load';
      }
    });
  }
}

/**
 * US-075: Update next reset time display element
 * @param {string} elementId - The element ID to update
 * @param {number} timestamp - The next reset timestamp
 */
function updateNextResetDisplay(elementId, timestamp) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const nextReset = new Date(timestamp);
  const now = new Date();

  // Format the display
  const isToday = nextReset.toDateString() === now.toDateString();
  const isTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString() === nextReset.toDateString();

  const timeStr = nextReset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let dateStr;
  if (isToday) {
    dateStr = 'Today';
  } else if (isTomorrow) {
    dateStr = 'Tomorrow';
  } else {
    dateStr = nextReset.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }

  element.textContent = `Next: ${dateStr} at ${timeStr}`;
}

/**
 * US-065: Attach category management listeners
 * @param {HTMLElement} screen - The settings screen element
 */
function attachCategoryManagementListeners(screen) {
  // Delete category buttons
  const deleteButtons = screen.querySelectorAll('[data-action="delete-category"]');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const categoryId = btn.getAttribute('data-category-id');
      if (!categoryId) return;

      // Check if any goals use this category
      const goalsWithCategory = state.goals.filter(g => g.category === categoryId);
      if (goalsWithCategory.length > 0) {
        if (!confirm(`This category is used by ${goalsWithCategory.length} goal(s). Deleting it will remove the category from those goals. Continue?`)) {
          return;
        }
        // Remove category from those goals
        for (const goal of goalsWithCategory) {
          await updateGoal(goal.id, { category: null });
          const goalIndex = state.goals.findIndex(g => g.id === goal.id);
          if (goalIndex !== -1) {
            state.goals[goalIndex].category = null;
          }
        }
      }

      // Delete the category
      await deleteCategory(categoryId);
      state.categories = state.categories.filter(c => c.id !== categoryId);

      // Re-render settings
      renderSettingsScreen();
    });
  });

  // Add category button
  const addCategoryBtn = screen.querySelector('#add-category-btn');
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', () => {
      showAddCategoryDialog();
    });
  }
}

/**
 * US-065: Show dialog to add a custom category
 */
function showAddCategoryDialog() {
  const name = prompt('Enter category name:');
  if (!name || !name.trim()) return;

  const trimmedName = name.trim();

  // Check for duplicate names
  if (state.categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
    alert('A category with this name already exists.');
    return;
  }

  // Preset colors for custom categories
  const presetColors = ['#E91E63', '#00BCD4', '#8BC34A', '#795548', '#607D8B', '#FF5722'];
  const usedColors = state.categories.map(c => c.color);
  const availableColor = presetColors.find(c => !usedColors.includes(c)) || presetColors[0];

  // Generate light color variant
  const lightColor = lightenColor(availableColor, 0.9);

  // Create new category
  const newCategory = {
    id: `custom-${Date.now()}`,
    name: trimmedName,
    color: availableColor,
    light: lightColor
  };

  // Save category
  addCategory(newCategory).then(() => {
    state.categories.push(newCategory);
    renderSettingsScreen();
  });
}

/**
 * US-065: Lighten a hex color
 * @param {string} hex - Hex color string
 * @param {number} amount - Amount to lighten (0-1)
 * @returns {string} Lightened hex color
 */
function lightenColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * amount));
  const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + (255 - ((num >> 8) & 0x00FF)) * amount));
  const b = Math.min(255, Math.floor((num & 0x0000FF) + (255 - (num & 0x0000FF)) * amount));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0').toUpperCase()}`;
}

// ============================================
// US-070: Data Management (Export/Import)
// ============================================

/**
 * US-070: Attach data management listeners (export/import)
 * @param {HTMLElement} screen - The settings screen element
 */
function attachDataManagementListeners(screen) {
  // Export button
  const exportBtn = screen.querySelector('#export-data-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', handleExportData);
  }

  // Import button
  const importBtn = screen.querySelector('#import-data-btn');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const fileInput = screen.querySelector('#import-file-input');
      if (fileInput) {
        fileInput.click();
      }
    });
  }

  // File input change handler
  const fileInput = screen.querySelector('#import-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', handleImportFileSelect);
  }
}

/**
 * US-070: Handle export data button click
 * Exports all data as a JSON file download
 */
async function handleExportData() {
  try {
    // Show loading state
    const exportBtn = document.querySelector('#export-data-btn');
    if (exportBtn) {
      exportBtn.disabled = true;
      exportBtn.querySelector('span').textContent = 'Exporting...';
    }

    // Get all data
    const exportData = await exportAllData();

    // Create blob and download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-goals-tracker-backup-${getTodayDateString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up
    URL.revokeObjectURL(url);

    // Show success feedback
    showDataManagementFeedback('success', 'Data exported successfully!');

    // Play sound
    playSound('click');

    console.log('[Export] Data exported successfully');
  } catch (error) {
    console.error('[Export] Error exporting data:', error);
    showDataManagementFeedback('error', 'Failed to export data. Please try again.');
  } finally {
    // Reset button state
    const exportBtn = document.querySelector('#export-data-btn');
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.querySelector('span').textContent = 'Export Data';
    }
  }
}

/**
 * US-070: Handle file selection for import
 * @param {Event} e - File input change event
 */
async function handleImportFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Reset input for future selections
  e.target.value = '';

  try {
    // Read file
    const text = await file.text();
    let importData;

    try {
      importData = JSON.parse(text);
    } catch (parseError) {
      showDataManagementFeedback('error', 'Invalid JSON file. Please select a valid backup file.');
      return;
    }

    // Validate data
    const validation = validateImportData(importData);
    if (!validation.valid) {
      const errorMsg = validation.errors.slice(0, 3).join(', ');
      showDataManagementFeedback('error', `Invalid backup file: ${errorMsg}`);
      return;
    }

    // Show import options dialog
    showImportOptionsDialog(importData);
  } catch (error) {
    console.error('[Import] Error reading file:', error);
    showDataManagementFeedback('error', 'Failed to read file. Please try again.');
  }
}

/**
 * US-070: Show import options dialog (merge vs replace)
 * @param {Object} importData - The validated import data
 */
function showImportOptionsDialog(importData) {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'import-modal-overlay';
  overlay.innerHTML = `
    <div class="import-modal">
      <div class="import-modal-header">
        <h3>Import Data</h3>
        <button class="import-modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="import-modal-body">
        <p class="import-modal-info">
          Backup from: ${new Date(importData.exportedAt).toLocaleDateString()}<br>
          Contains: ${importData.data.goals?.length || 0} goals, ${importData.data.categories?.length || 0} categories
        </p>
        <p class="import-modal-question">How would you like to import this data?</p>
        <div class="import-options">
          <button class="btn btn-secondary import-option-btn" data-mode="merge">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            <span class="import-option-label">Merge</span>
            <span class="import-option-desc">Add new items, keep existing</span>
          </button>
          <button class="btn btn-danger import-option-btn" data-mode="replace">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
            <span class="import-option-label">Replace</span>
            <span class="import-option-desc">Replace all existing data</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
  });

  // Close handlers
  const closeModal = () => {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('.import-modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Import option handlers
  overlay.querySelectorAll('.import-option-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const mode = btn.getAttribute('data-mode');

      if (mode === 'replace') {
        if (!confirm('This will replace ALL your existing data. This action cannot be undone. Are you sure?')) {
          return;
        }
      }

      closeModal();

      // Perform import
      await performImport(importData, mode);
    });
  });
}

/**
 * US-070: Perform the actual data import
 * @param {Object} importData - The validated import data
 * @param {string} mode - 'merge' or 'replace'
 */
async function performImport(importData, mode) {
  try {
    // Show loading feedback
    showDataManagementFeedback('loading', 'Importing data...');

    // Perform import
    const result = await importAllData(importData, mode);

    if (result.success) {
      // Reload all state data
      await loadData();

      // Build success message
      let message = mode === 'replace' ? 'Data replaced successfully!' : 'Data merged successfully!';
      if (result.stats.goalsImported > 0) {
        message += ` ${result.stats.goalsImported} goals imported.`;
      }

      showDataManagementFeedback('success', message);
      playSound('complete');

      // Re-render settings screen
      renderSettingsScreen();

      console.log('[Import] Import completed:', result);
    } else {
      showDataManagementFeedback('error', result.message);
    }
  } catch (error) {
    console.error('[Import] Error during import:', error);
    showDataManagementFeedback('error', 'Import failed. Please try again.');
  }
}

/**
 * US-070: Show feedback message for data management operations
 * @param {string} type - 'success', 'error', or 'loading'
 * @param {string} message - The message to display
 */
function showDataManagementFeedback(type, message) {
  // Remove existing feedback
  const existingFeedback = document.querySelector('.data-management-feedback');
  if (existingFeedback) {
    existingFeedback.remove();
  }

  // Create feedback element
  const feedback = document.createElement('div');
  feedback.className = `data-management-feedback feedback-${type}`;

  const icon = type === 'success' ?
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' :
    type === 'error' ?
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' :
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" class="spin"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';

  feedback.innerHTML = `${icon}<span>${message}</span>`;

  // Insert at top of settings content
  const settingsContent = document.querySelector('.settings-content');
  if (settingsContent) {
    settingsContent.insertBefore(feedback, settingsContent.firstChild);
  }

  // Auto-remove after delay (except loading)
  if (type !== 'loading') {
    setTimeout(() => {
      feedback.classList.add('fade-out');
      setTimeout(() => feedback.remove(), 300);
    }, 4000);
  }
}

/**
 * Attach navigation event listeners to buttons within a screen
 * @param {HTMLElement} container - The container to search for navigation buttons
 */
function attachNavigationListeners(container) {
  // Handle all elements with data-screen attribute
  const navElements = container.querySelectorAll('[data-screen]');
  navElements.forEach(element => {
    element.addEventListener('click', (e) => {
      e.preventDefault();
      const targetScreen = element.getAttribute('data-screen');
      showScreen(targetScreen);
    });
  });
}

// =============================================================================
// US-056: Compact View Mode Toggle
// =============================================================================

/**
 * Attach compact view toggle listener
 * @param {HTMLElement} container - The screen container
 */
function attachCompactViewToggleListener(container) {
  const toggleBtn = container.querySelector('#compact-view-toggle');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', async () => {
    // Toggle compact view setting
    const newValue = !state.settings.compactViewEnabled;
    state.settings = { ...state.settings, compactViewEnabled: newValue };

    // Save to storage
    await saveSettings(state.settings);

    // Re-render the view goals screen with smooth transition
    renderViewGoalsScreen();
  });
}

/**
 * US-065: Attach category filter listeners
 * @param {HTMLElement} container - The screen container
 */
function attachCategoryFilterListeners(container) {
  const filterChips = container.querySelectorAll('.category-filter-chip');
  if (!filterChips.length) return;

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const category = chip.getAttribute('data-category');
      state.categoryFilter = category;

      // Re-render the view goals screen to apply filter
      renderViewGoalsScreen();
    });
  });
}

// =============================================================================
// Data Loading
// =============================================================================

/**
 * Load all necessary data from storage
 * US-031: Enhanced to sync with service worker for background timer tracking
 */
async function loadData() {
  try {
    state.isLoading = true;

    // Load goals, settings, active timers, streak data, categories, templates, and archived goals in parallel
    const [goals, settings, activeTimers, streakData, categories, templates, archivedGoals] = await Promise.all([
      getGoals(),
      getSettings(),
      getActiveTimers(),
      getStreakData(),
      getCategories(),
      getTemplates(), // US-066: Load templates
      getArchivedGoals() // US-069: Load archived goals
    ]);

    // Update state
    state.goals = goals;
    state.settings = settings;
    state.activeTimers = activeTimers;
    state.streakData = streakData;
    state.categories = categories;
    state.templates = templates; // US-066
    state.archivedGoals = archivedGoals; // US-069

    console.log('Data loaded:', {
      goalsCount: goals.length,
      settings: settings,
      activeTimersCount: Object.keys(activeTimers).length,
      streakData: streakData,
      categoriesCount: categories.length,
      templatesCount: templates.length,
      archivedGoalsCount: archivedGoals.length
    });

    // US-039: Initialize sound system with user settings
    await initSounds();
    loadSoundSettings(settings);

    // US-031: Sync active timers with goals - ensure isActive flags are in sync
    await syncActiveTimersWithGoals();

    state.isLoading = false;
  } catch (error) {
    console.error('Error loading data:', error);
    state.isLoading = false;
  }
}

// =============================================================================
// US-031: Background Timer Sync
// =============================================================================

/**
 * Sync active timers with goals to ensure consistency
 * This handles the case where a timer was running when popup was closed
 * and we need to recalculate elapsed time
 */
async function syncActiveTimersWithGoals() {
  const activeTimerIds = Object.keys(state.activeTimers);

  if (activeTimerIds.length === 0) {
    console.log('[Sync] No active timers to sync');
    return;
  }

  console.log(`[Sync] Syncing ${activeTimerIds.length} active timer(s)`);

  for (const goalId of activeTimerIds) {
    const timerData = state.activeTimers[goalId];
    const goal = state.goals.find(g => g.id === goalId);

    if (!goal) {
      // Goal was deleted while timer was running - clean up
      console.log(`[Sync] Goal ${goalId} not found, removing timer`);
      delete state.activeTimers[goalId];
      await saveActiveTimers(state.activeTimers);
      continue;
    }

    if (timerData && timerData.startTime) {
      // Calculate elapsed time since timer started
      const now = Date.now();
      const elapsedSinceStart = Math.floor((now - timerData.startTime) / 1000);
      const currentProgress = goal.progress + elapsedSinceStart;

      // Check if timer should be auto-completed (progress >= target)
      if (currentProgress >= goal.target) {
        console.log(`[Sync] Timer goal ${goalId} completed while popup was closed`);

        // Cap progress at target
        goal.progress = goal.target;
        goal.isActive = false;

        // Update in storage
        await updateGoal(goalId, { progress: goal.target, isActive: false });

        // Remove from active timers
        delete state.activeTimers[goalId];
        await saveActiveTimers(state.activeTimers);

        // Log completion
        const completeLog = createActivityLog({
          goalId: goalId,
          action: ACTIVITY_ACTIONS.COMPLETE,
          value: goal.target
        });
        await addActivityLogEntry(completeLog);

        // Trigger celebration when screen renders
        state.justCompletedGoals.add(goalId);
        setTimeout(() => {
          state.justCompletedGoals.delete(goalId);
        }, 1500);
      } else {
        // Timer is still running - ensure goal.isActive is true
        if (!goal.isActive) {
          goal.isActive = true;
          await updateGoal(goalId, { isActive: true });
        }
        console.log(`[Sync] Timer goal ${goalId} running: ${formatTime(currentProgress)} elapsed`);
      }
    }
  }

  // Clean up any timers for goals that aren't marked as active
  for (const goal of state.goals) {
    if (goal.type === GOAL_TYPES.TIMER && goal.isActive && !state.activeTimers[goal.id]) {
      // Goal marked active but no timer data - reset isActive
      console.log(`[Sync] Goal ${goal.id} marked active but no timer data - resetting`);
      goal.isActive = false;
      await updateGoal(goal.id, { isActive: false });
    }
  }
}

/**
 * Send message to service worker
 * @param {Object} message - Message to send
 * @returns {Promise<Object|null>} Response from service worker or null on error
 */
async function sendToServiceWorker(message) {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    console.log('[Message] Could not send to service worker:', error.message);
    return null;
  }
}

// =============================================================================
// US-051: Theme Management
// =============================================================================

/**
 * Get the effective theme based on system preference and user setting
 * @param {string} themeSetting - User's theme setting ('light', 'dark', 'auto')
 * @returns {string} The effective theme ('light' or 'dark')
 */
function getEffectiveTheme(themeSetting) {
  if (themeSetting === 'auto') {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
  return themeSetting;
}

/**
 * Apply the theme to the document
 * @param {string} theme - The theme to apply ('light' or 'dark')
 */
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  console.log(`[Theme] Applied theme: ${theme}`);
}

/**
 * Initialize theme based on user settings and system preference
 * Should be called early to prevent theme flash
 * @param {Object} settings - Settings object with theme property
 */
function initTheme(settings) {
  const themeSetting = settings?.theme || 'auto';
  const effectiveTheme = getEffectiveTheme(themeSetting);

  // Add no-transition class to prevent flash during initial load
  document.documentElement.classList.add('no-transition');

  applyTheme(effectiveTheme);

  // Remove no-transition class after a brief delay to enable transitions
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('no-transition');
    });
  });

  console.log(`[Theme] Initialized: setting=${themeSetting}, effective=${effectiveTheme}`);
}

/**
 * Handle theme toggle in settings
 * Cycles through: auto -> light -> dark -> auto
 * @returns {Promise<string>} The new theme setting
 */
async function toggleTheme() {
  const currentSetting = state.settings?.theme || 'auto';
  let newSetting;

  // Cycle through themes
  switch (currentSetting) {
    case 'auto':
      newSetting = 'light';
      break;
    case 'light':
      newSetting = 'dark';
      break;
    case 'dark':
      newSetting = 'auto';
      break;
    default:
      newSetting = 'auto';
  }

  // Update state
  state.settings = {
    ...state.settings,
    theme: newSetting
  };

  // Save to storage
  await saveSettings(state.settings);

  // Apply the new theme
  const effectiveTheme = getEffectiveTheme(newSetting);
  applyTheme(effectiveTheme);

  console.log(`[Theme] Toggled: ${currentSetting} -> ${newSetting} (effective: ${effectiveTheme})`);

  return newSetting;
}

/**
 * Set up listener for system theme changes (when user has 'auto' selected)
 */
function setupSystemThemeListener() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  mediaQuery.addEventListener('change', (e) => {
    // Only react to system changes if user has 'auto' selected
    if (state.settings?.theme === 'auto') {
      const newTheme = e.matches ? 'dark' : 'light';
      applyTheme(newTheme);
      console.log(`[Theme] System preference changed: ${newTheme}`);

      // Re-render settings screen if it's currently showing
      if (state.currentScreen === SCREENS.SETTINGS) {
        renderSettingsScreen();
      }
    }
  });
}

/**
 * Get the display text for the current theme setting
 * @param {string} themeSetting - The theme setting ('light', 'dark', 'auto')
 * @returns {string} Human-readable theme name
 */
function getThemeDisplayText(themeSetting) {
  switch (themeSetting) {
    case 'light':
      return 'Light';
    case 'dark':
      return 'Dark';
    case 'auto':
    default:
      return 'Auto';
  }
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize the popup application
 */
async function initApp() {
  console.log('Daily Goals Tracker popup initializing...');

  // Load data from storage
  await loadData();

  // US-051: Initialize theme before showing any UI
  initTheme(state.settings);

  // Set up listener for system theme changes
  setupSystemThemeListener();

  // Show the default screen (View Goals)
  showScreen(SCREENS.VIEW_GOALS);

  console.log('Daily Goals Tracker popup initialized successfully');
}

// =============================================================================
// DOM Ready Handler
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// =============================================================================
// Exports (for testing and other modules)
// =============================================================================

export {
  state,
  SCREENS,
  showScreen,
  loadData,
  initApp,
  // US-016 Timer functions
  handleTimerToggle,
  startTimerUpdateInterval,
  stopTimerUpdateInterval,
  // US-017 Counter functions
  handleCounterIncrement,
  handleCounterDecrement,
  // US-018 Checkbox functions
  handleCheckboxToggle,
  // US-019 Completion celebration
  triggerCompletionCelebration,
  // US-022 Modal functions
  openGoalModal,
  closeGoalModal,
  // US-023 Form title input functions
  validateTitleInput,
  showInputError,
  clearInputError,
  getFormTitle,
  setFormTitle,
  resetGoalForm,
  focusTitleInput,
  // US-024 Type selector functions
  getFormType,
  setFormType,
  handleTypeSelection,
  attachTypeSelectorListeners,
  resetTypeSelector,
  updateTargetInputVisibility,
  // US-025 Timer target input functions
  getTimerTarget,
  setTimerTarget,
  validateTimerTarget,
  showTimerTargetError,
  clearTimerTargetError,
  resetTimerTarget,
  // US-026 Counter target input functions
  getCounterTarget,
  setCounterTarget,
  validateCounterTarget,
  showCounterTargetError,
  clearCounterTargetError,
  resetCounterTarget,
  // US-027 Timeframe selector functions
  getFormTimeframe,
  setFormTimeframe,
  handleTimeframeSelection,
  updateTimeframeHint,
  attachTimeframeSelectorListeners,
  resetTimeframeSelector,
  // US-028 Save logic functions
  handleGoalFormSubmit,
  showSuccessFeedback,
  showFormError,
  clearFormError,
  // US-029 Edit goal functions
  handleEditGoal,
  attachManageGoalsListeners,
  // US-058 Full-page Goal Form Screen functions
  openGoalFormScreen,
  renderGoalFormScreen,
  attachGoalFormScreenListeners,
  setGoalFormScreenType,
  setGoalFormScreenTimeframe,
  prefillGoalFormScreen,
  handleGoalFormScreenSubmit,
  // US-030 Delete goal confirmation functions
  openDeleteConfirmModal,
  closeDeleteConfirmModal,
  handleConfirmDelete,
  // US-031 Background timer sync functions
  syncActiveTimersWithGoals,
  sendToServiceWorker,
  // US-051 Theme management functions
  getEffectiveTheme,
  applyTheme,
  initTheme,
  toggleTheme,
  setupSystemThemeListener,
  getThemeDisplayText
};
