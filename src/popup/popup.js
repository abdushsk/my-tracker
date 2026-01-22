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
import { formatTime, escapeHtml } from './utils/formatting.js';
// formatProgressDisplay now used in ./components/goalCard.js

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
  // renderChainIndicator, renderLockedOverlay now used in ./components/goalCard.js
  // renderChainParentOptions now used in ./screens/goalForm.js
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
  // renderPomodoroControls now used in ./components/goalCard.js
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

import {
  registerGoalFormCallbacks,
  openGoalFormScreen,
  renderGoalFormScreen,
  setGoalFormScreenType
} from './screens/goalForm.js';

import {
  registerQuickAddCallbacks,
  renderQuickAddFAB,
  attachQuickAddFABListeners
} from './screens/quickAdd.js';

import {
  attachShareReportsListeners,
  openShareModal,
  closeShareModal
} from './features/shareProgress.js';

// Component modules
import {
  getGoalTypeIcon,
  renderGoalCard,
  toggleGoalNotes
  // renderGoalControls used internally by goalCard.js
} from './components/goalCard.js';

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
  ACTIVITY_ACTIONS,
  isGoalCompleted,
  // getGoalCompletionPercentage now used in ./components/goalCard.js
  createActivityLog,
  // TIMEFRAMES, createGoal, getTodayDateString now used in ./screens/goalForm.js
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
  // CHAIN_STATUS now used in ./screens/goalForm.js
  // isGoalInChain, isGoalLocked now used in ./components/goalCard.js
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
// Goal card functions (getGoalTypeIcon, renderGoalCard, toggleGoalNotes, renderGoalControls)
// are now imported from ./components/goalCard.js

// US-084: renderChainIndicator and renderLockedOverlay are imported from ./features/habitChains.js
// US-085: Pomodoro Timer Mode functions are imported from ./features/pomodoro.js

// US-086: Break Reminder functions are now imported from ./features/breakReminders.js

// NOTE: All Pomodoro, Break Reminder, and Goal Handler functions have been extracted.
// Goal control handlers (handleTimerToggle, handleCounterIncrement, etc.) are now in ./features/goalHandlers.js

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

// Goal Form Screen functions are now in ./screens/goalForm.js

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

// Quick Add FAB functions are now in ./screens/quickAdd.js

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

// US-082: Share Progress functions are now imported from ./features/shareProgress.js

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

  // Register goal form screen callbacks
  registerGoalFormCallbacks({
    showScreen,
    showSuccessFeedback,
    showFormError,
    showInputError,
    clearInputError
  });

  // Register quick add callbacks
  registerQuickAddCallbacks({
    showSuccessFeedback,
    showFormError,
    openGoalFormScreen,
    setGoalFormScreenType,
    renderViewGoalsScreen
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
  // US-028 Feedback functions
  showInputError,
  clearInputError,
  showSuccessFeedback,
  showFormError,
  clearFormError,
  // US-029 Edit goal functions
  handleEditGoal,
  attachManageGoalsListeners,
  // US-058 Full-page Goal Form Screen functions (re-exported from ./screens/goalForm.js)
  openGoalFormScreen,
  renderGoalFormScreen,
  setGoalFormScreenType,
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
