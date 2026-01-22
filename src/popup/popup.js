/**
 * Popup JavaScript Entry Point
 * Main entry point for the My Tracker Chrome extension popup
 */

// =============================================================================
// Imports
// =============================================================================

// Shared state and constants
import { state, SCREENS, SCREEN_IDS, UNDO_ACTION_TYPES } from './state.js';

// Utility functions
import { formatTime } from './utils/formatting.js';
// formatProgressDisplay now used in ./components/goalCard.js
// escapeHtml now used in ./utils/feedback.js
import {
  showSuccessFeedback,
  showFormError,
  clearFormError,
  showInputError,
  clearInputError
} from './utils/feedback.js';
import {
  registerThemeCallbacks,
  getEffectiveTheme,
  applyTheme,
  applyColorTheme,
  initTheme,
  toggleTheme,
  setupSystemThemeListener,
  getThemeDisplayText
} from './utils/theme.js';

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
  registerAchievementsCallbacks,
  renderAchievementsScreen,
  checkAchievements
} from './features/achievements.js';

import {
  awardGoalCompletionXP,
  awardAchievementXP
  // getLevelTitle, getLevelProgress now used in ./screens/viewGoals.js
} from './features/xpLevels.js';

import {
  registerDailyChallengesCallbacks,
  initializeDailyChallenge,
  // renderDailyChallengeCard, attachDailyChallengeListeners now used in ./screens/viewGoals.js
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
  registerQuickAddCallbacks
  // renderQuickAddFAB, attachQuickAddFABListeners now used in ./screens/viewGoals.js
} from './screens/quickAdd.js';

import {
  registerManageGoalsCallbacks,
  renderManageGoalsScreen
} from './screens/manageGoals.js';

import {
  registerViewGoalsCallbacks,
  renderViewGoalsScreen
} from './screens/viewGoals.js';

import {
  attachShareReportsListeners,
  openShareModal,
  closeShareModal
} from './features/shareProgress.js';

// Component modules
import {
  getGoalTypeIcon,
  // renderGoalCard now used in ./screens/viewGoals.js
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
  // deleteGoal now used in ./screens/manageGoals.js
  addActivityLogEntry,
  // getHistory now used in ./screens/reports.js
  // getActivityLog now used in ./screens/reports.js
  getCategories,
  // addCategory, deleteCategory, DEFAULT_CATEGORIES now used in ./screens/settings.js
  // US-066: Template imports
  getTemplates,
  // US-069: Archive imports
  getArchivedGoals,
  // archiveGoal now used in ./screens/manageGoals.js
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
  getPomodoroStates,
  // Focus mode persistence
  getFocusedGoalId,
  clearFocusedGoalId
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
  getDefaultXPData
  // getLevelProgress, getLevelTitle now used in ./screens/viewGoals.js
} from '../utils/models.js';
import {
  initSounds,
  playSound,
  loadSoundSettings,
  // setVolume, setMuted now used in ./screens/settings.js
  SOUNDS
} from '../utils/sounds.js';
import {
  getDailyQuote
  // renderQuoteHTML now used in ./screens/viewGoals.js
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
 * Main screens that show the bottom nav
 */
const MAIN_SCREENS = [SCREENS.VIEW_GOALS, SCREENS.REPORTS, SCREENS.SETTINGS];

/**
 * Update the main bottom nav active state
 * @param {string} screenName - The current screen name
 */
function updateMainNavState(screenName) {
  const mainNav = document.getElementById('main-nav');
  if (!mainNav) return;

  // Show/hide nav based on screen type
  if (MAIN_SCREENS.includes(screenName)) {
    mainNav.classList.remove('hidden');
  } else {
    mainNav.classList.add('hidden');
  }

  // Update active button
  const navBtns = mainNav.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    const btnScreen = btn.getAttribute('data-screen');
    if (btnScreen === screenName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/**
 * Initialize the persistent main navigation
 */
function initMainNav() {
  const mainNav = document.getElementById('main-nav');
  if (!mainNav) return;

  mainNav.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const screenName = btn.getAttribute('data-screen');
      if (screenName) {
        showScreen(screenName);
      }
    });
  });
}

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

  // Update main nav state
  updateMainNavState(screenName);

  // Render the screen content
  renderCurrentScreen();
}

// =============================================================================
// Screen Rendering
// =============================================================================

/**
 * Render the current screen's content
 * Preserves scroll position for seamless updates
 */
function renderCurrentScreen() {
  // Save scroll position before re-render
  const goalsContainer = document.querySelector('.goals-list-container');
  const scrollTop = goalsContainer ? goalsContainer.scrollTop : 0;

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

  // Restore scroll position synchronously after render
  if (scrollTop > 0) {
    const newGoalsContainer = document.querySelector('.goals-list-container');
    if (newGoalsContainer) {
      // Disable smooth scrolling temporarily
      newGoalsContainer.style.scrollBehavior = 'auto';
      newGoalsContainer.scrollTop = scrollTop;
      // Re-enable after next frame
      requestAnimationFrame(() => {
        newGoalsContainer.style.scrollBehavior = '';
      });
    }
  }
}

// View Goals screen functions (renderViewGoalsScreen, getCompletedCount, renderCategoryFilterBar,
// renderEmptyState, renderGoalsList) are now in ./screens/viewGoals.js

// =============================================================================
// US-015: Goal Card Base Component
// =============================================================================
// Goal card functions (getGoalTypeIcon, renderGoalCard, toggleGoalNotes, renderGoalControls)
// are now imported from ./components/goalCard.js

// US-085: Pomodoro Timer Mode functions are imported from ./features/pomodoro.js

// US-086: Break Reminder functions are now imported from ./features/breakReminders.js

// NOTE: Pomodoro and Break Reminder functions have been extracted to their respective modules.

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
      // Allow progress to exceed target (overtime tracking)
      const newProgress = goal.progress + elapsedSinceStart;

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

    // Calculate current elapsed time (allow overtime - don't cap at target)
    const elapsedSinceStart = Math.floor((now - activeTimer.startTime) / 1000);
    const currentProgress = goal.progress + elapsedSinceStart;

    // Update the timer display in DOM
    const timerDisplay = document.querySelector(`.timer-display[data-goal-id="${goalId}"]`);
    if (timerDisplay) {
      const currentTimeElement = timerDisplay.querySelector('.timer-current');
      if (currentTimeElement) {
        currentTimeElement.textContent = formatTime(currentProgress);
      }
    }

    // Update the compact timer stats display (HH:MM:SS format)
    const timerCurrent = document.querySelector(`.timer-current[data-goal-id="${goalId}"]`);
    if (timerCurrent) {
      const hours = Math.floor(currentProgress / 3600);
      const minutes = Math.floor((currentProgress % 3600) / 60);
      const seconds = currentProgress % 60;
      const pad = (n) => n.toString().padStart(2, '0');
      timerCurrent.textContent = hours > 0
        ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
        : `${pad(minutes)}:${pad(seconds)}`;
    }

    // Update progress bar
    const goalCard = document.querySelector(`.goal-card[data-goal-id="${goalId}"]`);
    if (goalCard) {
      const progressFill = goalCard.querySelector('.goal-progress-fill');
      const progressPercent = goalCard.querySelector('.goal-progress-percent');

      if (progressFill) {
        // Cap visual progress bar at 100%
        const percentage = goal.target > 0 ? Math.min(100, (currentProgress / goal.target) * 100) : 100;
        progressFill.style.width = `${percentage}%`;
      }

      if (progressPercent) {
        // Cap percentage display at 100%
        const percentage = goal.target > 0 ? Math.min(100, (currentProgress / goal.target) * 100) : 100;
        progressPercent.textContent = `${Math.round(percentage)}%`;
      }

      // Update progress text display (show actual time including overtime)
      const progressText = goalCard.querySelector('.goal-progress-text');
      if (progressText) {
        progressText.textContent = `${formatTime(currentProgress)} / ${formatTime(goal.target)}`;
      }
    }

    // Check if goal just completed (trigger celebration once, but don't stop timer)
    if (currentProgress >= goal.target && !isGoalCompleted(goal)) {
      handleTimerCompletionCelebrationOnly(goalId);
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

  // Re-render to show completion state
  renderCurrentScreen();
}

/**
 * Handle timer completion celebration only (without stopping the timer)
 * Used when timer reaches target but should continue running for overtime tracking
 * @param {string} goalId - The ID of the completed timer goal
 */
async function handleTimerCompletionCelebrationOnly(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return;

  // Mark as completed in storage (progress will be saved when paused)
  // Log completion
  const completeLog = createActivityLog({
    goalId: goalId,
    action: ACTIVITY_ACTIONS.COMPLETE,
    value: goal.target
  });
  await addActivityLogEntry(completeLog);

  console.log(`[Timer] Goal ${goalId} completed! Timer continues running for overtime.`);

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

  // Note: Timer continues running, no re-render needed (display updates via interval)
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

// Keyboard navigation functions (getVisibleGoals, selectGoalByIndex, initKeyboardShortcuts, etc.)
// are now imported from ./features/keyboardNav.js

// Undo/Redo functions (pushUndoAction, performUndo, performRedo, etc.)
// UNDO_ACTION_TYPES constant is now imported from ./state.js
// are now imported from ./features/undoRedo.js

// =============================================================================
// US-020: Manage Goals Screen
// =============================================================================
// Manage Goals screen functions are now imported from ./screens/manageGoals.js

// Goal Form Screen functions are now in ./screens/goalForm.js
// Template Gallery Screen functions are now in ./screens/templates.js
// Archive screen functions are now in ./screens/archive.js
// Statistics screen functions are now in ./screens/statistics.js
// Weekly Review screen functions are now in ./screens/weeklyReview.js
// Focus Mode screen functions are now in ./screens/focusMode.js
// Quick Add FAB functions are now in ./screens/quickAdd.js

// US-029, US-030, US-021: Manage goals listeners, edit, and delete functions
// are now imported from ./screens/manageGoals.js

// The following functions were extracted to manageGoals.js:
// - attachManageGoalsListeners, handleEditGoal, handleArchiveGoal
// - openDeleteConfirmModal, closeDeleteConfirmModal, attachDeleteConfirmListeners
// - handleDeleteModalClose, handleDeleteModalKeydown, handleConfirmDelete
// - getGoalTypeIconSmall, getGoalTypeLabel, formatTargetForManage
// - renderManageGoalItem, renderManageGoalsEmptyState, renderManageGoalsList

// Keeping placeholder to indicate where extracted code used to be
// NOTE: Check that handleDeleteModalKeydown was at this line when extraction happened
// This marker helps find where the code was removed from


// =============================================================================
// US-028: Feedback functions (showSuccessFeedback, showFormError, clearFormError,
// showInputError, clearInputError) are now in ./utils/feedback.js

// renderManageGoalItem is now in ./screens/manageGoals.js

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

// US-056: Compact View Mode Toggle - attachCompactViewToggleListener is now in ./screens/viewGoals.js
// US-065: Category filter listeners - attachCategoryFilterListeners is now in ./screens/viewGoals.js

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

      // Timer continues running even past target (overtime tracking)
      // Just ensure goal.isActive is true
      if (!goal.isActive) {
        goal.isActive = true;
        await updateGoal(goalId, { isActive: true });
      }

      // Check if timer just completed (was not completed before)
      if (currentProgress >= goal.target && !isGoalCompleted(goal)) {
        console.log(`[Sync] Timer goal ${goalId} completed while popup was closed, continuing for overtime`);

        // Log completion (but don't stop timer)
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
      }

      console.log(`[Sync] Timer goal ${goalId} running: ${formatTime(currentProgress)} elapsed`);
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

// Theme functions (getEffectiveTheme, applyTheme, initTheme, toggleTheme,
// setupSystemThemeListener, getThemeDisplayText) are now in ./utils/theme.js

// =============================================================================
// Feature Module Callback Registration
// =============================================================================

/**
 * Register callbacks that feature modules need to call back into popup.js
 * This must be called before feature modules are used
 */
function registerFeatureModuleCallbacks() {
  // Register theme callbacks
  registerThemeCallbacks({
    getState: () => state,
    setState: (updates) => Object.assign(state, updates),
    saveSettings,
    renderSettingsScreen,
    SCREENS
  });

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

  // Register manage goals screen callbacks
  registerManageGoalsCallbacks({
    showScreen,
    attachNavigationListeners,
    openGoalFormScreen,
    showSuccessFeedback,
    showFormError,
    handleSaveAsTemplate,
    capitalizeFirst,
    renderCurrentScreen
  });

  // Register view goals screen callbacks
  registerViewGoalsCallbacks({
    attachNavigationListeners,
    attachGoalControlListeners,
    startTimerUpdateInterval
  });
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize the popup application
 */
async function initApp() {
  console.log('My Tracker popup initializing...');

  // Register callbacks for feature modules
  registerFeatureModuleCallbacks();

  // Load data from storage
  await loadData();

  // US-051: Initialize theme before showing any UI
  initTheme(state.settings);

  // Set up listener for system theme changes
  setupSystemThemeListener();

  // Initialize persistent main navigation
  initMainNav();

  // US-078: Initialize keyboard shortcuts
  initKeyboardShortcuts();

  // Check if we should restore focus mode
  const savedFocusedGoalId = await getFocusedGoalId();
  if (savedFocusedGoalId) {
    // Verify the goal still exists
    const goalExists = state.goals.some(g => g.id === savedFocusedGoalId);
    if (goalExists) {
      // Restore focus mode state and show focus mode screen
      state.focusedGoalId = savedFocusedGoalId;
      showScreen(SCREENS.FOCUS_MODE);
      console.log('[FocusMode] Restored focus mode for goal:', savedFocusedGoalId);
    } else {
      // Goal no longer exists, clear the saved focus mode
      await clearFocusedGoalId();
      showScreen(SCREENS.VIEW_GOALS);
    }
  } else {
    // Show the default screen (View Goals)
    showScreen(SCREENS.VIEW_GOALS);
  }

  console.log('My Tracker popup initialized successfully');
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
  // US-029 Edit goal functions (handleEditGoal, attachManageGoalsListeners are internal to manageGoals.js)
  // US-058 Full-page Goal Form Screen functions (re-exported from ./screens/goalForm.js)
  openGoalFormScreen,
  renderGoalFormScreen,
  setGoalFormScreenType,
  // US-030 Delete goal confirmation functions (internal to manageGoals.js)
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
