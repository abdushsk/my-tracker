/**
 * Reports Screen Module
 * US-043: Reports Screen Layout
 * US-044: Discipline Score
 * US-045: Streak Counter
 * US-046: Completion Stats (Today, Week, Month)
 * US-047: Weekly Chart
 * US-049: Activity Timeline Heatmap
 */

import { state, SCREENS, SCREEN_IDS } from '../state.js';
import {
  getHistory,
  getStreakData,
  saveStreakData,
  getActivityLog
} from '../../utils/storage.js';
import {
  getTodayDateString,
  getDateStringDaysAgo,
  getWeekStartDateString,
  getMonthStartDateString,
  filterHistoryByDateRange,
  groupHistoryByDate
} from '../../utils/history.js';
import { getActivityByHourForDateRange } from '../../utils/activityLog.js';
import { isGoalCompleted } from '../../utils/goalUtils.js';
import { renderChallengeStatsSection } from '../features/dailyChallenges.js';
import { checkAchievements } from '../features/achievements.js';

// Callbacks to be registered from popup.js
let callbacks = {
  attachNavigationListeners: null,
  attachShareReportsListeners: null
};

/**
 * Register callbacks from popup.js
 * @param {Object} cbs - Object containing callback functions
 */
export function registerReportsCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

/**
 * Render the Reports screen
 * US-043: Reports Screen Layout
 */
export function renderReportsScreen() {
  const screen = document.getElementById(SCREEN_IDS[SCREENS.REPORTS]);
  if (!screen) return;

  // Get current streak data from state
  const currentStreak = state.streakData?.currentStreak || 0;
  const bestStreak = state.streakData?.bestStreak || 0;

  // US-043: Full Reports Screen Layout with all sections
  screen.innerHTML = `
    <div class="reports-screen">
      <header class="screen-header reports-header">
        <button class="back-btn" data-screen="${SCREENS.VIEW_GOALS}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="back-icon">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span class="back-label">Back</span>
        </button>
        <h1 class="reports-title">Reports</h1>
        <button class="share-reports-btn" data-action="share-reports" title="Share progress">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </header>
      <main class="reports-content">
        <!-- Discipline Score Section - Prominent display -->
        <section class="reports-section discipline-section">
          <div class="discipline-score-card">
            <div class="discipline-score-display">
              <span class="discipline-score-value" id="discipline-score-value">--</span>
              <span class="discipline-score-max">/100</span>
            </div>
            <div class="discipline-score-label">Discipline Score</div>
            <div class="discipline-score-description">Based on last 7 days</div>
          </div>
        </section>

        <!-- Streak Section -->
        <section class="reports-section streak-section">
          <div class="streak-cards">
            <div class="streak-card current-streak-card ${currentStreak > 0 ? 'active' : ''}">
              <div class="streak-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                </svg>
              </div>
              <div class="streak-info">
                <span class="streak-value" id="current-streak-value">${currentStreak}</span>
                <span class="streak-label">day streak</span>
              </div>
            </div>
            <div class="streak-card best-streak-card">
              <div class="streak-icon best">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <div class="streak-info">
                <span class="streak-value" id="best-streak-value">${bestStreak}</span>
                <span class="streak-label">best streak</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Stats Cards Section -->
        <section class="reports-section stats-section">
          <h2 class="section-title">Completion Stats</h2>
          <div class="stats-cards">
            <div class="stat-card">
              <div class="stat-card-icon today-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
              </div>
              <div class="stat-card-content">
                <span class="stat-card-value" id="today-completed">--/--</span>
                <span class="stat-card-label">Today</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon week-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div class="stat-card-content">
                <span class="stat-card-value" id="week-completed">--/--</span>
                <span class="stat-card-label">This Week</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon month-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div class="stat-card-content">
                <span class="stat-card-value" id="month-completed">--/--</span>
                <span class="stat-card-label">This Month</span>
              </div>
            </div>
          </div>
        </section>

        <!-- US-047: Weekly Chart Section -->
        <section class="reports-section charts-section">
          <h2 class="section-title">Weekly Overview</h2>
          <div class="weekly-chart" id="weekly-chart-container">
            <div class="chart-bars" id="chart-bars">
              <!-- Bars will be rendered dynamically -->
            </div>
            <div class="chart-labels" id="chart-labels">
              <!-- Day labels will be rendered dynamically -->
            </div>
          </div>
        </section>

        <!-- US-049: Activity Timeline Heatmap Section -->
        <section class="reports-section heatmap-section">
          <h2 class="section-title">Activity Timeline</h2>
          <div class="activity-heatmap" id="activity-heatmap">
            <div class="heatmap-container">
              <div class="heatmap-hour-labels" id="heatmap-hour-labels">
                <!-- Hour labels will be rendered dynamically -->
              </div>
              <div class="heatmap-grid-wrapper">
                <div class="heatmap-day-labels" id="heatmap-day-labels">
                  <!-- Day labels will be rendered dynamically -->
                </div>
                <div class="heatmap-grid" id="heatmap-grid">
                  <!-- Heatmap cells will be rendered dynamically -->
                </div>
              </div>
            </div>
            <div class="heatmap-legend" id="heatmap-legend">
              <span class="legend-label">Less</span>
              <div class="legend-scale">
                <div class="legend-cell level-0"></div>
                <div class="legend-cell level-1"></div>
                <div class="legend-cell level-2"></div>
                <div class="legend-cell level-3"></div>
                <div class="legend-cell level-4"></div>
              </div>
              <span class="legend-label">More</span>
            </div>
          </div>
        </section>

        <!-- US-072: Weekly Review Navigation -->
        <section class="reports-section weekly-review-nav-section">
          <button class="weekly-review-nav-btn" data-screen="${SCREENS.WEEKLY_REVIEW}">
            <div class="weekly-review-nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <polyline points="9 16 12 13 15 16"/>
              </svg>
            </div>
            <div class="weekly-review-nav-content">
              <span class="weekly-review-nav-title">Weekly Review</span>
              <span class="weekly-review-nav-desc">See your weekly summary and achievements</span>
            </div>
            <div class="weekly-review-nav-arrow">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </button>
        </section>

        <!-- US-080: Achievements Navigation -->
        <section class="reports-section achievements-nav-section">
          <button class="achievements-nav-btn" data-screen="${SCREENS.ACHIEVEMENTS}">
            <div class="achievements-nav-icon">🏆</div>
            <div class="achievements-nav-content">
              <span class="achievements-nav-title">Achievements</span>
              <span class="achievements-nav-desc">View all badges and milestones</span>
            </div>
            <div class="achievements-nav-arrow">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </button>
        </section>

        <!-- US-081: Daily Challenges Stats -->
        ${renderChallengeStatsSection()}
      </main>
    </div>
  `;

  // Attach navigation event listeners
  if (callbacks.attachNavigationListeners) {
    callbacks.attachNavigationListeners(screen);
  }

  // US-082: Attach share button listener
  if (callbacks.attachShareReportsListeners) {
    callbacks.attachShareReportsListeners(screen);
  }

  // Update stats with current data
  updateReportsStats();
}

/**
 * Update the reports screen with calculated statistics
 * US-044: Implements discipline score calculation and display
 * US-046: Implements completion stats cards (Today, This Week, This Month)
 */
export async function updateReportsStats() {
  // Get history data for week/month calculations
  const history = await getHistory();

  // Get today's completion count from current goals
  const totalGoals = state.goals.length;
  const completedGoals = state.goals.filter(goal => isGoalCompleted(goal)).length;

  // Update Today's stat (from current goal data)
  const todayCompletedEl = document.getElementById('today-completed');
  if (todayCompletedEl) {
    todayCompletedEl.textContent = `${completedGoals}/${totalGoals}`;
  }

  // US-046: Calculate week and month completion stats
  const weekStats = calculateWeekCompletionStats(history, state.goals);
  const monthStats = calculateMonthCompletionStats(history, state.goals);

  const weekCompletedEl = document.getElementById('week-completed');
  if (weekCompletedEl) {
    weekCompletedEl.textContent = `${weekStats.completed}/${weekStats.total}`;
  }

  const monthCompletedEl = document.getElementById('month-completed');
  if (monthCompletedEl) {
    monthCompletedEl.textContent = `${monthStats.completed}/${monthStats.total}`;
  }

  // US-044: Calculate and display discipline score
  await updateDisciplineScore();

  // US-045: Calculate and display streak data
  await updateStreakDisplay();

  // US-047: Render weekly chart
  renderWeeklyChart(history, state.goals);

  // US-049: Render activity heatmap
  await renderActivityHeatmap();
}

/**
 * Calculate and display the discipline score
 * US-044: Discipline Score Implementation
 *
 * Formula: (completed goals / total goals) * 100 averaged over last 7 days
 * Color coding: green (>80), yellow (>50), red (<50)
 */
async function updateDisciplineScore() {
  const disciplineScoreEl = document.getElementById('discipline-score-value');
  if (!disciplineScoreEl) return;

  // Get history data
  const history = await getHistory();

  // Calculate score based on last 7 days
  const score = calculateDisciplineScore(history, state.goals);

  // Update the display
  disciplineScoreEl.textContent = score === null ? '--' : Math.round(score);

  // Apply color coding
  // Remove any existing score classes
  disciplineScoreEl.classList.remove(
    'score-excellent',
    'score-good',
    'score-moderate',
    'score-needs-improvement'
  );

  // Apply appropriate color class based on score
  // Color coding per US-044: green (>80), yellow (>50), red (<50)
  if (score !== null) {
    if (score > 80) {
      disciplineScoreEl.classList.add('score-excellent'); // green
    } else if (score > 50) {
      disciplineScoreEl.classList.add('score-moderate'); // yellow/warning
    } else {
      disciplineScoreEl.classList.add('score-needs-improvement'); // red
    }
  }
}

/**
 * Calculate the discipline score from history data
 * US-044: Score calculation logic
 *
 * @param {Array} history - Array of history entries
 * @param {Array} currentGoals - Current goals array (used for today's data)
 * @returns {number|null} The discipline score (0-100) or null if insufficient data
 */
function calculateDisciplineScore(history, currentGoals) {
  const today = getTodayDateString();
  const sevenDaysAgo = getDateStringDaysAgo(6); // 6 days ago + today = 7 days

  // Get history for the last 7 days (excluding today which we'll calculate from current goals)
  const last7DaysHistory = filterHistoryByDateRange(history, sevenDaysAgo, today);

  // Group history by date
  const historyByDate = groupHistoryByDate(last7DaysHistory);

  // Calculate daily completion rates
  const dailyRates = [];

  // Process historical days (past 6 days)
  for (let i = 6; i >= 1; i--) {
    const dateStr = getDateStringDaysAgo(i);
    const dayEntries = historyByDate[dateStr] || [];

    if (dayEntries.length > 0) {
      const completedCount = dayEntries.filter(entry => entry.completed).length;
      const totalCount = dayEntries.length;
      const rate = (completedCount / totalCount) * 100;
      dailyRates.push(rate);
    }
    // If no history for a day, we don't include it in the calculation
    // This avoids penalizing users for days before they started using the extension
  }

  // Add today's completion rate from current goals
  if (currentGoals.length > 0) {
    const todayCompleted = currentGoals.filter(goal => isGoalCompleted(goal)).length;
    const todayRate = (todayCompleted / currentGoals.length) * 100;
    dailyRates.push(todayRate);
  }

  // If we have no data at all, return null
  if (dailyRates.length === 0) {
    return null;
  }

  // Calculate average
  const averageScore = dailyRates.reduce((sum, rate) => sum + rate, 0) / dailyRates.length;

  return averageScore;
}

/**
 * Calculate completion stats for the current week
 * US-046: Week completion stats calculation
 *
 * Counts total goals completed vs total goals from Monday to today
 * Combines history data (past days this week) with current goals (today)
 *
 * @param {Array} history - Array of history entries
 * @param {Array} currentGoals - Current goals array (for today's data)
 * @returns {Object} Object with completed and total counts
 */
function calculateWeekCompletionStats(history, currentGoals) {
  const today = getTodayDateString();
  const weekStart = getWeekStartDateString();

  // Get history for this week (excluding today)
  const weekHistory = filterHistoryByDateRange(history, weekStart, today);

  // Filter out today's history entries since we use currentGoals for today
  const pastDaysHistory = weekHistory.filter(entry => entry.date !== today);

  // Count completed and total from past days this week
  let completed = pastDaysHistory.filter(entry => entry.completed).length;
  let total = pastDaysHistory.length;

  // Add today's stats from current goals
  const todayCompleted = currentGoals.filter(goal => isGoalCompleted(goal)).length;
  completed += todayCompleted;
  total += currentGoals.length;

  return { completed, total };
}

/**
 * Calculate completion stats for the current month
 * US-046: Month completion stats calculation
 *
 * Counts total goals completed vs total goals from 1st of month to today
 * Combines history data (past days this month) with current goals (today)
 *
 * @param {Array} history - Array of history entries
 * @param {Array} currentGoals - Current goals array (for today's data)
 * @returns {Object} Object with completed and total counts
 */
function calculateMonthCompletionStats(history, currentGoals) {
  const today = getTodayDateString();
  const monthStart = getMonthStartDateString();

  // Get history for this month (excluding today)
  const monthHistory = filterHistoryByDateRange(history, monthStart, today);

  // Filter out today's history entries since we use currentGoals for today
  const pastDaysHistory = monthHistory.filter(entry => entry.date !== today);

  // Count completed and total from past days this month
  let completed = pastDaysHistory.filter(entry => entry.completed).length;
  let total = pastDaysHistory.length;

  // Add today's stats from current goals
  const todayCompleted = currentGoals.filter(goal => isGoalCompleted(goal)).length;
  completed += todayCompleted;
  total += currentGoals.length;

  return { completed, total };
}

/**
 * Render the weekly chart showing completion rates for the last 7 days
 * US-047: Weekly Chart Implementation
 *
 * @param {Array} history - Array of history entries
 * @param {Array} currentGoals - Current goals array (for today's data)
 */
function renderWeeklyChart(history, currentGoals) {
  const chartBarsContainer = document.getElementById('chart-bars');
  const chartLabelsContainer = document.getElementById('chart-labels');

  if (!chartBarsContainer || !chartLabelsContainer) return;

  // Calculate chart data for last 7 days
  const chartData = calculateWeeklyChartData(history, currentGoals);

  // Day abbreviations (Mon-Sun)
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Clear existing content
  chartBarsContainer.innerHTML = '';
  chartLabelsContainer.innerHTML = '';

  // Render bars and labels
  chartData.forEach((dayData, index) => {
    // Create bar container
    const barContainer = document.createElement('div');
    barContainer.className = 'chart-bar-container';

    // Create the bar
    const bar = document.createElement('div');
    bar.className = 'chart-bar';

    // Apply color class based on percentage
    if (dayData.percentage === 0) {
      bar.classList.add('chart-bar-empty');
    } else if (dayData.percentage >= 80) {
      bar.classList.add('chart-bar-excellent');
    } else if (dayData.percentage >= 50) {
      bar.classList.add('chart-bar-moderate');
    } else {
      bar.classList.add('chart-bar-low');
    }

    // Set bar height based on percentage (minimum 4px for visibility)
    const barHeight = dayData.percentage > 0 ? Math.max(4, dayData.percentage) : 0;
    bar.style.height = `${barHeight}%`;

    // Add tooltip with details
    bar.setAttribute('title', `${dayData.completed}/${dayData.total} completed (${Math.round(dayData.percentage)}%)`);
    bar.setAttribute('data-percentage', Math.round(dayData.percentage));

    barContainer.appendChild(bar);
    chartBarsContainer.appendChild(barContainer);

    // Create label
    const label = document.createElement('span');
    label.className = 'chart-label';
    label.textContent = dayNames[dayData.dayOfWeek];

    // Mark today's label
    if (dayData.isToday) {
      label.classList.add('chart-label-today');
    }

    chartLabelsContainer.appendChild(label);
  });
}

/**
 * Calculate chart data for the last 7 days
 * US-047: Data calculation for weekly chart
 *
 * @param {Array} history - Array of history entries
 * @param {Array} currentGoals - Current goals array (for today's data)
 * @returns {Array} Array of objects with completed, total, percentage, dayOfWeek, isToday
 */
function calculateWeeklyChartData(history, currentGoals) {
  const today = getTodayDateString();
  const chartData = [];

  // Group history by date for efficient lookup
  const historyByDate = groupHistoryByDate(history);

  // Get data for last 7 days (starting from 6 days ago to today)
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1; // Convert to Mon=0, Sun=6

    let completed = 0;
    let total = 0;

    if (dateStr === today) {
      // Use current goals for today
      total = currentGoals.length;
      completed = currentGoals.filter(goal => isGoalCompleted(goal)).length;
    } else {
      // Use history for past days
      const dayHistory = historyByDate[dateStr] || [];
      total = dayHistory.length;
      completed = dayHistory.filter(entry => entry.completed).length;
    }

    const percentage = total > 0 ? (completed / total) * 100 : 0;

    chartData.push({
      date: dateStr,
      dayOfWeek,
      completed,
      total,
      percentage,
      isToday: dateStr === today
    });
  }

  return chartData;
}

/**
 * Render the activity heatmap showing when user worked on goals
 * US-049: Activity Timeline - Heatmap
 *
 * Display grid: rows = days (last 7), columns = hours (0-23)
 * Cell color intensity = activity level
 * Focus on timer goals showing when user worked
 */
async function renderActivityHeatmap() {
  const gridContainer = document.getElementById('heatmap-grid');
  const hourLabelsContainer = document.getElementById('heatmap-hour-labels');
  const dayLabelsContainer = document.getElementById('heatmap-day-labels');

  if (!gridContainer || !hourLabelsContainer || !dayLabelsContainer) return;

  // Get activity log data
  const activityLog = await getActivityLog();

  // Calculate date range (last 7 days)
  const today = getTodayDateString();
  const startDate = getDateStringDaysAgo(6);

  // Get activity data grouped by date and hour
  const activityByDateAndHour = getActivityByHourForDateRange(activityLog, null, startDate, today);

  // Find max activity for normalization (for color intensity)
  let maxActivity = 0;
  Object.values(activityByDateAndHour).forEach(dayData => {
    dayData.forEach(hourData => {
      // For timer goals, use duration; for others, use count
      const activityLevel = hourData.duration > 0 ? hourData.duration / 60 : hourData.count;
      if (activityLevel > maxActivity) {
        maxActivity = activityLevel;
      }
    });
  });

  // Render hour labels (showing every 3rd hour for compact display)
  const hourLabels = [0, 3, 6, 9, 12, 15, 18, 21];
  hourLabelsContainer.innerHTML = hourLabels.map(hour => {
    const displayHour = hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`;
    return `<span class="heatmap-hour-label" style="grid-column: ${hour + 1}">${displayHour}</span>`;
  }).join('');

  // Generate list of dates for last 7 days (oldest to newest)
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    dates.push(getDateStringDaysAgo(i));
  }

  // Render day labels
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayLabelsContainer.innerHTML = dates.map(dateStr => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayName = dayNames[date.getDay()];
    const isToday = dateStr === today;
    return `<span class="heatmap-day-label${isToday ? ' heatmap-day-today' : ''}">${dayName}</span>`;
  }).join('');

  // Render heatmap grid (7 rows x 24 columns)
  let gridHTML = '';
  dates.forEach((dateStr, rowIndex) => {
    const dayData = activityByDateAndHour[dateStr] || [];

    for (let hour = 0; hour < 24; hour++) {
      const hourData = dayData[hour] || { count: 0, duration: 0 };

      // Calculate activity level (use duration for timers, count for others)
      const activityLevel = hourData.duration > 0 ? hourData.duration / 60 : hourData.count;

      // Normalize to 0-4 scale for color intensity
      const intensityLevel = maxActivity > 0
        ? Math.min(4, Math.ceil((activityLevel / maxActivity) * 4))
        : 0;

      // Format tooltip text
      const tooltipParts = [];
      if (hourData.count > 0) {
        tooltipParts.push(`${hourData.count} action${hourData.count !== 1 ? 's' : ''}`);
      }
      if (hourData.duration > 0) {
        const minutes = Math.round(hourData.duration / 60);
        tooltipParts.push(`${minutes} min`);
      }
      const tooltipText = tooltipParts.length > 0
        ? tooltipParts.join(', ')
        : 'No activity';

      const hourDisplay = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
      const date = new Date(dateStr + 'T00:00:00');
      const dayDisplay = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      gridHTML += `<div class="heatmap-cell level-${intensityLevel}"
        data-date="${dateStr}"
        data-hour="${hour}"
        data-tooltip="${dayDisplay}, ${hourDisplay}: ${tooltipText}"
        title="${dayDisplay}, ${hourDisplay}: ${tooltipText}"></div>`;
    }
  });

  gridContainer.innerHTML = gridHTML;
}

/**
 * Calculate and update streak data
 * US-045: Streak Counter Implementation
 *
 * Streak = consecutive days where ALL daily goals were completed
 * Breaks if any goal was missed on a day
 */
async function updateStreakDisplay() {
  const currentStreakEl = document.getElementById('current-streak-value');
  const bestStreakEl = document.getElementById('best-streak-value');
  const currentStreakCard = document.querySelector('.current-streak-card');

  if (!currentStreakEl || !bestStreakEl) return;

  // Get history data
  const history = await getHistory();

  // Calculate streak from history
  const { currentStreak, bestStreak } = calculateStreakFromHistory(history, state.goals);

  // Update the display
  currentStreakEl.textContent = currentStreak;
  bestStreakEl.textContent = bestStreak;

  // Update the active class on the current streak card
  if (currentStreakCard) {
    if (currentStreak > 0) {
      currentStreakCard.classList.add('active');
    } else {
      currentStreakCard.classList.remove('active');
    }
  }

  // Update state and save to storage if streak changed
  const storedStreakData = await getStreakData();
  if (storedStreakData.currentStreak !== currentStreak || storedStreakData.bestStreak !== bestStreak) {
    const newStreakData = {
      currentStreak,
      bestStreak,
      lastCompletionDate: currentStreak > 0 ? getTodayDateString() : storedStreakData.lastCompletionDate
    };
    state.streakData = newStreakData;
    await saveStreakData(newStreakData);

    // US-080: Check streak-related achievements when streak is updated
    checkAchievements('streak_update', { streak: currentStreak, bestStreak });
  }
}

/**
 * Calculate streak from history data
 * US-045: Core streak calculation logic
 *
 * @param {Array} history - Array of history entries
 * @param {Array} currentGoals - Current goals array (for today's data)
 * @returns {Object} Object with currentStreak and bestStreak numbers
 */
function calculateStreakFromHistory(history, currentGoals) {
  const today = getTodayDateString();

  // Group history by date
  const historyByDate = groupHistoryByDate(history);

  // Build list of all unique dates in history, sorted in descending order (most recent first)
  const allDates = [...new Set(history.map(entry => entry.date))].sort().reverse();

  // Calculate whether today is fully completed (all daily goals)
  const dailyGoals = currentGoals.filter(goal => goal.timeframe === 'daily');
  const todayFullyCompleted = dailyGoals.length > 0 &&
    dailyGoals.every(goal => isGoalCompleted(goal));

  // Build a map of date -> whether ALL daily goals were completed that day
  const completionByDate = {};

  // Process historical data
  for (const [date, entries] of Object.entries(historyByDate)) {
    // Only consider daily goals for streak calculation
    const dailyEntries = entries.filter(entry => entry.timeframe === 'daily');
    if (dailyEntries.length === 0) {
      // No daily goals on this day - skip it
      continue;
    }
    // All daily goals must be completed
    const allCompleted = dailyEntries.every(entry => entry.completed);
    completionByDate[date] = allCompleted;
  }

  // Add today's status if there are daily goals
  if (dailyGoals.length > 0) {
    completionByDate[today] = todayFullyCompleted;
  }

  // Calculate current streak (consecutive days from today or yesterday going backwards)
  let currentStreak = 0;
  let checkDate = new Date();

  // If today isn't fully completed yet, start checking from yesterday
  // This allows users to maintain streak even if they haven't finished today yet
  if (!todayFullyCompleted) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count consecutive completed days
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];

    // If we have data for this date and it was completed, increment streak
    if (completionByDate[dateStr] === true) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (completionByDate[dateStr] === false) {
      // Day exists in data but wasn't completed - streak breaks
      break;
    } else {
      // No data for this date - assume no daily goals existed, check previous day
      // But limit how far back we go (90 days max)
      const daysDiff = Math.floor((Date.now() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 90) {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // If today is fully completed, add it to the streak if we didn't count it yet
  if (todayFullyCompleted && !completionByDate[getDateStringDaysAgo(1)]) {
    // Today is the start of a new streak
    currentStreak = Math.max(currentStreak, 1);
  }

  // Calculate best streak ever
  // Go through all dates in order and find the longest consecutive run
  let bestStreak = currentStreak;
  let tempStreak = 0;

  // Get all dates with completion data, sorted ascending
  const sortedDates = Object.keys(completionByDate).sort();

  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i];
    if (completionByDate[date]) {
      // Check if this is consecutive with previous day
      if (i > 0) {
        const prevDate = sortedDates[i - 1];
        const currentDateObj = new Date(date);
        const prevDateObj = new Date(prevDate);
        const dayDiff = Math.floor((currentDateObj - prevDateObj) / (1000 * 60 * 60 * 24));

        if (dayDiff === 1 && completionByDate[prevDate]) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Also compare with stored best streak (in case history was cleared)
  const storedBestStreak = state.streakData?.bestStreak || 0;
  bestStreak = Math.max(bestStreak, storedBestStreak);

  return { currentStreak, bestStreak };
}
