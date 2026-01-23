/**
 * View Goals Screen (US-001, US-015, US-056, US-065)
 * Main screen for viewing and interacting with goals
 */

import { state, SCREENS, SCREEN_IDS } from '../state.js';
import { renderGoalCard } from '../components/goalCard.js';
import { toggleTheme } from '../utils/theme.js';

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

  // Apply compact mode class to body if active
  document.body.classList.toggle('compact-mode', state.compactMode);

  screen.innerHTML = `
    <div class="view-goals-screen">
      ${!state.compactMode ? `
      <header class="screen-header main-screen-header">
        <h1 class="screen-title">Today</h1>
        <div class="header-actions">
          <button class="header-text-btn" data-screen="${SCREENS.MANAGE_GOALS}" title="Manage goals">Manage</button>
          <button class="compact-mode-btn" id="compact-mode-toggle" aria-label="Enter compact mode" title="Enter compact mode">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
              <polyline points="4 14 10 14 10 20"/>
              <polyline points="20 10 14 10 14 4"/>
              <line x1="14" y1="10" x2="21" y2="3"/>
              <line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </button>
          <button class="theme-toggle-btn" id="theme-toggle" aria-label="Toggle theme" title="Toggle theme">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
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
          </button>
        </div>
      </header>
      ` : ''}
      ${renderCategoryFilterBar(state.compactMode)}
      <main class="goals-list-container">
        ${state.goals.length === 0 ? renderEmptyState() : renderGoalsList()}
      </main>
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

  // US-065: Attach category filter listeners
  attachCategoryFilterListeners(screen);

  // Attach theme toggle listener
  attachThemeToggleListener(screen);

  // Attach compact mode toggle listener
  attachCompactModeToggleListener(screen);

  // Start timer update interval if there are active timers
  if (Object.keys(state.activeTimers).length > 0 && callbacks.startTimerUpdateInterval) {
    callbacks.startTimerUpdateInterval();
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * US-065: Render category filter bar
 * @param {boolean} compactMode - Whether compact mode is active
 * @returns {string} HTML string for category filter bar
 */
function renderCategoryFilterBar(compactMode = false) {
  // In compact mode, always show the bar (for the expand button)
  // In normal mode, only show if there are goals with categories
  const hasGoalsWithCategories = state.goals.some(goal => goal.category);
  const showCategoryFilters = hasGoalsWithCategories || state.categoryFilter !== 'all';

  if (!compactMode && !showCategoryFilters) {
    return ''; // Don't show filter bar if no goals have categories
  }

  const activeFilter = state.categoryFilter || 'all';

  // Expand button for compact mode
  const expandButton = compactMode ? `
    <button class="compact-mode-btn active" id="compact-mode-toggle" aria-label="Exit compact mode" title="Exit compact mode">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
        <polyline points="15 3 21 3 21 9"/>
        <polyline points="9 21 3 21 3 15"/>
        <line x1="21" y1="3" x2="14" y2="10"/>
        <line x1="3" y1="21" x2="10" y2="14"/>
      </svg>
    </button>
  ` : '';

  // Category filter chips (only show if there are categories)
  // In compact mode, show only colored dots for categories (except "All")
  const filterChips = showCategoryFilters ? `
    <div class="filter-chips ${compactMode ? 'compact-chips' : ''}">
      <button class="category-filter-chip ${activeFilter === 'all' ? 'active' : ''}" data-category="all">
        All
      </button>
      ${state.categories.map(cat => `
        <button class="category-filter-chip ${compactMode ? 'dot-only' : ''} ${activeFilter === cat.id ? 'active' : ''}" data-category="${cat.id}" ${compactMode ? `data-tooltip="${cat.name}"` : ''}>
          <span class="filter-dot" style="background-color: ${cat.color}"></span>
          ${compactMode ? '' : cat.name}
        </button>
      `).join('')}
    </div>
  ` : '<div class="filter-chips"></div>';

  return `
    <div class="category-filter-bar ${compactMode ? 'compact-mode-bar' : ''}" role="group" aria-label="${compactMode ? 'Compact mode toolbar' : 'Filter by category'}">
      ${filterChips}
      ${expandButton}
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

  // Show empty message if no goals match the filter
  if (sortedGoals.length === 0 && state.categoryFilter !== 'all') {
    return `
      <div class="goals-list compact-view">
        <div class="empty-filter-state">
          <p class="empty-filter-message">No goals in this category</p>
        </div>
      </div>
    `;
  }

  // Always use compact view
  return `
    <div class="goals-list compact-view">
      ${sortedGoals.map(goal => renderGoalCard(goal)).join('')}
    </div>
  `;
}

// =============================================================================
// Event Listeners
// =============================================================================

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

/**
 * Attach theme toggle listener
 * @param {HTMLElement} container - The screen container
 */
function attachThemeToggleListener(container) {
  const toggleBtn = container.querySelector('#theme-toggle');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    toggleTheme();
  });
}

/**
 * Attach compact mode toggle listener
 * @param {HTMLElement} container - The screen container
 */
function attachCompactModeToggleListener(container) {
  const toggleBtn = container.querySelector('#compact-mode-toggle');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    state.compactMode = !state.compactMode;

    // Save compact mode preference to localStorage
    localStorage.setItem('compactMode', JSON.stringify(state.compactMode));

    // Re-render to apply changes
    renderViewGoalsScreen();
  });
}

/**
 * Load compact mode state from localStorage on startup
 */
export function loadCompactModeState() {
  const saved = localStorage.getItem('compactMode');
  if (saved !== null) {
    state.compactMode = JSON.parse(saved);
  }
}
