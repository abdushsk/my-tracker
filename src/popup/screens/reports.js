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
  getHistory
} from '../../utils/storage.js';
import {
  getTodayDateString,
  getDateStringDaysAgo,
  getWeekStartDateString,
  getMonthStartDateString,
  filterHistoryByDateRange,
  groupHistoryByDate,
  isGoalCompleted
} from '../../utils/models.js';
import { renderChallengeStatsSection } from '../features/dailyChallenges.js';
import { updateStreakDisplay } from './reportsStreak.js';
import { renderWeeklyChart, renderActivityHeatmap } from './reportsCharts.js';

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
      <header class="screen-header main-screen-header">
        <h1 class="screen-title">Reports</h1>
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
