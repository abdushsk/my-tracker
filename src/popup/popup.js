/**
 * Popup JavaScript Entry Point
 * Main entry point for the Daily Goals Tracker Chrome extension popup
 */

// =============================================================================
// Imports
// =============================================================================

import { getGoals, getSettings, getActiveTimers, getStreakData } from '../utils/storage.js';
import { GOAL_TYPES, TIMEFRAMES, isGoalCompleted } from '../utils/models.js';

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
  isLoading: true
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

  // Placeholder - will be fully implemented in US-015 (Goal Card component)
  return `
    <div class="goals-list">
      ${sortedGoals.map(goal => {
        const progressPercent = goal.target > 0
          ? Math.min(100, Math.round((goal.progress / goal.target) * 100))
          : 0;
        const isCompleted = goal.progress >= goal.target;

        return `
          <div class="goal-card ${isCompleted ? 'goal-completed' : ''}" data-goal-id="${goal.id}">
            <div class="goal-card-header">
              <div class="goal-title">${escapeHtml(goal.title)}</div>
              <span class="goal-timeframe-badge timeframe-${goal.timeframe}">${goal.timeframe}</span>
            </div>
            <div class="goal-type">${goal.type}</div>
            <div class="goal-progress-section">
              <div class="goal-progress-text">${goal.progress}/${goal.target}</div>
              <div class="goal-progress-bar">
                <div class="goal-progress-fill" style="width: ${progressPercent}%"></div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
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

/**
 * Render the Manage Goals screen
 */
function renderManageGoalsScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.MANAGE_GOALS]);
  if (!screen) return;

  // Placeholder content - will be enhanced in US-020
  screen.innerHTML = `
    <div class="manage-goals-screen">
      <header class="screen-header">
        <button class="back-btn" data-screen="${SCREENS.VIEW_GOALS}">
          <span>&#8592;</span> Back
        </button>
        <h1>Manage Goals</h1>
      </header>
      <main class="manage-content">
        <button class="btn btn-primary add-goal-btn">+ Add Goal</button>
        <div class="goals-management-list">
          ${state.goals.length === 0
            ? '<p class="no-goals-message">No goals to manage. Add your first goal!</p>'
            : state.goals.map(goal => `
                <div class="manage-goal-item" data-goal-id="${goal.id}">
                  <span class="goal-title">${goal.title}</span>
                  <span class="goal-type-badge">${goal.type}</span>
                </div>
              `).join('')}
        </div>
      </main>
    </div>
  `;

  // Attach navigation event listeners
  attachNavigationListeners(screen);
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

    state.isLoading = false;
  } catch (error) {
    console.error('Error loading data:', error);
    state.isLoading = false;
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
  initApp
};
