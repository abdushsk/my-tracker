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
  groupHistoryByDate
} from '../../utils/models.js';
import { ACTIVITY_ACTIONS } from '../../utils/activity.js';
import { getHistory, getActivityLog } from '../../utils/storage.js';

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
        <button class="back-btn" data-screen="${SCREENS.REPORTS}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="back-icon">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span class="back-label">Back</span>
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
              <div class="streak-icon">🔥</div>
              <div class="streak-info">
                <span class="streak-value">${currentStreak}</span>
                <span class="streak-label">Current</span>
              </div>
            </div>
            <div class="streak-card-mini best">
              <div class="streak-icon">⭐</div>
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
        <div class="weekly-review-quote-icon">&#128161;</div>
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
    <span class="week-range-label">📅 ${formatDate(startDate)} - ${formatDate(endDate)}</span>
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
 * Update the goal performance section with best and worst performing goals
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

  // Calculate rates and find best/worst
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

  // Sort by rate
  goalRates.sort((a, b) => b.rate - a.rate);

  // Get best and worst performers
  const bestGoal = goalRates[0];
  const worstGoal = goalRates.length > 1 ? goalRates[goalRates.length - 1] : null;

  // Render performance cards
  let html = '';

  if (bestGoal) {
    html += `
      <div class="performance-card best-performer">
        <div class="performance-header">
          <span class="performance-badge best">🏆 Best</span>
        </div>
        <div class="performance-goal-title">${escapeHtml(bestGoal.goal.title)}</div>
        <div class="performance-rate">${Math.round(bestGoal.rate)}% completion</div>
        <div class="performance-detail">${bestGoal.completed}/${bestGoal.total} completed</div>
      </div>
    `;
  }

  if (worstGoal && worstGoal.rate < bestGoal.rate) {
    html += `
      <div class="performance-card needs-work">
        <div class="performance-header">
          <span class="performance-badge needs">📈 Needs Focus</span>
        </div>
        <div class="performance-goal-title">${escapeHtml(worstGoal.goal.title)}</div>
        <div class="performance-rate">${Math.round(worstGoal.rate)}% completion</div>
        <div class="performance-detail">${worstGoal.completed}/${worstGoal.total} completed</div>
      </div>
    `;
  }

  if (!html) {
    html = '<div class="no-performance-data">Not enough data for this week</div>';
  }

  performanceCardsEl.innerHTML = html;
}

/**
 * Render the daily breakdown chart for the week
 * @param {Array} history - History entries
 * @param {Array} currentGoals - Current goals array
 */
function renderDailyBreakdown(history, currentGoals) {
  const breakdownEl = document.getElementById('daily-breakdown');
  if (!breakdownEl) return;

  const today = getTodayDateString();
  const historyByDate = groupHistoryByDate(history);

  // Get data for last 7 days (Mon-Sun of current week)
  const weekStart = getWeekStartDateString();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  let html = '<div class="breakdown-bars">';

  // Generate 7 days from week start
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart + 'T00:00:00');
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const isFuture = dateStr > today;
    const isToday = dateStr === today;

    let completed = 0;
    let total = 0;
    let percentage = 0;

    if (isToday) {
      // Use current goals for today
      total = currentGoals.length;
      completed = currentGoals.filter(goal => isGoalCompleted(goal)).length;
    } else if (!isFuture) {
      // Use history for past days
      const dayHistory = historyByDate[dateStr] || [];
      total = dayHistory.length;
      completed = dayHistory.filter(entry => entry.completed).length;
    }

    percentage = total > 0 ? (completed / total) * 100 : 0;

    // Determine bar color class
    let barColorClass = 'bar-empty';
    if (!isFuture && total > 0) {
      if (percentage >= 80) {
        barColorClass = 'bar-excellent';
      } else if (percentage >= 50) {
        barColorClass = 'bar-good';
      } else if (percentage > 0) {
        barColorClass = 'bar-low';
      }
    }

    html += `
      <div class="breakdown-day ${isToday ? 'is-today' : ''} ${isFuture ? 'is-future' : ''}">
        <div class="breakdown-bar-wrapper">
          <div class="breakdown-bar ${barColorClass}" style="height: ${percentage}%"></div>
        </div>
        <span class="breakdown-label">${dayNames[i]}</span>
        ${!isFuture ? `<span class="breakdown-value">${Math.round(percentage)}%</span>` : ''}
      </div>
    `;
  }

  html += '</div>';
  breakdownEl.innerHTML = html;
}

/**
 * Update the week-over-week comparison
 * @param {Array} history - History entries
 */
function updateWeekComparison(history) {
  const comparisonCardEl = document.getElementById('comparison-card');
  if (!comparisonCardEl) return;

  // Calculate this week's stats
  const today = getTodayDateString();
  const thisWeekStart = getWeekStartDateString();
  const thisWeekHistory = filterHistoryByDateRange(history, thisWeekStart, today);
  const thisWeekPast = thisWeekHistory.filter(entry => entry.date !== today);

  let thisWeekCompleted = thisWeekPast.filter(entry => entry.completed).length;
  let thisWeekTotal = thisWeekPast.length;

  // Add today's data from current goals
  const todayCompleted = state.goals.filter(goal => isGoalCompleted(goal)).length;
  thisWeekCompleted += todayCompleted;
  thisWeekTotal += state.goals.length;

  // Calculate previous week's stats
  const prevWeekStart = new Date(thisWeekStart + 'T00:00:00');
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0];

  const prevWeekEnd = new Date(thisWeekStart + 'T00:00:00');
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
  const prevWeekEndStr = prevWeekEnd.toISOString().split('T')[0];

  const prevWeekHistory = filterHistoryByDateRange(history, prevWeekStartStr, prevWeekEndStr);
  const prevWeekCompleted = prevWeekHistory.filter(entry => entry.completed).length;
  const prevWeekTotal = prevWeekHistory.length;

  // Calculate rates
  const thisWeekRate = thisWeekTotal > 0 ? (thisWeekCompleted / thisWeekTotal) * 100 : 0;
  const prevWeekRate = prevWeekTotal > 0 ? (prevWeekCompleted / prevWeekTotal) * 100 : 0;

  // Calculate difference
  const rateDiff = thisWeekRate - prevWeekRate;
  const isImproved = rateDiff > 0;
  const isDeclined = rateDiff < 0;

  let comparisonHtml = '';

  if (prevWeekTotal === 0) {
    comparisonHtml = `
      <div class="comparison-content">
        <div class="comparison-message">No data from previous week</div>
      </div>
    `;
  } else {
    const diffIcon = isImproved ? '📈' : isDeclined ? '📉' : '➡️';
    const diffClass = isImproved ? 'improved' : isDeclined ? 'declined' : 'same';
    const diffText = isImproved
      ? `+${Math.round(Math.abs(rateDiff))}% improvement`
      : isDeclined
        ? `-${Math.round(Math.abs(rateDiff))}% from last week`
        : 'Same as last week';

    comparisonHtml = `
      <div class="comparison-content">
        <div class="comparison-icon">${diffIcon}</div>
        <div class="comparison-stats">
          <div class="comparison-diff ${diffClass}">${diffText}</div>
          <div class="comparison-detail">
            This week: ${Math.round(thisWeekRate)}% vs Last week: ${Math.round(prevWeekRate)}%
          </div>
        </div>
      </div>
    `;
  }

  comparisonCardEl.innerHTML = comparisonHtml;
}
