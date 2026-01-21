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
  getActiveTimers,
  getStreakData,
  saveActiveTimers,
  updateGoal,
  deleteGoal,
  addActivityLogEntry
} from '../utils/storage.js';
import {
  GOAL_TYPES,
  TIMEFRAMES,
  ACTIVITY_ACTIONS,
  isGoalCompleted,
  getGoalCompletionPercentage,
  createActivityLog,
  createGoal
} from '../utils/models.js';
import {
  initSounds,
  playSound,
  loadSoundSettings,
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
  REPORTS: 'reports',
  SETTINGS: 'settings'
};

/**
 * Mapping of screen names to DOM element IDs
 */
const SCREEN_IDS = {
  [SCREENS.VIEW_GOALS]: 'screen-view-goals',
  [SCREENS.MANAGE_GOALS]: 'screen-manage-goals',
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

  screen.innerHTML = `
    <div class="view-goals-screen">
      <header class="screen-header view-goals-header">
        <div class="header-main">
          <h1 class="app-title">Daily Goals</h1>
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
    </div>
  `;

  // Attach navigation event listeners
  attachNavigationListeners(screen);

  // Attach goal control listeners (timer play/pause, etc.)
  attachGoalControlListeners(screen);

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
  const sortedGoals = [...state.goals].sort((a, b) => {
    if (a.order !== b.order) {
      return (a.order || 0) - (b.order || 0);
    }
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  return `
    <div class="goals-list">
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
  const cardClasses = [
    'goal-card',
    `goal-type-${goal.type}`,
    isCompleted ? 'goal-completed' : '',
    // Add active class for running timers (US-016)
    goal.type === GOAL_TYPES.TIMER && goal.isActive ? 'goal-timer-active' : '',
    // US-019: Add just-completed class for celebration animation
    justCompleted ? 'just-completed' : ''
  ].filter(Boolean).join(' ');

  return `
    <div class="${cardClasses}" data-goal-id="${goal.id}">
      <div class="goal-card-header">
        <div class="goal-card-title-row">
          <span class="goal-type-indicator">${typeIcon}</span>
          <h3 class="goal-title">${escapeHtml(goal.title)}</h3>
        </div>
        <span class="goal-timeframe-badge timeframe-${goal.timeframe}">${capitalizeFirst(goal.timeframe)}</span>
      </div>
      <div class="goal-card-body">
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
// =============================================================================

/**
 * Trigger completion celebration animation for a goal
 * @param {string} goalId - The ID of the completed goal
 */
function triggerCompletionCelebration(goalId) {
  // Add to just-completed set
  state.justCompletedGoals.add(goalId);

  // Schedule removal of the just-completed state after animation
  setTimeout(() => {
    state.justCompletedGoals.delete(goalId);

    // Remove the class from DOM if the element still exists
    const goalCard = document.querySelector(`.goal-card[data-goal-id="${goalId}"]`);
    if (goalCard) {
      goalCard.classList.remove('just-completed');
    }
  }, 1500); // Match the animation duration in CSS

  console.log(`[Celebration] Triggered completion animation for goal ${goalId}`);
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

  // Attach Add Goal button click listener (US-022)
  const addGoalBtn = screen.querySelector('#add-goal-btn');
  if (addGoalBtn) {
    addGoalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openGoalModal('add');
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
// US-021: Manage Goals - Goal List Item
// =============================================================================

/**
 * Attach event listeners for Manage Goals screen actions (Edit/Delete)
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
}

// =============================================================================
// US-029: Edit Goal - Pre-fill Form
// =============================================================================

/**
 * Handle Edit button click to open modal with goal data
 * @param {string} goalId - The ID of the goal to edit
 */
function handleEditGoal(goalId) {
  const goal = state.goals.find(g => g.id === goalId);

  if (!goal) {
    console.error(`[Edit] Goal not found: ${goalId}`);
    showFormError('Goal not found. Please refresh and try again.');
    return;
  }

  console.log(`[Edit] Opening edit modal for goal: ${goal.title} (${goalId})`);

  // Open the modal in edit mode with the goal data
  openGoalModal('edit', goal);
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
 */
function renderReportsScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.REPORTS]);
  if (!screen) return;

  // Placeholder content - will be enhanced in US-043
  screen.innerHTML = `
    <div class="reports-screen">
      <header class="screen-header">
        <button class="back-btn" data-screen="${SCREENS.VIEW_GOALS}">
          <span>&#8592;</span> Back
        </button>
        <h1>Reports</h1>
      </header>
      <main class="reports-content">
        <div class="discipline-score">
          <div class="score-value">--</div>
          <div class="score-label">Discipline Score</div>
        </div>
        <p class="reports-placeholder">Reports and analytics coming soon!</p>
      </main>
    </div>
  `;

  // Attach navigation event listeners
  attachNavigationListeners(screen);
}

/**
 * Render the Settings screen
 */
function renderSettingsScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.SETTINGS]);
  if (!screen) return;

  // Placeholder content - will be enhanced in US-052
  screen.innerHTML = `
    <div class="settings-screen">
      <header class="screen-header">
        <button class="back-btn" data-screen="${SCREENS.VIEW_GOALS}">
          <span>&#8592;</span> Back
        </button>
        <h1>Settings</h1>
      </header>
      <main class="settings-content">
        <div class="settings-section">
          <h2>Sound</h2>
          <div class="setting-item">
            <span>Sound Effects</span>
            <span>${state.settings?.soundEnabled ? 'On' : 'Off'}</span>
          </div>
        </div>
        <div class="settings-section">
          <h2>Appearance</h2>
          <div class="setting-item">
            <span>Theme</span>
            <span>${state.settings?.theme || 'auto'}</span>
          </div>
        </div>
        <div class="settings-section about">
          <h2>About</h2>
          <p>Daily Goals Tracker v1.0.0</p>
        </div>
      </main>
    </div>
  `;

  // Attach navigation event listeners
  attachNavigationListeners(screen);
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
// Data Loading
// =============================================================================

/**
 * Load all necessary data from storage
 * US-031: Enhanced to sync with service worker for background timer tracking
 */
async function loadData() {
  try {
    state.isLoading = true;

    // Load goals, settings, active timers, and streak data in parallel
    const [goals, settings, activeTimers, streakData] = await Promise.all([
      getGoals(),
      getSettings(),
      getActiveTimers(),
      getStreakData()
    ]);

    // Update state
    state.goals = goals;
    state.settings = settings;
    state.activeTimers = activeTimers;
    state.streakData = streakData;

    console.log('Data loaded:', {
      goalsCount: goals.length,
      settings: settings,
      activeTimersCount: Object.keys(activeTimers).length,
      streakData: streakData
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
// Initialization
// =============================================================================

/**
 * Initialize the popup application
 */
async function initApp() {
  console.log('Daily Goals Tracker popup initializing...');

  // Load data from storage
  await loadData();

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
  // US-030 Delete goal confirmation functions
  openDeleteConfirmModal,
  closeDeleteConfirmModal,
  handleConfirmDelete,
  // US-031 Background timer sync functions
  syncActiveTimersWithGoals,
  sendToServiceWorker
};
