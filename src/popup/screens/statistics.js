/**
 * Goal Statistics Screen (US-071)
 * Shows detailed statistics for individual goals
 */

import { state, SCREENS, SCREEN_IDS } from '../state.js';
import { escapeHtml } from '../utils/formatting.js';
import {
  isGoalCompleted,
  getTodayDateString,
  filterHistoryByGoalId
} from '../../utils/models.js';
import { getHistory } from '../../utils/storage.js';
import { renderGoal30DayChart } from './statisticsChart.js';

// =============================================================================
// Callback Registration
// =============================================================================

/**
 * Registered callbacks for cross-module communication
 */
const callbacks = {
  showScreen: null,
  attachNavigationListeners: null,
  getGoalTypeIcon: null,
  capitalizeFirst: null
};

/**
 * Register callbacks from the main popup module
 * @param {Object} cbs - Callback functions
 */
export function registerStatisticsCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// =============================================================================
// Statistics Screen Navigation
// =============================================================================

/**
 * Open the Goal Statistics screen for a specific goal
 * @param {string} goalId - The ID of the goal to view statistics for
 */
export function openGoalStatistics(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) {
    console.error('[GoalStatistics] Goal not found:', goalId);
    return;
  }

  state.statisticsGoalId = goalId;
  if (callbacks.showScreen) {
    callbacks.showScreen(SCREENS.GOAL_STATISTICS);
  }
  console.log('[GoalStatistics] Viewing statistics for goal:', goal.title);
}

// =============================================================================
// Statistics Screen Rendering
// =============================================================================

/**
 * Render the Goal Statistics screen
 * Shows detailed statistics for a single goal
 */
export function renderGoalStatisticsScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.GOAL_STATISTICS]);
  if (!screen) return;

  const goal = state.goals.find(g => g.id === state.statisticsGoalId);
  if (!goal) {
    console.error('[GoalStatistics] Goal not found for statistics, returning to view goals');
    if (callbacks.showScreen) {
      callbacks.showScreen(SCREENS.VIEW_GOALS);
    }
    return;
  }

  const typeIcon = callbacks.getGoalTypeIcon ? callbacks.getGoalTypeIcon(goal.type) : '';
  const categoryInfo = goal.category ? state.categories.find(c => c.id === goal.category) : null;
  const timeframeLabel = callbacks.capitalizeFirst ? callbacks.capitalizeFirst(goal.timeframe) : goal.timeframe;

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
              <span class="goal-timeframe-badge timeframe-${goal.timeframe}">${timeframeLabel}</span>
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
  if (callbacks.attachNavigationListeners) {
    callbacks.attachNavigationListeners(screen);
  }

  // Update stats with calculated data
  updateGoalStatistics(goal.id);
}

// =============================================================================
// Statistics Calculation and Display
// =============================================================================

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
