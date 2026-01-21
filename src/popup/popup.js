/**
 * Popup JavaScript Entry Point
 * Main entry point for the Daily Goals Tracker Chrome extension popup
 */

// =============================================================================
// Imports
// =============================================================================

import { getGoals, getSettings, getActiveTimers } from '../utils/storage.js';
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

  // Placeholder content - will be enhanced in subsequent user stories
  screen.innerHTML = `
    <div class="view-goals-screen">
      <header class="screen-header">
        <h1>Daily Goals</h1>
        <div class="quick-stats">
          <span class="completed-count">${getCompletedCount()}/${state.goals.length} completed</span>
        </div>
      </header>
      <main class="goals-list-container">
        ${state.goals.length === 0 ? renderEmptyState() : renderGoalsList()}
      </main>
      <footer class="screen-footer">
        <button class="nav-btn" data-screen="${SCREENS.MANAGE_GOALS}">
          <span class="nav-icon">&#9881;</span>
          Manage Goals
        </button>
        <button class="nav-btn" data-screen="${SCREENS.REPORTS}">
          <span class="nav-icon">&#128202;</span>
          Reports
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
      <div class="empty-icon">&#127919;</div>
      <p class="empty-message">No goals yet</p>
      <p class="empty-submessage">Start tracking your progress!</p>
      <button class="btn btn-primary add-first-goal" data-screen="${SCREENS.MANAGE_GOALS}">
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
  // Placeholder - will be fully implemented in US-015 (Goal Card component)
  return `
    <div class="goals-list">
      ${state.goals.map(goal => `
        <div class="goal-card" data-goal-id="${goal.id}">
          <div class="goal-title">${goal.title}</div>
          <div class="goal-type">${goal.type}</div>
          <div class="goal-progress">${goal.progress}/${goal.target}</div>
        </div>
      `).join('')}
    </div>
  `;
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

    // Load goals, settings, and active timers in parallel
    const [goals, settings, activeTimers] = await Promise.all([
      getGoals(),
      getSettings(),
      getActiveTimers()
    ]);

    // Update state
    state.goals = goals;
    state.settings = settings;
    state.activeTimers = activeTimers;

    console.log('Data loaded:', {
      goalsCount: goals.length,
      settings: settings,
      activeTimersCount: Object.keys(activeTimers).length
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
