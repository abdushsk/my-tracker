/**
 * View Goals Screen (US-001, US-015, US-056, US-065)
 * Main screen for viewing and interacting with goals
 */

import { state, SCREENS, SCREEN_IDS } from '../state.js';
import { isGoalCompleted } from '../../utils/models.js';
import { saveSettings } from '../../utils/storage.js';
import { getDailyQuote, renderQuoteHTML } from '../../utils/quotes.js';
import { getLevelTitle, getLevelProgress } from '../features/xpLevels.js';
import { renderDailyChallengeCard, attachDailyChallengeListeners } from '../features/dailyChallenges.js';
import { renderQuickAddFAB, attachQuickAddFABListeners } from './quickAdd.js';
import { renderGoalCard } from '../components/goalCard.js';

// =============================================================================
// Callback Registration
// =============================================================================

/**
 * Registered callbacks for cross-module communication
 */
const callbacks = {
  attachNavigationListeners: null,
  attachGoalControlListeners: null,
  startTimerUpdateInterval: null
};

/**
 * Register callbacks from the main popup module
 * @param {Object} cbs - Callback functions
 */
export function registerViewGoalsCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// =============================================================================
// View Goals Screen Rendering
// =============================================================================

/**
 * Render the View Goals screen
 * Main screen showing all goals with progress controls
 */
export function renderViewGoalsScreen() {
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
  if (callbacks.attachNavigationListeners) {
    callbacks.attachNavigationListeners(screen);
  }

  // Attach goal control listeners (timer play/pause, etc.)
  if (callbacks.attachGoalControlListeners) {
    callbacks.attachGoalControlListeners(screen);
  }

  // US-056: Attach compact view toggle listener
  attachCompactViewToggleListener(screen);

  // US-065: Attach category filter listeners
  attachCategoryFilterListeners(screen);

  // US-068: Attach quick add FAB listeners
  attachQuickAddFABListeners(screen);

  // US-081: Attach daily challenge listeners
  attachDailyChallengeListeners(screen);

  // Start timer update interval if there are active timers
  if (Object.keys(state.activeTimers).length > 0 && callbacks.startTimerUpdateInterval) {
    callbacks.startTimerUpdateInterval();
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

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
// Event Listeners
// =============================================================================

/**
 * US-056: Attach compact view toggle listener
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
