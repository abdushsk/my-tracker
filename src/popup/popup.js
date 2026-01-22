/**
 * Popup JavaScript Entry Point
 * Main entry point for the Daily Goals Tracker Chrome extension popup
 */

// =============================================================================
// Imports
// =============================================================================

// Shared state and constants
import { state, SCREENS, SCREEN_IDS, UNDO_ACTION_TYPES } from './state.js';

// Utility functions
import { formatTime, formatProgressDisplay, escapeHtml } from './utils/formatting.js';

// Feature modules
import {
  triggerCompletionCelebration
} from './features/celebrations.js';

import {
  registerUndoRedoCallbacks,
  pushUndoAction,
  showUndoToast,
  hideUndoToast,
  performUndo,
  performRedo,
  canUndo,
  canRedo,
  clearUndoHistory
} from './features/undoRedo.js';

import {
  registerDragDropCallbacks,
  attachDragDropListeners
} from './features/dragDrop.js';

import {
  registerKeyboardNavCallbacks,
  resetKeyboardSelection,
  initKeyboardShortcuts
} from './features/keyboardNav.js';

import {
  renderChainIndicator,
  renderLockedOverlay,
  renderChainParentOptions,
  unlockChainedGoals
} from './features/habitChains.js';

import {
  registerAchievementsCallbacks,
  renderAchievementsScreen,
  checkAchievements
} from './features/achievements.js';

import {
  awardGoalCompletionXP,
  awardAchievementXP
} from './features/xpLevels.js';

import {
  registerDailyChallengesCallbacks,
  initializeDailyChallenge,
  renderDailyChallengeCard,
  attachDailyChallengeListeners,
  updateChallengeProgress
  // renderChallengeStatsSection now used only in ./screens/reports.js
} from './features/dailyChallenges.js';

import {
  registerPomodoroCallbacks,
  renderPomodoroControls,
  handlePomodoroEnable,
  handlePomodoroDisable,
  handlePomodoroToggle,
  handlePomodoroSkip,
  updatePomodoroDisplays
} from './features/pomodoro.js';

import {
  registerBreakRemindersCallbacks,
  checkBreakReminder
} from './features/breakReminders.js';

// Screen modules
import {
  registerArchiveCallbacks,
  renderArchiveScreen
} from './screens/archive.js';

import {
  registerTemplatesCallbacks,
  renderTemplateGalleryScreen,
  handleSaveAsTemplate
} from './screens/templates.js';

import {
  registerStatisticsCallbacks,
  openGoalStatistics,
  renderGoalStatisticsScreen
} from './screens/statistics.js';

import {
  registerWeeklyReviewCallbacks,
  renderWeeklyReviewScreen
} from './screens/weeklyReview.js';

import {
  registerFocusModeCallbacks,
  enterFocusMode,
  exitFocusMode,
  renderFocusModeScreen,
  updateFocusModeTimerDisplay
} from './screens/focusMode.js';

import {
  registerReportsCallbacks,
  renderReportsScreen,
  updateReportsStats
} from './screens/reports.js';

import {
  registerSettingsCallbacks,
  renderSettingsScreen
} from './screens/settings.js';

// Storage utilities
import {
  getGoals,
  saveGoals,
  getSettings,
  saveSettings,
  getActiveTimers,
  getStreakData,
  // saveStreakData now used in ./screens/reports.js
  saveActiveTimers,
  updateGoal,
  deleteGoal,
  addActivityLogEntry,
  // getHistory now used in ./screens/reports.js
  // getActivityLog now used in ./screens/reports.js
  getCategories,
  // addCategory, deleteCategory, DEFAULT_CATEGORIES now used in ./screens/settings.js
  // US-066: Template imports
  getTemplates,
  // US-069: Archive imports
  getArchivedGoals,
  archiveGoal,
  // US-070: Export/Import imports (now used in ./screens/settings.js)
  // exportAllData, validateImportData, importAllData
  // US-080: Achievement imports (others now in ./features/achievements.js)
  getAchievements,
  saveAchievements,
  // US-081: Daily Challenges imports (others now in ./features/dailyChallenges.js)
  getDailyChallenges,
  // US-083: Level and XP System imports (others now in ./features/xpLevels.js)
  getXPData,
  saveXPData,
  // US-085: Pomodoro Timer Mode imports
  getPomodoroSettings,
  // savePomodoroSettings now used in ./screens/settings.js
  getPomodoroStates
  // US-086: resetBreakReminderState now used in ./screens/settings.js
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
  // getDateStringDaysAgo now used in ./screens/reports.js
  // getWeekStartDateString now used in ./screens/reports.js
  // getMonthStartDateString now used in ./screens/reports.js
  // filterHistoryByDateRange now used in ./screens/reports.js
  // groupHistoryByDate now used in ./screens/reports.js
  // getActivityByHourForDateRange now used in ./screens/reports.js (via ./utils/activityLog.js)
  // US-080: Achievement imports (others now in ./features/achievements.js)
  createDefaultAchievementProgress,
  // US-081: Daily Challenges imports (others now in ./features/dailyChallenges.js)
  // US-083: Level and XP System imports (others now in ./features/xpLevels.js)
  getDefaultXPData,
  getLevelProgress,
  getLevelTitle,
  // US-084: Habit Chain imports (others now in ./features/habitChains.js)
  CHAIN_STATUS,
  isGoalInChain,
  isGoalLocked,
} from '../utils/models.js';
import {
  initSounds,
  playSound,
  loadSoundSettings,
  // setVolume, setMuted now used in ./screens/settings.js
  SOUNDS
} from '../utils/sounds.js';
import {
  getDailyQuote,
  renderQuoteHTML
} from '../utils/quotes.js';

// =============================================================================
// Feature Module Callback Registration
// =============================================================================

// Register callbacks after functions are defined (done at the end of file)
// This allows feature modules to call back into popup.js

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

  // US-078: Reset keyboard selection when navigating away from View Goals
  if (state.currentScreen === SCREENS.VIEW_GOALS && screenName !== SCREENS.VIEW_GOALS) {
    resetKeyboardSelection();
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
    case SCREENS.ACHIEVEMENTS:
      renderAchievementsScreen(); // US-080
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

  // US-083: Get level data
  const currentLevel = state.xpData?.currentLevel || 1;
  const levelInfo = getLevelTitle(currentLevel);
  const levelProgress = getLevelProgress(state.xpData?.totalXP || 0);

  screen.innerHTML = `
    <div class="view-goals-screen">
      <header class="screen-header view-goals-header">
        <div class="header-main">
          <h1 class="app-title">Daily Goals</h1>
          <div class="level-badge" title="Level ${currentLevel} - ${levelInfo.title}&#10;${levelProgress.currentLevelXP}/${levelProgress.xpForNextLevel} XP to next level">
            <span class="level-icon">${levelInfo.icon}</span>
            <span class="level-number">Lv.${currentLevel}</span>
            <div class="level-progress-mini">
              <div class="level-progress-bar-mini" style="width: ${levelProgress.percentage}%"></div>
            </div>
          </div>
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
        ${renderDailyChallengeCard()}
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

  // US-081: Attach daily challenge listeners
  attachDailyChallengeListeners(screen);

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
  // US-077: Show motivational quote if enabled
  const quotesEnabled = state.settings?.quotesEnabled !== false;
  const quote = quotesEnabled ? getDailyQuote() : null;

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
      ${quote ? renderQuoteHTML(quote, 'empty-state-quote') : ''}
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
    case GOAL_TYPES.AVOIDANCE:
      // US-087: Shield icon with slash for avoidance/negative goals
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="goal-type-icon">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <line x1="4" y1="4" x2="20" y2="20"/>
      </svg>`;
    default:
      return '';
  }
}

// formatTime and formatProgressDisplay are now imported from ./utils/formatting.js

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

  // US-084: Check if goal is locked (chain parent not completed)
  const goalLocked = isGoalLocked(goal, state.goals);

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
    isCompactView ? 'compact' : '',
    // US-084: Add locked class for chained goals
    goalLocked ? 'goal-locked' : '',
    // US-084: Add chain class if goal is part of a chain
    isGoalInChain(goal, state.goals) ? 'goal-in-chain' : ''
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
        ${renderChainIndicator(goal, goalLocked)}
        <div class="goal-progress-section">
          <div class="goal-progress-info">
            <span class="goal-progress-text">${progressDisplay}</span>
            <span class="goal-progress-percent">${Math.round(progressPercent)}%</span>
          </div>
          <div class="goal-progress-bar">
            <div class="goal-progress-fill" style="width: ${progressPercent}%"></div>
          </div>
        </div>
        ${goalLocked ? renderLockedOverlay(goal) : renderGoalControls(goal)}
      </div>
      ${isCompleted ? '<div class="goal-completed-indicator"><span class="completed-checkmark">&#10003;</span></div>' : ''}
    </div>
  `;
}

// US-084: renderChainIndicator and renderLockedOverlay are now imported from ./features/habitChains.js

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
    case GOAL_TYPES.AVOIDANCE:
      // US-087: Avoidance goal controls - slip-up button to reset streak
      const streakDays = goal.progress || 0;
      const hasForgiveness = goal.forgivenessEnabled && goal.slipUpsThisWeek === 0;
      return `
        <div class="goal-controls goal-controls-avoidance">
          <div class="avoidance-streak-display">
            <span class="streak-fire">${streakDays > 0 ? '🔥' : '🌱'}</span>
            <span class="streak-count">${streakDays}</span>
            <span class="streak-label">${streakDays === 1 ? 'day' : 'days'}</span>
          </div>
          <button class="goal-control-btn avoidance-slip-btn ${hasForgiveness ? 'has-forgiveness' : ''}"
                  data-action="avoidance-slip"
                  data-goal-id="${goal.id}"
                  title="${hasForgiveness ? 'Mark slip-up (forgiveness available)' : 'Mark slip-up (resets streak)'}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span class="slip-label">Slipped</span>
          </button>
          ${goal.forgivenessEnabled ? `
            <span class="forgiveness-badge ${hasForgiveness ? 'available' : 'used'}" title="${hasForgiveness ? 'Forgiveness available this week' : 'Forgiveness used this week'}">
              ${hasForgiveness ? '💚' : '💔'}
            </span>
          ` : ''}
        </div>
      `;
    default:
      return '';
  }
}

// Celebration functions (getConfettiColors, launchConfetti, triggerCompletionCelebration, showCompletionQuote)
// are now imported from ./features/celebrations.js

// US-084: Habit Chain Functions are now imported from ./features/habitChains.js

// =============================================================================
// US-016: Timer Type Controls
// =============================================================================

/**
 * Render timer-specific controls for a goal
 * Supports both regular timer mode and Pomodoro mode (US-085)
 * @param {Object} goal - The timer goal object
 * @returns {string} HTML string for timer controls
 */
function renderTimerControls(goal) {
  const pomodoroState = state.pomodoroStates[goal.id];

  // US-085: If Pomodoro mode is enabled, render Pomodoro controls
  if (pomodoroState && pomodoroState.enabled) {
    return renderPomodoroControls(goal, pomodoroState);
  }

  // Regular timer controls
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
  const tomatoIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="13" r="8"/><path d="M12 5V3"/><path d="M9 4c1.5 1 4.5 1 6 0"/></svg>';

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
      <button class="goal-control-btn pomodoro-toggle-btn"
              data-action="pomodoro-enable"
              data-goal-id="${goal.id}"
              title="Enable Pomodoro Mode">
        ${tomatoIcon}
      </button>
    </div>
  `;
}

// US-085: Pomodoro Timer Mode functions are now imported from ./features/pomodoro.js

// US-086: Break Reminder functions are now imported from ./features/breakReminders.js

// NOTE: All Pomodoro and Break Reminder functions have been extracted to their respective modules.
// The following marker helps track where the extracted code used to be.
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
  const previousProgress = goal.progress; // US-079: Store for undo

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

      // US-079: Push undo action for timer stop
      pushUndoAction({
        type: UNDO_ACTION_TYPES.TIMER_STOP,
        goalId: goalId,
        goalTitle: goal.title,
        previousValue: previousProgress,
        newValue: newProgress
      });

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

    // US-079: Push undo action for timer start
    pushUndoAction({
      type: UNDO_ACTION_TYPES.TIMER_START,
      goalId: goalId,
      goalTitle: goal.title,
      previousValue: previousProgress,
      newValue: previousProgress // Progress doesn't change on start
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

  // US-085: Check for running Pomodoro timers
  const runningPomodoroCount = Object.values(state.pomodoroStates).filter(s => s && s.enabled && s.isRunning).length;

  // If no active timers and no running Pomodoros, stop the interval
  if (activeTimerIds.length === 0 && runningPomodoroCount === 0) {
    stopTimerUpdateInterval();
    return;
  }

  // US-085: Update Pomodoro displays
  if (runningPomodoroCount > 0) {
    updatePomodoroDisplays();
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

  // US-086: Check break reminders when any timer is running
  if (activeTimerIds.length > 0 || runningPomodoroCount > 0) {
    checkBreakReminder();
  }
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

  // US-080: Check achievements on goal completion
  const achievementUnlocked = await checkAchievements('goal_complete', { goal });

  // US-083: Award XP for goal completion
  await awardGoalCompletionXP(goal, true);

  // US-083: Award XP for achievement unlock
  if (achievementUnlocked) {
    await awardAchievementXP(null);
  }

  // US-081: Update daily challenge progress
  updateChallengeProgress('goal_complete', { goal, goalType: goal.type });

  // US-084: Unlock any chained goals waiting on this one
  await unlockChainedGoals(goal);

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

  // US-079: Store previous progress for undo
  const previousProgress = goal.progress;

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

    // US-080: Check achievements on goal completion
    const achievementUnlocked = await checkAchievements('goal_complete', { goal });

    // US-083: Award XP for goal completion
    await awardGoalCompletionXP(goal, true);

    // US-083: Award XP for achievement unlock
    if (achievementUnlocked) {
      await awardAchievementXP(null);
    }

    // US-081: Update daily challenge progress for goal completion
    updateChallengeProgress('goal_complete', { goal, goalType: goal.type });

    // US-084: Unlock any chained goals waiting on this one
    await unlockChainedGoals(goal);
  } else {
    // US-039: Play tick sound for regular increment
    playSound(SOUNDS.TICK);

    // US-080: Check counter-related achievements (like counter-100)
    checkAchievements('counter_update', { goal });

    // US-081: Update daily challenge progress for counter increment
    updateChallengeProgress('counter_increment', { goal });
  }

  // US-079: Push undo action for counter increment
  pushUndoAction({
    type: UNDO_ACTION_TYPES.COUNTER_INCREMENT,
    goalId: goalId,
    goalTitle: goal.title,
    previousValue: previousProgress,
    newValue: newProgress
  });

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

  // US-079: Store previous progress for undo
  const previousProgress = goal.progress;

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

  // US-079: Push undo action for counter decrement
  pushUndoAction({
    type: UNDO_ACTION_TYPES.COUNTER_DECREMENT,
    goalId: goalId,
    goalTitle: goal.title,
    previousValue: previousProgress,
    newValue: newProgress
  });

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

  // US-079: Store previous progress for undo
  const previousProgress = goal.progress;

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

    // US-080: Check achievements on goal completion
    const achievementUnlocked = await checkAchievements('goal_complete', { goal });

    // US-083: Award XP for goal completion
    await awardGoalCompletionXP(goal, true);

    // US-083: Award XP for achievement unlock
    if (achievementUnlocked) {
      await awardAchievementXP(null);
    }

    // US-081: Update daily challenge progress for goal completion
    updateChallengeProgress('goal_complete', { goal, goalType: goal.type });

    // US-084: Unlock any chained goals waiting on this one
    await unlockChainedGoals(goal);
  } else {
    // US-039: Play tick sound for regular toggle
    playSound(SOUNDS.TICK);
  }

  // US-079: Push undo action for checkbox toggle
  pushUndoAction({
    type: UNDO_ACTION_TYPES.CHECKBOX_TOGGLE,
    goalId: goalId,
    goalTitle: goal.title,
    previousValue: previousProgress,
    newValue: newProgress
  });

  // Re-render to update UI
  renderCurrentScreen();
}

// =============================================================================
// US-087: Avoidance Goal Controls
// =============================================================================

/**
 * Handle avoidance goal slip-up
 * When user slips up, either use forgiveness (if available) or reset streak
 * @param {string} goalId - The ID of the avoidance goal
 */
async function handleAvoidanceSlipUp(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal || goal.type !== GOAL_TYPES.AVOIDANCE) {
    console.error('Invalid goal for avoidance slip-up:', goalId);
    return;
  }

  // Store previous state for undo
  const previousProgress = goal.progress;
  const previousSlipUps = goal.slipUpsThisWeek || 0;

  // Check if forgiveness is available
  const hasForgiveness = goal.forgivenessEnabled && previousSlipUps === 0;

  let newProgress;
  let newSlipUps;
  let usedForgiveness = false;

  if (hasForgiveness) {
    // Use forgiveness - don't reset streak, just increment slip count
    newProgress = previousProgress;
    newSlipUps = 1;
    usedForgiveness = true;
    console.log(`[Avoidance] Goal ${goalId}: Used forgiveness, streak preserved at ${newProgress} days`);
  } else {
    // No forgiveness available - reset streak to 0
    newProgress = 0;
    newSlipUps = previousSlipUps + 1;
    console.log(`[Avoidance] Goal ${goalId}: Streak reset to 0 (slip-up)`);
  }

  // Update goal in state
  goal.progress = newProgress;
  goal.slipUpsThisWeek = newSlipUps;

  // Save to storage
  await updateGoal(goalId, {
    progress: newProgress,
    slipUpsThisWeek: newSlipUps
  });

  // Log the slip-up activity
  const activityLog = createActivityLog({
    goalId: goalId,
    action: ACTIVITY_ACTIONS.SLIP_UP,
    value: usedForgiveness ? previousProgress : 0 // Log what the streak was when slip-up occurred
  });
  await addActivityLogEntry(activityLog);

  // US-039: Play sound based on whether forgiveness was used
  if (usedForgiveness) {
    playSound(SOUNDS.TICK); // Softer sound for forgiveness
  } else {
    playSound(SOUNDS.TICK); // Could use different sound for streak reset
  }

  // US-079: Push undo action for avoidance slip-up
  pushUndoAction({
    type: UNDO_ACTION_TYPES.AVOIDANCE_SLIP,
    goalId: goalId,
    goalTitle: goal.title,
    previousValue: previousProgress,
    newValue: newProgress,
    previousSlipUps: previousSlipUps,
    newSlipUps: newSlipUps
  });

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

  // US-087: Avoidance slip-up buttons
  const avoidanceSlipBtns = container.querySelectorAll('[data-action="avoidance-slip"]');
  avoidanceSlipBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        handleAvoidanceSlipUp(goalId);
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

  // US-085: Pomodoro enable buttons
  const pomodoroEnableBtns = container.querySelectorAll('[data-action="pomodoro-enable"]');
  pomodoroEnableBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        handlePomodoroEnable(goalId);
      }
    });
  });

  // US-085: Pomodoro disable buttons
  const pomodoroDisableBtns = container.querySelectorAll('[data-action="pomodoro-disable"]');
  pomodoroDisableBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        handlePomodoroDisable(goalId);
      }
    });
  });

  // US-085: Pomodoro toggle (play/pause) buttons
  const pomodoroToggleBtns = container.querySelectorAll('[data-action="pomodoro-toggle"]');
  pomodoroToggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        handlePomodoroToggle(goalId);
      }
    });
  });

  // US-085: Pomodoro skip buttons
  const pomodoroSkipBtns = container.querySelectorAll('[data-action="pomodoro-skip"]');
  pomodoroSkipBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      if (goalId) {
        handlePomodoroSkip(goalId);
      }
    });
  });

  // US-059: Attach drag and drop listeners for goal reordering
  attachDragDropListeners(container);
}

// Drag-to-reorder functions (attachDragDropListeners, reorderGoals, etc.)
// are now imported from ./features/dragDrop.js

/**
 * Capitalize the first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// escapeHtml is now imported from ./utils/formatting.js

/**
 * Placeholder for backward compatibility - escapeHtml is now imported
 * @deprecated Use import from ./utils/formatting.js
 */
function escapeHtmlLocal(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Keyboard navigation functions (getVisibleGoals, selectGoalByIndex, initKeyboardShortcuts, etc.)
// are now imported from ./features/keyboardNav.js

// Undo/Redo functions (pushUndoAction, performUndo, performRedo, etc.)
// UNDO_ACTION_TYPES constant is now imported from ./state.js
// are now imported from ./features/undoRedo.js

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
              <button type="button" class="type-option" data-type="avoidance" role="radio" aria-checked="false" title="Avoidance - Track days without doing something">
                <span class="type-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <line x1="4" y1="4" x2="20" y2="20"/>
                  </svg>
                </span>
                <span class="type-option-label">Avoidance</span>
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

          <!-- US-087: Avoidance Settings -->
          <div class="form-group target-input-group hidden" id="goal-form-avoidance-settings-group">
            <label class="form-label">Avoidance Settings</label>
            <div class="avoidance-settings">
              <label class="toggle-setting">
                <input type="checkbox" id="goal-form-forgiveness" name="forgiveness">
                <span class="toggle-slider"></span>
                <span class="toggle-label">Enable forgiveness mode</span>
              </label>
              <p class="form-hint">With forgiveness mode, one slip-up per week won't reset your streak.</p>
            </div>
            <div class="avoidance-info-box">
              <div class="avoidance-info-icon">🛡️</div>
              <div class="avoidance-info-text">
                <strong>How avoidance goals work:</strong>
                <ul>
                  <li>Your streak automatically increases each day</li>
                  <li>Mark "Slipped" when you break your goal</li>
                  <li>Without forgiveness, slip-ups reset to day 0</li>
                </ul>
              </div>
            </div>
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

          <!-- US-084: Habit Chain Linking -->
          <div class="form-group">
            <label class="form-label">Chain After <span class="optional-indicator">(optional)</span></label>
            <div class="chain-selector">
              <select id="goal-form-chain-parent" name="chain-parent" class="form-input form-select">
                <option value="">None - This goal is independent</option>
                ${renderChainParentOptions(editingGoal)}
              </select>
              <div class="chain-link-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
            </div>
            <p class="form-hint chain-hint">
              Link this goal to complete after another goal. The goal will be <strong>locked</strong> until the parent goal is completed.
            </p>
            <div class="chain-info" id="goal-form-chain-info" style="display: none;">
              <div class="chain-visualization">
                <span class="chain-parent-name" id="chain-parent-display"></span>
                <span class="chain-arrow">→</span>
                <span class="chain-current-name">This Goal</span>
              </div>
            </div>
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

  // US-084: Chain parent selector
  const chainParentSelect = screen.querySelector('#goal-form-chain-parent');
  const chainInfo = screen.querySelector('#goal-form-chain-info');
  const chainParentDisplay = screen.querySelector('#chain-parent-display');

  if (chainParentSelect) {
    chainParentSelect.addEventListener('change', () => {
      const selectedParentId = chainParentSelect.value;
      if (selectedParentId && chainInfo && chainParentDisplay) {
        const parentGoal = state.goals.find(g => g.id === selectedParentId);
        if (parentGoal) {
          chainParentDisplay.textContent = parentGoal.title;
          chainInfo.style.display = 'block';
        }
      } else if (chainInfo) {
        chainInfo.style.display = 'none';
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
  const avoidanceGroup = screen.querySelector('#goal-form-avoidance-settings-group');

  if (timerGroup && counterGroup) {
    if (type === GOAL_TYPES.TIMER) {
      timerGroup.classList.remove('hidden');
      counterGroup.classList.add('hidden');
      if (avoidanceGroup) avoidanceGroup.classList.add('hidden');
    } else if (type === GOAL_TYPES.COUNTER) {
      timerGroup.classList.add('hidden');
      counterGroup.classList.remove('hidden');
      if (avoidanceGroup) avoidanceGroup.classList.add('hidden');
    } else if (type === GOAL_TYPES.AVOIDANCE) {
      // US-087: Avoidance - hide timer/counter, show avoidance settings
      timerGroup.classList.add('hidden');
      counterGroup.classList.add('hidden');
      if (avoidanceGroup) avoidanceGroup.classList.remove('hidden');
    } else {
      // Checkbox - hide all
      timerGroup.classList.add('hidden');
      counterGroup.classList.add('hidden');
      if (avoidanceGroup) avoidanceGroup.classList.add('hidden');
    }
  }

  // US-087: Hide timeframe selector for avoidance goals (always daily)
  const timeframeGroup = screen.querySelector('.timeframe-selector')?.closest('.form-group');
  if (timeframeGroup) {
    if (type === GOAL_TYPES.AVOIDANCE) {
      timeframeGroup.style.display = 'none';
    } else {
      timeframeGroup.style.display = '';
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

  // US-087: Set avoidance settings (if avoidance type)
  if (goal.type === GOAL_TYPES.AVOIDANCE) {
    const forgivenessCheckbox = screen.querySelector('#goal-form-forgiveness');
    if (forgivenessCheckbox) {
      forgivenessCheckbox.checked = goal.forgivenessEnabled || false;
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

  // US-084: Set chain parent
  const chainParentSelect = screen.querySelector('#goal-form-chain-parent');
  const chainInfo = screen.querySelector('#goal-form-chain-info');
  const chainParentDisplay = screen.querySelector('#chain-parent-display');

  if (chainParentSelect && goal.chainParentId) {
    chainParentSelect.value = goal.chainParentId;

    // Show chain info visualization
    if (chainInfo && chainParentDisplay) {
      const parentGoal = state.goals.find(g => g.id === goal.chainParentId);
      if (parentGoal) {
        chainParentDisplay.textContent = parentGoal.title;
        chainInfo.style.display = 'block';
      }
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
  } else if (type === GOAL_TYPES.AVOIDANCE) {
    // US-087: Avoidance goal - target is 1 (we track streak in progress)
    target = 1;
  } else {
    // Checkbox
    target = 1;
  }

  // Get timeframe (avoidance always uses daily)
  const timeframeInput = screen.querySelector('#goal-form-timeframe');
  const timeframe = type === GOAL_TYPES.AVOIDANCE ? TIMEFRAMES.DAILY : (timeframeInput?.value || TIMEFRAMES.DAILY);

  // US-087: Get forgiveness setting for avoidance goals
  const forgivenessCheckbox = screen.querySelector('#goal-form-forgiveness');
  const forgivenessEnabled = type === GOAL_TYPES.AVOIDANCE ? (forgivenessCheckbox?.checked || false) : false;

  // US-065: Get category (null if 'none' or empty)
  const categoryInput = screen.querySelector('#goal-form-category');
  const category = categoryInput?.value || null;

  // US-073: Get color (null if empty)
  const colorInput = screen.querySelector('#goal-form-color');
  const color = colorInput?.value || null;

  // US-074: Get notes (null if empty, max 500 chars enforced by maxlength)
  const notesTextarea = screen.querySelector('#goal-form-notes');
  const notes = notesTextarea?.value?.trim() || null;

  // US-084: Get chain parent (null if 'none' or empty)
  const chainParentSelect = screen.querySelector('#goal-form-chain-parent');
  const chainParentId = chainParentSelect?.value || null;

  console.log(`[GoalForm] Submitting in ${isEditMode ? 'edit' : 'add'} mode:`, { title, type, target, timeframe, category, color, notes, chainParentId, forgivenessEnabled });

  try {
    if (isEditMode && goalId) {
      // Edit mode: update existing goal
      // US-084: Determine chain status based on chain parent
      const existingGoal = state.goals.find(g => g.id === goalId);
      let chainStatus = CHAIN_STATUS.UNLOCKED;
      if (chainParentId) {
        const parentGoal = state.goals.find(g => g.id === chainParentId);
        chainStatus = (parentGoal && isGoalCompleted(parentGoal)) ? CHAIN_STATUS.UNLOCKED : CHAIN_STATUS.LOCKED;
      }

      // US-087: Include avoidance-specific properties in update
      const updateData = {
        title,
        type,
        target,
        timeframe,
        category,
        color,
        notes,
        chainParentId,
        chainStatus
      };

      // Add avoidance-specific fields if changing to avoidance type
      if (type === GOAL_TYPES.AVOIDANCE) {
        updateData.forgivenessEnabled = forgivenessEnabled;
        // Preserve existing avoidance data if already avoidance type
        if (existingGoal?.type !== GOAL_TYPES.AVOIDANCE) {
          updateData.slipUpsThisWeek = 0;
          updateData.longestAvoidanceStreak = 0;
          updateData.lastStreakIncrementDate = null;
        }
      }

      const success = await updateGoal(goalId, updateData);

      if (success) {
        // Update the goal in local state
        const goalIndex = state.goals.findIndex(g => g.id === goalId);
        if (goalIndex !== -1) {
          state.goals[goalIndex] = {
            ...state.goals[goalIndex],
            ...updateData
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
        chainParentId, // US-084: Add chain parent
        forgivenessEnabled, // US-087: Avoidance forgiveness setting
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

// Template Gallery Screen functions are now in ./screens/templates.js

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

// Archive screen functions are now in ./screens/archive.js

// Statistics screen functions are now in ./screens/statistics.js

// Weekly Review screen functions are now in ./screens/weeklyReview.js

// Focus Mode screen functions are now in ./screens/focusMode.js

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

        // US-080: Check achievements for goal creation
        checkAchievements('goal_create', { goal: newGoal });
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

// US-080: Achievement functions are now imported from ./features/achievements.js

// US-083: Level and XP System functions are now imported from ./features/xpLevels.js

// US-081: Daily Challenge functions are now imported from ./features/dailyChallenges.js

// Reports screen functions are now imported from ./screens/reports.js

// Settings screen functions are now imported from ./screens/settings.js

// ============================================
// US-082: Share Progress as Image
// ============================================

/**
 * US-082: Share card template definitions
 * Each template defines how the share image will look
 */
const SHARE_CARD_TEMPLATES = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and simple design',
    width: 400,
    height: 500,
    background: { light: '#FFFFFF', dark: '#1E1E1E' },
    accent: { light: '#4CAF50', dark: '#66BB6A' }
  },
  gradient: {
    id: 'gradient',
    name: 'Gradient',
    description: 'Vibrant gradient background',
    width: 400,
    height: 500,
    gradientStart: { light: '#667eea', dark: '#4c63d2' },
    gradientEnd: { light: '#764ba2', dark: '#5e3b7c' }
  },
  dark: {
    id: 'dark',
    name: 'Dark Pro',
    description: 'Professional dark theme',
    width: 400,
    height: 500,
    background: '#1a1a2e',
    accent: '#00d9ff'
  }
};

/**
 * US-082: Attach share button listener
 * @param {HTMLElement} screen - The reports screen element
 */
function attachShareReportsListeners(screen) {
  const shareBtn = screen.querySelector('[data-action="share-reports"]');
  if (shareBtn) {
    shareBtn.addEventListener('click', openShareModal);
  }
}

/**
 * US-082: Open the share modal
 */
function openShareModal() {
  playSound('click');

  // Get current stats for preview
  const disciplineScore = document.getElementById('discipline-score-value')?.textContent || '--';
  const currentStreak = document.getElementById('current-streak-value')?.textContent || '0';
  const bestStreak = document.getElementById('best-streak-value')?.textContent || '0';
  const todayCompleted = document.getElementById('today-completed')?.textContent || '--/--';

  // Create modal HTML
  const modalHTML = `
    <div class="share-modal-overlay" id="share-modal-overlay">
      <div class="share-modal">
        <div class="share-modal-header">
          <h3>Share Progress</h3>
          <button class="share-modal-close" data-action="close-share-modal">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="share-modal-content">
          <div class="share-preview-container">
            <canvas id="share-preview-canvas" width="400" height="500"></canvas>
          </div>
          <div class="share-templates">
            <label class="share-templates-label">Choose Style</label>
            <div class="share-template-options">
              ${Object.values(SHARE_CARD_TEMPLATES).map((template, index) => `
                <button class="share-template-btn ${index === 0 ? 'active' : ''}" data-template="${template.id}">
                  <span class="template-name">${template.name}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="share-modal-actions">
          <button class="share-action-btn copy-btn" data-action="copy-share-image">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span>Copy to Clipboard</span>
          </button>
          <button class="share-action-btn download-btn" data-action="download-share-image">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Download PNG</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Add modal to DOM
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Show modal with animation
  const overlay = document.getElementById('share-modal-overlay');
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
  });

  // Generate initial preview
  generateShareImage('minimal');

  // Attach modal event listeners
  attachShareModalListeners();
}

/**
 * US-082: Attach event listeners to share modal
 */
function attachShareModalListeners() {
  const overlay = document.getElementById('share-modal-overlay');
  if (!overlay) return;

  // Close button
  const closeBtn = overlay.querySelector('[data-action="close-share-modal"]');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeShareModal);
  }

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeShareModal();
    }
  });

  // Template selection
  const templateBtns = overlay.querySelectorAll('.share-template-btn');
  templateBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      templateBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Regenerate preview
      const templateId = btn.getAttribute('data-template');
      generateShareImage(templateId);
      playSound('click');
    });
  });

  // Copy to clipboard
  const copyBtn = overlay.querySelector('[data-action="copy-share-image"]');
  if (copyBtn) {
    copyBtn.addEventListener('click', handleCopyShareImage);
  }

  // Download
  const downloadBtn = overlay.querySelector('[data-action="download-share-image"]');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', handleDownloadShareImage);
  }

  // Escape key to close
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeShareModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

/**
 * US-082: Close the share modal
 */
function closeShareModal() {
  const overlay = document.getElementById('share-modal-overlay');
  if (!overlay) return;

  overlay.classList.remove('visible');

  // Remove after animation
  setTimeout(() => {
    overlay.remove();
  }, 200);
}

/**
 * US-082: Generate share image using canvas
 * @param {string} templateId - The template ID to use
 */
function generateShareImage(templateId) {
  const canvas = document.getElementById('share-preview-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const template = SHARE_CARD_TEMPLATES[templateId] || SHARE_CARD_TEMPLATES.minimal;

  // Get current theme
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  // Get stats from the DOM
  const disciplineScore = document.getElementById('discipline-score-value')?.textContent || '--';
  const currentStreak = document.getElementById('current-streak-value')?.textContent || '0';
  const bestStreak = document.getElementById('best-streak-value')?.textContent || '0';
  const todayCompleted = document.getElementById('today-completed')?.textContent || '--/--';
  const weekCompleted = document.getElementById('week-completed')?.textContent || '--/--';

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw based on template
  switch (templateId) {
    case 'gradient':
      drawGradientTemplate(ctx, canvas, template, { disciplineScore, currentStreak, bestStreak, todayCompleted, weekCompleted });
      break;
    case 'dark':
      drawDarkTemplate(ctx, canvas, template, { disciplineScore, currentStreak, bestStreak, todayCompleted, weekCompleted });
      break;
    default:
      drawMinimalTemplate(ctx, canvas, template, { disciplineScore, currentStreak, bestStreak, todayCompleted, weekCompleted }, isDark);
      break;
  }
}

/**
 * US-082: Draw minimal template
 */
function drawMinimalTemplate(ctx, canvas, template, stats, isDark) {
  const { width, height } = canvas;
  const bgColor = isDark ? template.background.dark : template.background.light;
  const accentColor = isDark ? template.accent.dark : template.accent.light;
  const textColor = isDark ? '#FFFFFF' : '#212121';
  const textSecondary = isDark ? '#B0B0B0' : '#666666';

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = isDark ? '#333333' : '#E0E0E0';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Header
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, width, 70);

  // App title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Daily Goals Tracker', width / 2, 45);

  // Discipline Score
  ctx.fillStyle = textColor;
  ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(stats.disciplineScore, width / 2, 160);

  ctx.fillStyle = textSecondary;
  ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Discipline Score', width / 2, 190);

  // Divider
  ctx.strokeStyle = isDark ? '#333333' : '#E0E0E0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 220);
  ctx.lineTo(width - 40, 220);
  ctx.stroke();

  // Streak section
  const streakY = 275;

  // Current streak
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(stats.currentStreak, width / 4, streakY);

  ctx.fillStyle = textSecondary;
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('day streak', width / 4, streakY + 25);

  // Best streak
  ctx.fillStyle = '#FFB300';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(stats.bestStreak, (width * 3) / 4, streakY);

  ctx.fillStyle = textSecondary;
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('best streak', (width * 3) / 4, streakY + 25);

  // Stats boxes
  const boxY = 340;
  const boxWidth = 150;
  const boxHeight = 70;
  const boxGap = 20;
  const startX = (width - (boxWidth * 2 + boxGap)) / 2;

  // Today box
  drawStatBox(ctx, startX, boxY, boxWidth, boxHeight, 'Today', stats.todayCompleted, accentColor, textColor, isDark);

  // This Week box
  drawStatBox(ctx, startX + boxWidth + boxGap, boxY, boxWidth, boxHeight, 'This Week', stats.weekCompleted, accentColor, textColor, isDark);

  // Footer branding
  ctx.fillStyle = textSecondary;
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Generated with Daily Goals Tracker', width / 2, height - 20);
}

/**
 * US-082: Draw gradient template
 */
function drawGradientTemplate(ctx, canvas, template, stats) {
  const { width, height } = canvas;

  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, template.gradientStart.light);
  gradient.addColorStop(1, template.gradientEnd.light);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Semi-transparent overlay for better text readability
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(0, 0, width, height);

  // App title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Daily Goals Tracker', width / 2, 50);

  // Discipline Score - Large circle
  const centerX = width / 2;
  const centerY = 150;
  const radius = 70;

  // Circle background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Circle border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Score text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(stats.disciplineScore, centerX, centerY + 15);

  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText('Discipline Score', centerX, centerY + 45);

  // Stats cards
  const cardY = 270;
  const cardWidth = 160;
  const cardHeight = 80;
  const cardGap = 20;
  const startX = (width - (cardWidth * 2 + cardGap)) / 2;

  // Draw glass-morphism style cards
  drawGlassCard(ctx, startX, cardY, cardWidth, cardHeight, stats.currentStreak, 'Day Streak', '🔥');
  drawGlassCard(ctx, startX + cardWidth + cardGap, cardY, cardWidth, cardHeight, stats.bestStreak, 'Best Streak', '⭐');

  // Second row
  const cardY2 = cardY + cardHeight + 15;
  drawGlassCard(ctx, startX, cardY2, cardWidth, cardHeight, stats.todayCompleted, 'Today', '📅');
  drawGlassCard(ctx, startX + cardWidth + cardGap, cardY2, cardWidth, cardHeight, stats.weekCompleted, 'This Week', '📊');

  // Footer
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Generated with Daily Goals Tracker', width / 2, height - 20);
}

/**
 * US-082: Draw dark professional template
 */
function drawDarkTemplate(ctx, canvas, template, stats) {
  const { width, height } = canvas;

  // Dark background
  ctx.fillStyle = template.background;
  ctx.fillRect(0, 0, width, height);

  // Subtle grid pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let i = 0; i < height; i += 20) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  // Accent bar at top
  const accentGradient = ctx.createLinearGradient(0, 0, width, 0);
  accentGradient.addColorStop(0, template.accent);
  accentGradient.addColorStop(1, '#7c3aed');
  ctx.fillStyle = accentGradient;
  ctx.fillRect(0, 0, width, 4);

  // App title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DAILY GOALS TRACKER', width / 2, 45);

  // Discipline Score
  ctx.fillStyle = template.accent;
  ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(stats.disciplineScore, width / 2, 145);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('DISCIPLINE SCORE', width / 2, 175);

  // Horizontal line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 200);
  ctx.lineTo(width - 40, 200);
  ctx.stroke();

  // Stats in a row
  const statsY = 260;
  const statsGap = width / 4;

  drawDarkStat(ctx, statsGap, statsY, stats.currentStreak, 'STREAK', template.accent);
  drawDarkStat(ctx, statsGap * 2, statsY, stats.bestStreak, 'BEST', '#FFB300');
  drawDarkStat(ctx, statsGap * 3, statsY, stats.todayCompleted, 'TODAY', '#10B981');

  // Week stats card
  const cardY = 340;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  roundRect(ctx, 40, cardY, width - 80, 80, 12);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  roundRect(ctx, 40, cardY, width - 80, 80, 12);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(stats.weekCompleted, width / 2, cardY + 45);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('GOALS COMPLETED THIS WEEK', width / 2, cardY + 68);

  // Footer
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Generated with Daily Goals Tracker', width / 2, height - 20);
}

/**
 * US-082: Helper - Draw stat box for minimal template
 */
function drawStatBox(ctx, x, y, width, height, label, value, accentColor, textColor, isDark) {
  // Box background
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';
  roundRect(ctx, x, y, width, height, 8);
  ctx.fill();

  // Box border
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, width, height, 8);
  ctx.stroke();

  // Value
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(value, x + width / 2, y + 35);

  // Label
  ctx.fillStyle = isDark ? '#999999' : '#666666';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(label, x + width / 2, y + 55);
}

/**
 * US-082: Helper - Draw glass morphism card for gradient template
 */
function drawGlassCard(ctx, x, y, width, height, value, label, emoji) {
  // Glass background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  roundRect(ctx, x, y, width, height, 12);
  ctx.fill();

  // Glass border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, width, height, 12);
  ctx.stroke();

  // Emoji
  ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(emoji, x + 12, y + 30);

  // Value
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(value, x + width / 2, y + 45);

  // Label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(label, x + width / 2, y + 68);
}

/**
 * US-082: Helper - Draw stat for dark template
 */
function drawDarkStat(ctx, x, y, value, label, color) {
  ctx.fillStyle = color;
  ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(value, x, y);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(label, x, y + 20);
}

/**
 * US-082: Helper - Draw rounded rectangle
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * US-082: Copy share image to clipboard
 */
async function handleCopyShareImage() {
  const canvas = document.getElementById('share-preview-canvas');
  if (!canvas) return;

  try {
    // Convert canvas to blob
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create blob'));
      }, 'image/png');
    });

    // Use Clipboard API
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);

    // Show success feedback
    showShareFeedback('success', 'Image copied to clipboard!');
    playSound('complete');

    console.log('[Share] Image copied to clipboard');
  } catch (error) {
    console.error('[Share] Error copying to clipboard:', error);
    // Fallback: try downloading instead
    showShareFeedback('error', 'Could not copy. Try downloading instead.');
  }
}

/**
 * US-082: Download share image as PNG
 */
function handleDownloadShareImage() {
  const canvas = document.getElementById('share-preview-canvas');
  if (!canvas) return;

  try {
    // Convert canvas to data URL
    const dataUrl = canvas.toDataURL('image/png');

    // Create download link
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `daily-goals-progress-${getTodayDateString()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Show success feedback
    showShareFeedback('success', 'Image downloaded!');
    playSound('click');

    console.log('[Share] Image downloaded');
  } catch (error) {
    console.error('[Share] Error downloading image:', error);
    showShareFeedback('error', 'Failed to download image.');
  }
}

/**
 * US-082: Show feedback message in share modal
 * @param {string} type - 'success' or 'error'
 * @param {string} message - Message to display
 */
function showShareFeedback(type, message) {
  // Remove existing feedback
  const existingFeedback = document.querySelector('.share-feedback');
  if (existingFeedback) {
    existingFeedback.remove();
  }

  // Create feedback element
  const feedback = document.createElement('div');
  feedback.className = `share-feedback share-feedback-${type}`;
  feedback.innerHTML = `
    <span class="share-feedback-icon">
      ${type === 'success' ?
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' :
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
      }
    </span>
    <span class="share-feedback-message">${message}</span>
  `;

  // Insert feedback in modal
  const modalContent = document.querySelector('.share-modal-content');
  if (modalContent) {
    modalContent.insertAdjacentElement('afterbegin', feedback);
  }

  // Auto-remove after delay
  setTimeout(() => {
    feedback.classList.add('fade-out');
    setTimeout(() => feedback.remove(), 300);
  }, 2500);
}

// US-070: Data Management (Export/Import) functions are now in ./screens/settings.js

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

    // Load goals, settings, active timers, streak data, categories, templates, archived goals, achievements, daily challenges, XP, and Pomodoro data in parallel
    const [goals, settings, activeTimers, streakData, categories, templates, archivedGoals, achievements, dailyChallenges, xpData, pomodoroSettings, pomodoroStates] = await Promise.all([
      getGoals(),
      getSettings(),
      getActiveTimers(),
      getStreakData(),
      getCategories(),
      getTemplates(), // US-066: Load templates
      getArchivedGoals(), // US-069: Load archived goals
      getAchievements(), // US-080: Load achievements
      getDailyChallenges(), // US-081: Load daily challenges
      getXPData(), // US-083: Load XP data
      getPomodoroSettings(), // US-085: Load Pomodoro settings
      getPomodoroStates() // US-085: Load Pomodoro states
    ]);

    // Update state
    state.goals = goals;
    state.settings = settings;
    state.activeTimers = activeTimers;
    state.streakData = streakData;
    state.categories = categories;
    state.templates = templates; // US-066
    state.archivedGoals = archivedGoals; // US-069

    // US-080: Initialize achievements if not present
    if (!achievements || achievements.length === 0) {
      state.achievements = createDefaultAchievementProgress();
      await saveAchievements(state.achievements);
    } else {
      state.achievements = achievements;
    }

    // US-083: Initialize XP data if not present
    if (!xpData) {
      state.xpData = getDefaultXPData();
      await saveXPData(state.xpData);
    } else {
      state.xpData = xpData;
    }

    // US-085: Initialize Pomodoro data
    state.pomodoroSettings = pomodoroSettings;
    state.pomodoroStates = pomodoroStates;

    // US-081: Initialize daily challenges if not present or if it's a new day
    await initializeDailyChallenge(dailyChallenges);

    console.log('Data loaded:', {
      goalsCount: goals.length,
      settings: settings,
      activeTimersCount: Object.keys(activeTimers).length,
      streakData: streakData,
      categoriesCount: categories.length,
      templatesCount: templates.length,
      archivedGoalsCount: archivedGoals.length,
      achievementsCount: state.achievements.length,
      dailyChallengesEnabled: state.settings?.dailyChallengesEnabled,
      currentChallenge: state.dailyChallenges?.currentChallenge?.id,
      xpLevel: state.xpData?.currentLevel,
      totalXP: state.xpData?.totalXP,
      pomodoroGoalsCount: Object.keys(state.pomodoroStates).length
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
// Feature Module Callback Registration
// =============================================================================

/**
 * Register callbacks that feature modules need to call back into popup.js
 * This must be called before feature modules are used
 */
function registerFeatureModuleCallbacks() {
  // Register undo/redo callbacks
  registerUndoRedoCallbacks({
    renderCurrentScreen,
    startTimerUpdateInterval,
    sendToServiceWorker,
    showSuccessFeedback
  });

  // Register drag-drop callbacks
  registerDragDropCallbacks({
    renderCurrentScreen
  });

  // Register keyboard navigation callbacks
  registerKeyboardNavCallbacks({
    handleTimerToggle,
    handleCheckboxToggle,
    handleCounterIncrement,
    handleCounterDecrement,
    openGoalFormScreen
  });

  // Register achievements callbacks
  registerAchievementsCallbacks({
    attachNavigationListeners
  });

  // Register daily challenges callbacks
  registerDailyChallengesCallbacks({
    renderViewGoalsScreen
  });

  // Register pomodoro callbacks
  registerPomodoroCallbacks({
    renderCurrentScreen,
    startTimerUpdateInterval,
    handleTimerToggle,
    handleTimerCompletion
  });

  // Register break reminders callbacks
  registerBreakRemindersCallbacks({
    showSuccessFeedback
  });

  // Register archive screen callbacks
  registerArchiveCallbacks({
    showSuccessFeedback,
    showFormError,
    attachNavigationListeners,
    getGoalTypeIconSmall,
    getGoalTypeLabel,
    formatTargetForManage,
    capitalizeFirst
  });

  // Register templates screen callbacks
  registerTemplatesCallbacks({
    showScreen,
    showSuccessFeedback,
    showFormError,
    getGoalTypeIcon,
    capitalizeFirst
  });

  // Register statistics screen callbacks
  registerStatisticsCallbacks({
    showScreen,
    attachNavigationListeners,
    getGoalTypeIcon,
    capitalizeFirst
  });

  // Register weekly review screen callbacks
  registerWeeklyReviewCallbacks({
    attachNavigationListeners,
    getDailyQuote
  });

  // Register focus mode screen callbacks
  registerFocusModeCallbacks({
    showScreen,
    handleTimerToggle,
    handleCounterIncrement,
    handleCounterDecrement,
    handleCheckboxToggle,
    startTimerUpdateInterval,
    getGoalTypeIcon,
    capitalizeFirst
  });

  // Register reports screen callbacks
  registerReportsCallbacks({
    attachNavigationListeners,
    attachShareReportsListeners
  });

  // Register settings screen callbacks
  registerSettingsCallbacks({
    attachNavigationListeners,
    loadData,
    toggleTheme,
    getThemeDisplayText,
    getEffectiveTheme
  });
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize the popup application
 */
async function initApp() {
  console.log('Daily Goals Tracker popup initializing...');

  // Register callbacks for feature modules
  registerFeatureModuleCallbacks();

  // Load data from storage
  await loadData();

  // US-051: Initialize theme before showing any UI
  initTheme(state.settings);

  // Set up listener for system theme changes
  setupSystemThemeListener();

  // US-078: Initialize keyboard shortcuts
  initKeyboardShortcuts();

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
  // US-087 Avoidance functions
  handleAvoidanceSlipUp,
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
  getThemeDisplayText,
  // US-079 Undo/Redo functions
  UNDO_ACTION_TYPES,
  pushUndoAction,
  performUndo,
  performRedo,
  canUndo,
  canRedo,
  clearUndoHistory,
  showUndoToast,
  hideUndoToast
};
