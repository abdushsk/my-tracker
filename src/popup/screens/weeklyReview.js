/**
 * Weekly Review Screen (US-072)
 * Shows a comprehensive summary of the user's weekly accomplishments
 */

import { state, SCREENS, SCREEN_IDS } from '../state.js';
import { escapeHtml } from '../utils/formatting.js';
import {
  GOAL_TYPES,
  isGoalCompleted,
  getTodayDateString,
  getWeekStartDateString,
  filterHistoryByDateRange,
  ACTIVITY_ACTIONS
} from '../../utils/models.js';
import { getHistory, getActivityLog } from '../../utils/storage.js';
import { renderDailyBreakdown, updateWeekComparison } from './weeklyReviewCharts.js';
import { getIcon } from '../utils/icons.js';

// =============================================================================
// Callback Registration
// =============================================================================

/**
 * Registered callbacks for cross-module communication
 */
const callbacks = {
  attachNavigationListeners: null,
  getDailyQuote: null
};

/**
 * Register callbacks from the main popup module
 * @param {Object} cbs - Callback functions
 */
export function registerWeeklyReviewCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

// =============================================================================
// Weekly Review Screen Rendering
// =============================================================================

/**
 * Render the Weekly Review screen
 * Shows a comprehensive summary of the user's weekly accomplishments
 */
export function renderWeeklyReviewScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.WEEKLY_REVIEW]);
  if (!screen) return;

  // Get current streak data
  const currentStreak = state.streakData?.currentStreak || 0;
  const bestStreak = state.streakData?.bestStreak || 0;

  screen.innerHTML = `
    <div class="weekly-review-screen">
      <header class="screen-header weekly-review-header">
        <button class="back-btn" data-screen="${SCREENS.REPORTS}" title="Back to Reports">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="back-icon">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
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
              <div class="streak-icon">${getIcon('flame', 20)}</div>
              <div class="streak-info">
                <span class="streak-value">${currentStreak}</span>
                <span class="streak-label">Current</span>
              </div>
            </div>
            <div class="streak-card-mini best">
              <div class="streak-icon">${getIcon('star', 20)}</div>
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

        <!-- US-077: Motivational Quote Section -->
        ${renderWeeklyReviewQuote()}
      </main>
    </div>
  `;

  // Attach navigation event listeners
  if (callbacks.attachNavigationListeners) {
    callbacks.attachNavigationListeners(screen);
  }

  // Update with calculated data
  updateWeeklyReviewStats();
}

/**
 * US-077: Render motivational quote section for weekly review
 * @returns {string} HTML string for the quote section, or empty string if disabled
 */
function renderWeeklyReviewQuote() {
  const quotesEnabled = state.settings?.quotesEnabled !== false;
  if (!quotesEnabled) {
    return '';
  }

  const quote = callbacks.getDailyQuote ? callbacks.getDailyQuote() : null;
  if (!quote) {
    return '';
  }

  return `
    <section class="weekly-review-section quote-section">
      <div class="weekly-review-quote">
        <div class="weekly-review-quote-icon">${getIcon('lightbulb', 24)}</div>
        <p class="weekly-review-quote-text">"${quote.text}"</p>
        ${quote.author ? `<span class="weekly-review-quote-author">— ${quote.author}</span>` : ''}
      </div>
    </section>
  `;
}

// =============================================================================
// Weekly Review Statistics Calculation
// =============================================================================

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
 * Calculate week completion statistics
 * @param {Array} history - History entries
 * @param {Array} currentGoals - Current goals array
 * @returns {Object} Object with completed and total counts
 */
function calculateWeekCompletionStats(history, currentGoals) {
  const weekStart = getWeekStartDateString();
  const today = getTodayDateString();
  const weekHistory = filterHistoryByDateRange(history, weekStart, today);

  // Filter out today from history (we'll use current goals for today)
  const historyWithoutToday = weekHistory.filter(entry => entry.date !== today);

  // Count from history
  let completed = historyWithoutToday.filter(entry => entry.completed).length;
  let total = historyWithoutToday.length;

  // Add today's data from current goals
  const todayCompleted = currentGoals.filter(goal => isGoalCompleted(goal)).length;
  completed += todayCompleted;
  total += currentGoals.length;

  return { completed, total };
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
    <span class="week-range-label">${getIcon('calendar', 14)} ${formatDate(startDate)} - ${formatDate(endDate)}</span>
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
 * Get the icon for a goal type
 * @param {string} type - Goal type (timer, counter, checkbox, avoidance)
 * @returns {string} SVG icon HTML
 */
function getGoalTypeIcon(type) {
  const icons = {
    [GOAL_TYPES.TIMER]: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    [GOAL_TYPES.COUNTER]: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    [GOAL_TYPES.CHECKBOX]: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    [GOAL_TYPES.AVOIDANCE]: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`
  };
  return icons[type] || icons[GOAL_TYPES.CHECKBOX];
}

/**
 * Get performance level class based on completion rate
 * @param {number} rate - Completion rate (0-100)
 * @returns {string} CSS class name
 */
function getPerformanceLevel(rate) {
  if (rate >= 80) return 'excellent';
  if (rate >= 60) return 'good';
  if (rate >= 40) return 'moderate';
  return 'low';
}

/**
 * Update the goal performance section with all goals and their performance metrics
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

  // Calculate rates for all goals
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

  // Sort by rate (descending)
  goalRates.sort((a, b) => b.rate - a.rate);

  // Calculate overall average for comparison
  const overallAverage = goalRates.length > 0
    ? goalRates.reduce((sum, g) => sum + g.rate, 0) / goalRates.length
    : 0;

  // Identify best and worst performers
  const bestGoalId = goalRates.length > 0 ? goalRates[0].goal.id : null;
  const worstGoalId = goalRates.length > 1 && goalRates[goalRates.length - 1].rate < goalRates[0].rate
    ? goalRates[goalRates.length - 1].goal.id
    : null;

  // Render all performance cards
  let html = '';

  if (goalRates.length === 0) {
    html = '<div class="no-performance-data">Not enough data for this week</div>';
  } else {
    html = '<div class="performance-list">';

    goalRates.forEach(({ goal, rate, completed, total }) => {
      const isBest = goal.id === bestGoalId;
      const isWorst = goal.id === worstGoalId;
      const performanceLevel = getPerformanceLevel(rate);
      const trendDiff = rate - overallAverage;
      const trendClass = trendDiff >= 5 ? 'above-average' : trendDiff <= -5 ? 'below-average' : 'average';

      // Determine badge
      let badge = '';
      if (isBest) {
        badge = `<span class="performance-badge best">${getIcon('trophy', 12)} Best</span>`;
      } else if (isWorst) {
        badge = `<span class="performance-badge needs">${getIcon('trending-up', 12)} Focus</span>`;
      }

      html += `
        <div class="performance-item ${isBest ? 'best-performer' : ''} ${isWorst ? 'needs-work' : ''}">
          <div class="performance-item-header">
            <div class="performance-goal-info">
              <span class="performance-type-icon type-${goal.type}">${getGoalTypeIcon(goal.type)}</span>
              <span class="performance-goal-title">${escapeHtml(goal.title)}</span>
            </div>
            ${badge}
          </div>
          <div class="performance-item-stats">
            <div class="performance-progress-container">
              <div class="performance-progress-bar">
                <div class="performance-progress-fill level-${performanceLevel}" style="width: ${rate}%"></div>
              </div>
              <span class="performance-rate-value level-${performanceLevel}">${Math.round(rate)}%</span>
            </div>
            <div class="performance-details-row">
              <span class="performance-detail">${completed}/${total} days</span>
              <span class="performance-trend ${trendClass}">
                ${trendDiff >= 5 ? getIcon('arrow-up', 10) : trendDiff <= -5 ? getIcon('arrow-down', 10) : getIcon('arrow-right', 10)}
                ${trendDiff >= 0 ? '+' : ''}${Math.round(trendDiff)}% vs avg
              </span>
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
  }

  performanceCardsEl.innerHTML = html;
}
